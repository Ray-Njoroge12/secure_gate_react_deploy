/**
 * Audit Log Factory for Integration Testing
 * Generates test audit log entries
 */

import { dbManager } from '../../src/database/db.enhanced.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Audit Log Factory - Creates audit log entries for testing
 */
export const auditLogFactory = {
  /**
   * Build audit log data without persisting
   */
  build: (overrides = {}) => {
    return {
      action: overrides.action || 'test.action',
      resource: overrides.resource || 'test_resource',
      user_id: overrides.user_id || null,
      user_role: overrides.user_role || 'resident',
      request_id: overrides.request_id || uuidv4(),
      ip_address: overrides.ip_address || '127.0.0.1',
      user_agent: overrides.user_agent || 'Test-Agent/1.0',
      details: overrides.details || { outcome: 'success' },
      timestamp: overrides.timestamp || new Date().toISOString(),
      ...overrides
    };
  },

  /**
   * Create and persist audit log to database
   */
  create: async (overrides = {}) => {
    const logData = auditLogFactory.build(overrides);

    const result = await dbManager.query(
      `INSERT INTO audit_logs (action, resource, user_id, user_role, request_id, ip_address, user_agent, details, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        logData.action,
        logData.resource,
        logData.user_id,
        logData.user_role,
        logData.request_id,
        logData.ip_address,
        logData.user_agent,
        JSON.stringify(logData.details),
        logData.timestamp
      ]
    );

    return result.rows[0];
  },

  /**
   * Create auth event log
   */
  createAuthEvent: async (userId, action = 'user.login', overrides = {}) => {
    return auditLogFactory.create({
      action,
      resource: 'auth',
      user_id: userId,
      details: { outcome: 'success', method: 'password' },
      ...overrides
    });
  },

  /**
   * Create visitor event log
   */
  createVisitorEvent: async (userId, visitorId, action = 'visitor.create', overrides = {}) => {
    return auditLogFactory.create({
      action,
      resource: 'visitor',
      user_id: userId,
      details: { visitor_id: visitorId, outcome: 'success' },
      ...overrides
    });
  },

  /**
   * Create security event log
   */
  createSecurityEvent: async (action = 'security.alert', overrides = {}) => {
    return auditLogFactory.create({
      action,
      resource: 'security',
      details: { severity: 'high', type: 'unauthorized_access' },
      ...overrides
    });
  },

  /**
   * Create DPA compliance event log
   */
  createDPAEvent: async (userId, action = 'dpa.data_export', overrides = {}) => {
    return auditLogFactory.create({
      action,
      resource: 'dpa_compliance',
      user_id: userId,
      details: { compliance_type: 'kenya_dpa_2019', outcome: 'success' },
      ...overrides
    });
  },

  /**
   * Create multiple audit logs
   */
  createMany: async (count, overrides = {}) => {
    const logs = [];
    for (let i = 0; i < count; i++) {
      const log = await auditLogFactory.create({
        ...overrides,
        request_id: uuidv4()
      });
      logs.push(log);
    }
    return logs;
  },

  /**
   * Create audit logs for various actions
   */
  createVariedLogs: async (userId, count = 10) => {
    const actions = [
      'user.login', 'user.logout', 'visitor.create', 'visitor.checkin',
      'visitor.checkout', 'pass.create', 'delivery.register', 'admin.view_logs',
      'security.mfa_enable', 'dpa.data_export'
    ];
    
    const logs = [];
    for (let i = 0; i < count; i++) {
      const log = await auditLogFactory.create({
        user_id: userId,
        action: actions[i % actions.length]
      });
      logs.push(log);
    }
    return logs;
  },

  /**
   * Delete audit log by ID
   */
  delete: async (logId) => {
    await dbManager.query('DELETE FROM audit_logs WHERE id = $1', [logId]);
  },

  /**
   * Clean up test audit logs
   */
  cleanup: async () => {
    await dbManager.query("DELETE FROM audit_logs WHERE action LIKE 'test.%'");
  }
};

export default auditLogFactory;
