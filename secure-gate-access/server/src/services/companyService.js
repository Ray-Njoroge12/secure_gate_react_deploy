/**
 * Company Service
 * Business logic for company registration, approval, and management
 */

import { dbManager } from '../database/db.enhanced.js';

class CompanyService {
  /**
   * Register a new company within an estate
   */
  async registerCompany({ name, registrationNumber, estateId, contactName, contactEmail, contactPhone, address, description }) {
    const result = await dbManager.query(
      `INSERT INTO companies (name, registration_number, estate_id, contact_name, contact_email, contact_phone, address, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [name, registrationNumber, estateId, contactName, contactEmail, contactPhone, address, description]
    );
    return result.rows[0];
  }

  /**
   * Link a user as company admin
   */
  /**
   * Link a user as company admin.
   * Only sets company_id on the user — role is NOT changed until the company is approved.
   */
  async setCompanyAdmin(companyId, userId) {
    await dbManager.query(
      `UPDATE companies SET admin_user_id = $1, updated_at = NOW() WHERE id = $2`,
      [userId, companyId]
    );
    await dbManager.query(
      `UPDATE users SET company_id = $1, updated_at = NOW() WHERE id = $2`,
      [companyId, userId]
    );
  }

  /**
   * Promote the company admin user to 'company_admin' role.
   * Called when a company is approved.
   */
  async promoteCompanyAdmin(companyId) {
    await dbManager.query(
      `UPDATE users SET role = 'company_admin', updated_at = NOW()
       WHERE company_id = $1 AND id = (SELECT admin_user_id FROM companies WHERE id = $1)`,
      [companyId]
    );
  }

  /**
   * Get company by ID (estate-scoped)
   */
  async getCompanyById(companyId, estateId) {
    const result = await dbManager.query(
      `SELECT c.*, u.email as admin_email, u.first_name as admin_first_name, u.last_name as admin_last_name
       FROM companies c
       LEFT JOIN users u ON c.admin_user_id = u.id
       WHERE c.id = $1 AND c.estate_id = $2`,
      [companyId, estateId]
    );
    return result.rows[0] || null;
  }

  /**
   * List companies for an estate with optional status filter
   */
  async listCompanies(estateId, { status, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    // Build WHERE clause with consistent parameter indexing
    const countParams = [estateId];
    let countWhere = 'WHERE c.estate_id = $1';
    if (status) {
      countWhere += ' AND c.status = $2';
      countParams.push(status);
    }

    // Data query adds LIMIT and OFFSET after the count params
    const dataParams = [...countParams, limit, offset];
    const limitIdx = countParams.length + 1;
    const offsetIdx = countParams.length + 2;

    const [dataResult, countResult] = await Promise.all([
      dbManager.query(
        `SELECT c.*, u.email as admin_email, u.first_name as admin_first_name, u.last_name as admin_last_name
         FROM companies c
         LEFT JOIN users u ON c.admin_user_id = u.id
         ${countWhere}
         ORDER BY c.created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        dataParams
      ),
      dbManager.query(
        `SELECT COUNT(*) as total FROM companies c ${countWhere}`,
        countParams
      )
    ]);

    return {
      companies: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      limit
    };
  }

  /**
   * Admin approves a company
   */
  async approveCompany(companyId, estateId, approvedBy) {
    const result = await dbManager.query(
      `UPDATE companies
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND estate_id = $3 AND status = 'pending'
       RETURNING *`,
      [approvedBy, companyId, estateId]
    );
    const company = result.rows[0];
    // Promote the company admin user to company_admin role
    if (company) {
      await this.promoteCompanyAdmin(companyId);
    }
    return company || null;
  }

  /**
   * Admin rejects a company
   */
  async rejectCompany(companyId, estateId, rejectedReason) {
    const result = await dbManager.query(
      `UPDATE companies
       SET status = 'rejected', rejected_reason = $1, updated_at = NOW()
       WHERE id = $2 AND estate_id = $3 AND status = 'pending'
       RETURNING *`,
      [rejectedReason, companyId, estateId]
    );
    return result.rows[0] || null;
  }

  /**
   * Suspend a company
   */
  async suspendCompany(companyId, estateId) {
    const result = await dbManager.query(
      `UPDATE companies
       SET status = 'suspended', updated_at = NOW()
       WHERE id = $1 AND estate_id = $2 AND status = 'approved'
       RETURNING *`,
      [companyId, estateId]
    );
    return result.rows[0] || null;
  }

  /**
   * Update company details (by company admin)
   */
  async updateCompany(companyId, estateId, updates) {
    const allowedFields = ['name', 'registration_number', 'contact_name', 'contact_email', 'contact_phone', 'address', 'description'];
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
    values.push(companyId, estateId);

    const result = await dbManager.query(
      `UPDATE companies SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND estate_id = $${paramIdx + 1}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Add a company location
   */
  async addLocation(companyId, { name, address, isPrimary }) {
    if (isPrimary) {
      // Use a CTE to atomically unset existing primary and insert new one
      const result = await dbManager.query(
        `WITH unset AS (
           UPDATE company_locations SET is_primary = false WHERE company_id = $1 AND is_primary = true
         )
         INSERT INTO company_locations (company_id, name, address, is_primary)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [companyId, name, address, true]
      );
      return result.rows[0];
    }
    const result = await dbManager.query(
      `INSERT INTO company_locations (company_id, name, address, is_primary)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [companyId, name, address, false]
    );
    return result.rows[0];
  }

  /**
   * List company locations
   */
  async getLocations(companyId) {
    const result = await dbManager.query(
      `SELECT * FROM company_locations WHERE company_id = $1 ORDER BY is_primary DESC, name ASC`,
      [companyId]
    );
    return result.rows;
  }

  /**
   * Delete a company location
   */
  async deleteLocation(locationId, companyId) {
    const result = await dbManager.query(
      `DELETE FROM company_locations WHERE id = $1 AND company_id = $2 RETURNING *`,
      [locationId, companyId]
    );
    return result.rows[0] || null;
  }
}

export default new CompanyService();
