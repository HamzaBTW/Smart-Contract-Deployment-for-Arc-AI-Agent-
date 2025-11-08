import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function createSubscriptions() {
  console.log('🤖 AI Agent: Creating Demo Subscriptions...\n');

  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error('❌ CONTRACT_ADDRESS not set in .env');
    process.exit(1);
  }

  // Load contract ABI
  const artifactPath = './artifacts/contracts/SubscriptionManager.sol/SubscriptionManager.json';
  if (!fs.existsSync(artifactPath)) {
    console.error('❌ Contract artifact not found. Run: npm run compile');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const abi = artifact.abi;

  // AI Agent wallet
  const agentWallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, abi, agentWallet);

  console.log(`🤖 AI Agent Address: ${agentWallet.address}`);
  console.log(`📄 Contract Address: ${contractAddress}\n`);

  // Demo subscriptions to create
  const subscriptions = [
    {
      subscriber: process.env.DEMO_USER_1_ADDRESS,
      creator: process.env.DEMO_CREATOR_1_ADDRESS,
      amount: '5.00', // 5 USDC per month
      interval: 30, // 30 days
      description: 'User 1 → Creator 1 (Premium Content)'
    },
    {
      subscriber: process.env.DEMO_USER_2_ADDRESS,
      creator: process.env.DEMO_CREATOR_2_ADDRESS,
      amount: '3.00', // 3 USDC per month
      interval: 30, // 30 days
      description: 'User 2 → Creator 2 (Newsletter)'
    },
    {
      subscriber: process.env.DEMO_USER_1_ADDRESS,
      creator: process.env.DEMO_CREATOR_2_ADDRESS,
      amount: '2.00', // 2 USDC per month
      interval: 30, // 30 days
      description: 'User 1 → Creator 2 (Video Access)'
    }
  ];

  console.log('📝 Creating subscriptions...\n');

  for (let i = 0; i < subscriptions.length; i++) {
    const sub = subscriptions[i];
    
    console.log(`\n${i + 1}. ${sub.description}`);
    console.log(`   👤 Subscriber: ${sub.subscriber}`);
    console.log(`   🎨 Creator: ${sub.creator}`);
    console.log(`   💰 Amount: ${sub.amount} USDC`);
    console.log(`   📅 Interval: ${sub.interval} days`);

    try {
      const amountInUSDC = ethers.parseUnits(sub.amount, 6);
      const intervalInSeconds = sub.interval * 24 * 60 * 60;

      console.log(`   ⏳ Creating subscription...`);
      
      const tx = await contract.createSubscription(
        sub.subscriber,
        sub.creator,
        amountInUSDC,
        intervalInSeconds
      );

      console.log(`   📤 Transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Subscription created! (Block: ${receipt.blockNumber})`);

      // Get subscription ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'SubscriptionCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        console.log(`   🆔 Subscription ID: ${parsed.args.subscriptionId}`);
      }

    } catch (error) {
      console.error(`   ❌ Error creating subscription:`, error.message);
      
      if (error.message.includes('UnauthorizedAgent')) {
        console.log(`   💡 Tip: Make sure AGENT_WALLET_ADDRESS in contract matches your agent wallet`);
      } else if (error.message.includes('TransferFailed')) {
        console.log(`   💡 Tip: User needs to approve USDC first (run demo/1-approve-usdc.js)`);
      }
    }

    // Small delay between transactions
    if (i < subscriptions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n✅ Subscription Creation Complete!\n');
  console.log('📋 Next Steps:');
  console.log('   1. Wait 1 minute (for demo purposes)');
  console.log('   2. Run: node demo/3-process-payments.js');
  console.log('   3. Or run: node demo/4-send-tips.js');
}

createSubscriptions().catch(console.error);
