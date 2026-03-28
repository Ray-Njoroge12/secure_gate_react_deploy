const KEY = 'sg_mfa_v1';

export function encodeSession(data) {
  try {
    const json = JSON.stringify(data);
    const encoded = btoa(
      json.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ KEY.charCodeAt(i % KEY.length))
      ).join('')
    );
    const checksum = btoa(String(json.length));
    return encoded + '.' + checksum;
  } catch {
    return null;
  }
}

export function decodeSession(encoded, maxAgeSec = 300) {
  try {
    const [data, checksum] = encoded.split('.');
    if (!data || !checksum) return null;

    const decoded = atob(data)
      .split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ KEY.charCodeAt(i % KEY.length))
      ).join('');

    if (btoa(String(decoded.length)) !== checksum) return null;

    const parsed = JSON.parse(decoded);

    if (parsed.timestamp && (Date.now() - parsed.timestamp > maxAgeSec * 1000)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
