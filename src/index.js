/**
 * AI Content Payment Agent - Cloudflare Workers Edition
 * 
 * Serverless AI agent running on Cloudflare's edge network
 * Processes content analysis and USDC payments in real-time
 */

import { PaymentService } from './services/payment.service.js';
import { OpenAIService } from './services/openai.service.js';
import { SubscriptionService } from './services/subscription.service.js';

/**
 * Main Worker Request Handler
 * @param {Request} request 
 * @param {Object} env - Environment bindings (KV, secrets, etc)
 * @param {Object} ctx - Execution context
 */
export default {
  async fetch(request, env, ctx) {
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Initialize services
      const paymentService = new PaymentService(env);
      const openaiService = new OpenAIService(env);
      const subscriptionService = new SubscriptionService(env);

      // Route handling
      let response;

      // Health check
      if (path === '/health') {
        response = await handleHealth(env);
      }
      // User preferences
      else if (path.match(/^\/api\/users\/[^/]+\/preferences$/)) {
        const userId = path.split('/')[3];
        if (request.method === 'POST') {
          response = await handleSetPreferences(request, userId, env);
        } else if (request.method === 'GET') {
          response = await handleGetPreferences(userId, env);
        }
      }
      // Process content (AI analysis + payment)
      else if (path.match(/^\/api\/users\/[^/]+\/content\/process$/)) {
        const userId = path.split('/')[3];
        response = await handleProcessContent(
          request, 
          userId, 
          env, 
          openaiService, 
          paymentService
        );
      }
      // Get recommendations
      else if (path.match(/^\/api\/users\/[^/]+\/recommendations$/)) {
        const userId = path.split('/')[3];
        response = await handleRecommendations(request, userId, env, openaiService);
      }
      // Send tip
      else if (path.match(/^\/api\/users\/[^/]+\/tip$/)) {
        const userId = path.split('/')[3];
        response = await handleSendTip(request, userId, env, paymentService);
      }
      // Subscriptions
      else if (path.match(/^\/api\/users\/[^/]+\/subscriptions$/)) {
        const userId = path.split('/')[3];
        if (request.method === 'POST') {
          response = await handleCreateSubscription(
            request, 
            userId, 
            env, 
            subscriptionService
          );
        } else if (request.method === 'GET') {
          response = await handleGetSubscriptions(userId, env);
        }
      }
      // Get statistics
      else if (path === '/api/statistics') {
        response = await handleStatistics(env);
      }
      else {
        response = jsonResponse({ error: 'Not found' }, 404);
      }

      // Add CORS headers to response
      Object.keys(corsHeaders).forEach(key => {
        response.headers.set(key, corsHeaders[key]);
      });

      return response;

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse(
        { error: 'Internal server error', message: error.message },
        500,
        corsHeaders
      );
    }
  },

  /**
   * Cron trigger for subscription checks
   * Runs every hour to process due subscriptions
   */
  async scheduled(event, env, ctx) {
    console.log('Running scheduled subscription check...');
    
    try {
      const subscriptionService = new SubscriptionService(env);
      await subscriptionService.checkDueSubscriptions();
      console.log('Subscription check completed successfully');
    } catch (error) {
      console.error('Subscription check failed:', error);
    }
  }
};

/**
 * Health check endpoint
 */
async function handleHealth(env) {
  return jsonResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.ENVIRONMENT || 'development',
    edge: true // Cloudflare Workers runs on edge
  });
}

/**
 * Set user preferences
 */
async function handleSetPreferences(request, userId, env) {
  const preferences = await request.json();
  
  // Store in KV
  await env.USER_PREFS.put(
    userId,
    JSON.stringify({
      ...preferences,
      userId,
      updatedAt: new Date().toISOString()
    })
  );

  return jsonResponse({
    success: true,
    message: 'Preferences saved',
    preferences
  });
}

/**
 * Get user preferences
 */
async function handleGetPreferences(userId, env) {
  const prefsData = await env.USER_PREFS.get(userId);
  
  if (!prefsData) {
    return jsonResponse({ error: 'Preferences not found' }, 404);
  }

  return jsonResponse({
    success: true,
    preferences: JSON.parse(prefsData)
  });
}

/**
 * Process content with AI analysis and payment
 */
async function handleProcessContent(request, userId, env, openaiService, paymentService) {
  const content = await request.json();
  
  // Get user preferences
  const prefsData = await env.USER_PREFS.get(userId);
  if (!prefsData) {
    return jsonResponse({ error: 'User preferences not found' }, 404);
  }
  const preferences = JSON.parse(prefsData);

  // Check daily budget
  const today = new Date().toDateString();
  const spendingKey = `${userId}-${today}`;
  const dailySpending = parseFloat(await env.PAYMENT_HISTORY.get(spendingKey) || '0');

  if (dailySpending >= preferences.maxDailyBudget) {
    return jsonResponse({
      success: true,
      decision: {
        shouldPay: false,
        amount: 0,
        reason: 'Daily budget exceeded',
        confidenceScore: 1.0,
        contentId: content.contentId,
        creatorAddress: content.creatorAddress
      }
    });
  }

  // AI Analysis
  const analysis = await openaiService.analyzeContent(content, preferences);
  const decision = await openaiService.makePaymentDecision(content, analysis, preferences);

  // If should pay, process payment
  if (decision.shouldPay) {
    const remainingBudget = preferences.maxDailyBudget - dailySpending;
    
    if (decision.amount > remainingBudget) {
      decision.shouldPay = false;
      decision.reason = 'Would exceed daily budget';
    } else {
      try {
        const transaction = await paymentService.processMicropayment(
          userId,
          decision,
          env
        );

        // Update daily spending
        await env.PAYMENT_HISTORY.put(
          spendingKey,
          String(dailySpending + decision.amount),
          { expirationTtl: 86400 } // Expire after 24 hours
        );

        // Save transaction record
        const txKey = `tx-${transaction.txHash}`;
        await env.PAYMENT_HISTORY.put(
          txKey,
          JSON.stringify({
            userId,
            contentId: content.contentId,
            transaction,
            decision,
            timestamp: new Date().toISOString()
          })
        );

        return jsonResponse({
          success: true,
          decision,
          transaction
        });
      } catch (error) {
        console.error('Payment failed:', error);
        decision.shouldPay = false;
        decision.reason = `Payment failed: ${error.message}`;
      }
    }
  }

  return jsonResponse({
    success: true,
    decision
  });
}

/**
 * Get AI-powered content recommendations
 */
async function handleRecommendations(request, userId, env, openaiService) {
  const { content } = await request.json();
  
  const prefsData = await env.USER_PREFS.get(userId);
  if (!prefsData) {
    return jsonResponse({ error: 'User preferences not found' }, 404);
  }
  const preferences = JSON.parse(prefsData);

  const recommendations = await openaiService.recommendContent(preferences, content);

  return jsonResponse({
    success: true,
    recommendations
  });
}

/**
 * Send tip to creator
 */
async function handleSendTip(request, userId, env, paymentService) {
  const { creatorAddress, amount } = await request.json();

  if (!creatorAddress || !amount) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  const prefsData = await env.USER_PREFS.get(userId);
  if (!prefsData) {
    return jsonResponse({ error: 'User preferences not found' }, 404);
  }
  const preferences = JSON.parse(prefsData);

  // Check daily budget
  const today = new Date().toDateString();
  const spendingKey = `${userId}-${today}`;
  const dailySpending = parseFloat(await env.PAYMENT_HISTORY.get(spendingKey) || '0');
  const remainingBudget = preferences.maxDailyBudget - dailySpending;

  if (amount > remainingBudget) {
    return jsonResponse({
      error: `Tip exceeds remaining daily budget (${remainingBudget} USD)`
    }, 400);
  }

  const decision = {
    shouldPay: true,
    amount,
    reason: 'Manual tip',
    confidenceScore: 1.0,
    contentId: 'tip-' + Date.now(),
    creatorAddress
  };

  const transaction = await paymentService.processMicropayment(userId, decision, env);

  // Update spending
  await env.PAYMENT_HISTORY.put(
    spendingKey,
    String(dailySpending + amount),
    { expirationTtl: 86400 }
  );

  return jsonResponse({
    success: true,
    message: 'Tip sent successfully',
    transaction
  });
}

/**
 * Create subscription
 */
async function handleCreateSubscription(request, userId, env, subscriptionService) {
  const { creatorAddress, amount } = await request.json();

  if (!creatorAddress || !amount) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  const subscription = await subscriptionService.createSubscription(
    userId,
    creatorAddress,
    amount,
    env
  );

  return jsonResponse({
    success: true,
    message: 'Subscription created',
    subscription
  });
}

/**
 * Get user subscriptions
 */
async function handleGetSubscriptions(userId, env) {
  // List all subscription keys for user
  const listResult = await env.SUBSCRIPTIONS.list({ prefix: `${userId}-` });
  
  const subscriptions = await Promise.all(
    listResult.keys.map(async key => {
      const data = await env.SUBSCRIPTIONS.get(key.name);
      return JSON.parse(data);
    })
  );

  return jsonResponse({
    success: true,
    subscriptions
  });
}

/**
 * Get system statistics
 */
async function handleStatistics(env) {
  // This would aggregate from KV data in production
  // For now, return basic stats
  
  return jsonResponse({
    success: true,
    statistics: {
      message: 'Statistics aggregation from KV in progress',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Helper function to create JSON responses
 */
function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders
    }
  });
}
