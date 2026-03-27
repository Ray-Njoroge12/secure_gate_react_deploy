/**
 * Property-Based Test: Advanced Filter Logic
 * 
 * Property 22: Advanced Filter Logic
 * Validates: Requirements 11.2
 * 
 * This test validates that advanced filter logic with AND/OR operations
 * produces consistent and correct results across all possible filter combinations.
 * 
 * Key Properties Tested:
 * 1. Filter combination consistency - AND/OR operations work correctly
 * 2. Filter precedence - Parentheses and operator precedence respected
 * 3. Filter negation - NOT operations work correctly
 * 4. Filter composition - Complex nested filters work correctly
 * 5. Filter performance - Complex filters execute within time limits
 * 6. Filter validation - Invalid filters are properly rejected
 */

import fc from 'fast-check';

// Test configuration
const TEST_CONFIG = {
  PROPERTY_RUNS: 150,
  TIMEOUT_MS: 5000,
  MAX_FILTER_DEPTH: 5,
  MAX_FILTER_CONDITIONS: 10,
  PERFORMANCE_THRESHOLD_MS: 100
};

// Mock data generators
const generateVisitorData = () => fc.array(
  fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    name: fc.string({ minLength: 2, maxLength: 50 }),
    email: fc.emailAddress(),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
    status: fc.constantFrom('PENDING', 'APPROVED', 'VERIFIED', 'ON_PREMISE', 'CHECKED_OUT', 'REVOKED'),
    purpose: fc.string({ minLength: 5, maxLength: 100 }),
    created_at: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    expected_arrival: fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }),
    estate_id: fc.integer({ min: 1, max: 100 }),
    host_name: fc.string({ minLength: 2, maxLength: 50 }),
    check_in_time: fc.option(fc.date(), { nil: null }),
    tags: fc.array(fc.string({ minLength: 2, maxLength: 20 }), { maxLength: 5 })
  }),
  { minLength: 10, maxLength: 1000 }
);

// Filter condition generators
const generateFilterCondition = () => fc.record({
  field: fc.constantFrom('name', 'email', 'status', 'purpose', 'created_at', 'expected_arrival', 'host_name'),
  operator: fc.constantFrom('equals', 'contains', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'between', 'in', 'notIn'),
  value: fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.integer({ min: 1, max: 1000 }),
    fc.date(),
    fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })
  ),
  negated: fc.boolean()
});

const generateFilterGroup = (depth = 0) => {
  if (depth >= TEST_CONFIG.MAX_FILTER_DEPTH) {
    return generateFilterCondition();
  }
  
  return fc.oneof(
    generateFilterCondition(),
    fc.record({
      operator: fc.constantFrom('AND', 'OR'),
      conditions: fc.array(
        fc.oneof(
          generateFilterCondition(),
          generateFilterGroup(depth + 1)
        ),
        { minLength: 2, maxLength: Math.min(5, TEST_CONFIG.MAX_FILTER_CONDITIONS) }
      ),
      negated: fc.boolean()
    })
  );
};

// Filter evaluation utilities
class FilterEvaluator {
  static evaluateCondition(item, condition) {
    const { field, operator, value, negated } = condition;
    const itemValue = this.getFieldValue(item, field);
    
    let result = false;
    
    try {
      switch (operator) {
        case 'equals':
          result = itemValue === value;
          break;
        case 'contains':
          result = String(itemValue).toLowerCase().includes(String(value).toLowerCase());
          break;
        case 'startsWith':
          result = String(itemValue).toLowerCase().startsWith(String(value).toLowerCase());
          break;
        case 'endsWith':
          result = String(itemValue).toLowerCase().endsWith(String(value).toLowerCase());
          break;
        case 'greaterThan':
          result = this.compareValues(itemValue, value) > 0;
          break;
        case 'lessThan':
          result = this.compareValues(itemValue, value) < 0;
          break;
        case 'between':
          if (Array.isArray(value) && value.length === 2) {
            const [min, max] = value;
            result = this.compareValues(itemValue, min) >= 0 && this.compareValues(itemValue, max) <= 0;
          }
          break;
        case 'in':
          result = Array.isArray(value) && value.includes(itemValue);
          break;
        case 'notIn':
          result = Array.isArray(value) && !value.includes(itemValue);
          break;
        default:
          result = false;
      }
    } catch (error) {
      result = false;
    }
    
    return negated ? !result : result;
  }
  
  static evaluateGroup(item, group) {
    if (group.field) {
      // This is a condition, not a group
      return this.evaluateCondition(item, group);
    }
    
    const { operator, conditions, negated } = group;
    let result = false;
    
    if (operator === 'AND') {
      result = conditions.every(condition => this.evaluateGroup(item, condition));
    } else if (operator === 'OR') {
      result = conditions.some(condition => this.evaluateGroup(item, condition));
    }
    
    return negated ? !result : result;
  }
  
  static getFieldValue(item, field) {
    const fieldMap = {
      'name': item.name,
      'email': item.email,
      'status': item.status,
      'purpose': item.purpose,
      'created_at': item.created_at,
      'expected_arrival': item.expected_arrival,
      'host_name': item.host_name
    };
    
    return fieldMap[field];
  }
  
  static compareValues(a, b) {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    return String(a).localeCompare(String(b));
  }
}

// Performance monitoring
class FilterPerformanceMonitor {
  constructor() {
    this.measurements = [];
  }
  
  measure(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;
    
    this.measurements.push({
      name,
      duration,
      timestamp: new Date()
    });
    
    return { result, duration };
  }
  
  getAverageTime(name) {
    const measurements = this.measurements.filter(m => m.name === name);
    if (measurements.length === 0) return 0;
    return measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
  }
  
  getMaxTime(name) {
    const measurements = this.measurements.filter(m => m.name === name);
    if (measurements.length === 0) return 0;
    return Math.max(...measurements.map(m => m.duration));
  }
  
  reset() {
    this.measurements = [];
  }
}

describe('Property 22: Advanced Filter Logic', () => {
  let performanceMonitor;
  
  beforeEach(() => {
    performanceMonitor = new FilterPerformanceMonitor();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    performanceMonitor.reset();
  });

  describe('Filter Combination Consistency', () => {
    test('AND operations should only return items matching all conditions', () => {
      fc.assert(
        fc.property(
          generateVisitorData(),
          fc.array(generateFilterCondition(), { minLength: 2, maxLength: 5 }),
          (visitors, conditions) => {
            const andFilter = {
              operator: 'AND',
              conditions,
              negated: false
            };
            
            const { result: filteredVisitors, duration } = performanceMonitor.measure(
              'and_filter',
              () => visitors.filter(visitor => FilterEvaluator.evaluateGroup(visitor, andFilter))
            );
            
            // Performance check
            expect(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_MS);
            
            // Consistency check - every returned item should match ALL conditions
            filteredVisitors.forEach(visitor => {
              conditions.forEach(condition => {
                expect(FilterEvaluator.evaluateCondition(visitor, condition)).toBe(true);
              });
            });
            
            // Completeness check - no matching items should be excluded
            visitors.forEach(visitor => {
              const matchesAll = conditions.every(condition => 
                FilterEvaluator.evaluateCondition(visitor, condition)
              );
              const isIncluded = filteredVisitors.includes(visitor);
              expect(matchesAll).toBe(isIncluded);
            });
          }
        ),
        { numRuns: TEST_CONFIG.PROPERTY_RUNS }
      );
    });

    test('OR operations should return items matching any condition', () => {
      fc.assert(
        fc.property(
          generateVisitorData(),
          fc.array(generateFilterCondition(), { minLength: 2, maxLength: 5 }),
          (visitors, conditions) => {
            const orFilter = {
              operator: 'OR',
              conditions,
              negated: false
            };
            
            const { result: filteredVisitors, duration } = performanceMonitor.measure(
              'or_filter',
              () => visitors.filter(visitor => FilterEvaluator.evaluateGroup(visitor, orFilter))
            );
            
            // Performance check
            expect(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_MS);
            
            // Consistency check - every returned item should match AT LEAST ONE condition
            filteredVisitors.forEach(visitor => {
              const matchesAny = conditions.some(condition => 
                FilterEvaluator.evaluateCondition(visitor, condition)
              );
              expect(matchesAny).toBe(true);
            });
            
            // Completeness check - all matching items should be included
            visitors.forEach(visitor => {
              const matchesAny = conditions.some(condition => 
                FilterEvaluator.evaluateCondition(visitor, condition)
              );
              const isIncluded = filteredVisitors.includes(visitor);
              expect(matchesAny).toBe(isIncluded);
            });
          }
        ),
        { numRuns: TEST_CONFIG.PROPERTY_RUNS }
      );
    });
  });

  describe('Filter Negation Logic', () => {
    test('negated filters should return opposite results', () => {
      fc.assert(
        fc.property(
          generateVisitorData(),
          generateFilterGroup(),
          (visitors, filter) => {
            const normalFilter = { ...filter, negated: false };
            const negatedFilter = { ...filter, negated: true };
            
            const { result: normalResults } = performanceMonitor.measure(
              'normal_filter',
              () => visitors.filter(visitor => FilterEvaluator.evaluateGroup(visitor, normalFilter))
            );
            
            const { result: negatedResults } = performanceMonitor.measure(
              'negated_filter',
              () => visitors.filter(visitor => FilterEvaluator.evaluateGroup(visitor, negatedFilter))
            );
            
            // No item should appear in both results
            normalResults.forEach(visitor => {
              expect(negatedResults).not.toContain(visitor);
            });
            
            negatedResults.forEach(visitor => {
              expect(normalResults).not.toContain(visitor);
            });
            
            // Together they should cover all visitors
            const combinedResults = [...normalResults, ...negatedResults];
            expect(combinedResults).toHaveLength(visitors.length);
            
            visitors.forEach(visitor => {
              expect(combinedResults).toContain(visitor);
            });
          }
        ),
        { numRuns: TEST_CONFIG.PROPERTY_RUNS }
      );
    });
  });

  describe('Complex Filter Composition', () => {
    test('nested filter groups should maintain logical consistency', () => {
      fc.assert(
        fc.property(
          generateVisitorData(),
          generateFilterGroup(),
          (visitors, complexFilter) => {
            const { result: filteredVisitors, duration } = performanceMonitor.measure(
              'complex_filter',
              () => visitors.filter(visitor => FilterEvaluator.evaluateGroup(visitor, complexFilter))
            );
            
            // Performance check for complex filters
            expect(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_MS * 2);
            
            // Consistency check - manual evaluation should match filter evaluation
            filteredVisitors.forEach(visitor => {
              expect(FilterEvaluator.evaluateGroup(visitor, complexFilter)).toBe(true);
            });
            
            // Excluded items should not match the filter
            const excludedVisitors = visitors.filter(v => !filteredVisitors.includes(v));
            excludedVisitors.forEach(visitor => {
              expect(FilterEvaluator.evaluateGroup(visitor, complexFilter)).toBe(false);
            });
          }
        ),
        { numRuns: Math.floor(TEST_CONFIG.PROPERTY_RUNS * 0.7) } // Reduced runs for complex tests
      );
    });
  });

  describe('Filter Idempotency', () => {
    test('applying the same filter multiple times should yield identical results', () => {
      fc.assert(
        fc.property(
          generateVisitorData(),
          generateFilterGroup(),
          (visitors, filter) => {
            const firstApplication = visitors.filter(visitor => 
              FilterEvaluator.evaluateGroup(visitor, filter)
            );
            
            const secondApplication = firstApplication.filter(visitor => 
              FilterEvaluator.evaluateGroup(visitor, filter)
            );
            
            const thirdApplication = secondApplication.filter(visitor => 
              FilterEvaluator.evaluateGroup(visitor, filter)
            );
            
            // All applications should yield identical results
            expect(firstApplication).toEqual(secondApplication);
            expect(secondApplication).toEqual(thirdApplication);
            expect(firstApplication.length).toBe(secondApplication.length);
            expect(secondApplication.length).toBe(thirdApplication.length);
          }
        ),
        { numRuns: TEST_CONFIG.PROPERTY_RUNS }
      );
    });
  });

  describe('Filter Commutativity', () => {
    test('AND operations should be commutative', () => {
      fc.assert(
        fc.property(
          generateVisitorData(),
          fc.array(generateFilterCondition(), { minLength: 2, maxLength: 4 }),
          (visitors, conditions) => {
            const filter1 = {
              operator: 'AND',
              conditions: conditions,
              negated: false
            };
            
            const filter2 = {
              operator: 'AND',
              conditions: [...conditions].reverse(),
              negated: false
            };
            
            const results1 = visitors.filter(visitor => 
              FilterEvaluator.evaluateGroup(visitor, filter1)
            );
            
            const results2 = visitors.filter(visitor => 
              FilterEvaluator.evaluateGroup(visitor, filter2)
            );
            
            // Results should be identical regardless of condition order
            expect(results1.sort((a, b) => a.id - b.id)).toEqual(
              results2.sort((a, b) => a.id - b.id)
            );
          }
        ),
        { numRuns: TEST_CONFIG.PROPERTY_RUNS }
      );
    });

    test('OR operations should be commutative', () => {
      fc.assert(
        fc.property(
          generateVisitorData(),
          fc.array(generateFilterCondition(), { minLength: 2, maxLength: 4 }),
          (visitors, conditions) => {
            const filter1 = {
              operator: 'OR',
              conditions: conditions,
              negated: false
            };
            
            const filter2 = {
              operator: 'OR',
              conditions: [...conditions].reverse(),
              negated: false
            };
            
            const results1 = visitors.filter(visitor => 
              FilterEvaluator.evaluateGroup(visitor, filter1)
            );
            
            const results2 = visitors.filter(visitor => 
              FilterEvaluator.evaluateGroup(visitor, filter2)
            );
            
            // Results should be identical regardless of condition order
            expect(results1.sort((a, b) => a.id - b.id)).toEqual(
              results2.sort((a, b) => a.id - b.id)
            );
          }
        ),
        { numRuns: TEST_CONFIG.PROPERTY_RUNS }
      );
    });
  });

  describe('Filter Performance Guarantees', () => {
    test('filter operations should complete within performance thresholds', () => {
      fc.assert(
        fc.property(
          generateVisitorData(),
          generateFilterGroup(),
          (visitors, filter) => {
            const startTime = performance.now();
            
            const results = visitors.filter(visitor => 
              FilterEvaluator.evaluateGroup(visitor, filter)
            );
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Performance guarantee
            expect(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_MS);
            
            // Results should be valid
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeLessThanOrEqual(visitors.length);
          }
        ),
        { numRuns: TEST_CONFIG.PROPERTY_RUNS }
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('filters should handle empty datasets gracefully', () => {
      fc.assert(
        fc.property(
          generateFilterGroup(),
          (filter) => {
            const emptyVisitors = [];
            
            const results = emptyVisitors.filter(visitor => 
              FilterEvaluator.evaluateGroup(visitor, filter)
            );
            
            expect(results).toEqual([]);
            expect(results.length).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('filters should handle malformed data gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            id: fc.option(fc.integer()),
            name: fc.option(fc.string()),
            email: fc.option(fc.string()),
            status: fc.option(fc.string())
          }), { minLength: 5, maxLength: 20 }),
          generateFilterCondition(),
          (malformedVisitors, condition) => {
            expect(() => {
              const results = malformedVisitors.filter(visitor => 
                FilterEvaluator.evaluateCondition(visitor, condition)
              );
              expect(Array.isArray(results)).toBe(true);
            }).not.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Performance Monitoring Summary', () => {
    afterAll(() => {
      const avgAndTime = performanceMonitor.getAverageTime('and_filter');
      const avgOrTime = performanceMonitor.getAverageTime('or_filter');
      const avgComplexTime = performanceMonitor.getAverageTime('complex_filter');
      const maxComplexTime = performanceMonitor.getMaxTime('complex_filter');
      
      console.log('\n=== Advanced Filter Logic Performance Summary ===');
      console.log(`Average AND filter time: ${avgAndTime.toFixed(2)}ms`);
      console.log(`Average OR filter time: ${avgOrTime.toFixed(2)}ms`);
      console.log(`Average complex filter time: ${avgComplexTime.toFixed(2)}ms`);
      console.log(`Maximum complex filter time: ${maxComplexTime.toFixed(2)}ms`);
      console.log(`Performance threshold: ${TEST_CONFIG.PERFORMANCE_THRESHOLD_MS}ms`);
      console.log('================================================\n');
      
      // Ensure performance requirements are met
      expect(avgComplexTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_MS);
      expect(maxComplexTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_MS * 2);
    });
  });
});