let passSequence = 1;

function createBasePass(overrides = {}) {
  const id = overrides.id || `PASS-${String(passSequence++).padStart(6, '0')}`;
  const now = new Date();

  return {
    id,
    code: overrides.code || id,
    qr: overrides.qr || `QR-${id}`,
    status: overrides.status || 'pending',
    validFrom: overrides.validFrom || now,
    validUntil:
      overrides.validUntil || new Date(now.getTime() + 60 * 60 * 1000),
    maxUses: overrides.maxUses || 1,
    usesRemaining:
      overrides.usesRemaining !== undefined
        ? overrides.usesRemaining
        : overrides.maxUses || 1,
    ...overrides
  };
}

export function createPassLifecycle(options = {}) {
  const now = Date.now();
  const createdAt = new Date(now - 5 * 60 * 1000);
  const activatedAt = new Date(now - 2 * 60 * 1000);
  const expiresAt = new Date(now + 60 * 60 * 1000);

  const base = createBasePass(options);

  return {
    ...base,
    status: options.status || 'active',
    createdAt,
    activatedAt,
    expiresAt
  };
}

export function createMultiUsePass(options = {}) {
  const maxUses = options.maxUses || 5;

  return createBasePass({
    maxUses,
    usesRemaining:
      options.usesRemaining !== undefined ? options.usesRemaining : maxUses,
    status: options.status || 'active',
    ...options
  });
}

export const testPasses = [
  createPassLifecycle(),
  createMultiUsePass()
];

export default {
  createPassLifecycle,
  createMultiUsePass,
  testPasses
};
