# Mailgun Sandbox Setup Guide

## Current Issue
Your Mailgun account is in **sandbox mode**, which restricts email delivery to authorized recipients only. This is why you're seeing "Forbidden" errors when trying to send emails.

## Solution Options

### Option 1: Add Authorized Recipients (Quick Fix for Testing)

1. **Log in to Mailgun Dashboard**:
   - Go to: https://app.mailgun.com
   - Navigate to: **Sending** → **Domains**
   - Click on your sandbox domain: `sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org`

2. **Add Authorized Recipients**:
   - In the domain settings, look for **Authorized Recipients** section
   - Click **Add Recipient**
   - Enter your Gmail address: `n91599727@gmail.com`
   - Mailgun will send a verification email to this address
   - Click the verification link in that email

3. **Test Again**:
   - After authorization, try registering again
   - You should now receive emails

**Limitations**:
- Maximum 5 authorized recipients in sandbox mode
- Only works for testing, not production
- Each recipient must verify their email

---

### Option 2: Upgrade to Production Domain (Recommended for Production)

1. **Add a Verified Domain**:
   - In Mailgun dashboard, go to: **Sending** → **Domains**
   - Click **Add New Domain**
   - Enter your actual domain (e.g., `yourdomain.com`)
   - Follow DNS setup instructions to verify domain ownership

2. **Update Environment Variables**:
   ```env
   MAILGUN_DOMAIN=mg.yourdomain.com  # Your verified domain
   EMAIL_FROM=noreply@mg.yourdomain.com
   ```

3. **Benefits**:
   - Send to any email address
   - Higher sending limits
   - Better deliverability
   - Professional appearance

---

### Option 3: Use Alternative for Local Testing

For local development without Mailgun restrictions:

1. **Use MailHog (Email Testing Tool)**:
   ```bash
   # Install MailHog
   brew install mailhog
   
   # Run MailHog
   mailhog
   ```

2. **Update .env for local testing**:
   ```env
   # Use MailHog instead of Mailgun for local dev
   EMAIL_PROVIDER=smtp
   SMTP_HOST=localhost
   SMTP_PORT=1025
   SMTP_SECURE=false
   SMTP_USER=
   SMTP_PASS=
   EMAIL_FROM=noreply@localhost
   ```

3. **View emails in browser**:
   - Open: http://localhost:8025
   - All emails appear here instead of being sent

---

## Current Configuration

Your current Mailgun sandbox details:
- **Domain**: `sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org`
- **Status**: Sandbox (requires authorized recipients)
- **API Key**: Configured and working
- **Health Check**: ✅ Passing

---

## Immediate Next Steps

### For Quick Testing (Recommended Now):

1. Go to Mailgun dashboard
2. Add `n91599727@gmail.com` as authorized recipient
3. Verify the email Mailgun sends you
4. Test registration again

### For Production Deployment:

1. Set up a verified domain in Mailgun
2. Update Render environment variables with new domain
3. Test thoroughly before going live

---

## Testing the Fix

After adding authorized recipient, test with:

```bash
# Test email sending
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "n91599727@gmail.com",
    "password": "Test123!",
    "role": "resident"
  }'
```

Check your Gmail for the verification email!

---

## Troubleshooting

If emails still don't arrive after authorization:

1. **Check Gmail spam folder**
2. **Verify authorization status in Mailgun dashboard**
3. **Check server logs**: `tail -f final-test.log`
4. **Test Mailgun API directly**:
   ```bash
   cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
   node --import ./load-env.js -e "
   import emailService from './src/services/emailService.js';
   const result = await emailService.sendRegistrationConfirmation(
     'n91599727@gmail.com', 
     'testuser', 
     'test-token'
   );
   console.log(result);
   "
   ```

---

## Additional Resources

- [Mailgun Sandbox Documentation](https://documentation.mailgun.com/en/latest/user_manual.html#sandboxes)
- [Mailgun Domain Verification](https://documentation.mailgun.com/en/latest/user_manual.html#verifying-your-domain)
- [MailHog for Local Testing](https://github.com/mailhog/MailHog)
