import hre from "hardhat";

async function main() {
  console.log("🔧 Interacting with SubscriptionManager...\n");

  // Contract address (update after deployment)
  const contractAddress = process.env.CONTRACT_ADDRESS || "YOUR_CONTRACT_ADDRESS_HERE";
  
  if (contractAddress === "YOUR_CONTRACT_ADDRESS_HERE") {
    console.error("❌ Please set CONTRACT_ADDRESS in .env or provide it as argument");
    process.exit(1);
  }

  // Get contract instance
  const SubscriptionManager = await hre.ethers.getContractFactory("SubscriptionManager");
  const contract = SubscriptionManager.attach(contractAddress);

  console.log("📋 Contract Address:", contractAddress);
  console.log("🌐 Network:", hre.network.name);

  // Get platform fee
  const platformFee = await contract.platformFee();
  console.log("\n💰 Platform Fee:", platformFee.toString(), "basis points (", Number(platformFee) / 100, "%)");

  // Get USDC token address
  const usdcAddress = await contract.usdcToken();
  console.log("💵 USDC Token:", usdcAddress);

  // Example: Check creator balance
  const [signer] = await hre.ethers.getSigners();
  const creatorBalance = await contract.creatorBalances(signer.address);
  console.log("\n👤 Your Creator Balance:", hre.ethers.formatUnits(creatorBalance, 6), "USDC");

  console.log("\n✅ Contract interaction complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
