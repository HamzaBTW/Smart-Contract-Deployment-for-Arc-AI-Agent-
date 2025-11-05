import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying SubscriptionManager to Arc...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // USDC address on Arc (update based on network)
  const usdcAddress = process.env.USDC_ADDRESS_TESTNET || "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
  console.log("💵 USDC Token Address:", usdcAddress);

  // Deploy contract
  console.log("\n⏳ Deploying SubscriptionManager...");
  const SubscriptionManager = await hre.ethers.getContractFactory("SubscriptionManager");
  const subscriptionManager = await SubscriptionManager.deploy(usdcAddress);

  await subscriptionManager.waitForDeployment();
  const contractAddress = await subscriptionManager.getAddress();

  console.log("✅ SubscriptionManager deployed to:", contractAddress);
  console.log("\n📋 Deployment Summary:");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Contract Address:", contractAddress);
  console.log("USDC Token:", usdcAddress);
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("═══════════════════════════════════════════════════════════");

  // Wait for block confirmations
  console.log("\n⏳ Waiting for block confirmations...");
  await subscriptionManager.deploymentTransaction().wait(5);
  console.log("✅ Confirmed!");

  // Verify contract on explorer (if API key provided)
  if (process.env.ARCSCAN_API_KEY && hre.network.name !== "hardhat") {
    console.log("\n🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [usdcAddress],
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
    }
  }

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📝 Next Steps:");
  console.log("1. Update your backend with this contract address");
  console.log("2. Test contract functions with scripts/interact.js");
  console.log("3. Update frontend with contract ABI and address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
