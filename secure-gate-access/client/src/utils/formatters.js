/**
 * Utility functions for formatting and masking sensitive data
 */

/**
 * Masks a phone number for privacy
 * Format: +254******789
 * @param {string} phone - The phone number to mask
 * @returns {string} - The masked phone number
 */
export const maskPhoneNumber = (phone) => {
    if (!phone) return '';
    // Remove spaces
    const cleanPhone = phone.replace(/\s/g, '');

    // If it's too short, just return as is (or handle error)
    if (cleanPhone.length < 8) return cleanPhone;

    // Keep first 4 and last 3 characters
    const visibleStart = cleanPhone.slice(0, 4);
    const visibleEnd = cleanPhone.slice(-3);

    return `${visibleStart}******${visibleEnd}`;
};

/**
 * Masks an email address for privacy
 * Format: j***@example.com
 * @param {string} email - The email address to mask
 * @returns {string} - The masked email address
 */
export const maskEmail = (email) => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;

    const [user, domain] = parts;
    if (user.length <= 2) {
        return `${user[0]}***@${domain}`;
    }

    return `${user[0]}***${user[user.length - 1]}@${domain}`;
};

/**
 * Masks an access code or token
 * Format: ****1234
 * @param {string} code - The access code to mask
 * @returns {string} - The masked code
 */
export const maskAccessCode = (code) => {
    if (!code) return '';
    const str = String(code);
    if (str.length <= 4) return '****';
    return '****' + str.slice(-4);
};
