/**
 * Directions Service
 * Phase 2.3: Privacy-Preserving Visitor Directions
 * 
 * Privacy Controls:
 * - We don't track visitor location (maps app handles that)
 * - Only general gate coordinates shared (publicly available anyway)
 * - Custom instructions visible only to invited visitor
 * - No building/unit-specific coordinates
 */

import { pool } from '../database/connection.js';

/**
 * Get estate gate location (public info)
 */
export async function getEstateLocation(estateId = 1) {
  const result = await pool.query(
    `SELECT 
      gate_latitude, 
      gate_longitude, 
      gate_name,
      directions_from_highway,
      directions_from_city
     FROM estate_locations
     WHERE estate_id = $1`,
    [estateId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Update estate location (Admin only)
 */
export async function updateEstateLocation(estateId, {
  gateName,
  gateLatitude,
  gateLongitude,
  directionsFromHighway,
  directionsFromCity
}) {
  const result = await pool.query(
    `UPDATE estate_locations SET
      gate_name = COALESCE($2, gate_name),
      gate_latitude = COALESCE($3, gate_latitude),
      gate_longitude = COALESCE($4, gate_longitude),
      directions_from_highway = COALESCE($5, directions_from_highway),
      directions_from_city = COALESCE($6, directions_from_city),
      updated_at = NOW()
     WHERE estate_id = $1
     RETURNING *`,
    [estateId, gateName, gateLatitude, gateLongitude, directionsFromHighway, directionsFromCity]
  );
  
  return result.rows[0];
}

/**
 * Add custom directions for a visitor invite
 */
export async function addCustomDirections(visitorId, customInstructions, residentId) {
  // Verify the visitor belongs to this resident
  const check = await pool.query(
    'SELECT id, created_by FROM visitors WHERE id = $1',
    [visitorId]
  );
  
  if (check.rows.length === 0) {
    return { success: false, error: 'Visitor not found' };
  }
  
  // Insert or update directions
  await pool.query(
    `INSERT INTO visitor_directions (visitor_id, custom_instructions)
     VALUES ($1, $2)
     ON CONFLICT (visitor_id) DO UPDATE SET custom_instructions = $2`,
    [visitorId, customInstructions]
  );
  
  return { success: true, message: 'Custom directions added' };
}

/**
 * Get directions for visitor (used in invite page)
 * Privacy: Only returns info for specific invite
 */
export async function getVisitorDirections(visitorId, inviteToken) {
  // Verify invite token
  const visitorCheck = await pool.query(
    `SELECT v.id, v.invite_code, v.status, u.username as host_name, u.house
     FROM visitors v
     JOIN users u ON v.created_by = u.email OR v.created_by::text = u.id::text
     WHERE v.id = $1 AND v.invite_code = $2`,
    [visitorId, inviteToken]
  );
  
  if (visitorCheck.rows.length === 0) {
    return { success: false, error: 'Invalid invite or visitor not found' };
  }
  
  const visitor = visitorCheck.rows[0];
  
  // Get estate location
  const estate = await getEstateLocation(1);
  
  // Get custom directions if any
  const customResult = await pool.query(
    'SELECT custom_instructions FROM visitor_directions WHERE visitor_id = $1',
    [visitorId]
  );
  
  return {
    success: true,
    directions: {
      // General gate info (publicly available)
      gate: {
        name: estate?.gate_name || 'Main Gate',
        latitude: estate?.gate_latitude,
        longitude: estate?.gate_longitude
      },
      // Standard directions
      fromHighway: estate?.directions_from_highway,
      fromCity: estate?.directions_from_city,
      // Custom instructions from host (visible only to this visitor)
      customInstructions: customResult.rows[0]?.custom_instructions,
      // Host info (minimal)
      hostName: visitor.host_name,
      // Privacy: Don't include exact unit location
      buildingArea: visitor.house?.split('-')[0] || 'Please ask at gate'
    },
    // Deep links for map apps
    mapLinks: {
      google: estate?.gate_latitude && estate?.gate_longitude
        ? `https://www.google.com/maps/search/?api=1&query=${estate.gate_latitude},${estate.gate_longitude}`
        : null,
      apple: estate?.gate_latitude && estate?.gate_longitude
        ? `https://maps.apple.com/?q=${estate.gate_latitude},${estate.gate_longitude}`
        : null,
      waze: estate?.gate_latitude && estate?.gate_longitude
        ? `https://waze.com/ul?ll=${estate.gate_latitude},${estate.gate_longitude}&navigate=yes`
        : null
    },
    privacyNotice: 'Directions are to the estate gate only. Your location is handled by your maps app, not by us.'
  };
}

/**
 * Generate shareable directions link (for visitor to share with driver)
 */
export async function generateShareableLink(visitorId) {
  const estate = await getEstateLocation(1);
  
  if (!estate?.gate_latitude || !estate?.gate_longitude) {
    return { success: false, error: 'Estate location not configured' };
  }
  
  // Google Maps link is universally shareable
  const shareableLink = `https://www.google.com/maps/search/?api=1&query=${estate.gate_latitude},${estate.gate_longitude}`;
  
  return {
    success: true,
    link: shareableLink,
    gateName: estate.gate_name,
    privacyNotice: 'This link shows the gate location only, not the specific unit.'
  };
}

/**
 * Delete custom directions (Privacy control)
 */
export async function deleteCustomDirections(visitorId, residentId) {
  // Verify ownership through visitor
  const check = await pool.query(
    `SELECT v.id FROM visitors v
     JOIN users u ON v.created_by = u.email OR v.created_by::text = u.id::text
     WHERE v.id = $1 AND u.id = $2`,
    [visitorId, residentId]
  );
  
  if (check.rows.length === 0) {
    return { success: false, error: 'Visitor not found or access denied' };
  }
  
  await pool.query(
    'DELETE FROM visitor_directions WHERE visitor_id = $1',
    [visitorId]
  );
  
  return { success: true, message: 'Custom directions deleted' };
}

export default {
  getEstateLocation,
  updateEstateLocation,
  addCustomDirections,
  getVisitorDirections,
  generateShareableLink,
  deleteCustomDirections
};
