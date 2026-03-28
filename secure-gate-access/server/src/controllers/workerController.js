/**
 * Worker Controller
 * Handles worker registration, pass management, and check-in/out endpoints
 */

import workerService from '../services/workerService.js';
import { respond, respondError } from '../utils/respond.js';
import { asyncHandler } from '../middleware/standardizedErrorHandler.js';

/**
 * POST /api/workers
 * Register a new worker (company admin)
 */
export const registerWorker = asyncHandler(async (req, res) => {
  const { companyId, firstName, lastName, phone, email, idNumber, workerType, vehiclePlate, preApproved, notes } = req.body;

  if (!firstName || !lastName) return respondError(res, 400, 'First name and last name are required');

  const targetCompanyId = companyId || req.user.company_id;
  if (!targetCompanyId) return respondError(res, 400, 'Company ID is required');

  // Company admins can only add workers to their own company
  if (req.user.role === 'company_admin' && req.user.company_id !== targetCompanyId) {
    return respondError(res, 403, 'You can only register workers for your own company');
  }

  const worker = await workerService.registerWorker({
    companyId: targetCompanyId,
    estateId: req.user.estate_id,
    firstName,
    lastName,
    phone,
    email,
    idNumber,
    workerType: workerType || 'employee',
    vehiclePlate,
    preApproved: preApproved || false,
    preApprovedBy: preApproved ? req.user.id : null,
    notes,
    createdBy: req.user.id
  });

  return respond(res, { worker, message: 'Worker registered successfully' });
});

/**
 * POST /api/workers/bulk
 * Bulk register workers (company admin)
 */
export const bulkRegisterWorkers = asyncHandler(async (req, res) => {
  const { companyId, workers, preApproved } = req.body;

  if (!Array.isArray(workers) || workers.length === 0) {
    return respondError(res, 400, 'Workers array is required and must not be empty');
  }

  if (workers.length > 500) {
    return respondError(res, 400, 'Maximum 500 workers per bulk registration');
  }

  const targetCompanyId = companyId || req.user.company_id;
  if (!targetCompanyId) return respondError(res, 400, 'Company ID is required');

  if (req.user.role === 'company_admin' && req.user.company_id !== targetCompanyId) {
    return respondError(res, 403, 'You can only register workers for your own company');
  }

  const result = await workerService.bulkRegisterWorkers(targetCompanyId, req.user.estate_id, workers, {
    preApproved: preApproved || false,
    preApprovedBy: preApproved ? req.user.id : null,
    createdBy: req.user.id
  });

  return respond(res, {
    registered: result.registered.length,
    errors: result.errors,
    workers: result.registered,
    message: `${result.registered.length} workers registered, ${result.errors.length} failed`
  });
});

/**
 * GET /api/workers
 * List workers (filtered by company for company admins)
 */
export const listWorkers = asyncHandler(async (req, res) => {
  const { companyId, status, workerType, search, page, limit } = req.query;

  // Company admins can only see their own workers
  const effectiveCompanyId = req.user.role === 'company_admin'
    ? req.user.company_id
    : (companyId ? parseInt(companyId, 10) : undefined);

  const result = await workerService.listWorkers(req.user.estate_id, {
    companyId: effectiveCompanyId,
    status,
    workerType,
    search,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20
  });

  return respond(res, result);
});

/**
 * GET /api/workers/:id
 * Get worker details
 */
export const getWorker = asyncHandler(async (req, res) => {
  const worker = await workerService.getWorkerById(parseInt(req.params.id, 10), req.user.estate_id);
  if (!worker) return respondError(res, 404, 'Worker not found');

  // Company admins can only see their own workers
  if (req.user.role === 'company_admin' && worker.company_id !== req.user.company_id) {
    return respondError(res, 403, 'Access denied');
  }

  return respond(res, { worker });
});

/**
 * PUT /api/workers/:id
 * Update worker details
 */
export const updateWorker = asyncHandler(async (req, res) => {
  const workerId = parseInt(req.params.id, 10);

  // Check company admin ownership
  if (req.user.role === 'company_admin') {
    const worker = await workerService.getWorkerById(workerId, req.user.estate_id);
    if (!worker || worker.company_id !== req.user.company_id) {
      return respondError(res, 403, 'You can only update workers in your own company');
    }
  }

  const updated = await workerService.updateWorker(workerId, req.user.estate_id, req.body);
  if (!updated) return respondError(res, 404, 'Worker not found or no changes made');
  return respond(res, { worker: updated, message: 'Worker updated successfully' });
});

/**
 * POST /api/workers/:id/pre-approve
 * Pre-approve a worker (company admin)
 */
export const preApproveWorker = asyncHandler(async (req, res) => {
  const workerId = parseInt(req.params.id, 10);

  if (req.user.role === 'company_admin') {
    const worker = await workerService.getWorkerById(workerId, req.user.estate_id);
    if (!worker || worker.company_id !== req.user.company_id) {
      return respondError(res, 403, 'You can only pre-approve workers in your own company');
    }
  }

  const worker = await workerService.preApproveWorker(workerId, req.user.estate_id, req.user.id);
  if (!worker) return respondError(res, 404, 'Worker not found or not in pending status');
  return respond(res, { worker, message: 'Worker pre-approved successfully' });
});

/**
 * POST /api/workers/:id/revoke
 * Revoke worker access
 */
export const revokeWorker = asyncHandler(async (req, res) => {
  const worker = await workerService.revokeWorker(parseInt(req.params.id, 10), req.user.estate_id);
  if (!worker) return respondError(res, 404, 'Worker not found');
  return respond(res, { worker, message: 'Worker access revoked' });
});

// ============================================================
// Worker Passes
// ============================================================

/**
 * POST /api/workers/:id/passes
 * Generate a worker pass
 */
export const generateWorkerPass = asyncHandler(async (req, res) => {
  const workerId = parseInt(req.params.id, 10);
  const { passType, validUntil } = req.body;

  if (req.user.role === 'company_admin') {
    const worker = await workerService.getWorkerById(workerId, req.user.estate_id);
    if (!worker || worker.company_id !== req.user.company_id) {
      return respondError(res, 403, 'You can only generate passes for your own company workers');
    }
  }

  const pass = await workerService.generateWorkerPass(workerId, req.user.estate_id, {
    passType,
    validUntil,
    issuedBy: req.user.id
  });

  return respond(res, { pass, message: 'Worker pass generated successfully' });
});

/**
 * GET /api/workers/:id/passes
 * Get worker's passes
 */
export const getWorkerPasses = asyncHandler(async (req, res) => {
  const passes = await workerService.getWorkerPasses(parseInt(req.params.id, 10));
  return respond(res, { passes });
});

/**
 * POST /api/worker-passes/validate
 * Validate a worker pass QR token (guard action)
 */
export const validateWorkerPass = asyncHandler(async (req, res) => {
  const { qrToken } = req.body;
  if (!qrToken) return respondError(res, 400, 'QR token is required');

  const result = await workerService.validateWorkerPass(qrToken, req.user.estate_id);
  if (!result.valid) return respondError(res, 422, result.reason);

  return respond(res, {
    valid: true,
    canCheckIn: result.canCheckIn,
    worker: {
      id: result.pass.worker_id,
      firstName: result.pass.first_name,
      lastName: result.pass.last_name,
      phone: result.pass.phone,
      workerType: result.pass.worker_type,
      vehiclePlate: result.pass.vehicle_plate,
      companyName: result.pass.company_name
    },
    pass: {
      id: result.pass.id,
      passType: result.pass.pass_type,
      validUntil: result.pass.valid_until
    }
  });
});

/**
 * POST /api/worker-passes/:id/revoke
 * Revoke a worker pass
 */
export const revokeWorkerPass = asyncHandler(async (req, res) => {
  const pass = await workerService.revokePass(parseInt(req.params.id, 10), req.user.id);
  if (!pass) return respondError(res, 404, 'Pass not found or already revoked');
  return respond(res, { message: 'Pass revoked successfully' });
});

// ============================================================
// Worker Check-in / Check-out (Guard actions)
// ============================================================

/**
 * POST /api/workers/:id/check-in
 * Check in a worker (guard)
 */
export const checkInWorker = asyncHandler(async (req, res) => {
  const workerId = parseInt(req.params.id, 10);
  const { passId, vehiclePlate, notes } = req.body;

  const checkIn = await workerService.checkInWorker(workerId, req.user.estate_id, {
    guardId: req.user.id,
    passId,
    vehiclePlate,
    notes
  });

  return respond(res, { checkIn, message: 'Worker checked in successfully' });
});

/**
 * POST /api/worker-check-ins/:id/check-out
 * Check out a worker (guard)
 */
export const checkOutWorker = asyncHandler(async (req, res) => {
  const checkInId = parseInt(req.params.id, 10);
  const { notes } = req.body;

  const checkOut = await workerService.checkOutWorker(checkInId, req.user.estate_id, {
    guardId: req.user.id,
    notes
  });

  if (!checkOut) return respondError(res, 404, 'Active check-in not found');
  return respond(res, { checkIn: checkOut, message: 'Worker checked out successfully' });
});

/**
 * GET /api/workers/active
 * Get currently checked-in workers
 */
export const getActiveWorkers = asyncHandler(async (req, res) => {
  const workers = await workerService.getActiveWorkers(req.user.estate_id);
  return respond(res, { workers });
});

/**
 * GET /api/workers/check-in-history
 * Get worker check-in history
 */
export const getCheckInHistory = asyncHandler(async (req, res) => {
  const { companyId, workerId, from, to, page, limit } = req.query;
  const result = await workerService.getCheckInHistory(req.user.estate_id, {
    companyId: companyId ? parseInt(companyId, 10) : undefined,
    workerId: workerId ? parseInt(workerId, 10) : undefined,
    from,
    to,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20
  });
  return respond(res, result);
});
