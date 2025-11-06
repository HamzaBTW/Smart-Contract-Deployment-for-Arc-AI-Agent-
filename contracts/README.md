# Smart Contract Setup & Deployment

## 📦 Installation

Install Hardhat and dependencies:

```powershell
npm install --save-dev hardhat@^2.26.0 @nomicfoundation/hardhat-toolbox @openzeppelin/contracts ethers dotenv --legacy-peer-deps
```

**Additional dependencies for deployment:**

```powershell
npm install --save-dev "@nomicfoundation/hardhat-ignition@^0.15.15" "@nomicfoundation/ignition-core@^0.15.14"
```

## 🔧 Configuration

1. **Copy environment template:**
   ```powershell
   cp .env.hardhat .env
   ```

2. **Fill in your deployment wallet private key in `.env`:**
   ```env
   PRIVATE_KEY=your_private_key_without_0x_prefix
   ```

3. **Verify Arc network settings in `hardhat.config.js`**

## 🏗️ Compile Contract

```powershell
npm run compile
```

This will:
- Compile `contracts/SubscriptionManager.sol`
- Generate artifacts in `artifacts/`
- Create typechain types (if configured)

## 🚀 Deploy to Arc Testnet

```powershell
npm run deploy:contract:testnet
```

Expected output:
```
🚀 Deploying SubscriptionManager to Arc...
📝 Deploying with account: 0x...
💰 Account balance: X.XX ETH
💵 USDC Token Address: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
⏳ Deploying SubscriptionManager...
✅ SubscriptionManager deployed to: 0x...
```

**Save the contract address!** You'll need it for your backend integration.

## 🌐 Deploy to Arc Mainnet

⚠️ **WARNING:** This deploys to production. Make sure you:
- Have tested on testnet
- Have sufficient funds
- Understand the risks

```powershell
npm run deploy:contract:mainnet
```

## 🔍 Interact with Contract

After deployment, test contract functions:

```powershell
# Set contract address in .env
echo CONTRACT_ADDRESS=0xYourContractAddress >> .env

# Run interaction script
npm run interact
```

## 📋 Contract Features

### SubscriptionManager.sol

**Functions:**
- `createSubscription(creator, amount, interval)` - Create recurring payment
- `processSubscriptionPayment(subscriptionId)` - Process due payment
- `cancelSubscription(subscriptionId)` - Cancel subscription
- `sendTip(creator, amount, contentId)` - Send one-time tip
- `createMicropaymentEscrow(creator, amount, contentId)` - Escrow for content
- `releaseMicropayment(escrowId)` - Release escrowed payment
- `withdrawCreatorBalance()` - Creator withdraws earnings
- `getUserSubscriptions(user)` - Get user's subscriptions
- `getCreatorSubscriptions(creator)` - Get creator's subscriptions
- `isPaymentDue(subscriptionId)` - Check if payment is due
- `updatePlatformFee(newFee)` - Update platform fee (owner)

**Key Details:**
- Platform fee: 2.5% (250 basis points)
- Min interval: 1 day
- USDC as payment token
- Reentrancy protection
- Access control with Ownable

## 🧪 Testing

Create test files in `test/` directory:

```powershell
npm run test:contract
```

## 📝 Integration

### Backend Integration

After deployment, update your Cloudflare Worker:

1. **Add contract address to `.dev.vars`:**
   ```env
   CONTRACT_ADDRESS=0xYourDeployedContractAddress
   ```

2. **Install ethers.js in your worker:**
   ```powershell
   npm install ethers
   ```

3. **Use contract in your worker:**
   ```javascript
   import { ethers } from 'ethers';
   
   const provider = new ethers.JsonRpcProvider('https://rpc-testnet.arc.foundation');
   const contract = new ethers.Contract(
     env.CONTRACT_ADDRESS,
     ABI, // Import from artifacts
     provider
   );
   
   // Call contract methods
   const isPaymentDue = await contract.isPaymentDue(subscriptionId);
   ```

### Frontend Integration

1. **Copy contract ABI:**
   ```powershell
   cp artifacts/contracts/SubscriptionManager.sol/SubscriptionManager.json frontend/src/contracts/
   ```

2. **Use in React:**
   ```javascript
   import { ethers } from 'ethers';
   import SubscriptionManagerABI from './contracts/SubscriptionManager.json';
   
   const provider = new ethers.BrowserProvider(window.ethereum);
   const contract = new ethers.Contract(
     CONTRACT_ADDRESS,
     SubscriptionManagerABI.abi,
     provider
   );
   ```

## 🔐 Security Notes

- ✅ Never commit `.env` or private keys
- ✅ Test thoroughly on testnet first
- ✅ Audit contract before mainnet deployment
- ✅ Use multi-sig wallet for ownership
- ✅ Monitor contract for suspicious activity

## 📞 Troubleshooting

### Error: "Insufficient funds"
- Top up your wallet with Arc native token (for gas)
- Check balance with `npm run interact`

### Error: "Invalid USDC address"
- Verify USDC token address for your network
- Update in `hardhat.config.js` or `.env`

### Error: "Nonce too high"
- Reset your account in MetaMask
- Or wait for pending transactions

## 🎯 Next Steps

1. ✅ Deploy contract to Arc testnet
2. ✅ Test all functions with `interact.js`
3. ✅ Update backend with contract address
4. ✅ Update frontend with ABI and address
5. ✅ Test end-to-end payment flow
6. ✅ Deploy to mainnet (when ready)

---

**Need help?** Check [Arc Documentation](https://docs.arc.foundation/) or [Hardhat Docs](https://hardhat.org/docs)
