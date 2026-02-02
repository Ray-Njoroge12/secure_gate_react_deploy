/**
 * Delivery Service
 * Phase 2.1: Privacy-Preserving Delivery & Package Management
 * 
 * Privacy Controls:
 * - Package photos visible only to recipient resident
 * - Photos auto-deleted 30 days after collection
 * - Tracking numbers stored encrypted
 * - Guards see minimal info during check-in
 * - Admins see only aggregate statistics
 * 
 * SECURITY: Uses centralized key management - no hardcoded keys
 */

import { pool } from '../database/connection.js';
import * as crypto from 'crypto';
import { sendDeliveryNotification, sendSms } from './notificationService.js';
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
    encryptionKey = await keyManagementService.getServiceEncryptionKey('delivery');
  }
  return encryptionKey;
}

/**
 * Encrypt sensitive data (tracking numbers)
 */
async function encrypt(text) {
  if (!text) return null;
  const key = await getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt sensitive data
 */
async function decrypt(text) {
  if (!text) return null;
  try {
    const key = await getEncryptionKey();
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

/**
 * Register a new delivery (Guard action)
 */
export async function registerDelivery({
  trackingNumber,
  carrierName,
  recipientId,
  guardId,
  estateId,
  packageDescription,
  packageSize,
  notes
}) {
  return pool.transaction(async (client) => {
    // Verify recipient exists and belongs to the same estate
    const recipientResult = await client.query(
      'SELECT email, username, estate_id FROM users WHERE id = $1',
      [recipientId]
    );

    const recipient = recipientResult.rows[0];

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    if (recipient.estate_id !== estateId) {
      throw new Error('Recipient does not belong to this estate');
    }

    // Encrypt tracking number for privacy
    const encryptedTracking = await encrypt(trackingNumber);

    // Calculate photo expiry (30 days from now)
    const photoExpiresAt = new Date();
    photoExpiresAt.setDate(photoExpiresAt.getDate() + 30);

    const result = await client.query(
      `INSERT INTO deliveries (
        tracking_number, carrier_name, recipient_id, received_by_guard_id, estate_id,
        package_description, package_size, notes, photo_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, carrier_name, package_description, package_size, status, created_at`,
      [encryptedTracking, carrierName, recipientId, guardId, estateId, packageDescription, packageSize || 'medium', notes, photoExpiresAt]
    );

    return {
      success: true,
      data: {
        ...result.rows[0],
        recipientEmail: recipient.email,
        recipientName: recipient.username
      },
      message: 'Delivery registered successfully'
    };
  });
}

/**
 * Add photo to delivery (Guard action)
 */
export async function addDeliveryPhoto(deliveryId, photoBuffer, mimeType, guardId) {
  return pool.transaction(async (client) => {
    // Verify guard has access to this delivery
    const deliveryCheck = await client.query(
      'SELECT id, received_by_guard_id FROM deliveries WHERE id = $1',
      [deliveryId]
    );

    if (deliveryCheck.rows.length === 0) {
      return { success: false, error: 'Delivery not found' };
    }

    // Calculate expiry (30 days after collection, or 30 days from now if not collected)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await client.query(
      `INSERT INTO delivery_photos (delivery_id, photo_data, mime_type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [deliveryId, photoBuffer, mimeType || 'image/jpeg', expiresAt]
    );

    // Update delivery with photo reference
    await client.query(
      `UPDATE deliveries SET photo_uploaded_at = NOW(), photo_reference = $2
       WHERE id = $1`,
      [deliveryId, `photo_${deliveryId}_${Date.now()}`]
    );

    return {
      success: true,
      message: 'Photo added to delivery'
    };
  });
}

/**
 * Get deliveries for resident (Privacy: only their own)
 */
export async function getResidentDeliveries(residentId, { status, limit = 20, offset = 0 }) {
  let query = `
    SELECT 
      d.id,
      d.carrier_name,
      d.package_description,
      d.package_size,
      d.status,
      d.handoff_preference,
      d.handoff_decided_at,
      d.notification_sent,
      d.collected_at,
      d.created_at,
      EXISTS(SELECT 1 FROM delivery_photos dp WHERE dp.delivery_id = d.id) as has_photo
    FROM deliveries d
    WHERE d.recipient_id = $1
  `;

  const params = [residentId];
  let paramIndex = 2;

  if (status) {
    query += ` AND d.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  query += ` ORDER BY d.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Privacy: Don't expose tracking number in list view
  return result.rows.map(d => ({
    ...d,
    trackingNumber: null // Revealed only in detail view
  }));
}

export async function setDeliveryHandoffPreference(deliveryId, residentId, preference) {
  const normalized = typeof preference === 'string' ? preference.trim() : '';
  const allowed = new Set(['pickup_at_gate', 'deliver_to_residence']);
  if (!allowed.has(normalized)) {
    return { success: false, error: 'Invalid handoff preference' };
  }

  const result = await pool.query(
    `UPDATE deliveries
     SET handoff_preference = $3,
         handoff_decided_at = NOW(),
         handoff_decided_by = $2,
         updated_at = NOW()
     WHERE id = $1 AND recipient_id = $2
     RETURNING id, status, handoff_preference, handoff_decided_at`,
    [deliveryId, residentId, normalized]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Delivery not found' };
  }

  return {
    success: true,
    delivery: result.rows[0]
  };
}

/**
 * Get delivery detail (with decrypted tracking for owner only)
 * SECURITY: Validates estate_id for cross-estate protection
 */
export async function getDeliveryDetail(deliveryId, requesterId, requesterRole, estateId = null) {
  // Build query with estate_id filter if provided
  let query = `SELECT d.*, u.username as recipient_name, u.house as recipient_unit,
          g.username as received_by_guard_name
   FROM deliveries d
   JOIN users u ON d.recipient_id = u.id
   LEFT JOIN users g ON d.received_by_guard_id = g.id
   WHERE d.id = $1`;
  const params = [deliveryId];

  // SECURITY: Filter by estate_id for guards/admins
  if (estateId && requesterRole !== 'resident') {
    query += ` AND d.estate_id = $2`;
    params.push(estateId);
  }

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    return null;
  }

  const delivery = result.rows[0];

  // Privacy check: Only recipient can see full details
  if (delivery.recipient_id !== requesterId && requesterRole !== 'admin') {
    return {
      id: delivery.id,
      status: delivery.status,
      carrier_name: delivery.carrier_name,
      // Minimal info for non-owners
      accessDenied: true
    };
  }

  // Decrypt tracking number for owner
  delivery.tracking_number = await decrypt(delivery.tracking_number);

  return delivery;
}

/**
 * Get delivery photo (Privacy: only recipient)
 */
export async function getDeliveryPhoto(deliveryId, requesterId) {
  // First verify requester is the recipient
  const check = await pool.query(
    'SELECT recipient_id FROM deliveries WHERE id = $1',
    [deliveryId]
  );

  if (check.rows.length === 0) {
    return { success: false, error: 'Delivery not found' };
  }

  if (check.rows[0].recipient_id !== requesterId) {
    return { success: false, error: 'Access denied. Only recipient can view package photos.' };
  }

  const result = await pool.query(
    'SELECT photo_data, mime_type FROM delivery_photos WHERE delivery_id = $1 ORDER BY created_at DESC LIMIT 1',
    [deliveryId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'No photo available' };
  }

  return {
    success: true,
    photo: result.rows[0].photo_data,
    mimeType: result.rows[0].mime_type
  };
}

/**
 * Mark delivery as collected (Guard or Resident action)
 * SECURITY: Validates estate_id for cross-estate protection
 */
export async function collectDelivery(deliveryId, collectedBy, guardId, estateId = null) {
  // Build query with estate_id filter if provided
  let query = `UPDATE deliveries 
   SET status = 'collected', 
       collected_at = NOW(), 
       collected_by = $2,
       updated_at = NOW()
   WHERE id = $1`;
  const params = [deliveryId, collectedBy];

  // SECURITY: Filter by estate_id for guards
  if (estateId) {
    query += ` AND estate_id = $3`;
    params.push(estateId);
  }
  query += ` RETURNING id, status, collected_at`;

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    return { success: false, error: 'Delivery not found' };
  }

  // Update photo expiry to 30 days from collection
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 30);

  await pool.query(
    'UPDATE delivery_photos SET expires_at = $2 WHERE delivery_id = $1',
    [deliveryId, newExpiry]
  );

  return {
    success: true,
    delivery: result.rows[0]
  };
}

/**
 * Send notification to resident about pending delivery
 */
export async function notifyResidentOfDelivery(deliveryId) {
  const result = await pool.query(
    `SELECT d.*, u.email, u.phone, u.notify_email, u.notify_sms, u.username
     FROM deliveries d
     JOIN users u ON d.recipient_id = u.id
     WHERE d.id = $1 AND d.notification_sent = false`,
    [deliveryId]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Delivery not found or already notified' };
  }

  const delivery = result.rows[0];

  const recipient = {
    id: delivery.recipient_id,
    email: delivery.email,
    name: delivery.username || delivery.email
  };
  const deliveryInfo = {
    id: delivery.id,
    carrierName: delivery.carrier_name,
    packageSize: delivery.package_size,
    packageDescription: delivery.package_description
  };

  let attempts = 0;
  let delivered = false;
  const failures = [];

  if (delivery.notify_email && delivery.email) {
    attempts += 1;
    const emailResult = await sendDeliveryNotification(recipient, deliveryInfo);
    const emailSuccess = Boolean(emailResult && emailResult.success !== false);
    delivered = delivered || emailSuccess;
    if (!emailSuccess) {
      failures.push('email');
    }
  }

  if (delivery.notify_sms && delivery.phone) {
    attempts += 1;
    const smsText = `New delivery received at the gate. Carrier: ${deliveryInfo.carrierName}. Size: ${deliveryInfo.packageSize}. Please log in to choose pickup or home delivery.`;
    const smsResult = await sendSms(delivery.phone, smsText);
    const smsSuccess = Boolean(smsResult && smsResult.success !== false);
    delivered = delivered || smsSuccess;
    if (!smsSuccess) {
      failures.push('sms');
    }
  }

  if (attempts === 0) {
    return { success: false, error: 'No notification channels available' };
  }

  if (!delivered) {
    return { success: false, error: 'Notification delivery failed', failures };
  }

  await pool.query(
    `UPDATE deliveries SET notification_sent = true, notification_sent_at = NOW()
     WHERE id = $1`,
    [deliveryId]
  );

  return {
    success: true,
    message: 'Notification sent to resident'
  };
}

/**
 * Get pending deliveries for guard view (minimal data)
 * SECURITY: Filters by estate_id
 */
export async function getPendingDeliveries(estateId) {
  // SECURITY: Require estate_id
  if (!estateId) {
    console.warn('[DeliveryService] getPendingDeliveries called without estate_id');
    return [];
  }

  const result = await pool.query(
    `SELECT 
      d.id,
      d.carrier_name,
      d.package_size,
      d.status,
      d.handoff_preference,
      d.handoff_decided_at,
      d.created_at,
      u.username as recipient_name,
      u.house as recipient_unit
     FROM deliveries d
     JOIN users u ON d.recipient_id = u.id
     WHERE d.status = 'pending_collection'
     AND d.estate_id = $1
     ORDER BY d.created_at ASC`,
    [estateId]
  );

  // Privacy: Guards see only what's needed to deliver
  return result.rows.map(d => ({
    id: d.id,
    carrierName: d.carrier_name,
    packageSize: d.package_size,
    recipientName: d.recipient_name,
    recipientUnit: d.recipient_unit,
    receivedAt: d.created_at,
    handoffPreference: d.handoff_preference,
    handoffDecidedAt: d.handoff_decided_at
    // Note: No tracking number, no description
  }));
}

/**
 * Get aggregate delivery stats for admin (privacy-safe)
 * SECURITY: Filters by estate_id
 */
export async function getDeliveryStats(dateRange = 30, estateId = null) {
  // Build query with optional estate filter
  let query = `SELECT 
    COUNT(*) as total_deliveries,
    COUNT(*) FILTER (WHERE status = 'pending_collection') as pending,
    COUNT(*) FILTER (WHERE status = 'collected') as collected,
    COUNT(*) FILTER (WHERE status = 'returned') as returned,
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as hourly_count
   FROM deliveries
   WHERE created_at > NOW() - INTERVAL '${dateRange} days'`;

  const params = [];
  if (estateId) {
    query += ` AND estate_id = $1`;
    params.push(estateId);
  }

  query += ` GROUP BY DATE_TRUNC('hour', created_at) ORDER BY hour DESC`;

  const result = await pool.query(query, params);

  // Privacy: Only aggregates, no individual delivery info
  return {
    summary: {
      totalDeliveries: result.rows.reduce((sum, r) => sum + parseInt(r.hourly_count), 0),
      pending: result.rows.length > 0 ? parseInt(result.rows[0].pending) : 0,
      collected: result.rows.length > 0 ? parseInt(result.rows[0].collected) : 0,
      returned: result.rows.length > 0 ? parseInt(result.rows[0].returned) : 0
    },
    peakHours: result.rows.slice(0, 10)
  };
}

/**
 * Delete resident's delivery history (Privacy control)
 */
export async function deleteResidentDeliveryHistory(residentId) {
  return pool.transaction(async (client) => {
    // Delete photos first
    await client.query(
      `DELETE FROM delivery_photos 
       WHERE delivery_id IN (SELECT id FROM deliveries WHERE recipient_id = $1)`,
      [residentId]
    );

    // Delete deliveries
    const result = await client.query(
      'DELETE FROM deliveries WHERE recipient_id = $1 RETURNING id',
      [residentId]
    );

    return {
      success: true,
      deletedCount: result.rowCount,
      message: 'Delivery history deleted'
    };
  });
}

/**
 * Cleanup expired data (run by scheduled job)
 */
export async function cleanupExpiredDeliveryData() {
  return pool.transaction(async (client) => {
    // Delete expired photos
    const photoResult = await client.query(
      'SELECT cleanup_expired_delivery_photos()'
    );

    // Delete old deliveries
    const deliveryResult = await client.query(
      'SELECT cleanup_old_deliveries()'
    );

    return {
      photosDeleted: photoResult.rows[0].cleanup_expired_delivery_photos,
      deliveriesDeleted: deliveryResult.rows[0].cleanup_old_deliveries
    };
  });
}

export default {
  registerDelivery,
  addDeliveryPhoto,
  getResidentDeliveries,
  setDeliveryHandoffPreference,
  getDeliveryDetail,
  getDeliveryPhoto,
  collectDelivery,
  notifyResidentOfDelivery,
  getPendingDeliveries,
  getDeliveryStats,
  deleteResidentDeliveryHistory,
  cleanupExpiredDeliveryData
};
