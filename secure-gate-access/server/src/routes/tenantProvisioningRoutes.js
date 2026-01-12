import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import tenantProvisioningService from '../services/tenantProvisioningService.js';
import { validateTenantSpec } from '../validation/tenantValidation.js';

const router = express.Router();

/**
 * POST /api/tenants/provision
 * Provision a new tenant with infra, config, onboarding, and audit reporting.
 */
router.post('/provision', authenticateToken, requireRole('admin'), async (req, res) => {
  const { valid, errors } = validateTenantSpec(req.body);

  if (!valid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid tenant specification',
      errors
    });
  }

  try {
    const report = await tenantProvisioningService.provisionTenant(req.body, {
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return res.status(201).json({
      success: true,
      message: 'Tenant provisioning completed',
      data: report
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Tenant provisioning failed',
      error: error.message
    });
  }
});

export default router;
