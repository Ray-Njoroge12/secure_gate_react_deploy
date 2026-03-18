import { describe, it, expect } from '@jest/globals';
import adminDomain from '../../src/routes/domains/admin.domain.js';

describe('admin domain route config', () => {
  it('keeps privacy and security families single-mounted', () => {
    const prefixes = adminDomain.map((entry) => entry.prefix);

    const privacyMounts = prefixes.filter((prefix) => prefix === '/api/privacy');
    const securityMounts = prefixes.filter((prefix) => prefix === '/api/security');

    expect(privacyMounts).toHaveLength(1);
    expect(securityMounts).toHaveLength(1);
  });

  it('keeps canonical and legacy dsr/consent aliases available', () => {
    const prefixes = new Set(adminDomain.map((entry) => entry.prefix));

    expect(prefixes.has('/api/privacy/dsr')).toBe(true);
    expect(prefixes.has('/api/privacy/consent')).toBe(true);
    expect(prefixes.has('/api/dsr')).toBe(true);
    expect(prefixes.has('/api/consent')).toBe(true);
  });
});
