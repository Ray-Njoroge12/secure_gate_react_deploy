/**
 * Multi-Factor Authentication (MFA) Service
 * 
 * IMPLEMENTATION STATUS: ✅ FIXED (February 5, 2026)
 * ====================================================
 * 
 * DATABASE SCHEMA FIX:
 * - This service expects MFA data in users table (mfa_enabled, mfa_secret, backup_codes, mfa_methods)
 * - Migration 061 adds these columns to users table
 * - Previously these were in separate user_security_settings table (causing failures)
 * 
 * DATA STORAGE:
 * =============
 * Column           | Type    | Purpose
 * -----------------|---------|--------------------------------------------------
 * mfa_enabled      | BOOLEAN | Whether MFA is enabled for user
 * mfa_secret       | VARCHAR | Encrypted TOTP secret (for Google Authenticator)
 * backup_codes     | JSONB   | Array of hashed backup codes
 * mfa_methods      | JSONB   | Array of enabled methods ['totp', 'sms', 'email']
 * 
 * SECURITY:
 * =========
 * - TOTP secrets are encrypted before storage (encryptSecret method)
 * - Backup codes are hashed before storage (one-time use, consumed on verification)
 * - Failed attempts are tracked with automatic lockout after 3 failures
 * - Lockout duration: 15 minutes
 * - TOTP window: ±30 seconds for clock skew
 * 
 * Provides comprehensive MFA functionality including:
 * - TOTP (Time-based One-Time Password) generation and validation
 * - SMS-based OTP
 * - Email-based OTP
 * - Backup codes
 * - MFA enforcement policies
 * 
 * METHODS:
 * ========
 * - generateTOTPSecret(userId, email) -> { secret, qrCodeUrl, manualEntryKey }
 * - verifyTOTPToken(userId, token) -> boolean
 * - generateBackupCodes(userId) -> string[] (plaintext, shown once)
 * - verifyBackupCode(userId, code) -> boolean
 * - disableMFA(userId) -> void
 * 
 * TROUBLESHOOTING:
 * ================
 * If this service throws "column does not exist" errors:
 * 1. Run: npm run mfa:migrate
 * 2. Verify: npm run mfa:verify
 * 3. Check logs for specific column name
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import * as crypto from 'crypto';
import loggingService from './loggingService.js';
import emailService from './emailService.js';
import smsService from './smsService.js';
import databaseService from './optimizedDatabaseService.js';

class MFAService {
  constructor() {
    this.config = {
      issuer: process.env.MFA_ISSUER || 'Secure Gate Access Control',
      algorithm: 'sha1',
      digits: 6,
      period: 30,
      window: 1,
      backupCodeLength: 8,
      backupCodeCount: 10,
      maxAttempts: 3,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      otpValidityPeriod: 5 * 60 * 1000, // 5 minutes
      smsOtpLength: 6,
      emailOtpLength: 6
    };
    
    this.attempts = new Map();
    this.lockouts = new Map();
    this.otpCodes = new Map(); // In-memory OTP storage (short-lived, 5-min expiry)
    
    this.initializeService();
  }

  /**
   * Initialize MFA service
   */
  async initializeService() {
    try {
      loggingService.logInfo('MFA service initialized', {
        issuer: this.config.issuer,
        algorithm: this.config.algorithm,
        digits: this.config.digits,
        period: this.config.period
      });
    } catch (error) {
      loggingService.logError('Failed to initialize MFA service', error);
      throw error;
    }
  }

  /**
   * Generate TOTP secret for user
   */
  async generateTOTPSecret(userId, userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: userEmail,
        issuer: this.config.issuer,
        length: 32
      });

      // Store secret in users table (encrypted) - MFA-002 FIX
      const encryptedSecret = this.encryptSecret(secret.base32);
      
      await databaseService.query(
        'UPDATE users SET mfa_secret = $1 WHERE id = $2',
        [encryptedSecret, userId]
      );

      loggingService.logInfo('TOTP secret generated for user', {
        userId,
        method: 'totp'
      });

      return {
        secret: secret.base32,
        qrCodeUrl: secret.otpauth_url,
        manualEntryKey: secret.base32
      };

    } catch (error) {
      loggingService.logError('Failed to generate TOTP secret', error, {
        userId
      });
      throw error;
    }
  }

  /**
   * Generate QR code for TOTP setup
   */
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeDataURL;

    } catch (error) {
      loggingService.logError('Failed to generate QR code', error);
      throw error;
    }
  }

  /**
   * Verify TOTP token
   */
  async verifyTOTPToken(userId, token) {
    try {
      // Check if user is locked out
      if (this.isUserLockedOut(userId)) {
        throw new Error('User is temporarily locked out due to too many failed attempts');
      }

      // Get user's TOTP secret from users table - MFA-003 FIX
      const result = await databaseService.query(
        'SELECT mfa_secret FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].mfa_secret) {
        throw new Error('TOTP not configured for user');
      }

      const encryptedSecret = result.rows[0].mfa_secret;
      const secret = this.decryptSecret(encryptedSecret);

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: this.config.window,
        time: Math.floor(Date.now() / 1000)
      });

      if (verified) {
        // Reset failed attempts
        this.attempts.delete(userId);
        
        loggingService.logInfo('TOTP token verified successfully', {
          userId,
          method: 'totp'
        });

        return true;
      } else {
        // Increment failed attempts
        this.incrementFailedAttempts(userId);
        
        loggingService.logWarning('TOTP token verification failed', {
          userId,
          method: 'totp'
        });

        return false;
      }

    } catch (error) {
      loggingService.logError('Failed to verify TOTP token', error, {
        userId
      });
      throw error;
    }
  }

  /**
   * Generate backup codes for user
   */
  async generateBackupCodes(userId) {
    try {
      const codes = [];
      
      for (let i = 0; i < this.config.backupCodeCount; i++) {
        const code = crypto.randomBytes(this.config.backupCodeLength).toString('hex').toUpperCase();
        codes.push(code);
      }

      // Store backup codes in users table (hashed) - MFA-004 FIX
      const hashedCodes = codes.map(code => this.hashBackupCode(code));
      
      await databaseService.query(
        'UPDATE users SET backup_codes = $1 WHERE id = $2',
        [JSON.stringify(hashedCodes), userId]
      );

      loggingService.logInfo('Backup codes generated for user', {
        userId,
        count: codes.length
      });

      return codes;

    } catch (error) {
      loggingService.logError('Failed to generate backup codes', error, {
        userId
      });
      throw error;
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId, code) {
    try {
      // Check if user is locked out
      if (this.isUserLockedOut(userId)) {
        throw new Error('User is temporarily locked out due to too many failed attempts');
      }

      // Get user's backup codes from users table - MFA-007 FIX
      const result = await databaseService.query(
        'SELECT backup_codes FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].backup_codes) {
        throw new Error('No backup codes found for user');
      }

      const hashedCodes = JSON.parse(result.rows[0].backup_codes);
      const hashedInputCode = this.hashBackupCode(code);

      // Check if code matches
      const codeIndex = hashedCodes.indexOf(hashedInputCode);
      
      if (codeIndex !== -1) {
        // Remove used code
        hashedCodes.splice(codeIndex, 1);
        
        await databaseService.query(
          'UPDATE users SET backup_codes = $1 WHERE id = $2',
          [JSON.stringify(hashedCodes), userId]
        );

        loggingService.logInfo('Backup code verified successfully', {
          userId,
          remainingCodes: hashedCodes.length
        });

        return true;
      } else {
        // Increment failed attempts
        this.incrementFailedAttempts(userId);
        
        loggingService.logWarning('Backup code verification failed', {
          userId
        });

        return false;
      }

    } catch (error) {
      loggingService.logError('Failed to verify backup code', error, {
        userId
      });
      throw error;
    }
  }

  /**
   * Send SMS OTP
   */
  async sendSMSOTP(userId, phoneNumber) {
    try {
      const otp = this.generateOTP(this.config.smsOtpLength);
      
      // Store OTP in memory with expiration (short-lived, no DB table needed)
      const expiresAt = Date.now() + this.config.otpValidityPeriod;
      this.storeOTP(userId, otp, 'sms', expiresAt);

      // Send SMS
      await smsService.sendOTP(phoneNumber, otp);

      loggingService.logInfo('SMS OTP sent successfully', {
        userId,
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        method: 'sms'
      });

      return { success: true, message: 'SMS OTP sent successfully' };

    } catch (error) {
      loggingService.logError('Failed to send SMS OTP', error, {
        userId,
        phoneNumber: this.maskPhoneNumber(phoneNumber)
      });
      throw error;
    }
  }

  /**
   * Send Email OTP
   */
  async sendEmailOTP(userId, email) {
    try {
      const otp = this.generateOTP(this.config.emailOtpLength);
      
      // Store OTP in memory with expiration (short-lived, no DB table needed)
      const expiresAt = Date.now() + this.config.otpValidityPeriod;
      this.storeOTP(userId, otp, 'email', expiresAt);

      // Send email
      await emailService.sendOTP(email, otp);

      loggingService.logInfo('Email OTP sent successfully', {
        userId,
        email: this.maskEmail(email),
        method: 'email'
      });

      return { success: true, message: 'Email OTP sent successfully' };

    } catch (error) {
      loggingService.logError('Failed to send email OTP', error, {
        userId,
        email: this.maskEmail(email)
      });
      throw error;
    }
  }

  /**
   * Verify OTP (SMS or Email)
   */
  async verifyOTP(userId, code, method) {
    try {
      // Check if user is locked out
      if (this.isUserLockedOut(userId)) {
        throw new Error('User is temporarily locked out due to too many failed attempts');
      }

      // Get valid OTP from in-memory storage
      const storedOTP = this.getStoredOTP(userId, method);

      if (!storedOTP) {
        throw new Error('No valid OTP found for user');
      }

      if (storedOTP.code === code) {
        // Remove used OTP
        this.removeOTP(userId, method);

        // Reset failed attempts
        this.attempts.delete(userId);

        loggingService.logInfo('OTP verified successfully', {
          userId,
          method
        });

        return true;
      } else {
        // Increment failed attempts
        this.incrementFailedAttempts(userId);
        
        loggingService.logWarning('OTP verification failed', {
          userId,
          method
        });

        return false;
      }

    } catch (error) {
      loggingService.logError('Failed to verify OTP', error, {
        userId,
        method
      });
      throw error;
    }
  }

  /**
   * Check if MFA is required for user
   */
  async isMFARequired(userId) {
    try {
      // Check user's MFA settings
      const result = await databaseService.query(
        'SELECT mfa_enabled, mfa_methods FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const user = result.rows[0];
      return user.mfa_enabled && user.mfa_methods && user.mfa_methods.length > 0;

    } catch (error) {
      loggingService.logError('Failed to check MFA requirement', error, {
        userId
      });
      return false;
    }
  }

  /**
   * Get user's MFA methods
   */
  async getUserMFAMethods(userId) {
    try {
      const result = await databaseService.query(
        'SELECT mfa_methods, updated_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].mfa_methods) {
        return [];
      }

      const methods = typeof result.rows[0].mfa_methods === 'string'
        ? JSON.parse(result.rows[0].mfa_methods)
        : result.rows[0].mfa_methods;

      return methods.map(method => ({
        method,
        createdAt: result.rows[0].updated_at
      }));

    } catch (error) {
      loggingService.logError('Failed to get user MFA methods', error, {
        userId
      });
      return [];
    }
  }

  /**
   * Enable MFA for user
   */
  async enableMFA(userId, methods) {
    try {
      await databaseService.query(
        'UPDATE users SET mfa_enabled = true, mfa_methods = $1, updated_at = $2 WHERE id = $3',
        [JSON.stringify(methods), new Date(), userId]
      );

      loggingService.logInfo('MFA enabled for user', {
        userId,
        methods
      });

    } catch (error) {
      loggingService.logError('Failed to enable MFA for user', error, {
        userId,
        methods
      });
      throw error;
    }
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId) {
    try {
      // Clear all MFA data from users table and disable MFA
      await databaseService.query(
        'UPDATE users SET mfa_enabled = false, mfa_secret = NULL, backup_codes = NULL, mfa_methods = NULL, updated_at = $1 WHERE id = $2',
        [new Date(), userId]
      );

      // Clear any active attempts/lockouts and OTP codes
      this.attempts.delete(userId);
      this.lockouts.delete(userId);
      this.removeAllOTPs(userId);

      loggingService.logInfo('MFA disabled for user', {
        userId
      });

      return true;

    } catch (error) {
      loggingService.logError('Failed to disable MFA for user', error, {
        userId
      });
      throw error;
    }
  }

  /**
   * Generate OTP code
   * SECURITY FIX: Use crypto.randomInt() instead of Math.random() for cryptographic security
   */
  generateOTP(length) {
    const digits = '0123456789';
    let otp = '';

    for (let i = 0; i < length; i++) {
      otp += digits[crypto.randomInt(0, digits.length)];
    }

    return otp;
  }

  /**
   * Encrypt secret with modern crypto API (Node.js 17+ compatible)
   * Uses crypto.createCipheriv instead of deprecated createCipher
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
    
    // Create cipher with algorithm, key, AND iv (modern API)
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    // Encrypt the secret
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag (required for GCM mode)
    const authTag = cipher.getAuthTag();
    
    // Return format: salt:iv:ciphertext:authTag
    return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }

  /**
   * Decrypt secret with modern crypto API (Node.js 17+ compatible)
   * Uses crypto.createDecipheriv instead of deprecated createDecipher
   */
  decryptSecret(encryptedSecret) {
    // Validate encryption key exists
    if (!process.env.MFA_ENCRYPTION_KEY || process.env.MFA_ENCRYPTION_KEY.length < 32) {
      throw new Error('MFA_ENCRYPTION_KEY must be at least 32 characters');
    }

    const algorithm = 'aes-256-gcm';
    
    // Parse encrypted data
    const parts = encryptedSecret.split(':');
    
    // Handle both old format (2 parts) and new format (4 parts) for migration
    if (parts.length === 2) {
      // Old format detected - attempt legacy decryption (will likely fail)
      throw new Error('Encrypted data is in legacy format. MFA re-setup required.');
    }
    
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
    
    // Create decipher with algorithm, key, AND iv (modern API)
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    
    // Set auth tag for integrity verification (required for GCM)
    decipher.setAuthTag(authTag);
    
    // Decrypt the secret
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Hash backup code
   */
  hashBackupCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Check if user is locked out
   */
  isUserLockedOut(userId) {
    const lockoutTime = this.lockouts.get(userId);
    if (lockoutTime && Date.now() - lockoutTime < this.config.lockoutDuration) {
      return true;
    }
    
    if (lockoutTime && Date.now() - lockoutTime >= this.config.lockoutDuration) {
      this.lockouts.delete(userId);
    }
    
    return false;
  }

  /**
   * Increment failed attempts
   */
  incrementFailedAttempts(userId) {
    const currentAttempts = this.attempts.get(userId) || 0;
    const newAttempts = currentAttempts + 1;
    
    this.attempts.set(userId, newAttempts);
    
    if (newAttempts >= this.config.maxAttempts) {
      this.lockouts.set(userId, Date.now());
      loggingService.logWarning('User locked out due to too many failed MFA attempts', {
        userId,
        attempts: newAttempts
      });
    }
  }

  /**
   * Store OTP in memory with expiration
   * Key format: userId:method
   */
  storeOTP(userId, code, method, expiresAt) {
    const key = `${userId}:${method}`;
    this.otpCodes.set(key, { code, method, expiresAt });
  }

  /**
   * Get stored OTP if not expired
   */
  getStoredOTP(userId, method) {
    const key = `${userId}:${method}`;
    const stored = this.otpCodes.get(key);
    if (!stored) return null;
    if (Date.now() > stored.expiresAt) {
      this.otpCodes.delete(key);
      return null;
    }
    return stored;
  }

  /**
   * Remove a specific OTP
   */
  removeOTP(userId, method) {
    const key = `${userId}:${method}`;
    this.otpCodes.delete(key);
  }

  /**
   * Remove all OTPs for a user
   */
  removeAllOTPs(userId) {
    const prefix = `${userId}:`;
    for (const key of this.otpCodes.keys()) {
      if (key.startsWith(prefix)) {
        this.otpCodes.delete(key);
      }
    }
  }

  /**
   * Mask phone number for logging
   */
  maskPhoneNumber(phoneNumber) {
    if (!phoneNumber) return 'N/A';
    return phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  /**
   * Mask email for logging
   */
  maskEmail(email) {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] : local;
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: true,
      config: {
        issuer: this.config.issuer,
        algorithm: this.config.algorithm,
        digits: this.config.digits,
        period: this.config.period
      },
      activeAttempts: this.attempts.size,
      activeLockouts: this.lockouts.size
    };
  }
}

// Create singleton instance
const mfaService = new MFAService();

export default mfaService;
