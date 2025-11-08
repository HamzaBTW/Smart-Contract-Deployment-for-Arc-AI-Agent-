import hre from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🔍 Testing Arc Testnet RPC Connection...\n");
  
  const rpcUrls = [
    "https://rpc.testnet.arc.network", // Official Arc Testnet RPC
    "https://rpc-testnet.arc.foundation",
    "https://testnet-rpc.arc.foundation",
    "https://arc-testnet.rpc.caldera.xyz/http",
    "https://testnet.arc.foundation/rpc"
  ];
  
  let successfulConnection = false;
  
  for (const url of rpcUrls) {
    console.log(`Testing: ${url}`);
    try {
      const provider = new hre.ethers.JsonRpcProvider(url);
      
      // Test connection with timeout
      const blockNumber = await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout after 5 seconds")), 5000)
        )
      ]);
      
      const network = await provider.getNetwork();
      
      console.log("✅ Connection successful!");
      console.log("   Chain ID:", network.chainId.toString());
      console.log("   Block Number:", blockNumber);
      
      // If we have a private key, check balance
      if (process.env.PRIVATE_KEY) {
        const wallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const balance = await provider.getBalance(wallet.address);
        console.log("   Your Address:", wallet.address);
        console.log("   Balance:", hre.ethers.formatUnits(balance, 6), "USDC");
      }
      
      console.log("\n✨ Arc Testnet RPC is working!\n");
      
      successfulConnection = true;
      return; // Exit after first successful connection
    } catch (error) {
      console.log("❌ Failed:", error.message);
      console.log();
    }
  }
  
  if (!successfulConnection) {
    console.log("❌ All RPC URLs failed. Possible issues:");
    console.log("   1. Arc Testnet might be down or in maintenance");
    console.log("   2. Check your internet connection");
    console.log("   3. Firewall/proxy blocking connections");
    console.log("   4. Need to check Arc official docs for current RPC");
    console.log("\n📚 Resources:");
    console.log("   • Arc Documentation: https://docs.arc.foundation/");
    console.log("   • Arc Discord/Telegram for support");
    console.log("   • Check Arc Explorer: https://explorer-testnet.arc.foundation");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
