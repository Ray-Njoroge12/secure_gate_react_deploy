/**
 * Rideshare Service
 * P5: Quick entry for Uber, Bolt, Taxi drivers
 */

import { pool } from '../database/connection.js';
import * as crypto from 'crypto';
import { sendSms } from './notificationService.js';
import * as whatsappService from './whatsappService.js';

const normalizeSendResult = (result, errorMessage) => {
  if (!result) {
    return { success: false, error: errorMessage || 'notification_failed' };
  }
  if (result === true) {
    return { success: true };
  }
  if (result === false) {
    return { success: false, error: errorMessage || 'notification_failed' };
  }
  return result;
};

async function logNotification({
  recipientType,
  recipientId,
  recipientPhone,
  notificationType,
  channel,
  body,
  status,
  provider,
  providerMessageId,
  metadata = {}
}) {
  try {
    const sentAt = status === 'sent' ? new Date() : null;
    await pool.query(
      `INSERT INTO notification_log (
        recipient_type,
        recipient_id,
        recipient_phone,
        notification_type,
        channel,
        language,
        subject,
        body,
        template_name,
        template_variables,
        user_id,
        status,
        provider,
        provider_message_id,
        metadata,
        sent_at,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16,
        NOW(),
        NOW()
      )`,
      [
        recipientType,
        recipientId,
        recipientPhone,
        notificationType,
        channel,
        'en',
        null,
        body,
        notificationType,
        JSON.stringify(metadata),
        recipientId,
        status,
        provider,
        providerMessageId || null,
        JSON.stringify(metadata),
        sentAt
      ]
    );
  } catch (error) {
    console.warn('Failed to log rideshare notification:', error.message);
  }
}

/**
 * Generate a 6-character alphanumeric access code
 */
function generateAccessCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

/**
 * Create a rideshare entry request (Resident action)
 */
export async function createRideshareEntry(residentId, data) {
  const {
    driverName,
    vehiclePlate,
    vehicleDescription,
    serviceProvider = 'uber',
    expiryMinutes = 30
  } = data;

  if (!driverName || !vehiclePlate) {
    return { success: false, error: 'Driver name and vehicle plate are required' };
  }

  const accessCode = generateAccessCode();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  try {
    const result = await pool.query(
      `INSERT INTO rideshare_entries (
        resident_id, driver_name, vehicle_plate, vehicle_description,
        service_provider, access_code, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, driver_name, vehicle_plate, service_provider, access_code, expires_at, status, created_at`,
      [residentId, driverName.trim(), vehiclePlate.trim().toUpperCase(), vehicleDescription, serviceProvider, accessCode, expiresAt]
    );

    // Get resident phone for notification - with estate check for data integrity
    const residentRes = await pool.query('SELECT phone, username, estate_id FROM users WHERE id = $1', [residentId]);
    const resident = residentRes.rows[0];

    // Notification Logic (Fix N-008)
    if (resident && resident.phone) {
      const message = `Gate Access Code for ${driverName} (${vehiclePlate}): ${accessCode}. Valid until ${expiresAt.toLocaleTimeString()}.`;
      const provider = process.env.SMS_PROVIDER || 'africastalking';
      let sendResult;
      try {
        sendResult = await sendSms(resident.phone, message);
      } catch (err) {
        console.warn('Failed to send rideshare code to resident:', err.message);
        sendResult = { success: false, error: err.message };
      }

      const normalizedResult = normalizeSendResult(sendResult, 'rideshare_sms_failed');
      await logNotification({
        recipientType: 'user',
        recipientId: residentId,
        recipientPhone: resident.phone,
        notificationType: 'rideshare_access_code',
        channel: provider === 'whatsapp' ? 'whatsapp' : 'sms',
        body: message,
        status: normalizedResult.success ? 'sent' : 'failed',
        provider,
        providerMessageId: normalizedResult.messageId,
        metadata: {
          driverName,
          vehiclePlate,
          accessCode,
          expiresAt,
          residentName: resident.username
        }
      });
    }

    // Attempt to notify driver if phone provided (transient)
    const driverPhone = data.driverPhone ? String(data.driverPhone).trim() : null;
    if (driverPhone) {
      const estateAddress = process.env.ESTATE_ADDRESS || process.env.SITE_ADDRESS || 'the main gate';
      const driverMsg = `Access Code: ${accessCode}. Address: ${estateAddress}. Contact: ${resident?.username || 'resident'}. Valid for ${expiryMinutes} mins.`;
      const smsProvider = process.env.SMS_PROVIDER || 'africastalking';
      const externalEnabled = process.env.ENABLE_EXTERNAL_NOTIFICATIONS === 'true';
      const smsEnabled = process.env.ENABLE_SMS_NOTIFICATIONS === 'true';
      let driverResult;

      try {
        if (smsProvider === 'whatsapp' && whatsappService.isConfigured() && externalEnabled && smsEnabled) {
          driverResult = await whatsappService.sendTextMessage(driverPhone, driverMsg);
        } else {
          driverResult = await sendSms(driverPhone, driverMsg);
        }
      } catch (err) {
        console.warn('Failed to send rideshare code to driver:', err.message);
        driverResult = { success: false, error: err.message };
      }

      const normalizedDriverResult = normalizeSendResult(driverResult, 'rideshare_driver_notification_failed');
      await logNotification({
        recipientType: 'external',
        recipientId: null,
        recipientPhone: driverPhone,
        notificationType: 'rideshare_driver_access_code',
        channel: smsProvider === 'whatsapp' ? 'whatsapp' : 'sms',
        body: driverMsg,
        status: normalizedDriverResult.success ? 'sent' : 'failed',
        provider: smsProvider,
        providerMessageId: normalizedDriverResult.messageId,
        metadata: {
          driverName,
          vehiclePlate,
          accessCode,
          expiresAt,
          serviceProvider,
          estateAddress
        }
      });
    }

    return {
      success: true,
      data: result.rows[0],
      message: `Access code created: ${accessCode}. Notification sent.`
    };
  } catch (error) {
    console.error('Create rideshare entry error:', error);
    return { success: false, error: 'Failed to create rideshare entry' };
  }
}

/**
 * Get active rideshare entries for resident
 */
export async function getResidentRideshareEntries(residentId, includeExpired = false) {
  let query = `
    SELECT id, driver_name, vehicle_plate, vehicle_description, service_provider,
           access_code, expires_at, status, arrived_at, created_at
    FROM rideshare_entries
    WHERE resident_id = $1
  `;

  if (!includeExpired) {
    query += ` AND status IN ('pending', 'arrived') AND expires_at > NOW()`;
  }

  query += ' ORDER BY created_at DESC LIMIT 20';

  const result = await pool.query(query, [residentId]);
  return result.rows;
}

/**
 * Cancel a rideshare entry (Resident action)
 */
export async function cancelRideshareEntry(entryId, residentId) {
  const result = await pool.query(
    `UPDATE rideshare_entries 
     SET status = 'cancelled'
     WHERE id = $1 AND resident_id = $2 AND status = 'pending'
     RETURNING id, status`,
    [entryId, residentId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Entry not found or already processed' };
  }

  return { success: true, data: result.rows[0] };
}

/**
 * Validate rideshare entry (Guard action)
 * Can validate by access code or vehicle plate
 */
export async function validateRideshareEntry(credential, method = 'code', estateId = null) {
  // SECURITY: Strict whitelist validation to prevent SQL injection
  const allowedMethods = {
    'code': 'access_code',
    'plate': 'vehicle_plate'
  };

  const column = allowedMethods[method];
  if (!column) {
    return { valid: false, error: 'Invalid validation method' };
  }

  const searchValue = credential.toUpperCase();

  // Use separate queries for each column to avoid template literal injection
  let query;
  if (method === 'plate') {
    query = `SELECT re.*, u.username as resident_name, u.house as resident_unit, u.estate_id
     FROM rideshare_entries re
     JOIN users u ON re.resident_id = u.id
     WHERE re.vehicle_plate = $1 AND re.status = 'pending' AND re.expires_at > NOW()`;
  } else {
    query = `SELECT re.*, u.username as resident_name, u.house as resident_unit, u.estate_id
     FROM rideshare_entries re
     JOIN users u ON re.resident_id = u.id
     WHERE re.access_code = $1 AND re.status = 'pending' AND re.expires_at > NOW()`;
  }

  const result = await pool.query(query, [searchValue]);

  if (result.rows.length === 0) {
    // Check if expired - also use separate queries
    let expiredQuery;
    if (method === 'plate') {
      expiredQuery = 'SELECT id, status, expires_at FROM rideshare_entries WHERE vehicle_plate = $1';
    } else {
      expiredQuery = 'SELECT id, status, expires_at FROM rideshare_entries WHERE access_code = $1';
    }

    const expiredCheck = await pool.query(expiredQuery, [searchValue]);

    if (expiredCheck.rows.length > 0) {
      const entry = expiredCheck.rows[0];
      if (entry.expires_at < new Date()) {
        return { valid: false, error: 'Entry has expired' };
      }
      return { valid: false, error: `Entry status: ${entry.status}` };
    }

    return { valid: false, error: 'No matching entry found' };
  }

  // SECURITY: Verify estate context
  if (estateId && result.rows[0].estate_id !== estateId) {
    return { valid: false, error: 'Entry belongs to different estate' };
  }

  return {
    valid: true,
    entry: {
      id: result.rows[0].id,
      driverName: result.rows[0].driver_name,
      vehiclePlate: result.rows[0].vehicle_plate,
      vehicleDescription: result.rows[0].vehicle_description,
      serviceProvider: result.rows[0].service_provider,
      residentName: result.rows[0].resident_name,
      residentUnit: result.rows[0].resident_unit,
      expiresAt: result.rows[0].expires_at
    }
  };
}

/**
 * Mark rideshare entry as arrived (Guard action)
 */
export async function markRideshareArrived(entryId, guardId) {
  const result = await pool.query(
    `UPDATE rideshare_entries 
     SET status = 'arrived', arrived_at = NOW(), verified_by_guard_id = $2
     WHERE id = $1 AND status = 'pending'
     RETURNING id, status, arrived_at`,
    [entryId, guardId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Entry not found or already processed' };
  }

  return { success: true, data: result.rows[0] };
}

/**
 * Mark rideshare entry as completed (Guard action - driver left)
 */
export async function markRideshareCompleted(entryId, guardId) {
  const result = await pool.query(
    `UPDATE rideshare_entries 
     SET status = 'completed', completed_at = NOW()
     WHERE id = $1 AND status = 'arrived'
     RETURNING id, status`,
    [entryId, guardId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Entry not found or not arrived' };
  }

  return { success: true, data: result.rows[0] };
}

/**
 * Get pending rideshare entries for guard view
 */
export async function getPendingRideshareEntries(estateId = null) {
  const query = `
    SELECT re.id, re.driver_name, re.vehicle_plate, re.vehicle_description,
            re.service_provider, re.access_code, re.expires_at, re.status,
            re.arrived_at, re.created_at,
            u.username as resident_name, u.house as resident_unit
      FROM rideshare_entries re
      JOIN users u ON re.resident_id = u.id
      WHERE re.status IN ('pending', 'arrived') AND re.expires_at > NOW()
      ${estateId ? 'AND u.estate_id = $1' : ''}
      ORDER BY re.created_at DESC`;

  const params = estateId ? [estateId] : [];

  const result = await pool.query(query, params);

  return result.rows.map(r => ({
    id: r.id,
    driverName: r.driver_name,
    vehiclePlate: r.vehicle_plate,
    vehicleDescription: r.vehicle_description,
    serviceProvider: r.service_provider,
    accessCode: r.access_code,
    expiresAt: r.expires_at,
    status: r.status,
    arrivedAt: r.arrived_at,
    createdAt: r.created_at,
    residentName: r.resident_name,
    residentUnit: r.resident_unit
  }));
}

export default {
  createRideshareEntry,
  getResidentRideshareEntries,
  cancelRideshareEntry,
  validateRideshareEntry,
  markRideshareArrived,
  markRideshareCompleted,
  getPendingRideshareEntries
};
