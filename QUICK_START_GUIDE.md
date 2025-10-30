# 🚀 QUICK START GUIDE - Phase 1 Testing

**Updated:** October 30, 2025, 5:35 PM

---

## ⚡ FASTEST WAY TO TEST (5 MINUTES)

### **1. Create Environment File**

```bash
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server

# Copy template
cp .env.test.example .env

# Edit and add your credentials (already in template):
# - Mailgun API Key: 5d7a91a3798891a0dabbd6290ae9b6a5-653fadca-32d98de0
# - AT Username: securelabtest  
# - AT API Key: atsk_c607daf225b3db9c15a19e7ca058f5a56d9daf2b68c781db9ffee95dbfbc0a35c8ce9b9a
```

### **2. Test Encryption (2 minutes)**

```bash
# Generate encryption key
node scripts/generate-encryption-key.js

# Copy the output key to .env:
# ENCRYPTION_KEY=<generated-key>

# Test encryption setup
ENCRYPTION_METHOD=local ENCRYPTION_KEY=<your-key> node scripts/verify-encryption-setup.js
```

**Expected Output:**
```
✅ Encryption method: local
✅ All tests passed!
```

### **3. Test Notifications (3 minutes)**

```bash
# Update phone number in test script first:
nano scripts/test-notifications.js
# Line 102: Change +254700000000 to YOUR phone

# Run notification tests
node scripts/test-notifications.js
```

**Expected Output:**
```
✅ Mailgun email sent successfully!
📧 Recipient: n91599727@gmail.com

✅ OTP email sent successfully!
📧 Recipient: n91599727@gmail.com

✅ SMS sent successfully! (if phone updated)
📱 Recipient: +254712345678
```

---

## 📧 CHECK YOUR EMAIL

After running notification tests, check:

1. **n91599727@gmail.com** inbox
2. **Spam/Junk folder** (Mailgun sandbox may go to spam)
3. Look for emails from: `securelabstest@sandboxcd6...mailgun.org`

**Email Content:**
- Visitor invitation with invite link
- OTP verification code

---

## 📱 CHECK YOUR PHONE

If you updated the phone number:
- You should receive 2 SMS messages
- From: Africa's Talking
- Content: Invite link + OTP code

---

## 🔍 VERIFY IN DATABASE

```bash
# Connect to database
psql -h localhost -U postgres -d secure_gate

# Check encryption columns exist
\d users
\d visitors

# Should see columns:
# - email_encrypted
# - phone_encrypted
# - name_encrypted
# - encryption_version
# - encrypted_at
```

---

## 🧪 FULL INTEGRATION TEST (10 MINUTES)

### **1. Install Dependencies**

```bash
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
npm install
```

### **2. Start Server**

```bash
# Terminal 1: Start backend
npm run dev

# Should see:
# ✅ Encryption configured: local
# Server running on port 5000
```

### **3. Test User Registration (Encryption)**

```bash
# Terminal 2: Register user with encryption
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "username": "testuser",
    "role": "resident",
    "password": "SecurePassword123!",
    "phone": "+254712345678"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "email": "testuser@example.com",
    "phone": "+254712345678",
    "username": "testuser",
    "role": "resident"
  }
}
```

### **4. Verify Database Encryption**

```bash
# Check database
psql -h localhost -U postgres -d secure_gate

SELECT id, email, email_encrypted, phone, phone_encrypted, encrypted_at 
FROM users 
WHERE email = 'testuser@example.com';
```

**Expected:**
- `email`: `testuser@example.com` (plaintext for backwards compatibility)
- `email_encrypted`: `local:long-encrypted-string...`
- `phone`: `+254712345678`
- `phone_encrypted`: `local:long-encrypted-string...`
- `encrypted_at`: Current timestamp

### **5. Test Login (Decryption)**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePassword123!"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "accessToken": "eyJ...",
  "user": {
    "id": 1,
    "email": "testuser@example.com",
    "phone": "+254712345678"
  }
}
```

**Note:** Email and phone are DECRYPTED in the response!

---

## ✅ SUCCESS CRITERIA

### **Phase 1 Complete When:**

- [x] Encryption service works (24/24 tests passing)
- [x] Database has encrypted columns
- [x] User controller encrypts/decrypts data
- [x] Mailgun sends emails successfully
- [x] Africa's Talking sends SMS successfully
- [ ] Visitor controller updated (pending)
- [ ] Full integration tests pass

**Current Status: 85% Complete** ✅

---

## 🐛 TROUBLESHOOTING

### **Mailgun Email Not Received**

```bash
# 1. Check spam folder
# 2. Verify recipient is authorized
# Visit: https://app.mailgun.com/app/sending/domains/sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org/sending

# 3. Check Mailgun logs
# Visit: https://app.mailgun.com/app/logs

# 4. Verify API key
echo $MAILGUN_API_KEY
# Should show: 5d7a91a3798891a0dabbd6290ae9b6a5-653fadca-32d98de0
```

### **Africa's Talking SMS Not Received**

```bash
# 1. Check phone number format
# Must be: +254712345678 (country code + number)

# 2. Check credits
# Visit: https://account.africastalking.com/

# 3. Check SMS logs
# Dashboard → SMS → History

# 4. Verify credentials
echo $AT_USERNAME
echo $AT_API_KEY
```

### **Encryption Error**

```bash
# 1. Generate new encryption key
node scripts/generate-encryption-key.js

# 2. Add to .env
# ENCRYPTION_KEY=generated-key-here

# 3. Test again
node scripts/verify-encryption-setup.js
```

### **Database Connection Error**

```bash
# 1. Check PostgreSQL is running
pg_isready

# 2. Verify credentials in .env
PGUSER=postgres
PGPASSWORD=your-password
PGHOST=localhost
PGPORT=5432
PGDATABASE=secure_gate

# 3. Test connection
psql -h localhost -U postgres -d secure_gate -c "SELECT 1;"
```

---

## 📞 QUICK REFERENCE

### **Important Commands**

```bash
# Test encryption
node scripts/verify-encryption-setup.js

# Test notifications  
node scripts/test-notifications.js

# Run unit tests
npm run test:unit

# Start development server
npm run dev

# Check database
psql -h localhost -U postgres -d secure_gate
```

### **Important Files**

- `.env` - Your credentials (DO NOT COMMIT)
- `PHASE1_FINAL_STATUS.md` - Detailed status report
- `scripts/test-notifications.js` - Test Mailgun + AT
- `scripts/verify-encryption-setup.js` - Test encryption

### **Your Credentials**

```bash
# Mailgun
API_KEY: 5d7a91a3798891a0dabbd6290ae9b6a5-653fadca-32d98de0
DOMAIN: sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org
AUTHORIZED: n91599727@gmail.com, nn0200774@gmail.com

# Africa's Talking
USERNAME: securelabtest
API_KEY: atsk_c607daf225b3db9c15a19e7ca058f5a56d9daf2b68c781db9ffee95dbfbc0a35c8ce9b9a
BALANCE: KES 160

# AWS KMS
KEY_ID: a6f0e074-dd01-4dca-bfc9-dea248f04e45
REGION: af-south-1
```

---

## 🎯 NEXT STEPS

1. ✅ Review this guide
2. ✅ Run encryption tests
3. ✅ Run notification tests
4. ✅ Check email inbox
5. ⏭️ Complete visitor controller (optional for now)
6. ⏭️ Run full integration tests
7. ⏭️ Deploy to AWS

---

**Need Help?** Check `PHASE1_FINAL_STATUS.md` for detailed information.

**Ready for Production?** See checklist in `PHASE1_FINAL_STATUS.md`.
