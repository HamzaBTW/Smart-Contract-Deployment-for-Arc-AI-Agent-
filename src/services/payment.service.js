/**
 * Payment Service for Cloudflare Workers
 * Handles USDC payments via Circle SDK
 */

export class PaymentService {
  constructor(env) {
    this.env = env;
    this.circleApiKey = env.CIRCLE_API_KEY;
    this.entitySecret = env.ENTITY_SECRET;
    this.circleApiUrl = 'https://api.circle.com/v1';
  }

  /**
   * Process micropayment for content
   */
  async processMicropayment(userId, decision, env) {
    if (!decision.shouldPay) {
      throw new Error('Payment decision is negative');
    }

    // Get or create user wallet
    const wallet = await this.getUserWallet(userId, env);

    // Execute payment
    const transaction = await this.sendPayment(
      wallet.walletId,
      decision.creatorAddress,
      decision.amount,
      decision.contentId
    );

    return transaction;
  }

  /**
   * Get user wallet from KV or create new one
   */
  async getUserWallet(userId, env) {
    const walletKey = `wallet-${userId}`;
    let walletData = await env.USER_PREFS.get(walletKey);

    if (walletData) {
      return JSON.parse(walletData);
    }

    // Create new wallet
    const wallet = await this.createWallet(userId);
    
    // Store in KV
    await env.USER_PREFS.put(walletKey, JSON.stringify(wallet));

    return wallet;
  }

  /**
   * Create wallet using Circle API
   */
  async createWallet(userId) {
    try {
      const response = await fetch(`${this.circleApiUrl}/wallets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.circleApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idempotencyKey: `wallet-${userId}-${Date.now()}`,
          accountType: 'SCA',
          blockchains: ['ARB-SEPOLIA'],
          count: 1,
          walletSetId: userId
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Circle API error: ${error}`);
      }

      const data = await response.json();
      const wallet = data.data.wallets[0];

      return {
        address: wallet.address,
        walletId: wallet.id,
        userId,
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }

  /**
   * Send USDC payment
   */
  async sendPayment(fromWalletId, toAddress, amount, contentId) {
    try {
      // Check balance first
      const balance = await this.getWalletBalance(fromWalletId);
      
      if (balance < amount) {
        throw new Error(`Insufficient balance: ${balance} USDC available, ${amount} USDC required`);
      }

      // Create transaction
      const response = await fetch(`${this.circleApiUrl}/w3s/developer/transactions/transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.circleApiKey}`,
          'Content-Type': 'application/json',
          'X-User-Token': this.entitySecret
        },
        body: JSON.stringify({
          idempotencyKey: `payment-${contentId}-${Date.now()}`,
          walletId: fromWalletId,
          blockchain: 'ARB-SEPOLIA',
          destinationAddress: toAddress,
          tokenAddress: this.env.USDC_ADDRESS || '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
          amounts: [amount.toString()],
          fee: {
            type: 'level',
            config: {
              feeLevel: 'MEDIUM'
            }
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Circle transaction error: ${error}`);
      }

      const data = await response.json();
      const tx = data.data.transaction;

      return {
        txHash: tx.txHash || tx.id,
        from: fromWalletId,
        to: toAddress,
        amount,
        contentId,
        timestamp: new Date().toISOString(),
        status: tx.state || 'PENDING'
      };

    } catch (error) {
      console.error('Error sending payment:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId) {
    try {
      const response = await fetch(`${this.circleApiUrl}/wallets/${walletId}`, {
        headers: {
          'Authorization': `Bearer ${this.circleApiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get balance: ${response.status}`);
      }

      const data = await response.json();
      const usdcBalance = data.data.wallet.balances?.find(
        b => b.token.symbol === 'USDC'
      );

      return parseFloat(usdcBalance?.amount || '0');

    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash) {
    try {
      const response = await fetch(`${this.circleApiUrl}/w3s/transactions/${txHash}`, {
        headers: {
          'Authorization': `Bearer ${this.circleApiKey}`
        }
      });

      if (!response.ok) {
        return 'UNKNOWN';
      }

      const data = await response.json();
      return data.data.transaction.state;

    } catch (error) {
      console.error('Error getting transaction status:', error);
      return 'UNKNOWN';
    }
  }
}
