/**
 * Event Management Routes
 * Phase 4.1: Event management, bulk invitations, and RSVP tracking
 *
 * Endpoints:
 * - POST /api/events - Create event
 * - GET /api/events - List events
 * - GET /api/events/:id - Get event details
 * - PUT /api/events/:id - Update event
 * - DELETE /api/events/:id - Delete event
 * - POST /api/events/:id/invitations - Add single visitor
 * - POST /api/events/:id/bulk-invitations - Bulk CSV upload
 * - POST /api/events/:id/send-invitations - Send invitations
 * - GET /api/events/:id/attendees - Get attendees
 * - GET /api/events/:id/statistics - Get event stats
 * - POST /api/events/rsvp - Handle RSVP
 * - POST /api/events/check-in - Check in with QR code
 * - POST /api/events/check-out - Check out with QR code
 */

import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import eventManagementService from '../services/eventManagementService.js';
import loggingService from '../services/loggingService.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for CSV upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// ============================================================================
// EVENT CRUD OPERATIONS
// ============================================================================

/**
 * @route POST /api/events
 * @desc Create a new event
 * @access Admin, Resident (host)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { body, user } = req;

    // Validate required fields
    if (!body.name || !body.start_date || !body.end_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, start_date, end_date'
      });
    }

    const event = await eventManagementService.createEvent(
      body,
      user.id,
      user.estate_id
    );

    loggingService.logInfo('Event created via API', {
      eventId: event.id,
      userId: user.id
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully'
    });
  } catch (error) {
    loggingService.logError('Failed to create event via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event'
    });
  }
});

/**
 * @route GET /api/events
 * @desc Get all events for user's estate
 * @access Authenticated
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { user, query } = req;

    const filters = {
      status: query.status,
      event_type: query.event_type,
      upcoming: query.upcoming === 'true',
      past: query.past === 'true',
      limit: query.limit ? parseInt(query.limit) : undefined
    };

    const events = await eventManagementService.getEventsByEstate(
      user.estate_id,
      filters
    );

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    loggingService.logError('Failed to get events via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve events'
    });
  }
});

/**
 * @route GET /api/events/:id
 * @desc Get event by ID with analytics
 * @access Authenticated
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const event = await eventManagementService.getEventById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    loggingService.logError('Failed to get event via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve event'
    });
  }
});

/**
 * @route PUT /api/events/:id
 * @desc Update event
 * @access Admin, Event Host
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { body, user } = req;

    // Check if user is host or admin
    const event = await eventManagementService.getEventById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    if (event.host_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to update this event'
      });
    }

    const updated = await eventManagementService.updateEvent(id, body);

    res.json({
      success: true,
      data: updated,
      message: 'Event updated successfully'
    });
  } catch (error) {
    loggingService.logError('Failed to update event via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event'
    });
  }
});

/**
 * @route DELETE /api/events/:id
 * @desc Delete event
 * @access Admin, Event Host
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Check permissions
    const event = await eventManagementService.getEventById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    if (event.host_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to delete this event'
      });
    }

    await eventManagementService.deleteEvent(id);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    loggingService.logError('Failed to delete event via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    });
  }
});

// ============================================================================
// INVITATIONS & BULK UPLOAD
// ============================================================================

/**
 * @route POST /api/events/:id/invitations
 * @desc Add single visitor to event
 * @access Admin, Event Host
 */
router.post('/:id/invitations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req;

    if (!body.visitor_name || !body.visitor_email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: visitor_name, visitor_email'
      });
    }

    const invitation = await eventManagementService.addVisitorToEvent(id, body);

    res.status(201).json({
      success: true,
      data: invitation,
      message: 'Visitor added to event successfully'
    });
  } catch (error) {
    loggingService.logError('Failed to add visitor to event via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add visitor to event'
    });
  }
});

/**
 * @route POST /api/events/:id/bulk-invitations
 * @desc Upload CSV file with bulk invitations OR send JSON array
 * @access Admin, Event Host
 */
router.post('/:id/bulk-invitations', authenticateToken, upload.single('csv'), async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Handle JSON input (for programmatic/test access)
    if (req.body && req.body.invitations && Array.isArray(req.body.invitations)) {
      try {
        if (req.body.invitations.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Invitations array is empty'
          });
        }

        // Process bulk invitations from JSON
        const result = await eventManagementService.processBulkInvitations(
          id,
          req.body.invitations,
          user.id
        );

        return res.json({
          success: true,
          data: result,
          message: `Processed ${result.successful + result.failed} invitations (${result.successful} successful, ${result.failed} failed)`
        });
      } catch (error) {
        loggingService.logError('Failed to process bulk invitations from JSON', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to process bulk invitations'
        });
      }
    }

    // Handle CSV file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file uploaded or invitations array provided'
      });
    }

    // Parse CSV
    const csvData = [];
    const stream = Readable.from(req.file.buffer);

    stream
      .pipe(csv())
      .on('data', (row) => {
        csvData.push(row);
      })
      .on('end', async () => {
        try {
          if (csvData.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'CSV file is empty'
            });
          }

          // Process bulk invitations
          const result = await eventManagementService.processBulkInvitations(
            id,
            csvData,
            user.id
          );

          res.json({
            success: true,
            data: result,
            message: `Processed ${result.successful + result.failed} invitations (${result.successful} successful, ${result.failed} failed)`
          });
        } catch (error) {
          loggingService.logError('Failed to process bulk invitations', error);
          res.status(500).json({
            success: false,
            error: 'Failed to process bulk invitations'
          });
        }
      })
      .on('error', (error) => {
        loggingService.logError('CSV parsing error', error);
        res.status(400).json({
          success: false,
          error: 'Invalid CSV file format'
        });
      });
  } catch (error) {
    loggingService.logError('Failed to upload bulk invitations via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload bulk invitations'
    });
  }
});

/**
 * @route POST /api/events/:id/send-invitations
 * @desc Send invitations to all pending visitors
 * @access Admin, Event Host
 */
router.post('/:id/send-invitations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await eventManagementService.sendEventInvitations(id);

    res.json({
      success: true,
      data: result,
      message: `${result.sent} invitations sent successfully`
    });
  } catch (error) {
    loggingService.logError('Failed to send invitations via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send invitations'
    });
  }
});

// ============================================================================
// ATTENDEE MANAGEMENT
// ============================================================================

/**
 * @route GET /api/events/:id/attendees
 * @desc Get event attendees with filters
 * @access Admin, Event Host
 */
router.get('/:id/attendees', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { query } = req;

    const filters = {
      rsvp_status: query.rsvp_status,
      checked_in: query.checked_in ? query.checked_in === 'true' : undefined
    };

    const attendees = await eventManagementService.getEventAttendees(id, filters);

    res.json({
      success: true,
      data: attendees,
      count: attendees.length
    });
  } catch (error) {
    loggingService.logError('Failed to get attendees via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve attendees'
    });
  }
});

/**
 * @route GET /api/events/:id/statistics
 * @desc Get event statistics
 * @access Admin, Event Host
 */
router.get('/:id/statistics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await eventManagementService.getEventStatistics(id);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    loggingService.logError('Failed to get event statistics via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve event statistics'
    });
  }
});

// ============================================================================
// RSVP & CHECK-IN
// ============================================================================

/**
 * @route POST /api/events/rsvp
 * @desc Handle RSVP from visitor
 * @access Public (with event QR code)
 */
router.post('/rsvp', async (req, res) => {
  try {
    const { event_visitor_id, rsvp_status, plus_one_count, plus_one_names, rsvp_token } = req.body;

    // Require RSVP token for security
    if (!rsvp_token) {
      return res.status(400).json({
        success: false,
        error: 'RSVP token required'
      });
    }

    if (!event_visitor_id || !rsvp_status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: event_visitor_id, rsvp_status'
      });
    }

    if (!['attending', 'not_attending', 'maybe'].includes(rsvp_status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid RSVP status'
      });
    }

    // Validate RSVP token matches event_visitor_id
    const isValid = await eventManagementService.validateRSVPToken(
      event_visitor_id,
      rsvp_token
    );

    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: 'Invalid RSVP token'
      });
    }

    await eventManagementService.handleRSVP(event_visitor_id, rsvp_status, {
      plus_one_count,
      plus_one_names
    });

    res.json({
      success: true,
      message: 'RSVP recorded successfully'
    });
  } catch (error) {
    loggingService.logError('Failed to handle RSVP via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record RSVP'
    });
  }
});

/**
 * @route POST /api/events/check-in
 * @desc Check in to event with QR code
 * @access Guard
 */
router.post('/check-in', authenticateToken, requireRole(['guard', 'admin']), async (req, res) => {
  try {
    const { event_qr_code } = req.body;

    if (!event_qr_code) {
      return res.status(400).json({
        success: false,
        error: 'Missing event QR code'
      });
    }

    const result = await eventManagementService.checkInToEvent(event_qr_code);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Check-in successful'
    });
  } catch (error) {
    loggingService.logError('Failed to check in via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check in'
    });
  }
});

/**
 * @route POST /api/events/check-out
 * @desc Check out from event with QR code
 * @access Guard
 */
router.post('/check-out', authenticateToken, requireRole(['guard', 'admin']), async (req, res) => {
  try {
    const { event_qr_code } = req.body;

    if (!event_qr_code) {
      return res.status(400).json({
        success: false,
        error: 'Missing event QR code'
      });
    }

    const result = await eventManagementService.checkOutFromEvent(event_qr_code);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Check-out successful'
    });
  } catch (error) {
    loggingService.logError('Failed to check out via API', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check out'
    });
  }
});

// ============================================================================
// CALENDAR INTEGRATION (Phase 4.2)
// ============================================================================

/**
 * @route GET /api/events/:id/calendar
 * @desc Download .ics calendar file for event
 * @access Public (with optional invitation code)
 */
router.get('/:id/calendar', async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.query;

    // Require invitation code for security
    if (!code) {
      return res.status(401).json({
        success: false,
        error: 'Invitation code required to download calendar'
      });
    }

    // Get event
    const eventResult = await eventManagementService.getEventById(id);
    if (!eventResult) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Validate invitation code for this event
    const invitationResult = await eventManagementService.getEventAttendees(id, {});
    const invitation = invitationResult.find(inv => inv.event_qr_code === code);

    if (!invitation) {
      return res.status(403).json({
        success: false,
        error: 'Invalid invitation code for this event'
      });
    }

    // Generate calendar file
    const calendarService = (await import('../services/calendarService.js')).default;
    const icsContent = calendarService.generateEventCalendar(eventResult, invitation);

    // Send as downloadable file
    const filename = `${eventResult.name.replace(/[^a-z0-9]/gi, '_')}.ics`;

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(icsContent);
  } catch (error) {
    loggingService.logError('Failed to generate calendar file', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate calendar file'
    });
  }
});

export default router;
