/**
 * @fileoverview Favorite Visitor Service
 * @description Backend service for managing resident's favorite/frequent visitors
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

const db = require('../config/database');

/**
 * Favorite Visitor Service
 * Provides CRUD operations for managing favorite visitors
 */
const favoriteVisitorService = {
  /**
   * Get all favorite visitors for a resident
   * @param {number} residentId - The resident's user ID
   * @returns {Promise<Array>} List of favorite visitors
   */
  async getFavorites(residentId) {
    const query = `
      SELECT 
        fv.id,
        fv.visitor_name,
        fv.visitor_phone,
        fv.visitor_email,
        fv.relationship,
        fv.notes,
        fv.visit_count,
        fv.last_visit,
        fv.created_at,
        fv.updated_at
      FROM favorite_visitors fv
      WHERE fv.resident_id = $1
      ORDER BY fv.visit_count DESC, fv.visitor_name ASC
    `;
    
    const result = await db.query(query, [residentId]);
    return result.rows;
  },

  /**
   * Get a single favorite visitor by ID
   * @param {number} favoriteId - The favorite visitor ID
   * @param {number} residentId - The resident's user ID (for authorization)
   * @returns {Promise<Object|null>} Favorite visitor or null
   */
  async getFavoriteById(favoriteId, residentId) {
    const query = `
      SELECT 
        id, visitor_name, visitor_phone, visitor_email,
        relationship, notes, visit_count, last_visit,
        created_at, updated_at
      FROM favorite_visitors
      WHERE id = $1 AND resident_id = $2
    `;
    
    const result = await db.query(query, [favoriteId, residentId]);
    return result.rows[0] || null;
  },

  /**
   * Add a new favorite visitor
   * @param {number} residentId - The resident's user ID
   * @param {Object} visitorData - Visitor information
   * @returns {Promise<Object>} Created favorite visitor
   */
  async addFavorite(residentId, visitorData) {
    const { visitor_name, visitor_phone, visitor_email, relationship, notes } = visitorData;
    
    // Check if already exists
    const existingQuery = `
      SELECT id FROM favorite_visitors 
      WHERE resident_id = $1 AND (visitor_phone = $2 OR visitor_email = $3)
    `;
    const existing = await db.query(existingQuery, [residentId, visitor_phone, visitor_email]);
    
    if (existing.rows.length > 0) {
      throw new Error('This visitor is already in your favorites');
    }
    
    const insertQuery = `
      INSERT INTO favorite_visitors 
        (resident_id, visitor_name, visitor_phone, visitor_email, relationship, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, visitor_name, visitor_phone, visitor_email, relationship, notes, 
                visit_count, last_visit, created_at, updated_at
    `;
    
    const result = await db.query(insertQuery, [
      residentId, 
      visitor_name, 
      visitor_phone || null, 
      visitor_email || null, 
      relationship || 'Guest',
      notes || null
    ]);
    
    return result.rows[0];
  },

  /**
   * Update a favorite visitor
   * @param {number} favoriteId - The favorite visitor ID
   * @param {number} residentId - The resident's user ID (for authorization)
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated favorite visitor
   */
  async updateFavorite(favoriteId, residentId, updateData) {
    const { visitor_name, visitor_phone, visitor_email, relationship, notes } = updateData;
    
    const query = `
      UPDATE favorite_visitors 
      SET 
        visitor_name = COALESCE($3, visitor_name),
        visitor_phone = COALESCE($4, visitor_phone),
        visitor_email = COALESCE($5, visitor_email),
        relationship = COALESCE($6, relationship),
        notes = COALESCE($7, notes),
        updated_at = NOW()
      WHERE id = $1 AND resident_id = $2
      RETURNING id, visitor_name, visitor_phone, visitor_email, relationship, notes,
                visit_count, last_visit, created_at, updated_at
    `;
    
    const result = await db.query(query, [
      favoriteId,
      residentId,
      visitor_name || null,
      visitor_phone || null,
      visitor_email || null,
      relationship || null,
      notes || null
    ]);
    
    if (result.rows.length === 0) {
      throw new Error('Favorite visitor not found');
    }
    
    return result.rows[0];
  },

  /**
   * Remove a favorite visitor
   * @param {number} favoriteId - The favorite visitor ID
   * @param {number} residentId - The resident's user ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  async removeFavorite(favoriteId, residentId) {
    const query = `
      DELETE FROM favorite_visitors 
      WHERE id = $1 AND resident_id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [favoriteId, residentId]);
    return result.rows.length > 0;
  },

  /**
   * Increment visit count and update last visit time
   * @param {number} favoriteId - The favorite visitor ID
   * @param {number} residentId - The resident's user ID
   * @returns {Promise<Object>} Updated favorite visitor
   */
  async recordVisit(favoriteId, residentId) {
    const query = `
      UPDATE favorite_visitors 
      SET 
        visit_count = visit_count + 1,
        last_visit = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND resident_id = $2
      RETURNING id, visitor_name, visit_count, last_visit
    `;
    
    const result = await db.query(query, [favoriteId, residentId]);
    return result.rows[0] || null;
  },

  /**
   * Find favorite by phone or email (for quick invite)
   * @param {number} residentId - The resident's user ID
   * @param {string} searchTerm - Phone or email to search
   * @returns {Promise<Object|null>} Matching favorite visitor or null
   */
  async findFavoriteByContact(residentId, searchTerm) {
    const query = `
      SELECT 
        id, visitor_name, visitor_phone, visitor_email,
        relationship, notes, visit_count, last_visit
      FROM favorite_visitors
      WHERE resident_id = $1 
        AND (visitor_phone = $2 OR visitor_email = $2)
    `;
    
    const result = await db.query(query, [residentId, searchTerm]);
    return result.rows[0] || null;
  },

  /**
   * Search favorites by name
   * @param {number} residentId - The resident's user ID
   * @param {string} searchTerm - Name to search
   * @returns {Promise<Array>} Matching favorite visitors
   */
  async searchFavorites(residentId, searchTerm) {
    const query = `
      SELECT 
        id, visitor_name, visitor_phone, visitor_email,
        relationship, notes, visit_count, last_visit
      FROM favorite_visitors
      WHERE resident_id = $1 
        AND visitor_name ILIKE $2
      ORDER BY visit_count DESC
      LIMIT 10
    `;
    
    const result = await db.query(query, [residentId, `%${searchTerm}%`]);
    return result.rows;
  },

  /**
   * Get most frequent visitors (top favorites)
   * @param {number} residentId - The resident's user ID
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} Top favorite visitors
   */
  async getTopFavorites(residentId, limit = 5) {
    const query = `
      SELECT 
        id, visitor_name, visitor_phone, visitor_email,
        relationship, visit_count, last_visit
      FROM favorite_visitors
      WHERE resident_id = $1 AND visit_count > 0
      ORDER BY visit_count DESC, last_visit DESC NULLS LAST
      LIMIT $2
    `;
    
    const result = await db.query(query, [residentId, limit]);
    return result.rows;
  },

  /**
   * Auto-add visitor to favorites after multiple visits
   * @param {number} residentId - The resident's user ID
   * @param {Object} visitorData - Visitor information from a visit
   * @returns {Promise<Object|null>} Created favorite or null if already exists
   */
  async autoAddFrequentVisitor(residentId, visitorData) {
    const { name, phone, email } = visitorData;
    
    // Check if already a favorite
    const existing = await this.findFavoriteByContact(residentId, phone || email);
    if (existing) {
      // Just record the visit
      return this.recordVisit(existing.id, residentId);
    }
    
    // Count previous visits by this person
    const countQuery = `
      SELECT COUNT(*) as visit_count
      FROM visitors
      WHERE resident_id = $1 
        AND (phone = $2 OR email = $3)
        AND status = 'checked_out'
    `;
    
    const countResult = await db.query(countQuery, [residentId, phone, email]);
    const visitCount = parseInt(countResult.rows[0]?.visit_count || 0);
    
    // Auto-add after 3+ visits
    if (visitCount >= 3) {
      try {
        return await this.addFavorite(residentId, {
          visitor_name: name,
          visitor_phone: phone,
          visitor_email: email,
          relationship: 'Frequent Visitor',
          notes: 'Automatically added after 3 visits'
        });
      } catch (err) {
        // Ignore if already exists
        return null;
      }
    }
    
    return null;
  }
};

module.exports = favoriteVisitorService;
