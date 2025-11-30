/**
 * @file integrationsRoutes.js
 * @description Routes for webhooks, automation, API keys, and sites
 */

import express from 'express';
import {
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
} from '../controllers/integrationsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ==================== WEBHOOKS ====================
router.get('/webhooks', getWebhooks);
router.post('/webhooks', createWebhook);
router.put('/webhooks/:id', updateWebhook);
router.delete('/webhooks/:id', deleteWebhook);
router.post('/webhooks/:id/test', testWebhookEndpoint);

// ==================== AUTOMATION RULES ====================
router.get('/automations', getAutomationRules);
router.post('/automations', createAutomationRule);
router.put('/automations/:id', updateAutomationRule);
router.delete('/automations/:id', deleteAutomationRule);

// ==================== API KEYS ====================
router.get('/api-keys', getAPIKeys);
router.post('/api-keys', generateAPIKey);
router.delete('/api-keys/:id', revokeAPIKey);

// ==================== SITES ====================
router.get('/sites', getSites);
router.post('/sites', createSite);
router.put('/sites/:id', updateSite);
router.get('/sites/:id/switch', switchSite);

export default router;
