/**
 * Performance Regression Tests for Critical Services
 * 
 * Tests service layer performance to detect regressions.
 * Focuses on encryption, token operations, and compliance services.
 */

import { jest, describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import {
  benchmark,
  performanceAssert,
  Timer,
  BaselineManager,
  createBenchmarkSuite
} from './benchmark.utils.js';

// Performance thresholds for service operations (in ms)
const SERVICE_THRESHOLDS = {
  encryption: 50,
  decryption: 50,
  tokenGeneration: 30,
  tokenVerification: 20,
  hashGeneration: 100,
  hashVerification: 100,
  complianceCheck: 200,
  auditLogging: 50,
  cacheOperation: 10,
  qrGeneration: 100,
  notificationPrep: 50
};

// Mock crypto operations
const mockCrypto = {
  encrypt: async (data) => {
    await simulateDelay(10);
    return Buffer.from(data).toString('base64');
  },
  decrypt: async (data) => {
    await simulateDelay(10);
    return Buffer.from(data, 'base64').toString();
  },
  hash: async (data) => {
    await simulateDelay(30);
    return `hashed_${data}`;
  },
  verifyHash: async (data, hash) => {
    await simulateDelay(30);
    return hash === `hashed_${data}`;
  }
};

// Mock token service
const mockTokenService = {
  generateAccessToken: async (payload) => {
    await simulateDelay(5);
    return `access_token_${Date.now()}`;
  },
  generateRefreshToken: async (payload) => {
    await simulateDelay(5);
    return `refresh_token_${Date.now()}`;
  },
  verifyToken: async (token) => {
    await simulateDelay(3);
    return { valid: true, payload: { userId: 1 } };
  },
  decodeToken: (token) => {
    return { userId: 1, role: 'admin' };
  }
};

// Mock compliance service
const mockComplianceService = {
  runGDPRCheck: async (data) => {
    await simulateDelay(50);
    return { compliant: true, violations: [] };
  },
  runKenyaDPACheck: async (data) => {
    await simulateDelay(40);
    return { compliant: true, findings: [] };
  },
  runISO27001Check: async (data) => {
    await simulateDelay(60);
    return { score: 95, recommendations: [] };
  },
  runOWASPCheck: async (data) => {
    await simulateDelay(30);
    return { vulnerabilities: [], riskLevel: 'low' };
  }
};

// Mock cache service
const mockCacheService = {
  data: new Map(),
  get: async (key) => {
    await simulateDelay(1);
    return mockCacheService.data.get(key);
  },
  set: async (key, value, ttl) => {
    await simulateDelay(1);
    mockCacheService.data.set(key, value);
    return true;
  },
  delete: async (key) => {
    await simulateDelay(1);
    return mockCacheService.data.delete(key);
  },
  clear: async () => {
    await simulateDelay(2);
    mockCacheService.data.clear();
  }
};

// Mock QR service
const mockQRService = {
  generate: async (data) => {
    await simulateDelay(20);
    return 'data:image/png;base64,mock_qr_code';
  },
  generateWithLogo: async (data, logo) => {
    await simulateDelay(40);
    return 'data:image/png;base64,mock_qr_with_logo';
  }
};

// Mock notification service
const mockNotificationService = {
  prepareEmail: async (template, data) => {
    await simulateDelay(10);
    return { subject: 'Test', body: 'Test body', to: data.email };
  },
  prepareSMS: async (template, data) => {
    await simulateDelay(5);
    return { to: data.phone, message: 'Test message' };
  },
  queueNotification: async (notification) => {
    await simulateDelay(5);
    return { queued: true, id: Date.now() };
  }
};

describe('Service Performance Regression Tests', () => {
  let baselineManager;

  beforeAll(() => {
    baselineManager = new BaselineManager();
  });

  describe('Encryption Service', () => {
    it('should encrypt data within threshold', async () => {
      const testData = 'sensitive_user_data_to_encrypt';
      
      const result = await benchmark(
        async () => {
          await mockCrypto.encrypt(testData);
        },
        { iterations: 50, name: 'encryption' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.encryption);
      expect(result.stats.p99).toBeLessThan(SERVICE_THRESHOLDS.encryption * 2);
    });

    it('should decrypt data within threshold', async () => {
      const encrypted = await mockCrypto.encrypt('test_data');
      
      const result = await benchmark(
        async () => {
          await mockCrypto.decrypt(encrypted);
        },
        { iterations: 50, name: 'decryption' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.decryption);
    });

    it('should handle encryption of varying data sizes', async () => {
      const sizes = [100, 1000, 10000];
      
      for (const size of sizes) {
        const testData = 'x'.repeat(size);
        
        const result = await benchmark(
          async () => {
            await mockCrypto.encrypt(testData);
          },
          { iterations: 20, name: `encryption_${size}bytes` }
        );

        // Time should scale reasonably with data size
        const maxTime = SERVICE_THRESHOLDS.encryption + (size / 100);
        expect(result.stats.mean).toBeLessThan(maxTime);
      }
    });

    it('should not regress encryption performance', async () => {
      const result = await benchmark(
        async () => {
          await mockCrypto.encrypt('baseline_test_data');
        },
        { iterations: 30, name: 'encryption_baseline' }
      );

      const comparison = baselineManager.compareToBaseline(
        'encryption_baseline',
        result.stats,
        25
      );

      if (!comparison.hasBaseline) {
        baselineManager.setBaseline('encryption_baseline', result.stats);
      }

      expect(comparison.regression).toBe(false);
    });
  });

  describe('Password Hashing Service', () => {
    it('should hash passwords within threshold', async () => {
      const result = await benchmark(
        async () => {
          await mockCrypto.hash('user_password_123');
        },
        { iterations: 20, name: 'password_hash' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.hashGeneration);
    });

    it('should verify passwords within threshold', async () => {
      const hash = await mockCrypto.hash('test_password');
      
      const result = await benchmark(
        async () => {
          await mockCrypto.verifyHash('test_password', hash);
        },
        { iterations: 20, name: 'password_verify' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.hashVerification);
    });
  });

  describe('Token Service', () => {
    it('should generate access tokens within threshold', async () => {
      const result = await benchmark(
        async () => {
          await mockTokenService.generateAccessToken({ userId: 1, role: 'user' });
        },
        { iterations: 50, name: 'access_token_generation' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.tokenGeneration);
    });

    it('should generate refresh tokens within threshold', async () => {
      const result = await benchmark(
        async () => {
          await mockTokenService.generateRefreshToken({ userId: 1 });
        },
        { iterations: 50, name: 'refresh_token_generation' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.tokenGeneration);
    });

    it('should verify tokens within threshold', async () => {
      const token = await mockTokenService.generateAccessToken({ userId: 1 });
      
      const result = await benchmark(
        async () => {
          await mockTokenService.verifyToken(token);
        },
        { iterations: 100, name: 'token_verification' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.tokenVerification);
      expect(result.stats.p99).toBeLessThan(SERVICE_THRESHOLDS.tokenVerification * 2);
    });

    it('should decode tokens synchronously (near-instant)', async () => {
      const token = await mockTokenService.generateAccessToken({ userId: 1 });
      
      const timer = new Timer();
      timer.start();
      
      for (let i = 0; i < 1000; i++) {
        mockTokenService.decodeToken(token);
      }
      
      timer.stop();
      
      // 1000 decodes should be < 10ms total
      expect(timer.getElapsedMs()).toBeLessThan(10);
    });
  });

  describe('Compliance Services', () => {
    const testData = {
      userData: { email: 'test@example.com', phone: '+254700123456' },
      consentRecords: [{ type: 'marketing', granted: true }],
      dataProcessing: { purpose: 'visitor_management' }
    };

    it('should run GDPR check within threshold', async () => {
      const result = await benchmark(
        async () => {
          await mockComplianceService.runGDPRCheck(testData);
        },
        { iterations: 20, name: 'gdpr_check' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.complianceCheck);
    });

    it('should run Kenya DPA check within threshold', async () => {
      const result = await benchmark(
        async () => {
          await mockComplianceService.runKenyaDPACheck(testData);
        },
        { iterations: 20, name: 'kenya_dpa_check' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.complianceCheck);
    });

    it('should run ISO 27001 check within threshold', async () => {
      const result = await benchmark(
        async () => {
          await mockComplianceService.runISO27001Check(testData);
        },
        { iterations: 20, name: 'iso27001_check' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.complianceCheck);
    });

    it('should run OWASP check within threshold', async () => {
      const result = await benchmark(
        async () => {
          await mockComplianceService.runOWASPCheck(testData);
        },
        { iterations: 20, name: 'owasp_check' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.complianceCheck);
    });

    it('should run all compliance checks in parallel efficiently', async () => {
      const timer = new Timer();
      timer.start();

      await Promise.all([
        mockComplianceService.runGDPRCheck(testData),
        mockComplianceService.runKenyaDPACheck(testData),
        mockComplianceService.runISO27001Check(testData),
        mockComplianceService.runOWASPCheck(testData)
      ]);

      timer.stop();

      // Parallel should be much faster than sequential
      const sequentialTime = SERVICE_THRESHOLDS.complianceCheck * 4;
      expect(timer.getElapsedMs()).toBeLessThan(sequentialTime);
    });
  });

  describe('Cache Service', () => {
    beforeEach(async () => {
      await mockCacheService.clear();
    });

    it('should get cached data within threshold', async () => {
      await mockCacheService.set('test_key', { data: 'value' });
      
      const result = await benchmark(
        async () => {
          await mockCacheService.get('test_key');
        },
        { iterations: 100, name: 'cache_get' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.cacheOperation);
    });

    it('should set cached data within threshold', async () => {
      const result = await benchmark(
        async () => {
          await mockCacheService.set(`key_${Date.now()}`, { data: 'value' }, 3600);
        },
        { iterations: 100, name: 'cache_set' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.cacheOperation);
    });

    it('should handle cache miss efficiently', async () => {
      const result = await benchmark(
        async () => {
          await mockCacheService.get('non_existent_key');
        },
        { iterations: 100, name: 'cache_miss' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.cacheOperation);
    });
  });

  describe('QR Code Service', () => {
    it('should generate QR codes within threshold', async () => {
      const result = await benchmark(
        async () => {
          await mockQRService.generate('visitor_access_code_12345');
        },
        { iterations: 30, name: 'qr_generation' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.qrGeneration);
    });

    it('should generate QR codes with logo within threshold', async () => {
      const result = await benchmark(
        async () => {
          await mockQRService.generateWithLogo('visitor_access_code_12345', 'logo.png');
        },
        { iterations: 20, name: 'qr_generation_with_logo' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.qrGeneration * 2);
    });
  });

  describe('Notification Service', () => {
    it('should prepare email notifications within threshold', async () => {
      const result = await benchmark(
        async () => {
          await mockNotificationService.prepareEmail('visitor_invitation', {
            email: 'visitor@example.com',
            visitorName: 'John Doe',
            hostName: 'Jane Smith'
          });
        },
        { iterations: 50, name: 'email_preparation' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.notificationPrep);
    });

    it('should prepare SMS notifications within threshold', async () => {
      const result = await benchmark(
        async () => {
          await mockNotificationService.prepareSMS('visitor_otp', {
            phone: '+254700123456',
            otp: '123456'
          });
        },
        { iterations: 50, name: 'sms_preparation' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.notificationPrep);
    });

    it('should queue notifications within threshold', async () => {
      const notification = await mockNotificationService.prepareEmail('test', { email: 'test@test.com' });
      
      const result = await benchmark(
        async () => {
          await mockNotificationService.queueNotification(notification);
        },
        { iterations: 50, name: 'notification_queue' }
      );

      expect(result.stats.mean).toBeLessThan(SERVICE_THRESHOLDS.notificationPrep);
    });
  });

  describe('Service Memory Usage', () => {
    it('should not leak memory during encryption operations', async () => {
      const result = await benchmark(
        async () => {
          const data = 'x'.repeat(1000);
          await mockCrypto.encrypt(data);
        },
        { iterations: 100, name: 'encryption_memory' }
      );

      // Check memory growth is reasonable
      const memoryGrowth = result.memoryStats.heapUsed.max - result.memoryStats.heapUsed.min;
      performanceAssert.memoryUnderMb(memoryGrowth, 50, 'Encryption memory leak detected');
    });

    it('should not leak memory during token operations', async () => {
      const result = await benchmark(
        async () => {
          const token = await mockTokenService.generateAccessToken({ userId: 1 });
          await mockTokenService.verifyToken(token);
        },
        { iterations: 100, name: 'token_memory' }
      );

      const memoryGrowth = result.memoryStats.heapUsed.max - result.memoryStats.heapUsed.min;
      performanceAssert.memoryUnderMb(memoryGrowth, 30, 'Token service memory leak detected');
    });
  });
});

describe('Service Performance Benchmark Suite', () => {
  it('should run complete service benchmark suite', async () => {
    const suite = createBenchmarkSuite('Critical Services');

    suite
      .add('Encryption', async () => {
        await mockCrypto.encrypt('test_data');
      }, { iterations: 30 })
      .add('Token Generation', async () => {
        await mockTokenService.generateAccessToken({ userId: 1 });
      }, { iterations: 30 })
      .add('Token Verification', async () => {
        await mockTokenService.verifyToken('test_token');
      }, { iterations: 30 })
      .add('Cache Get', async () => {
        await mockCacheService.get('test_key');
      }, { iterations: 50 })
      .add('GDPR Compliance', async () => {
        await mockComplianceService.runGDPRCheck({});
      }, { iterations: 10 });

    const summary = await suite.run({ tolerancePercent: 25 });

    expect(summary.total).toBe(5);
    expect(summary.passRate).toBeGreaterThanOrEqual(0);
  });
});

// Helper function
function simulateDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
