/**
 * E2E Test: Incident Reporting Workflow
 * 
 * This test covers the complete incident reporting workflow
 * from incident creation to resolution and follow-up.
 */

const { test, expect } = require('@playwright/test');

test.describe('Incident Reporting Workflow', () => {
  let guardPage;
  let adminPage;
  let residentPage;
  let incidentId;

  test.beforeEach(async ({ browser }) => {
    guardPage = await browser.newPage();
    adminPage = await browser.newPage();
    residentPage = await browser.newPage();
  });

  test.afterEach(async () => {
    if (guardPage) await guardPage.close();
    if (adminPage) await adminPage.close();
    if (residentPage) await residentPage.close();
  });

  test('Complete incident reporting workflow', async () => {
    // Step 1: Guard reports an incident
    await test.step('Guard reports incident', async () => {
      await guardPage.goto('/login');
      
      // Login as guard
      await guardPage.fill('[data-testid="email-input"]', 'guard@test.com');
      await guardPage.fill('[data-testid="password-input"]', 'GuardPass123!');
      await guardPage.click('[data-testid="login-button"]');
      
      // Wait for guard dashboard
      await expect(guardPage.locator('[data-testid="guard-dashboard"]')).toBeVisible();
      
      // Navigate to incident reporting
      await guardPage.click('[data-testid="incidents-menu"]');
      await expect(guardPage.locator('[data-testid="incidents-page"]')).toBeVisible();
      
      // Click report incident button
      await guardPage.click('[data-testid="report-incident-button"]');
      await expect(guardPage.locator('[data-testid="incident-report-form"]')).toBeVisible();
    });

    // Step 2: Guard fills incident details
    await test.step('Guard fills incident details', async () => {
      // Fill incident basic information
      await guardPage.fill('[data-testid="incident-title-input"]', 'Suspicious Activity at Main Gate');
      await guardPage.selectOption('[data-testid="incident-type-select"]', 'security');
      await guardPage.selectOption('[data-testid="incident-severity-select"]', 'medium');
      await guardPage.selectOption('[data-testid="incident-priority-select"]', 'high');
      
      // Fill incident description
      await guardPage.fill('[data-testid="incident-description-textarea"]', 
        'Observed suspicious individual attempting to gain unauthorized access to the premises. ' +
        'Individual was wearing dark clothing and appeared to be testing the gate mechanism. ' +
        'Security cameras captured the incident and individual fled when approached.'
      );
      
      // Fill location details
      await guardPage.fill('[data-testid="incident-location-input"]', 'Main Gate - Building A');
      await guardPage.fill('[data-testid="incident-coordinates-input"]', '-1.2921,36.8219');
      
      // Add involved parties
      await guardPage.click('[data-testid="add-involved-party-button"]');
      await guardPage.fill('[data-testid="involved-party-name-input"]', 'Unknown Individual');
      await guardPage.selectOption('[data-testid="involved-party-type-select"]', 'visitor');
      await guardPage.fill('[data-testid="involved-party-description-input"]', 'Male, approximately 30 years old, dark clothing');
      
      // Add evidence
      await guardPage.click('[data-testid="add-evidence-button"]');
      await guardPage.fill('[data-testid="evidence-description-input"]', 'Security camera footage from 14:30-14:45');
      await guardPage.selectOption('[data-testid="evidence-type-select"]', 'video');
      
      // Upload evidence file (simulate)
      const fileInput = guardPage.locator('[data-testid="evidence-file-input"]');
      await fileInput.setInputFiles({
        name: 'security-footage.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('fake-video-data')
      });
      
      // Set incident time
      const incidentTime = new Date();
      incidentTime.setHours(14, 30, 0, 0);
      const timeString = incidentTime.toISOString().slice(0, 16);
      await guardPage.fill('[data-testid="incident-time-input"]', timeString);
      
      // Submit incident report
      await guardPage.click('[data-testid="submit-incident-button"]');
    });

    // Step 3: Verify incident was created
    await test.step('Verify incident creation', async () => {
      // Wait for success message
      await expect(guardPage.locator('[data-testid="incident-created-success"]')).toBeVisible();
      await expect(guardPage.locator('[data-testid="incident-created-success"]')).toContainText('Incident reported successfully');
      
      // Get incident ID from success message
      const successMessage = await guardPage.locator('[data-testid="incident-created-success"]').textContent();
      const idMatch = successMessage.match(/Incident #(\d+)/);
      incidentId = idMatch ? idMatch[1] : null;
      
      expect(incidentId).toBeTruthy();
      
      // Verify incident appears in incidents list
      await expect(guardPage.locator(`[data-testid="incident-${incidentId}"]`)).toBeVisible();
      await expect(guardPage.locator(`[data-testid="incident-${incidentId}-title"]`)).toContainText('Suspicious Activity at Main Gate');
      await expect(guardPage.locator(`[data-testid="incident-${incidentId}-status"]`)).toContainText('Open');
    });

    // Step 4: Admin reviews incident
    await test.step('Admin reviews incident', async () => {
      await adminPage.goto('/login');
      
      // Login as admin
      await adminPage.fill('[data-testid="email-input"]', 'admin@test.com');
      await adminPage.fill('[data-testid="password-input"]', 'AdminPass123!');
      await adminPage.click('[data-testid="login-button"]');
      
      // Wait for admin dashboard
      await expect(adminPage.locator('[data-testid="admin-dashboard"]')).toBeVisible();
      
      // Navigate to incidents management
      await adminPage.click('[data-testid="incidents-menu"]');
      await expect(adminPage.locator('[data-testid="incidents-page"]')).toBeVisible();
      
      // Find the reported incident
      await expect(adminPage.locator(`[data-testid="incident-${incidentId}"]`)).toBeVisible();
      
      // Click to view incident details
      await adminPage.click(`[data-testid="view-incident-${incidentId}-button"]`);
      await expect(adminPage.locator('[data-testid="incident-details-modal"]')).toBeVisible();
    });

    // Step 5: Admin assigns incident
    await test.step('Admin assigns incident', async () => {
      // Assign incident to security team
      await adminPage.selectOption('[data-testid="assign-to-select"]', 'security-team');
      await adminPage.fill('[data-testid="assignment-notes-textarea"]', 'High priority security incident requiring immediate attention');
      
      // Set due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);
      const dueDateString = dueDate.toISOString().slice(0, 16);
      await adminPage.fill('[data-testid="due-date-input"]', dueDateString);
      
      // Assign incident
      await adminPage.click('[data-testid="assign-incident-button"]');
      
      // Verify assignment success
      await expect(adminPage.locator('[data-testid="assignment-success"]')).toContainText('Incident assigned successfully');
      
      // Verify incident status updated
      await expect(adminPage.locator('[data-testid="incident-status"]')).toContainText('Assigned');
    });

    // Step 6: Security team investigates
    await test.step('Security team investigates', async () => {
      // Login as security team member
      await adminPage.goto('/logout');
      await adminPage.goto('/login');
      await adminPage.fill('[data-testid="email-input"]', 'security@test.com');
      await adminPage.fill('[data-testid="password-input"]', 'SecurityPass123!');
      await adminPage.click('[data-testid="login-button"]');
      
      // Navigate to assigned incidents
      await adminPage.click('[data-testid="assigned-incidents-menu"]');
      await expect(adminPage.locator('[data-testid="assigned-incidents-page"]')).toBeVisible();
      
      // Find the assigned incident
      await expect(adminPage.locator(`[data-testid="incident-${incidentId}"]`)).toBeVisible();
      
      // Click to view incident
      await adminPage.click(`[data-testid="view-incident-${incidentId}-button"]`);
      
      // Add investigation notes
      await adminPage.click('[data-testid="add-investigation-note-button"]');
      await adminPage.fill('[data-testid="investigation-note-textarea"]', 
        'Investigation initiated. Reviewing security footage and checking access logs. ' +
        'Contacted local authorities for additional information.'
      );
      await adminPage.click('[data-testid="save-investigation-note-button"]');
      
      // Update incident status to investigating
      await adminPage.selectOption('[data-testid="status-update-select"]', 'investigating');
      await adminPage.fill('[data-testid="status-update-notes-textarea"]', 'Investigation in progress');
      await adminPage.click('[data-testid="update-status-button"]');
      
      // Verify status update
      await expect(adminPage.locator('[data-testid="status-update-success"]')).toContainText('Status updated successfully');
    });

    // Step 7: Security team resolves incident
    await test.step('Security team resolves incident', async () => {
      // Add resolution details
      await adminPage.click('[data-testid="add-resolution-button"]');
      await adminPage.fill('[data-testid="resolution-textarea"]', 
        'Investigation completed. Individual was identified as a delivery person who was lost. ' +
        'No security threat confirmed. Incident closed as false alarm. ' +
        'Recommendations: Improve visitor guidance and signage at main gate.'
      );
      
      // Set resolution type
      await adminPage.selectOption('[data-testid="resolution-type-select"]', 'resolved');
      
      // Add recommendations
      await adminPage.fill('[data-testid="recommendations-textarea"]', 
        '1. Install better signage for delivery personnel\n' +
        '2. Improve visitor guidance system\n' +
        '3. Review gate access procedures'
      );
      
      // Resolve incident
      await adminPage.click('[data-testid="resolve-incident-button"]');
      
      // Verify resolution
      await expect(adminPage.locator('[data-testid="resolution-success"]')).toContainText('Incident resolved successfully');
      await expect(adminPage.locator('[data-testid="incident-status"]')).toContainText('Resolved');
    });

    // Step 8: Admin reviews resolution
    await test.step('Admin reviews resolution', async () => {
      // Login as admin
      await adminPage.goto('/logout');
      await adminPage.goto('/login');
      await adminPage.fill('[data-testid="email-input"]', 'admin@test.com');
      await adminPage.fill('[data-testid="password-input"]', 'AdminPass123!');
      await adminPage.click('[data-testid="login-button"]');
      
      // Navigate to resolved incidents
      await adminPage.click('[data-testid="resolved-incidents-menu"]');
      await expect(adminPage.locator('[data-testid="resolved-incidents-page"]')).toBeVisible();
      
      // Find the resolved incident
      await expect(adminPage.locator(`[data-testid="incident-${incidentId}"]`)).toBeVisible();
      
      // View incident details
      await adminPage.click(`[data-testid="view-incident-${incidentId}-button"]`);
      
      // Review resolution
      await expect(adminPage.locator('[data-testid="resolution-details"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="recommendations"]')).toBeVisible();
      
      // Approve resolution
      await adminPage.click('[data-testid="approve-resolution-button"]');
      await expect(adminPage.locator('[data-testid="resolution-approved"]')).toContainText('Resolution approved');
    });

    // Step 9: Verify complete audit trail
    await test.step('Verify complete audit trail', async () => {
      // Navigate to incident audit trail
      await adminPage.click('[data-testid="incident-audit-trail-tab"]');
      await expect(adminPage.locator('[data-testid="audit-trail"]')).toBeVisible();
      
      // Verify all events are logged
      const auditEvents = [
        'incident.created',
        'incident.assigned',
        'incident.investigation.started',
        'incident.status.updated',
        'incident.resolved',
        'incident.resolution.approved'
      ];
      
      for (const event of auditEvents) {
        await expect(adminPage.locator(`[data-testid="audit-event-${event}"]`)).toBeVisible();
      }
    });
  });

  test('Incident reporting error handling', async () => {
    await test.step('Handle incomplete incident data', async () => {
      await guardPage.goto('/login');
      await guardPage.fill('[data-testid="email-input"]', 'guard@test.com');
      await guardPage.fill('[data-testid="password-input"]', 'GuardPass123!');
      await guardPage.click('[data-testid="login-button"]');
      
      await guardPage.goto('/incidents');
      await guardPage.click('[data-testid="report-incident-button"]');
      
      // Try to submit incomplete form
      await guardPage.click('[data-testid="submit-incident-button"]');
      
      // Verify validation errors
      await expect(guardPage.locator('[data-testid="title-error"]')).toContainText('Title is required');
      await expect(guardPage.locator('[data-testid="type-error"]')).toContainText('Type is required');
      await expect(guardPage.locator('[data-testid="description-error"]')).toContainText('Description is required');
    });

    await test.step('Handle file upload errors', async () => {
      await guardPage.goto('/incidents');
      await guardPage.click('[data-testid="report-incident-button"]');
      
      // Fill basic incident info
      await guardPage.fill('[data-testid="incident-title-input"]', 'Test Incident');
      await guardPage.selectOption('[data-testid="incident-type-select"]', 'security');
      await guardPage.fill('[data-testid="incident-description-textarea"]', 'Test description');
      
      // Try to upload invalid file
      const fileInput = guardPage.locator('[data-testid="evidence-file-input"]');
      await fileInput.setInputFiles({
        name: 'test.exe',
        mimeType: 'application/x-executable',
        buffer: Buffer.from('fake-executable-data')
      });
      
      await guardPage.click('[data-testid="submit-incident-button"]');
      
      // Verify file type error
      await expect(guardPage.locator('[data-testid="file-type-error"]')).toContainText('Invalid file type');
    });
  });

  test('Incident reporting permissions', async () => {
    await test.step('Test resident cannot report incidents', async () => {
      await residentPage.goto('/login');
      await residentPage.fill('[data-testid="email-input"]', 'resident@test.com');
      await residentPage.fill('[data-testid="password-input"]', 'ResidentPass123!');
      await residentPage.click('[data-testid="login-button"]');
      
      // Try to access incident reporting
      await residentPage.goto('/incidents/report');
      
      // Verify access denied
      await expect(residentPage.locator('[data-testid="access-denied"]')).toBeVisible();
    });

    await test.step('Test guard can only report incidents', async () => {
      await guardPage.goto('/login');
      await guardPage.fill('[data-testid="email-input"]', 'guard@test.com');
      await guardPage.fill('[data-testid="password-input"]', 'GuardPass123!');
      await guardPage.click('[data-testid="login-button"]');
      
      // Verify guard can access incident reporting
      await guardPage.goto('/incidents/report');
      await expect(guardPage.locator('[data-testid="incident-report-form"]')).toBeVisible();
      
      // Verify guard cannot access incident management
      await guardPage.goto('/incidents/manage');
      await expect(guardPage.locator('[data-testid="access-denied"]')).toBeVisible();
    });
  });

  test('Incident reporting notifications', async () => {
    await test.step('Test incident notification system', async () => {
      await guardPage.goto('/login');
      await guardPage.fill('[data-testid="email-input"]', 'guard@test.com');
      await guardPage.fill('[data-testid="password-input"]', 'GuardPass123!');
      await guardPage.click('[data-testid="login-button"]');
      
      await guardPage.goto('/incidents');
      await guardPage.click('[data-testid="report-incident-button"]');
      
      // Fill incident details
      await guardPage.fill('[data-testid="incident-title-input"]', 'Emergency Incident');
      await guardPage.selectOption('[data-testid="incident-type-select"]', 'emergency');
      await guardPage.selectOption('[data-testid="incident-severity-select"]', 'critical');
      await guardPage.fill('[data-testid="incident-description-textarea"]', 'Emergency situation requiring immediate attention');
      
      await guardPage.click('[data-testid="submit-incident-button"]');
      
      // Verify emergency notification was sent
      await expect(guardPage.locator('[data-testid="emergency-notification-sent"]')).toBeVisible();
    });
  });
});




