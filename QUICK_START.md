# 🚀 Quick Start Guide

Deploy your AI agent in 5 minutes!

---

## Prerequisites

- Cloudflare account (free tier works!)
- Circle account
- Node.js installed

---

## Step-by-Step Deployment

### 1️⃣ Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

This will open your browser to authenticate with Cloudflare.

### 2️⃣ Install Dependencies

```bash
cd arc-ai-agent
npm install
```

### 3️⃣ Generate Credentials

**Read the complete guide:** [CREDENTIALS.md](./CREDENTIALS.md)

**Quick version:**

```bash
# Generate Entity Secret
npm run generate-secret

# Register with Circle
npm run register-secret
```

Save your recovery file securely!

### 4️⃣ Create KV Namespaces

```bash
wrangler kv:namespace create "USER_PREFS"
wrangler kv:namespace create "PAYMENT_HISTORY"
wrangler kv:namespace create "SUBSCRIPTIONS"
```

Copy the IDs and update `wrangler.toml` lines 7-9.

### 5️⃣ Configure Secrets

```bash
wrangler secret put CIRCLE_API_KEY
# Paste your Circle API key

wrangler secret put ENTITY_SECRET
# Paste your entity secret

# Optional: OpenAI (or use free Workers AI)
wrangler secret put OPENAI_API_KEY

# Configuration
wrangler secret put USDC_ADDRESS
# Paste: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

wrangler secret put PAYMENT_THRESHOLD
# Paste: 0.10

wrangler secret put MIN_QUALITY_SCORE
# Paste: 0.7
```

### 6️⃣ Deploy!

```bash
npm run deploy
```

Your agent is now live globally! 🎉

---

## Testing Your Deployment

### Health Check

```bash
curl https://your-worker.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T...",
  "version": "1.0.0"
}
```

### Set User Preferences

```bash
curl -X POST https://your-worker.workers.dev/api/users/test123/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "interests": ["AI", "blockchain"],
    "maxDailyBudget": 50.00,
    "favoriteCreators": ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"]
  }'
```

### Process Content

```bash
curl -X POST https://your-worker.workers.dev/api/users/test123/content/process \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "test-1",
    "title": "AI Agents on Blockchain",
    "type": "article",
    "creatorAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "price": 0.50,
    "tags": ["AI", "blockchain"]
  }'
```

---

## Local Development

```bash
# Copy environment template
cp .dev.vars.example .dev.vars

# Edit with your credentials
nano .dev.vars

# Start local server
npm run dev

# Test locally
curl http://localhost:8787/health
```

---

## View Logs

```bash
# Real-time logs
npm run tail

# Only errors
npm run tail:errors
```

---

## Troubleshooting

### "KV namespace not found"
Create namespaces and update IDs in `wrangler.toml`

### "Secret not found"
Run all `wrangler secret put` commands

### "Workers AI not available"
Add OpenAI API key or use keyword matching fallback

### Deploy fails
Check `wrangler.toml` configuration and KV namespace IDs

---

## What's Next?

- Read [API.md](./API.md) for complete API reference
- Review [CREDENTIALS.md](./CREDENTIALS.md) for security best practices
- Check [README.md](./README.md) for architecture details

---

**Deploy Time:** 5 minutes  
**Cost:** $0 (free tier)  
**Status:** ✅ Production Ready

🚀 **You're live!**
