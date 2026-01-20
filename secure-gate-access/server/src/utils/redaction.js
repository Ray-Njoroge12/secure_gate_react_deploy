export const REDACTED_VALUE = 'redacted';

export const maskEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return REDACTED_VALUE;
  }
  const [localPart, domain] = email.split('@');
  if (!domain) {
    return REDACTED_VALUE;
  }
  const firstChar = localPart ? localPart[0] : '';
  return `${firstChar || REDACTED_VALUE}***@${domain}`;
};

export const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return REDACTED_VALUE;
  }
  const tail = phone.slice(-4);
  return `***${tail || ''}`;
};
