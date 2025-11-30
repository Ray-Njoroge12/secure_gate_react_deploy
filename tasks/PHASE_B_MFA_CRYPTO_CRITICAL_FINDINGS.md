# Phase B: MFA Hardening - CRITICAL CRYPTO VULNERABILITY FOUND
## Backend Security Analysis - November 21, 2025, 9:20 PM

---

## ⚠️ CRITICAL SECURITY ISSUE DISCOVERED

### Vulnerability: Deprecated Crypto API Usage

**Status:** 🔴 **PRODUCTION BLOCKER**  
**Severity:** **CRITICAL**  
**Impact:** MFA encryption is **BROKEN** in Node.js 17+

---

## Test Results Summary

**Tests Run:** 30  
**Passed:** 10/30 (33%)  
**Failed:** 20/30 (67%)  

### Failure Root Cause:
```
TypeError: crypto.createCipher is not a function
```

---

## Technical Analysis

### The Problem

**File:** `src/services/mfaService.js`  
**Lines:** 536, 553  
**Issue:** Using **DEPRECATED** `crypto.createCipher()` and `crypto.createDecipher()`

```javascript
// CURRENT BROKEN CODE (Lines 531-541)
encryptSecret(secret) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.MFA_ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);  // ❌ DEPRECATED - REMOVED IN NODE 17+
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}
```

### Why This is Critical:

1. **Completely Broken:** `createCipher()` removed in Node.js 17+ (October 2021)
2. **MFA Non-Functional:** Cannot encrypt/decrypt TOTP secrets
3. **App Crashes:** Any MFA operation will throw TypeError
4. **Production Risk:** If deployed, MFA setup/verification will fail
5. **Data Loss Risk:** Existing encrypted secrets cannot be decrypted

### Additional Issues Found:

1. **IV Not Used:** IV is generated but never passed to cipher (wasted)
2. **Auth Tag Missing:** AES-256-GCM requires auth tag for integrity, not implemented
3. **Weak Salt:** Using hardcoded string `'salt'` instead of random salt
4. **Fallback Key:** Uses `'default-key'` if env var missing (security risk)
5. **Wrong API:** `createCipher()` uses MD5 for key derivation (weak, deprecated)

---

## Impact Assessment

### Current System State:

| Component | Status | Impact |
|-----------|--------|--------|
| MFA Setup | ❌ Broken | Users cannot enable MFA |
| MFA Verification | ❌ Broken | Users with MFA cannot login |
| TOTP Secrets | ❌ Cannot decrypt | Existing MFA users locked out |
| Backup Codes | ✅ Working | Uses SHA-256 hash (not affected) |
| System Stability | 🔴 Critical | App crashes on MFA operations |

### User Impact:

- **New Users:** Cannot enable MFA (feature appears broken)
- **Existing MFA Users:** Cannot login (credentials correct but MFA fails)
- **Admins:** Cannot enforce MFA policies
- **Security Team:** False sense of security (MFA appears enabled but non-functional)

---

## The Correct Implementation

### Modern Crypto API (Node.js 17+):

```javascript
/**
 * CORRECT: Modern encryption with crypto.createCipheriv
 */
encryptSecret(secret) {
  // Validate encryption key exists
  if (!process.env.MFA_ENCRYPTION_KEY || process.env.MFA_ENCRYPTION_KEY.length < 32) {
    throw new Error('MFA_ENCRYPTION_KEY must be at least 32 characters');
  }

  const algorithm = 'aes-256-gcm';
  
  // Generate random salt (store with ciphertext)
  const salt = crypto.randomBytes(16);
  
  // Derive key using scrypt with random salt
  const key = crypto.scryptSync(
    process.env.MFA_ENCRYPTION_KEY,
    salt,
    32  // 32 bytes = 256 bits for AES-256
  );
  
  // Generate random IV (Initialization Vector)
  const iv = crypto.randomBytes(16);  // 16 bytes = 128 bits
  
  // Create cipher with algorithm, key, AND iv
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  // Encrypt the secret
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get authentication tag (GCM mode)
  const authTag = cipher.getAuthTag();
  
  // Return: salt:iv:ciphertext:authTag
  return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * CORRECT: Modern decryption with crypto.createDecipheriv
 */
decryptSecret(encryptedSecret) {
  const algorithm = 'aes-256-gcm';
  
  // Parse encrypted data
  const parts = encryptedSecret.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }
  
  const salt = Buffer.from(parts[0], 'hex');
  const iv = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const authTag = Buffer.from(parts[3], 'hex');
  
  // Derive key using same salt
  const key = crypto.scryptSync(
    process.env.MFA_ENCRYPTION_KEY,
    salt,
    32
  );
  
  // Create decipher with algorithm, key, AND iv
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  
  // Set auth tag for integrity verification
  decipher.setAuthTag(authTag);
  
  // Decrypt the secret
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Key Improvements:

1. ✅ **Uses createCipheriv()** - Modern, non-deprecated API
2. ✅ **IV Properly Used** - Passed to createCipheriv as required
3. ✅ **Auth Tag Handled** - GCM mode integrity protection
4. ✅ **Random Salt** - Per-encryption salt for key derivation
5. ✅ **No Fallback Key** - Throws error if key missing (fail-safe)
6. ✅ **Proper Format** - `salt:iv:ciphertext:authTag` (all needed for decryption)
7. ✅ **Validation** - Checks encryption key length
8. ✅ **Error Handling** - Clear error messages

---

## Migration Strategy

### Phase 1: Fix the Code (30 minutes)

1. Replace `encryptSecret()` with correct implementation
2. Replace `decryptSecret()` with correct implementation
3. Add validation for `MFA_ENCRYPTION_KEY`
4. Update tests to verify new format

### Phase 2: Data Migration (IF NEEDED)

**Question:** Are there existing MFA users in production?

**If NO (likely for new deployment):**
- ✅ Simply deploy fix
- ✅ No migration needed
- ✅ All new MFA setups use correct encryption

**If YES (existing MFA users):**
- ⚠️ Need migration script
- ⚠️ Cannot decrypt old data (wrong algorithm)
- ⚠️ Options:
  1. **Reset all MFA:** Users re-setup (simplest)
  2. **Dual-path:** Try old decrypt, fallback to new
  3. **Force re-setup:** Notify users MFA security upgrade

### Phase 3: Testing (1 hour)

1. Run encryption unit tests (30/30 should pass)
2. Test MFA setup end-to-end
3. Test MFA verification
4. Test backup code flow
5. Load test encryption performance

---

## Test Coverage Created

**File:** `tests/unit/mfaService.encryption.test.js` (470 lines)

### Test Categories:

1. **Secret Encryption** (6 tests)
   - Encrypt TOTP secret successfully
   - Different ciphertext for same secret (IV randomization)
   - IV included in encrypted output
   - Different secrets → different ciphertexts
   - Handle empty secret gracefully
   - Handle special characters

2. **Secret Decryption** (6 tests)
   - Decrypt encrypted secret correctly
   - Decrypt multiple secrets
   - Reject malformed encrypted data
   - Reject data with wrong key
   - Reject tampered ciphertext
   - Reject tampered IV

3. **Encryption Key Management** (3 tests)
   - Require encryption key in production
   - Consistent key derivation
   - Document key rotation procedure

4. **Cryptographic Implementation** (3 tests)
   - Use AES-256-GCM algorithm
   - Proper IV length (16 bytes)
   - Never reuse IV across encryptions

5. **Backup Code Hashing** (4 tests)
   - Hash with SHA-256
   - Same hash for same code
   - Different hashes for different codes
   - Case-sensitive hashing

6. **DB Failure Scenarios** (4 tests)
   - Handle DB error during storage
   - Handle DB error during retrieval
   - Handle corrupted encrypted data
   - Handle missing encryption key

7. **Security Best Practices** (3 tests)
   - Not log plaintext secrets
   - Not expose encryption key in errors
   - Clear sensitive data from memory

8. **Crypto Modernization** (1 test)
   - Document createCipheriv usage

### Current Results:
- ✅ 10/30 passing (non-crypto tests)
- ❌ 20/30 failing (all crypto.createCipher errors)

---

## Recommendations

### Immediate Actions (P0 - CRITICAL):

1. **DO NOT DEPLOY** current code to production
2. **Fix crypto implementation** (use code sample above)
3. **Verify Node.js version** (must support crypto.createCipheriv)
4. **Test encryption thoroughly** (run full test suite)
5. **Audit all crypto usage** (check for other deprecated APIs)

### Short-term (P1 - HIGH):

1. Add startup validation for `MFA_ENCRYPTION_KEY`
2. Implement key rotation procedure
3. Add monitoring for MFA operation failures
4. Document crypto implementation in README
5. Add crypto upgrade notes to deployment docs

### Long-term (P2 - MEDIUM):

1. Consider hardware security module (HSM) for key storage
2. Implement secrets rotation schedule
3. Add crypto benchmarks to CI/CD
4. Regular security audits of encryption
5. Evaluate post-quantum crypto algorithms

---

## Security Review Checklist

- [ ] Crypto implementation uses modern APIs
- [ ] No deprecated crypto functions
- [ ] IV properly generated and used
- [ ] Auth tags handled for GCM mode
- [ ] Random salts for key derivation
- [ ] No hardcoded fallback keys
- [ ] Encryption key validated at startup
- [ ] Error messages don't leak keys
- [ ] Plaintext never logged
- [ ] Tests cover all crypto operations

**Current Status:** ❌ 1/10 items passing

---

## Comparison with Industry Standards

### OWASP Cryptographic Storage Cheat Sheet:

| Requirement | Current | Fixed | Status |
|------------|---------|-------|--------|
| Use authenticated encryption | ❌ No | ✅ Yes (GCM) | FAIL → PASS |
| Use random IV per encryption | ❌ No | ✅ Yes | FAIL → PASS |
| Use proper key derivation | ❌ Weak | ✅ scrypt | FAIL → PASS |
| Store auth tag with ciphertext | ❌ No | ✅ Yes | FAIL → PASS |
| Validate encrypted data format | ❌ No | ✅ Yes | FAIL → PASS |
| No deprecated APIs | ❌ No | ✅ Yes | FAIL → PASS |

---

## Phase B Deliverables

### Created:
1. ✅ Comprehensive MFA encryption test suite (470 lines)
2. ✅ Identified critical crypto vulnerability
3. ✅ Documented modern crypto implementation
4. ✅ Created migration strategy
5. ✅ Provided secure code samples

### Findings:
1. 🔴 **CRITICAL:** crypto.createCipher usage (deprecated, removed)
2. 🔴 **CRITICAL:** MFA encryption completely broken in Node 17+
3. 🟡 **HIGH:** IV generated but not used
4. 🟡 **HIGH:** Auth tag not handled (GCM mode)
5. 🟡 **HIGH:** Weak salt ('salt' hardcoded)
6. 🟡 **HIGH:** Fallback key ('default-key')

### Recommendations:
1. **IMMEDIATE:** Do not deploy until crypto fixed
2. **HIGH:** Implement correct crypto.createCipheriv
3. **MEDIUM:** Add startup validation
4. **LOW:** Audit all crypto usage in codebase

---

## Phase B Assessment

**Status:** ⚠️ **CRITICAL ISSUES FOUND - FIX REQUIRED**

**Production Readiness:** **NOT READY** (MFA broken)

**Next Steps:**
1. Fix crypto implementation
2. Re-run tests (expect 30/30 passing)
3. Update documentation
4. Proceed to Phase C

---

**Report Generated:** November 21, 2025, 9:20 PM  
**Phase:** B - MFA Hardening  
**Analyst:** Cascade AI  
**Severity:** CRITICAL  
**Action Required:** IMMEDIATE

---

## Appendix: Node.js Crypto Migration

### Deprecated (Removed in Node 17+):
```javascript
crypto.createCipher(algorithm, password)
crypto.createDecipher(algorithm, password)
```

### Modern (Node 12+):
```javascript
crypto.createCipheriv(algorithm, key, iv)
crypto.createDecipheriv(algorithm, key, iv)
```

### Why Changed:
- `createCipher` used weak MD5 for key derivation
- No support for proper IV handling
- Security community recommended removal
- Modern `createCipheriv` enforces best practices

### Migration Checklist:
- [x] Identify all crypto.createCipher usage
- [x] Document impact and risk
- [x] Create modern implementation
- [ ] Test new implementation
- [ ] Deploy fix
- [ ] Verify MFA working
- [ ] Monitor for errors

**END OF PHASE B CRITICAL FINDINGS**
