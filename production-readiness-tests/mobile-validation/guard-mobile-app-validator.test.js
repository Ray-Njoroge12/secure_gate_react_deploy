/**
 * Guard Mobile App Validator Tests
 * 
 * Unit tests for the Guard mobile app validation system
 * 
 * Requirements: 13.1
 */

import { jest } from '@jest/globals';
import GuardMobileAppValidator from './guard-mobile-app-validator.js';

// Mock Playwright
const mockPage = {
  goto: jest.fn().mockResolvedValue(undefined),
  evaluate: jest.fn(),
  waitForTimeout: jest.fn().mockResolvedValue(undefined),
  setViewportSize: jest.fn().mockResolvedValue(undefined)
};

const mockContext = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  setOffline: jest.fn().mockResolvedValue(undefined)
};

const mockBrowser = {
  newContext: jest.fn().mockResolvedValue(mockContext),
  close: jest.fn().mockResolvedValue(undefined)
};

jest.unstable_mockModule('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue(mockBrowser)
  },
  webkit: {
    launch: jest.fn().mockResolvedValue(mockBrowser)
  },
  devices: {
    'iPhone 13': { name: 'iPhone 13', viewport: { width: 390, height: 844 } },
    'iPhone 13 Pro': { name: 'iPhone 13 Pro', viewport: { width: 390, height: 844 } },
    'Pixel 5': { name: 'Pixel 5', viewport: { width: 393, height: 851 } },
    'Galaxy S21': { name: 'Galaxy S21', viewport: { width: 384, height: 854 } },
    'iPad Pro': { name: 'iPad Pro', viewport: { width: 1024, height: 1366 } }
  }
}));

describe('GuardMobileAppValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new GuardMobileAppValidator();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      expect(validator.guardDevices).toHaveLength(5);
      expect(validator.qrTestCodes).toHaveLength(4);
      expect(validator.offlineScenarios).toHaveLength(4);
      expect(validator.notificationTypes).toHaveLength(4);
      expect(validator.testResults.overallScore).toBe(0);
    });

    test('should have all required test categories', () => {
      expect(validator.testResults).toHaveProperty('qrScanningFunctionality');
      expect(validator.testResults).toHaveProperty('offlineCapability');
      expect(validator.testResults).toHaveProperty('pushNotificationIntegration');
      expect(validator.testResults).toHaveProperty('biometricAuthentication');
      expect(validator.testResults).toHaveProperty('mobileSecurityFeatures');
      expect(validator.testResults).toHaveProperty('performanceMetrics');
    });
  });
  describe('QR Scanning Functionality Tests', () => {
    test('should test camera access successfully', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        success: true,
        hasCamera: true
      });

      mockPage.evaluate.mockResolvedValueOnce({
        hasScannerElement: true,
        hasVideoElement: true,
        videoReady: true
      });

      const result = await validator.testCameraAccess(mockPage);

      expect(result.success).toBe(true);
      expect(result.details).toHaveProperty('cameraPermission');
      expect(result.details).toHaveProperty('scannerInitialization');
    });

    test('should handle camera access failure', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        success: false,
        error: 'Camera permission denied'
      });

      const result = await validator.testCameraAccess(mockPage);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Camera permission denied');
    });

    test('should test QR code recognition for all test codes', async () => {
      mockPage.evaluate.mockImplementation((code) => {
        return Promise.resolve({
          processed: true,
          hasError: false,
          errorText: null
        });
      });

      const result = await validator.testQRCodeRecognition(mockPage);

      expect(Object.keys(result)).toHaveLength(validator.qrTestCodes.length);
      validator.qrTestCodes.forEach(code => {
        expect(result[code]).toHaveProperty('success', true);
        expect(result[code]).toHaveProperty('processed', true);
      });
    });

    test('should calculate QR scanning accuracy correctly', async () => {
      mockPage.evaluate.mockImplementation((code) => {
        const isValid = code.match(/^(VISITOR|BULK|EMERGENCY|MAINTENANCE)-/);
        return Promise.resolve({
          recognized: true,
          valid: isValid,
          code: code,
          processingTime: 300
        });
      });

      const result = await validator.testScanAccuracy(mockPage);

      expect(result).toHaveProperty('accuracy');
      expect(result).toHaveProperty('tests');
      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.tests.length).toBeGreaterThan(0);
    });
  });

  describe('Offline Capability Tests', () => {
    test('should test offline storage capabilities', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        localStorage: true,
        indexedDB: true,
        serviceWorker: true,
        cacheAPI: true
      });

      const result = await validator.testOfflineStorage(mockPage);

      expect(result.success).toBe(true);
      expect(result.details.localStorage).toBe(true);
      expect(result.details.indexedDB).toBe(true);
      expect(result.details.serviceWorker).toBe(true);
    });

    test('should test offline operations for all scenarios', async () => {
      mockPage.evaluate.mockImplementation((operation) => {
        return Promise.resolve({
          operation,
          success: true,
          queued: true,
          queueSize: 1
        });
      });

      const result = await validator.testOfflineOperations(mockPage, mockContext);

      expect(Object.keys(result)).toHaveLength(validator.offlineScenarios.length);
      validator.offlineScenarios.forEach(scenario => {
        expect(result[scenario]).toHaveProperty('success', true);
        expect(result[scenario]).toHaveProperty('queued', true);
      });
    });

    test('should test data synchronization', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        syncRequired: true,
        syncSuccess: true,
        itemsSynced: 3,
        syncTime: Date.now()
      });

      mockPage.evaluate.mockResolvedValueOnce(true); // background sync support

      const result = await validator.testDataSynchronization(mockPage, mockContext);

      expect(result.syncSuccess).toBe(true);
      expect(result.backgroundSyncSupported).toBe(true);
      expect(result.itemsSynced).toBe(3);
    });
  });
  describe('Push Notification Integration Tests', () => {
    test('should test notification permission successfully', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        supported: true,
        permission: 'granted',
        canRequest: false
      });

      const result = await validator.testNotificationPermission(mockPage);

      expect(result.success).toBe(true);
      expect(result.details.supported).toBe(true);
      expect(result.details.permission).toBe('granted');
    });

    test('should test service worker registration', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        registered: true,
        active: true,
        pushManager: true,
        scope: '/sw.js'
      });

      const result = await validator.testServiceWorkerRegistration(mockPage);

      expect(result.success).toBe(true);
      expect(result.details.registered).toBe(true);
      expect(result.details.pushManager).toBe(true);
    });

    test('should test notification delivery for all types', async () => {
      mockPage.evaluate.mockImplementation((type) => {
        return Promise.resolve({
          type,
          delivered: true,
          timestamp: Date.now()
        });
      });

      const result = await validator.testNotificationDelivery(mockPage);

      expect(Object.keys(result)).toHaveLength(validator.notificationTypes.length);
      validator.notificationTypes.forEach(type => {
        expect(result[type]).toHaveProperty('delivered', true);
        expect(result[type]).toHaveProperty('type', type);
      });
    });
  });

  describe('Biometric Authentication Tests', () => {
    test('should test biometric support detection', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        webAuthnSupported: true,
        publicKeySupported: true,
        platformAuthenticatorAvailable: true,
        biometricCapable: true
      });

      const result = await validator.testBiometricSupport(mockPage);

      expect(result.success).toBe(true);
      expect(result.details.biometricCapable).toBe(true);
    });

    test('should test biometric authentication flow', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        credentialCreated: true,
        userVerification: 'required',
        authenticatorAttachment: 'platform',
        flowCompleted: true,
        timestamp: Date.now()
      });

      const result = await validator.testBiometricAuthFlow(mockPage);

      expect(result.credentialCreated).toBe(true);
      expect(result.flowCompleted).toBe(true);
      expect(result.userVerification).toBe('required');
    });

    test('should test biometric fallback mechanisms', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        biometricFailed: true,
        fallbacksAvailable: ['passwordFallback', 'pinFallback', 'otpFallback'],
        fallbackCount: 3,
        primaryFallback: 'passwordFallback',
        gracefulDegradation: true
      });

      const result = await validator.testBiometricFallback(mockPage);

      expect(result.gracefulDegradation).toBe(true);
      expect(result.fallbackCount).toBe(3);
      expect(result.fallbacksAvailable).toContain('passwordFallback');
    });
  });

  describe('Mobile Security Features Tests', () => {
    test('should test app integrity', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        contentSecurityPolicy: true,
        subresourceIntegrity: true,
        noInlineScripts: true,
        httpsEnforced: true,
        integrityScore: 1.0
      });

      const result = await validator.testAppIntegrity(mockPage);

      expect(result.integrityScore).toBe(1.0);
      expect(result.contentSecurityPolicy).toBe(true);
      expect(result.httpsEnforced).toBe(true);
    });

    test('should test data encryption', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        localStorageEncryption: true,
        webCryptoAPI: true,
        sessionStorageSecure: true,
        encryptionScore: 1.0
      });

      const result = await validator.testDataEncryption(mockPage);

      expect(result.encryptionScore).toBe(1.0);
      expect(result.localStorageEncryption).toBe(true);
      expect(result.webCryptoAPI).toBe(true);
    });
  });
  describe('Performance Metrics Tests', () => {
    test('should measure load time and performance metrics', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        domContentLoaded: 500,
        loadComplete: 1000,
        firstPaint: 800,
        firstContentfulPaint: 1200,
        memoryUsage: {
          used: 10000000,
          total: 50000000,
          limit: 100000000
        }
      });

      await validator.testPerformanceMetrics();

      const deviceResults = Object.values(validator.testResults.performanceMetrics);
      expect(deviceResults.length).toBeGreaterThan(0);
      
      deviceResults.forEach(result => {
        if (!result.error) {
          expect(result).toHaveProperty('loadTime');
          expect(result).toHaveProperty('renderTime');
          expect(result).toHaveProperty('memoryUsage');
          expect(result).toHaveProperty('batteryImpact');
          expect(result).toHaveProperty('score');
        }
      });
    });
  });

  describe('Scoring Calculation Tests', () => {
    test('should calculate QR scanning score correctly', () => {
      const cameraAccess = { success: true };
      const qrRecognition = {
        'VISITOR-INV-12345': { success: true },
        'BULK-EVENT-67890': { success: true },
        'EMERGENCY-CODE-999': { success: false },
        'MAINTENANCE-ACCESS-123': { success: true }
      };
      const scanAccuracy = { accuracy: 0.8 };
      const scanSpeed = { speedScore: 0.9 };
      const errorHandling = {
        'camera-blocked': { errorHandled: true },
        'invalid-qr': { errorHandled: true },
        'network-error': { errorHandled: false },
        'expired-code': { errorHandled: true }
      };

      const score = validator.calculateQRScanningScore(
        cameraAccess, qrRecognition, scanAccuracy, scanSpeed, errorHandling
      );

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(typeof score).toBe('number');
    });

    test('should calculate offline capability score correctly', () => {
      const offlineStorage = { success: true };
      const offlineOperations = {
        'visitor-checkin': { success: true },
        'visitor-checkout': { success: true },
        'incident-report': { success: false },
        'emergency-alert': { success: true }
      };
      const dataSync = { syncSuccess: true };
      const conflictResolution = { success: true };

      const score = validator.calculateOfflineScore(
        offlineStorage, offlineOperations, dataSync, conflictResolution
      );

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should calculate overall score correctly', () => {
      // Set up mock test results
      validator.testResults.qrScanningFunctionality = {
        'iPhone 13': { score: 85 },
        'Pixel 5': { score: 90 }
      };
      validator.testResults.offlineCapability = {
        'iPhone 13': { score: 80 },
        'Pixel 5': { score: 85 }
      };
      validator.testResults.pushNotificationIntegration = {
        'iPhone 13': { score: 75 },
        'Pixel 5': { score: 80 }
      };
      validator.testResults.biometricAuthentication = {
        'iPhone 13': { score: 70 },
        'Pixel 5': { score: 75 }
      };
      validator.testResults.mobileSecurityFeatures = {
        'iPhone 13': { score: 90 },
        'Pixel 5': { score: 95 }
      };
      validator.testResults.performanceMetrics = {
        'iPhone 13': { score: 85 },
        'Pixel 5': { score: 90 }
      };

      validator.calculateOverallScore();

      expect(validator.testResults.overallScore).toBeGreaterThan(0);
      expect(validator.testResults.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Report Generation Tests', () => {
    test('should generate comprehensive report', () => {
      // Set up test results
      validator.testResults.overallScore = 85;
      validator.testResults.qrScanningFunctionality = {
        'iPhone 13': { score: 85 }
      };

      const report = validator.generateReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('overallScore', 85);
      expect(report).toHaveProperty('status', 'PASS');
      expect(report).toHaveProperty('details');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('summary');
      
      expect(report.details).toHaveProperty('qrScanningFunctionality');
      expect(report.details).toHaveProperty('offlineCapability');
      expect(report.details).toHaveProperty('pushNotificationIntegration');
      expect(report.details).toHaveProperty('biometricAuthentication');
      expect(report.details).toHaveProperty('mobileSecurityFeatures');
      expect(report.details).toHaveProperty('performanceMetrics');
    });

    test('should generate appropriate recommendations', () => {
      // Set up low scores to trigger recommendations
      validator.testResults.qrScanningFunctionality = {
        'iPhone 13': { score: 60 }
      };
      validator.testResults.offlineCapability = {
        'iPhone 13': { score: 50 }
      };
      validator.testResults.mobileSecurityFeatures = {
        'iPhone 13': { score: 70 }
      };

      const recommendations = validator.generateRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('message');
        expect(rec).toHaveProperty('device');
      });
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle browser launch failure', async () => {
      const { chromium } = await import('playwright');
      chromium.launch.mockRejectedValueOnce(new Error('Browser launch failed'));

      await validator.testQRScanningFunctionality();

      const deviceResults = Object.values(validator.testResults.qrScanningFunctionality);
      expect(deviceResults.some(result => result.error)).toBe(true);
    });

    test('should handle page evaluation errors', async () => {
      mockPage.evaluate.mockRejectedValueOnce(new Error('Evaluation failed'));

      const result = await validator.testCameraAccess(mockPage);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Evaluation failed');
    });
  });

  describe('Integration Tests', () => {
    test('should run complete validation successfully', async () => {
      // Mock all page evaluations to return successful results
      mockPage.evaluate.mockImplementation(() => {
        return Promise.resolve({
          success: true,
          score: 85,
          // Add other required properties based on the specific test
        });
      });

      const report = await validator.validateGuardMobileApp();

      expect(report).toHaveProperty('overallScore');
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('details');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('summary');
    });
  });
});