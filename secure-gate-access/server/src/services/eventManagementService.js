/**
 * Event Management Service
 * Phase 4.1: Event management, bulk invitations, and RSVP tracking
 *
 * Features:
 * - Event CRUD operations
 * - Bulk invitation processing (CSV import)
 * - Event-specific QR code generation
 * - RSVP tracking
 * - Event check-in/check-out
 * - Automated reminders
 * - Event analytics
 */

import db from '../database/db.enhanced.js';
import * as crypto from 'crypto';
import loggingService from './loggingService.js';
import notificationQueueService from './notificationQueueService.js';
import calendarService from './calendarService.js';

class EventManagementService {
  /**
   * Create a new event
   */
  async createEvent(eventData, hostId, estateId) {
    try {
      // Generate QR code prefix if not provided
      const qrPrefix = eventData.qr_code_prefix || this.generateQRCodePrefix(eventData.name);

      const result = await db.query(`
        INSERT INTO events (
          name, description, event_type, location, location_details,
          start_date, end_date, check_in_window_start, check_in_window_end,
          max_capacity, dress_code, parking_instructions, special_instructions,
          host_id, estate_location_id, registration_deadline,
          requires_approval, allow_plus_one, send_reminders, reminder_hours_before,
          qr_code_prefix, custom_fields, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23
        )
        RETURNING *
      `, [
        eventData.name,
        eventData.description || null,
        eventData.event_type || 'other',
        eventData.location || null,
        eventData.location_details || null,
        eventData.start_date,
        eventData.end_date,
        eventData.check_in_window_start || eventData.start_date,
        eventData.check_in_window_end || eventData.end_date,
        eventData.max_capacity || null,
        eventData.dress_code || null,
        eventData.parking_instructions || null,
        eventData.special_instructions || null,
        hostId,
        estateId,
        eventData.registration_deadline || null,
        eventData.requires_approval !== undefined ? eventData.requires_approval : false,
        eventData.allow_plus_one !== undefined ? eventData.allow_plus_one : false,
        eventData.send_reminders !== undefined ? eventData.send_reminders : true,
        eventData.reminder_hours_before || 24,
        qrPrefix,
        JSON.stringify(eventData.custom_fields || {}),
        eventData.status || 'draft'
      ]);

      loggingService.logInfo('Event created', {
        eventId: result.rows[0].id,
        name: eventData.name,
        hostId,
        estateId
      });

      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to create event', error);
      throw error;
    }
  }

  /**
   * Build and execute event lookup with analytics counters.
   *
   * Estate scoping is always applied on events (source of truth), while analytics
   * are joined from event_analytics to avoid depending on view-specific columns.
   */
  async getEventWithAnalytics(eventId, estateId = null) {
    const params = [eventId];
    let query = `
      SELECT
        e.*,
        COALESCE(ea.total_invited, 0) as total_invited,
        COALESCE(ea.confirmed_count, 0) as confirmed_count,
        COALESCE(ea.declined_count, 0) as declined_count,
        COALESCE(ea.pending_count, 0) as pending_count,
        COALESCE(ea.rsvp_attending, 0) as rsvp_attending,
        COALESCE(ea.rsvp_not_attending, 0) as rsvp_not_attending,
        COALESCE(ea.rsvp_maybe, 0) as rsvp_maybe,
        COALESCE(ea.checked_in_count, 0) as checked_in_count,
        COALESCE(ea.checked_out_count, 0) as checked_out_count,
        COALESCE(ea.total_plus_ones, 0) as total_plus_ones,
        ea.rsvp_response_rate,
        ea.attendance_rate
      FROM events e
      LEFT JOIN event_analytics ea ON ea.id = e.id
      WHERE e.id = $1
    `;

    if (estateId) {
      params.push(estateId);
      query += ' AND e.estate_location_id = $2';
    }

    return db.query(query, params);
  }

  /**
   * Get event by ID with analytics
   */
  async getEventById(eventId, estateId = null) {
    try {
      const result = await this.getEventWithAnalytics(eventId, estateId);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to get event', error);
      throw error;
    }
  }

  /**
   * Get all events for an estate
   */
  async getEventsByEstate(estateId, filters = {}) {
    try {
      let query = `
        SELECT e.*, 
               COUNT(ev.id) as total_invited,
               COUNT(CASE WHEN ev.invitation_status = 'confirmed' THEN 1 END) as confirmed_count,
               COUNT(CASE WHEN ev.rsvp_status = 'attending' THEN 1 END) as rsvp_attending,
               COUNT(CASE WHEN ev.checked_in = true THEN 1 END) as checked_in_count
        FROM events e
        LEFT JOIN event_visitors ev ON e.id = ev.event_id
        WHERE e.estate_location_id = $1
      `;
      const params = [estateId];
      let paramCount = 1;

      // Apply filters
      if (filters.status) {
        paramCount++;
        query += ` AND e.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.event_type) {
        paramCount++;
        query += ` AND e.event_type = $${paramCount}`;
        params.push(filters.event_type);
      }

      if (filters.upcoming) {
        query += ` AND e.start_date >= NOW()`;
      }

      if (filters.past) {
        query += ` AND e.end_date < NOW()`;
      }

      query += ` GROUP BY e.id ORDER BY e.start_date DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      loggingService.logError('Failed to get events', error);
      throw error;
    }
  }

  /**
   * Update event
   */
  async updateEvent(eventId, updates, estateId) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 0;

      const allowedFields = [
        'name', 'description', 'event_type', 'location', 'location_details',
        'start_date', 'end_date', 'check_in_window_start', 'check_in_window_end',
        'max_capacity', 'dress_code', 'parking_instructions', 'special_instructions',
        'registration_deadline', 'requires_approval', 'allow_plus_one',
        'send_reminders', 'reminder_hours_before', 'status', 'custom_fields'
      ];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          paramCount++;
          fields.push(`${key} = $${paramCount}`);
          values.push(key === 'custom_fields' ? JSON.stringify(value) : value);
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      paramCount++;
      fields.push(`updated_at = $${paramCount}`);
      values.push(new Date());

      paramCount++;
      values.push(eventId);
      paramCount++;
      values.push(estateId);

      const query = `
        UPDATE events
        SET ${fields.join(', ')}
        WHERE id = $${paramCount - 1}
        AND estate_location_id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      loggingService.logInfo('Event updated', { eventId, updates });
      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to update event', error);
      throw error;
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId, estateId) {
    try {
      await db.query('DELETE FROM events WHERE id = $1 AND estate_location_id = $2', [eventId, estateId]);
      loggingService.logInfo('Event deleted', { eventId });
      return true;
    } catch (error) {
      loggingService.logError('Failed to delete event', error);
      throw error;
    }
  }

  /**
   * Add single visitor to event
   */
  async addVisitorToEvent(eventId, visitorData, estateId) {
    try {
      const eventCheck = await db.query(
        'SELECT id FROM events WHERE id = $1 AND estate_location_id = $2',
        [eventId, estateId]
      );
      if (eventCheck.rows.length === 0) {
        throw new Error('Event not found');
      }

      // Generate event-specific QR code
      const eventQRCode = await this.generateEventQRCode(eventId);

      const result = await db.query(`
        INSERT INTO event_visitors (
          event_id, visitor_id, visitor_name, visitor_email, visitor_phone,
          plus_one_count, plus_one_names, event_qr_code, custom_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (event_id, visitor_id)
        DO UPDATE SET
          visitor_name = EXCLUDED.visitor_name,
          visitor_email = EXCLUDED.visitor_email,
          visitor_phone = EXCLUDED.visitor_phone,
          plus_one_count = EXCLUDED.plus_one_count,
          updated_at = NOW()
        RETURNING *
      `, [
        eventId,
        visitorData.visitor_id || null,
        visitorData.visitor_name,
        visitorData.visitor_email,
        visitorData.visitor_phone || null,
        visitorData.plus_one_count || 0,
        visitorData.plus_one_names || null,
        eventQRCode,
        visitorData.custom_message || null
      ]);

      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to add visitor to event', error);
      throw error;
    }
  }

  /**
   * Process bulk invitations from CSV data
   */
  async processBulkInvitations(eventId, csvData, processedBy, estateId) {
    try {
      const eventCheck = await db.query(
        'SELECT id FROM events WHERE id = $1 AND estate_location_id = $2',
        [eventId, estateId]
      );
      if (eventCheck.rows.length === 0) {
        throw new Error('Event not found');
      }

      // Create batch record
      const batch = await db.query(`
        INSERT INTO bulk_invitation_batches (
          event_id, batch_name, total_invitations, processed_by, status
        ) VALUES ($1, $2, $3, $4, 'processing')
        RETURNING *
      `, [
        eventId,
        `Batch-${new Date().toISOString()}`,
        csvData.length,
        processedBy
      ]);

      const batchId = batch.rows[0].id;
      let successful = 0;
      let failed = 0;
      const errors = [];

      // Process each invitation
      for (const row of csvData) {
        try {
          await this.addVisitorToEvent(eventId, {
            visitor_name: row.name || row.visitor_name,
            visitor_email: row.email || row.visitor_email,
            visitor_phone: row.phone || row.visitor_phone,
            plus_one_count: parseInt(row.plus_one_count || 0),
            plus_one_names: row.plus_one_names || null,
            custom_message: row.custom_message || null
          }, estateId);
          successful++;
        } catch (error) {
          failed++;
          errors.push({
            row: row,
            error: error.message
          });
        }
      }

      // Update batch status
      const status = failed === 0 ? 'completed' : (successful === 0 ? 'failed' : 'partial');
      await db.query(`
        UPDATE bulk_invitation_batches
        SET
          successful_invitations = $1,
          failed_invitations = $2,
          status = $3,
          error_log = $4,
          completed_at = NOW()
        WHERE id = $5
      `, [successful, failed, status, JSON.stringify(errors), batchId]);

      loggingService.logInfo('Bulk invitations processed', {
        eventId,
        batchId,
        successful,
        failed
      });

      return {
        batchId,
        successful,
        failed,
        errors: errors.length > 0 ? errors : null
      };
    } catch (error) {
      loggingService.logError('Failed to process bulk invitations', error);
      throw error;
    }
  }

  /**
   * Send invitations to all pending event visitors
   */
  async sendEventInvitations(eventId, estateId) {
    try {
      // Get event details
      const event = await this.getEventById(eventId, estateId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Get pending invitations
      const invitations = await db.query(`
        SELECT * FROM event_visitors
        WHERE event_id = $1
        AND invitation_status = 'pending'
        AND invitation_sent_at IS NULL
      `, [eventId]);

      let sent = 0;
      for (const invitation of invitations.rows) {
        try {
          await this.sendInvitationEmail(event, invitation);

          // Update invitation status
          await db.query(`
            UPDATE event_visitors
            SET
              invitation_status = 'invited',
              invitation_sent_at = NOW()
            WHERE id = $1
          `, [invitation.id]);

          sent++;
        } catch (error) {
          loggingService.logError('Failed to send invitation', {
            eventId,
            invitationId: invitation.id,
            error: error.message
          });
        }
      }

      loggingService.logInfo('Event invitations sent', { eventId, sent });
      return { sent };
    } catch (error) {
      loggingService.logError('Failed to send event invitations', error);
      throw error;
    }
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(event, invitation) {
    const subject = `You're Invited: ${event.name}`;
    const html = this.generateInvitationEmailHTML(event, invitation);

    // Generate calendar attachment (.ics file)
    const calendarAttachment = calendarService.getCalendarAttachment(event, invitation);

    await notificationQueueService.queueEmail(
      invitation.visitor_email,
      subject,
      html,
      null,
      {
        priority: 'normal',
        attachments: [calendarAttachment],
        metadata: {
          event_id: event.id,
          event_visitor_id: invitation.id,
          type: 'event_invitation'
        }
      }
    );
  }

  /**
   * Generate invitation email HTML
   */
  generateInvitationEmailHTML(event, invitation) {
    const startDate = new Date(event.start_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const startTime = new Date(event.start_date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${event.name}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { margin: 10px 0; }
    .label { font-weight: bold; color: #667eea; }
    .qr-code { text-align: center; margin: 20px 0; }
    .qr-code img { max-width: 200px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 You're Invited!</h1>
    <h2>${event.name}</h2>
  </div>

  <div class="content">
    <p>Dear ${invitation.visitor_name},</p>

    ${invitation.custom_message ? `<p><em>${invitation.custom_message}</em></p>` : ''}

    <p>We're excited to invite you to <strong>${event.name}</strong>!</p>

    <div class="event-details">
      <div class="detail-row">
        <span class="label">📅 Date:</span> ${startDate}
      </div>
      <div class="detail-row">
        <span class="label">🕐 Time:</span> ${startTime}
      </div>
      ${event.location ? `
      <div class="detail-row">
        <span class="label">📍 Location:</span> ${event.location}
      </div>
      ` : ''}
      ${event.dress_code ? `
      <div class="detail-row">
        <span class="label">👔 Dress Code:</span> ${event.dress_code}
      </div>
      ` : ''}
      ${invitation.plus_one_count > 0 ? `
      <div class="detail-row">
        <span class="label">👥 Plus Ones:</span> ${invitation.plus_one_count} guest(s) allowed
      </div>
      ` : ''}
    </div>

    ${event.description ? `<p>${event.description}</p>` : ''}

    ${event.parking_instructions ? `
    <div class="event-details">
      <div class="detail-row">
        <span class="label">🅿️ Parking:</span> ${event.parking_instructions}
      </div>
    </div>
    ` : ''}

    ${event.special_instructions ? `
    <div class="event-details">
      <div class="detail-row">
        <span class="label">ℹ️ Special Instructions:</span><br/>
        ${event.special_instructions}
      </div>
    </div>
    ` : ''}

    <div class="qr-code">
      <p><strong>Your Event Pass:</strong></p>
      <div style="background: white; padding: 20px; display: inline-block; border-radius: 8px;">
        <p style="font-family: monospace; font-size: 18px; color: #667eea; margin: 10px 0;">
          ${invitation.event_qr_code}
        </p>
      </div>
      <p style="font-size: 12px; color: #666;">Present this code at check-in</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.CLIENT_ORIGIN}/event/${event.id}/rsvp?code=${invitation.event_qr_code}" class="button">
        ✅ RSVP Now
      </a>
      <a href="${process.env.CLIENT_ORIGIN}/event/${event.id}/details" class="button" style="background: #48bb78;">
        📋 View Details
      </a>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="font-weight: bold; margin-bottom: 15px; color: #667eea;">📅 Add to Calendar:</p>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
        <a href="${calendarService.generateCalendarLinks(event, invitation).google}" target="_blank" style="display: inline-block; padding: 10px 20px; background: #4285F4; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">
          Google
        </a>
        <a href="${calendarService.generateCalendarLinks(event, invitation).outlook}" target="_blank" style="display: inline-block; padding: 10px 20px; background: #0078D4; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">
          Outlook
        </a>
        <a href="${calendarService.generateCalendarLinks(event, invitation).yahoo}" target="_blank" style="display: inline-block; padding: 10px 20px; background: #6001D2; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">
          Yahoo
        </a>
      </div>
      <p style="font-size: 12px; color: #666; margin-top: 10px;">
        💡 Calendar file (.ics) attached - open it to add to your preferred calendar app
      </p>
    </div>

    <p>We look forward to seeing you there!</p>

    ${event.registration_deadline ? `
    <p style="color: #e53e3e; font-weight: bold;">
      ⏰ Please RSVP by ${new Date(event.registration_deadline).toLocaleDateString()}
    </p>
    ` : ''}
  </div>

  <div class="footer">
    <p>This invitation was sent by SecureGate Event Management</p>
    <p>If you have any questions, please contact the event host.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Validate RSVP token
   */
  async validateRSVPToken(eventVisitorId, rsvpToken) {
    try {
      const result = await db.query(
        'SELECT id FROM event_visitors WHERE id = $1 AND rsvp_token = $2',
        [eventVisitorId, rsvpToken]
      );
      return result.rows.length > 0;
    } catch (error) {
      loggingService.logError('Failed to validate RSVP token', error);
      return false;
    }
  }

  /**
   * Handle RSVP
   */
  async handleRSVP(eventVisitorId, rsvpStatus, plusOneDetails = {}) {
    try {
      await db.query(`
        UPDATE event_visitors
        SET
          rsvp_status = $1,
          rsvp_date = NOW(),
          plus_one_count = COALESCE($2, plus_one_count),
          plus_one_names = COALESCE($3, plus_one_names),
          updated_at = NOW()
        WHERE id = $4
      `, [
        rsvpStatus,
        plusOneDetails.plus_one_count,
        plusOneDetails.plus_one_names,
        eventVisitorId
      ]);

      loggingService.logInfo('RSVP recorded', { eventVisitorId, rsvpStatus });
      return true;
    } catch (error) {
      loggingService.logError('Failed to record RSVP', error);
      throw error;
    }
  }

  /**
   * Check in visitor to event
   */
  async checkInToEvent(eventQRCode, estateId) {
    try {
      const result = await db.query(`
        UPDATE event_visitors ev
        SET
          checked_in = true,
          check_in_time = NOW(),
          updated_at = NOW()
        FROM events e
        WHERE ev.event_id = e.id
        AND ev.event_qr_code = $1
        AND e.estate_location_id = $2
        AND ev.checked_in = false
        RETURNING ev.*
      `, [eventQRCode, estateId]);

      if (result.rows.length === 0) {
        return { success: false, message: 'Invalid QR code or already checked in' };
      }

      // Update event attendance count
      await db.query(`
        UPDATE events
        SET current_attendance = current_attendance + 1 + COALESCE((
          SELECT plus_one_count FROM event_visitors WHERE event_qr_code = $1
        ), 0)
        WHERE id = (SELECT event_id FROM event_visitors WHERE event_qr_code = $1)
      `, [eventQRCode]);

      loggingService.logInfo('Event check-in successful', {
        eventQRCode,
        eventVisitorId: result.rows[0].id
      });

      return { success: true, data: result.rows[0] };
    } catch (error) {
      loggingService.logError('Failed to check in to event', error);
      throw error;
    }
  }

  /**
   * Check out visitor from event
   */
  async checkOutFromEvent(eventQRCode, estateId) {
    try {
      const result = await db.query(`
        UPDATE event_visitors ev
        SET
          checked_out = true,
          check_out_time = NOW(),
          updated_at = NOW()
        FROM events e
        WHERE ev.event_id = e.id
        AND ev.event_qr_code = $1
        AND e.estate_location_id = $2
        AND ev.checked_in = true
        AND ev.checked_out = false
        RETURNING ev.*
      `, [eventQRCode, estateId]);

      if (result.rows.length === 0) {
        return { success: false, message: 'Invalid QR code or not checked in' };
      }

      loggingService.logInfo('Event check-out successful', {
        eventQRCode,
        eventVisitorId: result.rows[0].id
      });

      return { success: true, data: result.rows[0] };
    } catch (error) {
      loggingService.logError('Failed to check out from event', error);
      throw error;
    }
  }

  /**
   * Get event attendees
   */
  async getEventAttendees(eventId, filters = {}, estateId = null) {
    try {
      let query = `
        SELECT
          ev.*,
          NULL as photo_url,
          NULL as id_type,
          v.id_number
        FROM event_visitors ev
        ${estateId ? 'JOIN events e ON ev.event_id = e.id' : ''}
        LEFT JOIN visitors v ON ev.visitor_id = v.id
        WHERE ev.event_id = $1
        ${estateId ? 'AND e.estate_location_id = $2' : ''}
      `;
      const params = estateId ? [eventId, estateId] : [eventId];
      let paramCount = estateId ? 2 : 1;

      if (filters.rsvp_status) {
        paramCount++;
        query += ` AND ev.rsvp_status = $${paramCount}`;
        params.push(filters.rsvp_status);
      }

      if (filters.checked_in !== undefined) {
        paramCount++;
        query += ` AND ev.checked_in = $${paramCount}`;
        params.push(filters.checked_in);
      }

      query += ` ORDER BY ev.created_at DESC`;

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      loggingService.logError('Failed to get event attendees', error);
      throw error;
    }
  }

  /**
   * Generate QR code prefix for event
   */
  generateQRCodePrefix(eventName) {
    const cleanName = eventName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10);
    const timestamp = Date.now().toString(36).toUpperCase();
    return `EVENT-${cleanName}-${timestamp}`;
  }

  /**
   * Generate unique event QR code
   */
  async generateEventQRCode(eventId) {
    try {
      // Get event QR prefix
      const event = await db.query(
        'SELECT qr_code_prefix FROM events WHERE id = $1',
        [eventId]
      );

      if (event.rows.length === 0) {
        throw new Error('Event not found');
      }

      const prefix = event.rows[0].qr_code_prefix;
      const uniqueId = crypto.randomBytes(4).toString('hex').toUpperCase();
      return `${prefix}-${uniqueId}`;
    } catch (error) {
      loggingService.logError('Failed to generate event QR code', error);
      throw error;
    }
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(eventId, estateId) {
    try {
      const result = await this.getEventWithAnalytics(eventId, estateId);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      loggingService.logError('Failed to get event statistics', error);
      throw error;
    }
  }
}

export default new EventManagementService();
