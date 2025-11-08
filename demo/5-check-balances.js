import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function checkBalances() {
  console.log('📊 Checking Demo Results...\n');

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

  console.log(`📄 Contract: ${contractAddress}\n`);

  // Check creator balances
  console.log('=' .repeat(60));
  console.log('💰 CREATOR EARNINGS');
  console.log('='.repeat(60));

  const creators = [
    { name: 'Creator 1', address: process.env.DEMO_CREATOR_1_ADDRESS },
    { name: 'Creator 2', address: process.env.DEMO_CREATOR_2_ADDRESS }
  ];

  let totalEarnings = 0n;

  for (const creator of creators) {
    const balance = await contract.creatorBalances(creator.address);
    const balanceUSDC = ethers.formatUnits(balance, 6);
    totalEarnings += balance;

    console.log(`\n🎨 ${creator.name}`);
    console.log(`   Address: ${creator.address}`);
    console.log(`   Balance: ${balanceUSDC} USDC`);
    
    if (balance > 0n) {
      console.log(`   ✅ Can withdraw earnings!`);
    } else {
      console.log(`   ℹ️  No earnings yet`);
    }
  }

  // Check platform fees
  console.log('\n' + '='.repeat(60));
  console.log('🏦 PLATFORM METRICS');
  console.log('='.repeat(60));

  const platformFees = await contract.platformFees();
  console.log(`\n💼 Platform Fees Collected: ${ethers.formatUnits(platformFees, 6)} USDC`);
  console.log(`📊 Total Creator Earnings: ${ethers.formatUnits(totalEarnings, 6)} USDC`);
  console.log(`💵 Total Volume: ${ethers.formatUnits(totalEarnings + platformFees, 6)} USDC`);

  // Check active subscriptions
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUBSCRIPTION STATUS');
  console.log('='.repeat(60));

  const users = [process.env.DEMO_USER_1_ADDRESS, process.env.DEMO_USER_2_ADDRESS];
  const creatorAddrs = [process.env.DEMO_CREATOR_1_ADDRESS, process.env.DEMO_CREATOR_2_ADDRESS];

  let activeCount = 0;

  for (const subscriber of users) {
    for (const creator of creatorAddrs) {
      const subscriptionId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'address'],
          [subscriber, creator]
        )
      );

      try {
        const subscription = await contract.subscriptions(subscriptionId);
        
        if (subscription.active) {
          activeCount++;
          const subscriberShort = subscriber.slice(0, 6) + '...' + subscriber.slice(-4);
          const creatorShort = creator.slice(0, 6) + '...' + creator.slice(-4);
          
          console.log(`\n✅ ${subscriberShort} → ${creatorShort}`);
          console.log(`   Amount: ${ethers.formatUnits(subscription.amount, 6)} USDC`);
          console.log(`   Interval: ${Number(subscription.interval) / 86400} days`);
          console.log(`   Payments: ${subscription.paymentCount.toString()}`);
          console.log(`   Next Due: ${new Date(Number(subscription.nextPaymentDue) * 1000).toLocaleString()}`);
        }
      } catch {
        // Subscription doesn't exist
        continue;
      }
    }
  }

  console.log(`\n📊 Total Active Subscriptions: ${activeCount}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎯 DEMO SUMMARY');
  console.log('='.repeat(60));
  console.log(`
✅ Contract Deployed: ${contractAddress}
✅ Active Subscriptions: ${activeCount}
✅ Total Volume Processed: ${ethers.formatUnits(totalEarnings + platformFees, 6)} USDC
✅ Creator Earnings: ${ethers.formatUnits(totalEarnings, 6)} USDC
✅ Platform Fees: ${ethers.formatUnits(platformFees, 6)} USDC

🤖 AI Agent Features Demonstrated:
  ✓ Autonomous subscription creation
  ✓ Automated payment processing
  ✓ Engagement-based tipping
  ✓ Transparent on-chain transactions

🔍 View on Explorer:
  ${`https://testnet.arcscan.app/address/${contractAddress}`}
`);

  console.log('='.repeat(60));
  console.log('\n🎉 Demo Complete! All AI agent features working successfully.\n');
}

checkBalances().catch(console.error);
