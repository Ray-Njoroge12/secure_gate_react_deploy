# Testing Guide - Secure Gate Access Client

## Overview

This guide provides comprehensive documentation for testing practices, patterns, and configurations used in the Secure Gate Access client application. The testing framework emphasizes property-based testing, factory patterns, and configuration-driven approaches for robust and maintainable tests.

## Testing Architecture

### Core Testing Principles
1. **Property-Based Testing**: Using fast-check for comprehensive edge case discovery
2. **Factory Pattern**: Consistent mock and data creation across tests
3. **Configuration-Driven**: Centralized test parameters for maintainability
4. **Comprehensive Validation**: Thorough assertion patterns for reliable results

### Test Organization
```
src/__tests__/
├── components/          # Component-specific tests
├── contexts/           # Context and provider tests
├── hooks/              # Custom hook tests
└── properties/         # Property-based tests
    ├── constants/      # Test configuration files
    ├── factories/      # Mock and data factories
    └── utils/          # Test utilities
```

## Configuration Management

### Test Configuration Structure
Test configurations are centralized to ensure consistency and maintainability:

```javascript
const TEST_CONFIG = {
  TEST_RUNS: {
    quick: 10,
    standard: 25,
    thorough: 50,
    comprehensive: 100
  },
  BULK_ARRAY_SIZES: {
    min: 1,
    max: 5,
    large: {
      min: 10,
      max: 20
    }
  },
  NETWORK_DELAYS: {
    min: 100,
    max: 2000
  },
  SYNC_INTERVALS: {
    min: 5000,
    max: 30000
  }
};
```

### Configuration Usage
Always use configuration constants instead of hardcoded values:

```javascript
// ✅ Good - Using configuration
fc.array(actionGenerator, { 
  minLength: TEST_CONFIG.BULK_ARRAY_SIZES.min, 
  maxLength: TEST_CONFIG.BULK_ARRAY_SIZES.max 
})

// ❌ Bad - Hardcoded values
fc.array(actionGenerator, { minLength: 1, maxLength: 3 })
```

## Factory Patterns

### Mock Factory Implementation
Factories provide consistent mock creation across tests:

```javascript
const OfflineServiceMockFactory = {
  createSyncMock: (queuedActions, options = {}) => {
    return {
      getQueuedActions: jest.fn().mockReturnValue(
        queuedActions.map(action => ({
          ...action,
          queuedAt: options.queueTime || new Date().toISOString(),
          status: options.status || 'pending_sync'
        }))
      ),
      processSyncQueue: jest.fn().mockReturnValue({
        success: true,
        processed: queuedActions.length,
        syncedAt: options.syncTime || new Date().toISOString()
      })
    };
  }
};
```

### Factory Usage Benefits
- **Consistency**: Standardized mock behavior across all tests
- **Maintainability**: Centralized mock logic reduces duplication
- **Flexibility**: Easy configuration for different test scenarios
- **Reliability**: Reduces test flakiness from inconsistent mocks

## Property-Based Testing

### Enhanced Action Generator Structure
The action generator has been refined to use inline payload structures for better test reliability:

```javascript
// Enhanced action generator with inline payload structure
const actionGenerator = fc.record({
  type: fc.constantFrom('CREATE_VISITOR', 'UPDATE_VISITOR', 'DELETE_VISITOR', 'APPROVE_VISITOR'),
  payload: fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    status: fc.constantFrom('pending', 'approved', 'denied', 'arrived', 'departed')
  }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
  id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)
});
```

### Action Generator Benefits
- **Structured Payloads**: Inline record structure ensures consistent payload format
- **Validation Constraints**: String length and content validation prevents invalid test data
- **Type Safety**: Explicit field definitions improve test reliability
- **Maintainability**: Self-contained generator reduces external dependencies

### Implementation Patterns
Property-based tests use generators and properties to validate system behavior:

```javascript
test('sync processing works when online', () => {
  fc.assert(fc.property(
    fc.array(actionGenerator, { 
      minLength: TEST_CONFIG.BULK_ARRAY_SIZES.min, 
      maxLength: TEST_CONFIG.BULK_ARRAY_SIZES.max 
    }),
    (queuedActions) => {
      // Test implementation
      const mockOfflineService = OfflineServiceMockFactory.createSyncMock(
        queuedActions,
        { 
          queueTime: new Date().toISOString(),
          status: 'pending_sync',
          syncTime: new Date().toISOString()
        }
      );

      // Property validation
      const syncResult = mockOfflineService.processSyncQueue();
      expect(syncResult).toHaveProperty('success', true);
      expect(syncResult).toHaveProperty('processed', queuedActions.length);
    }
  ), { numRuns: TEST_CONFIG.TEST_RUNS.standard });
});
```

### Property Test Benefits
- **Edge Case Discovery**: Automatically finds edge cases through random generation
- **Comprehensive Coverage**: Tests behavior across wide input ranges
- **Regression Prevention**: Continuous validation against property violations
- **Scalable Testing**: Configurable complexity levels for different test scenarios

## Offline Functionality Testing

### Specialized Testing Patterns
Offline functionality requires specialized testing approaches:

#### Data Persistence Testing
```javascript
test('visitor data persists during offline periods', () => {
  fc.assert(fc.property(
    visitorDataGenerator,
    (visitorData) => {
      // Simulate offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      // Test data persistence
      const result = offlineService.storeVisitorData(visitorData);
      expect(result.stored).toBe(true);
      expect(result.data).toEqual(visitorData);
    }
  ));
});
```

#### Sync Operation Testing
```javascript
test('sync operations handle conflicts correctly', () => {
  fc.assert(fc.property(
    conflictingDataGenerator,
    (conflictData) => {
      const mockService = OfflineServiceMockFactory.createConflictMock(conflictData);
      const result = mockService.resolveConflicts();
      
      expect(result.resolved).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    }
  ));
});
```

### Network State Simulation
Tests simulate various network conditions:

```javascript
// Online state
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
  configurable: true
});

// Offline state
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: false,
  configurable: true
});
```

## Enhanced Validation Patterns

### Comprehensive Assertions
Tests include detailed validation to ensure robust behavior:

```javascript
// Basic validation
expect(syncResult).toHaveProperty('success', true);
expect(syncResult).toHaveProperty('processed', queuedActions.length);

// Enhanced validation
expect(syncResult).toHaveProperty('syncedAt');
expect(typeof syncResult.syncedAt).toBe('string');

// Array validation
const queuedActionsResult = mockOfflineService.getQueuedActions();
expect(Array.isArray(queuedActionsResult)).toBe(true);
expect(queuedActionsResult.length).toBe(queuedActions.length);
```

### Validation Guidelines
1. **Type Checking**: Validate data types for all returned values
2. **Structure Validation**: Ensure objects have expected properties
3. **Array Validation**: Check array types and lengths
4. **Boundary Testing**: Validate edge cases and limits
5. **Error Scenarios**: Test error conditions and recovery

## Test Execution Guidelines

### Running Tests
```bash
# Run all tests
npm test

# Run property-based tests only
npm test -- --testPathPattern=properties

# Run with specific configuration
npm test -- --testPathPattern=offline-functionality-preservation

# Run with coverage
npm test -- --coverage
```

### Test Configuration Levels
- **Quick Tests**: `TEST_CONFIG.TEST_RUNS.quick` (10 runs) - For rapid development
- **Standard Tests**: `TEST_CONFIG.TEST_RUNS.standard` (25 runs) - For regular CI/CD
- **Thorough Tests**: `TEST_CONFIG.TEST_RUNS.thorough` (50 runs) - For release validation
- **Comprehensive Tests**: `TEST_CONFIG.TEST_RUNS.comprehensive` (100 runs) - For critical validation

## Best Practices

### Test Writing Guidelines
1. **Use Configuration**: Always use `TEST_CONFIG` for test parameters
2. **Factory Pattern**: Utilize mock factories for consistent test setup
3. **Property Testing**: Implement property-based tests for complex scenarios
4. **Comprehensive Validation**: Include detailed assertions for all test outcomes
5. **Clear Naming**: Use descriptive test names that explain the behavior being tested

### Maintenance Guidelines
1. **Centralized Config**: Update test parameters in configuration files only
2. **Factory Updates**: Modify mock behavior in factory classes, not individual tests
3. **Property Refinement**: Continuously improve property definitions based on findings
4. **Coverage Monitoring**: Regular review of test coverage metrics

### Performance Considerations
1. **Test Execution Time**: Monitor property test performance and adjust run counts
2. **Memory Usage**: Be aware of memory usage in bulk operation tests
3. **Parallel Execution**: Ensure tests can run in parallel without conflicts
4. **Resource Cleanup**: Properly clean up resources after test execution

## Troubleshooting

### Common Issues
1. **Flaky Tests**: Often caused by inconsistent mocks - use factories
2. **Slow Tests**: Reduce `TEST_RUNS` for development, increase for CI/CD
3. **Memory Issues**: Check for memory leaks in bulk operation tests
4. **Network Simulation**: Ensure proper cleanup of navigator.onLine modifications

### Debugging Tips
1. **Isolate Properties**: Run single property tests to identify issues
2. **Reduce Complexity**: Lower array sizes and run counts for debugging
3. **Add Logging**: Use console.log in property tests for debugging (remove before commit)
4. **Mock Inspection**: Verify mock calls and return values

## Recent Enhancements (January 2025)

### Action Generator Refinements
The action generator structure has been improved with inline payload definitions:

- **Inline Payload Structure**: Replaced external `visitorGenerator` with inline `fc.record` for better control
- **Validation Constraints**: Added string length and content validation to prevent invalid test data
- **Type Safety**: Explicit field definitions improve test reliability and maintainability
- **Self-Contained**: Reduced external dependencies for better test isolation

### Configuration-Driven Testing
- Centralized test parameters through `TEST_CONFIG`
- Configurable array sizes with `BULK_ARRAY_SIZES`
- Standardized test run counts with `TEST_RUNS`

### Factory-Based Mock Creation
- Consistent mock creation using factory patterns
- `OfflineServiceMockFactory.createSyncMock()` for offline service testing
- Configurable mock options for different test scenarios

### Enhanced Validation Patterns
- Comprehensive assertion patterns for thorough result validation
- Type checking for all returned values
- Array validation for bulk operations
- Boundary testing for edge cases

### Improved Test Maintainability
- Reduced code duplication through factory patterns
- Centralized configuration management
- Standardized test execution parameters
- Enhanced documentation and guidelines

## Future Enhancements

### Planned Improvements
1. **Performance Testing**: Add property-based performance validation
2. **Load Testing**: Implement bulk operation stress testing
3. **Cross-Platform Testing**: Extend testing to mobile platforms
4. **Visual Regression Testing**: Add visual testing for UI components

### Monitoring and Metrics
1. **Test Execution Metrics**: Track test performance and reliability
2. **Coverage Tracking**: Automated coverage reporting and enforcement
3. **Quality Gates**: Enforce minimum test quality standards
4. **Regression Detection**: Automated detection of test regressions

This testing guide should be referenced when writing new tests or maintaining existing ones. It provides the foundation for reliable, maintainable, and comprehensive testing in the Secure Gate Access client application.