/**
 * @file integrationsController.js
 * @description API endpoints for webhooks, automation rules, and API keys
 * Phase A5: Multi-Site, Integrations & Automation
 */

import * as crypto from 'crypto';
import { dbManager as db } from '../database/db.enhanced.js'; // Migrated from database-wrapper
import logger from '../config/logger.js';
import { testWebhook } from '../services/webhookService.js';

const pool = db.pool || db;

// ==================== WEBHOOKS ====================

/**
 * Get all webhooks
 */
export const getWebhooks = async (req, res) => {
  try {
    const siteId = req.user.site_id;

    const result = await pool.query(
      `SELECT * FROM webhooks
       WHERE site_id = $1 OR $1 IS NULL
       ORDER BY created_at DESC`,
      [siteId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
};

/**
 * Create webhook
 */
export const createWebhook = async (req, res) => {
  try {
    const { name, url, event_type, secret, headers, enabled } = req.body;
    const siteId = req.user.site_id;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO webhooks (
        site_id, name, url, event_type, secret, headers, enabled, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [siteId, name, url, event_type, secret, headers, enabled, userId]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
};

/**
 * Update webhook
 */
export const updateWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, event_type, secret, headers, enabled } = req.body;

    const result = await pool.query(
      `UPDATE webhooks
       SET name = $1, url = $2, event_type = $3, secret = $4,
           headers = $5, enabled = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, url, event_type, secret, headers, enabled, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error updating webhook:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
};

/**
 * Delete webhook
 */
export const deleteWebhook = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM webhooks WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
};

/**
 * Test webhook
 */
export const testWebhookEndpoint = async (req, res) => {
  try {
    const { id } = req.params;

    const success = await testWebhook(parseInt(id));

    res.json({
      success,
      message: success ? 'Webhook test successful' : 'Webhook test failed'
    });

  } catch (error) {
    logger.error('Error testing webhook:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
};

// ==================== AUTOMATION RULES ====================

/**
 * Get all automation rules
 */
export const getAutomationRules = async (req, res) => {
  try {
    const siteId = req.user.site_id;

    const result = await pool.query(
      `SELECT * FROM automation_rules
       WHERE site_id = $1 OR $1 IS NULL
       ORDER BY priority DESC, created_at DESC`,
      [siteId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching automation rules:', error);
    res.status(500).json({ error: 'Failed to fetch automation rules' });
  }
};

/**
 * Create automation rule
 */
export const createAutomationRule = async (req, res) => {
  try {
    const { name, description, trigger_event, conditions, actions, enabled, priority } = req.body;
    const siteId = req.user.site_id;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO automation_rules (
        site_id, name, description, trigger_event, conditions,
        actions, enabled, priority, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [siteId, name, description, trigger_event, conditions, actions, enabled, priority, userId]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error creating automation rule:', error);
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
};

/**
 * Update automation rule
 */
export const updateAutomationRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, trigger_event, conditions, actions, enabled, priority } = req.body;

    const result = await pool.query(
      `UPDATE automation_rules
       SET name = $1, description = $2, trigger_event = $3, conditions = $4,
           actions = $5, enabled = $6, priority = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [name, description, trigger_event, conditions, actions, enabled, priority, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error updating automation rule:', error);
    res.status(500).json({ error: 'Failed to update automation rule' });
  }
};

/**
 * Delete automation rule
 */
export const deleteAutomationRule = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM automation_rules WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json({
      success: true,
      message: 'Automation rule deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting automation rule:', error);
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
};

// ==================== API KEYS ====================

/**
 * Get all API keys
 */
export const getAPIKeys = async (req, res) => {
  try {
    const siteId = req.user.site_id;

    const result = await pool.query(
      `SELECT id, name, description, key_prefix, permissions, scopes,
              rate_limit_per_hour, rate_limit_per_day, last_used_at,
              usage_count, active, expires_at, created_at
       FROM api_keys
       WHERE site_id = $1 OR $1 IS NULL
       ORDER BY created_at DESC`,
      [siteId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
};

/**
 * Generate new API key
 */
export const generateAPIKey = async (req, res) => {
  try {
    const { name, description, permissions, scopes, rate_limit_per_hour, rate_limit_per_day, expires_at } = req.body;
    const siteId = req.user.site_id;
    const userId = req.user.id;

    // Generate API key
    const apiKey = `sgk_${crypto.randomBytes(32).toString('hex')}`;
    const keyPrefix = apiKey.substring(0, 12);
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const result = await pool.query(
      `INSERT INTO api_keys (
        site_id, key_hash, key_prefix, name, description, permissions,
        scopes, rate_limit_per_hour, rate_limit_per_day, expires_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, name, key_prefix, permissions, rate_limit_per_hour`,
      [siteId, keyHash, keyPrefix, name, description, permissions, scopes, 
       rate_limit_per_hour || 100, rate_limit_per_day || 1000, expires_at, userId]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        api_key: apiKey // Return the full key ONLY once during creation
      },
      message: 'API key generated successfully. Save this key - you won\'t be able to see it again.'
    });

  } catch (error) {
    logger.error('Error generating API key:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
};

/**
 * Revoke API key
 */
export const revokeAPIKey = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE api_keys
       SET active = FALSE, revoked_at = CURRENT_TIMESTAMP, revoked_by = $1
       WHERE id = $2
       RETURNING id`,
      [userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });

  } catch (error) {
    logger.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
};

// ==================== SITES ====================

/**
 * Get all sites
 */
export const getSites = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sites
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching sites:', error);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
};

/**
 * Create site
 */
export const createSite = async (req, res) => {
  try {
    const {
      name, code, description, address, city, country, timezone,
      logo_url, primary_color, secondary_color, settings, features,
      active, subscription_tier
    } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO sites (
        name, code, description, address, city, country, timezone,
        logo_url, primary_color, secondary_color, settings, features,
        active, subscription_tier, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        name, code, description, address, city, country || 'Kenya', timezone || 'Africa/Nairobi',
        logo_url, primary_color || '#667eea', secondary_color || '#764ba2',
        settings || {}, features || {}, active !== false, subscription_tier || 'basic', userId
      ]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error creating site:', error);
    res.status(500).json({ error: 'Failed to create site' });
  }
};

/**
 * Update site
 */
export const updateSite = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, code, description, address, city, timezone,
      logo_url, primary_color, secondary_color, settings, features,
      active, subscription_tier
    } = req.body;

    const result = await pool.query(
      `UPDATE sites
       SET name = $1, code = $2, description = $3, address = $4, city = $5,
           timezone = $6, logo_url = $7, primary_color = $8, secondary_color = $9,
           settings = $10, features = $11, active = $12, subscription_tier = $13,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [
        name, code, description, address, city, timezone, logo_url,
        primary_color, secondary_color, settings, features, active,
        subscription_tier, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error updating site:', error);
    res.status(500).json({ error: 'Failed to update site' });
  }
};

/**
 * Switch to site (update user's site context)
 */
export const switchSite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Update user's current site
    await pool.query(
      'UPDATE users SET site_id = $1 WHERE id = $2',
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Site switched successfully'
    });

  } catch (error) {
    logger.error('Error switching site:', error);
    res.status(500).json({ error: 'Failed to switch site' });
  }
};

export default {
  // Webhooks
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhookEndpoint,
  // Automation
  getAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  // API Keys
  getAPIKeys,
  generateAPIKey,
  revokeAPIKey,
  // Sites
  getSites,
  createSite,
  updateSite,
  switchSite
};
