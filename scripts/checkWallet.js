import hre from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🔍 Checking wallet setup...\n");
  
  // Check if private key exists
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY not found in .env");
    console.log("\n📝 Steps to set up:");
    console.log("1. Create a MetaMask wallet (or use existing)");
    console.log("2. Export your private key from MetaMask");
    console.log("3. Add to .env: PRIVATE_KEY=your_private_key_without_0x");
    process.exit(1);
  }
  
  // Create wallet from private key
  const wallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY);
  const address = wallet.address;
  
  console.log("✅ Wallet Address:", address);
  console.log("📋 Copy this address to get testnet funds!\n");
  
  // Connect to Arc Testnet
  const rpcUrl = process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network";
  const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
  const connectedWallet = wallet.connect(provider);
  
  // Check balance
  try {
    const balance = await provider.getBalance(address);
    const balanceInUsdc = hre.ethers.formatUnits(balance, 6); // USDC has 6 decimals
    
    console.log("💰 Current Balance:", balanceInUsdc, "USDC");
    
    if (parseFloat(balanceInUsdc) === 0) {
      console.log("\n⚠️  Your wallet is empty!");
      console.log("📍 Get testnet USDC from Arc faucet");
      console.log("🌐 Visit: https://faucet.circle.com/");
      console.log("   Select 'Arc Testnet' and paste your address");
      console.log("📋 Your address:", address);
    } else if (parseFloat(balanceInUsdc) < 0.1) {
      console.log("\n⚠️  Low balance! Consider getting more testnet USDC");
      console.log("📍 Minimum recommended: 0.1 USDC for deployment");
    } else {
      console.log("✅ You have sufficient balance for deployment!");
    }
    
    // Check agent wallet setup
    console.log("\n🤖 AI Agent Wallet Check:");
    if (process.env.AGENT_WALLET_ADDRESS) {
      console.log("✅ Agent wallet configured:", process.env.AGENT_WALLET_ADDRESS);
      
      // Check agent wallet balance
      const agentBalance = await provider.getBalance(process.env.AGENT_WALLET_ADDRESS);
      const agentBalanceInUsdc = hre.ethers.formatUnits(agentBalance, 6);
      console.log("💰 Agent Balance:", agentBalanceInUsdc, "USDC");
      
      if (parseFloat(agentBalanceInUsdc) === 0) {
        console.log("⚠️  Agent wallet needs funds for gas fees!");
      }
    } else {
      console.log("⚠️  AGENT_WALLET_ADDRESS not set in .env");
      console.log("\n📝 Options:");
      console.log("1. Use same wallet as deployer (easier for testing):");
      console.log(`   AGENT_WALLET_ADDRESS=${address}`);
      console.log("\n2. Create separate agent wallet:");
      console.log("   - Create new MetaMask account");
      console.log("   - Copy address to .env as AGENT_WALLET_ADDRESS");
      console.log("   - Fund it with testnet USDC");
    }
    
  } catch (error) {
    console.error("\n❌ Connection failed:", error.message);
    console.log("\n📚 Possible issues:");
    console.log("1. Arc Testnet RPC might be down");
    console.log("2. Check your internet connection");
    console.log("3. Verify RPC URL in hardhat.config.js");
  }
  
  console.log("\n🎯 Next Steps:");
  console.log("1. ✅ Get testnet USDC from faucet (if needed)");
  console.log("2. ✅ Set AGENT_WALLET_ADDRESS in .env");
  console.log("3. ✅ Run: npm run compile");
  console.log("4. ✅ Run: npm run deploy:contract:testnet");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
