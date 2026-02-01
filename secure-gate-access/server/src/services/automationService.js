/**
 * @file automationService.js
 * @description Automation rule execution engine
 * Evaluates conditions and executes actions based on triggers
 */

import { dbManager as db } from '../database/db.enhanced.js'; // Migrated from database-wrapper
import logger from '../config/logger.js';

import emailService from './emailService.js';

const pool = db.pool || db;

// Email wrapper for compatibility
const sendEmail = async (emailData) => {
  try {
    await emailService.sendEmail(emailData.to, emailData.subject, emailData.body);
    return { success: true };
  } catch (error) {
    logger.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Evaluate and execute automation rules for a trigger event
 * @param {string} triggerEvent - Event type (e.g., 'incident.created')
 * @param {object} triggerData - Event data
 * @param {number} siteId - Site ID
 * @returns {Promise<number>} Number of rules executed
 */
export async function evaluateAutomationRules(triggerEvent, triggerData, siteId = null) {
  // Feature flag check: ENABLE_AUTOMATIONS
  if (process.env.ENABLE_AUTOMATIONS !== 'true') {
    logger.debug('Automations are disabled via ENABLE_AUTOMATIONS flag');
    return 0;
  }

  try {
    // Get all enabled rules for this trigger
    const query = `
      SELECT * FROM automation_rules
      WHERE trigger_event = $1
        AND enabled = TRUE
        AND (site_id = $2 OR $2 IS NULL)
      ORDER BY priority DESC
    `;

    const result = await pool.query(query, [triggerEvent, siteId]);
    const rules = result.rows;

    if (rules.length === 0) {
      logger.debug(`No automation rules for event ${triggerEvent}`);
      return 0;
    }

    let executedCount = 0;

    // Execute each rule
    for (const rule of rules) {
      try {
        const executed = await executeRule(rule, triggerData);
        if (executed) {
          executedCount++;
        }
      } catch (error) {
        logger.error(`Error executing rule ${rule.id}:`, error);
        await logRuleExecution(rule.id, triggerEvent, triggerData, false, error.message);
      }
    }

    logger.info(`Executed ${executedCount} automation rules for event ${triggerEvent}`);
    return executedCount;

  } catch (error) {
    logger.error(`Error evaluating automation rules for ${triggerEvent}:`, error);
    return 0;
  }
}

/**
 * Execute a single automation rule
 */
async function executeRule(rule, triggerData) {
  const startTime = Date.now();

  try {
    // Evaluate conditions
    const conditionsMet = evaluateConditions(rule.conditions, triggerData);

    if (!conditionsMet) {
      logger.debug(`Rule ${rule.id} conditions not met`);
      await logRuleExecution(rule.id, rule.trigger_event, triggerData, false, 'Conditions not met');
      return false;
    }

    // Execute actions
    const actionResults = [];
    for (const action of rule.actions) {
      try {
        const result = await executeAction(action, triggerData, rule);
        actionResults.push({ action: action.type, success: true, result });
      } catch (error) {
        logger.error(`Action ${action.type} failed:`, error);
        actionResults.push({ action: action.type, success: false, error: error.message });
      }
    }

    const executionTime = Date.now() - startTime;

    // Update rule statistics
    await pool.query(
      `UPDATE automation_rules
       SET execution_count = execution_count + 1,
           success_count = success_count + 1,
           last_executed_at = CURRENT_TIMESTAMP,
           last_error = NULL
       WHERE id = $1`,
      [rule.id]
    );

    // Log execution
    await logRuleExecution(
      rule.id,
      rule.trigger_event,
      triggerData,
      true,
      null,
      actionResults,
      executionTime
    );

    logger.info(`Rule ${rule.id} executed successfully in ${executionTime}ms`);
    return true;

  } catch (error) {
    const executionTime = Date.now() - startTime;

    await pool.query(
      `UPDATE automation_rules
       SET execution_count = execution_count + 1,
           failure_count = failure_count + 1,
           last_executed_at = CURRENT_TIMESTAMP,
           last_error = $1
       WHERE id = $2`,
      [error.message, rule.id]
    );

    await logRuleExecution(rule.id, rule.trigger_event, triggerData, false, error.message, [], executionTime);

    throw error;
  }
}

/**
 * Evaluate rule conditions against trigger data
 */
function evaluateConditions(conditions, data) {
  try {
    // Support multiple condition types
    for (const [key, value] of Object.entries(conditions)) {
      if (Array.isArray(value)) {
        // Array means "one of these values"
        if (!value.includes(data[key])) {
          return false;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Object means nested conditions (operators)
        if (!evaluateComplexCondition(data[key], value)) {
          return false;
        }
      } else {
        // Direct equality
        if (data[key] !== value) {
          return false;
        }
      }
    }
    return true;
  } catch (error) {
    logger.error('Error evaluating conditions:', error);
    return false;
  }
}

/**
 * Evaluate complex conditions with operators
 */
function evaluateComplexCondition(value, condition) {
  if (condition.$gt !== undefined && value <= condition.$gt) return false;
  if (condition.$gte !== undefined && value < condition.$gte) return false;
  if (condition.$lt !== undefined && value >= condition.$lt) return false;
  if (condition.$lte !== undefined && value > condition.$lte) return false;
  if (condition.$ne !== undefined && value === condition.$ne) return false;
  if (condition.$in !== undefined && !condition.$in.includes(value)) return false;
  if (condition.$nin !== undefined && condition.$nin.includes(value)) return false;
  return true;
}

/**
 * Execute a single action
 */
async function executeAction(action, context, rule) {
  switch (action.type) {
    case 'assign':
      return await assignIncident(context.incident_id, action.assignTo, rule.id);

    case 'notify':
      return await sendNotification(action.notifyType, context, action);

    case 'email':
      return await sendEmailAction(action.recipients, context, action);

    case 'webhook':
      return await triggerWebhook(action.webhookId, context);

    case 'update_field':
      return await updateField(context, action.field, action.value);

    case 'create_task':
      return await createTask(context, action.taskData);

    case 'escalate':
      return await escalateIncident(context.incident_id, action.escalateTo);

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

/**
 * Action: Assign incident
 */
async function assignIncident(incidentId, assignTo, ruleId) {
  if (!incidentId) throw new Error('No incident_id in context');

  // Get user ID by role or specific user
  let userId;
  if (assignTo === 'security_lead') {
    const result = await pool.query(
      `SELECT u.id FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.name = 'security_lead'
       LIMIT 1`
    );
    userId = result.rows[0]?.id;
  } else {
    userId = assignTo; // Assume it's a user ID
  }

  if (!userId) throw new Error('Could not find user to assign to');

  await pool.query(
    `UPDATE incidents
     SET assigned_to = $1,
         assigned_at = CURRENT_TIMESTAMP,
         assigned_by = $2
     WHERE id = $3`,
    [userId, ruleId, incidentId]
  );

  logger.info(`Incident ${incidentId} assigned to user ${userId} by automation`);
  return { incidentId, assignedTo: userId };
}

/**
 * Action: Send notification
 */
async function sendNotification(notifyType, context, action) {
  // Integration with notification service
  const notification = {
    type: notifyType,
    channel: action.channel,
    message: action.message || `Automation triggered: ${context.trigger_event}`,
    context
  };

  // Log notification (actual sending would be done by notification service)
  logger.info(`Notification sent:`, notification);
  return notification;
}

/**
 * Action: Send email
 */
async function sendEmailAction(recipients, context, action) {
  const emailData = {
    to: recipients,
    subject: action.subject || 'Automated Notification',
    body: action.body || JSON.stringify(context, null, 2)
  };

  // Use email service
  await sendEmail(emailData);
  return emailData;
}

/**
 * Action: Trigger webhook
 */
async function triggerWebhook(webhookId, context) {
  const { default: webhookService } = await import('./webhookService.js');
  const webhook = webhookService.getWebhook(webhookId);
  if (!webhook) {
    throw new Error(`Webhook ${webhookId} not found`);
  }

  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'automation.action',
    payload: context,
    timestamp: new Date().toISOString()
  };

  return await webhookService.queueDelivery(webhook, event);
}

/**
 * Action: Update field
 */
async function updateField(context, field, value) {
  if (!context.table || !context.id) {
    throw new Error('Context must include table and id for update_field action');
  }

  await pool.query(
    `UPDATE ${context.table} SET ${field} = $1 WHERE id = $2`,
    [value, context.id]
  );

  return { field, value, id: context.id };
}

/**
 * Action: Create task
 */
async function createTask(context, taskData) {
  // Placeholder for task creation
  logger.info('Task creation:', taskData);
  return taskData;
}

/**
 * Action: Escalate incident
 */
async function escalateIncident(incidentId, escalateTo) {
  if (!incidentId) throw new Error('No incident_id in context');

  await pool.query(
    `UPDATE incidents
     SET status = 'escalated',
         escalated_to = $1,
         escalated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [escalateTo, incidentId]
  );

  logger.info(`Incident ${incidentId} escalated to ${escalateTo}`);
  return { incidentId, escalatedTo: escalateTo };
}

/**
 * Log automation rule execution
 */
async function logRuleExecution(ruleId, triggerEvent, triggerData, success, errorMessage = null, actionsExecuted = [], executionTime = 0) {
  try {
    await pool.query(
      `INSERT INTO automation_execution_log (
        automation_rule_id, trigger_event, trigger_data,
        conditions_met, actions_executed, success,
        error_message, execution_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        ruleId,
        triggerEvent,
        triggerData,
        success,
        actionsExecuted,
        success,
        errorMessage,
        executionTime
      ]
    );
  } catch (error) {
    logger.error('Error logging rule execution:', error);
  }
}

export default {
  evaluateAutomationRules,
  executeAction
};
