import * as crypto from 'crypto';
import { dbManager } from '../database/db.enhanced.js';
import auditService from './auditService.js';

const PLAN_LIMITS = {
  basic: { maxUsers: 25, maxVisitorsPerDay: 100, storageGb: 10 },
  standard: { maxUsers: 100, maxVisitorsPerDay: 500, storageGb: 50 },
  premium: { maxUsers: 500, maxVisitorsPerDay: 2000, storageGb: 200 },
  enterprise: { maxUsers: 2000, maxVisitorsPerDay: 10000, storageGb: 1024 }
};

const slugify = (name) => name
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')
  .slice(0, 60);

const normalizeSchemaName = (slug) => {
  const base = slug.replace(/[^a-z0-9_]+/g, '_');
  const candidate = /^[a-z_]/.test(base) ? base : `tenant_${base}`;
  const safe = candidate.replace(/_+/g, '_');
  if (!/^[a-z_][a-z0-9_]*$/.test(safe)) {
    throw new Error('Invalid schema identifier derived from tenant name.');
  }
  return `tenant_${safe}`;
};

const buildFeatureFlags = (plan, features = {}) => {
  const defaults = {
    'visitor-management': true,
    'incident-response': ['premium', 'enterprise'].includes(plan),
    'integrations': plan !== 'basic',
    'audit-reporting': true
  };

  return { ...defaults, ...features };
};

const buildDefaultSettings = (spec) => ({
  timezone: 'UTC',
  locale: 'en-US',
  region: spec.region,
  notifications: {
    email: true,
    sms: false,
    whatsapp: false
  },
  retentionDays: 90
});

const buildDefaultIntegrations = () => ([
  {
    provider: 'webhook',
    enabled: false,
    config: {
      endpoint: null,
      secret: null
    }
  },
  {
    provider: 'email',
    enabled: true,
    config: {
      sender: 'no-reply@securegate.local',
      replyTo: 'support@securegate.local'
    }
  }
]);

const buildOnboardingPayload = (spec) => {
  const inviteToken = crypto.randomUUID();
  return {
    roles: [
      { name: 'admin', permissions: ['*'] },
      { name: 'guard', permissions: ['visitors:read', 'visitors:update', 'alerts:read'] },
      { name: 'resident', permissions: ['visitors:create', 'visitors:read'] }
    ],
    adminInvite: {
      email: spec.adminEmail || null,
      token: inviteToken,
      createdAt: new Date().toISOString()
    },
    sampleContent: {
      welcomeMessage: `Welcome to ${spec.name}!`,
      sampleVisitor: {
        name: 'Sample Visitor',
        purpose: 'Orientation tour',
        status: 'PENDING'
      }
    }
  };
};

const insertProvisioningRun = async ({ estateId, userId }) => {
  const result = await dbManager.query(
    'INSERT INTO tenant_provisioning_runs (estate_id, requested_by) VALUES ($1, $2) RETURNING id, started_at',
    [estateId || null, userId || null]
  );
  return result.rows[0];
};

const updateProvisioningRun = async (runId, updates) => {
  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value], index) => {
    fields.push(`${key} = $${index + 2}`);
    values.push(value);
  });

  if (!fields.length) {
    return;
  }

  await dbManager.query(
    `UPDATE tenant_provisioning_runs SET ${fields.join(', ')} WHERE id = $1`,
    [runId, ...values]
  );
};

const startProvisioningStep = async (runId, stepName) => {
  const result = await dbManager.query(
    `INSERT INTO tenant_provisioning_steps (provisioning_run_id, step_name, status, started_at)
     VALUES ($1, $2, $3, NOW()) RETURNING id`,
    [runId, stepName, 'in_progress']
  );
  return result.rows[0].id;
};

const completeProvisioningStep = async (stepId, status, details) => {
  await dbManager.query(
    `UPDATE tenant_provisioning_steps
     SET status = $2, completed_at = NOW(), details = $3
     WHERE id = $1`,
    [stepId, status, details ? JSON.stringify(details) : JSON.stringify({})]
  );
};

const insertResource = async (estateId, resourceType, resourceName, details) => {
  const result = await dbManager.query(
    `INSERT INTO tenant_resources (estate_id, resource_type, resource_name, details)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (estate_id, resource_type, resource_name)
     DO UPDATE SET details = EXCLUDED.details
     RETURNING id`,
    [estateId, resourceType, resourceName, JSON.stringify(details || {})]
  );
  return result.rows[0]?.id;
};

const fetchResources = async (estateId) => {
  const result = await dbManager.query(
    `SELECT resource_type, resource_name, details, created_at
     FROM tenant_resources
     WHERE estate_id = $1
     ORDER BY created_at`,
    [estateId]
  );
  return result.rows;
};

const fetchSteps = async (runId) => {
  const result = await dbManager.query(
    `SELECT step_name, status, started_at, completed_at, details
     FROM tenant_provisioning_steps
     WHERE provisioning_run_id = $1
     ORDER BY id`,
    [runId]
  );
  return result.rows;
};

const getDefaultLimits = (plan, overrides = {}) => ({
  ...PLAN_LIMITS[plan] || PLAN_LIMITS.standard,
  ...overrides
});

const ensureEstateLocation = async (estateId) => {
  await dbManager.query(
    'INSERT INTO estate_locations (estate_id) VALUES ($1) ON CONFLICT (estate_id) DO NOTHING',
    [estateId]
  );
};

const provisionTenantRecord = async (spec, slug) => {
  const plan = spec.plan || 'standard';
  const region = spec.region || 'global';
  const limits = getDefaultLimits(plan, spec.limits || {});
  const features = buildFeatureFlags(plan, spec.features || {});

  const existing = await dbManager.query('SELECT id FROM estates WHERE slug = $1', [slug]);

  if (existing.rowCount > 0) {
    const estateId = existing.rows[0].id;
    await dbManager.query(
      `UPDATE estates
       SET name = $2, plan = $3, region = $4, limits = $5, features = $6, updated_at = NOW()
       WHERE id = $1`,
      [estateId, spec.name, plan, region, JSON.stringify(limits), JSON.stringify(features)]
    );
    await ensureEstateLocation(estateId);
    return { estateId, created: false, plan, region, limits, features };
  }

  const insertResult = await dbManager.query(
    `INSERT INTO estates (name, slug, timezone, plan, region, limits, features)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [spec.name, slug, 'UTC', plan, region, JSON.stringify(limits), JSON.stringify(features)]
  );

  const estateId = insertResult.rows[0].id;
  await ensureEstateLocation(estateId);

  return { estateId, created: true, plan, region, limits, features };
};

const provisionInfrastructure = async ({ estateId, slug, plan, region }) => {
  const schemaName = normalizeSchemaName(slug);
  await dbManager.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

  const resources = [];
  resources.push({
    id: await insertResource(estateId, 'database_schema', schemaName, { plan, region }),
    type: 'database_schema',
    name: schemaName
  });

  const bucketName = `tenant-${slug}-uploads`;
  resources.push({
    id: await insertResource(estateId, 'storage_bucket', bucketName, { region, retentionDays: 90 }),
    type: 'storage_bucket',
    name: bucketName
  });

  const secretName = `tenant-${slug}-app-secrets`;
  resources.push({
    id: await insertResource(estateId, 'secrets_bundle', secretName, { rotationDays: 90 }),
    type: 'secrets_bundle',
    name: secretName
  });

  const iamRole = `tenant-${slug}-role`;
  resources.push({
    id: await insertResource(estateId, 'iam_role', iamRole, { policy: 'tenant-default' }),
    type: 'iam_role',
    name: iamRole
  });

  return { schemaName, resources };
};

const provisionAppConfig = async ({ estateId, plan, features, region }, spec) => {
  const flags = buildFeatureFlags(plan, features);
  const flagEntries = Object.entries(flags);

  for (const [key, enabled] of flagEntries) {
    await dbManager.query(
      `INSERT INTO tenant_feature_flags (estate_id, flag_key, enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (estate_id, flag_key)
       DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
      [estateId, key, Boolean(enabled)]
    );
  }

  const settings = buildDefaultSettings({ region, ...spec });
  await dbManager.query(
    `INSERT INTO tenant_settings (estate_id, settings)
     VALUES ($1, $2)
     ON CONFLICT (estate_id)
     DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()`,
    [estateId, JSON.stringify(settings)]
  );

  const integrations = spec.integrations && Array.isArray(spec.integrations)
    ? spec.integrations
    : buildDefaultIntegrations();

  for (const integration of integrations) {
    await dbManager.query(
      `INSERT INTO tenant_integrations (estate_id, provider, config, enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (estate_id, provider)
       DO UPDATE SET config = EXCLUDED.config, enabled = EXCLUDED.enabled, updated_at = NOW()`,
      [estateId, integration.provider, JSON.stringify(integration.config || {}), integration.enabled !== false]
    );
  }

  return { flags, settings, integrations };
};

const provisionOnboarding = async (estateId, spec) => {
  const onboarding = buildOnboardingPayload(spec);
  await dbManager.query(
    `INSERT INTO tenant_onboarding (estate_id, roles, admin_invite, sample_content)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (estate_id)
     DO UPDATE SET roles = EXCLUDED.roles, admin_invite = EXCLUDED.admin_invite, sample_content = EXCLUDED.sample_content`,
    [
      estateId,
      JSON.stringify(onboarding.roles),
      JSON.stringify(onboarding.adminInvite),
      JSON.stringify(onboarding.sampleContent)
    ]
  );

  return onboarding;
};

const rollbackSchema = async (schemaName) => {
  if (!schemaName) return;
  await dbManager.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
};

const buildReport = async (runId, estateId, spec, status, startedAt) => {
  const resources = estateId ? await fetchResources(estateId) : [];
  const steps = await fetchSteps(runId);

  return {
    runId,
    estateId,
    tenantName: spec.name,
    status,
    startedAt: startedAt || new Date().toISOString(),
    completedAt: status !== 'in_progress' ? new Date().toISOString() : null,
    resources,
    steps
  };
};

const tenantProvisioningService = {
  async provisionTenant(spec, context = {}) {
    const slug = slugify(spec.name);
    if (!slug) {
      throw new Error('Tenant name must include alphanumeric characters.');
    }
    const rollbackActions = [];
    let runId;
    let estateId;
    let schemaName;

    const runRecord = await insertProvisioningRun({ estateId: null, userId: context.userId });
    runId = runRecord.id;
    const runStartedAt = runRecord.started_at?.toISOString?.() || new Date().toISOString();

    try {
      const tenantStepId = await startProvisioningStep(runId, 'tenant-record');
      const tenantRecord = await provisionTenantRecord(spec, slug);
      estateId = tenantRecord.estateId;

      await dbManager.query(
        'UPDATE tenant_provisioning_runs SET estate_id = $2 WHERE id = $1',
        [runId, estateId]
      );

      if (tenantRecord.created) {
        rollbackActions.push(async () => {
          await dbManager.query('DELETE FROM estates WHERE id = $1', [estateId]);
        });
      }

      await completeProvisioningStep(tenantStepId, 'completed', {
        estateId,
        slug,
        plan: tenantRecord.plan,
        region: tenantRecord.region
      });

      const infraStepId = await startProvisioningStep(runId, 'infrastructure');
      const infraResult = await provisionInfrastructure({
        estateId,
        slug,
        plan: tenantRecord.plan,
        region: tenantRecord.region
      });
      schemaName = infraResult.schemaName;
      rollbackActions.push(async () => rollbackSchema(schemaName));

      await completeProvisioningStep(infraStepId, 'completed', {
        schemaName,
        resources: infraResult.resources
      });

      const configStepId = await startProvisioningStep(runId, 'app-config');
      const configResult = await provisionAppConfig(
        { estateId, plan: tenantRecord.plan, features: tenantRecord.features, region: tenantRecord.region },
        spec
      );

      await completeProvisioningStep(configStepId, 'completed', {
        featureFlags: configResult.flags,
        settings: configResult.settings,
        integrations: configResult.integrations
      });

      const onboardingStepId = await startProvisioningStep(runId, 'onboarding');
      const onboardingResult = await provisionOnboarding(estateId, spec);
      await completeProvisioningStep(onboardingStepId, 'completed', onboardingResult);

      const report = await buildReport(runId, estateId, spec, 'completed', runStartedAt);
      await updateProvisioningRun(runId, {
        status: 'completed',
        completed_at: new Date(),
        report: JSON.stringify(report)
      });

      await auditService.auditLog(
        context.userId,
        'tenant.provision',
        'estate',
        String(estateId),
        report,
        context.ipAddress
      );

      return report;
    } catch (error) {
      for (const rollback of rollbackActions.reverse()) {
        try {
          await rollback();
        } catch (rollbackError) {
          console.error('Tenant provisioning rollback failed:', rollbackError.message);
        }
      }

      const report = await buildReport(runId, estateId, spec, 'failed', runStartedAt);
      await updateProvisioningRun(runId, {
        status: 'failed',
        completed_at: new Date(),
        error_message: error.message,
        report: JSON.stringify(report)
      });

      await auditService.auditLog(
        context.userId,
        'tenant.provision.failed',
        'estate',
        estateId ? String(estateId) : null,
        { error: error.message, report },
        context.ipAddress
      );

      throw error;
    }
  }
};

export default tenantProvisioningService;
