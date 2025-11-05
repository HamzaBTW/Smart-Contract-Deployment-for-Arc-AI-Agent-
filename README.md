# 🚀 AI Content Payment Agent - Cloudflare Workers

> Serverless AI agent on Cloudflare's edge network for automated USDC content payments on Arc blockchain

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![Circle SDK](https://img.shields.io/badge/Circle-SDK%209.2.0-blue)](https://developers.circle.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ Quick Start (5 Minutes)

```bash
# 1. Install Wrangler CLI
npm install -g wrangler
wrangler login

# 2. Setup project
cd arc-ai-agent
npm install

# 3. Generate credentials (see CREDENTIALS.md)
npm run generate-secret
npm run register-secret

# 4. Compile smart contracts
npm run compile

# 5. Configure KV namespaces
wrangler kv:namespace create "USER_PREFS"
wrangler kv:namespace create "PAYMENT_HISTORY"
wrangler kv:namespace create "SUBSCRIPTIONS"
# Update IDs in wrangler.toml

# 6. Set secrets
wrangler secret put CIRCLE_API_KEY
wrangler secret put ENTITY_SECRET

# 7. Deploy!
npm run deploy
```

✅ **Live at:** `https://arc-ai-agent.your-subdomain.workers.dev`

---

## 📚 Documentation

- **[CREDENTIALS.md](./CREDENTIALS.md)** - Complete credentials setup guide
- **[QUICK_START.md](./QUICK_START.md)** - 5-minute deployment guide
- **[API.md](./API.md)** - API endpoints reference
- **[contracts/README.md](./contracts/README.md)** - Smart contract deployment guide

---

## 🎯 Features

✅ **AI Content Analysis** - Workers AI + OpenAI GPT-4  
✅ **USDC Payments** - Circle SDK (no gas fees!)  
✅ **Auto Subscriptions** - Cron-triggered renewals  
✅ **Daily Budgets** - Spending limits per user  
✅ **Recommendations** - AI-powered content discovery  
✅ **Global Edge** - 300+ cities worldwide  
✅ **Auto-scaling** - Handles millions of requests  
✅ **15+ API Endpoints** - Complete REST API  
✅ **Optional Smart Contracts** - Available for advanced use cases

---

## 📡 API Endpoints

### Core Endpoints

```bash
GET  /health                                 # Health check
POST /api/users/:id/preferences              # Set user preferences
GET  /api/users/:id/preferences              # Get user preferences
POST /api/users/:id/content/process          # AI analysis + payment
POST /api/users/:id/recommendations          # Get AI recommendations
POST /api/users/:id/tip                      # Send tip to creator
POST /api/users/:id/subscriptions            # Create subscription
GET  /api/users/:id/subscriptions            # Get subscriptions
```

[View complete API documentation →](./API.md)

---

## 📜 Payment Processing

### Circle SDK Integration

**All payments are processed through Circle SDK** - no smart contract deployment needed!

Circle's Developer-Controlled Wallets SDK handles:
- ✅ USDC transfers on Circle's blockchain
- ✅ Wallet creation and management
- ✅ No gas fees required
- ✅ Instant settlement
- ✅ Built-in security and compliance

**How It Works:**
```javascript
// Create wallet
const wallet = await paymentService.createWallet(userId);

// Transfer USDC
await paymentService.transferUSDC({
  from: userWallet,
  to: creatorWallet,
  amount: 0.25 // $0.25 USD
});

// Check balance
const balance = await paymentService.getBalance(walletId);
```

**Backend Services:**
- `payment.service.js` - USDC transfers via Circle SDK
- `subscription.service.js` - Recurring payment logic in KV storage
- Circle handles blockchain operations automatically

### Optional: Smart Contracts

**Smart contracts are available but NOT required** for basic operations. They're included for advanced use cases like:
- On-chain escrow
- Complex payment logic
- Decentralized governance

**If needed, contracts are ready to deploy:**
```bash
npm run compile
npm run deploy:contract:testnet
```

📖 **[Full Contract Documentation →](./contracts/README.md)**

---

## 🏗️ Architecture

```
User Request → Cloudflare Edge (nearest datacenter)
    ↓
AI Agent Worker
    ↓
┌──────────────┬───────────────┬──────────────┐
│ Workers AI   │  Circle SDK   │  KV Storage  │
│ (Analysis)   │  (Payments)   │  (User Data) │
└──────────────┴───────────────┴──────────────┘
    ↓               ↓                 ↓
OpenAI API    Circle Blockchain  Persistent Data
(Fallback)    (USDC via SDK)     (Preferences)
```

### Tech Stack

**Backend:**
- Cloudflare Workers (Serverless Edge Computing)
- Circle Developer Wallets SDK (USDC payments)
- Workers AI / OpenAI (Content analysis)
- Cloudflare KV (Key-value storage)

**Payment Processing:**
- Circle SDK - All payments via API
- No blockchain deployment needed
- No gas fees
- Instant USDC transfers

**Smart Contracts (Optional):**
- Solidity ^0.8.20 (for advanced features)
- OpenZeppelin Contracts
- Hardhat (Development framework)
- Available but not required for core functionality

**Frontend:**
- React + TypeScript
- Ethers.js (Web3 integration)
- TailwindCSS (Styling)

---

## 💡 Why Cloudflare Workers?

| Feature | Workers | Traditional Server |
|---------|---------|-------------------|
| **Cold Start** | < 10ms | 200-1000ms |
| **Global** | 300+ cities | Single region |
| **Scaling** | Automatic | Manual |
| **Cost** | $0-5/month | $20-50/month |
| **Setup** | 5 minutes | 30+ minutes |

---

## 🔒 Security

- ✅ No hardcoded credentials
- ✅ User generates own secrets
- ✅ Encrypted secrets storage
- ✅ Comprehensive .gitignore
- ✅ Recovery file backups
- ✅ Separate dev/prod environments

**See [CREDENTIALS.md](./CREDENTIALS.md) for security guide**

---

## 🛠️ Development

### Project Structure

```
arc-ai-agent/
├── src/                    # Cloudflare Worker source
│   ├── index.js           # Main worker entry point
│   └── services/          # Service modules
│       ├── openai.service.js
│       ├── payment.service.js
│       └── subscription.service.js
├── contracts/             # Smart contracts
│   ├── SubscriptionManager.sol  # Main subscription contract
│   └── README.md          # Contract deployment guide
├── scripts/               # Deployment & utility scripts
│   ├── deploy.js          # Contract deployment
│   ├── interact.js        # Contract interaction
│   ├── generateEntitySecret.js
│   └── registerEntitySecret.js
├── frontend/              # React frontend
├── hardhat.config.js      # Hardhat configuration
├── wrangler.toml          # Cloudflare Workers config
└── package.json           # Dependencies & scripts
```

### Local Testing

```bash
# Copy environment template
cp .dev.vars.example .dev.vars

# Edit with your credentials
nano .dev.vars

# Start local server
npm run dev

# Test
curl http://localhost:8787/health
```

### Available Scripts

**Backend / Worker:**
```bash
npm run dev                  # Local development
npm run deploy               # Deploy to production
npm run deploy:staging       # Deploy to staging
npm run tail                 # View logs
npm run tail:errors          # View error logs only
npm run generate-secret      # Generate entity secret
npm run register-secret      # Register with Circle
```

**Smart Contracts:**
```bash
npm run compile              # Compile Solidity contracts
npm run deploy:contract:testnet  # Deploy to Arc testnet
npm run deploy:contract:mainnet  # Deploy to Arc mainnet
npm run interact             # Interact with deployed contract
npm run test:contract        # Run contract tests
npm run node                 # Start local Hardhat node
```

---

## 📊 Project Stats

- **Lines of Code:** 1,417
- **API Endpoints:** 15+
- **Services:** 3 (AI, Payment, Subscription)
- **Smart Contracts:** 1 (SubscriptionManager)
- **Storage:** Cloudflare KV
- **Blockchain:** Arc (EVM-compatible)
- **Cron Jobs:** Automatic hourly checks

---

## 🌍 Global Deployment

Runs on Cloudflare's edge network:
- 300+ cities worldwide
- Sub-10ms latency
- Automatic DDoS protection
- 99.99% uptime SLA

---

## 💰 Pricing

### Free Tier (Perfect for Hackathon)
- 100,000 requests/day
- 10ms CPU per request
- 1GB KV storage
- 10,000 Workers AI requests/day

### Paid Plan ($5/month)
- 10 million requests/month
- Additional: $0.50/million

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 License

MIT License - see [LICENSE](./LICENSE)

---

## 🎓 Built For

**AI Agents on Arc Hackathon**
- Arc Blockchain
- Circle USDC
- Cloudflare Workers
- OpenAI / Workers AI

---

## 📞 Support

- [Circle Documentation](https://developers.circle.com/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Issues](https://github.com/yourusername/arc-ai-agent/issues)

---

**Status:** ✅ Production Ready  
**Deploy Time:** 5 minutes  
**Cost:** $0 (free tier)  

🚀 **Ready to deploy!**
