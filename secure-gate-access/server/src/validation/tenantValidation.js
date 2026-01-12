const VALID_PLANS = new Set(['basic', 'standard', 'premium', 'enterprise']);

const VALID_REGIONS = new Set([
  'us-east',
  'us-west',
  'eu-west',
  'eu-central',
  'ap-south',
  'ap-southeast',
  'africa',
  'global'
]);

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function validateTenantSpec(spec) {
  const errors = [];

  if (!spec || !isPlainObject(spec)) {
    return { valid: false, errors: ['Tenant spec must be an object.'] };
  }

  const { name, plan, region, limits, features, adminEmail } = spec;

  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    errors.push('Tenant name must be at least 3 characters.');
  }

  if (plan && (!VALID_PLANS.has(plan))) {
    errors.push(`Plan must be one of: ${Array.from(VALID_PLANS).join(', ')}.`);
  }

  if (region && (!VALID_REGIONS.has(region))) {
    errors.push(`Region must be one of: ${Array.from(VALID_REGIONS).join(', ')}.`);
  }

  if (limits && !isPlainObject(limits)) {
    errors.push('Limits must be an object.');
  }

  if (features && !isPlainObject(features)) {
    errors.push('Features must be an object.');
  }

  if (adminEmail && typeof adminEmail !== 'string') {
    errors.push('Admin email must be a string.');
  }

  return { valid: errors.length === 0, errors };
}

export const tenantValidationConfig = {
  validPlans: Array.from(VALID_PLANS),
  validRegions: Array.from(VALID_REGIONS)
};
