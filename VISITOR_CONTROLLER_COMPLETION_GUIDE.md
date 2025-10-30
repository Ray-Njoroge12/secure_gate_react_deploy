# 🔒 VISITOR CONTROLLER ENCRYPTION - Completion Guide

**Status:** Ready to implement (15% complete - import added)  
**Estimated Time:** 1-2 hours  
**Pattern:** Same as userController.js (already completed)

---

## ✅ WHAT'S ALREADY DONE

**File:** `/src/controllers/visitorController.js`

**Completed:**
```javascript
// Line 14: Import already added
import { encryptVisitorData, decryptVisitorData } from '../utils/encryptionHelper.js';
```

✅ Helper functions imported and ready to use

---

## 📋 WHAT NEEDS TO BE DONE

### **Functions to Update:**

1. **createVisitor()** - Lines 52-136
   - Encrypt visitor data before INSERT
   - Decrypt visitor data before returning

2. **getMyVisitors()** - Lines 138-200+
   - Decrypt visitor list after SELECT

3. **Additional visitor functions** (if any)
   - Apply same pattern

---

## 🔧 IMPLEMENTATION PATTERN

### **Pattern 1: Encrypt Before INSERT**

**Current Code (Line 72-91):**
```javascript
let insertRes;
if (createVisitor._hasCreatedBy) {
  const createdBy = req.user.email;
  insertRes = await pool.query(
    `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status,
       check_in_time AS check_in, check_out_time AS check_out, created_by`,
    [name || null, phone || null, email || null, purpose, dateOfVisit, time, inviteCode, 'PENDING', createdBy]
  );
}
const visitor = insertRes.rows[0];
```

**Updated Code:**
```javascript
// STEP 1: Encrypt personal data BEFORE insert
const encrypted = await encryptVisitorData({ 
  name, 
  phone, 
  email, 
  id_number: null,  // if collecting ID numbers
  vehicle_plate: null  // if collecting vehicle info
});

let insertRes;
if (createVisitor._hasCreatedBy) {
  const createdBy = req.user.email;
  insertRes = await pool.query(
    `INSERT INTO visitors (
      name, name_encrypted,
      phone, phone_encrypted,
      email, email_encrypted,
      purpose, date_of_visit, time_of_visit, invite_code, status, created_by,
      encryption_version, encrypted_at
    )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
     RETURNING id, name, name_encrypted, phone, phone_encrypted, email, email_encrypted,
       purpose, date_of_visit, time_of_visit, invite_code, status,
       check_in_time AS check_in, check_out_time AS check_out, created_by`,
    [
      name || null, encrypted.name_encrypted,
      phone || null, encrypted.phone_encrypted,
      email || null, encrypted.email_encrypted,
      purpose, dateOfVisit, time, inviteCode, 'PENDING', createdBy, 'v1'
    ]
  );
}

// STEP 2: Decrypt visitor data AFTER insert
const visitor = await decryptVisitorData(insertRes.rows[0]);
```

---

### **Pattern 2: Decrypt After SELECT**

**For Single Visitor:**
```javascript
// Old
const result = await pool.query('SELECT * FROM visitors WHERE id = $1', [id]);
const visitor = result.rows[0];

// New
const result = await pool.query(
  'SELECT id, name, name_encrypted, phone, phone_encrypted, email, email_encrypted, ... FROM visitors WHERE id = $1',
  [id]
);
const visitor = await decryptVisitorData(result.rows[0]);
```

**For Visitor List:**
```javascript
// Old
const result = await pool.query('SELECT * FROM visitors WHERE created_by = $1', [email]);
const visitors = result.rows;

// New - Import the list helper
import { encryptVisitorData, decryptVisitorData, decryptVisitorList } from '../utils/encryptionHelper.js';

const result = await pool.query(
  'SELECT id, name, name_encrypted, phone, phone_encrypted, email, email_encrypted, ... FROM visitors WHERE created_by = $1',
  [email]
);
const visitors = await decryptVisitorList(result.rows);
```

---

## 📝 STEP-BY-STEP INSTRUCTIONS

### **Step 1: Locate createVisitor Function**

```bash
# Open file
nano /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server/src/controllers/visitorController.js

# Or use VS Code
code /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server/src/controllers/visitorController.js

# Find line 52: const createVisitor = async (req, res) => {
```

---

### **Step 2: Add Encryption Before INSERT**

**Find this section (around line 72):**
```javascript
let insertRes;
if (createVisitor._hasCreatedBy) {
```

**Add BEFORE the insertRes:**
```javascript
// Encrypt visitor personal data
const encrypted = await encryptVisitorData({ name, phone, email });

let insertRes;
```

---

### **Step 3: Update INSERT Query**

**Change FROM:**
```sql
INSERT INTO visitors (name, phone, email, purpose, ...)
VALUES ($1,$2,$3,$4,...)
```

**Change TO:**
```sql
INSERT INTO visitors (
  name, name_encrypted,
  phone, phone_encrypted,
  email, email_encrypted,
  purpose, ...,
  encryption_version, encrypted_at
)
VALUES ($1,$2,$3,$4,$5,$6,$7,...,$N,'v1',NOW())
```

**Update the values array:**
```javascript
[
  name || null, encrypted.name_encrypted,
  phone || null, encrypted.phone_encrypted,
  email || null, encrypted.email_encrypted,
  purpose, dateOfVisit, time, inviteCode, 'PENDING', createdBy, 'v1'
]
```

---

### **Step 4: Update RETURNING Clause**

**Add encrypted fields to RETURNING:**
```sql
RETURNING id, name, name_encrypted, phone, phone_encrypted, email, email_encrypted,
  purpose, date_of_visit, time_of_visit, invite_code, status,
  check_in_time AS check_in, check_out_time AS check_out, created_by
```

---

### **Step 5: Add Decryption After INSERT**

**Find this line (around line 91):**
```javascript
const visitor = insertRes.rows[0];
```

**Change TO:**
```javascript
const visitor = await decryptVisitorData(insertRes.rows[0]);
```

---

### **Step 6: Update getMyVisitors Function**

**Find the function (around line 138):**
```javascript
const getMyVisitors = async (req, res) => {
```

**Find the SELECT query and add encrypted fields:**
```sql
SELECT id, name, name_encrypted, phone, phone_encrypted, email, email_encrypted,
  purpose, date_of_visit, time_of_visit, invite_code, status, created_at
FROM visitors
WHERE created_by = $1
ORDER BY created_at DESC
```

**After the query, add decryption:**
```javascript
const result = await pool.query(/* query */, [email]);

// Add this line
const visitors = await decryptVisitorList(result.rows);

// Use 'visitors' in response instead of result.rows
```

---

### **Step 7: Update Other Visitor Functions**

Apply the same pattern to any other functions that:
- INSERT visitor data → Add encryption before
- SELECT visitor data → Add decryption after

**Common functions:**
- `getVisitorById()`
- `updateVisitor()`
- `verifyVisitor()`
- `checkInVisitor()`

---

## ✅ VERIFICATION CHECKLIST

After making changes:

### **1. Syntax Check**
```bash
node --check src/controllers/visitorController.js
```
✅ Should return no errors

### **2. Test Visitor Creation**
```bash
curl -X POST http://localhost:5000/api/visitors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Visitor",
    "email": "visitor@example.com",
    "phone": "+254712345678",
    "dateOfVisit": "2025-11-01",
    "time": "14:00",
    "purpose": "Testing encryption"
  }'
```

### **3. Check Database**
```sql
SELECT 
  id, 
  name, 
  name_encrypted,
  phone,
  phone_encrypted,
  email,
  email_encrypted,
  encrypted_at
FROM visitors
ORDER BY id DESC
LIMIT 1;
```

**Expected:**
- ✅ `name_encrypted` has value like `local:ABC123...`
- ✅ `phone_encrypted` has value
- ✅ `email_encrypted` has value
- ✅ `encrypted_at` has timestamp

### **4. Check API Response**
```bash
curl http://localhost:5000/api/visitors \
  -H "Authorization: Bearer $TOKEN"
```

**Expected JSON:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Test Visitor",  // ✅ Decrypted
      "phone": "+254712345678",  // ✅ Decrypted
      "email": "visitor@example.com",  // ✅ Decrypted
      "purpose": "Testing encryption",
      // No encrypted fields in response
    }
  ]
}
```

---

## 🐛 TROUBLESHOOTING

### **Error: Cannot find module 'encryptionHelper'**

**Solution:**
```javascript
// Verify import at top of file (line 14)
import { encryptVisitorData, decryptVisitorData, decryptVisitorList } from '../utils/encryptionHelper.js';
```

### **Error: encryptVisitorData is not a function**

**Solution:**
Check file exists:
```bash
ls -la src/utils/encryptionHelper.js
```

### **Error: Column "name_encrypted" does not exist**

**Solution:**
Run migration:
```bash
node scripts/run-encryption-migration.js
```

### **Error: visitor.name is undefined**

**Solution:**
Make sure you're awaiting the decryption:
```javascript
const visitor = await decryptVisitorData(insertRes.rows[0]);
// NOT: const visitor = decryptVisitorData(insertRes.rows[0]);
```

---

## 📊 PROGRESS TRACKING

**Before Starting:**
- [ ] Read this guide completely
- [ ] Backup visitorController.js
- [ ] Verify encryption helper exists

**During Implementation:**
- [ ] Updated import statement
- [ ] Added encryption before INSERT
- [ ] Updated INSERT query with encrypted fields
- [ ] Added decryption after INSERT
- [ ] Updated getMyVisitors with decryption
- [ ] Updated other visitor functions

**After Implementation:**
- [ ] Syntax check passes
- [ ] Test visitor creation
- [ ] Verify database has encrypted data
- [ ] Verify API returns decrypted data
- [ ] Check encryption_audit table

---

## 🎯 ESTIMATED TIME

| Task | Time | Difficulty |
|------|------|------------|
| Understand pattern | 10 min | Easy |
| Update createVisitor() | 20 min | Easy |
| Update getMyVisitors() | 15 min | Easy |
| Update other functions | 30 min | Medium |
| Testing & Verification | 20 min | Easy |
| **Total** | **95 min** | **Easy** |

**Why Easy?**
- Pattern already established in userController
- Helper functions already created
- Just applying the same pattern
- No new logic needed

---

## 💡 TIPS

1. **Start Small:** Update createVisitor() first, test it, then move to others
2. **Test Frequently:** Test after each function update
3. **Keep Plaintext:** Don't remove plaintext columns yet (backwards compatibility)
4. **Use Existing Pattern:** Copy structure from userController.js
5. **Commit Often:** Git commit after each working function

---

## 📞 NEED HELP?

**Reference Files:**
- `/src/controllers/userController.js` - See lines 42, 118, 142 for examples
- `/src/utils/encryptionHelper.js` - Helper function documentation
- `/tests/unit/encryptionService.test.js` - Test examples

**Commands:**
```bash
# Check syntax
node --check src/controllers/visitorController.js

# Test encryption
node scripts/verify-encryption-setup.js

# Start server
npm run dev

# Check logs
tail -f logs/app.log
```

---

## ✅ WHEN COMPLETE

**Update Status:**
- Phase 1 Completion: 85% → 100% ✅
- Visitor Controller: Pending → Complete ✅
- Data Encryption: Partial → Full ✅

**Run Full Tests:**
```bash
# 1. Unit tests
npm run test:unit -- tests/unit/encryptionService.test.js

# 2. Integration test
node scripts/verify-encryption-setup.js

# 3. API tests
# Create visitor, check database, verify encryption
```

**Update Documentation:**
- Mark visitor controller as complete in PHASE1_FINAL_VALIDATION.md
- Update PHASE1_FINAL_STATUS.md with 100% completion

---

**Ready to implement?** Follow the steps above or let me know if you need help with specific sections!

**Estimated completion time:** 1-2 hours for someone following this guide.

---

**Last Updated:** October 30, 2025, 6:10 PM  
**Status:** Guide complete, ready for implementation
