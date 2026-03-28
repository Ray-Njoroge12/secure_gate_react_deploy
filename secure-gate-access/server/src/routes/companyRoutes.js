/**
 * Company Routes
 * API endpoints for company registration, approval, and management
 */

import express from 'express';
import {
  registerCompany,
  listCompanies,
  getCompany,
  updateCompany,
  approveCompany,
  rejectCompany,
  suspendCompany,
  addLocation,
  getLocations,
  deleteLocation
} from '../controllers/companyController.js';
import { authenticateToken, requireEstate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication and estate context
router.use(authenticateToken, requireEstate);

// Company registration (any authenticated user can register a company)
router.post('/register', registerCompany);

// List companies (admin, guard, company_admin)
router.get('/', requireRole(['admin', 'super_admin', 'guard', 'company_admin']), listCompanies);

// Get company details
router.get('/:id', requireRole(['admin', 'super_admin', 'guard', 'company_admin']), getCompany);

// Update company (company admin for own company, or estate admin)
router.put('/:id', requireRole(['admin', 'super_admin', 'company_admin']), updateCompany);

// Admin approval actions
router.post('/:id/approve', requireRole(['admin', 'super_admin']), approveCompany);
router.post('/:id/reject', requireRole(['admin', 'super_admin']), rejectCompany);
router.post('/:id/suspend', requireRole(['admin', 'super_admin']), suspendCompany);

// Company locations
router.post('/:id/locations', requireRole(['admin', 'super_admin', 'company_admin']), addLocation);
router.get('/:id/locations', requireRole(['admin', 'super_admin', 'company_admin']), getLocations);
router.delete('/:id/locations/:locationId', requireRole(['admin', 'super_admin', 'company_admin']), deleteLocation);

export default router;
