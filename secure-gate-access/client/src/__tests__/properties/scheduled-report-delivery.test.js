/**
 * Property Test: Scheduled Report Delivery
 * Validates: Requirements 12.4
 * 
 * Property 23: Scheduled Report Delivery
 * For any scheduled report configuration, reports should be generated automatically 
 * at the specified times and delivered through the configured channels (email or secure download)
 */

import fc from 'fast-check';

// Mock scheduled report service
class MockScheduledReportService {
  constructor() {
    this.scheduledReports = new Map();
    this.deliveryHistory = [];
    this.currentTime = new Date();
  }

  scheduleReport(config) {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const scheduledReport = {
      id: reportId,
      ...config,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      nextRun: this.calculateNextRun(config.schedule),
      lastRun: null,
      runCount: 0,
      failureCount: 0
    };

    this.scheduledReports.set(reportId, scheduledReport);
    return reportId;
  }

  calculateNextRun(schedule) {
    const now = new Date(this.currentTime);
    
    switch (schedule.frequency) {
      case 'daily':
        const dailyNext = new Date(now);
        dailyNext.setHours(schedule.hour || 9, schedule.minute || 0, 0, 0);
        if (dailyNext <= now) {
          dailyNext.setDate(dailyNext.getDate() + 1);
        }
        return dailyNext.toISOString();
        
      case 'weekly':
        const weeklyNext = new Date(now);
        const targetDay = schedule.dayOfWeek || 1; // Monday = 1
        const currentDay = weeklyNext.getDay() || 7; // Sunday = 7
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        
        weeklyNext.setDate(weeklyNext.getDate() + (daysUntilTarget || 7));
        weeklyNext.setHours(schedule.hour || 9, schedule.minute || 0, 0, 0);
        return weeklyNext.toISOString();
        
      case 'monthly':
        const monthlyNext = new Date(now);
        monthlyNext.setDate(schedule.dayOfMonth || 1);
        monthlyNext.setHours(schedule.hour || 9, schedule.minute || 0, 0, 0);
        if (monthlyNext <= now) {
          monthlyNext.setMonth(monthlyNext.getMonth() + 1);
        }
        return monthlyNext.toISOString();
        
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
  }

  async executeScheduledReports() {
    const now = new Date(this.currentTime);
    const dueReports = [];

    for (const [reportId, report] of this.scheduledReports) {
      if (report.status === 'scheduled' && new Date(report.nextRun) <= now) {
        dueReports.push(report);
      }
    }

    const results = [];
    for (const report of dueReports) {
      const result = await this.executeReport(report);
      results.push(result);
    }

    return results;
  }

  async executeReport(report) {
    const execution = {
      reportId: report.id,
      executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(this.currentTime).toISOString(),
      status: 'running'
    };

    try {
      // Update report status
      const updatedReport = {
        ...report,
        status: 'running',
        lastRun: execution.startTime,
        runCount: report.runCount + 1
      };
      this.scheduledReports.set(report.id, updatedReport);

      // Simulate report generation
      await this.generateReport(report);
      
      // Simulate delivery
      const deliveryResult = await this.deliverReport(report, execution);
      
      // Update execution status
      execution.status = 'completed';
      execution.endTime = new Date(this.currentTime).toISOString();
      execution.deliveryResult = deliveryResult;

      // Schedule next run
      const nextRun = this.calculateNextRun(report.schedule);
      const finalReport = {
        ...updatedReport,
        status: 'scheduled',
        nextRun,
        lastSuccessfulRun: execution.startTime
      };
      this.scheduledReports.set(report.id, finalReport);

      return execution;

    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date(this.currentTime).toISOString();

      // Update failure count
      const failedReport = {
        ...this.scheduledReports.get(report.id),
        status: 'scheduled',
        failureCount: report.failureCount + 1,
        lastFailure: execution.startTime
      };
      this.scheduledReports.set(report.id, failedReport);

      return execution;
    }
  }

  async generateReport(reportConfig) {
    // Simulate report generation time
    const generationTime = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, generationTime));

    // Simulate potential generation failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Report generation failed');
    }

    return {
      reportData: `Generated report data for ${reportConfig.name}`,
      recordCount: Math.floor(Math.random() * 1000) + 1,
      generatedAt: new Date(this.currentTime).toISOString()
    };
  }

  async deliverReport(reportConfig, execution) {
    const deliveryResults = [];

    for (const channel of reportConfig.deliveryChannels) {
      try {
        const result = await this.deliverToChannel(reportConfig, execution, channel);
        deliveryResults.push(result);
        
        // Track delivery history
        this.deliveryHistory.push({
          reportId: reportConfig.id,
          executionId: execution.executionId,
          channel: channel.type,
          status: 'delivered',
          deliveredAt: new Date(this.currentTime).toISOString(),
          recipient: channel.recipient
        });

      } catch (error) {
        deliveryResults.push({
          channel: channel.type,
          status: 'failed',
          error: error.message
        });

        this.deliveryHistory.push({
          reportId: reportConfig.id,
          executionId: execution.executionId,
          channel: channel.type,
          status: 'failed',
          failedAt: new Date(this.currentTime).toISOString(),
          error: error.message
        });
      }
    }

    return deliveryResults;
  }

  async deliverToChannel(reportConfig, execution, channel) {
    // Simulate delivery time
    const deliveryTime = Math.random() * 500 + 100; // 100-600ms
    await new Promise(resolve => setTimeout(resolve, deliveryTime));

    // Simulate delivery failures
    if (Math.random() < 0.03) { // 3% failure rate
      throw new Error(`Delivery failed for ${channel.type}`);
    }

    switch (channel.type) {
      case 'email':
        return {
          channel: 'email',
          status: 'delivered',
          recipient: channel.recipient,
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
      case 'download':
        return {
          channel: 'download',
          status: 'ready',
          downloadUrl: `https://secure-download.example.com/${execution.executionId}`,
          expiresAt: new Date(this.currentTime.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        
      default:
        throw new Error(`Unsupported delivery channel: ${channel.type}`);
    }
  }

  getScheduledReport(reportId) {
    return this.scheduledReports.get(reportId);
  }

  getDeliveryHistory(reportId = null) {
    if (reportId) {
      return this.deliveryHistory.filter(entry => entry.reportId === reportId);
    }
    return this.deliveryHistory;
  }

  // Test utility methods
  setCurrentTime(time) {
    this.currentTime = new Date(time);
  }

  advanceTime(milliseconds) {
    this.currentTime = new Date(this.currentTime.getTime() + milliseconds);
  }
}

// Test configuration
const TEST_CONFIG = {
  PROPERTY_RUNS: 100,
  TIMEOUT: 30000,
  DELIVERY_CHANNELS: ['email', 'download'],
  SCHEDULE_FREQUENCIES: ['daily', 'weekly', 'monthly'],
  MAX_RECIPIENTS: 5
};

describe('Property 23: Scheduled Report Delivery', () => {
  let reportService;

  beforeEach(() => {
    reportService = new MockScheduledReportService();
  });

  test('should schedule reports with consistent next run calculation',
    fc.asyncProperty(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 100 }),
        schedule: fc.record({
          frequency: fc.constantFrom(...TEST_CONFIG.SCHEDULE_FREQUENCIES),
          hour: fc.integer({ min: 0, max: 23 }),
          minute: fc.integer({ min: 0, max: 59 }),
          dayOfWeek: fc.integer({ min: 1, max: 7 }), // Monday = 1, Sunday = 7
          dayOfMonth: fc.integer({ min: 1, max: 28 }) // Safe day range
        }),
        deliveryChannels: fc.array(
          fc.record({
            type: fc.constantFrom(...TEST_CONFIG.DELIVERY_CHANNELS),
            recipient: fc.emailAddress()
          }),
          { minLength: 1, maxLength: TEST_CONFIG.MAX_RECIPIENTS }
        ),
        reportConfig: fc.record({
          format: fc.constantFrom('pdf', 'excel', 'csv'),
          fields: fc.array(fc.string(), { minLength: 1, maxLength: 10 })
        })
      }),
      async ({ name, schedule, deliveryChannels, reportConfig }) => {
        const reportId = reportService.scheduleReport({
          name,
          schedule,
          deliveryChannels,
          reportConfig
        });

        const scheduledReport = reportService.getScheduledReport(reportId);

        // Property 1: Report should be scheduled successfully
        expect(scheduledReport).toBeDefined();
        expect(scheduledReport.id).toBe(reportId);
        expect(scheduledReport.status).toBe('scheduled');

        // Property 2: Next run should be calculated correctly
        expect(scheduledReport.nextRun).toBeDefined();
        const nextRunDate = new Date(scheduledReport.nextRun);
        const now = new Date(reportService.currentTime);
        expect(nextRunDate.getTime()).toBeGreaterThan(now.getTime());

        // Property 3: Schedule configuration should be preserved
        expect(scheduledReport.schedule).toEqual(schedule);
        expect(scheduledReport.deliveryChannels).toEqual(deliveryChannels);
        expect(scheduledReport.reportConfig).toEqual(reportConfig);

        // Property 4: Initial counters should be zero
        expect(scheduledReport.runCount).toBe(0);
        expect(scheduledReport.failureCount).toBe(0);
        expect(scheduledReport.lastRun).toBeNull();
      }
    ),
    { numRuns: TEST_CONFIG.PROPERTY_RUNS, timeout: TEST_CONFIG.TIMEOUT }
  );

  test('should execute reports at scheduled times',
    fc.asyncProperty(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }),
        schedule: fc.record({
          frequency: fc.constantFrom('daily', 'weekly'),
          hour: fc.integer({ min: 0, max: 23 }),
          minute: fc.integer({ min: 0, max: 59 })
        }),
        deliveryChannels: fc.array(
          fc.record({
            type: fc.constantFrom('email', 'download'),
            recipient: fc.emailAddress()
          }),
          { minLength: 1, maxLength: 3 }
        )
      }),
      async ({ name, schedule, deliveryChannels }) => {
        // Schedule the report
        const reportId = reportService.scheduleReport({
          name,
          schedule,
          deliveryChannels,
          reportConfig: { format: 'pdf', fields: ['id', 'name'] }
        });

        const initialReport = reportService.getScheduledReport(reportId);
        const nextRunTime = new Date(initialReport.nextRun);

        // Advance time to the scheduled execution time
        reportService.setCurrentTime(nextRunTime);

        // Execute scheduled reports
        const executions = await reportService.executeScheduledReports();

        // Property 1: Report should be executed
        expect(executions).toHaveLength(1);
        const execution = executions[0];
        expect(execution.reportId).toBe(reportId);

        // Property 2: Execution should complete successfully (most of the time)
        if (execution.status === 'completed') {
          expect(execution.deliveryResult).toBeDefined();
          expect(execution.deliveryResult).toHaveLength(deliveryChannels.length);

          // Property 3: Delivery should be attempted for all channels
          execution.deliveryResult.forEach((result, index) => {
            expect(result.channel).toBe(deliveryChannels[index].type);
          });

          // Property 4: Delivery history should be recorded
          const deliveryHistory = reportService.getDeliveryHistory(reportId);
          expect(deliveryHistory.length).toBeGreaterThan(0);
        }

        // Property 5: Report should be rescheduled for next run
        const updatedReport = reportService.getScheduledReport(reportId);
        expect(updatedReport.status).toBe('scheduled');
        expect(updatedReport.runCount).toBe(1);
        expect(new Date(updatedReport.nextRun).getTime()).toBeGreaterThan(nextRunTime.getTime());
      }
    ),
    { numRuns: 50, timeout: TEST_CONFIG.TIMEOUT }
  );

  test('should handle delivery channel failures gracefully',
    fc.asyncProperty(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }),
        deliveryChannels: fc.array(
          fc.record({
            type: fc.constantFrom('email', 'download'),
            recipient: fc.emailAddress()
          }),
          { minLength: 2, maxLength: 4 }
        )
      }),
      async ({ name, deliveryChannels }) => {
        const reportId = reportService.scheduleReport({
          name,
          schedule: { frequency: 'daily', hour: 9, minute: 0 },
          deliveryChannels,
          reportConfig: { format: 'excel', fields: ['data'] }
        });

        // Force execution time
        const report = reportService.getScheduledReport(reportId);
        reportService.setCurrentTime(new Date(report.nextRun));

        const executions = await reportService.executeScheduledReports();
        const execution = executions[0];

        // Property 1: Execution should complete even with some delivery failures
        expect(execution.status).toMatch(/^(completed|failed)$/);

        if (execution.status === 'completed') {
          // Property 2: Delivery results should be recorded for all channels
          expect(execution.deliveryResult).toHaveLength(deliveryChannels.length);

          // Property 3: Each delivery attempt should have a status
          execution.deliveryResult.forEach(result => {
            expect(result).toHaveProperty('channel');
            expect(result).toHaveProperty('status');
            expect(result.status).toMatch(/^(delivered|ready|failed)$/);
          });

          // Property 4: Delivery history should record all attempts
          const deliveryHistory = reportService.getDeliveryHistory(reportId);
          expect(deliveryHistory).toHaveLength(deliveryChannels.length);

          deliveryHistory.forEach(entry => {
            expect(entry.reportId).toBe(reportId);
            expect(entry.executionId).toBe(execution.executionId);
            expect(entry.status).toMatch(/^(delivered|failed)$/);
          });
        }
      }
    ),
    { numRuns: 30, timeout: TEST_CONFIG.TIMEOUT }
  );

  test('should maintain delivery history consistency',
    fc.asyncProperty(
      fc.array(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 30 }),
          deliveryChannels: fc.array(
            fc.record({
              type: fc.constantFrom('email', 'download'),
              recipient: fc.emailAddress()
            }),
            { minLength: 1, maxLength: 2 }
          )
        }),
        { minLength: 1, maxLength: 5 }
      ),
      async (reportConfigs) => {
        const reportIds = [];

        // Schedule multiple reports
        for (const config of reportConfigs) {
          const reportId = reportService.scheduleReport({
            ...config,
            schedule: { frequency: 'daily', hour: 10, minute: 0 },
            reportConfig: { format: 'csv', fields: ['id'] }
          });
          reportIds.push(reportId);
        }

        // Execute all reports
        const allReports = Array.from(reportService.scheduledReports.values());
        const executionTime = new Date(Math.min(...allReports.map(r => new Date(r.nextRun).getTime())));
        reportService.setCurrentTime(executionTime);

        await reportService.executeScheduledReports();

        // Property 1: Delivery history should exist for all reports
        const totalHistory = reportService.getDeliveryHistory();
        expect(totalHistory.length).toBeGreaterThan(0);

        // Property 2: Each report should have its own delivery history
        for (const reportId of reportIds) {
          const reportHistory = reportService.getDeliveryHistory(reportId);
          
          // Property 3: History entries should belong to the correct report
          reportHistory.forEach(entry => {
            expect(entry.reportId).toBe(reportId);
            expect(entry).toHaveProperty('executionId');
            expect(entry).toHaveProperty('channel');
            expect(entry).toHaveProperty('status');
          });
        }

        // Property 4: Total history should equal sum of individual histories
        const individualHistoryCount = reportIds.reduce((sum, reportId) => {
          return sum + reportService.getDeliveryHistory(reportId).length;
        }, 0);
        expect(totalHistory.length).toBe(individualHistoryCount);
      }
    ),
    { numRuns: 20, timeout: TEST_CONFIG.TIMEOUT }
  );

  test('should handle different schedule frequencies correctly',
    fc.asyncProperty(
      fc.record({
        frequency: fc.constantFrom(...TEST_CONFIG.SCHEDULE_FREQUENCIES),
        hour: fc.integer({ min: 0, max: 23 }),
        minute: fc.integer({ min: 0, max: 59 }),
        dayOfWeek: fc.integer({ min: 1, max: 7 }),
        dayOfMonth: fc.integer({ min: 1, max: 28 })
      }),
      async (schedule) => {
        const reportId = reportService.scheduleReport({
          name: 'Frequency Test Report',
          schedule,
          deliveryChannels: [{ type: 'email', recipient: 'test@example.com' }],
          reportConfig: { format: 'pdf', fields: ['test'] }
        });

        const report = reportService.getScheduledReport(reportId);
        const nextRun = new Date(report.nextRun);
        const now = new Date(reportService.currentTime);

        // Property 1: Next run should be in the future
        expect(nextRun.getTime()).toBeGreaterThan(now.getTime());

        // Property 2: Next run should respect the schedule frequency
        const timeDiff = nextRun.getTime() - now.getTime();
        
        switch (schedule.frequency) {
          case 'daily':
            // Should be within 24-48 hours
            expect(timeDiff).toBeGreaterThan(0);
            expect(timeDiff).toBeLessThanOrEqual(48 * 60 * 60 * 1000);
            break;
            
          case 'weekly':
            // Should be within 7-14 days
            expect(timeDiff).toBeGreaterThan(0);
            expect(timeDiff).toBeLessThanOrEqual(14 * 24 * 60 * 60 * 1000);
            break;
            
          case 'monthly':
            // Should be within 31-62 days
            expect(timeDiff).toBeGreaterThan(0);
            expect(timeDiff).toBeLessThanOrEqual(62 * 24 * 60 * 60 * 1000);
            break;
        }

        // Property 3: Time components should match schedule
        expect(nextRun.getHours()).toBe(schedule.hour);
        expect(nextRun.getMinutes()).toBe(schedule.minute);
      }
    ),
    { numRuns: 50, timeout: TEST_CONFIG.TIMEOUT }
  );

  test('should handle multiple executions and rescheduling',
    fc.asyncProperty(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 30 }),
        executionCount: fc.integer({ min: 2, max: 5 })
      }),
      async ({ name, executionCount }) => {
        const reportId = reportService.scheduleReport({
          name,
          schedule: { frequency: 'daily', hour: 12, minute: 0 },
          deliveryChannels: [{ type: 'download', recipient: 'user@example.com' }],
          reportConfig: { format: 'excel', fields: ['data'] }
        });

        let currentReport = reportService.getScheduledReport(reportId);
        const executionResults = [];

        // Execute the report multiple times
        for (let i = 0; i < executionCount; i++) {
          // Advance to next scheduled time
          reportService.setCurrentTime(new Date(currentReport.nextRun));
          
          const executions = await reportService.executeScheduledReports();
          if (executions.length > 0) {
            executionResults.push(executions[0]);
          }
          
          currentReport = reportService.getScheduledReport(reportId);
        }

        // Property 1: All executions should be recorded
        expect(executionResults.length).toBeGreaterThan(0);

        // Property 2: Run count should increase with each execution
        expect(currentReport.runCount).toBeGreaterThanOrEqual(executionResults.length);

        // Property 3: Each execution should have unique execution ID
        const executionIds = executionResults.map(e => e.executionId);
        const uniqueIds = new Set(executionIds);
        expect(uniqueIds.size).toBe(executionIds.length);

        // Property 4: Report should remain scheduled after executions
        expect(currentReport.status).toBe('scheduled');
        expect(currentReport.nextRun).toBeDefined();

        // Property 5: Delivery history should accumulate
        const deliveryHistory = reportService.getDeliveryHistory(reportId);
        expect(deliveryHistory.length).toBeGreaterThanOrEqual(executionResults.length);
      }
    ),
    { numRuns: 20, timeout: TEST_CONFIG.TIMEOUT }
  );
});

// Additional utility tests for scheduled reporting
describe('Scheduled Report Utility Functions', () => {
  let reportService;

  beforeEach(() => {
    reportService = new MockScheduledReportService();
  });

  test('should calculate next run times correctly for edge cases', () => {
    const testCases = [
      {
        schedule: { frequency: 'daily', hour: 23, minute: 59 },
        description: 'late night daily schedule'
      },
      {
        schedule: { frequency: 'weekly', dayOfWeek: 7, hour: 0, minute: 0 },
        description: 'Sunday midnight weekly schedule'
      },
      {
        schedule: { frequency: 'monthly', dayOfMonth: 28, hour: 12, minute: 30 },
        description: 'end of month schedule'
      }
    ];

    testCases.forEach(({ schedule, description }) => {
      const nextRun = reportService.calculateNextRun(schedule);
      const nextRunDate = new Date(nextRun);
      const now = new Date(reportService.currentTime);

      // Property: Next run should always be in the future
      expect(nextRunDate.getTime()).toBeGreaterThan(now.getTime());

      // Property: Time components should match schedule
      expect(nextRunDate.getHours()).toBe(schedule.hour || 9);
      expect(nextRunDate.getMinutes()).toBe(schedule.minute || 0);
    });
  });

  test('should handle delivery channel validation', () => {
    const validChannels = [
      { type: 'email', recipient: 'user@example.com' },
      { type: 'download', recipient: 'admin@example.com' }
    ];

    const reportId = reportService.scheduleReport({
      name: 'Validation Test',
      schedule: { frequency: 'daily', hour: 9, minute: 0 },
      deliveryChannels: validChannels,
      reportConfig: { format: 'pdf', fields: ['id'] }
    });

    const report = reportService.getScheduledReport(reportId);

    // Property: Valid channels should be accepted
    expect(report.deliveryChannels).toEqual(validChannels);
    expect(report.deliveryChannels).toHaveLength(2);

    // Property: Each channel should have required properties
    report.deliveryChannels.forEach(channel => {
      expect(channel).toHaveProperty('type');
      expect(channel).toHaveProperty('recipient');
      expect(['email', 'download']).toContain(channel.type);
    });
  });
});