import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

async function approveUSDC() {
  console.log('💰 Approving USDC for Demo Users...\n');

  const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const usdcAddress = process.env.USDC_ADDRESS_TESTNET;

  if (!contractAddress) {
    console.error('❌ CONTRACT_ADDRESS not set in .env');
    console.log('Please deploy the contract first and add CONTRACT_ADDRESS to .env');
    process.exit(1);
  }

  // Demo users
  const users = [
    {
      name: 'Demo User 1',
      wallet: new ethers.Wallet(process.env.DEMO_USER_1_PRIVATE_KEY, provider),
      approveAmount: '100' // 100 USDC
    },
    {
      name: 'Demo User 2',
      wallet: new ethers.Wallet(process.env.DEMO_USER_2_PRIVATE_KEY, provider),
      approveAmount: '50' // 50 USDC
    }
  ];

  for (const user of users) {
    console.log(`\n👤 ${user.name} (${user.wallet.address})`);
    
    const usdcContract = new ethers.Contract(usdcAddress, USDC_ABI, user.wallet);

    // Check current balance
    const balance = await usdcContract.balanceOf(user.wallet.address);
    console.log(`   💵 Current USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);

    if (balance === 0n) {
      console.log(`   ⚠️  Warning: ${user.name} has 0 USDC. Get testnet USDC from faucet:`);
      console.log(`   🔗 https://faucet.circle.com/`);
      continue;
    }

    // Check current allowance
    const currentAllowance = await usdcContract.allowance(user.wallet.address, contractAddress);
    console.log(`   📝 Current Allowance: ${ethers.formatUnits(currentAllowance, 6)} USDC`);

    // Approve USDC
    const approveAmount = ethers.parseUnits(user.approveAmount, 6);
    console.log(`   ⏳ Approving ${user.approveAmount} USDC for contract...`);
    
    try {
      const tx = await usdcContract.approve(contractAddress, approveAmount);
      console.log(`   📤 Transaction sent: ${tx.hash}`);
      
      await tx.wait();
      console.log(`   ✅ Approved ${user.approveAmount} USDC successfully!`);
      
      // Verify new allowance
      const newAllowance = await usdcContract.allowance(user.wallet.address, contractAddress);
      console.log(`   📝 New Allowance: ${ethers.formatUnits(newAllowance, 6)} USDC`);
      
    } catch (error) {
      console.error(`   ❌ Error approving USDC:`, error.message);
    }
  }

  console.log('\n✅ USDC Approval Complete!\n');
  console.log('📋 Next Step: Run demo/2-create-subscriptions.js');
}

approveUSDC().catch(console.error);
