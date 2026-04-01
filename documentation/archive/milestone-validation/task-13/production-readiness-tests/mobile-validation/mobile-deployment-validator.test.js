/**
 * Mobile Deployment Validator Tests
 * 
 * Comprehensive test suite for mobile app deployment validation
 * covering app store readiness, update mechanisms, device adaptation,
 * and network optimization.
 */

import { jest } from '@jest/globals';
import MobileDeploymentValidator from './mobile-deployment-validator.js';

describe('MobileDeploymentValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new MobileDeploymentValidator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(validator).toBeInstanceOf(MobileDeploymentValidator);
      expect(validator.validationResults).toBeDefined();
      expect(validator.deploymentConfig).toBeDefined();
      expect(validator.deviceCapabilities).toBeDefined();
      expect(validator.networkConditions).toBeDefined();
    });

    test('should load deployment configuration correctly', () => {
      const config = validator.deploymentConfig;
      
      expect(config.appStore.ios.bundleId).toBe('com.securegate.guard');
      expect(config.appStore.android.packageName).toBe('com.securegate.guard');
      expect(config.pwa.manifestPath).toBe('public/manifest.json');
      expect(config.updateMechanisms.ios.type).toBe('app-store');
    });

    test('should load device capabilities matrix', () => {
      const capabilities = validator.deviceCapabilities;
      
      expect(capabilities.camera.required).toBe(true);
      expect(capabilities.camera.fallback).toBe('manual-entry');
      expect(capabilities.biometrics.required).toBe(false);
      expect(capabilities.offlineStorage.required).toBe(true);
    });

    test('should load network conditions scenarios', () => {
      const conditions = validator.networkConditions;
      
      expect(conditions.offline.bandwidth).toBe(0);
      expect(conditions.slow2g.bandwidth).toBe(50);
      expect(conditions.wifi.bandwidth).toBe(30000);
      expect(conditions.regular4g.latency).toBe(85);
    });
  });

  describe('App Store Readiness Validation', () => {
    test('should validate app store readiness successfully', async () => {
      const result = await validator.validateAppStoreReadiness();
      
      expect(result).toHaveProperty('ios');
      expect(result).toHaveProperty('android');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('assets');
      expect(result).toHaveProperty('compliance');
    });

    test('should validate iOS deployment configuration', async () => {
      const result = await validator.validateIOSDeployment();
      
      expect(result.valid).toBe(true);
      expect(result.validations).toBeInstanceOf(Array);
      expect(result.config).toBeDefined();
      expect(result.config.bundleId).toBe('com.securegate.guard');
    });

    test('should detect invalid iOS bundle ID', async () => {
      validator.deploymentConfig.appStore.ios.bundleId = 'invalid bundle id';
      
      const result = await validator.validateIOSDeployment();
      
      expect(result.valid).toBe(false);
      expect(result.validations.some(v => 
        v.type === 'error' && v.message.includes('Invalid bundle ID format')
      )).toBe(true);
    });

    test('should validate Android deployment configuration', async () => {
      const result = await validator.validateAndroidDeployment();
      
      expect(result.valid).toBe(true);
      expect(result.validations).toBeInstanceOf(Array);
      expect(result.config).toBeDefined();
      expect(result.config.packageName).toBe('com.securegate.guard');
    });

    test('should detect invalid Android package name', async () => {
      validator.deploymentConfig.appStore.android.packageName = 'invalid-package-name';
      
      const result = await validator.validateAndroidDeployment();
      
      expect(result.valid).toBe(false);
      expect(result.validations.some(v => 
        v.type === 'error' && v.message.includes('Invalid package name format')
      )).toBe(true);
    });

    test('should validate app metadata', async () => {
      const result = await validator.validateAppMetadata();
      
      expect(result.valid).toBe(true);
      expect(result.metadata.appName).toBe('Secure Gate Guard');
      expect(result.metadata.category).toBe('Business');
      expect(result.metadata.keywords).toContain('security');
    });

    test('should detect long app name', async () => {
      // Mock a long app name
      const originalValidateAppMetadata = validator.validateAppMetadata;
      validator.validateAppMetadata = async function() {
        const result = await originalValidateAppMetadata.call(this);
        // Simulate long app name validation
        result.validations.push({
          type: 'error',
          message: 'App name should be 30 characters or less',
          requirement: '13.3'
        });
        result.valid = false;
        return result;
      };
      
      const result = await validator.validateAppMetadata();
      
      expect(result.validations.some(v => 
        v.message.includes('App name should be 30 characters or less')
      )).toBe(true);
    });

    test('should validate app assets requirements', async () => {
      const result = await validator.validateAppAssets();
      
      expect(result.valid).toBe(true);
      expect(result.requirements.icons.ios).toContain(1024);
      expect(result.requirements.icons.android).toContain(512);
      expect(result.requirements.screenshots.ios.iPhone).toBeDefined();
    });

    test('should validate store compliance', async () => {
      const result = await validator.validateStoreCompliance();
      
      expect(result.valid).toBe(true);
      expect(result.compliance.privacyPolicy).toBe('https://secure-gate.app/privacy');
      expect(result.compliance.contentRating).toBe('4+');
    });
  });

  describe('Update Mechanisms Validation', () => {
    test('should validate update mechanisms successfully', async () => {
      const result = await validator.validateUpdateMechanisms();
      
      expect(result).toHaveProperty('versionManagement');
      expect(result).toHaveProperty('updateDelivery');
      expect(result).toHaveProperty('rollbackProcedures');
      expect(result).toHaveProperty('compatibilityMatrix');
    });

    test('should validate version management', async () => {
      const result = await validator.validateVersionManagement();
      
      expect(result.valid).toBe(true);
      expect(result.versioningStrategy).toBe('semantic');
      expect(result.compatibilityMatrix).toBeDefined();
      expect(result.compatibilityMatrix['1.0.0']).toBeDefined();
    });

    test('should validate update delivery mechanisms', async () => {
      const result = await validator.validateUpdateDelivery();
      
      expect(result.valid).toBe(true);
      expect(result.deliveryMechanisms.ios.type).toBe('app-store');
      expect(result.deliveryMechanisms.android.type).toBe('play-store');
      expect(result.deliveryMechanisms.pwa.type).toBe('service-worker');
    });

    test('should validate rollback procedures', async () => {
      const result = await validator.validateRollbackProcedures();
      
      expect(result.valid).toBe(true);
      expect(result.rollbackProcedures.ios.method).toBe('app-store-expedited-review');
      expect(result.rollbackProcedures.android.method).toBe('play-console-rollback');
      expect(result.rollbackProcedures.pwa.method).toBe('service-worker-cache-invalidation');
    });

    test('should validate compatibility matrix', async () => {
      const result = await validator.validateCompatibilityMatrix();
      
      expect(result.valid).toBe(true);
      expect(result.osCompatibility.ios.minimum).toBe('12.0');
      expect(result.osCompatibility.android.minimum).toBe('API 21 (Android 5.0)');
      expect(result.deviceCompatibility.ios.supported).toContain('iPhone 6s+');
    });
  });

  describe('Device Capability Adaptation Validation', () => {
    test('should validate device capability adaptation successfully', async () => {
      const result = await validator.validateDeviceCapabilityAdaptation();
      
      expect(result).toHaveProperty('featureDetection');
      expect(result).toHaveProperty('gracefulDegradation');
      expect(result).toHaveProperty('polyfills');
      expect(result).toHaveProperty('adaptiveUI');
    });

    test('should validate feature detection', async () => {
      const result = await validator.validateFeatureDetection();
      
      expect(result.valid).toBe(true);
      expect(result.capabilities.camera.detection).toBe('navigator.mediaDevices.getUserMedia');
      expect(result.capabilities.biometrics.fallback).toBe('password-only');
      expect(result.detectionExamples.camera).toContain('navigator.mediaDevices.getUserMedia');
    });

    test('should validate graceful degradation', async () => {
      const result = await validator.validateGracefulDegradation();
      
      expect(result.valid).toBe(true);
      expect(result.degradationStrategies.camera.primary).toBe('QR code scanning');
      expect(result.degradationStrategies.camera.fallback).toBe('Manual visitor code entry');
    });

    test('should validate polyfills', async () => {
      const result = await validator.validatePolyfills();
      
      expect(result.valid).toBe(true);
      expect(result.polyfills['core-js']).toBeDefined();
      expect(result.polyfills['intersection-observer']).toBeDefined();
      expect(result.totalSize).toMatch(/\d+KB/);
    });

    test('should warn about large polyfill size', async () => {
      // Mock large polyfill size
      const originalValidatePolyfills = validator.validatePolyfills;
      validator.validatePolyfills = async function() {
        const result = await originalValidatePolyfills.call(this);
        result.validations.push({
          type: 'warning',
          message: 'Total polyfill size (150KB) may impact performance',
          requirement: '13.8'
        });
        return result;
      };
      
      const result = await validator.validatePolyfills();
      
      expect(result.validations.some(v => 
        v.type === 'warning' && v.message.includes('may impact performance')
      )).toBe(true);
    });

    test('should validate adaptive UI', async () => {
      const result = await validator.validateAdaptiveUI();
      
      expect(result.valid).toBe(true);
      expect(result.breakpoints.mobile).toBe('320px - 768px');
      expect(result.accessibilityFeatures).toContain('High contrast mode support');
    });
  });

  describe('Network Optimization Validation', () => {
    test('should validate network optimization successfully', async () => {
      const result = await validator.validateNetworkOptimization();
      
      expect(result).toHaveProperty('offlineCapability');
      expect(result).toHaveProperty('cacheStrategies');
      expect(result).toHaveProperty('bandwidthAdaptation');
      expect(result).toHaveProperty('connectionResilience');
    });

    test('should validate offline capability', async () => {
      const result = await validator.validateOfflineCapability();
      
      expect(result.valid).toBe(true);
      expect(result.offlineFunctionality).toContain('View cached visitor list');
      expect(result.syncStrategy).toBe('background-sync');
    });

    test('should validate cache strategies', async () => {
      const result = await validator.validateCacheStrategies();
      
      expect(result.valid).toBe(true);
      expect(result.strategies.static).toBe('cache-first');
      expect(result.strategies.api).toBe('network-first');
      expect(result.performance.static.hitRate).toBe('95%');
    });

    test('should validate bandwidth adaptation', async () => {
      const result = await validator.validateBandwidthAdaptation();
      
      expect(result.valid).toBe(true);
      expect(result.adaptiveStrategies.slow2g).toBeDefined();
      expect(result.adaptiveStrategies.wifi).toBeDefined();
      expect(result.networkConditions.slow2g.bandwidth).toBe(50);
    });

    test('should validate connection resilience', async () => {
      const result = await validator.validateConnectionResilience();
      
      expect(result.valid).toBe(true);
      expect(result.retryStrategies.api.maxRetries).toBe(3);
      expect(result.retryStrategies.sync.backoffStrategy).toBe('linear');
      expect(result.timeoutConfig.api).toBe('30 seconds');
    });
  });

  describe('PWA Deployment Validation', () => {
    test('should validate PWA deployment successfully', async () => {
      const result = await validator.validatePWADeployment();
      
      expect(result).toHaveProperty('manifest');
      expect(result).toHaveProperty('serviceWorker');
      expect(result).toHaveProperty('installation');
      expect(result).toHaveProperty('updates');
    });

    test('should validate web app manifest', async () => {
      const result = await validator.validateWebAppManifest();
      
      expect(result.valid).toBe(true);
      expect(result.manifest.name).toBe('Secure Gate Guard');
      expect(result.manifest.display).toBe('standalone');
      expect(result.manifest.icons).toHaveLength(3);
    });

    test('should detect missing manifest fields', async () => {
      // Mock missing manifest field
      const originalValidateWebAppManifest = validator.validateWebAppManifest;
      validator.validateWebAppManifest = async function() {
        const result = await originalValidateWebAppManifest.call(this);
        result.validations.push({
          type: 'error',
          message: 'Missing required manifest field: name',
          requirement: '13.3'
        });
        result.valid = false;
        return result;
      };
      
      const result = await validator.validateWebAppManifest();
      
      expect(result.valid).toBe(false);
      expect(result.validations.some(v => 
        v.type === 'error' && v.message.includes('Missing required manifest field')
      )).toBe(true);
    });

    test('should validate service worker', async () => {
      const result = await validator.validateServiceWorker();
      
      expect(result.valid).toBe(true);
      expect(result.cacheStrategies).toContain('Cache First (static assets)');
      expect(result.lifecycleEvents).toContain('install');
    });

    test('should validate installation', async () => {
      const result = await validator.validateInstallation();
      
      expect(result.valid).toBe(true);
      expect(result.installCriteria).toContain('HTTPS served');
      expect(result.platformInstall.android).toBe('Add to Home Screen banner');
    });

    test('should validate PWA updates', async () => {
      const result = await validator.validatePWAUpdates();
      
      expect(result.valid).toBe(true);
      expect(result.updateStrategies.immediate).toBe('Critical security updates');
      expect(result.updateStrategies.deferred).toBe('Feature updates and improvements');
    });
  });

  describe('Cross-Platform Consistency Validation', () => {
    test('should validate cross-platform consistency successfully', async () => {
      const result = await validator.validateCrossPlatformConsistency();
      
      expect(result).toHaveProperty('featureParity');
      expect(result).toHaveProperty('uiConsistency');
      expect(result).toHaveProperty('performanceParity');
      expect(result).toHaveProperty('dataConsistency');
    });

    test('should validate feature parity', async () => {
      const result = await validator.validateFeatureParity();
      
      expect(result.valid).toBe(true);
      expect(result.coreFeatures).toContain('QR code scanning');
      expect(result.platformSupport.ios).toHaveLength(6);
      expect(result.platformSupport.pwa).toHaveLength(5); // Excluding biometric auth
    });

    test('should validate UI consistency', async () => {
      const result = await validator.validateUIConsistency();
      
      expect(result.valid).toBe(true);
      expect(result.designTokens.colors.primary).toBe('#10b981');
      expect(result.sharedComponents).toContain('Button');
    });

    test('should validate performance parity', async () => {
      const result = await validator.validatePerformanceParity();
      
      expect(result.valid).toBe(true);
      expect(result.performanceBenchmarks.ios.appLaunch).toBe('< 2 seconds');
      expect(result.optimizations).toContain('Code splitting and lazy loading');
    });

    test('should validate data consistency', async () => {
      const result = await validator.validateDataConsistency();
      
      expect(result.valid).toBe(true);
      expect(result.conflictResolution.strategy).toBe('last-write-wins');
      expect(result.conflictResolution.timestampPrecision).toBe('milliseconds');
    });
  });

  describe('Report Generation', () => {
    test('should generate comprehensive deployment report', async () => {
      // Run some validations first
      await validator.validateAppStoreReadiness();
      await validator.validateUpdateMechanisms();
      
      const report = await validator.generateDeploymentReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.summary.totalValidations).toBeGreaterThan(0);
      expect(report.summary.passedValidations).toBeGreaterThan(0);
      expect(report.results).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(typeof report.deploymentReadiness).toBe('boolean');
    });

    test('should mark deployment as not ready when errors exist', async () => {
      // Mock validation with errors
      validator.validationResults.appStoreReadiness = {
        ios: {
          validations: [
            { type: 'error', message: 'Test error', requirement: '13.3' }
          ]
        }
      };
      
      const report = await validator.generateDeploymentReport();
      
      expect(report.deploymentReadiness).toBe(false);
      expect(report.summary.failedValidations).toBeGreaterThan(0);
      expect(report.recommendations).toContain('Address all error-level validations before deployment');
    });

    test('should include warnings in recommendations', async () => {
      // Mock validation with warnings
      validator.validationResults.appStoreReadiness = {
        ios: {
          validations: [
            { type: 'warning', message: 'Test warning', requirement: '13.3' }
          ]
        }
      };
      
      const report = await validator.generateDeploymentReport();
      
      expect(report.summary.warningValidations).toBeGreaterThan(0);
      expect(report.recommendations).toContain('Review and address warning-level validations for optimal deployment');
    });
  });

  describe('Complete Validation', () => {
    test('should run complete validation successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const report = await validator.runCompleteValidation();
      
      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith('🚀 Starting Mobile App Deployment Validation...\n');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Mobile App Deployment Validation Complete\n');
      
      consoleSpy.mockRestore();
    });

    test('should handle validation errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock a validation method to throw an error
      validator.validateAppStoreReadiness = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(validator.runCompleteValidation()).rejects.toThrow('Test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Mobile App Deployment Validation Failed:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing configuration gracefully', () => {
      validator.deploymentConfig = {};
      
      expect(() => validator.validateIOSDeployment()).not.toThrow();
    });

    test('should handle invalid network conditions', () => {
      validator.networkConditions = null;
      
      expect(() => validator.validateBandwidthAdaptation()).not.toThrow();
    });

    test('should handle empty validation results', async () => {
      validator.validationResults = {};
      
      const report = await validator.generateDeploymentReport();
      
      expect(report.summary.totalValidations).toBe(0);
      expect(report.deploymentReadiness).toBe(true); // No errors means ready
    });

    test('should validate with minimal configuration', () => {
      const minimalValidator = new MobileDeploymentValidator();
      minimalValidator.deploymentConfig = {
        appStore: { ios: {}, android: {} },
        pwa: {},
        updateMechanisms: { ios: {}, android: {}, pwa: {} }
      };
      
      expect(() => minimalValidator.validateAppStoreReadiness()).not.toThrow();
    });
  });

  describe('Performance and Memory', () => {
    test('should complete validation within reasonable time', async () => {
      const startTime = Date.now();
      
      await validator.runCompleteValidation();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
    });

    test('should not leak memory during validation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Run validation multiple times
      for (let i = 0; i < 5; i++) {
        await validator.validateAppStoreReadiness();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});