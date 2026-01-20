import express from 'express';
import { dbManager } from '../database/db.enhanced.js';
import { authenticateToken, requireEstate, requireRole } from '../middleware/authMiddleware.js';
import { maskEmail, maskPhone } from '../utils/redaction.js';

const router = express.Router();

// Store active SSE connections
const connections = new Map();

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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const connectionId = Date.now() + Math.random();
  const connection = {
    id: connectionId,
    response: res,
    lastHeartbeat: Date.now()
  };

  connections.set(connectionId, connection);

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'connected', id: connectionId })}\n\n`);

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    if (connections.has(connectionId)) {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
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
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  connections.forEach((connection, id) => {
    try {
      connection.response.write(message);
    } catch (error) {
      console.error(`Error sending SSE to connection ${id}:`, error);
      connections.delete(id);
    }
  });
};

// Function to broadcast visitor status updates
export const broadcastVisitorUpdate = (visitorId, status, action) => {
  broadcastToGuards({
    type: 'visitor_update',
    visitorId,
    status,
    action,
    timestamp: new Date().toISOString()
  });
};

// Function to broadcast new visitor
export const broadcastNewVisitor = (visitor) => {
  const maskedVisitor = maskVisitorContact(visitor);
  broadcastToGuards({
    type: 'new_visitor',
    visitor: maskedVisitor,
    timestamp: new Date().toISOString()
  });
};

// Function to broadcast visitor check-in/out
export const broadcastVisitorCheckIn = (visitorId, action) => {
  broadcastToGuards({
    type: 'visitor_checkin',
    visitorId,
    action,
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
