# 📧 MAILGUN TESTING GUIDE - Sandbox Setup

**Updated:** October 30, 2025, 5:50 PM  
**Your Setup:** Mailgun Sandbox (Free)  
**Credits:** Africa's Talking KES 160

---

## 🎯 YOUR CURRENT SETUP

### **Mailgun Configuration:**
```
API Key: 5d7a91a3798891a0dabbd6290ae9b6a5-653fadca-32d98de0
Domain: sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org
From Email: securelabstest@sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org

Current Authorized Recipients:
✅ n91599727@gmail.com
✅ nn0200774@gmail.com
```

### **Africa's Talking Configuration:**
```
Username: securelabtest
API Key: atsk_c607daf225b3db9c15a19e7ca058f5a56d9daf2b68c781db9ffee95dbfbc0a35c8ce9b9a
Balance: KES 160 (~200 SMS at KES 0.80 each)
```

---

## 📋 STEP 1: ADD MORE TEST EMAILS TO MAILGUN

### **Option A: Gmail Aliases (RECOMMENDED - FREE)**

Your current email `n91599727@gmail.com` can receive emails at these addresses:

```
n91599727+test1@gmail.com
n91599727+test2@gmail.com
n91599727+resident@gmail.com
n91599727+visitor@gmail.com
n91599727+admin@gmail.com
n91599727+guest@gmail.com
```

**All emails go to your main inbox!**

### **Add These to Mailgun:**

1. Go to: https://app.mailgun.com/
2. Click: **Sending** → **Domains**
3. Click your sandbox domain
4. Click: **Domain Settings** → **Authorized Recipients**
5. Add each alias above
6. Check your inbox for verification emails
7. Click verification links

---

### **Option B: Temporary Email Services**

**For Quick Testing (No Registration):**

```
1. Temp-Mail.org
   URL: https://temp-mail.org
   Steps:
   - Open website
   - Copy the generated email (e.g., wxyz123@temp-mail.org)
   - Add to Mailgun authorized recipients
   - Verify in temp-mail inbox
   - Use for 1-2 hours of testing
   - Then expires (perfect for testing)

2. GuerillaMail
   URL: https://www.guerrillamail.com
   - Similar to temp-mail
   - Lasts 60 minutes
   - Scramble address to get new one

3. 10MinuteMail
   URL: https://10minutemail.com
   - Lasts 10 minutes (extendable)
   - Good for OTP testing
   - Can extend time if needed
```

---

### **Option C: Create Additional Gmail Accounts**

```
Create 2-3 dedicated test accounts:

testuser1.securegate@gmail.com
testuser2.securegate@gmail.com
admin.securegate@gmail.com

Then add all to Mailgun authorized recipients
```

---

## 🧪 STEP 2: COMPREHENSIVE TEST SCENARIOS

### **Test 1: User Registration Email** ✅

**Objective:** Verify user registration sends welcome email

```bash
# Test with your primary email
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "n91599727@gmail.com",
    "username": "testuser1",
    "role": "resident",
    "password": "SecurePassword123!",
    "phone": "+254712345678"
  }'
```

**Expected:**
- ✅ API returns success
- ✅ Email received at n91599727@gmail.com
- ✅ Database shows encrypted email/phone
- ✅ Subject: "Welcome to Secure Gate Access"

---

### **Test 2: Visitor Invitation Email** ✅

**Objective:** Resident invites visitor, visitor receives invite

```bash
# 1. Login as resident first
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "n91599727@gmail.com",
    "password": "SecurePassword123!"
  }' | jq -r '.accessToken')

# 2. Create visitor invitation
curl -X POST http://localhost:5000/api/visitors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Visitor",
    "email": "nn0200774@gmail.com",
    "phone": "+254712345678",
    "dateOfVisit": "2025-11-01",
    "time": "14:00",
    "purpose": "Testing invitation system"
  }'
```

**Expected:**
- ✅ API returns success with invite code
- ✅ Email received at nn0200774@gmail.com
- ✅ Email contains invitation link
- ✅ Subject: "You've been invited to visit"

---

### **Test 3: OTP Verification Email** ✅

**Objective:** Visitor receives OTP code via email

```bash
# Assuming visitor from Test 2
# Visit the invite link, trigger OTP

curl -X POST http://localhost:5000/api/visitors/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "visitorId": 1,
    "channel": "email"
  }'
```

**Expected:**
- ✅ API returns success
- ✅ Email received with 6-digit OTP
- ✅ Subject: "Your Verification Code"
- ✅ OTP valid for 15 minutes

---

### **Test 4: Multiple Recipients** ✅

**Objective:** Test sending to multiple email addresses

```bash
# Add all your aliases to Mailgun first, then:

# Test 1: Primary
email1="n91599727@gmail.com"

# Test 2: Alias
email2="n91599727+test1@gmail.com"

# Test 3: Secondary
email3="nn0200774@gmail.com"

# Test 4: Temp mail
email4="wxyz123@temp-mail.org"  # Get from temp-mail.org

# Create invitations for each
for email in "$email1" "$email2" "$email3" "$email4"; do
  curl -X POST http://localhost:5000/api/visitors \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Visitor for $email\",
      \"email\": \"$email\",
      \"phone\": \"+254712345678\",
      \"dateOfVisit\": \"2025-11-01\",
      \"time\": \"14:00\",
      \"purpose\": \"Testing multiple recipients\"
    }"
  sleep 2
done
```

---

### **Test 5: Rate Limiting** ✅

**Objective:** Verify rate limiting works

```bash
# Send 5 emails rapidly (should trigger rate limit)
for i in {1..5}; do
  curl -X POST http://localhost:5000/api/visitors/otp/resend \
    -H "Content-Type: application/json" \
    -d '{
      "visitorId": 1
    }'
  echo "Attempt $i"
done
```

**Expected:**
- ✅ First 2-3 requests succeed
- ✅ Subsequent requests return 429 (Too Many Requests)
- ✅ Error message about rate limit

---

### **Test 6: Email Template Rendering** ✅

**Objective:** Verify all email templates render correctly

```bash
# Test different email types:

# 1. Welcome email (registration)
# 2. Invitation email (visitor invite)
# 3. OTP email (verification)
# 4. Check-in notification (visitor arrives)
# 5. Check-out notification (visitor leaves)
```

---

## 📱 STEP 3: SMS TESTING (Africa's Talking)

### **Test 7: SMS Invitation** 💰

**Cost:** ~KES 0.80 per SMS

```bash
# Update phone number in script first!
nano /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server/scripts/test-notifications.js

# Line 102: Change to your phone
const testPhone = '+254712345678';  # YOUR ACTUAL NUMBER

# Run SMS test
node scripts/test-notifications.js
```

**Expected:**
- ✅ SMS sent confirmation
- ✅ SMS received on phone
- ✅ Contains invitation link
- ✅ From: Africa's Talking or your sender ID

---

### **Test 8: OTP SMS** 💰

**Cost:** ~KES 0.80 per SMS

```bash
curl -X POST http://localhost:5000/api/visitors/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "visitorId": 1,
    "channel": "sms"
  }'
```

**Expected:**
- ✅ SMS delivered
- ✅ Contains 6-digit OTP
- ✅ Valid for 15 minutes

---

## 📊 STEP 4: MONITORING & VERIFICATION

### **Check Mailgun Logs:**

1. **Dashboard:** https://app.mailgun.com/app/dashboard
2. **Logs:** https://app.mailgun.com/app/logs
3. **Filter by:**
   - Recipient email
   - Date/time
   - Status (delivered, failed, rejected)

### **Check Africa's Talking Logs:**

1. **Dashboard:** https://account.africastalking.com/
2. **SMS Logs:** SMS → History
3. **Balance:** Check remaining credits
4. **Delivery Status:** Delivered, Failed, Pending

### **Check Database:**

```sql
-- Connect to database
psql -h localhost -U postgres -d secure_gate

-- Check encrypted user data
SELECT 
  id, 
  email, 
  email_encrypted,
  phone,
  phone_encrypted,
  encrypted_at
FROM users
ORDER BY id DESC
LIMIT 5;

-- Check visitor invitations
SELECT 
  id,
  name,
  name_encrypted,
  email,
  email_encrypted,
  invite_code,
  status,
  created_at
FROM visitors
ORDER BY id DESC
LIMIT 5;

-- Check encryption audit log
SELECT * FROM encryption_audit
ORDER BY performed_at DESC
LIMIT 10;
```

---

## ✅ TEST CHECKLIST

### **Email Tests:**
- [ ] User registration email received
- [ ] Visitor invitation email received
- [ ] OTP verification email received
- [ ] All templates render correctly
- [ ] Links in emails are clickable
- [ ] Emails not in spam folder
- [ ] Multiple recipients work
- [ ] Gmail aliases work

### **SMS Tests:**
- [ ] Invitation SMS received
- [ ] OTP SMS received
- [ ] Phone number format correct (+254...)
- [ ] SMS contains correct info
- [ ] Links in SMS are clickable
- [ ] Credits deducted correctly

### **Encryption Tests:**
- [ ] User email/phone encrypted in DB
- [ ] Visitor data encrypted in DB
- [ ] API returns decrypted data
- [ ] Encryption audit log populated
- [ ] encrypted_at timestamp set

### **System Tests:**
- [ ] Rate limiting works
- [ ] Error handling works
- [ ] Audit logs created
- [ ] No sensitive data in logs

---

## 🔧 TROUBLESHOOTING

### **Email Not Received:**

**Check 1: Authorized Recipients**
```bash
# Verify recipient is authorized
# Go to: https://app.mailgun.com/app/sending/domains/sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org/sending
# Check: Authorized Recipients section
```

**Check 2: Spam Folder**
```
Gmail → Spam folder
Look for: securelabstest@sandboxcd6...mailgun.org
```

**Check 3: Mailgun Logs**
```
https://app.mailgun.com/app/logs
Filter by recipient email
Check delivery status
```

**Check 4: API Response**
```bash
# Check if API shows success
# Look for: "Email sent successfully" or similar
```

---

### **SMS Not Received:**

**Check 1: Phone Number Format**
```
Must be: +254712345678
NOT: 0712345678 or 712345678
```

**Check 2: Credits**
```
Visit: https://account.africastalking.com/
Check: Account balance > KES 0.80
```

**Check 3: SMS Logs**
```
Dashboard → SMS → History
Check delivery status
```

**Check 4: Network Issues**
```
SMS may take 1-5 minutes
Check phone signal
Try different number if persistent
```

---

### **Encryption Issues:**

**Check 1: Encryption Key Set**
```bash
echo $ENCRYPTION_KEY
# Should show: base64 key, not empty
```

**Check 2: Database Columns Exist**
```sql
\d users
-- Should show: email_encrypted, phone_encrypted
```

**Check 3: Run Verification**
```bash
node scripts/verify-encryption-setup.js
```

---

## 📈 TESTING METRICS

### **Success Criteria:**

| Test | Target | Status |
|------|--------|--------|
| Email delivery rate | >95% | [ ] |
| SMS delivery rate | >90% | [ ] |
| Encryption success | 100% | [ ] |
| API response time | <500ms | [ ] |
| Zero PII in logs | 100% | [ ] |

### **Performance Benchmarks:**

- Email delivery: < 30 seconds
- SMS delivery: < 2 minutes
- API response: < 500ms
- Database query: < 100ms
- Encryption overhead: < 50ms

---

## 🎯 RECOMMENDED TEST ORDER

### **Day 1: Email Testing (Free)**
1. ✅ Add Gmail aliases to Mailgun
2. ✅ Test user registration
3. ✅ Test visitor invitation
4. ✅ Test OTP emails
5. ✅ Verify all received in inbox

### **Day 2: SMS Testing (Costs KES ~5)**
1. ✅ Update phone number in scripts
2. ✅ Test 1-2 SMS invitations
3. ✅ Test 1-2 OTP SMS
4. ✅ Verify delivery and content

### **Day 3: Integration Testing**
1. ✅ Full user flow (register → login → invite)
2. ✅ Full visitor flow (invite → OTP → check-in)
3. ✅ Error scenarios
4. ✅ Rate limiting
5. ✅ Audit logs

---

## 💰 COST TRACKING

### **Email Costs:**
- Mailgun Sandbox: **FREE** ✅
- Gmail Aliases: **FREE** ✅
- Temp Emails: **FREE** ✅

### **SMS Costs:**
```
Current Balance: KES 160
Cost per SMS: KES 0.80

Recommended Testing Budget:
- 5 invitation SMS = KES 4.00
- 5 OTP SMS = KES 4.00
- Total: KES 8.00

Remaining: KES 152 (~190 SMS)
```

---

## 📞 SUPPORT RESOURCES

### **Mailgun:**
- Dashboard: https://app.mailgun.com/
- Docs: https://documentation.mailgun.com/
- Support: https://help.mailgun.com/

### **Africa's Talking:**
- Dashboard: https://account.africastalking.com/
- Docs: https://developers.africastalking.com/
- Support: support@africastalking.com

### **Your App:**
- Logs: `/var/log/secure-gate/`
- Database: `psql -h localhost -U postgres -d secure_gate`
- API: http://localhost:5000/api/health

---

## 🎉 READY TO TEST!

**Quick Start:**
```bash
# 1. Add Gmail aliases to Mailgun (5 min)
# 2. Run notification tests (2 min)
node scripts/test-notifications.js

# 3. Check your email (1 min)
# 4. Success! ✅
```

**Questions?** Check `PHASE1_FINAL_STATUS.md` for detailed information.

---

**Last Updated:** October 30, 2025, 5:50 PM  
**Your Setup:** Mailgun Sandbox + Africa's Talking Production  
**Status:** Ready for comprehensive testing ✅
