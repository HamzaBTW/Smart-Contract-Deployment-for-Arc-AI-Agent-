import { ethers } from 'ethers';
import fs from 'fs';

console.log('\n🔐 Generating New Wallet for Deployment...\n');

// Create random wallet
const wallet = ethers.Wallet.createRandom();

console.log('✅ Wallet Created Successfully!\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey.slice(2)); // Remove 0x prefix
console.log('═══════════════════════════════════════════════════════════\n');

console.log('⚠️  SAVE THIS INFORMATION SECURELY!\n');
console.log('📝 Mnemonic (12-word backup phrase):');
console.log(wallet.mnemonic.phrase);
console.log('\n');

// Save to .env file
const envContent = `# Deployment Wallet Configuration
# NEVER commit this file to git!

# Your deployer wallet private key (WITHOUT 0x prefix)
PRIVATE_KEY=${wallet.privateKey.slice(2)}

# Arc Testnet RPC URL
ARC_TESTNET_RPC=https://rpc.arctest.network

# USDC Token Address on Arc Testnet
USDC_ADDRESS_TESTNET=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

# USDC Token Address on Arc Mainnet (update when available)
USDC_ADDRESS_MAINNET=

# Optional: Block explorer API key for contract verification
ARCSCAN_API_KEY=
`;

try {
    fs.writeFileSync('.env', envContent);
    console.log('✅ Private key saved to .env file\n');
} catch (error) {
    console.error('❌ Failed to save .env file:', error.message);
}

console.log('📋 Next Steps:\n');
console.log('1. Fund this address with Arc testnet tokens:');
console.log('   Address:', wallet.address);
console.log('   Get tokens from: https://faucet.circle.com/');
console.log('   Or Arc testnet faucet\n');
console.log('2. Check your balance:');
console.log('   npm run check-deployment\n');
console.log('3. Deploy contract:');
console.log('   npm run deploy:contract:testnet\n');
console.log('⚠️  Save your mnemonic phrase in a safe place!');
console.log('   You can recover this wallet with the 12-word phrase above.\n');
