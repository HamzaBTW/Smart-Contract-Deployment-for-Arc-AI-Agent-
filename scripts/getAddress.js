import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
    console.error('\n❌ PRIVATE_KEY not found in .env file\n');
    console.log('Run: npm run create-wallet\n');
    process.exit(1);
}

const wallet = new ethers.Wallet(privateKey);

console.log('\n🔑 Your Wallet Address:');
console.log('═══════════════════════════════════════════════════════════');
console.log(wallet.address);
console.log('═══════════════════════════════════════════════════════════\n');
console.log('📝 Use this address to get testnet tokens from Arc faucet');
console.log('💰 You need Arc testnet tokens for deployment gas fees\n');
console.log('Get tokens from:');
console.log('  - https://faucet.circle.com/');
console.log('  - Or Arc testnet faucet\n');
