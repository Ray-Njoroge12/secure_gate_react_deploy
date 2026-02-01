/**
 * Resident Mobile App Validator Tests
 * 
 * Comprehensive unit tests for the resident mobile app validation system.
 * Tests all validator methods with various scenarios including edge cases.
 * 
 * @fileoverview Unit tests for ResidentMobileAppValidator
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import { ResidentMobileAppValidator } from './resident-mobile-app-validator.js';

describe('ResidentMobileAppValidator', () => {
  let validator;
  let mockOptions;

  beforeEach(() => {
    mockOptions = {
      touchTargetMinSize: 44,
      performanceThresholds: {
        inviteCreation: 2000,
        listLoad: 1500,
        realTimeUpdate: 500,
        gestureResponse: 100,
        offlineSync: 3000
      },
      realTimeUpdateTimeout: 5000,
      offlineTestDuration: 10000
    };

    validator = new ResidentMobileAppValidator(mockOptions);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with default options', () => {
      const defaultValidator = new ResidentMobileAppValidator();
      
      expect(defaultValidator.options.touchTargetMinSize).toBe(44);
      expect(defaultValidator.options.performanceThresholds.inviteCreation).toBe(2000);
      expect(defaultValidator.validationResults).toBeDefined();
      expect(defaultValidator.metrics).toBeDefined();
    });

    test('should merge custom options with defaults', () => {
      const customOptions = {
        touchTargetMinSize: 48,
        performanceThresholds: {
          inviteCreation: 1500
        }
      };

      const customValidator = new ResidentMobileAppValidator(customOptions);
      
      expect(customValidator.options.touchTargetMinSize).toBe(48);
      expect(customValidator.options.performanceThresholds.inviteCreation).toBe(1500);
      expect(customValidator.options.performanceThresholds.listLoad).toBe(1500); // Default preserved
    });

    test('should initialize empty validation results', () => {
      expect(validator.validationResults.visitorManagement).toEqual({});
      expect(validator.validationResults.touchOptimization).toEqual({});
      expect(validator.validationResults.realTimeSync).toEqual({});
      expect(validator.validationResults.mobileFeatures).toEqual({});
    });

    test('should initialize metrics with zero values', () => {
      expect(validator.metrics.totalTests).toBe(0);
      expect(validator.metrics.passedTests).toBe(0);
      expect(validator.metrics.failedTests).toBe(0);
      expect(validator.metrics.warnings).toBe(0);
    });
  });

  describe('validateResidentMobileApp', () => {
    test('should run complete validation successfully', async () => {
      // Mock all validation methods to return successful results
      jest.spyOn(validator, 'validateVisitorManagement').mockResolvedValue();
      jest.spyOn(validator, 'validateTouchOptimization').mockResolvedValue();
      jest.spyOn(validator, 'validateRealTimeSync').mockResolvedValue();
      jest.spyOn(validator, 'validateMobileFeatures').mockResolvedValue();
      jest.spyOn(validator, 'validateProgressiveWebApp').mockResolvedValue();
      jest.spyOn(validator, 'validateResponsiveDesign').mockResolvedValue();
      jest.spyOn(validator, 'validatePerformance').mockResolvedValue();
      jest.spyOn(validator, 'validateAccessibility').mockResolvedValue();
      jest.spyOn(validator, 'validateOfflineFunctionality').mockResolvedValue();
      jest.spyOn(validator, 'validateNotifications').mockResolvedValue();

      const eventSpy = jest.fn();
      validator.on('validationStarted', eventSpy);
      validator.on('validationCompleted', eventSpy);

      const result = await validator.validateResidentMobileApp();

      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.overallScore).toBeDefined();
      expect(result.status).toBeDefined();
      expect(eventSpy).toHaveBeenCalledTimes(2);
    });

    test('should emit validation events', async () => {
      const startedSpy = jest.fn();
      const completedSpy = jest.fn();
      
      validator.on('validationStarted', startedSpy);
      validator.on('validationCompleted', completedSpy);

      // Mock validation methods
      jest.spyOn(validator, 'validateVisitorManagement').mockResolvedValue();
      jest.spyOn(validator, 'validateTouchOptimization').mockResolvedValue();
      jest.spyOn(validator, 'validateRealTimeSync').mockResolvedValue();
      jest.spyOn(validator, 'validateMobileFeatures').mockResolvedValue();
      jest.spyOn(validator, 'validateProgressiveWebApp').mockResolvedValue();
      jest.spyOn(validator, 'validateResponsiveDesign').mockResolvedValue();
      jest.spyOn(validator, 'validatePerformance').mockResolvedValue();
      jest.spyOn(validator, 'validateAccessibility').mockResolvedValue();
      jest.spyOn(validator, 'validateOfflineFunctionality').mockResolvedValue();
      jest.spyOn(validator, 'validateNotifications').mockResolvedValue();

      await validator.validateResidentMobileApp();

      expect(startedSpy).toHaveBeenCalledWith({ type: 'resident-mobile-app' });
      expect(completedSpy).toHaveBeenCalled();
    });

    test('should handle validation errors', async () => {
      const error = new Error('Validation failed');
      jest.spyOn(validator, 'validateVisitorManagement').mockRejectedValue(error);

      const errorSpy = jest.fn();
      validator.on('validationError', errorSpy);

      await expect(validator.validateResidentMobileApp()).rejects.toThrow('Validation failed');
      expect(errorSpy).toHaveBeenCalledWith(error);
    });
  });

  describe('validateVisitorManagement', () => {
    beforeEach(() => {
      // Mock all test methods to return true by default
      jest.spyOn(validator, 'testInviteCreation').mockResolvedValue(true);
      jest.spyOn(validator, 'testInviteEditing').mockResolvedValue(true);
      jest.spyOn(validator, 'testBulkInvites').mockResolvedValue(true);
      jest.spyOn(validator, 'testVisitorHistory').mockResolvedValue(true);
      jest.spyOn(validator, 'testStatusTracking').mockResolvedValue(true);
      jest.spyOn(validator, 'testQRCodeGeneration').mockResolvedValue(true);
      jest.spyOn(validator, 'testFavoriteVisitors').mockResolvedValue(true);
      jest.spyOn(validator, 'testInviteTemplates').mockResolvedValue(true);
    });

    test('should validate all visitor management features', async () => {
      await validator.validateVisitorManagement();

      expect(validator.validationResults.visitorManagement.inviteCreation).toBe(true);
      expect(validator.validationResults.visitorManagement.inviteEditing).toBe(true);
      expect(validator.validationResults.visitorManagement.bulkInvites).toBe(true);
      expect(validator.validationResults.visitorManagement.visitorHistory).toBe(true);
      expect(validator.validationResults.visitorManagement.statusTracking).toBe(true);
      expect(validator.validationResults.visitorManagement.qrCodeGeneration).toBe(true);
      expect(validator.validationResults.visitorManagement.favoriteVisitors).toBe(true);
      expect(validator.validationResults.visitorManagement.inviteTemplates).toBe(true);
    });

    test('should track performance metrics', async () => {
      await validator.validateVisitorManagement();

      expect(validator.metrics.performanceMetrics.visitorManagement).toBeDefined();
      expect(validator.metrics.totalTests).toBeGreaterThan(0);
      expect(validator.metrics.passedTests).toBeGreaterThan(0);
    });

    test('should emit warning for slow invite creation', async () => {
      // Mock slow invite creation
      jest.spyOn(validator, 'testInviteCreation').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2500)); // Exceed threshold
        return true;
      });

      const warningSpy = jest.fn();
      validator.on('warning', warningSpy);

      await validator.validateVisitorManagement();

      expect(warningSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'performance',
          message: expect.stringContaining('Invite creation took')
        })
      );
      expect(validator.metrics.warnings).toBeGreaterThan(0);
    });

    test('should handle visitor management errors', async () => {
      const error = new Error('Invite creation failed');
      jest.spyOn(validator, 'testInviteCreation').mockRejectedValue(error);

      const errorSpy = jest.fn();
      validator.on('error', errorSpy);

      await expect(validator.validateVisitorManagement()).rejects.toThrow('Invite creation failed');
      expect(errorSpy).toHaveBeenCalledWith({ type: 'visitor-management', error });
    });
  });

  describe('validateTouchOptimization', () => {
    beforeEach(() => {
      jest.spyOn(validator, 'analyzeTouchTargets').mockResolvedValue([
        { id: 'btn1', width: 48, height: 48, type: 'button' },
        { id: 'btn2', width: 44, height: 44, type: 'button' }
      ]);
      jest.spyOn(validator, 'validateTouchSpacing').mockResolvedValue(true);
      jest.spyOn(validator, 'testGestureRecognition').mockResolvedValue({ accuracy: 0.96 });
      jest.spyOn(validator, 'testHapticFeedback').mockResolvedValue(true);
      jest.spyOn(validator, 'testTouchAccuracy').mockResolvedValue(true);
      jest.spyOn(validator, 'testMultiTouchSupport').mockResolvedValue(true);
      jest.spyOn(validator, 'testEdgeGestures').mockResolvedValue(true);
      jest.spyOn(validator, 'testTouchAccessibility').mockResolvedValue(true);
    });

    test('should validate touch target sizes', async () => {
      await validator.validateTouchOptimization();

      expect(validator.validationResults.touchOptimization.touchTargetSizes).toBe(true);
      expect(validator.validationResults.touchOptimization.gestureRecognition).toBe(true);
    });

    test('should detect touch target violations', async () => {
      jest.spyOn(validator, 'analyzeTouchTargets').mockResolvedValue([
        { id: 'btn1', width: 40, height: 40, type: 'button' }, // Violation
        { id: 'btn2', width: 48, height: 48, type: 'button' }
      ]);

      await validator.validateTouchOptimization();

      expect(validator.validationResults.touchOptimization.touchTargetSizes).toBe(false);
      expect(validator.metrics.touchTargetViolations).toHaveLength(1);
      expect(validator.metrics.touchTargetViolations[0].id).toBe('btn1');
    });

    test('should validate gesture recognition accuracy', async () => {
      jest.spyOn(validator, 'testGestureRecognition').mockResolvedValue({ accuracy: 0.94 });

      await validator.validateTouchOptimization();

      expect(validator.validationResults.touchOptimization.gestureRecognition).toBe(false);
      expect(validator.metrics.gestureAccuracies).toContain(0.94);
    });

    test('should handle touch optimization errors', async () => {
      const error = new Error('Touch analysis failed');
      jest.spyOn(validator, 'analyzeTouchTargets').mockRejectedValue(error);

      const errorSpy = jest.fn();
      validator.on('error', errorSpy);

      await expect(validator.validateTouchOptimization()).rejects.toThrow('Touch analysis failed');
      expect(errorSpy).toHaveBeenCalledWith({ type: 'touch-optimization', error });
    });
  });

  describe('validateRealTimeSync', () => {
    beforeEach(() => {
      jest.spyOn(validator, 'testVisitorStatusUpdates').mockResolvedValue({ success: true });
      jest.spyOn(validator, 'testInviteStatusSync').mockResolvedValue(true);
      jest.spyOn(validator, 'testCrossDeviceSync').mockResolvedValue(true);
      jest.spyOn(validator, 'testConflictResolution').mockResolvedValue(true);
      jest.spyOn(validator, 'testConnectionRecovery').mockResolvedValue(true);
      jest.spyOn(validator, 'testBatchUpdates').mockResolvedValue(true);
      jest.spyOn(validator, 'testSyncIndicators').mockResolvedValue(true);
    });

    test('should validate real-time synchronization features', async () => {
      await validator.validateRealTimeSync();

      expect(validator.validationResults.realTimeSync.visitorStatusUpdates).toBe(true);
      expect(validator.validationResults.realTimeSync.inviteStatusSync).toBe(true);
      expect(validator.validationResults.realTimeSync.crossDeviceSync).toBe(true);
      expect(validator.validationResults.realTimeSync.conflictResolution).toBe(true);
    });

    test('should track update latencies', async () => {
      jest.spyOn(validator, 'testVisitorStatusUpdates').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return { success: true };
      });

      await validator.validateRealTimeSync();

      expect(validator.metrics.realTimeLatencies.length).toBeGreaterThan(0);
      expect(validator.validationResults.realTimeSync.updateLatency).toBe(true);
    });

    test('should detect slow real-time updates', async () => {
      jest.spyOn(validator, 'testVisitorStatusUpdates').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 600)); // Exceed threshold
        return { success: true };
      });

      await validator.validateRealTimeSync();

      expect(validator.validationResults.realTimeSync.updateLatency).toBe(false);
    });

    test('should handle real-time sync errors', async () => {
      const error = new Error('Sync failed');
      jest.spyOn(validator, 'testVisitorStatusUpdates').mockRejectedValue(error);

      const errorSpy = jest.fn();
      validator.on('error', errorSpy);

      await expect(validator.validateRealTimeSync()).rejects.toThrow('Sync failed');
      expect(errorSpy).toHaveBeenCalledWith({ type: 'real-time-sync', error });
    });
  });

  describe('validateMobileFeatures', () => {
    beforeEach(() => {
      jest.spyOn(validator, 'testCameraIntegration').mockResolvedValue(true);
      jest.spyOn(validator, 'testLocationServices').mockResolvedValue(true);
      jest.spyOn(validator, 'testContactsIntegration').mockResolvedValue(true);
      jest.spyOn(validator, 'testCalendarIntegration').mockResolvedValue(true);
      jest.spyOn(validator, 'testShareIntegration').mockResolvedValue(true);
      jest.spyOn(validator, 'testDeepLinking').mockResolvedValue(true);
      jest.spyOn(validator, 'testAppShortcuts').mockResolvedValue(true);
      jest.spyOn(validator, 'testWidgetSupport').mockResolvedValue(true);
    });

    test('should validate all mobile-specific features', async () => {
      await validator.validateMobileFeatures();

      expect(validator.validationResults.mobileFeatures.cameraIntegration).toBe(true);
      expect(validator.validationResults.mobileFeatures.locationServices).toBe(true);
      expect(validator.validationResults.mobileFeatures.contactsIntegration).toBe(true);
      expect(validator.validationResults.mobileFeatures.calendarIntegration).toBe(true);
      expect(validator.validationResults.mobileFeatures.shareIntegration).toBe(true);
      expect(validator.validationResults.mobileFeatures.deepLinking).toBe(true);
      expect(validator.validationResults.mobileFeatures.appShortcuts).toBe(true);
      expect(validator.validationResults.mobileFeatures.widgetSupport).toBe(true);
    });

    test('should handle mobile features errors', async () => {
      const error = new Error('Camera access failed');
      jest.spyOn(validator, 'testCameraIntegration').mockRejectedValue(error);

      const errorSpy = jest.fn();
      validator.on('error', errorSpy);

      await expect(validator.validateMobileFeatures()).rejects.toThrow('Camera access failed');
      expect(errorSpy).toHaveBeenCalledWith({ type: 'mobile-features', error });
    });
  });

  describe('validateProgressiveWebApp', () => {
    beforeEach(() => {
      jest.spyOn(validator, 'testServiceWorker').mockResolvedValue(true);
      jest.spyOn(validator, 'testOfflineCapability').mockResolvedValue(true);
      jest.spyOn(validator, 'testInstallPrompt').mockResolvedValue(true);
      jest.spyOn(validator, 'testAppManifest').mockResolvedValue(true);
      jest.spyOn(validator, 'testBackgroundSync').mockResolvedValue(true);
      jest.spyOn(validator, 'testPushNotifications').mockResolvedValue(true);
      jest.spyOn(validator, 'testCacheStrategy').mockResolvedValue(true);
      jest.spyOn(validator, 'testUpdateMechanism').mockResolvedValue(true);
    });

    test('should validate PWA functionality', async () => {
      await validator.validateProgressiveWebApp();

      expect(validator.validationResults.progressiveWebApp.serviceWorker).toBe(true);
      expect(validator.validationResults.progressiveWebApp.offlineCapability).toBe(true);
      expect(validator.validationResults.progressiveWebApp.installPrompt).toBe(true);
      expect(validator.validationResults.progressiveWebApp.appManifest).toBe(true);
    });

    test('should handle PWA validation errors', async () => {
      const error = new Error('Service worker registration failed');
      jest.spyOn(validator, 'testServiceWorker').mockRejectedValue(error);

      const errorSpy = jest.fn();
      validator.on('error', errorSpy);

      await expect(validator.validateProgressiveWebApp()).rejects.toThrow('Service worker registration failed');
      expect(errorSpy).toHaveBeenCalledWith({ type: 'progressive-web-app', error });
    });
  });

  describe('testInviteCreation', () => {
    beforeEach(() => {
      jest.spyOn(validator, 'validateInviteForm').mockReturnValue(true);
      jest.spyOn(validator, 'generateQRCode').mockResolvedValue(true);
      jest.spyOn(validator, 'storeInvite').mockResolvedValue(true);
      jest.spyOn(validator, 'sendInviteNotification').mockResolvedValue(true);
    });

    test('should successfully create invite', async () => {
      const result = await validator.testInviteCreation();
      expect(result).toBe(true);
    });

    test('should fail if form validation fails', async () => {
      jest.spyOn(validator, 'validateInviteForm').mockReturnValue(false);

      const result = await validator.testInviteCreation();
      expect(result).toBe(false);
    });

    test('should fail if QR generation fails', async () => {
      jest.spyOn(validator, 'generateQRCode').mockResolvedValue(false);

      const result = await validator.testInviteCreation();
      expect(result).toBe(false);
    });

    test('should handle invite creation errors', async () => {
      const error = new Error('Storage failed');
      jest.spyOn(validator, 'storeInvite').mockRejectedValue(error);

      const errorSpy = jest.fn();
      validator.on('error', errorSpy);

      const result = await validator.testInviteCreation();
      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith({ type: 'invite-creation', error });
    });
  });

  describe('testGestureRecognition', () => {
    test('should test all gesture types', async () => {
      jest.spyOn(validator, 'simulateGesture').mockResolvedValue(true);

      const result = await validator.testGestureRecognition();

      expect(result.totalTested).toBe(8); // Number of gesture types
      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.correctRecognitions).toBeDefined();
    });

    test('should calculate accuracy correctly', async () => {
      let callCount = 0;
      jest.spyOn(validator, 'simulateGesture').mockImplementation(async () => {
        callCount++;
        return callCount <= 6; // First 6 succeed, last 2 fail
      });

      const result = await validator.testGestureRecognition();

      expect(result.accuracy).toBe(0.75); // 6/8 = 0.75
      expect(result.correctRecognitions).toBe(6);
    });
  });

  describe('testVisitorStatusUpdates', () => {
    beforeEach(() => {
      jest.spyOn(validator, 'updateVisitorStatus').mockResolvedValue(true);
    });

    test('should test all status updates', async () => {
      const result = await validator.testVisitorStatusUpdates();

      expect(result.success).toBe(true);
      expect(result.averageLatency).toBeDefined();
      expect(result.maxLatency).toBeDefined();
    });

    test('should handle slow status updates', async () => {
      jest.spyOn(validator, 'updateVisitorStatus').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 600)); // Exceed threshold
        return true;
      });

      const result = await validator.testVisitorStatusUpdates();

      expect(result.success).toBe(false);
    });

    test('should handle status update errors', async () => {
      const error = new Error('Update failed');
      jest.spyOn(validator, 'updateVisitorStatus').mockRejectedValue(error);

      const errorSpy = jest.fn();
      validator.on('error', errorSpy);

      const result = await validator.testVisitorStatusUpdates();

      expect(result.success).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith({ type: 'status-updates', error });
    });
  });

  describe('testOfflineCapability', () => {
    beforeEach(() => {
      jest.spyOn(validator, 'simulateOfflineMode').mockResolvedValue();
      jest.spyOn(validator, 'simulateOnlineMode').mockResolvedValue();
      jest.spyOn(validator, 'testOfflineVisitorViewing').mockResolvedValue(true);
      jest.spyOn(validator, 'testOfflineInviteCreation').mockResolvedValue(true);
      jest.spyOn(validator, 'testOfflineInviteEditing').mockResolvedValue(true);
      jest.spyOn(validator, 'testOfflineCacheAccess').mockResolvedValue(true);
      jest.spyOn(validator, 'testOfflineActionQueuing').mockResolvedValue(true);
      jest.spyOn(validator, 'testOfflineSync').mockResolvedValue(true);
    });

    test('should test offline functionality', async () => {
      const result = await validator.testOfflineCapability();

      expect(result).toBe(true);
      expect(validator.simulateOfflineMode).toHaveBeenCalled();
      expect(validator.simulateOnlineMode).toHaveBeenCalled();
    });

    test('should fail if offline tests fail', async () => {
      jest.spyOn(validator, 'testOfflineInviteCreation').mockResolvedValue(false);

      const result = await validator.testOfflineCapability();

      expect(result).toBe(false);
    });

    test('should fail if sync is too slow', async () => {
      jest.spyOn(validator, 'testOfflineSync').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 3500)); // Exceed threshold
        return true;
      });

      const result = await validator.testOfflineCapability();

      expect(result).toBe(false);
    });

    test('should handle offline capability errors', async () => {
      const error = new Error('Offline test failed');
      jest.spyOn(validator, 'testOfflineVisitorViewing').mockRejectedValue(error);

      const errorSpy = jest.fn();
      validator.on('error', errorSpy);

      const result = await validator.testOfflineCapability();

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith({ type: 'offline-capability', error });
    });
  });

  describe('updateMetrics', () => {
    test('should update test metrics correctly', () => {
      const results = {
        test1: true,
        test2: false,
        test3: true,
        test4: true
      };

      validator.updateMetrics(results);

      expect(validator.metrics.totalTests).toBe(4);
      expect(validator.metrics.passedTests).toBe(3);
      expect(validator.metrics.failedTests).toBe(1);
    });

    test('should accumulate metrics across multiple calls', () => {
      validator.updateMetrics({ test1: true, test2: false });
      validator.updateMetrics({ test3: true, test4: true, test5: false });

      expect(validator.metrics.totalTests).toBe(5);
      expect(validator.metrics.passedTests).toBe(3);
      expect(validator.metrics.failedTests).toBe(2);
    });
  });

  describe('generateValidationSummary', () => {
    test('should generate comprehensive summary', () => {
      validator.metrics.totalTests = 10;
      validator.metrics.passedTests = 9;
      validator.metrics.failedTests = 1;

      const summary = validator.generateValidationSummary();

      expect(summary.timestamp).toBeDefined();
      expect(summary.overallScore).toBe(90);
      expect(summary.status).toBe('PASS');
      expect(summary.results).toBe(validator.validationResults);
      expect(summary.metrics).toBe(validator.metrics);
      expect(summary.recommendations).toBeDefined();
    });

    test('should calculate correct status based on score', () => {
      // Test PASS status
      validator.metrics.totalTests = 10;
      validator.metrics.passedTests = 9;
      let summary = validator.generateValidationSummary();
      expect(summary.status).toBe('PASS');

      // Test WARNING status
      validator.metrics.passedTests = 8;
      summary = validator.generateValidationSummary();
      expect(summary.status).toBe('WARNING');

      // Test FAIL status
      validator.metrics.passedTests = 6;
      summary = validator.generateValidationSummary();
      expect(summary.status).toBe('FAIL');
    });

    test('should handle zero tests', () => {
      const summary = validator.generateValidationSummary();

      expect(summary.overallScore).toBe(0);
      expect(summary.status).toBe('FAIL');
    });
  });

  describe('generateRecommendations', () => {
    test('should generate touch target recommendations', () => {
      validator.metrics.touchTargetViolations = [
        { id: 'btn1', width: 40, height: 40 }
      ];

      const recommendations = validator.generateRecommendations();

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'accessibility',
          priority: 'high',
          message: expect.stringContaining('touch targets below minimum size')
        })
      );
    });

    test('should generate gesture accuracy recommendations', () => {
      validator.metrics.gestureAccuracies = [0.90, 0.92, 0.88];

      const recommendations = validator.generateRecommendations();

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'usability',
          priority: 'medium',
          message: expect.stringContaining('Gesture recognition accuracy below threshold')
        })
      );
    });

    test('should generate performance recommendations', () => {
      validator.metrics.realTimeLatencies = [600, 700, 800];

      const recommendations = validator.generateRecommendations();

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'performance',
          priority: 'high',
          message: expect.stringContaining('Real-time update latency too high')
        })
      );
    });

    test('should generate warning recommendations', () => {
      validator.metrics.warnings = 3;

      const recommendations = validator.generateRecommendations();

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          type: 'general',
          priority: 'low',
          message: expect.stringContaining('performance warnings detected')
        })
      );
    });

    test('should return empty array when no issues', () => {
      const recommendations = validator.generateRecommendations();

      expect(recommendations).toEqual([]);
    });
  });

  describe('Event Handling', () => {
    test('should emit events correctly', async () => {
      const eventSpy = jest.fn();
      validator.on('warning', eventSpy);

      validator.emit('warning', { type: 'test', message: 'Test warning' });

      expect(eventSpy).toHaveBeenCalledWith({ type: 'test', message: 'Test warning' });
    });

    test('should handle multiple event listeners', async () => {
      const spy1 = jest.fn();
      const spy2 = jest.fn();
      
      validator.on('error', spy1);
      validator.on('error', spy2);

      validator.emit('error', { type: 'test', error: new Error('Test') });

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty touch targets array', async () => {
      jest.spyOn(validator, 'analyzeTouchTargets').mockResolvedValue([]);

      await validator.validateTouchOptimization();

      expect(validator.validationResults.touchOptimization.touchTargetSizes).toBe(true);
      expect(validator.metrics.touchTargetViolations).toEqual([]);
    });

    test('should handle gesture recognition with zero accuracy', async () => {
      jest.spyOn(validator, 'simulateGesture').mockResolvedValue(false);

      const result = await validator.testGestureRecognition();

      expect(result.accuracy).toBe(0);
      expect(result.correctRecognitions).toBe(0);
    });

    test('should handle status updates with no latencies', async () => {
      jest.spyOn(validator, 'updateVisitorStatus').mockResolvedValue(false);

      const result = await validator.testVisitorStatusUpdates();

      expect(result.success).toBe(false);
      expect(result.averageLatency).toBeNaN();
    });
  });
});