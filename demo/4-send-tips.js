import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function sendTips() {
  console.log('🤖 AI Agent: Sending Automated Tips...\n');

  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error('❌ CONTRACT_ADDRESS not set in .env');
    process.exit(1);
  }

  // Load contract
  const artifactPath = './artifacts/contracts/SubscriptionManager.sol/SubscriptionManager.json';
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  // AI Agent wallet
  const agentWallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, artifact.abi, agentWallet);

  console.log(`🤖 AI Agent: ${agentWallet.address}`);
  console.log(`📄 Contract: ${contractAddress}\n`);

  // Demo tips based on "AI-detected" user engagement
  const tips = [
    {
      user: process.env.DEMO_USER_1_ADDRESS,
      creator: process.env.DEMO_CREATOR_1_ADDRESS,
      amount: '0.50', // 0.50 USDC
      contentId: 'article-blockchain-101',
      description: 'User 1 spent 15 mins reading article → auto-tip Creator 1'
    },
    {
      user: process.env.DEMO_USER_2_ADDRESS,
      creator: process.env.DEMO_CREATOR_2_ADDRESS,
      amount: '0.25', // 0.25 USDC
      contentId: 'video-smart-contracts',
      description: 'User 2 watched full video → auto-tip Creator 2'
    },
    {
      user: process.env.DEMO_USER_1_ADDRESS,
      creator: process.env.DEMO_CREATOR_2_ADDRESS,
      amount: '0.10', // 0.10 USDC
      contentId: 'tutorial-solidity-basics',
      description: 'User 1 completed tutorial → auto-tip Creator 2'
    }
  ];

  console.log('💡 AI Agent detected user engagement, sending automated tips...\n');

  for (let i = 0; i < tips.length; i++) {
    const tip = tips[i];
    
    console.log(`\n${i + 1}. ${tip.description}`);
    console.log(`   👤 User: ${tip.user}`);
    console.log(`   🎨 Creator: ${tip.creator}`);
    console.log(`   💰 Tip Amount: ${tip.amount} USDC`);
    console.log(`   📝 Content: ${tip.contentId}`);

    try {
      const amountInUSDC = ethers.parseUnits(tip.amount, 6);

      console.log(`   ⏳ Sending tip...`);
      
      const tx = await contract.sendTip(
        tip.user,
        tip.creator,
        amountInUSDC,
        tip.contentId
      );

      console.log(`   📤 Transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Tip sent! (Block: ${receipt.blockNumber})`);

      // Get tip event details
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'TipSent';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        console.log(`   🎉 Creator received: ${ethers.formatUnits(parsed.args.amount, 6)} USDC`);
      }

    } catch (error) {
      console.error(`   ❌ Error sending tip:`, error.message);
      
      if (error.message.includes('UnauthorizedAgent')) {
        console.log(`   💡 Tip: Make sure you're using the correct agent wallet`);
      } else if (error.message.includes('TransferFailed')) {
        console.log(`   💡 Tip: User needs to approve USDC first (run demo/1-approve-usdc.js)`);
      } else if (error.message.includes('InsufficientBalance')) {
        console.log(`   💡 Tip: User needs more USDC from faucet`);
      }
    }

    // Small delay between transactions
    if (i < tips.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n✅ Automated Tipping Complete!\n');
  console.log('📋 Next Step: Run node demo/5-check-balances.js to see results');
}

sendTips().catch(console.error);
