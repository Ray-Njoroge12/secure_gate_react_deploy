/**
 * Multi-Factor Authentication (MFA) Service
 * 
 * Provides comprehensive MFA functionality including:
 * - TOTP (Time-based One-Time Password) generation and validation
 * - SMS-based OTP
 * - Email-based OTP
 * - Backup codes
 * - MFA enforcement policies
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import loggingService from './loggingService.js';
import emailService from './emailService.js';
import smsService from './smsService.js';
import databaseService from './databaseService.js';

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

      // Store secret in database (encrypted)
      const encryptedSecret = this.encryptSecret(secret.base32);
      
      await databaseService.query(
        'INSERT INTO user_mfa_secrets (user_id, secret, method, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, method) DO UPDATE SET secret = $2, updated_at = $4',
        [userId, encryptedSecret, 'totp', new Date()]
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

      // Get user's TOTP secret
      const result = await databaseService.query(
        'SELECT secret FROM user_mfa_secrets WHERE user_id = $1 AND method = $2',
        [userId, 'totp']
      );

      if (result.rows.length === 0) {
        throw new Error('TOTP not configured for user');
      }

      const encryptedSecret = result.rows[0].secret;
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
        
        loggingService.logWarn('TOTP token verification failed', {
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

      // Store backup codes in database (hashed)
      const hashedCodes = codes.map(code => this.hashBackupCode(code));
      
      await databaseService.query(
        'INSERT INTO user_backup_codes (user_id, codes, created_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET codes = $2, updated_at = $3',
        [userId, JSON.stringify(hashedCodes), new Date()]
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

      // Get user's backup codes
      const result = await databaseService.query(
        'SELECT codes FROM user_backup_codes WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('No backup codes found for user');
      }

      const hashedCodes = JSON.parse(result.rows[0].codes);
      const hashedInputCode = this.hashBackupCode(code);

      // Check if code matches
      const codeIndex = hashedCodes.indexOf(hashedInputCode);
      
      if (codeIndex !== -1) {
        // Remove used code
        hashedCodes.splice(codeIndex, 1);
        
        await databaseService.query(
          'UPDATE user_backup_codes SET codes = $1, updated_at = $2 WHERE user_id = $3',
          [JSON.stringify(hashedCodes), new Date(), userId]
        );

        loggingService.logInfo('Backup code verified successfully', {
          userId,
          remainingCodes: hashedCodes.length
        });

        return true;
      } else {
        // Increment failed attempts
        this.incrementFailedAttempts(userId);
        
        loggingService.logWarn('Backup code verification failed', {
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
      
      // Store OTP in database with expiration
      const expiresAt = new Date(Date.now() + this.config.otpValidityPeriod);
      
      await databaseService.query(
        'INSERT INTO user_otp_codes (user_id, code, method, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)',
        [userId, otp, 'sms', expiresAt, new Date()]
      );

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
      
      // Store OTP in database with expiration
      const expiresAt = new Date(Date.now() + this.config.otpValidityPeriod);
      
      await databaseService.query(
        'INSERT INTO user_otp_codes (user_id, code, method, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)',
        [userId, otp, 'email', expiresAt, new Date()]
      );

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

      // Get valid OTP from database
      const result = await databaseService.query(
        'SELECT code FROM user_otp_codes WHERE user_id = $1 AND method = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [userId, method]
      );

      if (result.rows.length === 0) {
        throw new Error('No valid OTP found for user');
      }

      const storedCode = result.rows[0].code;

      if (storedCode === code) {
        // Remove used OTP
        await databaseService.query(
          'DELETE FROM user_otp_codes WHERE user_id = $1 AND method = $2 AND code = $3',
          [userId, method, code]
        );

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
        
        loggingService.logWarn('OTP verification failed', {
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
        'SELECT method, created_at FROM user_mfa_secrets WHERE user_id = $1',
        [userId]
      );

      return result.rows.map(row => ({
        method: row.method,
        createdAt: row.created_at
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
      // Remove MFA secrets
      await databaseService.query(
        'DELETE FROM user_mfa_secrets WHERE user_id = $1',
        [userId]
      );

      // Remove backup codes
      await databaseService.query(
        'DELETE FROM user_backup_codes WHERE user_id = $1',
        [userId]
      );

      // Update user settings
      await databaseService.query(
        'UPDATE users SET mfa_enabled = false, mfa_methods = NULL, updated_at = $1 WHERE id = $2',
        [new Date(), userId]
      );

      loggingService.logInfo('MFA disabled for user', {
        userId
      });

    } catch (error) {
      loggingService.logError('Failed to disable MFA for user', error, {
        userId
      });
      throw error;
    }
  }

  /**
   * Generate OTP code
   */
  generateOTP(length) {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return otp;
  }

  /**
   * Encrypt secret
   */
  encryptSecret(secret) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.MFA_ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt secret
   */
  decryptSecret(encryptedSecret) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.MFA_ENCRYPTION_KEY || 'default-key', 'salt', 32);
    
    const [ivHex, encrypted] = encryptedSecret.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
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
      loggingService.logWarn('User locked out due to too many failed MFA attempts', {
        userId,
        attempts: newAttempts
      });
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
