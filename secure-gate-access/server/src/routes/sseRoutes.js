import express from 'express';
import { dbManager } from '../database/db.enhanced.js';
import { authenticateToken, requireEstate, requireRole } from '../middleware/authMiddleware.js';
import { maskEmail, maskPhone } from '../utils/redaction.js';

const router = express.Router();

// Store active SSE connections
const connections = new Map();

const resolveSseEventName = (payload = {}) => {
  const rawType = payload.event || payload.type;

  if (!rawType || typeof rawType !== 'string') {
    return null;
  }

  if (rawType === 'visitor_checkin') {
    return payload.action === 'checkout' ? 'visitor.check_out' : 'visitor.check_in';
  }

  if (rawType === 'visitor_update') {
    return payload.action === 'checkout' ? 'visitor.check_out' : 'visitor.check_in';
  }

  if (rawType === 'new_visitor') {
    return 'visitor.arrival';
  }

  if (rawType.includes('.') || rawType.includes(':')) {
    return rawType;
  }

  return rawType.toLowerCase().replace(/_/g, '.');
};

// Test endpoint to check if routes are accessible
router.get('/test', (req, res) => {
  res.json({ message: 'SSE routes are accessible', timestamp: new Date().toISOString() });
});

// SSE endpoint for guards
router.get('/guards', authenticateToken, requireRole(['guard', 'admin', 'super_admin']), requireEstate, (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const connectionId = Date.now() + Math.random();
  const connection = {
    id: connectionId,
    response: res,
    estateId: req.user?.estate_id || null,
    role: req.user?.role || null,
    lastHeartbeat: Date.now()
  };

  connections.set(connectionId, connection);

  // Send initial connection confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({
    type: 'connected',
    id: connectionId,
    estateId: connection.estateId
  })}\n\n`);

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    if (connections.has(connectionId)) {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    connections.delete(connectionId);
    clearInterval(heartbeat);
  });

  // Handle client error
  req.on('error', (err) => {
    console.error('SSE connection error:', err);
    connections.delete(connectionId);
    clearInterval(heartbeat);
  });
});

// Function to broadcast updates to all connected guards
export const broadcastToGuards = (data) => {
  const eventName = resolveSseEventName(data);
  const estateId = data?.estateId || data?.estate_id || data?.visitor?.estate_id || null;
  const payload = JSON.stringify(data);
  const message = eventName
    ? `event: ${eventName}\ndata: ${payload}\n\n`
    : `data: ${payload}\n\n`;
  
  connections.forEach((connection, id) => {
    if (estateId && connection.estateId && String(connection.estateId) !== String(estateId)) {
      return;
    }

    try {
      connection.response.write(message);
    } catch (error) {
      console.error(`Error sending SSE to connection ${id}:`, error);
      connections.delete(id);
    }
  });
};

// Function to broadcast visitor status updates
export const broadcastVisitorUpdate = (visitorId, status, action, estateId = null) => {
  broadcastToGuards({
    type: 'visitor_update',
    visitorId,
    status,
    action,
    estateId,
    timestamp: new Date().toISOString()
  });
};

// Function to broadcast new visitor
export const broadcastNewVisitor = (visitor) => {
  const maskedVisitor = maskVisitorContact(visitor);
  const estateId = visitor?.estate_id || visitor?.estateId || null;
  broadcastToGuards({
    type: 'new_visitor',
    visitor: maskedVisitor,
    estateId,
    timestamp: new Date().toISOString()
  });
};

// Function to broadcast visitor check-in/out
export const broadcastVisitorCheckIn = (visitorId, action, estateId = null) => {
  broadcastToGuards({
    type: 'visitor_checkin',
    visitorId,
    action,
    estateId,
    timestamp: new Date().toISOString()
  });
};

const maskVisitorContact = (visitor) => {
  if (!visitor || typeof visitor !== 'object') {
    return visitor;
  }

  const masked = { ...visitor };
  if (typeof masked.email === 'string') {
    masked.email = maskEmail(masked.email);
  }
  if (typeof masked.phone === 'string') {
    masked.phone = maskPhone(masked.phone);
  }

  return masked;
};

export default router;
