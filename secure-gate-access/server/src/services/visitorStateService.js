import { PASS_STATUS, normalizeStatus } from '../constants/statuses.js';

export const VISITOR_STATUS = PASS_STATUS;

const VISITOR_TRANSITIONS = {
  [PASS_STATUS.PENDING]: [
    PASS_STATUS.VERIFIED,
    PASS_STATUS.OTP_SENT,
    PASS_STATUS.PENDING_CONFIRMATION,
    PASS_STATUS.CONFIRMED,
    PASS_STATUS.ACTIVE,
    PASS_STATUS.APPROVED,
    PASS_STATUS.ON_PREMISE,
    PASS_STATUS.EXPIRED,
    PASS_STATUS.REVOKED
  ],
  [PASS_STATUS.VERIFIED]: [
    PASS_STATUS.OTP_SENT,
    PASS_STATUS.PENDING_CONFIRMATION,
    PASS_STATUS.CONFIRMED,
    PASS_STATUS.ACTIVE,
    PASS_STATUS.ON_PREMISE,
    PASS_STATUS.EXPIRED,
    PASS_STATUS.REVOKED
  ],
  [PASS_STATUS.OTP_SENT]: [
    PASS_STATUS.CONFIRMED,
    PASS_STATUS.ACTIVE,
    PASS_STATUS.ON_PREMISE,
    PASS_STATUS.EXPIRED,
    PASS_STATUS.REVOKED
  ],
  [PASS_STATUS.PENDING_CONFIRMATION]: [
    PASS_STATUS.CONFIRMED,
    PASS_STATUS.EXPIRED,
    PASS_STATUS.REVOKED
  ],
  [PASS_STATUS.CONFIRMED]: [
    PASS_STATUS.ACTIVE,
    PASS_STATUS.ON_PREMISE,
    PASS_STATUS.EXPIRED,
    PASS_STATUS.REVOKED
  ],
  [PASS_STATUS.ACTIVE]: [
    PASS_STATUS.ON_PREMISE,
    PASS_STATUS.EXPIRED,
    PASS_STATUS.REVOKED
  ],
  [PASS_STATUS.PENDING_APPROVAL]: [
    PASS_STATUS.APPROVED,
    PASS_STATUS.REJECTED
  ],
  [PASS_STATUS.APPROVED]: [
    PASS_STATUS.ON_PREMISE,
    PASS_STATUS.EXPIRED,
    PASS_STATUS.REVOKED
  ],
  [PASS_STATUS.ON_PREMISE]: [PASS_STATUS.CHECKED_OUT],
  [PASS_STATUS.CHECKED_OUT]: [],
  [PASS_STATUS.REJECTED]: [],
  [PASS_STATUS.REVOKED]: [],
  [PASS_STATUS.EXPIRED]: []
};

export const getAllowedTransitions = (status) => {
  const normalized = normalizeStatus(status);
  return VISITOR_TRANSITIONS[normalized] || [];
};

export const canTransition = (fromStatus, toStatus) => {
  const normalizedFrom = normalizeStatus(fromStatus);
  const normalizedTo = normalizeStatus(toStatus);
  return getAllowedTransitions(normalizedFrom).includes(normalizedTo);
};

export const validateVisitorTransition = (fromStatus, toStatus) => {
  const normalizedFrom = normalizeStatus(fromStatus);
  const normalizedTo = normalizeStatus(toStatus);

  if (!VISITOR_TRANSITIONS[normalizedFrom]) {
    return {
      valid: false,
      reason: `Unknown visitor status: ${fromStatus}`
    };
  }

  if (!VISITOR_TRANSITIONS[normalizedFrom].includes(normalizedTo)) {
    return {
      valid: false,
      reason: `Invalid visitor transition from ${normalizedFrom} to ${normalizedTo}`
    };
  }

  return { valid: true };
};

export default {
  VISITOR_STATUS,
  getAllowedTransitions,
  canTransition,
  validateVisitorTransition
};
