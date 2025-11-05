/**
 * Subscription Service for Cloudflare Workers
 * Manages recurring payments using KV storage
 */

import { PaymentService } from './payment.service.js';

export class SubscriptionService {
  constructor(env) {
    this.env = env;
    this.paymentService = new PaymentService(env);
  }

  /**
   * Create new subscription
   */
  async createSubscription(userId, creatorAddress, amount, env) {
    const subscriptionId = `${userId}-${creatorAddress}-${Date.now()}`;
    
    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);

    const subscription = {
      subscriptionId,
      userId,
      creatorAddress,
      amount,
      nextPaymentDate: nextPaymentDate.toISOString(),
      active: true,
      createdAt: new Date().toISOString(),
      lastPaymentDate: new Date().toISOString()
    };

    // Store in KV
    await env.SUBSCRIPTIONS.put(subscriptionId, JSON.stringify(subscription));

    // Process first payment immediately
    try {
      await this.processPayment(subscriptionId, env);
    } catch (error) {
      console.error('First payment failed:', error);
      // Keep subscription active even if first payment fails
    }

    return subscription;
  }

  /**
   * Process subscription payment
   */
  async processPayment(subscriptionId, env) {
    const subData = await env.SUBSCRIPTIONS.get(subscriptionId);
    
    if (!subData) {
      throw new Error('Subscription not found');
    }

    const subscription = JSON.parse(subData);

    if (!subscription.active) {
      throw new Error('Subscription is not active');
    }

    // Create payment decision
    const decision = {
      shouldPay: true,
      amount: subscription.amount,
      reason: 'Subscription payment',
      confidenceScore: 1.0,
      contentId: `sub-${subscriptionId}`,
      creatorAddress: subscription.creatorAddress
    };

    // Process payment
    const transaction = await this.paymentService.processMicropayment(
      subscription.userId,
      decision,
      env
    );

    // Update subscription
    subscription.lastPaymentDate = new Date().toISOString();
    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
    subscription.nextPaymentDate = nextPaymentDate.toISOString();

    // Save updated subscription
    await env.SUBSCRIPTIONS.put(subscriptionId, JSON.stringify(subscription));

    return transaction;
  }

  /**
   * Check for due subscriptions (called by cron)
   */
  async checkDueSubscriptions() {
    const now = new Date();
    
    // List all subscriptions
    const listResult = await this.env.SUBSCRIPTIONS.list();
    
    for (const key of listResult.keys) {
      try {
        const subData = await this.env.SUBSCRIPTIONS.get(key.name);
        const subscription = JSON.parse(subData);

        // Check if payment is due
        if (subscription.active && new Date(subscription.nextPaymentDate) <= now) {
          console.log(`Processing due subscription: ${subscription.subscriptionId}`);
          await this.processPayment(subscription.subscriptionId, this.env);
        }
      } catch (error) {
        console.error(`Failed to process subscription ${key.name}:`, error);
        // Continue with other subscriptions
      }
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, env) {
    const subData = await env.SUBSCRIPTIONS.get(subscriptionId);
    
    if (!subData) {
      return false;
    }

    const subscription = JSON.parse(subData);
    subscription.active = false;
    subscription.cancelledAt = new Date().toISOString();

    await env.SUBSCRIPTIONS.put(subscriptionId, JSON.stringify(subscription));
    return true;
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(subscriptionId, env) {
    const subData = await env.SUBSCRIPTIONS.get(subscriptionId);
    
    if (!subData) {
      return false;
    }

    const subscription = JSON.parse(subData);
    subscription.active = true;
    delete subscription.cancelledAt;

    // Set next payment date
    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
    subscription.nextPaymentDate = nextPaymentDate.toISOString();

    await env.SUBSCRIPTIONS.put(subscriptionId, JSON.stringify(subscription));
    return true;
  }
}
