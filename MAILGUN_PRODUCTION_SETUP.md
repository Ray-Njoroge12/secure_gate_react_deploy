# MAILGUN PRODUCTION SETUP GUIDE
# Moving from Sandbox to Production Domain

## CURRENT STATUS
- Using Mailgun Sandbox: sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org
- Sandbox limitations: Can only send to pre-authorized email addresses
- Need to upgrade to production domain for unrestricted sending

## STEP-BY-STEP PROCESS

### Step 1: Add Payment Method to Mailgun Account
1. Login to Mailgun dashboard: https://app.mailgun.com
2. Go to Account Settings → Billing
3. Add a valid payment method (credit card)
4. Choose a pricing plan (Flex Pay recommended for testing - $0.80 per 1000 emails)

### Step 2: Add Custom Domain (Option A) or Use Mailgun Subdomain (Option B)

#### Option A: Custom Domain (Recommended for production)
1. Go to Domains → Add New Domain
2. Enter your domain: secure-gate-react-deploy.vercel.app
3. Add the required DNS records:
   - TXT record for domain verification
   - MX records for receiving emails (optional)
   - CNAME records for tracking and DKIM

#### Option B: Mailgun Subdomain (Quick setup for testing)
1. Go to Domains → Add New Domain
2. Choose "Use a Mailgun subdomain"
3. Select a subdomain like: mg.secure-gate-react-deploy.vercel.app
4. Verify immediately (no DNS setup required)

### Step 3: Domain Verification
1. Wait for domain verification (can take up to 48 hours for custom domains)
2. Check verification status in Mailgun dashboard
3. Ensure all DNS records are properly configured

### Step 4: Update Environment Variables
Once domain is verified, update these variables:

```env
# Replace sandbox with your new domain
MAILGUN_DOMAIN=your-new-domain.mailgun.org  # or your custom domain
MAILGUN_API_KEY=your-api-key  # Keep existing key
EMAIL_FROM=noreply@your-new-domain.mailgun.org
SMTP_USER=postmaster@your-new-domain.mailgun.org
```

### Step 5: Test Production Sending
1. Remove email address restrictions
2. Test sending to any email address
3. Monitor delivery rates in Mailgun dashboard

## RECOMMENDED APPROACH FOR YOUR TESTING

For immediate testing without custom domain setup:

1. **Upgrade Account**: Add payment method to remove sandbox restrictions
2. **Use Mailgun Subdomain**: Create mg.secure-gate-react-deploy.vercel.app
3. **Immediate Testing**: Start testing with unlimited recipient sending
4. **Later Migration**: Move to custom domain when ready for production

## COST ESTIMATION
- Flex Pay Plan: $0.80 per 1000 emails
- For testing (100-500 emails): ~$0.08-$0.40
- Monthly minimum: Usually $0 for flex pay

## SECURITY CONSIDERATIONS
- Keep API keys secure in environment variables
- Use HTTPS endpoints only
- Monitor sending reputation
- Implement proper email validation
