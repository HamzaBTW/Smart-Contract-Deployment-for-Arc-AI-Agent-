/**
 * OpenAI Service for Cloudflare Workers
 * Uses Cloudflare AI for inference when available, falls back to OpenAI API
 */

export class OpenAIService {
  constructor(env) {
    this.env = env;
    this.openaiKey = env.OPENAI_API_KEY;
  }

  /**
   * Analyze content using AI
   * @param {Object} content 
   * @param {Object} userPreferences 
   */
  async analyzeContent(content, userPreferences) {
    // Try Cloudflare AI first (if available in your plan)
    if (this.env.AI) {
      return await this.analyzeWithCloudflareAI(content, userPreferences);
    }

    // Fallback to OpenAI API
    if (this.openaiKey) {
      return await this.analyzeWithOpenAI(content, userPreferences);
    }

    // Final fallback: keyword matching
    return this.fallbackAnalysis(content, userPreferences);
  }

  /**
   * Analyze using Cloudflare AI (Workers AI)
   * Available on Workers Paid plan
   */
  async analyzeWithCloudflareAI(content, userPreferences) {
    try {
      const prompt = this.buildAnalysisPrompt(content, userPreferences);
      
      const response = await this.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          {
            role: 'system',
            content: 'You are a content analyst. Provide quality and relevance scores (0-1).'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      // Parse response and extract scores
      const text = response.response || '';
      
      return {
        qualityScore: this.extractScore(text, 'quality') || 0.7,
        relevanceScore: this.extractScore(text, 'relevance') || 0.5,
        detectedTopics: content.tags || [],
        estimatedValue: content.price || 0.25,
        summary: text.substring(0, 200)
      };

    } catch (error) {
      console.error('Cloudflare AI error:', error);
      return this.fallbackAnalysis(content, userPreferences);
    }
  }

  /**
   * Analyze using OpenAI API
   */
  async analyzeWithOpenAI(content, userPreferences) {
    try {
      const prompt = this.buildAnalysisPrompt(content, userPreferences);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are a content analyst. Respond only in JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      return {
        qualityScore: analysis.qualityScore || 0.7,
        relevanceScore: analysis.relevanceScore || 0.5,
        detectedTopics: analysis.detectedTopics || content.tags || [],
        estimatedValue: analysis.estimatedValue || content.price || 0.25,
        summary: analysis.summary || 'No summary available'
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.fallbackAnalysis(content, userPreferences);
    }
  }

  /**
   * Fallback analysis using keyword matching
   */
  fallbackAnalysis(content, userPreferences) {
    const userKeywords = userPreferences.interests?.map(i => i.toLowerCase()) || [];
    const contentKeywords = [
      ...content.tags?.map(t => t.toLowerCase()) || [],
      content.title.toLowerCase()
    ];

    const matchCount = contentKeywords.filter(k =>
      userKeywords.some(uk => k.includes(uk) || uk.includes(k))
    ).length;

    const relevanceScore = Math.min(matchCount / Math.max(userKeywords.length, 1), 1);

    return {
      qualityScore: 0.7,
      relevanceScore,
      detectedTopics: content.tags || [],
      estimatedValue: content.price || 0.25,
      summary: content.description || 'No summary available'
    };
  }

  /**
   * Make payment decision based on analysis
   */
  async makePaymentDecision(content, analysis, userPreferences) {
    const minQualityScore = parseFloat(this.env.MIN_QUALITY_SCORE || '0.7');
    
    // Check quality threshold
    if (analysis.qualityScore < minQualityScore) {
      return {
        shouldPay: false,
        amount: 0,
        reason: 'Content quality below threshold',
        confidenceScore: 0.9,
        contentId: content.contentId,
        creatorAddress: content.creatorAddress
      };
    }

    // Calculate adjusted amount
    const baseAmount = content.price || (analysis.estimatedValue * 0.25);
    const adjustedAmount = baseAmount * analysis.relevanceScore * analysis.qualityScore;

    // Check minimum threshold
    const minThreshold = parseFloat(this.env.PAYMENT_THRESHOLD || '0.10');
    if (adjustedAmount < minThreshold) {
      return {
        shouldPay: false,
        amount: 0,
        reason: 'Payment amount below threshold',
        confidenceScore: 0.8,
        contentId: content.contentId,
        creatorAddress: content.creatorAddress
      };
    }

    // Check if creator is favorite
    const isFavorite = userPreferences.favoriteCreators?.includes(content.creatorAddress);

    return {
      shouldPay: true,
      amount: adjustedAmount,
      reason: isFavorite
        ? 'Favorite creator with high-quality content'
        : 'Content meets quality and relevance criteria',
      confidenceScore: (analysis.qualityScore + analysis.relevanceScore) / 2,
      contentId: content.contentId,
      creatorAddress: content.creatorAddress
    };
  }

  /**
   * Recommend content
   */
  async recommendContent(userPreferences, availableContent) {
    if (!availableContent || availableContent.length === 0) {
      return [];
    }

    // Score each content item
    const scored = await Promise.all(
      availableContent.map(async content => {
        const analysis = await this.analyzeContent(content, userPreferences);
        return {
          ...content,
          score: (analysis.qualityScore + analysis.relevanceScore) / 2
        };
      })
    );

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Return top 10
    return scored.slice(0, 10).map(({ score, ...content }) => content);
  }

  /**
   * Build analysis prompt
   */
  buildAnalysisPrompt(content, userPreferences) {
    return `Analyze this content and provide scores:

Content:
- Title: ${content.title}
- Type: ${content.type}
- Description: ${content.description}
- Tags: ${content.tags?.join(', ')}
- Price: $${content.price}

User Interests: ${userPreferences.interests?.join(', ')}

Provide JSON with:
{
  "qualityScore": 0-1,
  "relevanceScore": 0-1,
  "detectedTopics": ["topic1", "topic2"],
  "estimatedValue": suggested USD price,
  "summary": brief summary
}`;
  }

  /**
   * Extract score from text response
   */
  extractScore(text, type) {
    const regex = new RegExp(`${type}[:\\s]+([0-9.]+)`, 'i');
    const match = text.match(regex);
    return match ? parseFloat(match[1]) : null;
  }
}
