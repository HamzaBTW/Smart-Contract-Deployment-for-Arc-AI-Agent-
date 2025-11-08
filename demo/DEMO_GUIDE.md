# 🎭 Demo Setup Guide

## Overview

This demo folder contains everything you need to showcase the AI Agent payment system **without creating real wallets**. All wallets are pre-generated test accounts.

⚠️ **IMPORTANT**: These are well-known test private keys. **NEVER send real funds to these addresses!**

---

## 📋 What's Included

### Demo Wallets (All Pre-configured)

| Role | Address | Purpose |
|------|---------|---------|
| **Contract Owner** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Deploys contract, owns it |
| **AI Agent** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Processes automated payments |
| **Demo User 1** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Subscribes to creators |
| **Demo User 2** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | Subscribes to creators |
| **Demo Creator 1** | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | Receives subscriptions |
| **Demo Creator 2** | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | Receives subscriptions |

All private keys are in `.env.demo` file.

---

## 🚀 Quick Start

### Step 1: Copy Demo Environment

```powershell
# Copy demo .env to main project folder
Copy-Item demo\.env.demo .env
```

### Step 2: Fund Demo Wallets

You need testnet USDC for the demo. Visit the faucet for each wallet:

**Primary Wallets to Fund:**
1. **Contract Owner** (for deployment gas):
   - Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - Visit: https://faucet.circle.com/
   - Get: ~0.1 USDC

2. **Demo Users** (for subscriptions):
   - User 1: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
   - User 2: `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
   - Get: ~10 USDC each

**Optional:** Fund AI Agent wallet for demo transactions
- Agent: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

### Step 3: Check Balances

```powershell
npm run check-wallet
```

### Step 4: Deploy Contract

```powershell
npm run compile
npm run deploy:contract:testnet
```

Save the deployed contract address and add it to `.env`:
```bash
CONTRACT_ADDRESS=0xYourDeployedAddress
```

### Step 5: Run Demo Scripts

```powershell
# Approve USDC spending for demo users
node demo/1-approve-usdc.js

# Create demo subscriptions
node demo/2-create-subscriptions.js

# Process payments as AI agent
node demo/3-process-payments.js

# Send automated tips
node demo/4-send-tips.js

# Check creator balances
node demo/5-check-balances.js
```

---

## 📜 Demo Scripts

### 1️⃣ Approve USDC (`1-approve-usdc.js`)

Approves the contract to spend USDC on behalf of demo users.

**What it does:**
- Demo User 1 approves 100 USDC
- Demo User 2 approves 100 USDC

### 2️⃣ Create Subscriptions (`2-create-subscriptions.js`)

AI Agent creates subscriptions for users.

**What it does:**
- User 1 subscribes to Creator 1 (5 USDC/month)
- User 2 subscribes to Creator 2 (3 USDC/month)
- User 1 subscribes to Creator 2 (2 USDC/month)

### 3️⃣ Process Payments (`3-process-payments.js`)

AI Agent processes recurring subscription payments.

**What it does:**
- Checks which subscriptions are due
- Processes payments automatically
- Shows transaction receipts

### 4️⃣ Send Tips (`4-send-tips.js`)

AI Agent sends automated tips based on user engagement.

**What it does:**
- User 1 tips Creator 1 (0.5 USDC for article)
- User 2 tips Creator 2 (0.25 USDC for video)

### 5️⃣ Check Balances (`5-check-balances.js`)

Shows current balances and earnings.

**What it does:**
- Creator 1's total earnings
- Creator 2's total earnings
- Platform fee collected
- Active subscriptions count

---

## 🎬 Demo Flow for Presentation

### Opening (1 minute)
```
"Let me show you true AI autonomy in Web3 payments.
These are 6 test wallets - users, creators, and an AI agent."
```

### Setup (1 minute)
```powershell
# Show the .env file (briefly)
cat .env

# Check wallet balances
npm run check-wallet
```

### Deployment (1 minute)
```powershell
# Deploy the contract
npm run deploy:contract:testnet

# Show deployed contract on explorer
# Open: https://testnet.arcscan.app/address/CONTRACT_ADDRESS
```

### AI Agent in Action (3 minutes)

```powershell
# 1. Approve USDC
node demo/1-approve-usdc.js
# Explain: "Users approve the contract to handle their USDC"

# 2. Create subscriptions
node demo/2-create-subscriptions.js
# Explain: "AI agent creates subscriptions autonomously"

# 3. Process payments
node demo/3-process-payments.js
# Explain: "AI agent processes recurring payments without manual intervention"

# 4. Send tips
node demo/4-send-tips.js
# Explain: "AI agent rewards creators based on user engagement"

# 5. Check results
node demo/5-check-balances.js
# Explain: "All transactions are transparent and verifiable on-chain"
```

### Closing (1 minute)
```
"The AI agent operates completely autonomously:
- No manual approval needed for recurring payments
- Secure: Only authorized agent wallet can trigger payments
- Transparent: All actions verifiable on blockchain
- User control: Users can cancel subscriptions anytime"
```

---

## 🔍 Verification on Block Explorer

After each transaction, view it on Arc Testnet explorer:

**Contract:**
```
https://testnet.arcscan.app/address/YOUR_CONTRACT_ADDRESS
```

**Transactions:**
```
https://testnet.arcscan.app/tx/TRANSACTION_HASH
```

**Wallets:**
- Owner: https://testnet.arcscan.app/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- Agent: https://testnet.arcscan.app/address/0x70997970C51812dc3A010C7d01b50e0d17dc79C8
- User 1: https://testnet.arcscan.app/address/0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

---

## 🛠️ Troubleshooting

### "Insufficient funds" error
**Solution:** Fund wallets from faucet:
```powershell
# Check which wallet needs funds
npm run check-wallet

# Visit faucet
start https://faucet.circle.com/
```

### "UnauthorizedAgent" error
**Solution:** Make sure using agent wallet in script:
```javascript
const agentWallet = new ethers.Wallet(
  process.env.AGENT_PRIVATE_KEY!,
  provider
);
```

### "TransferFailed" error
**Solution:** Users need to approve USDC first:
```powershell
node demo/1-approve-usdc.js
```

---

## ⚠️ Security Reminders

### These are TEST wallets:
- ❌ **DO NOT** send real funds
- ❌ **DO NOT** use for production
- ❌ **DO NOT** share these thinking they're private
- ✅ **DO** use for demo/testing only
- ✅ **DO** generate new wallets for production

### For Production:
1. Generate secure random private keys
2. Use hardware wallets for contract ownership
3. Never commit private keys to Git
4. Use environment variables
5. Regular security audits

---

## 📊 Expected Demo Results

After running all scripts, you should see:

**Subscriptions Created:**
- User 1 → Creator 1: 5 USDC/month ✅
- User 2 → Creator 2: 3 USDC/month ✅
- User 1 → Creator 2: 2 USDC/month ✅

**Payments Processed:**
- Initial payments: 10 USDC total
- Platform fee: ~0.1 USDC (1%)

**Tips Sent:**
- User 1 → Creator 1: 0.5 USDC ✅
- User 2 → Creator 2: 0.25 USDC ✅

**Creator Earnings:**
- Creator 1: ~5.5 USDC (subscription + tip)
- Creator 2: ~5.25 USDC (2 subscriptions + tip)

---

## 🎯 Key Points for Demo

1. **True Autonomy**: AI agent operates independently
2. **Security**: Only agent wallet can trigger payments
3. **Transparency**: All transactions on-chain
4. **User Control**: Users can cancel anytime
5. **Gas Efficient**: Custom errors, optimized code
6. **Production Ready**: Security patterns, reentrancy guards

---

## 📞 Support

Need help with the demo?
- Check `contracts/AI_AGENT_SETUP.md` for detailed setup
- Run `npm run test:rpc` to verify connection
- Run `npm run check-wallet` to verify balances
- Check Arc Discord for testnet issues

---

**Happy Demoing! 🚀**
