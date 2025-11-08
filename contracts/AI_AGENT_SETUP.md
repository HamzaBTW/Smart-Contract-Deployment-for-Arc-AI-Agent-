# 🤖 AI Agent Autonomy - Smart Contract Setup

## Overview

This smart contract implements **true AI agent autonomy** for automated payments. Only the designated AI agent wallet can trigger payments, subscriptions, and tips - ensuring decentralized, autonomous operation.

## 🔐 Security Pattern

```solidity
modifier onlyAgent() {
    if (msg.sender != agentWallet) revert UnauthorizedAgent();
    _;
}
```

### Why This Matters:
- ✅ **True Autonomy**: AI agent operates independently without manual intervention
- ✅ **Security**: Only authorized agent wallet can trigger payments
- ✅ **Accountability**: All actions are traceable to the agent's wallet
- ✅ **User Control**: Users can still cancel subscriptions anytime

---

## 📋 Prerequisites

### 1. Create A Crypto Wallet (For Deployment)

You can use any EVM-compatible crypto wallet:

**Popular Wallet Options:**
- **MetaMask** (Browser extension & Mobile)
- **Coinbase Wallet** (Browser & Mobile)
- **Trust Wallet** (Mobile)
- **Rainbow Wallet** (Mobile)
- **Rabby Wallet** (Browser extension)
- **Frame** (Desktop)
- **Binance Web3 Wallet** (Browser extension & Mobile)
- Or any other Web3 wallet that supports EVM chains

**Setup Steps:**
1. Download and install your preferred wallet
2. Create new wallet or use existing
3. **Save your seed phrase securely!** (12 or 24 words)
4. Export private key for deployment:
   - **MetaMask**: Account Details → Show Private Key
   - **Coinbase Wallet**: Settings → Show Private Key
   - **Trust Wallet**: Settings → Wallets → Info → Show Private Key
   - **Binance Web3 Wallet**: Settings → Security & Privacy → Show Private Key
   - Enter password → Copy key

### 2. Set Up AI Agent Wallet

You have two options:

**Option A: Use Same Wallet (Easier for Testing)**
```bash
# Your deployer wallet acts as agent
AGENT_WALLET_ADDRESS=0x8f561D0f70C2e795512A1e5E875C4229bd3C69A5
```

**Option B: Separate Agent Wallet (Production)**
```bash
# Create second wallet account for agent
# (Can be in same wallet app or different wallet)
AGENT_WALLET_ADDRESS=<separate_agent_address>
AGENT_PRIVATE_KEY=<agent_private_key>
```

### 3. Add Arc Testnet to Your Wallet

**For MetaMask, Rabby, Frame, Coinbase Wallet, Binance Web3 Wallet:**

```
Network Name: Arc Testnet
RPC URL: https://rpc.testnet.arc.network
Chain ID: 5042002
Currency Symbol: USDC
Block Explorer: https://testnet.arcscan.app
```

### 4. Get Testnet USDC

Visit: https://faucet.circle.com/
- Connect your wallet
- Request testnet USDC
- You need ~0.1 USDC for deployment

---

## 🚀 Deployment Steps

### Step 1: Check Wallet Setup

```powershell
npm run check-wallet
```

This verifies:
- ✅ Private key is configured
- ✅ Wallet has sufficient balance
- ✅ Agent wallet is set up
- ✅ Connection to Arc Testnet works

### Step 2: Test RPC Connection

```powershell
npm run test:rpc
```

This tests multiple RPC URLs and shows which one works.

### Step 3: Configure Environment

Create/update `.env` file:

```bash
# Deployment wallet (has funds for gas)
PRIVATE_KEY=your_private_key_without_0x_prefix

# AI Agent wallet (authorized to trigger payments)
AGENT_WALLET_ADDRESS=0xYourAgentWalletAddress

# USDC Token on Arc Testnet
USDC_ADDRESS_TESTNET=0xYoutTestnetAddress

# Deployed contract address (filled after deployment)
CONTRACT_ADDRESS=
```

### Step 4: Compile Contracts

```powershell
npm run compile
```

### Step 5: Deploy to Arc Testnet

```powershell
npm run deploy:contract:testnet
```

Expected output:
```
🚀 Deploying SubscriptionManager to Arc...
📝 Deploying with account: 0x...
💰 Account balance: X.XX USDC
💵 USDC Token Address: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
🤖 AI Agent Wallet: 0x...
⏳ Deploying SubscriptionManager...
✅ SubscriptionManager deployed to: 0x...
```

**Save the contract address!**

### Step 6: Update .env with Contract Address

```bash
CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

---

## 🔧 Contract Features

### Agent-Only Functions

These can ONLY be called by the agent wallet:

```solidity
// Create subscription on behalf of user
function createSubscription(
    address subscriber,
    address creator,
    uint256 amount,
    uint256 interval
) external onlyAgent

// Process recurring payment
function processSubscriptionPayment(
    bytes32 subscriptionId
) external onlyAgent

// Send automatic tip
function sendTip(
    address user,
    address creator,
    uint256 amount,
    string contentId
) external onlyAgent
```

### User Functions

Users maintain control:

```solidity
// User can cancel anytime
function cancelSubscription(bytes32 subscriptionId) external

// Creator withdraws earnings
function withdrawCreatorBalance() external

// Anyone can create escrow
function createMicropaymentEscrow(...) external
```

### Owner Functions

Contract owner controls:

```solidity
// Update agent wallet if compromised
function setAgentWallet(address newAgent) external onlyOwner

// Update platform fee
function updatePlatformFee(uint256 newFee) external onlyOwner

// Withdraw platform fees
function withdrawPlatformFees(uint256 amount) external onlyOwner
```

---

## 🤖 Backend Integration

### TypeScript/Node.js Example

```typescript
import { ethers } from 'ethers';
import { AIPaymentAgent } from './services/ai-payment-agent';

// Initialize agent
const agent = new AIPaymentAgent(
  'https://rpc-testnet.arc.foundation',
  process.env.AGENT_PRIVATE_KEY!,
  process.env.CONTRACT_ADDRESS!,
  contractABI
);

// AI creates subscription for user
await agent.createSubscriptionForUser(
  '0xUserAddress',
  '0xCreatorAddress',
  '5.00', // 5 USDC per month
  30 // 30 days interval
);

// AI sends automatic tip
await agent.sendAutomatedTip(
  '0xUserAddress',
  '0xCreatorAddress',
  '0.25', // 0.25 USDC tip
  'content-id-123'
);

// Scheduled payment processing (cron job)
await agent.processPaymentsAutomatically([
  '0xSubscriptionId1',
  '0xSubscriptionId2'
]);
```

### Cloudflare Worker Example

```typescript
export default {
  // Cron trigger - runs every hour
  async scheduled(event: ScheduledEvent, env: Env) {
    const agent = new AIPaymentAgent(
      'https://rpc-testnet.arc.foundation',
      env.AGENT_PRIVATE_KEY,
      env.CONTRACT_ADDRESS,
      JSON.parse(env.CONTRACT_ABI)
    );
    
    // Process due payments
    const subscriptions = await getActiveSubscriptions(); // Your DB
    await agent.processPaymentsAutomatically(subscriptions);
  }
};
```

---

## 📊 Testing & Verification

### Check Subscription Status

```javascript
const subscription = await contract.subscriptions(subscriptionId);
console.log({
  subscriber: subscription.subscriber,
  creator: subscription.creator,
  amount: ethers.formatUnits(subscription.amount, 6),
  active: subscription.active
});
```

### Check if Payment Due

```javascript
const isDue = await contract.isPaymentDue(subscriptionId);
console.log('Payment due:', isDue);
```

### Get Agent Wallet

```javascript
const agentWallet = await contract.agentWallet();
console.log('Authorized agent:', agentWallet);
```

---

## 🔐 Security Best Practices

### Development/Testing
- ✅ Use separate wallet for development
- ✅ Never use wallets with real funds
- ✅ Test on testnet thoroughly

### Production
- ✅ Use hardware wallet for contract ownership
- ✅ Separate agent wallet from deployment wallet
- ✅ Monitor agent wallet activity
- ✅ Set up alerts for unexpected transactions
- ✅ Regular security audits
- ✅ Multi-sig for ownership transfer

### Environment Variables
```bash
# NEVER commit these to Git!
.env
.dev.vars
```

---

## 🆘 Troubleshooting

### Error: "UnauthorizedAgent"
**Issue**: Transaction not sent from agent wallet

**Fix**:
```typescript
// Make sure you're using agent wallet to sign
const contract = new ethers.Contract(
  contractAddress,
  abi,
  agentWallet // Must be the authorized agent
);
```

### Error: "Insufficient funds"
**Issue**: Wallet doesn't have enough USDC

**Fix**:
```powershell
# Check balance
npm run check-wallet

# Get more from faucet
# Visit: https://faucet.arc.foundation/
```

### Error: "TransferFailed"
**Issue**: User hasn't approved USDC spending

**Fix**:
```javascript
// User must approve contract first
await usdcContract.approve(
  subscriptionManagerAddress,
  ethers.parseUnits('1000', 6) // Approve 1000 USDC
);
```

---

## 🎯 Next Steps

1. ✅ Deploy contract to testnet
2. ✅ Test all agent functions
3. ✅ Integrate with your AI backend
4. ✅ Set up cron jobs for payment processing
5. ✅ Build frontend for user interaction
6. ✅ Test end-to-end flows
7. ✅ Security audit
8. ✅ Deploy to mainnet (when ready)

---

## 📚 Resources

- [Arc Documentation](https://docs.arc.foundation/)
- [Circle Developer Docs](https://developers.circle.com/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

---

**Need Help?**
- Check Arc Discord/Telegram
- Review contract comments
- Test with `npm run check-wallet` and `npm run test:rpc`
