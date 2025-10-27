# 📧 Email Integration Setup Guide

## Current Status
🔴 **EMAIL SERVICE: NOT CONFIGURED**

The nodemailer integration exists but is using **placeholder credentials**. The system needs actual SMTP service configuration to send emails.

## Current Configuration Analysis

### ❌ What's Not Working
- **SMTP User**: `your-email@gmail.com` (placeholder)
- **SMTP Pass**: Placeholder value
- **Authentication**: Failing with "Invalid login" error
- **Email Sending**: Not functional

### ✅ What's Working
- **SMTP Configuration**: Properly structured
- **Integration Code**: Nodemailer integration exists
- **Email Templates**: Visitor invitation and OTP templates available
- **Environment Setup**: Configuration framework ready

## Email Service Provider Options

### 1. 🟢 **Gmail (Recommended for Development)**

**Pros**: Free, reliable, easy setup
**Cons**: Requires App Password, limited sending volume

**Setup Steps**:
1. Enable 2-Factor Authentication on Gmail
2. Generate App Password: [Google Account Settings](https://myaccount.google.com/apppasswords)
3. Configure environment variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=your-16-character-app-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Secure Gate Access
```

### 2. 🟢 **SendGrid (Recommended for Production)**

**Pros**: High deliverability, detailed analytics, scalable
**Cons**: Paid service (free tier available)

**Setup Steps**:
1. Create account at [SendGrid](https://sendgrid.com)
2. Generate API key
3. Configure environment variables:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Secure Gate Access
```

### 3. 🟢 **AWS SES (Recommended for Production)**

**Pros**: Cost-effective, scalable, reliable
**Cons**: Requires AWS account, setup complexity

**Setup Steps**:
1. Create AWS account
2. Set up SES service
3. Verify email addresses/domains
4. Configure environment variables:

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-smtp-username
SMTP_PASS=your-aws-smtp-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Secure Gate Access
```

### 4. 🟡 **Mailgun**

**Pros**: Developer-friendly, good deliverability
**Cons**: Paid service

**Setup Steps**:
1. Create account at [Mailgun](https://mailgun.com)
2. Get SMTP credentials
3. Configure environment variables:

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-smtp-username
SMTP_PASS=your-mailgun-smtp-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Secure Gate Access
```

### 5. 🟡 **Outlook/Hotmail**

**Pros**: Free, reliable
**Cons**: Requires App Password

**Setup Steps**:
1. Enable 2-Factor Authentication
2. Generate App Password
3. Configure environment variables:

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Secure Gate Access
```

### 6. 🟡 **Mailtrap (Testing Only)**

**Pros**: Perfect for development/testing
**Cons**: Not for production

**Setup Steps**:
1. Create account at [Mailtrap](https://mailtrap.io)
2. Get SMTP credentials
3. Configure environment variables:

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Secure Gate Access
```

## Quick Setup Instructions

### For Development (Gmail)
```bash
# 1. Update your environment file
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
nano .env

# 2. Add these lines:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=your-16-character-app-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Secure Gate Access

# 3. Test the configuration
node test-email-integration.js
```

### For Production (SendGrid)
```bash
# 1. Update your production environment file
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
nano .env.production

# 2. Add these lines:
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Secure Gate Access

# 3. Test the configuration
node test-email-integration.js
```

## Testing the Configuration

### 1. Run the Email Test Script
```bash
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
node test-email-integration.js
```

### 2. Test Specific Email Functions
```bash
# Test visitor invitation email
node -e "
import('./src/services/notificationService.js').then(async (service) => {
  const result = await service.sendVisitorInviteEmail(
    { name: 'Test User', email: 'test@example.com' },
    { name: 'Resident', email: 'resident@example.com' },
    'https://test.com/invite/123'
  );
  console.log('Email sent:', result);
});
"
```

### 3. Test OTP Email
```bash
# Test OTP verification email
node -e "
import('./src/services/notificationService.js').then(async (service) => {
  const result = await service.sendOtpVerificationEmail(
    { name: 'Test User', email: 'test@example.com' },
    '123456',
    15
  );
  console.log('OTP email sent:', result);
});
"
```

## Email Templates Available

### 1. Visitor Invitation Email
- **Function**: `sendVisitorInviteEmail()`
- **Template**: `visitorInviteTemplate`
- **Content**: Welcome message, visit details, QR code, invite link

### 2. OTP Verification Email
- **Function**: `sendOtpVerificationEmail()`
- **Template**: `otpVerificationTemplate`
- **Content**: OTP code, expiry time, security instructions

### 3. Bulk Invitation Email
- **Function**: `sendBulkInviteEmail()`
- **Template**: `bulkInviteTemplate`
- **Content**: Multiple visitor invitations

## Security Considerations

### 1. Environment Variables
- ✅ Store credentials in environment variables
- ✅ Never commit credentials to version control
- ✅ Use different credentials for dev/staging/production

### 2. App Passwords
- ✅ Use App Passwords instead of regular passwords
- ✅ Enable 2-Factor Authentication
- ✅ Rotate passwords regularly

### 3. Rate Limiting
- ✅ Implement email rate limiting
- ✅ Monitor sending volume
- ✅ Set up alerts for unusual activity

## Troubleshooting

### Common Issues

1. **"Invalid login" Error**
   - Check username and password
   - Ensure App Password is used (not regular password)
   - Verify 2FA is enabled

2. **"Connection refused" Error**
   - Check SMTP host and port
   - Verify firewall settings
   - Test network connectivity

3. **"Authentication failed" Error**
   - Check credentials format
   - Verify service provider settings
   - Ensure account is not suspended

4. **Emails not delivered**
   - Check spam folder
   - Verify sender reputation
   - Check DNS records (SPF, DKIM)

### Debug Commands

```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Check DNS records
nslookup smtp.gmail.com

# Test with curl
curl --url 'smtps://smtp.gmail.com:465' \
  --ssl-reqd \
  --mail-from 'your-email@gmail.com' \
  --mail-rcpt 'test@example.com' \
  --upload-file email.txt \
  --user 'your-email@gmail.com:your-app-password'
```

## Production Recommendations

### 1. Use Professional Email Service
- ✅ SendGrid, AWS SES, or Mailgun
- ✅ Better deliverability than free services
- ✅ Detailed analytics and monitoring

### 2. Set Up Monitoring
- ✅ Track email delivery rates
- ✅ Monitor bounce rates
- ✅ Set up alerts for failures

### 3. Implement Best Practices
- ✅ Use verified sender domains
- ✅ Set up SPF, DKIM, DMARC records
- ✅ Implement email templates
- ✅ Add unsubscribe links

### 4. Security Measures
- ✅ Use dedicated email service account
- ✅ Implement rate limiting
- ✅ Monitor for abuse
- ✅ Regular security audits

## Next Steps

### Immediate (Required)
1. **Choose email service provider**
2. **Get SMTP credentials**
3. **Update environment variables**
4. **Test email functionality**

### Short Term (Recommended)
1. **Set up production email service**
2. **Configure email templates**
3. **Implement email monitoring**
4. **Test with real users**

### Long Term (Optional)
1. **Set up email analytics**
2. **Implement advanced features**
3. **Optimize deliverability**
4. **Add email preferences**

## Current Integration Status

| Component | Status | Details |
|-----------|--------|---------|
| **Nodemailer Integration** | ✅ Complete | All functions implemented |
| **Email Templates** | ✅ Complete | Visitor invite, OTP, bulk |
| **Environment Config** | ✅ Complete | Ready for credentials |
| **SMTP Configuration** | ❌ Not Set | Using placeholder values |
| **Email Testing** | ❌ Not Working | Authentication failing |
| **Production Ready** | ❌ No | Needs actual service |

**Overall Status**: 🔴 **NOT CONFIGURED - NEEDS EMAIL SERVICE SETUP**

---

*To proceed with email functionality, choose an email service provider and configure the SMTP credentials as outlined above.*

