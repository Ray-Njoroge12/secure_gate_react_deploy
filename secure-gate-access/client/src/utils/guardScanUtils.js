export const CHECK_IN_ALLOWED_STATUSES = new Set([
  'PENDING',
  'OTP_SENT',
  'VERIFIED',
  'OTP_VERIFIED',
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'ACTIVE',
  'APPROVED'
]);

export const CHECK_OUT_ALLOWED_STATUSES = new Set([
  'ON_PREMISE',
  'CHECKED_IN'
]);

export function normalizeVisitorStatus(status) {
  return String(status || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

export function formatVisitorStatus(status) {
  const normalized = normalizeVisitorStatus(status);
  if (!normalized) return 'Unknown';

  return normalized
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function canVisitorCheckIn(status) {
  return CHECK_IN_ALLOWED_STATUSES.has(normalizeVisitorStatus(status));
}

export function canVisitorCheckOut(status) {
  return CHECK_OUT_ALLOWED_STATUSES.has(normalizeVisitorStatus(status));
}

export function extractQrTokenFromQrData(qrData) {
  if (typeof qrData !== 'string') return null;

  const raw = qrData.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const tokenCandidate = parsed.token ?? parsed.qrToken ?? parsed.qr_token;
      if (tokenCandidate !== undefined && tokenCandidate !== null && String(tokenCandidate).trim()) {
        return String(tokenCandidate).trim();
      }
    }
  } catch {
    // Not JSON, continue.
  }

  const keyValueMatch = raw.match(/(?:qr[_-]?token|token)=([A-Za-z0-9._-]+)/i);
  if (keyValueMatch?.[1]) {
    return keyValueMatch[1];
  }

  if (raw.includes('://') || raw.startsWith('/')) {
    try {
      const url = new URL(raw, 'http://localhost');
      const tokenFromQuery =
        url.searchParams.get('token') ||
        url.searchParams.get('qrToken') ||
        url.searchParams.get('qr_token');
      if (tokenFromQuery) {
        return tokenFromQuery;
      }
    } catch {
      // Ignore malformed URL input.
    }
  }

  if (!raw.startsWith('PASS-') && /^[A-Za-z0-9._-]{20,}$/.test(raw)) {
    return raw;
  }

  return null;
}

export function extractVisitorIdFromQrData(qrData) {
  if (typeof qrData !== 'string') return null;

  const raw = qrData.trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) return raw;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const candidate = parsed.visitorId ?? parsed.visitor_id ?? parsed.id;
      if (candidate !== undefined && candidate !== null && String(candidate).trim()) {
        return String(candidate).trim();
      }
    }
  } catch {
    // Not JSON, continue.
  }

  const keyValueMatch = raw.match(/(?:visitor[_-]?id|id)=([A-Za-z0-9_-]+)/i);
  if (keyValueMatch?.[1]) return keyValueMatch[1];

  const passWithTimestamp = raw.match(/^PASS-([A-Za-z0-9_-]+)-\d+$/i);
  if (passWithTimestamp?.[1]) return passWithTimestamp[1];

  const passDirect = raw.match(/^PASS-([A-Za-z0-9_-]+)$/i);
  if (passDirect?.[1]) return passDirect[1];

  if (raw.includes('://') || raw.startsWith('/')) {
    try {
      const url = new URL(raw, 'http://localhost');
      const fromQuery =
        url.searchParams.get('visitorId') ||
        url.searchParams.get('visitor_id') ||
        url.searchParams.get('id');
      if (fromQuery) return fromQuery;

      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 2) {
        const visitorsIdx = segments.findIndex((segment) => segment.toLowerCase() === 'visitors');
        if (visitorsIdx >= 0 && segments[visitorsIdx + 1]) {
          return segments[visitorsIdx + 1];
        }
      }
    } catch {
      // Ignore malformed URL input.
    }
  }

  if (raw.startsWith('PASS-')) {
    const parts = raw.split('-').filter(Boolean);
    if (parts.length >= 2) return parts[1];
  }

  return null;
}
