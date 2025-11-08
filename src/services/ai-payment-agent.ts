/**
 * AI Agent Payment Service
 * 
 * This service manages automated payments through the SubscriptionManager contract.
 * The AI agent monitors user behavior and triggers payments accordingly.
 */

import { ethers } from 'ethers';

// Cloudflare Workers types
type ScheduledEvent = {
  scheduledTime: number;
  cron: string;
};

type ExecutionContext = {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
};

type Env = {
  AGENT_PRIVATE_KEY: string;
  CONTRACT_ADDRESS: string;
  CONTRACT_ABI: string;
  [key: string]: any;
};

// Import contract ABI (generate this after compiling your contract)
// import SubscriptionManagerABI from '../artifacts/contracts/SubscriptionManager.sol/SubscriptionManager.json';

export class AIPaymentAgent {
  private provider: ethers.JsonRpcProvider;
  private agentWallet: ethers.Wallet;
  private contract: ethers.Contract;
  
  constructor(
    rpcUrl: string,
    agentPrivateKey: string,
    contractAddress: string,
    contractABI: any[]
  ) {
    // Connect to Arc Testnet
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // 🔑 Agent's wallet - this is the authorized address in the contract
    this.agentWallet = new ethers.Wallet(agentPrivateKey, this.provider);
    
    // Connect contract with agent's wallet (agent signs all transactions)
    this.contract = new ethers.Contract(
      contractAddress,
      contractABI,
      this.agentWallet
    );
    
    console.log('🤖 AI Agent initialized');
    console.log('   Agent Address:', this.agentWallet.address);
    console.log('   Contract:', contractAddress);
  }
  
  /**
   * AI analyzes user behavior and creates a subscription
   */
  async createSubscriptionForUser(
    userAddress: string,
    creatorAddress: string,
    monthlyAmount: string, // e.g., "5.00" USDC
    intervalDays: number = 30
  ): Promise<string> {
    try {
      console.log('🤖 AI Agent: Creating subscription...');
      console.log(`   User: ${userAddress}`);
      console.log(`   Creator: ${creatorAddress}`);
      console.log(`   Amount: ${monthlyAmount} USDC`);
      
      // Convert to USDC units (6 decimals)
      const amount = ethers.parseUnits(monthlyAmount, 6);
      const interval = intervalDays * 24 * 60 * 60; // Convert to seconds
      
      // Only agent wallet can call this - enforced by onlyAgent modifier
      const tx = await this.contract.createSubscription(
        userAddress,
        creatorAddress,
        amount,
        interval
      );
      
      console.log('   Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Subscription created!');
      
      // Extract subscription ID from event logs
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'SubscriptionCreated';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        const subscriptionId = parsed?.args?.subscriptionId;
        console.log('   Subscription ID:', subscriptionId);
        return subscriptionId;
      }
      
      return receipt.hash;
    } catch (error: any) {
      console.error('❌ Agent action failed:', error.message);
      throw error;
    }
  }
  
  /**
   * AI monitors and processes due payments automatically
   * This should run on a schedule (cron job, Cloudflare Cron Trigger, etc.)
   */
  async processPaymentsAutomatically(subscriptionIds: string[]): Promise<void> {
    console.log('🤖 AI Agent: Checking for due payments...');
    
    for (const subscriptionId of subscriptionIds) {
      try {
        // Check if payment is due
        const isDue = await this.contract.isPaymentDue(subscriptionId);
        
        if (isDue) {
          console.log(`   Processing subscription: ${subscriptionId}`);
          
          const tx = await this.contract.processSubscriptionPayment(subscriptionId);
          await tx.wait();
          
          console.log('✅ Payment processed!');
        } else {
          console.log(`   Subscription ${subscriptionId}: Not due yet`);
        }
      } catch (error: any) {
        console.error(`❌ Payment failed for ${subscriptionId}:`, error.message);
        // Continue processing other subscriptions
      }
    }
  }
  
  /**
   * AI detects user consumed content and sends automatic tip
   */
  async sendAutomatedTip(
    userAddress: string,
    creatorAddress: string,
    tipAmount: string, // e.g., "0.25" USDC
    contentId: string
  ): Promise<void> {
    try {
      console.log('🤖 AI Agent: User consumed content, sending tip...');
      console.log(`   User: ${userAddress}`);
      console.log(`   Creator: ${creatorAddress}`);
      console.log(`   Amount: ${tipAmount} USDC`);
      console.log(`   Content: ${contentId}`);
      
      const amount = ethers.parseUnits(tipAmount, 6);
      
      const tx = await this.contract.sendTip(
        userAddress,
        creatorAddress,
        amount,
        contentId
      );
      
      await tx.wait();
      console.log('✅ Tip sent successfully!');
    } catch (error: any) {
      console.error('❌ Tip failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const subscription = await this.contract.subscriptions(subscriptionId);
      return {
        subscriber: subscription.subscriber,
        creator: subscription.creator,
        amount: ethers.formatUnits(subscription.amount, 6),
        interval: Number(subscription.interval),
        nextPaymentDue: Number(subscription.nextPaymentDue),
        active: subscription.active,
        totalPaid: ethers.formatUnits(subscription.totalPaid, 6),
        paymentsCount: Number(subscription.paymentsCount)
      };
    } catch (error: any) {
      console.error('❌ Failed to get subscription:', error.message);
      throw error;
    }
  }
  
  /**
   * Check if payment is due
   */
  async isPaymentDue(subscriptionId: string): Promise<boolean> {
    return await this.contract.isPaymentDue(subscriptionId);
  }
  
  /**
   * Get agent wallet balance
   */
  async getAgentBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.agentWallet.address);
    return ethers.formatUnits(balance, 6);
  }
  
  /**
   * AI decision engine - decides when and how much to pay
   * This is where you'd integrate your AI/LLM logic
   */
  async analyzeUserBehaviorAndPay(
    userAddress: string,
    contentData: {
      contentId: string;
      creatorAddress: string;
      contentType: 'article' | 'image' | 'video';
      consumedAt: Date;
      userEngagement: number; // 0-100
    }
  ): Promise<void> {
    console.log('🧠 AI analyzing user behavior...');
    
    // Example AI logic (replace with actual AI/LLM integration)
    const shouldTip = contentData.userEngagement > 70;
    
    if (shouldTip) {
      // Calculate tip based on content type and engagement
      let tipAmount = '0.10'; // Base tip
      
      if (contentData.contentType === 'video') {
        tipAmount = '0.50';
      } else if (contentData.contentType === 'article' && contentData.userEngagement > 90) {
        tipAmount = '0.25';
      }
      
      await this.sendAutomatedTip(
        userAddress,
        contentData.creatorAddress,
        tipAmount,
        contentData.contentId
      );
    } else {
      console.log('   AI decision: No tip needed (low engagement)');
    }
  }
}

/**
 * Example usage in a Cloudflare Worker
 */
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Cloudflare Cron Trigger - runs periodically to process payments
    const agent = new AIPaymentAgent(
      'https://rpc-testnet.arc.foundation',
      env.AGENT_PRIVATE_KEY,
      env.CONTRACT_ADDRESS,
      JSON.parse(env.CONTRACT_ABI)
    );
    
    // Get list of active subscriptions (you'd store this in a database)
    const subscriptionIds = ['0x123...', '0x456...'];
    
    await agent.processPaymentsAutomatically(subscriptionIds);
  },
  
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Handle incoming requests
    const url = new URL(request.url);
    
    if (url.pathname === '/api/content-consumed') {
      // User consumed content, AI decides whether to tip
      const data = await request.json();
      
      const agent = new AIPaymentAgent(
        'https://www.alchemy.com/rpc/arc-testnet',
        env.AGENT_PRIVATE_KEY,
        env.CONTRACT_ADDRESS,
        JSON.parse(env.CONTRACT_ABI)
      );
      
      await agent.analyzeUserBehaviorAndPay(
        data.userAddress,
        data.contentData
      );
      
      return new Response('Payment processed', { status: 200 });
    }
    
    return new Response('Not found', { status: 404 });
  }
};
