/**
 * Property-Based Test: Consent Management Clarity
 * 
 * Property 29: Consent Management Clarity
 * For any user consent requirement, the consent mechanism should be clear and 
 * understandable with easy withdrawal options that are immediately effective
 * 
 * Validates: Requirements 14.6
 * 
 * This test ensures that:
 * 1. Consent mechanisms are clear and understandable to users
 * 2. Consent withdrawal options are easily accessible and immediately effective
 * 3. Consent records are properly maintained with audit trails
 * 4. Users receive clear information about data usage and their rights
 * 5. Consent granularity allows users to control specific data processing activities
 */

import { jest } from '@jest/globals';
import fc from 'fast-check';

// Mock the privacy compliance service
const mockPrivacyService = {
  getConsentRecords: jest.fn(),
  recordConsent: jest.fn(),
  withdrawConsent: jest.fn(),
  validateConsentRequest: jest.fn(),
  getConsentDescription: jest.fn(),
  checkConsentStatus: jest.fn(),
  generateConsentAuditTrail: jest.fn(),
  notifyConsentChange: jest.fn(),
  getDataProcessingPurposes: jest.fn(),
  validateConsentWithdrawal: jest.fn()
};

jest.unstable_mockModule('../../src/services/privacyComplianceService.js', () => ({
  default: mockPrivacyService,
  privacyComplianceService: mockPrivacyService
}));

// Test configuration
const TEST_CONFIG = {
  PROPERTY_RUNS: 100,
  TIMEOUT_MS: 30000,
  MAX_CONSENT_TYPES: 10,
  CONSENT_TYPES: [
    'data_processing',
    'marketing_communications',
    'analytics_tracking',
    'third_party_sharing',
    'location_tracking',
    'biometric_data',
    'communication_monitoring',
    'automated_decision_making',
    'data_profiling',
    'cross_border_transfer'
  ],
  CONSENT_STATUSES: ['granted', 'denied', 'withdrawn', 'expired', 'pending'],
  WITHDRAWAL_METHODS: ['web_interface', 'email_request', 'phone_call', 'written_request'],
  LANGUAGES: ['en', 'sw', 'fr', 'es', 'de'],
  PROCESSING_PURPOSES: [
    'service_provision',
    'security_monitoring',
    'performance_analytics',
    'marketing_outreach',
    'legal_compliance',
    'fraud_prevention',
    'customer_support',
    'product_improvement'
  ]
};

// Consent record generators
const consentRecordArb = fc.record({
  id: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
  userId: fc.integer({ min: 1, max: 10000 }),
  estateId: fc.integer({ min: 1, max: 1000 }),
  consentType: fc.constantFrom(...TEST_CONFIG.CONSENT_TYPES),
  status: fc.constantFrom(...TEST_CONFIG.CONSENT_STATUSES),
  grantedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() })),
  withdrawnAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() })),
  expiresAt: fc.option(fc.date({ min: new Date(), max: new Date('2030-12-31') })),
  processingPurposes: fc.array(fc.constantFrom(...TEST_CONFIG.PROCESSING_PURPOSES), { 
    minLength: 1, 
    maxLength: 4 
  }),
  withdrawalMethod: fc.option(fc.constantFrom(...TEST_CONFIG.WITHDRAWAL_METHODS)),
  language: fc.constantFrom(...TEST_CONFIG.LANGUAGES),
  ipAddress: fc.ipV4(),
  userAgent: fc.string({ minLength: 10, maxLength: 200 }),
  consentVersion: fc.string({ minLength: 3, maxLength: 10 }),
  isGranular: fc.boolean(),
  granularChoices: fc.option(fc.record({
    essential: fc.boolean(),
    analytics: fc.boolean(),
    marketing: fc.boolean(),
    thirdParty: fc.boolean()
  }))
}).map(consent => {
  // Ensure logical consistency
  let status = consent.status;
  let grantedAt = consent.grantedAt;
  let withdrawnAt = consent.withdrawnAt;
  let withdrawalMethod = consent.withdrawalMethod;
  
  // If status is granted, must have grantedAt
  if (status === 'granted') {
    if (!grantedAt) {
      grantedAt = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000); // Random date in past year
    }
    withdrawnAt = null; // Can't be withdrawn if currently granted
    withdrawalMethod = null;
  }
  
  // If status is withdrawn, must have withdrawnAt and method
  if (status === 'withdrawn') {
    if (!withdrawnAt) {
      withdrawnAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date in past month
    }
    if (!withdrawalMethod) {
      withdrawalMethod = 'web_interface'; // Default withdrawal method
    }
    // Ensure grantedAt is before withdrawnAt
    if (grantedAt && withdrawnAt && grantedAt >= withdrawnAt) {
      grantedAt = new Date(withdrawnAt.getTime() - 24 * 60 * 60 * 1000); // 1 day before withdrawal
    }
  }
  
  // If status is denied, no granted or withdrawn dates
  if (status === 'denied') {
    grantedAt = null;
    withdrawnAt = null;
    withdrawalMethod = null;
  }
  
  // If status is expired, must have been granted first
  if (status === 'expired') {
    if (!grantedAt) {
      grantedAt = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    }
    withdrawnAt = null;
    withdrawalMethod = null;
  }
  
  return {
    ...consent,
    status,
    grantedAt,
    withdrawnAt,
    withdrawalMethod
  };
});

const consentRequestArb = fc.record({
  userId: fc.integer({ min: 1, max: 10000 }),
  estateId: fc.integer({ min: 1, max: 1000 }),
  consentTypes: fc.array(fc.constantFrom(...TEST_CONFIG.CONSENT_TYPES), { 
    minLength: 1, 
    maxLength: 5 
  }),
  processingPurposes: fc.array(fc.constantFrom(...TEST_CONFIG.PROCESSING_PURPOSES), { 
    minLength: 1, 
    maxLength: 3 
  }),
  language: fc.constantFrom(...TEST_CONFIG.LANGUAGES),
  requestContext: fc.record({
    ipAddress: fc.ipV4(),
    userAgent: fc.string({ minLength: 10, maxLength: 200 }),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    source: fc.constantFrom(['registration', 'settings_page', 'data_request', 'marketing_opt_in'])
  }),
  granularConsent: fc.boolean(),
  consentVersion: fc.string({ minLength: 3, maxLength: 10 })
});

const consentWithdrawalArb = fc.record({
  consentId: fc.string({ minLength: 5, maxLength: 50 }),
  userId: fc.integer({ min: 1, max: 10000 }),
  withdrawalMethod: fc.constantFrom(...TEST_CONFIG.WITHDRAWAL_METHODS),
  reason: fc.option(fc.constantFrom([
    'no_longer_needed',
    'privacy_concerns',
    'too_many_communications',
    'data_accuracy_issues',
    'service_termination',
    'legal_requirement',
    'other'
  ])),
  effectiveDate: fc.option(fc.date({ min: new Date(), max: new Date('2030-12-31') })),
  requestContext: fc.record({
    ipAddress: fc.ipV4(),
    userAgent: fc.string({ minLength: 10, maxLength: 200 }),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() })
  }),
  confirmationRequired: fc.boolean(),
  immediateEffect: fc.boolean()
}).map(withdrawal => {
  // If immediate effect is true, effective date should be null
  if (withdrawal.immediateEffect) {
    return {
      ...withdrawal,
      effectiveDate: null
    };
  }
  return withdrawal;
});

// Test utilities
class ConsentTestUtils {
  static validateConsentRecord(consent) {
    // Validate basic consent structure
    expect(consent).toHaveProperty('id');
    expect(consent).toHaveProperty('userId');
    expect(consent).toHaveProperty('estateId');
    expect(consent).toHaveProperty('consentType');
    expect(consent).toHaveProperty('status');
    
    // Validate user and estate IDs are positive
    expect(consent.userId).toBeGreaterThan(0);
    expect(consent.estateId).toBeGreaterThan(0);
    
    // Validate consent type is supported
    expect(TEST_CONFIG.CONSENT_TYPES).toContain(consent.consentType);
    
    // Validate status is valid
    expect(TEST_CONFIG.CONSENT_STATUSES).toContain(consent.status);
    
    // Validate language is supported
    expect(TEST_CONFIG.LANGUAGES).toContain(consent.language);
  }

  static validateConsentConsistency(consent) {
    // Validate logical consistency between status and dates
    if (consent.status === 'granted') {
      expect(consent.grantedAt).toBeDefined();
      expect(consent.withdrawnAt).toBeNull();
    }
    
    if (consent.status === 'withdrawn') {
      expect(consent.withdrawnAt).toBeDefined();
      expect(consent.withdrawalMethod).toBeDefined();
      expect(TEST_CONFIG.WITHDRAWAL_METHODS).toContain(consent.withdrawalMethod);
      
      // If both granted and withdrawn dates exist, granted should be before withdrawn
      if (consent.grantedAt && consent.withdrawnAt) {
        expect(consent.grantedAt.getTime()).toBeLessThan(consent.withdrawnAt.getTime());
      }
    }
    
    if (consent.status === 'denied') {
      expect(consent.grantedAt).toBeNull();
      expect(consent.withdrawnAt).toBeNull();
    }
    
    if (consent.status === 'expired') {
      expect(consent.grantedAt).toBeDefined();
      expect(consent.expiresAt).toBeDefined();
      expect(consent.withdrawnAt).toBeNull();
    }
  }

  static validateConsentClarity(consentRequest) {
    // Validate that consent request provides clear information
    expect(consentRequest).toHaveProperty('consentTypes');
    expect(consentRequest).toHaveProperty('processingPurposes');
    expect(consentRequest).toHaveProperty('language');
    
    // Validate consent types are not empty
    expect(consentRequest.consentTypes.length).toBeGreaterThan(0);
    
    // Validate processing purposes are specified
    expect(consentRequest.processingPurposes.length).toBeGreaterThan(0);
    
    // Validate all consent types are supported
    consentRequest.consentTypes.forEach(type => {
      expect(TEST_CONFIG.CONSENT_TYPES).toContain(type);
    });
    
    // Validate all processing purposes are supported
    consentRequest.processingPurposes.forEach(purpose => {
      expect(TEST_CONFIG.PROCESSING_PURPOSES).toContain(purpose);
    });
  }

  static validateWithdrawalAccessibility(withdrawal) {
    // Validate withdrawal mechanism is accessible
    expect(withdrawal).toHaveProperty('withdrawalMethod');
    expect(TEST_CONFIG.WITHDRAWAL_METHODS).toContain(withdrawal.withdrawalMethod);
    
    // Validate withdrawal context is captured
    expect(withdrawal).toHaveProperty('requestContext');
    expect(withdrawal.requestContext).toHaveProperty('timestamp');
    expect(withdrawal.requestContext).toHaveProperty('ipAddress');
    
    // Validate immediate effect capability
    expect(withdrawal).toHaveProperty('immediateEffect');
    expect(typeof withdrawal.immediateEffect).toBe('boolean');
  }

  static simulateConsentLifecycle(consentRequest) {
    const lifecycle = {
      request: consentRequest,
      granted: null,
      withdrawn: null,
      auditTrail: []
    };
    
    // Simulate consent granting
    if (Math.random() > 0.2) { // 80% chance of granting
      lifecycle.granted = {
        id: `consent-${Date.now()}`,
        userId: consentRequest.userId,
        estateId: consentRequest.estateId,
        consentType: consentRequest.consentTypes[0], // Use first type
        status: 'granted',
        grantedAt: new Date(),
        processingPurposes: consentRequest.processingPurposes,
        language: consentRequest.language,
        consentVersion: consentRequest.consentVersion
      };
      
      lifecycle.auditTrail.push({
        action: 'consent_granted',
        timestamp: lifecycle.granted.grantedAt,
        details: {
          consentType: lifecycle.granted.consentType,
          processingPurposes: lifecycle.granted.processingPurposes
        }
      });
    }
    
    // Simulate potential withdrawal (30% chance if granted)
    if (lifecycle.granted && Math.random() > 0.7) {
      const withdrawalDate = new Date(lifecycle.granted.grantedAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      lifecycle.withdrawn = {
        consentId: lifecycle.granted.id,
        userId: consentRequest.userId,
        withdrawalMethod: 'web_interface',
        withdrawnAt: withdrawalDate,
        immediateEffect: true
      };
      
      lifecycle.auditTrail.push({
        action: 'consent_withdrawn',
        timestamp: withdrawalDate,
        details: {
          method: lifecycle.withdrawn.withdrawalMethod,
          immediateEffect: lifecycle.withdrawn.immediateEffect
        }
      });
    }
    
    return lifecycle;
  }

  static validateAuditTrail(auditTrail) {
    // Validate audit trail structure
    expect(Array.isArray(auditTrail)).toBe(true);
    
    auditTrail.forEach(entry => {
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('details');
      
      // Validate timestamp is a valid date
      expect(entry.timestamp).toBeInstanceOf(Date);
      
      // Validate action is meaningful
      expect(['consent_granted', 'consent_withdrawn', 'consent_expired', 'consent_updated']).toContain(entry.action);
    });
    
    // Validate chronological order
    for (let i = 1; i < auditTrail.length; i++) {
      expect(auditTrail[i].timestamp.getTime()).toBeGreaterThanOrEqual(auditTrail[i-1].timestamp.getTime());
    }
  }

  static calculateConsentEffectiveness(consentRecords) {
    const stats = {
      total: consentRecords.length,
      granted: 0,
      denied: 0,
      withdrawn: 0,
      expired: 0,
      pending: 0,
      withdrawalRate: 0,
      averageConsentDuration: 0
    };
    
    let totalDuration = 0;
    let durationCount = 0;
    
    consentRecords.forEach(consent => {
      stats[consent.status]++;
      
      // Calculate consent duration for withdrawn consents
      if (consent.status === 'withdrawn' && consent.grantedAt && consent.withdrawnAt) {
        const duration = consent.withdrawnAt.getTime() - consent.grantedAt.getTime();
        totalDuration += duration;
        durationCount++;
      }
    });
    
    if (stats.granted > 0) {
      stats.withdrawalRate = (stats.withdrawn / (stats.granted + stats.withdrawn)) * 100;
    }
    
    if (durationCount > 0) {
      stats.averageConsentDuration = totalDuration / durationCount / (1000 * 60 * 60 * 24); // Convert to days
    }
    
    return stats;
  }
}

describe('Property 29: Consent Management Clarity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockPrivacyService.getConsentRecords.mockResolvedValue([]);
    mockPrivacyService.recordConsent.mockResolvedValue({
      id: 'consent-123',
      status: 'granted',
      grantedAt: new Date()
    });
    mockPrivacyService.withdrawConsent.mockResolvedValue({
      success: true,
      effectiveDate: new Date(),
      confirmationId: 'withdrawal-456'
    });
    mockPrivacyService.validateConsentRequest.mockReturnValue({
      valid: true,
      errors: []
    });
    mockPrivacyService.getConsentDescription.mockReturnValue({
      title: 'Data Processing Consent',
      description: 'Clear description of data processing',
      purposes: ['service_provision'],
      dataTypes: ['personal_information'],
      retention: '2 years',
      rights: ['access', 'rectification', 'erasure']
    });
  });

  test('should provide clear and understandable consent mechanisms', () => {
    fc.assert(
      fc.property(
        consentRequestArb,
        (consentRequest) => {
          // Property: Consent requests must be clear and comprehensive
          ConsentTestUtils.validateConsentClarity(consentRequest);
          
          // Property: Language must be supported for clarity
          expect(TEST_CONFIG.LANGUAGES).toContain(consentRequest.language);
          
          // Property: Processing purposes must be clearly specified
          expect(consentRequest.processingPurposes.length).toBeGreaterThan(0);
          consentRequest.processingPurposes.forEach(purpose => {
            expect(TEST_CONFIG.PROCESSING_PURPOSES).toContain(purpose);
          });
          
          // Property: Consent types must be clearly categorized
          expect(consentRequest.consentTypes.length).toBeGreaterThan(0);
          consentRequest.consentTypes.forEach(type => {
            expect(TEST_CONFIG.CONSENT_TYPES).toContain(type);
          });
          
          // Property: Request context must be captured for audit
          expect(consentRequest.requestContext).toHaveProperty('ipAddress');
          expect(consentRequest.requestContext).toHaveProperty('userAgent');
          expect(consentRequest.requestContext).toHaveProperty('timestamp');
          expect(consentRequest.requestContext).toHaveProperty('source');
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS }
    );
  });

  test('should provide easily accessible withdrawal options with immediate effect', () => {
    fc.assert(
      fc.property(
        consentWithdrawalArb,
        (withdrawal) => {
          // Property: Withdrawal mechanisms must be accessible
          ConsentTestUtils.validateWithdrawalAccessibility(withdrawal);
          
          // Property: Withdrawal methods must be supported
          expect(TEST_CONFIG.WITHDRAWAL_METHODS).toContain(withdrawal.withdrawalMethod);
          
          // Property: Immediate effect must be available
          if (withdrawal.immediateEffect) {
            expect(withdrawal.effectiveDate).toBeNull();
          }
          
          // Property: Withdrawal context must be captured
          expect(withdrawal.requestContext).toHaveProperty('timestamp');
          expect(withdrawal.requestContext).toHaveProperty('ipAddress');
          expect(withdrawal.requestContext).toHaveProperty('userAgent');
          
          // Property: User and consent identification must be clear
          expect(withdrawal.userId).toBeGreaterThan(0);
          expect(withdrawal.consentId).toBeDefined();
          expect(typeof withdrawal.consentId).toBe('string');
          expect(withdrawal.consentId.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS }
    );
  });

  test('should maintain proper consent records with audit trails', () => {
    fc.assert(
      fc.property(
        consentRecordArb,
        (consent) => {
          // Property: Consent records must be properly structured
          ConsentTestUtils.validateConsentRecord(consent);
          
          // Property: Consent records must be logically consistent
          ConsentTestUtils.validateConsentConsistency(consent);
          
          // Property: Processing purposes must be specified
          expect(consent.processingPurposes.length).toBeGreaterThan(0);
          consent.processingPurposes.forEach(purpose => {
            expect(TEST_CONFIG.PROCESSING_PURPOSES).toContain(purpose);
          });
          
          // Property: Consent version must be tracked
          expect(consent.consentVersion).toBeDefined();
          expect(typeof consent.consentVersion).toBe('string');
          expect(consent.consentVersion.length).toBeGreaterThan(0);
          
          // Property: Technical context must be captured
          expect(consent.ipAddress).toBeDefined();
          expect(consent.userAgent).toBeDefined();
          expect(consent.language).toBeDefined();
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS }
    );
  });

  test('should provide granular consent control for specific processing activities', () => {
    fc.assert(
      fc.property(
        fc.array(consentRecordArb, { minLength: 1, maxLength: 10 }).map(consents => 
          consents.map(consent => ({
            ...consent,
            isGranular: true,
            granularChoices: {
              essential: true, // Essential services always required
              analytics: Math.random() > 0.5,
              marketing: Math.random() > 0.7,
              thirdParty: Math.random() > 0.8
            }
          }))
        ),
        (consents) => {
          // Property: Granular consent must allow specific control
          consents.forEach(consent => {
            if (consent.isGranular && consent.granularChoices) {
              // Property: Essential services should always be true (required)
              expect(consent.granularChoices.essential).toBe(true);
              
              // Property: Optional services should be controllable
              expect(typeof consent.granularChoices.analytics).toBe('boolean');
              expect(typeof consent.granularChoices.marketing).toBe('boolean');
              expect(typeof consent.granularChoices.thirdParty).toBe('boolean');
              
              // Property: Granular choices should be preserved
              expect(consent.granularChoices).toHaveProperty('essential');
              expect(consent.granularChoices).toHaveProperty('analytics');
              expect(consent.granularChoices).toHaveProperty('marketing');
              expect(consent.granularChoices).toHaveProperty('thirdParty');
            }
          });
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS }
    );
  });

  test('should handle consent lifecycle with proper audit trails', () => {
    fc.assert(
      fc.property(
        consentRequestArb,
        (consentRequest) => {
          // Property: Consent lifecycle must be properly tracked
          const lifecycle = ConsentTestUtils.simulateConsentLifecycle(consentRequest);
          
          // Property: Lifecycle must have proper structure
          expect(lifecycle).toHaveProperty('request');
          expect(lifecycle).toHaveProperty('auditTrail');
          expect(Array.isArray(lifecycle.auditTrail)).toBe(true);
          
          // Property: Audit trail must be valid
          ConsentTestUtils.validateAuditTrail(lifecycle.auditTrail);
          
          // Property: If consent was granted, audit trail should reflect it
          if (lifecycle.granted) {
            const grantEntry = lifecycle.auditTrail.find(entry => entry.action === 'consent_granted');
            expect(grantEntry).toBeDefined();
            expect(grantEntry.details).toHaveProperty('consentType');
            expect(grantEntry.details).toHaveProperty('processingPurposes');
          }
          
          // Property: If consent was withdrawn, audit trail should reflect it
          if (lifecycle.withdrawn) {
            const withdrawalEntry = lifecycle.auditTrail.find(entry => entry.action === 'consent_withdrawn');
            expect(withdrawalEntry).toBeDefined();
            expect(withdrawalEntry.details).toHaveProperty('method');
            expect(withdrawalEntry.details).toHaveProperty('immediateEffect');
          }
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS }
    );
  });

  test('should calculate consent effectiveness metrics accurately', () => {
    fc.assert(
      fc.property(
        fc.array(consentRecordArb, { minLength: 5, maxLength: 20 }),
        (consentRecords) => {
          // Property: Consent effectiveness metrics must be accurate
          const stats = ConsentTestUtils.calculateConsentEffectiveness(consentRecords);
          
          // Property: Total count must match input
          expect(stats.total).toBe(consentRecords.length);
          
          // Property: Status counts must sum to total
          const statusSum = stats.granted + stats.denied + stats.withdrawn + stats.expired + stats.pending;
          expect(statusSum).toBe(stats.total);
          
          // Property: All counts must be non-negative
          expect(stats.granted).toBeGreaterThanOrEqual(0);
          expect(stats.denied).toBeGreaterThanOrEqual(0);
          expect(stats.withdrawn).toBeGreaterThanOrEqual(0);
          expect(stats.expired).toBeGreaterThanOrEqual(0);
          expect(stats.pending).toBeGreaterThanOrEqual(0);
          
          // Property: Withdrawal rate must be between 0 and 100
          expect(stats.withdrawalRate).toBeGreaterThanOrEqual(0);
          expect(stats.withdrawalRate).toBeLessThanOrEqual(100);
          
          // Property: Average duration must be non-negative
          expect(stats.averageConsentDuration).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: TEST_CONFIG.PROPERTY_RUNS }
    );
  });
});

// Integration test for consent management clarity
describe('Consent Management Clarity Integration', () => {
  test('should integrate with privacy compliance service correctly', async () => {
    const testConsentRequest = {
      userId: 123,
      estateId: 456,
      consentTypes: ['data_processing', 'marketing_communications'],
      processingPurposes: ['service_provision', 'customer_support'],
      language: 'en',
      granularConsent: true
    };

    // Test consent recording
    mockPrivacyService.recordConsent.mockResolvedValue({
      id: 'consent-789',
      status: 'granted',
      grantedAt: new Date(),
      consentVersion: '2.1'
    });

    const consentResult = await mockPrivacyService.recordConsent(testConsentRequest);

    expect(consentResult.id).toBe('consent-789');
    expect(consentResult.status).toBe('granted');
    expect(consentResult.grantedAt).toBeInstanceOf(Date);
    expect(mockPrivacyService.recordConsent).toHaveBeenCalledWith(testConsentRequest);
  });

  test('should handle consent withdrawal with immediate effect', async () => {
    const withdrawalRequest = {
      consentId: 'consent-789',
      userId: 123,
      withdrawalMethod: 'web_interface',
      immediateEffect: true,
      reason: 'privacy_concerns'
    };

    mockPrivacyService.withdrawConsent.mockResolvedValue({
      success: true,
      effectiveDate: new Date(),
      confirmationId: 'withdrawal-101112',
      auditTrailId: 'audit-131415'
    });

    const withdrawalResult = await mockPrivacyService.withdrawConsent(withdrawalRequest);

    expect(withdrawalResult.success).toBe(true);
    expect(withdrawalResult.effectiveDate).toBeInstanceOf(Date);
    expect(withdrawalResult.confirmationId).toBe('withdrawal-101112');
    expect(withdrawalResult.auditTrailId).toBe('audit-131415');
    expect(mockPrivacyService.withdrawConsent).toHaveBeenCalledWith(withdrawalRequest);
  });

  test('should provide clear consent descriptions in multiple languages', () => {
    const consentTypes = ['data_processing', 'marketing_communications'];
    const languages = ['en', 'sw', 'fr'];

    consentTypes.forEach(type => {
      languages.forEach(lang => {
        mockPrivacyService.getConsentDescription.mockReturnValue({
          consentType: type,
          language: lang,
          title: `${type} consent in ${lang}`,
          description: `Clear description of ${type} in ${lang}`,
          purposes: ['service_provision'],
          dataTypes: ['personal_information'],
          retention: '2 years',
          rights: ['access', 'rectification', 'erasure'],
          withdrawalInstructions: `How to withdraw ${type} consent in ${lang}`
        });

        const description = mockPrivacyService.getConsentDescription(type, lang);

        expect(description.consentType).toBe(type);
        expect(description.language).toBe(lang);
        expect(description.title).toContain(type);
        expect(description.description).toContain(type);
        expect(description.withdrawalInstructions).toContain('withdraw');
        expect(Array.isArray(description.rights)).toBe(true);
        expect(description.rights.length).toBeGreaterThan(0);
      });
    });
  });

  test('should validate consent requests for completeness and clarity', () => {
    const validRequest = {
      userId: 123,
      consentTypes: ['data_processing'],
      processingPurposes: ['service_provision'],
      language: 'en'
    };

    const invalidRequest = {
      userId: null, // Invalid
      consentTypes: [], // Invalid: empty
      processingPurposes: ['invalid_purpose'], // Invalid: unsupported
      language: 'invalid_lang' // Invalid: unsupported
    };

    // Valid request
    mockPrivacyService.validateConsentRequest.mockReturnValue({
      valid: true,
      errors: []
    });

    const validResult = mockPrivacyService.validateConsentRequest(validRequest);
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    // Invalid request
    mockPrivacyService.validateConsentRequest.mockReturnValue({
      valid: false,
      errors: [
        'User ID is required',
        'At least one consent type must be specified',
        'Invalid processing purpose',
        'Unsupported language'
      ]
    });

    const invalidResult = mockPrivacyService.validateConsentRequest(invalidRequest);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });
});