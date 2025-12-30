/**
 * Kenya DPA Compliance Routes
 * API endpoints for Data Protection Officer (DPO) and ODPC registration information
 */

import express from 'express';
import kenyaDPAAuditService from '../services/kenyaDPAAuditService.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route GET /api/privacy/dpo
 * @desc Get Data Protection Officer information
 * @access Public
 */
router.get('/dpo', async (req, res) => {
  try {
    const dpo = kenyaDPAAuditService.getDPOInformation();

    res.json({
      success: true,
      data: {
        name: dpo.name,
        email: dpo.email,
        phone: dpo.phone,
        office: dpo.office,
        is_appointed: dpo.is_appointed,
        contact_methods: dpo.contact_methods
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve DPO information',
      error: error.message
    });
  }
});

/**
 * @route GET /api/privacy/odpc-registration
 * @desc Get ODPC registration status
 * @access Public
 */
router.get('/odpc-registration', async (req, res) => {
  try {
    const odpc = kenyaDPAAuditService.getODPCRegistration();

    res.json({
      success: true,
      data: {
        registration_number: odpc.registration_number,
        status: odpc.status,
        is_registered: odpc.is_registered,
        registration_url: odpc.registration_url,
        data_controller_name: odpc.data_controller_name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve ODPC registration information',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/compliance/kenya-dpa
 * @desc Get comprehensive Kenya DPA compliance status
 * @access Admin only
 */
router.get('/compliance/kenya-dpa', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const compliance = kenyaDPAAuditService.getComplianceStatus();

    res.json({
      success: true,
      data: compliance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance status',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/admin/compliance/dpo
 * @desc Update Data Protection Officer information
 * @access Admin only
 */
router.put('/compliance/dpo', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, phone, office, qualifications, appointed_date } = req.body;

    const result = await kenyaDPAAuditService.updateDPOInformation({
      name,
      email,
      phone,
      office,
      qualifications,
      appointed_date
    });

    res.json({
      success: true,
      message: 'DPO information updated successfully',
      data: result.dpo
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update DPO information',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/admin/compliance/odpc-registration
 * @desc Update ODPC registration information
 * @access Admin only
 */
router.put('/compliance/odpc-registration', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { registration_number, registration_date } = req.body;

    const result = await kenyaDPAAuditService.updateODPCRegistration({
      registration_number,
      registration_date
    });

    res.json({
      success: true,
      message: 'ODPC registration updated successfully',
      data: result.registration
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update ODPC registration',
      error: error.message
    });
  }
});

export default router;
