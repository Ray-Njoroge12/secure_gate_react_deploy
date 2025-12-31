/**
 * Centralized Password Validation Utility
 * Ensures consistent password requirements across the application
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (@$!%*?&)
 */

import { VALIDATION_RULES } from '../constants/validation';

class PasswordValidator {
  constructor() {
    this.minLength = VALIDATION_RULES.PASSWORD_MIN_LENGTH; // 8
    this.requirements = {
      minLength: this.minLength,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true
    };
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result with detailed feedback
   */
  validate(password) {
    const errors = [];
    const checks = {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecialChar: false
    };

    // Check minimum length
    if (!password || password.length < this.minLength) {
      errors.push(`Password must be at least ${this.minLength} characters`);
    } else {
      checks.minLength = true;
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      checks.hasUppercase = true;
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      checks.hasLowercase = true;
    }

    // Check for number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      checks.hasNumber = true;
    }

    // Check for special character
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    } else {
      checks.hasSpecialChar = true;
    }

    return {
      isValid: errors.length === 0,
      errors,
      checks,
      strength: this.calculateStrength(password, checks)
    };
  }

  /**
   * Calculate password strength (0-100)
   * @param {string} password - Password to assess
   * @param {Object} checks - Validation checks object
   * @returns {number} Strength score 0-100
   */
  calculateStrength(password, checks) {
    let strength = 0;

    if (!password) return 0;

    // Length contribution (40 points max)
    strength += Math.min((password.length / this.minLength) * 40, 40);

    // Complexity contribution (60 points max)
    if (checks.hasUppercase) strength += 15;
    if (checks.hasLowercase) strength += 15;
    if (checks.hasNumber) strength += 15;
    if (checks.hasSpecialChar) strength += 15;

    return Math.round(strength);
  }

  /**
   * Get user-friendly error message (first error only for inline display)
   * @param {string} password - Password to validate
   * @returns {string|null} Error message or null if valid
   */
  getErrorMessage(password) {
    const result = this.validate(password);
    if (result.isValid) return null;
    return result.errors[0]; // Return first error for inline display
  }

  /**
   * Get all requirements as array (for UI display)
   * @returns {Array<string>} List of all password requirements
   */
  getRequirements() {
    return [
      `At least ${this.minLength} characters long`,
      'Contains uppercase letter (A-Z)',
      'Contains lowercase letter (a-z)',
      'Contains number (0-9)',
      'Contains special character (@$!%*?&)'
    ];
  }

  /**
   * Get validation checks for a password (for UI feedback)
   * @param {string} password - Password to check
   * @returns {Object} Object with boolean values for each requirement
   */
  getChecks(password) {
    return this.validate(password).checks;
  }

  /**
   * Quick validation check
   * @param {string} password - Password to validate
   * @returns {boolean} True if password meets all requirements
   */
  isValid(password) {
    return this.validate(password).isValid;
  }

  /**
   * Get strength level as text
   * @param {number} strength - Strength score (0-100)
   * @returns {string} Strength level: 'weak', 'medium', 'strong', 'very strong'
   */
  getStrengthLevel(strength) {
    if (strength < 40) return 'weak';
    if (strength < 60) return 'medium';
    if (strength < 80) return 'strong';
    return 'very strong';
  }

  /**
   * Get strength color for UI
   * @param {number} strength - Strength score (0-100)
   * @returns {string} Color class/value
   */
  getStrengthColor(strength) {
    if (strength < 40) return 'red';
    if (strength < 60) return 'yellow';
    if (strength < 80) return 'blue';
    return 'green';
  }
}

// Export singleton instance
export default new PasswordValidator();
