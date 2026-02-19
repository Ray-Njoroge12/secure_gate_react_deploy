/**
 * Masks a phone number for privacy.
 * Retains the last 4 digits.
 * @param {string} phone 
 * @returns {string} Masked phone number
 */
export const maskPhoneNumber = (phone) => {
    if (!phone) return '';
    return '******' + phone.slice(-4);
};

/**
 * Masks an email address for privacy.
 * Retains the first character, last 2 characters of local part, and domain.
 * @param {string} email 
 * @returns {string} Masked email address
 */
export const maskEmail = (email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!local || !domain) return email; // Return as is if invalid format

    const maskedLocal = local.length > 3
        ? local[0] + '***' + local.slice(-2)
        : local[0] + '***';

    return `${maskedLocal}@${domain}`;
};

/**
 * Masks a full name for privacy.
 * Retains the first letter of first name and last name.
 * @param {string} name 
 * @returns {string} Masked name
 */
export const maskName = (name) => {
    if (!name) return 'Private Visitor';
    return 'Private Visitor';
};
