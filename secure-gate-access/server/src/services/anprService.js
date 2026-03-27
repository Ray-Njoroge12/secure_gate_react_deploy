/**
 * ANPR (Automatic Number Plate Recognition) Service
 * P7: Integration with automated barriers and plate recognition systems
 * 
 * Feature-flagged: Set ENABLE_ANPR_INTEGRATION=true to activate
 */

import { pool } from '../database/connection.js';
import * as crypto from 'crypto';
import logger from '../config/logger.js';

const ANPR_ENABLED = process.env.ENABLE_ANPR_INTEGRATION === 'true';
const ANPR_API_KEY = process.env.ANPR_API_KEY;
const ANPR_WEBHOOK_SECRET = process.env.ANPR_WEBHOOK_SECRET;

/**
 * Check if ANPR integration is enabled
 */
export function isEnabled() {
  return ANPR_ENABLED;
}

/**
 * Validate webhook signature from ANPR system
 */
export function validateWebhookSignature(payload, signature) {
  if (!ANPR_WEBHOOK_SECRET) return false;

  const expectedSignature = crypto
    .createHmac('sha256', ANPR_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Lookup vehicle plate across all access sources
 * Returns authorization status and visitor/pass info
 */
export async function lookupPlate(plate) {
  if (!ANPR_ENABLED) {
    return { authorized: false, reason: 'ANPR integration disabled' };
  }

  const normalizedPlate = plate.toUpperCase().replace(/\s/g, '');

  try {
    // Check 1: Active visitor invites with matching plate
    const visitorResult = await pool.query(
      `SELECT v.id, v.name, v.status, v.date_of_visit, v.time_of_visit,
              u.username as resident_name, u.house as resident_unit
       FROM visitors v
       JOIN users u ON v.resident_id = u.id
       WHERE UPPER(REPLACE(v.vehicle_plate, ' ', '')) = $1
         AND v.status IN ('pending', 'approved', 'checked_in')
         AND v.date_of_visit >= CURRENT_DATE
       ORDER BY v.date_of_visit ASC, v.time_of_visit ASC
       LIMIT 1`,
      [normalizedPlate]
    );

    if (visitorResult.rows.length > 0) {
      const visitor = visitorResult.rows[0];
      return {
        authorized: true,
        type: 'visitor',
        data: {
          visitorName: visitor.name,
          residentName: visitor.resident_name,
          residentUnit: visitor.resident_unit,
          visitDate: visitor.date_of_visit,
          visitTime: visitor.time_of_visit,
          status: visitor.status
        }
      };
    }

    // Check 2: Active recurring passes with matching plate
    const recurringResult = await pool.query(
      `SELECT rp.id, rp.visitor_name, rp.pass_type, rp.valid_until,
              rp.allowed_days, rp.allowed_time_start, rp.allowed_time_end,
              u.username as resident_name, u.house as resident_unit
       FROM recurring_passes rp
       JOIN users u ON rp.resident_id = u.id
       WHERE UPPER(REPLACE(rp.vehicle_plate, ' ', '')) = $1
         AND rp.status = 'active'
         AND rp.valid_until >= CURRENT_DATE
       LIMIT 1`,
      [normalizedPlate]
    );

    if (recurringResult.rows.length > 0) {
      const pass = recurringResult.rows[0];

      // Check day and time constraints
      const now = new Date();
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const currentDay = dayNames[now.getDay()];
      const currentTime = now.toTimeString().slice(0, 5);

      if (!pass.allowed_days.includes(currentDay)) {
        return {
          authorized: false,
          type: 'recurring_pass',
          reason: `Pass not valid on ${currentDay}`,
          data: { visitorName: pass.visitor_name }
        };
      }

      if (currentTime < pass.allowed_time_start || currentTime > pass.allowed_time_end) {
        return {
          authorized: false,
          type: 'recurring_pass',
          reason: 'Outside allowed hours',
          data: { visitorName: pass.visitor_name }
        };
      }

      return {
        authorized: true,
        type: 'recurring_pass',
        data: {
          visitorName: pass.visitor_name,
          passType: pass.pass_type,
          residentName: pass.resident_name,
          residentUnit: pass.resident_unit,
          validUntil: pass.valid_until
        }
      };
    }

    // Check 3: Active rideshare entries with matching plate
    const rideshareResult = await pool.query(
      `SELECT re.id, re.driver_name, re.service_provider, re.expires_at,
              u.username as resident_name, u.house as resident_unit
       FROM rideshare_entries re
       JOIN users u ON re.resident_id = u.id
       WHERE UPPER(REPLACE(re.vehicle_plate, ' ', '')) = $1
         AND re.status = 'pending'
         AND re.expires_at > NOW()
       LIMIT 1`,
      [normalizedPlate]
    );

    if (rideshareResult.rows.length > 0) {
      const entry = rideshareResult.rows[0];
      return {
        authorized: true,
        type: 'rideshare',
        data: {
          driverName: entry.driver_name,
          serviceProvider: entry.service_provider,
          residentName: entry.resident_name,
          residentUnit: entry.resident_unit,
          expiresAt: entry.expires_at
        }
      };
    }

    // No matching authorization found
    return {
      authorized: false,
      reason: 'No matching authorization found for this plate'
    };

  } catch (error) {
    logger.error('ANPR plate lookup error:', error);
    return {
      authorized: false,
      reason: 'Lookup failed',
      error: error.message
    };
  }
}

/**
 * Log ANPR event for audit trail
 */
export async function logAnprEvent(eventType, plate, result, metadata = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        `anpr_${eventType}`,
        'vehicle_plate',
        plate,
        JSON.stringify({ ...result, ...metadata })
      ]
    );
  } catch (error) {
    logger.error('Failed to log ANPR event:', error);
  }
}

// Handle barrier open request (called after successful plate lookup)
export async function requestBarrierOpen(barrierConfig) {
  if (!ANPR_ENABLED) {
    return { success: false, reason: 'ANPR integration disabled' };
  }

  const barrierUrl = process.env.BARRIER_API_URL;
  const allowSimulation = process.env.ANPR_SIMULATION === 'true'
    || process.env.NODE_ENV !== 'production';
  const timeoutMs = Number.parseInt(process.env.BARRIER_API_TIMEOUT_MS || '5000', 10);

  // Real hardware integration
  if (barrierUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(barrierUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BARRIER_API_KEY || ''}`
        },
        body: JSON.stringify({
          action: 'open',
          barrier_id: barrierConfig.barrier_id || 'main_gate',
          reason: barrierConfig.authorization ? 'authorized_entry' : 'manual_override',
          metadata: barrierConfig
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Barrier API responded with ${response.status}`);
      }

      const result = await response.json();
      logger.info('[ANPR] Barrier open signal sent successfully:', result);

      return {
        success: true,
        message: 'Barrier open signal sent',
        timestamp: new Date().toISOString(),
        externalId: result.id
      };
    } catch (error) {
      logger.error('[ANPR] Failed to communicate with Barrier API:', error);
      return {
        success: false,
        error: 'Hardware communication failed',
        details: error.message
      };
    }
  }

  if (!allowSimulation) {
    return {
      success: false,
      error: 'Barrier API not configured',
      details: 'Set BARRIER_API_URL or enable ANPR_SIMULATION for non-production environments.'
    };
  }

  // Fallback / Simulation Log
  logger.debug('[ANPR] Barrier open requested (Simulation):', barrierConfig);

  return {
    success: true,
    message: 'Barrier open signal sent (Simulation)',
    timestamp: new Date().toISOString()
  };
}

export default {
  isEnabled,
  validateWebhookSignature,
  lookupPlate,
  logAnprEvent,
  requestBarrierOpen
};
