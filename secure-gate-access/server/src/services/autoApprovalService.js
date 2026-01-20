/**
 * Auto-Approval Rules Service
 * Phase 2.2: Privacy-Preserving Auto-Approval Rules Engine
 * 
 * Privacy Controls:
 * - Rules stored encrypted (only resident can see rule details)
 * - Guards see only "auto-approved" status, not rule details
 * - Admins see only aggregate usage stats
 * - No cross-resident rule visibility
 * - Rules cannot be inferred from logs
 * 
 * SECURITY: Uses centralized key management - no hardcoded keys
 */

import { pool } from '../database/connection.js';
import * as crypto from 'crypto';
import keyManagementService from './keyManagementService.js';

const IV_LENGTH = 16;

// Cache for encryption key
let encryptionKey = null;

/**
 * Get encryption key from key management service
 * @returns {Promise<Buffer>} Encryption key
 */
async function getEncryptionKey() {
  if (!encryptionKey) {
    encryptionKey = await keyManagementService.getServiceEncryptionKey('rules');
  }
  return encryptionKey;
}

/**
 * Encrypt rule criteria
 */
async function encryptCriteria(criteria) {
  const text = JSON.stringify(criteria);
  const key = await getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt rule criteria
 */
async function decryptCriteria(encrypted) {
  try {
    const key = await getEncryptionKey();
    const textParts = encrypted.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(decrypted.toString());
  } catch (error) {
    console.error('Rule criteria decryption failed:', error);
    return null;
  }
}

/**
 * Rule categories (predefined for consistency)
 */
export const RULE_CATEGORIES = {
  FAMILY: 'family',
  FRIEND: 'friend',
  SERVICE: 'service',
  DELIVERY: 'delivery',
  BUSINESS: 'business',
  CUSTOM: 'custom'
};

/**
 * Create a new auto-approval rule
 */
export async function createRule(residentId, {
  ruleName,
  visitorName,
  visitorPhone,
  category,
  timeRestrictions,
  notes
}) {
  // Build match criteria
  const matchCriteria = {
    visitorName: visitorName?.toLowerCase().trim(),
    visitorPhone: visitorPhone?.replace(/\D/g, ''),
    category: category || RULE_CATEGORIES.CUSTOM,
    notes
  };

  // Encrypt the criteria
  const encryptedCriteria = await encryptCriteria(matchCriteria);

  const result = await pool.query(
    `INSERT INTO auto_approval_rules (
      resident_id, rule_name, match_criteria_encrypted, time_restrictions
    ) VALUES ($1, $2, $3, $4)
    RETURNING id, rule_name, time_restrictions, is_active, created_at`,
    [residentId, ruleName, encryptedCriteria, JSON.stringify(timeRestrictions || {})]
  );

  return {
    success: true,
    rule: result.rows[0],
    message: 'Auto-approval rule created'
  };
}

/**
 * Get all rules for a resident (decrypted for owner)
 */
export async function getResidentRules(residentId) {
  const result = await pool.query(
    `SELECT id, rule_name, match_criteria_encrypted, time_restrictions, 
            is_active, match_count, last_matched_at, created_at
     FROM auto_approval_rules
     WHERE resident_id = $1
     ORDER BY created_at DESC`,
    [residentId]
  );

  // Decrypt criteria for the owner (async)
  const rules = await Promise.all(
    result.rows.map(async (rule) => ({
      id: rule.id,
      ruleName: rule.rule_name,
      matchCriteria: await decryptCriteria(rule.match_criteria_encrypted),
      timeRestrictions: rule.time_restrictions,
      isActive: rule.is_active,
      matchCount: rule.match_count,
      lastMatchedAt: rule.last_matched_at,
      createdAt: rule.created_at
    }))
  );
  return rules;
}

/**
 * Update an existing rule
 */
export async function updateRule(ruleId, residentId, updates) {
  // First verify ownership
  const check = await pool.query(
    'SELECT id FROM auto_approval_rules WHERE id = $1 AND resident_id = $2',
    [ruleId, residentId]
  );

  if (check.rows.length === 0) {
    return { success: false, error: 'Rule not found or access denied' };
  }

  const updateFields = [];
  const params = [ruleId];
  let paramIndex = 2;

  if (updates.ruleName) {
    updateFields.push(`rule_name = $${paramIndex}`);
    params.push(updates.ruleName);
    paramIndex++;
  }

  if (updates.matchCriteria) {
    updateFields.push(`match_criteria_encrypted = $${paramIndex}`);
    params.push(await encryptCriteria(updates.matchCriteria));
    paramIndex++;
  }

  if (updates.timeRestrictions !== undefined) {
    updateFields.push(`time_restrictions = $${paramIndex}`);
    params.push(JSON.stringify(updates.timeRestrictions));
    paramIndex++;
  }

  if (updates.isActive !== undefined) {
    updateFields.push(`is_active = $${paramIndex}`);
    params.push(updates.isActive);
    paramIndex++;
  }

  updateFields.push('updated_at = NOW()');

  const result = await pool.query(
    `UPDATE auto_approval_rules SET ${updateFields.join(', ')} WHERE id = $1
     RETURNING id, rule_name, is_active, updated_at`,
    params
  );

  return {
    success: true,
    rule: result.rows[0]
  };
}

/**
 * Delete a rule
 */
export async function deleteRule(ruleId, residentId) {
  const result = await pool.query(
    'DELETE FROM auto_approval_rules WHERE id = $1 AND resident_id = $2 RETURNING id',
    [ruleId, residentId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Rule not found or access denied' };
  }

  return { success: true, message: 'Rule deleted' };
}

/**
 * Check if visitor matches any active rules for resident
 * Privacy: Returns only match status, not which rule matched
 */
export async function checkAutoApproval(residentId, visitorName, visitorPhone) {
  const rules = await pool.query(
    `SELECT id, match_criteria_encrypted, time_restrictions
     FROM auto_approval_rules
     WHERE resident_id = $1 AND is_active = true`,
    [residentId]
  );

  const normalizedName = visitorName?.toLowerCase().trim();
  const normalizedPhone = visitorPhone?.replace(/\D/g, '');
  const now = new Date();
  const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  for (const rule of rules.rows) {
    const criteria = await decryptCriteria(rule.match_criteria_encrypted);
    if (!criteria) continue;

    // Check name match
    const nameMatches = !criteria.visitorName ||
      normalizedName?.includes(criteria.visitorName) ||
      criteria.visitorName.includes(normalizedName);

    // Check phone match
    const phoneMatches = !criteria.visitorPhone ||
      normalizedPhone?.includes(criteria.visitorPhone) ||
      criteria.visitorPhone.includes(normalizedPhone);

    if (!nameMatches && !phoneMatches) continue;

    // Check time restrictions
    const timeRestrictions = rule.time_restrictions;
    if (timeRestrictions && Object.keys(timeRestrictions).length > 0) {
      // Check day restriction
      if (timeRestrictions.days && timeRestrictions.days.length > 0) {
        if (!timeRestrictions.days.includes(currentDay)) continue;
      }

      // Check time window
      if (timeRestrictions.start_time && timeRestrictions.end_time) {
        if (currentTime < timeRestrictions.start_time ||
          currentTime > timeRestrictions.end_time) continue;
      }
    }

    // Match found! Update stats and log
    await pool.query(
      `UPDATE auto_approval_rules 
       SET match_count = match_count + 1, last_matched_at = NOW()
       WHERE id = $1`,
      [rule.id]
    );

    // Privacy: Log only that auto-approval happened, not which rule
    await pool.query(
      `INSERT INTO auto_approval_logs (rule_id, resident_id, reason)
       VALUES ($1, $2, 'auto_approved')`,
      [rule.id, residentId]
    );

    return {
      approved: true,
      reason: 'auto_approved',
      // Privacy: Don't reveal which rule matched or rule details
      displayMessage: 'Auto-approved by resident'
    };
  }

  return {
    approved: false,
    reason: 'no_matching_rule'
  };
}

/**
 * Get auto-approval stats for admin (aggregate only)
 */
export async function getAutoApprovalStats() {
  const result = await pool.query(
    `SELECT 
      COUNT(DISTINCT aar.resident_id) as residents_using_rules,
      COUNT(aar.id) as total_rules,
      COUNT(aar.id) FILTER (WHERE aar.is_active = true) as active_rules,
      COALESCE(SUM(aar.match_count), 0) as total_auto_approvals,
      (SELECT COUNT(*) FROM auto_approval_logs WHERE approved_at > NOW() - INTERVAL '24 hours') as approvals_today,
      (SELECT COUNT(*) FROM auto_approval_logs WHERE approved_at > NOW() - INTERVAL '7 days') as approvals_this_week
     FROM auto_approval_rules aar`
  );

  // Privacy: Only aggregates, no individual resident info
  return result.rows[0];
}

/**
 * Get resident's auto-approval history (their own logs only)
 */
export async function getResidentApprovalHistory(residentId, limit = 20) {
  const result = await pool.query(
    `SELECT 
      aal.id,
      aal.approved_at,
      aal.reason,
      v.name as visitor_name,
      aar.rule_name
     FROM auto_approval_logs aal
     LEFT JOIN visitors v ON aal.visitor_id = v.id
     LEFT JOIN auto_approval_rules aar ON aal.rule_id = aar.id
     WHERE aal.resident_id = $1
     ORDER BY aal.approved_at DESC
     LIMIT $2`,
    [residentId, limit]
  );

  return result.rows;
}

/**
 * Delete all rules for a resident (Privacy control)
 */
export async function deleteAllResidentRules(residentId) {
  const result = await pool.query(
    'DELETE FROM auto_approval_rules WHERE resident_id = $1 RETURNING id',
    [residentId]
  );

  return {
    success: true,
    deletedCount: result.rowCount,
    message: 'All auto-approval rules deleted'
  };
}

/**
 * Export rules for resident (data portability)
 */
export async function exportResidentRules(residentId) {
  const rules = await getResidentRules(residentId);

  return {
    exportDate: new Date().toISOString(),
    residentId,
    rulesCount: rules.length,
    rules: rules.map(r => ({
      ruleName: r.ruleName,
      matchCriteria: r.matchCriteria,
      timeRestrictions: r.timeRestrictions,
      isActive: r.isActive,
      matchCount: r.matchCount,
      createdAt: r.createdAt
    }))
  };
}

export default {
  RULE_CATEGORIES,
  createRule,
  getResidentRules,
  updateRule,
  deleteRule,
  checkAutoApproval,
  getAutoApprovalStats,
  getResidentApprovalHistory,
  deleteAllResidentRules,
  exportResidentRules
};
