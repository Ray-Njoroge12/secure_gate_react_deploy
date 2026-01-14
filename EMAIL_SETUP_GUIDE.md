# 📧 EMAIL CONFIGURATION: LOCAL vs PRODUCTION

## ⚠️ IMPORTANT: MailHog vs Mailgun

### The Problem You're Experiencing

**MailHog ONLY works on your local computer** - it's not available on Render!

```
┌─────────────────────────────────────────────────────────┐
│  LOCAL DEVELOPMENT (Your Computer)                      │
├─────────────────────────────────────────────────────────┤
│  ✅ MailHog running on localhost:1025                   │
│  ✅ Emails captured locally                             │
│  ✅ View at http://localhost:8025                       │
│  ✅ No internet required                                │
│  ✅ No restrictions                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  PRODUCTION (Render Server)                             │
├─────────────────────────────────────────────────────────┤
│  ❌ MailHog NOT available (localhost doesn't exist)     │
│  ✅ Must use Mailgun (external email service)           │
│  ⚠️  Sandbox domain has recipient restrictions          │
│  🔧 Requires recipient authorization OR verified domain │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 SOLUTION: Configure Render for Mailgun

### Step 1: Set Render Environment Variables

Run this script to configure Render:

```bash
cd /Users/raynj/Desktop/secure-gate-react-express
bash configure-render-mailgun.sh
```

**Before running, set your Render API key:**
```bash
export RENDER_API_KEY='your-render-api-key-here'
```

Get your API key from: https://dashboard.render.com/u/settings/api-keys

---

### Step 2: Fix Mailgun Sandbox Restriction

Your Mailgun account uses a **sandbox domain**, which only sends to authorized recipients.

#### Option A: Authorize Recipients (Quick Testing)

1. **Go to Mailgun Dashboard:**
   ```
   https://app.mailgun.com/app/sending/domains/sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org
   ```

2. **Find "Authorized Recipients" section**

3. **Add your test email:**
   - Click "Add Recipient" or "Invite"
   - Enter: your-email@gmail.com (or whatever email you'll test with)
   - Mailgun sends a verification email
   - Click the link in that email to authorize

4. **Test registration:**
   - Now register with that authorized email
   - You'll receive the verification email!

**Limitation:** Maximum 5 authorized recipients in sandbox mode

---

#### Option B: Upgrade to Verified Domain (Production Solution)

For production use without restrictions:

1. **Add Custom Domain in Mailgun:**
   - Go to Mailgun Dashboard → Domains → Add New Domain
   - Enter: `mg.yourdomain.com` (or similar subdomain)

2. **Configure DNS Records:**
   - Mailgun will provide DNS records
   - Add them to your domain DNS settings
   - Wait for verification (can take a few hours)

3. **Update Render Environment Variables:**
   ```bash
   # After domain is verified, update these on Render:
   MAILGUN_DOMAIN=mg.yourdomain.com
   EMAIL_FROM=noreply@mg.yourdomain.com
   SMTP_USER=postmaster@mg.yourdomain.com
   ```

4. **Benefits:**
   - ✅ Send to ANY email address
   - ✅ Higher sending limits
   - ✅ Better deliverability
   - ✅ Professional appearance

---

## 📋 Current Configuration

### Local Development (.env file)
```env
# Current local .env uses MailHog
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=noreply@securegatetesting.local
```

### Production (Render)
```env
# Render needs Mailgun configuration
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=384194fbcc249187502fb33969b35269-96164d60-b4388e96
MAILGUN_DOMAIN=sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org
EMAIL_FROM=noreply@sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org
SMTP_PASS=9e1d5b8936fc15ec09e88b08908e2a37-5e1ffd43-becdfdc6
```

---

## 🧪 Testing After Configuration

### Test on Render (After Authorization)

1. **Authorize your email in Mailgun** (see Step 2 above)

2. **Trigger a deploy on Render:**
   - Go to: https://dashboard.render.com/web/srv-cu83f7ij1k6c73c81nv0
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait for deployment to complete

3. **Test registration:**
   ```bash
   # Replace YOUR_RENDER_URL with your actual Render URL
   curl -X POST https://YOUR_RENDER_URL/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "email": "your-authorized-email@gmail.com",
       "password": "Test123!",
       "role": "resident"
     }'
   ```

4. **Check your email inbox** (including spam folder)

---

### Test Locally (No Changes Needed)

Local testing still uses MailHog:

```bash
# 1. Make sure MailHog is running
mailhog

# 2. Start your local server
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
node --import ./load-env.js --inspect server.js

# 3. Test registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "localtest",
    "email": "test@local.dev",
    "password": "Test123!",
    "role": "resident"
  }'

# 4. View email at http://localhost:8025
```

---

## 🔍 Troubleshooting

### Problem: No emails received on Render

**Check 1: Is EMAIL_PROVIDER set to "mailgun"?**
```bash
# Check Render environment variables
# Go to: https://dashboard.render.com/web/srv-cu83f7ij1k6c73c81nv0
# Look for EMAIL_PROVIDER - should be "mailgun", not "smtp"
```

**Check 2: Is the recipient authorized in Mailgun?**
```bash
# Go to Mailgun dashboard and check authorized recipients
# https://app.mailgun.com/app/sending/domains/sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org
```

**Check 3: Check Render logs**
```bash
# View logs in Render dashboard
# Look for email-related errors
# Should see: "Email sent successfully via Mailgun"
```

**Check 4: Check Mailgun logs**
```bash
# Go to Mailgun dashboard → Sending → Logs
# https://app.mailgun.com/app/sending/logs
# Look for failed/rejected emails
```

---

### Problem: Emails work locally but not on Render

This is **expected** because:
- Local uses MailHog (localhost:1025)
- Render needs Mailgun (external service)

**Solution:** Follow Step 1 and Step 2 above to configure Render for Mailgun

---

## 📊 Summary Table

| Environment | Email Service | Configuration | Recipient Restrictions |
|-------------|---------------|---------------|------------------------|
| **Local** | MailHog | `.env` file | None - all emails captured |
| **Render (Sandbox)** | Mailgun | Render env vars | Only authorized recipients |
| **Render (Verified)** | Mailgun | Render env vars | None - any email address |

---

## ✅ Quick Action Items

**For Testing on Render RIGHT NOW:**

1. ✅ Run `configure-render-mailgun.sh` to set Render environment variables
2. ✅ Go to Mailgun dashboard and authorize your test email
3. ✅ Verify the authorization email Mailgun sends you
4. ✅ Redeploy on Render
5. ✅ Test registration with your authorized email
6. ✅ Check your inbox!

**For Production (When Ready):**

1. Add verified domain in Mailgun
2. Configure DNS records
3. Update Render environment variables with new domain
4. Enjoy unlimited email sending!

---

## 🔗 Useful Links

- **Mailgun Dashboard**: https://app.mailgun.com
- **Your Mailgun Domain**: https://app.mailgun.com/app/sending/domains/sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org
- **Render Dashboard**: https://dashboard.render.com/web/srv-cu83f7ij1k6c73c81nv0
- **Render API Keys**: https://dashboard.render.com/u/settings/api-keys
- **Mailgun Documentation**: https://documentation.mailgun.com/
- **MailHog (Local)**: http://localhost:8025

---

## 💡 Pro Tip

Keep both configurations:
- **Local .env**: Uses MailHog for fast, offline testing
- **Render env vars**: Uses Mailgun for real email delivery

This way you can:
- 🚀 Develop and test offline with MailHog
- 📧 Deploy to production with real Mailgun emails
- 🔄 Switch between them automatically based on environment

No code changes needed - just environment variables!
