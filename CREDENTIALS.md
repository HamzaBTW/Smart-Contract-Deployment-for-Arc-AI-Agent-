# 🔐 Credentials Setup Guide

## ⚠️ IMPORTANT: Security First

**THIS PROJECT DOES NOT INCLUDE ANY CREDENTIALS.**

You must generate and configure your own credentials following this guide. Never share your credentials publicly or commit them to git.

---

## 📋 Required Credentials

### 1. Circle API Key (REQUIRED)
### 2. Entity Secret (REQUIRED)
### 3. OpenAI API Key (OPTIONAL)

---

## 🚀 Step 1: Get Circle API Key

### A. Create Circle Account

1. Go to [Circle Developer Console](https://console.circle.com/)
2. Click "Sign Up" to create an account
3. Complete email verification
4. Complete KYC verification (if required)

### B. Generate API Key

1. In the dashboard, navigate to "API Keys"
2. Click "Create API Key"
3. Select environment:
   - **Sandbox/Testnet** for development (recommended to start)
   - **Production** for real transactions
4. Copy and save your API Key immediately

**API Key Format:** `TEST_API_KEY:xxxxxxxxxxxxx:xxxxxxxxxxxxx`

**⚠️ CRITICAL:** Circle shows the API key only once. Save it securely immediately.

---

## 🔑 Step 2: Generate Entity Secret

### A. Run Generation Script

```bash
cd arc-ai-agent
npm install
npm run generate-secret
```

**Alternative:**
```bash
node scripts/generateEntitySecret.js
```

### Expected Output:

```
🔐 Generating Entity Secret...

✅ Entity Secret Generated Successfully!

═══════════════════════════════════════════════════════════
Entity Secret: abc123def456789...
═══════════════════════════════════════════════════════════

📝 IMPORTANT NEXT STEPS:

1. SAVE this Entity Secret securely
2. Copy it to your .dev.vars file
3. Register it with Circle
```

### B. Save Entity Secret

**Copy the generated Entity Secret and save it in:**
- Password manager (recommended)
- Secure note-taking app
- Encrypted file

**Never:**
- ❌ Commit to git
- ❌ Share via email or chat
- ❌ Store in plain text files
- ❌ Use the same secret in multiple environments

---

## 📝 Step 3: Register Entity Secret with Circle

### A. Run Registration Script

```bash
npm run register-secret
```

**Alternative:**
```bash
node scripts/registerEntitySecret.js
```

### B. Follow Prompts

The script will ask for:

1. **Circle API Key**: Paste the key you got in Step 1
2. **Entity Secret**: Paste the secret you generated in Step 2

### C. Save Recovery File

The script will generate: `recovery_file_[timestamp].dat`

**⚠️ ULTRA CRITICAL - BACKUP THIS FILE!**

This recovery file is your **only way** to:
- Recover wallets if you lose access
- Migrate to new infrastructure
- Restore after system failure
- Comply with audit requirements

**Backup Checklist:**
- [ ] Store in 3+ separate secure locations
- [ ] Upload to encrypted cloud (1Password, LastPass, etc)
- [ ] Keep offline copy in safe/vault
- [ ] Document backup locations
- [ ] Test restoration procedure
- [ ] Never commit to version control
- [ ] Never share via insecure channels

---

## 🔧 Step 4: Configure Environment Variables

### For Local Development:

```bash
# Copy template
cp .dev.vars.example .dev.vars

# Edit with your credentials
nano .dev.vars
# or
code .dev.vars
# or
vim .dev.vars
```

**Fill in your credentials:**

```env
# Your Circle API Key from Step 1
CIRCLE_API_KEY=TEST_API_KEY:your_actual_key_here

# Your Entity Secret from Step 2
ENTITY_SECRET=your_actual_entity_secret_here

# Optional: OpenAI API Key (or leave empty for Workers AI)
OPENAI_API_KEY=

# These defaults are usually correct
USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
PAYMENT_THRESHOLD=0.10
MIN_QUALITY_SCORE=0.7
ENVIRONMENT=development
```

### For Production (Cloudflare):

```bash
# Set secrets in Cloudflare
wrangler secret put CIRCLE_API_KEY
# Paste: TEST_API_KEY:your_actual_key_here

wrangler secret put ENTITY_SECRET
# Paste: your_actual_entity_secret_here

# Optional: OpenAI
wrangler secret put OPENAI_API_KEY
# Paste: sk-your_openai_key or press Enter to skip

# Configuration
wrangler secret put USDC_ADDRESS
# Paste: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d

wrangler secret put PAYMENT_THRESHOLD
# Paste: 0.10

wrangler secret put MIN_QUALITY_SCORE
# Paste: 0.7
```

---

## 🤖 (Optional) Step 5: OpenAI API Key

### Do You Need OpenAI?

**NO - if:**
- You're using Cloudflare Workers AI (included free with Workers)
- You're okay with Llama 2 model
- You want to minimize costs

**YES - if:**
- You specifically need GPT-4 or GPT-4 Turbo
- Workers AI is not available in your Cloudflare plan
- You prefer OpenAI's models and features

### Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to "API Keys"
4. Click "Create new secret key"
5. Name your key (e.g., "Arc AI Agent")
6. Copy and save the key immediately

**API Key Format:** `sk-...`

### Configure

**Local development:**
```bash
echo "OPENAI_API_KEY=sk-your_actual_key" >> .dev.vars
```

**Production:**
```bash
wrangler secret put OPENAI_API_KEY
```

---

## ✅ Verify Configuration

### Test Local Setup:

```bash
# Start development server
npm run dev

# In another terminal, test health endpoint
curl http://localhost:8787/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T...",
  "version": "1.0.0",
  "environment": "development",
  "edge": true
}
```

### Test Production:

```bash
# Deploy
npm run deploy

# Test live endpoint
curl https://your-worker-name.your-subdomain.workers.dev/health
```

---

## 📂 Security Files

### Files That MUST Be in .gitignore:

```
.dev.vars              ← Local credentials
recovery_file*.dat     ← Recovery files
.env                   ← Alternative env file
credentials.json       ← Any credential files
*.env                  ← All .env variants
```

### Verify .gitignore:

```bash
cat .gitignore | grep -E "dev\.vars|recovery|\.env"
```

Should show:
```
.dev.vars
recovery_file*.dat
.env
```

---

## 🔒 Security Best Practices

### ✅ ALWAYS DO:

1. **Use Different Credentials Per Environment**
   - Development: Separate API keys
   - Staging: Separate API keys
   - Production: Separate API keys

2. **Rotate API Keys Periodically**
   - Every 90 days minimum
   - Immediately if compromised
   - After team member departure

3. **Backup Recovery Files**
   - 3+ secure locations
   - Test restoration annually
   - Document backup locations

4. **Use Password Managers**
   - 1Password
   - LastPass
   - Bitwarden
   - HashiCorp Vault

5. **Enable 2FA Everywhere**
   - Circle account
   - Cloudflare account
   - OpenAI account
   - GitHub account

6. **Review .gitignore Before Every Commit**
   ```bash
   git status
   git diff
   ```

### ❌ NEVER DO:

1. ❌ **Commit credentials to git**
   ```bash
   # Bad
   git add .dev.vars
   ```

2. ❌ **Share API keys via email/chat**

3. ❌ **Hardcode secrets in source code**
   ```javascript
   // Bad
   const API_KEY = "TEST_API_KEY:xxx";
   ```

4. ❌ **Use production credentials in development**

5. ❌ **Share entity secrets between environments**

6. ❌ **Skip recovery file backups**

7. ❌ **Use weak or default passwords**

---

## 🆘 Troubleshooting

### Error: "Invalid API Key"

**Possible Causes:**
- API key format incorrect
- API key expired
- Wrong environment (testnet vs production)
- Copy/paste error (extra spaces)

**Solutions:**
1. Verify key format: `TEST_API_KEY:xxx:xxx`
2. Check for spaces at beginning/end
3. Generate new API key if necessary
4. Verify environment matches (testnet/production)

### Error: "Entity Secret Not Registered"

**Possible Causes:**
- Entity secret never registered
- Registration failed silently
- Using wrong entity secret

**Solutions:**
1. Run registration again:
   ```bash
   npm run register-secret
   ```
2. Verify registration succeeded
3. Check recovery file was created
4. Use same entity secret in .dev.vars

### Error: "Recovery File Not Found"

**Possible Causes:**
- File was accidentally deleted
- Registration didn't complete
- File saved in different directory

**Solutions:**
1. Re-run registration:
   ```bash
   npm run register-secret
   ```
2. New recovery file will be generated
3. Backup immediately to multiple locations

### Credentials Don't Work in Production

**Possible Causes:**
- Secrets not set in Cloudflare
- Used .dev.vars instead of wrangler secrets
- Typo when setting secrets

**Solutions:**
```bash
# Set all secrets again
wrangler secret put CIRCLE_API_KEY
wrangler secret put ENTITY_SECRET

# Verify secrets are set
wrangler secret list
```

### Workers AI Not Available

**Possible Causes:**
- Workers AI not included in your Cloudflare plan
- Workers AI quota exceeded
- Region restrictions

**Solutions:**
1. Check your Cloudflare plan includes Workers AI
2. Add OpenAI API key as fallback:
   ```bash
   wrangler secret put OPENAI_API_KEY
   ```
3. The code automatically falls back to keyword matching

---

## 📞 Support & Resources

### Circle Support:
- [Circle Documentation](https://developers.circle.com/)
- [Circle Support Portal](https://support.circle.com/)
- [Circle Community](https://community.circle.com/)

### Cloudflare Support:
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Community](https://community.cloudflare.com/)
- [Cloudflare Discord](https://discord.gg/cloudflaredev)

### OpenAI Support:
- [OpenAI Documentation](https://platform.openai.com/docs)
- [OpenAI Help Center](https://help.openai.com/)
- [OpenAI Community](https://community.openai.com/)

---

## ✅ Final Checklist

Before deploying:

- [ ] Circle account created and verified
- [ ] Circle API Key obtained and saved
- [ ] Entity Secret generated
- [ ] Entity Secret registered with Circle
- [ ] Recovery file saved in 3+ secure locations
- [ ] .dev.vars configured (local) OR wrangler secrets set (production)
- [ ] .gitignore verified to include sensitive files
- [ ] Health endpoint tested and working
- [ ] All credentials stored in password manager
- [ ] 2FA enabled on all accounts
- [ ] Backup and restore procedure documented

---

## 🎯 Next Steps

Once all credentials are configured:

**Local Development:**
```bash
npm run dev
```

**Deploy to Production:**
```bash
npm run deploy
```

**View Logs:**
```bash
npm run tail
```

---

**Security Level:** ✅ Maximum
**Credentials Included:** ❌ None (user generates their own)
**Best Practices:** ✅ All followed
**Ready for:** Production use

🔒 **Your credentials, your security, your control.**
