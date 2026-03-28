/**
 * Worker Service
 * Business logic for worker registration, pass management, and check-in/out
 */

import { dbManager } from '../database/db.enhanced.js';
import { generateSecureToken } from '../utils/tokenHelper.js';
import QRCode from 'qrcode';
import { randomUUID } from 'crypto';

class WorkerService {
  /**
   * Register a single worker
   */
  async registerWorker({ companyId, estateId, firstName, lastName, phone, email, idNumber, workerType, vehiclePlate, preApproved, preApprovedBy, notes, createdBy }) {
    const status = preApproved ? 'active' : 'pending';
    const result = await dbManager.query(
      `INSERT INTO workers (company_id, estate_id, first_name, last_name, phone, email, id_number, worker_type, status, vehicle_plate, pre_approved, pre_approved_by, pre_approved_at, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, ${preApproved ? 'NOW()' : 'NULL'}, $13, $14)
       RETURNING *`,
      [companyId, estateId, firstName, lastName, phone, email, idNumber, workerType || 'employee', status, vehiclePlate, preApproved || false, preApprovedBy || null, notes, createdBy]
    );
    return result.rows[0];
  }

  /**
   * Bulk register workers
   */
  async bulkRegisterWorkers(companyId, estateId, workers, { preApproved, preApprovedBy, createdBy }) {
    const results = [];
    const errors = [];

    for (let i = 0; i < workers.length; i++) {
      const w = workers[i];
      try {
        const worker = await this.registerWorker({
          companyId,
          estateId,
          firstName: w.firstName || w.first_name,
          lastName: w.lastName || w.last_name,
          phone: w.phone,
          email: w.email,
          idNumber: w.idNumber || w.id_number,
          workerType: w.workerType || w.worker_type || 'employee',
          vehiclePlate: w.vehiclePlate || w.vehicle_plate,
          preApproved,
          preApprovedBy,
          notes: w.notes,
          createdBy
        });
        results.push(worker);
      } catch (err) {
        errors.push({ index: i, name: `${w.firstName || w.first_name} ${w.lastName || w.last_name}`, error: err.message });
      }
    }

    return { registered: results, errors };
  }

  /**
   * Get worker by ID (estate-scoped)
   */
  async getWorkerById(workerId, estateId) {
    const result = await dbManager.query(
      `SELECT w.*, c.name as company_name, c.status as company_status
       FROM workers w
       JOIN companies c ON w.company_id = c.id
       WHERE w.id = $1 AND w.estate_id = $2`,
      [workerId, estateId]
    );
    return result.rows[0] || null;
  }

  /**
   * List workers for a company (estate-scoped)
   */
  async listWorkers(estateId, { companyId, status, workerType, search, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const params = [estateId];
    const conditions = ['w.estate_id = $1'];
    let paramIdx = 2;

    if (companyId) {
      conditions.push(`w.company_id = $${paramIdx}`);
      params.push(companyId);
      paramIdx++;
    }
    if (status) {
      conditions.push(`w.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }
    if (workerType) {
      conditions.push(`w.worker_type = $${paramIdx}`);
      params.push(workerType);
      paramIdx++;
    }
    if (search) {
      conditions.push(`(w.first_name ILIKE $${paramIdx} OR w.last_name ILIKE $${paramIdx} OR w.phone ILIKE $${paramIdx} OR w.id_number ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      dbManager.query(
        `SELECT w.*, c.name as company_name
         FROM workers w
         JOIN companies c ON w.company_id = c.id
         WHERE ${whereClause}
         ORDER BY w.created_at DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        params
      ),
      dbManager.query(
        `SELECT COUNT(*) as total FROM workers w WHERE ${whereClause}`,
        params.slice(0, -2)
      )
    ]);

    return {
      workers: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      limit
    };
  }

  /**
   * Update worker details
   */
  async updateWorker(workerId, estateId, updates) {
    const allowedFields = ['first_name', 'last_name', 'phone', 'email', 'id_number', 'worker_type', 'vehicle_plate', 'notes', 'status'];
    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = $${paramIdx}`);
        values.push(updates[field]);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) return null;

    setClauses.push(`updated_at = NOW()`);
    values.push(workerId, estateId);

    const result = await dbManager.query(
      `UPDATE workers SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND estate_id = $${paramIdx + 1}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Pre-approve a worker (company admin action)
   */
  async preApproveWorker(workerId, estateId, approvedBy) {
    const result = await dbManager.query(
      `UPDATE workers
       SET status = 'active', pre_approved = true, pre_approved_by = $1, pre_approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND estate_id = $3 AND status = 'pending'
       RETURNING *`,
      [approvedBy, workerId, estateId]
    );
    return result.rows[0] || null;
  }

  /**
   * Revoke a worker's access
   */
  async revokeWorker(workerId, estateId) {
    const result = await dbManager.query(
      `UPDATE workers SET status = 'revoked', updated_at = NOW()
       WHERE id = $1 AND estate_id = $2
       RETURNING *`,
      [workerId, estateId]
    );
    // Also revoke all active passes
    if (result.rows[0]) {
      await dbManager.query(
        `UPDATE worker_passes SET status = 'revoked', revoked_at = NOW()
         WHERE worker_id = $1 AND status = 'active'`,
        [workerId]
      );
    }
    return result.rows[0] || null;
  }

  // ============================================================
  // Worker Pass Management
  // ============================================================

  /**
   * Generate a worker pass with QR code
   */
  async generateWorkerPass(workerId, estateId, { passType = 'worker', validUntil, issuedBy } = {}) {
    const worker = await this.getWorkerById(workerId, estateId);
    if (!worker) throw new Error('Worker not found');
    if (worker.status !== 'active') throw new Error('Worker must be active to generate a pass');

    const passCode = `wp_${generateSecureToken(24)}`;
    const qrToken = `wqr_${generateSecureToken(32)}`;

    // Generate QR code image
    const qrPayload = JSON.stringify({ type: 'worker_pass', token: qrToken });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      width: 256,
      margin: 1
    });

    const result = await dbManager.query(
      `INSERT INTO worker_passes (worker_id, pass_type, pass_code, qr_token, qr_data_url, status, valid_from, valid_until, issued_by)
       VALUES ($1, $2, $3, $4, $5, 'active', NOW(), $6, $7)
       RETURNING *`,
      [workerId, passType, passCode, qrToken, qrDataUrl, validUntil || null, issuedBy || null]
    );
    return result.rows[0];
  }

  /**
   * Validate a worker pass by QR token (used by guards)
   */
  async validateWorkerPass(qrToken, estateId) {
    const result = await dbManager.query(
      `SELECT wp.*, w.first_name, w.last_name, w.phone, w.id_number, w.worker_type,
              w.vehicle_plate, w.status as worker_status, w.company_id,
              c.name as company_name, c.status as company_status
       FROM worker_passes wp
       JOIN workers w ON wp.worker_id = w.id
       JOIN companies c ON w.company_id = c.id
       WHERE wp.qr_token = $1 AND w.estate_id = $2`,
      [qrToken, estateId]
    );

    const pass = result.rows[0];
    if (!pass) return { valid: false, reason: 'Pass not found' };
    if (pass.status !== 'active') return { valid: false, reason: 'Pass is not active' };
    if (pass.valid_until && new Date(pass.valid_until) < new Date()) return { valid: false, reason: 'Pass has expired' };
    if (pass.worker_status !== 'active') return { valid: false, reason: 'Worker access is not active' };
    if (pass.company_status !== 'approved') return { valid: false, reason: 'Company is not approved' };

    return { valid: true, pass, canCheckIn: true };
  }

  /**
   * Revoke a worker pass
   */
  async revokePass(passId, revokedBy) {
    const result = await dbManager.query(
      `UPDATE worker_passes SET status = 'revoked', revoked_by = $1, revoked_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND status = 'active'
       RETURNING *`,
      [revokedBy, passId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get active passes for a worker
   */
  async getWorkerPasses(workerId) {
    const result = await dbManager.query(
      `SELECT * FROM worker_passes WHERE worker_id = $1 ORDER BY created_at DESC`,
      [workerId]
    );
    return result.rows;
  }

  // ============================================================
  // Worker Check-in / Check-out
  // ============================================================

  /**
   * Check in a worker (guard action)
   */
  async checkInWorker(workerId, estateId, { guardId, passId, vehiclePlate, notes } = {}) {
    // Check for existing active check-in
    const existing = await dbManager.query(
      `SELECT id FROM worker_check_ins
       WHERE worker_id = $1 AND estate_id = $2 AND check_out_time IS NULL`,
      [workerId, estateId]
    );
    if (existing.rows.length > 0) {
      throw new Error('Worker is already checked in');
    }

    const result = await dbManager.query(
      `INSERT INTO worker_check_ins (worker_id, estate_id, worker_pass_id, check_in_guard_id, vehicle_plate, check_in_notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [workerId, estateId, passId || null, guardId, vehiclePlate || null, notes || null]
    );
    return result.rows[0];
  }

  /**
   * Check out a worker (guard action)
   */
  async checkOutWorker(checkInId, estateId, { guardId, notes } = {}) {
    const result = await dbManager.query(
      `UPDATE worker_check_ins
       SET check_out_time = NOW(), check_out_guard_id = $1, check_out_notes = $2
       WHERE id = $3 AND estate_id = $4 AND check_out_time IS NULL
       RETURNING *`,
      [guardId, notes || null, checkInId, estateId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get active (checked-in, not checked-out) workers for an estate
   */
  async getActiveWorkers(estateId) {
    const result = await dbManager.query(
      `SELECT wci.*, w.first_name, w.last_name, w.phone, w.worker_type, w.vehicle_plate as registered_plate,
              c.name as company_name
       FROM worker_check_ins wci
       JOIN workers w ON wci.worker_id = w.id
       JOIN companies c ON w.company_id = c.id
       WHERE wci.estate_id = $1 AND wci.check_out_time IS NULL
       ORDER BY wci.check_in_time DESC`,
      [estateId]
    );
    return result.rows;
  }

  /**
   * Get worker check-in history
   */
  async getCheckInHistory(estateId, { companyId, workerId, from, to, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const params = [estateId];
    const conditions = ['wci.estate_id = $1'];
    let paramIdx = 2;

    if (companyId) {
      conditions.push(`w.company_id = $${paramIdx}`);
      params.push(companyId);
      paramIdx++;
    }
    if (workerId) {
      conditions.push(`wci.worker_id = $${paramIdx}`);
      params.push(workerId);
      paramIdx++;
    }
    if (from) {
      conditions.push(`wci.check_in_time >= $${paramIdx}`);
      params.push(from);
      paramIdx++;
    }
    if (to) {
      conditions.push(`wci.check_in_time <= $${paramIdx}`);
      params.push(to);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');
    params.push(limit, offset);

    const result = await dbManager.query(
      `SELECT wci.*, w.first_name, w.last_name, w.phone, w.worker_type,
              c.name as company_name
       FROM worker_check_ins wci
       JOIN workers w ON wci.worker_id = w.id
       JOIN companies c ON w.company_id = c.id
       WHERE ${whereClause}
       ORDER BY wci.check_in_time DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    return { checkIns: result.rows, page, limit };
  }
}

export default new WorkerService();
