import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    console.log('\n🚀 Deploying Subscription Contract to Circle Blockchain...\n');

    // Load configuration
    const privateKey = process.env.PRIVATE_KEY;
    const usdcAddress = process.env.USDC_ADDRESS_TESTNET || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
    
    if (!privateKey) {
        console.error('❌ PRIVATE_KEY not found in .env file');
        process.exit(1);
    }

    // Connect to Circle blockchain
    const provider = new ethers.JsonRpcProvider('https://rpc.circle.com');
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log('📍 Deploying from:', wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'ETH\n');
    
    if (balance === 0n) {
        console.error('❌ No balance! Get testnet tokens from faucet first.');
        console.error('   Address:', wallet.address);
        process.exit(1);
    }

    // Load compiled contract
    const artifactPath = join(__dirname, '../artifacts/contracts/Subscription.sol/SubscriptionTipping.json');
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

    // Create contract factory
    const factory = new ethers.ContractFactory(
        artifact.abi,
        artifact.bytecode,
        wallet
    );

    console.log('📝 Contract constructor args:');
    console.log('   USDC Token Address:', usdcAddress);
    console.log('\n⏳ Deploying contract...\n');

    // Deploy
    const contract = await factory.deploy(usdcAddress);
    
    console.log('⏳ Waiting for deployment transaction...');
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();

    console.log('\n✅ Contract Deployed Successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Contract Address:', address);
    console.log('Transaction Hash:', contract.deploymentTransaction()?.hash);
    console.log('Network: Circle Blockchain');
    console.log('USDC Token:', usdcAddress);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📝 Save this address to your .dev.vars:');
    console.log(`SUBSCRIPTION_CONTRACT_ADDRESS=${address}\n`);

    console.log('✅ Deployment Complete!\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Deployment Failed:\n', error);
        process.exit(1);
    });
