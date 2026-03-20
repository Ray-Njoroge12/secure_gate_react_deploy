import { encodeSession, decodeSession } from '../../utils/sessionCrypto';

describe('sessionCrypto', () => {
  it('encodes data so plaintext fields are not visible', () => {
    const data = { mfaSessionId: 'secret-123', userId: 42 };
    const encoded = encodeSession(data);
    expect(encoded).not.toContain('secret-123');
    expect(encoded).not.toContain('"userId"');
  });

  it('decodes back to original data', () => {
    const data = { mfaSessionId: 'secret-123', userId: 42, timestamp: Date.now() };
    const encoded = encodeSession(data);
    const decoded = decodeSession(encoded);
    expect(decoded.mfaSessionId).toBe('secret-123');
    expect(decoded.userId).toBe(42);
  });

  it('returns null for tampered data', () => {
    const encoded = encodeSession({ mfaSessionId: 'x', timestamp: Date.now() });
    const tampered = encoded.slice(0, -5) + 'XXXXX';
    expect(decodeSession(tampered)).toBeNull();
  });

  it('returns null for expired sessions (> 5 min)', () => {
    const data = { mfaSessionId: 'x', timestamp: Date.now() - 6 * 60 * 1000 };
    const encoded = encodeSession(data);
    expect(decodeSession(encoded, 300)).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(decodeSession('')).toBeNull();
    expect(decodeSession('invalid')).toBeNull();
    expect(decodeSession(null)).toBeNull();
  });

  it('encodeSession returns null for circular references', () => {
    const obj = {};
    obj.self = obj;
    expect(encodeSession(obj)).toBeNull();
  });
});
