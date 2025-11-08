# 🎭 Demo Folder

This folder contains everything needed for a quick demonstration of the AI Agent payment system.

## 📁 Contents

- **`.env.demo`** - Pre-configured environment with test wallets
- **`DEMO_GUIDE.md`** - Complete demo setup and presentation guide
- **`1-approve-usdc.js`** - Approve USDC spending for demo users
- **`2-create-subscriptions.js`** - AI creates subscriptions autonomously
- **`3-process-payments.js`** - AI processes recurring payments
- **`4-send-tips.js`** - AI sends engagement-based tips
- **`5-check-balances.js`** - View all results and earnings

## 🚀 Quick Start

```powershell
# 1. Copy demo environment
Copy-Item demo\.env.demo .env

# 2. Fund demo wallets (get testnet USDC from faucet)
# Visit: https://faucet.circle.com/

# 3. Deploy contract
npm run compile
npm run deploy:contract:testnet

# 4. Run demo scripts in order
node demo/1-approve-usdc.js
node demo/2-create-subscriptions.js
node demo/3-process-payments.js
node demo/4-send-tips.js
node demo/5-check-balances.js
```

## ⚠️ Important

These are **test wallets only**. Never send real funds to these addresses!

For detailed instructions, see **DEMO_GUIDE.md**.
