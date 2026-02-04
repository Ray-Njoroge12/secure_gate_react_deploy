# Email Verification Testing with MailHog

## ✅ Setup Complete

### Services Running
- **Backend API**: http://localhost:5001 (SMTP configured)
- **MailHog Web UI**: http://localhost:8025 (email inbox)
- **MailHog SMTP**: localhost:1025 (receiving emails)
- **Frontend**: http://localhost:3001
- **Database**: PostgreSQL on port 5433

### Configuration
- Email Provider: SMTP
- SMTP Host: mailhog:1025
- Email Verification: ENABLED
- Email From: noreply@securegate.local

## 📧 Testing Email Verification

### Test 1: User Registration with Email Verification

1. **Register a new user** via API:
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!",
    "username": "testuser",
    "full_name": "Test User",
    "role": "resident",
    "estate_id": 1
  }'
```

**Expected Response:**
- Status: 201 Created
- Message indicating email verification is required
- User created but not verified

2. **Check MailHog for verification email**:
- Open browser: http://localhost:8025
- Look for email to `testuser@example.com`
- Subject should be: "Confirm Your Secure Gate Access Registration"
- Email should contain a verification link/token

3. **Extract verification token** from the email:
- The email will contain a link like: `http://localhost:3000/verify-email?token=<TOKEN>`
- Copy the token value

4. **Verify the email** using the token:
```bash
curl -X POST http://localhost:5001/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "PASTE_TOKEN_HERE"
  }'
```

**Expected Response:**
- Status: 200 OK
- Message: "Email verified successfully"

5. **Attempt to login**:
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected Response:**
- Status: 200 OK
- Returns JWT tokens
- User is now fully verified and can access the system

### Test 2: Password Reset Email

1. **Request password reset**:
```bash
curl -X POST http://localhost:5001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com"
  }'
```

2. **Check MailHog** for password reset email:
- Subject: "Reset Your Secure Gate Access Password"
- Contains reset link with token

3. **Use the token to reset password**:
```bash
curl -X POST http://localhost:5001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "PASTE_RESET_TOKEN_HERE",
    "password": "NewSecurePass123!"
  }'
```

### Test 3: OTP Email (if applicable)

If the system sends OTP codes via email:

1. **Trigger OTP send** (exact endpoint depends on your implementation):
```bash
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com"
  }'
```

2. **Check MailHog** for OTP email:
- Subject: "Your Secure Gate Access Verification Code"
- Contains the OTP code
- Note the expiration time (10 minutes)

## 🔍 Verification Checklist

- [ ] Backend shows: "Email service initialized with SMTP (mailhog:1025)"
- [ ] User registration sends verification email
- [ ] MailHog web UI (http://localhost:8025) shows received emails
- [ ] Email verification link/token works correctly
- [ ] User cannot login before email verification
- [ ] User can login after email verification
- [ ] Password reset emails are sent
- [ ] Email templates render correctly (HTML formatting)
- [ ] Request IDs are propagated through email sending
- [ ] Errors in email sending are logged properly

## 📊 Observability During Email Testing

Monitor backend logs during email tests:
```bash
docker logs -f securegate-staging-api | grep -i "email\|smtp"
```

Check for:
- Email service initialization
- Email sending attempts
- SMTP connection status
- Any errors or warnings
- Request ID correlation

## 🐛 Troubleshooting

### No emails in MailHog
1. Check backend logs for errors
2. Verify SMTP connection: `docker logs securegate-staging-api | grep -i smtp`
3. Ensure MailHog is running: `docker-compose -f docker-compose.staging.yml ps mailhog`
4. Check network connectivity between containers

### Email sending fails
1. Check environment variables: `docker exec securegate-staging-api env | grep -E "EMAIL|SMTP"`
2. Verify EMAIL_PROVIDER=smtp
3. Check MailHog logs: `docker logs securegate-mailhog`

### User cannot verify email
1. Check token expiration (24 hours for verification)
2. Verify database has the user record
3. Check if email_verified field is being updated

## 🎯 Next Steps After Testing

1. Test all email flows (registration, password reset, OTP)
2. Verify email templates are properly formatted
3. Test error scenarios (invalid tokens, expired tokens)
4. Verify observability (logs, request IDs, metrics)
5. Document any issues or edge cases discovered
6. Consider configuring production email service (e.g., SendGrid, AWS SES)

## 📝 Notes

- MailHog is for **development/testing only** - never use in production
- Email verification tokens expire after 24 hours
- Password reset tokens expire after 1 hour
- OTP codes expire after 10 minutes
- All emails are caught by MailHog and not actually sent to real email addresses
