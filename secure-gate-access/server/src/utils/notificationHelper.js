/**
 * @file notificationHelper.js
 * @description Helper functions for sending notifications throughout the app
 * Phase V3: Visitor Notifications & Multi-Channel Communication
 * 
 * Usage:
 * ```javascript
 * import { notifyVisitorInviteCreated, notifyVisitApproved } from './utils/notificationHelper.js';
 * 
 * await notifyVisitorInviteCreated(visitorId);
 * await notifyVisitApproved(visitorId);
 * ```
 */

import { sendTemplatedNotification } from '../controllers/notificationController.js';
import dbManager from '../database/db.enhanced.js';
import logger from './logger.js';

/**
 * Send visitor invite created notification
 * Sends both email and SMS with visitor's digital pass link
 * 
 * @param {number} visitorId - Visitor ID
 * @returns {Promise<Object>} Result of notification attempts
 */
export async function notifyVisitorInviteCreated(visitorId) {
  try {
    // Fetch visitor and resident data
    const query = `
      SELECT 
        v.id, v.name, v.email, v.phone, v.date_of_visit, 
        v.time_of_visit, v.purpose, v.visitor_token,
        u.id as resident_id, u.name as resident_name, u.email as resident_email
      FROM visitors v
      LEFT JOIN users u ON v.resident_id = u.id
      WHERE v.id = $1
    `;
    
    const result = await dbManager.query(query, [visitorId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Visitor not found: ${visitorId}`);
    }
    
    const visitor = result.rows[0];
    
    // Generate invite link
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/v/${visitor.visitor_token}`;
    
    // Prepare template variables
    const variables = {
      visitor_name: visitor.name,
      estate_name: process.env.ESTATE_NAME || 'Secure Gate Estate',
      resident_name: visitor.resident_name || 'Your Host',
      date_of_visit: new Date(visitor.date_of_visit).toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time_of_visit: visitor.time_of_visit || 'TBD',
      purpose: visitor.purpose || 'Visit',
      invite_link: inviteLink
    };
    
    const notifications = [];
    
    // Send email if visitor has email
    if (visitor.email) {
      const emailResult = await sendTemplatedNotification({
        recipientType: 'visitor',
        recipientId: visitorId,
        channel: 'email',
        templateName: 'visitor_invite_created',
        variables,
        visitorId
      });
      
      notifications.push({ channel: 'email', ...emailResult });
    }
    
    // Send SMS if visitor has phone
    if (visitor.phone) {
      const smsResult = await sendTemplatedNotification({
        recipientType: 'visitor',
        recipientId: visitorId,
        channel: 'sms',
        templateName: 'visitor_invite_created',
        variables,
        visitorId
      });
      
      notifications.push({ channel: 'sms', ...smsResult });
    }
    
    logger.info('Visitor invite notifications sent', {
      visitorId,
      notifications: notifications.length
    });
    
    return {
      success: true,
      notifications
    };
    
  } catch (error) {
    logger.error('Failed to send visitor invite notifications', {
      error: error.message,
      visitorId
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send visit approved notification
 * 
 * @param {number} visitorId - Visitor ID
 * @returns {Promise<Object>} Result of notification attempts
 */
export async function notifyVisitApproved(visitorId) {
  try {
    const query = `
      SELECT 
        v.id, v.name, v.email, v.phone, v.date_of_visit, 
        v.time_of_visit, v.visitor_token,
        u.name as resident_name
      FROM visitors v
      LEFT JOIN users u ON v.resident_id = u.id
      WHERE v.id = $1
    `;
    
    const result = await dbManager.query(query, [visitorId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Visitor not found: ${visitorId}`);
    }
    
    const visitor = result.rows[0];
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/v/${visitor.visitor_token}`;
    
    const variables = {
      visitor_name: visitor.name,
      estate_name: process.env.ESTATE_NAME || 'Secure Gate Estate',
      resident_name: visitor.resident_name || 'Your Host',
      date_of_visit: new Date(visitor.date_of_visit).toLocaleDateString('en-KE'),
      time_of_visit: visitor.time_of_visit || 'TBD',
      invite_link: inviteLink
    };
    
    const notifications = [];
    
    if (visitor.email) {
      const emailResult = await sendTemplatedNotification({
        recipientType: 'visitor',
        recipientId: visitorId,
        channel: 'email',
        templateName: 'visit_approved',
        variables,
        visitorId
      });
      
      notifications.push({ channel: 'email', ...emailResult });
    }
    
    if (visitor.phone) {
      const smsResult = await sendTemplatedNotification({
        recipientType: 'visitor',
        recipientId: visitorId,
        channel: 'sms',
        templateName: 'visit_approved',
        variables,
        visitorId
      });
      
      notifications.push({ channel: 'sms', ...smsResult });
    }
    
    return {
      success: true,
      notifications
    };
    
  } catch (error) {
    logger.error('Failed to send visit approved notifications', {
      error: error.message,
      visitorId
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send visit rejected notification
 * 
 * @param {number} visitorId - Visitor ID
 * @returns {Promise<Object>} Result of notification attempts
 */
export async function notifyVisitRejected(visitorId) {
  try {
    const query = `
      SELECT 
        v.id, v.name, v.email, v.phone,
        u.name as resident_name
      FROM visitors v
      LEFT JOIN users u ON v.resident_id = u.id
      WHERE v.id = $1
    `;
    
    const result = await dbManager.query(query, [visitorId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Visitor not found: ${visitorId}`);
    }
    
    const visitor = result.rows[0];
    
    const variables = {
      visitor_name: visitor.name,
      estate_name: process.env.ESTATE_NAME || 'Secure Gate Estate',
      resident_name: visitor.resident_name || 'Your Host'
    };
    
    const notifications = [];
    
    if (visitor.email) {
      const emailResult = await sendTemplatedNotification({
        recipientType: 'visitor',
        recipientId: visitorId,
        channel: 'email',
        templateName: 'visit_rejected',
        variables,
        visitorId
      });
      
      notifications.push({ channel: 'email', ...emailResult });
    }
    
    if (visitor.phone) {
      const smsResult = await sendTemplatedNotification({
        recipientType: 'visitor',
        recipientId: visitorId,
        channel: 'sms',
        templateName: 'visit_rejected',
        variables,
        visitorId
      });
      
      notifications.push({ channel: 'sms', ...smsResult });
    }
    
    return {
      success: true,
      notifications
    };
    
  } catch (error) {
    logger.error('Failed to send visit rejected notifications', {
      error: error.message,
      visitorId
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send visitor checked in notification to resident
 * 
 * @param {number} visitorId - Visitor ID
 * @returns {Promise<Object>} Result of notification attempt
 */
export async function notifyVisitorCheckedIn(visitorId) {
  try {
    const query = `
      SELECT 
        v.id, v.name, v.checked_in_at,
        u.id as resident_id, u.name as resident_name, u.email as resident_email
      FROM visitors v
      LEFT JOIN users u ON v.resident_id = u.id
      WHERE v.id = $1
    `;
    
    const result = await dbManager.query(query, [visitorId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Visitor not found: ${visitorId}`);
    }
    
    const visitor = result.rows[0];
    
    if (!visitor.resident_id) {
      return { success: false, error: 'No resident associated with visitor' };
    }
    
    const variables = {
      resident_name: visitor.resident_name,
      visitor_name: visitor.name,
      check_in_time: visitor.checked_in_at ? 
        new Date(visitor.checked_in_at).toLocaleTimeString('en-KE') : 
        new Date().toLocaleTimeString('en-KE'),
      gate_name: 'Main Gate',
      estate_name: process.env.ESTATE_NAME || 'Secure Gate Estate'
    };
    
    // Send email to resident
    const emailResult = await sendTemplatedNotification({
      recipientType: 'resident',
      recipientId: visitor.resident_id,
      channel: 'email',
      templateName: 'visitor_checked_in',
      variables,
      visitorId,
      userId: visitor.resident_id
    });
    
    return {
      success: true,
      notifications: [{ channel: 'email', ...emailResult }]
    };
    
  } catch (error) {
    logger.error('Failed to send visitor checked in notification', {
      error: error.message,
      visitorId
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send visitor checked out notification to resident
 * 
 * @param {number} visitorId - Visitor ID
 * @returns {Promise<Object>} Result of notification attempt
 */
export async function notifyVisitorCheckedOut(visitorId) {
  try {
    const query = `
      SELECT 
        v.id, v.name, v.checked_out_at,
        u.id as resident_id, u.name as resident_name
      FROM visitors v
      LEFT JOIN users u ON v.resident_id = u.id
      WHERE v.id = $1
    `;
    
    const result = await dbManager.query(query, [visitorId]);
    
    if (result.rows.length === 0 || !result.rows[0].resident_id) {
      return { success: false, error: 'Invalid visitor or resident' };
    }
    
    const visitor = result.rows[0];
    
    const variables = {
      resident_name: visitor.resident_name,
      visitor_name: visitor.name,
      check_out_time: visitor.checked_out_at ? 
        new Date(visitor.checked_out_at).toLocaleTimeString('en-KE') : 
        new Date().toLocaleTimeString('en-KE'),
      gate_name: 'Main Gate',
      estate_name: process.env.ESTATE_NAME || 'Secure Gate Estate'
    };
    
    const emailResult = await sendTemplatedNotification({
      recipientType: 'resident',
      recipientId: visitor.resident_id,
      channel: 'email',
      templateName: 'visitor_checked_out',
      variables,
      visitorId,
      userId: visitor.resident_id
    });
    
    return {
      success: true,
      notifications: [{ channel: 'email', ...emailResult }]
    };
    
  } catch (error) {
    logger.error('Failed to send visitor checked out notification', {
      error: error.message,
      visitorId
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send visit reminder (1 day before)
 * 
 * @param {number} visitorId - Visitor ID
 * @returns {Promise<Object>} Result of notification attempt
 */
export async function sendVisitReminder(visitorId) {
  try {
    const query = `
      SELECT 
        v.id, v.name, v.phone, v.date_of_visit, v.time_of_visit, v.visitor_token
      FROM visitors v
      WHERE v.id = $1
        AND v.status IN ('pending_approval', 'approved')
        AND v.date_of_visit = CURRENT_DATE + INTERVAL '1 day'
    `;
    
    const result = await dbManager.query(query, [visitorId]);
    
    if (result.rows.length === 0) {
      return { success: false, error: 'Visitor not found or not eligible for reminder' };
    }
    
    const visitor = result.rows[0];
    
    if (!visitor.phone) {
      return { success: false, error: 'Visitor has no phone number' };
    }
    
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/v/${visitor.visitor_token}`;
    
    const variables = {
      estate_name: process.env.ESTATE_NAME || 'Secure Gate Estate',
      date_of_visit: new Date(visitor.date_of_visit).toLocaleDateString('en-KE'),
      time_of_visit: visitor.time_of_visit || 'TBD',
      invite_link: inviteLink
    };
    
    // Send SMS reminder
    const smsResult = await sendTemplatedNotification({
      recipientType: 'visitor',
      recipientId: visitorId,
      channel: 'sms',
      templateName: 'visit_reminder',
      variables,
      visitorId
    });
    
    return {
      success: true,
      notifications: [{ channel: 'sms', ...smsResult }]
    };
    
  } catch (error) {
    logger.error('Failed to send visit reminder', {
      error: error.message,
      visitorId
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Batch send reminders for all visits tomorrow
 * Run this as a cron job
 * 
 * @returns {Promise<Object>} Summary of reminders sent
 */
export async function sendAllVisitReminders() {
  try {
    const query = `
      SELECT id
      FROM visitors
      WHERE status IN ('pending_approval', 'approved')
        AND date_of_visit = CURRENT_DATE + INTERVAL '1 day'
        AND phone IS NOT NULL
    `;
    
    const result = await dbManager.query(query);
    
    const reminders = [];
    
    for (const visitor of result.rows) {
      const reminderResult = await sendVisitReminder(visitor.id);
      reminders.push({
        visitorId: visitor.id,
        ...reminderResult
      });
    }
    
    const successCount = reminders.filter(r => r.success).length;
    
    logger.info('Batch visit reminders sent', {
      total: reminders.length,
      successful: successCount,
      failed: reminders.length - successCount
    });
    
    return {
      success: true,
      total: reminders.length,
      successful: successCount,
      failed: reminders.length - successCount,
      details: reminders
    };
    
  } catch (error) {
    logger.error('Failed to send batch visit reminders', {
      error: error.message
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  notifyVisitorInviteCreated,
  notifyVisitApproved,
  notifyVisitRejected,
  notifyVisitorCheckedIn,
  notifyVisitorCheckedOut,
  sendVisitReminder,
  sendAllVisitReminders
};
