/**
 * Company Controller
 * Handles company registration, approval, and management endpoints
 */

import companyService from '../services/companyService.js';
import { respond, respondError } from '../utils/respond.js';
import { asyncHandler } from '../middleware/standardizedErrorHandler.js';

/**
 * POST /api/companies/register
 * Register a new company (public or authenticated)
 * Company admin user is created during registration
 */
export const registerCompany = asyncHandler(async (req, res) => {
  const { name, registrationNumber, contactName, contactEmail, contactPhone, address, description } = req.body;

  if (!name) return respondError(res, 400, 'Company name is required');
  if (!req.user?.estate_id) return respondError(res, 400, 'Estate context is required');

  const company = await companyService.registerCompany({
    name,
    registrationNumber: registrationNumber || null,
    estateId: req.user.estate_id,
    contactName: contactName || null,
    contactEmail: contactEmail || null,
    contactPhone: contactPhone || null,
    address: address || null,
    description: description || null
  });

  // Link the registering user as company admin
  await companyService.setCompanyAdmin(company.id, req.user.id);

  return respond(res, { company, message: 'Company registered successfully. Pending admin approval.' });
});

/**
 * GET /api/companies
 * List companies for the estate
 */
export const listCompanies = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const result = await companyService.listCompanies(req.user.estate_id, {
    status,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20
  });
  return respond(res, result);
});

/**
 * GET /api/companies/:id
 * Get company details
 */
export const getCompany = asyncHandler(async (req, res) => {
  const company = await companyService.getCompanyById(parseInt(req.params.id, 10), req.user.estate_id);
  if (!company) return respondError(res, 404, 'Company not found');
  return respond(res, { company });
});

/**
 * PUT /api/companies/:id
 * Update company details (company admin or estate admin)
 */
export const updateCompany = asyncHandler(async (req, res) => {
  const companyId = parseInt(req.params.id, 10);

  // Company admins can only update their own company
  if (req.user.role === 'company_admin' && req.user.company_id !== companyId) {
    return respondError(res, 403, 'You can only update your own company');
  }

  const company = await companyService.updateCompany(companyId, req.user.estate_id, req.body);
  if (!company) return respondError(res, 404, 'Company not found or no changes made');
  return respond(res, { company, message: 'Company updated successfully' });
});

/**
 * POST /api/companies/:id/approve
 * Admin approves a company registration
 */
export const approveCompany = asyncHandler(async (req, res) => {
  const company = await companyService.approveCompany(
    parseInt(req.params.id, 10),
    req.user.estate_id,
    req.user.id
  );
  if (!company) return respondError(res, 404, 'Company not found or not in pending status');
  return respond(res, { company, message: 'Company approved successfully' });
});

/**
 * POST /api/companies/:id/reject
 * Admin rejects a company registration
 */
export const rejectCompany = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const company = await companyService.rejectCompany(
    parseInt(req.params.id, 10),
    req.user.estate_id,
    reason || null
  );
  if (!company) return respondError(res, 404, 'Company not found or not in pending status');
  return respond(res, { company, message: 'Company rejected' });
});

/**
 * POST /api/companies/:id/suspend
 * Admin suspends an approved company
 */
export const suspendCompany = asyncHandler(async (req, res) => {
  const company = await companyService.suspendCompany(
    parseInt(req.params.id, 10),
    req.user.estate_id
  );
  if (!company) return respondError(res, 404, 'Company not found or not in approved status');
  return respond(res, { company, message: 'Company suspended' });
});

// ============================================================
// Company Locations
// ============================================================

/**
 * POST /api/companies/:id/locations
 * Add a location to a company
 */
export const addLocation = asyncHandler(async (req, res) => {
  const companyId = parseInt(req.params.id, 10);
  if (req.user.role === 'company_admin' && req.user.company_id !== companyId) {
    return respondError(res, 403, 'You can only manage your own company locations');
  }

  const { name, address, isPrimary } = req.body;
  if (!name) return respondError(res, 400, 'Location name is required');

  const location = await companyService.addLocation(companyId, { name, address, isPrimary });
  return respond(res, { location, message: 'Location added successfully' });
});

/**
 * GET /api/companies/:id/locations
 * List company locations
 */
export const getLocations = asyncHandler(async (req, res) => {
  const companyId = parseInt(req.params.id, 10);
  if (req.user.role === 'company_admin' && req.user.company_id !== companyId) {
    return respondError(res, 403, 'You can only view your own company locations');
  }

  const locations = await companyService.getLocations(companyId);
  return respond(res, { locations });
});

/**
 * DELETE /api/companies/:id/locations/:locationId
 * Delete a company location
 */
export const deleteLocation = asyncHandler(async (req, res) => {
  const companyId = parseInt(req.params.id, 10);
  if (req.user.role === 'company_admin' && req.user.company_id !== companyId) {
    return respondError(res, 403, 'You can only manage your own company locations');
  }

  const location = await companyService.deleteLocation(parseInt(req.params.locationId, 10), companyId);
  if (!location) return respondError(res, 404, 'Location not found');
  return respond(res, { message: 'Location deleted' });
});
