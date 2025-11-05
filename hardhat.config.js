import dotenv from "dotenv";
dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Circle Blockchain Configuration
    circle: {
      url: process.env.ARC_TESTNET_RPC || "https://rpc.circle.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
    // Local Development
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      arcTestnet: process.env.ARCSCAN_API_KEY || "",
      arcMainnet: process.env.ARCSCAN_API_KEY || "",
    },
  },
};
