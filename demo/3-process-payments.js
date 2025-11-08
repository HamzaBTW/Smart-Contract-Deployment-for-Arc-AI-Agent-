import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function processPayments() {
  console.log('🤖 AI Agent: Processing Subscription Payments...\n');

  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error('❌ CONTRACT_ADDRESS not set in .env');
    process.exit(1);
  }

  // Load contract
  const artifactPath = './artifacts/contracts/SubscriptionManager.sol/SubscriptionManager.json';
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const contract = new ethers.Contract(contractAddress, artifact.abi, provider);

  // AI Agent wallet
  const agentWallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
  const contractWithSigner = contract.connect(agentWallet);

  console.log(`🤖 AI Agent: ${agentWallet.address}`);
  console.log(`📄 Contract: ${contractAddress}\n`);

  // Get all subscription IDs (in production, you'd query events or database)
  // For demo, we'll generate possible subscription IDs based on our known subscriptions
  const users = [process.env.DEMO_USER_1_ADDRESS, process.env.DEMO_USER_2_ADDRESS];
  const creators = [process.env.DEMO_CREATOR_1_ADDRESS, process.env.DEMO_CREATOR_2_ADDRESS];

  const possibleSubscriptionIds = [];
  
  for (const subscriber of users) {
    for (const creator of creators) {
      const subscriptionId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'address'],
          [subscriber, creator]
        )
      );
      possibleSubscriptionIds.push({
        id: subscriptionId,
        subscriber,
        creator
      });
    }
  }

  console.log('🔍 Checking subscriptions for due payments...\n');

  let processedCount = 0;

  for (const sub of possibleSubscriptionIds) {
    try {
      // Try to get subscription details
      const subscription = await contract.subscriptions(sub.id);
      
      if (!subscription.active) {
        continue; // Skip inactive subscriptions
      }

      const subscriberShort = sub.subscriber.slice(0, 6) + '...' + sub.subscriber.slice(-4);
      const creatorShort = sub.creator.slice(0, 6) + '...' + sub.creator.slice(-4);

      console.log(`📋 Subscription: ${subscriberShort} → ${creatorShort}`);
      console.log(`   💰 Amount: ${ethers.formatUnits(subscription.amount, 6)} USDC`);
      console.log(`   📅 Last Payment: ${new Date(Number(subscription.lastPayment) * 1000).toLocaleString()}`);
      console.log(`   ⏰ Next Payment: ${new Date(Number(subscription.nextPaymentDue) * 1000).toLocaleString()}`);

      // Check if payment is due
      const isDue = await contract.isPaymentDue(sub.id);
      
      if (isDue) {
        console.log(`   ⚡ Payment is DUE! Processing...`);
        
        try {
          const tx = await contractWithSigner.processSubscriptionPayment(sub.id);
          console.log(`   📤 Transaction: ${tx.hash}`);
          
          const receipt = await tx.wait();
          console.log(`   ✅ Payment processed! (Block: ${receipt.blockNumber})`);
          processedCount++;
          
        } catch (error) {
          console.error(`   ❌ Error processing payment:`, error.message);
        }
      } else {
        console.log(`   ℹ️  Payment not due yet`);
      }

      console.log('');

    } catch (error) {
      // Subscription doesn't exist, skip silently
      continue;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Processed ${processedCount} payment(s)`);
  console.log('='.repeat(50));

  if (processedCount === 0) {
    console.log('\nℹ️  No payments were due.');
    console.log('💡 Tip: In a real scenario, payments are processed based on the interval.');
    console.log('   For this demo, you can modify the contract to allow immediate payments,');
    console.log('   or wait for the payment interval to pass.');
  }

  console.log('\n📋 Next Step: Run node demo/4-send-tips.js');
}

processPayments().catch(console.error);
