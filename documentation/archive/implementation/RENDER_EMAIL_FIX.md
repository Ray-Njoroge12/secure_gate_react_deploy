# 🚨 RENDER EMAIL FIX - QUICK REFERENCE

## The Problem

```
YOU: "I'm not getting emails on Render"

WHY: MailHog is LOCAL ONLY - it doesn't exist on Render servers!

┌──────────────────────┐         ┌──────────────────────┐
│   YOUR COMPUTER      │         │    RENDER SERVER     │
│  (Local Development) │         │    (Production)      │
├──────────────────────┤         ├──────────────────────┤
│                      │         │                      │
│  MailHog ✅          │         │  MailHog ❌          │
│  localhost:1025      │         │  (doesn't exist!)    │
│                      │         │                      │
│  Works perfectly!    │         │  Must use Mailgun    │
│                      │         │                      │
└──────────────────────┘         └──────────────────────┘
```

## The Solution (3 Steps)

### ✅ STEP 1: Update Render Environment Variables

Go to: https://dashboard.render.com/web/srv-cu83f7ij1k6c73c81nv0/env

Add these variables:

| Variable | Value |
|----------|-------|
| `EMAIL_PROVIDER` | `mailgun` |
| `MAILGUN_API_KEY` | `384194fbcc249187502fb33969b35269-96164d60-b4388e96` |
| `MAILGUN_DOMAIN` | `sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org` |
| `EMAIL_FROM` | `noreply@sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org` |
| `EMAIL_FROM_NAME` | `Secure Gate Access` |
| `SMTP_HOST` | `smtp.mailgun.org` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `postmaster@sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org` |
| `SMTP_PASS` | `9e1d5b8936fc15ec09e88b08908e2a37-5e1ffd43-becdfdc6` |

Click **"Save Changes"**

---

### ✅ STEP 2: Authorize Your Email in Mailgun

**CRITICAL:** Mailgun sandbox only sends to authorized recipients!

1. **Go to**: https://app.mailgun.com/app/sending/domains/sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org

2. **Look for**: "Authorized Recipients" section

3. **Click**: "Add Recipient" or "Invite"

4. **Enter**: Your email address (e.g., yourname@gmail.com)

5. **Check your email**: Mailgun sends a verification email

6. **Click the link**: In the verification email to authorize

7. **Done!** You can now receive emails from your app

---

### ✅ STEP 3: Redeploy on Render

1. **Go to**: https://dashboard.render.com/web/srv-cu83f7ij1k6c73c81nv0

2. **Click**: "Manual Deploy" button

3. **Select**: "Deploy latest commit"

4. **Wait**: ~2-3 minutes for deployment

5. **Test**: Register with your authorized email

6. **Check inbox!** (including spam folder)

---

## 🧪 Testing Commands

### Test on Render (after configuration)
```bash
# Replace YOUR_RENDER_URL with your actual URL
curl -X POST https://YOUR_RENDER_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "your-authorized-email@gmail.com",
    "password": "Test123!",
    "role": "resident"
  }'
```

### Test Locally (still uses MailHog)
```bash
# Make sure MailHog is running: mailhog

curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "localtest",
    "email": "test@local.dev",
    "password": "Test123!",
    "role": "resident"
  }'

# View at: http://localhost:8025
```

---

## 🔍 Troubleshooting

### "Still no emails on Render"

**Check 1:** Did you authorize your email in Mailgun?
- Go to Mailgun dashboard → Authorized Recipients
- Make sure your email is listed and verified

**Check 2:** Did you redeploy after changing environment variables?
- Render needs a new deployment to pick up env changes

**Check 3:** Check your spam folder!
- Sandbox emails often go to spam

**Check 4:** Check Render logs
- Go to Render dashboard → Logs tab
- Look for: "Email sent successfully via Mailgun"

**Check 5:** Check Mailgun logs
- https://app.mailgun.com/app/sending/logs
- Look for rejected/failed emails

---

## 💡 Quick Links

- **Render Environment**: https://dashboard.render.com/web/srv-cu83f7ij1k6c73c81nv0/env
- **Mailgun Dashboard**: https://app.mailgun.com/app/sending/domains/sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org
- **Mailgun Logs**: https://app.mailgun.com/app/sending/logs
- **Local MailHog**: http://localhost:8025

---

## ⏱️ Time Required

- **Step 1** (Render env vars): 2 minutes
- **Step 2** (Mailgun authorization): 3 minutes
- **Step 3** (Redeploy): 3 minutes
- **Total**: ~10 minutes

---

## ✨ After This Works

You'll have:
- ✅ Local dev using MailHog (fast, offline testing)
- ✅ Production using Mailgun (real email delivery)
- ✅ No code changes needed (automatic based on environment)

---

## 🚀 For Production (Later)

To remove the 5-recipient limit:
1. Add a verified domain in Mailgun (e.g., mg.yourdomain.com)
2. Configure DNS records
3. Update Render env vars with new domain
4. Send to unlimited recipients!

Cost: Free for first 5,000 emails/month on Mailgun

---

**Need help? All the details are in:**
- `EMAIL_SETUP_GUIDE.md` (comprehensive guide)
- `configure-render-mailgun.sh` (automated script)
- `MAILGUN_SANDBOX_SETUP.md` (Mailgun-specific info)
