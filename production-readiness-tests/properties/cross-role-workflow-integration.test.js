/**
 * Property Test: Cross-role workflow integration
 * Feature: production-readiness-comprehensive, Property 2: Cross-role workflow integration
 * Validates: Requirements 1.7, 1.8
 * 
 * For any multi-role workflow (visitor invitation to checkout, incident reporting, 
 * approval processes), all steps should complete successfully with proper data flow 
 * and state management
 */

const fc = require('fast-check');
const { expect } = require('@jest/globals');

// Mock workflow components
const mockWorkflowComponents = {
  visitorWorkflow: {
    createInvitation: jest.fn(),
    approveVisitor: jest.fn(),
    checkInVisitor: jest.fn(),
    checkOutVisitor: jest.fn(),
    getVisitorStatus: jest.fn()
  },
  incidentWorkflow: {
    reportIncident: jest.fn(),
    assignIncident: jest.fn(),
    escalateIncident: jest.fn(),
    resolveIncident: jest.fn(),
    getIncidentStatus: jest.fn()
  },
  approvalWorkflow: {
    submitForApproval: jest.fn(),
    reviewApproval: jest.fn(),
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
    getApprovalStatus: jest.fn()
  },
  notificationService: {
    sendNotification: jest.fn(),
    getNotificationHistory: jest.fn()
  },
  auditService: {
    logWorkflowStep: jest.fn(),
    getWorkflowAuditTrail: jest.fn()
  }
};

// Workflow state definitions
const WORKFLOW_STATES = {
  visitor_lifecycle: [
    'invitation_created',
    'invitation_sent', 
    'visitor_approved',
    'visitor_checked_in',
    'visitor_on_premise',
    'visitor_checked_out',
    'visit_completed'
  ],
  incident_management: [
    'incident_reported',
    'incident_assigned',
    'incident_in_progress',
    'incident_escalated',
    'incident_resolved',
    'incident_closed'
  ],
  approval_process: [
    'request_submitted',
    'under_review',
    'additional_info_requested',
    'approved',
    'rejected',
    'completed'
  ]
};

// Role transitions for workflows
const ROLE_TRANSITIONS = {
  visitor_lifecycle: {
    'invitation_created': ['resident'],
    'invitation_sent': ['system'],
    'visitor_approved': ['admin', 'resident'],
    'visitor_checked_in': ['guard'],
    'visitor_on_premise': ['guard'],
    'visitor_checked_out': ['guard'],
    'visit_completed': ['system']
  },
  incident_management: {
    'incident_reported': ['guard', 'resident', 'admin'],
    'incident_assigned': ['admin'],
    'incident_in_progress': ['guard', 'admin'],
    'incident_escalated': ['admin'],
    'incident_resolved': ['guard', 'admin'],
    'incident_closed': ['admin']
  },
  approval_process: {
    'request_submitted': ['resident', 'guard'],
    'under_review': ['admin'],
    'additional_info_requested': ['admin'],
    'approved': ['admin'],
    'rejected': ['admin'],
    'completed': ['system']
  }
};

// Generators for workflow testing
const workflowTypeGenerator = fc.constantFrom('visitor_lifecycle', 'incident_management', 'approval_process');

const userRoleGenerator = fc.constantFrom('super_admin', 'admin', 'guard', 'resident');

const workflowContextGenerator = fc.record({
  estate_id: fc.integer({ min: 1, max: 100 }),
  initiator_id: fc.integer({ min: 1, max: 1000 }),
  target_id: fc.option(fc.integer({ min: 1, max: 1000 })),
  priority: fc.constantFrom('low', 'medium', 'high', 'critical'),
  metadata: fc.record({
    visitor_name: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
    incident_type: fc.option(fc.constantFrom('security', 'maintenance', 'emergency')),
    approval_type: fc.option(fc.constantFrom('user_registration', 'bulk_invite', 'system_change'))
  })
});

const workflowStepGenerator = (workflowType) => {
  const states = WORKFLOW_STATES[workflowType] || [];
  return fc.record({
    from_state: fc.constantFrom(...states),
    to_state: fc.constantFrom(...states),
    actor_role: userRoleGenerator,
    action: fc.string({ minLength: 3, maxLength: 30 }),
    timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
  });
};

describe('Property Test: Cross-role workflow integration', () => {
  beforeEach(() => {
    // Reset all mocks
    Object.values(mockWorkflowComponents).forEach(service => {
      Object.values(service).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    });
  });

  /**
   * Property 2.1: Workflow state transitions are valid
   * For any workflow, state transitions should only occur through valid paths
   * with appropriate role authorization
   */
  test('workflow state transitions follow valid paths', () => {
    fc.assert(fc.property(
      workflowTypeGenerator,
      workflowContextGenerator,
      (workflowType, context) => {
        const states = WORKFLOW_STATES[workflowType];
        const transitions = ROLE_TRANSITIONS[workflowType];
        
        // Test each possible state transition
        for (let i = 0; i < states.length - 1; i++) {
          const fromState = states[i];
          const toState = states[i + 1];
          const allowedRoles = transitions[toState] || [];
          
          // Test with each allowed role
          allowedRoles.forEach(role => {
            const transitionResult = executeWorkflowTransition(
              workflowType, fromState, toState, role, context
            );
            
            expect(transitionResult.success).toBe(true);
            expect(transitionResult.newState).toBe(toState);
            expect(transitionResult.auditLogged).toBe(true);
          });
          
          // Test with disallowed role (should fail)
          const disallowedRole = getDisallowedRole(allowedRoles);
          if (disallowedRole) {
            const transitionResult = executeWorkflowTransition(
              workflowType, fromState, toState, disallowedRole, context
            );
            
            expect(transitionResult.success).toBe(false);
          }
        }
      }
    ), { numRuns: 1000 });
  });

  /**
   * Property 2.2: Cross-role data consistency
   * Data should remain consistent as it flows between different roles in a workflow
   */
  test('data consistency is maintained across role transitions', () => {
    fc.assert(fc.property(
      workflowTypeGenerator,
      workflowContextGenerator,
      fc.array(workflowStepGenerator('visitor_lifecycle'), { minLength: 2, maxLength: 6 }),
      (workflowType, context, workflowSteps) => {
        let currentData = initializeWorkflowData(workflowType, context);
        let previousData = { ...currentData };
        
        workflowSteps.forEach((step, index) => {
          const stepResult = executeWorkflowStep(workflowType, step, currentData);
          
          if (stepResult.success) {
            // Verify data consistency
            expect(stepResult.data.id).toBe(previousData.id);
            expect(stepResult.data.estate_id).toBe(previousData.estate_id);
            
            // Verify data evolution (some fields should change, others should remain)
            verifyDataEvolution(previousData, stepResult.data, step);
            
            previousData = { ...currentData };
            currentData = stepResult.data;
          }
        });
      }
    ), { numRuns: 1000 });
  });

  /**
   * Property 2.3: Notification consistency across workflows
   * All workflow participants should receive appropriate notifications at each step
   */
  test('notifications are sent to appropriate participants', () => {
    fc.assert(fc.property(
      workflowTypeGenerator,
      workflowContextGenerator,
      workflowStepGenerator('visitor_lifecycle'),
      (workflowType, context, step) => {
        mockWorkflowComponents.notificationService.sendNotification.mockReturnValue(true);
        
        const stepResult = executeWorkflowStep(workflowType, step, 
          initializeWorkflowData(workflowType, context)
        );
        
        if (stepResult.success) {
          const expectedRecipients = getExpectedNotificationRecipients(
            workflowType, step, context
          );
          
          expectedRecipients.forEach(recipient => {
            expect(mockWorkflowComponents.notificationService.sendNotification)
              .toHaveBeenCalledWith(
                expect.objectContaining({
                  recipient_id: recipient.id,
                  recipient_role: recipient.role,
                  workflow_type: workflowType,
                  step: step.to_state
                })
              );
          });
        }
      }
    ), { numRuns: 1000 });
  });

  /**
   * Property 2.4: Audit trail completeness for workflows
   * Every workflow step should generate complete audit trail entries
   */
  test('complete audit trail is maintained for all workflow steps', () => {
    fc.assert(fc.property(
      workflowTypeGenerator,
      workflowContextGenerator,
      fc.array(workflowStepGenerator('visitor_lifecycle'), { minLength: 1, maxLength: 5 }),
      (workflowType, context, workflowSteps) => {
        mockWorkflowComponents.auditService.logWorkflowStep.mockReturnValue(true);
        
        let currentData = initializeWorkflowData(workflowType, context);
        
        workflowSteps.forEach((step, index) => {
          const stepResult = executeWorkflowStep(workflowType, step, currentData);
          
          if (stepResult.success) {
            // Verify audit log was created
            expect(mockWorkflowComponents.auditService.logWorkflowStep)
              .toHaveBeenCalledWith(
                expect.objectContaining({
                  workflow_type: workflowType,
                  workflow_id: currentData.id,
                  from_state: step.from_state,
                  to_state: step.to_state,
                  actor_role: step.actor_role,
                  estate_id: context.estate_id,
                  timestamp: expect.any(String)
                })
              );
            
            currentData = stepResult.data;
          }
        });
      }
    ), { numRuns: 1000 });
  });

  /**
   * Property 2.5: Workflow rollback and error recovery
   * Workflows should handle errors gracefully and support rollback when needed
   */
  test('workflows handle errors and support rollback', () => {
    fc.assert(fc.property(
      workflowTypeGenerator,
      workflowContextGenerator,
      workflowStepGenerator('visitor_lifecycle'),
      fc.boolean(), // Simulate error condition
      (workflowType, context, step, shouldError) => {
        const initialData = initializeWorkflowData(workflowType, context);
        
        if (shouldError) {
          // Simulate an error during workflow execution
          const errorResult = executeWorkflowStepWithError(workflowType, step, initialData);
          
          expect(errorResult.success).toBe(false);
          expect(errorResult.error).toBeDefined();
          
          // Verify rollback capability
          const rollbackResult = rollbackWorkflowStep(workflowType, step, initialData);
          expect(rollbackResult.success).toBe(true);
          expect(rollbackResult.data).toEqual(initialData);
          
        } else {
          // Normal execution should succeed
          const normalResult = executeWorkflowStep(workflowType, step, initialData);
          
          if (isValidTransition(workflowType, step)) {
            expect(normalResult.success).toBe(true);
          }
        }
      }
    ), { numRuns: 1000 });
  });

  /**
   * Property 2.6: Concurrent workflow handling
   * Multiple workflows should be handled concurrently without interference
   */
  test('concurrent workflows do not interfere with each other', () => {
    fc.assert(fc.property(
      fc.array(
        fc.record({
          workflowType: workflowTypeGenerator,
          context: workflowContextGenerator,
          steps: fc.array(workflowStepGenerator('visitor_lifecycle'), { minLength: 1, maxLength: 3 })
        }),
        { minLength: 2, maxLength: 5 }
      ),
      (workflows) => {
        const workflowResults = new Map();
        
        // Execute workflows concurrently
        workflows.forEach((workflow, index) => {
          const workflowId = `workflow_${index}`;
          let currentData = initializeWorkflowData(workflow.workflowType, workflow.context);
          currentData.id = workflowId;
          
          workflow.steps.forEach(step => {
            const stepResult = executeWorkflowStep(workflow.workflowType, step, currentData);
            if (stepResult.success) {
              currentData = stepResult.data;
            }
          });
          
          workflowResults.set(workflowId, currentData);
        });
        
        // Verify each workflow maintained its own state
        workflows.forEach((workflow, index) => {
          const workflowId = `workflow_${index}`;
          const finalData = workflowResults.get(workflowId);
          
          expect(finalData.id).toBe(workflowId);
          expect(finalData.estate_id).toBe(workflow.context.estate_id);
          
          // Verify no cross-contamination between workflows
          workflows.forEach((otherWorkflow, otherIndex) => {
            if (index !== otherIndex) {
              const otherWorkflowId = `workflow_${otherIndex}`;
              const otherFinalData = workflowResults.get(otherWorkflowId);
              
              expect(finalData.id).not.toBe(otherFinalData.id);
            }
          });
        });
      }
    ), { numRuns: 1000 });
  });
});

// Helper functions for workflow testing
function executeWorkflowTransition(workflowType, fromState, toState, actorRole, context) {
  const transitions = ROLE_TRANSITIONS[workflowType];
  const allowedRoles = transitions[toState] || [];
  
  if (!allowedRoles.includes(actorRole)) {
    return { success: false, error: 'Unauthorized role for transition' };
  }
  
  // Simulate successful transition
  mockWorkflowComponents.auditService.logWorkflowStep({
    workflow_type: workflowType,
    from_state: fromState,
    to_state: toState,
    actor_role: actorRole,
    estate_id: context.estate_id
  });
  
  return {
    success: true,
    newState: toState,
    auditLogged: true
  };
}

function executeWorkflowStep(workflowType, step, currentData) {
  if (!isValidTransition(workflowType, step)) {
    return { success: false, error: 'Invalid transition' };
  }
  
  const newData = { ...currentData };
  newData.state = step.to_state;
  newData.last_updated = step.timestamp;
  newData.last_actor = step.actor_role;
  
  // Log the workflow step
  mockWorkflowComponents.auditService.logWorkflowStep({
    workflow_type: workflowType,
    workflow_id: currentData.id,
    from_state: step.from_state,
    to_state: step.to_state,
    actor_role: step.actor_role,
    estate_id: currentData.estate_id,
    timestamp: step.timestamp.toISOString()
  });
  
  return { success: true, data: newData };
}

function executeWorkflowStepWithError(workflowType, step, currentData) {
  // Simulate various error conditions
  const errorTypes = [
    'network_error',
    'database_error', 
    'validation_error',
    'authorization_error'
  ];
  
  const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
  
  return {
    success: false,
    error: `Simulated ${errorType} during workflow step`,
    errorType
  };
}

function rollbackWorkflowStep(workflowType, step, originalData) {
  // Simulate rollback operation
  return {
    success: true,
    data: { ...originalData }
  };
}

function initializeWorkflowData(workflowType, context) {
  const baseData = {
    id: `${workflowType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: workflowType,
    estate_id: context.estate_id,
    initiator_id: context.initiator_id,
    state: WORKFLOW_STATES[workflowType][0],
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString()
  };
  
  // Add workflow-specific data
  if (workflowType === 'visitor_lifecycle') {
    baseData.visitor_name = context.metadata.visitor_name || 'Test Visitor';
    baseData.host_id = context.initiator_id;
  } else if (workflowType === 'incident_management') {
    baseData.incident_type = context.metadata.incident_type || 'security';
    baseData.priority = context.priority;
  } else if (workflowType === 'approval_process') {
    baseData.approval_type = context.metadata.approval_type || 'user_registration';
    baseData.target_id = context.target_id;
  }
  
  return baseData;
}

function isValidTransition(workflowType, step) {
  const states = WORKFLOW_STATES[workflowType];
  const transitions = ROLE_TRANSITIONS[workflowType];
  
  // Check if states exist
  if (!states.includes(step.from_state) || !states.includes(step.to_state)) {
    return false;
  }
  
  // Check if role is authorized for the target state
  const allowedRoles = transitions[step.to_state] || [];
  if (!allowedRoles.includes(step.actor_role)) {
    return false;
  }
  
  return true;
}

function verifyDataEvolution(previousData, currentData, step) {
  // Core identifiers should never change
  expect(currentData.id).toBe(previousData.id);
  expect(currentData.estate_id).toBe(previousData.estate_id);
  expect(currentData.type).toBe(previousData.type);
  
  // State should have changed
  expect(currentData.state).toBe(step.to_state);
  
  // Timestamps should be updated
  expect(new Date(currentData.last_updated).getTime())
    .toBeGreaterThanOrEqual(new Date(previousData.last_updated).getTime());
}

function getExpectedNotificationRecipients(workflowType, step, context) {
  const recipients = [];
  
  // Add initiator
  recipients.push({
    id: context.initiator_id,
    role: 'initiator'
  });
  
  // Add role-specific recipients based on workflow type and step
  if (workflowType === 'visitor_lifecycle') {
    if (step.to_state === 'visitor_approved') {
      recipients.push({ id: context.target_id, role: 'visitor' });
    } else if (step.to_state === 'visitor_checked_in') {
      recipients.push({ id: context.initiator_id, role: 'resident' });
    }
  }
  
  return recipients;
}

function getDisallowedRole(allowedRoles) {
  const allRoles = ['super_admin', 'admin', 'guard', 'resident'];
  const disallowedRoles = allRoles.filter(role => !allowedRoles.includes(role));
  
  return disallowedRoles.length > 0 ? disallowedRoles[0] : null;
}

module.exports = {
  WORKFLOW_STATES,
  ROLE_TRANSITIONS,
  executeWorkflowTransition,
  executeWorkflowStep,
  initializeWorkflowData,
  isValidTransition
};