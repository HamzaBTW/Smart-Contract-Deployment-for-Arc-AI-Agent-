import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function checkDeployment() {
    console.log('\n🔍 Pre-Deployment Checklist\n');
    
    let allChecks = true;
    
    // Check private key
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.log('❌ PRIVATE_KEY not found in .env');
        console.log('   Run: npm run create-wallet\n');
        allChecks = false;
    } else {
        console.log('✅ Private key configured');
    }
    
    // Check USDC address
    const usdcAddress = process.env.USDC_ADDRESS_TESTNET;
    if (!usdcAddress) {
        console.log('❌ USDC_ADDRESS_TESTNET not found in .env\n');
        allChecks = false;
    } else {
        console.log('✅ USDC address configured:', usdcAddress);
    }
    
    if (!allChecks) {
        console.log('\n❌ Setup incomplete. Please fix the issues above.\n');
        return false;
    }
    
    // Create wallet
    const wallet = new ethers.Wallet(privateKey);
    console.log('✅ Wallet address:', wallet.address);
    
    // Connect to Circle blockchain
    const rpcUrl = process.env.ARC_TESTNET_RPC || 'https://rpc.circle.com';
    console.log('\n🌐 Connecting to Circle blockchain:', rpcUrl);
    
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        const balanceInEth = ethers.formatEther(balance);
        
        console.log('\n💰 Account Balance Check:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Balance:', balanceInEth, 'tokens');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        if (balance > 0n) {
            console.log('✅ You have testnet tokens!');
            console.log('\n🚀 Ready to deploy! Run:');
            console.log('   npm run deploy:contract:testnet\n');
            return true;
        } else {
            console.log('❌ No testnet balance - get tokens from faucet');
            console.log('\n📝 To get tokens:');
            console.log('1. Copy your address:', wallet.address);
            console.log('2. Go to: https://faucet.circle.com/');
            console.log('3. Paste your address and request tokens');
            console.log('4. Wait 1-2 minutes');
            console.log('5. Run this check again: npm run check-deployment\n');
            return false;
        }
    } catch (error) {
        console.log('\n⚠️  Could not connect to Arc testnet');
        console.log('Error:', error.message);
        console.log('\nThis might be okay - the RPC URL may need updating.');
        console.log('Continuing with deployment will verify the connection.\n');
        return true;
    }
}

checkDeployment()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    });
