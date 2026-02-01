/**
 * Shared mock utilities for accessibility testing
 * Ensures consistency across all test files
 */

export const createMockAccessibilityState = (overrides = {}) => ({
  isHighContrast: false,
  isReducedMotion: false,
  isKeyboardUser: false,
  isScreenReader: false,
  focusVisible: false,
  currentFocus: null,
  announcements: [],
  ...overrides
});

export const createMockAccessibilityHook = (stateOverrides = {}) => ({
  accessibilityState: createMockAccessibilityState(stateOverrides),
  auditResults: null,
  runAudit: jest.fn(),
  announce: jest.fn(),
  skipToMain: jest.fn(),
  skipToNavigation: jest.fn(),
  getAccessibleClasses: jest.fn(() => ''),
  getAccessibleStyles: jest.fn(() => ({})),
  createFocusTrap: jest.fn(),
  LiveRegion: () => null,
  focusHistory: []
});

// Mock factory for different accessibility scenarios
export const accessibilityScenarios = {
  default: () => createMockAccessibilityHook(),
  screenReader: () => createMockAccessibilityHook({ isScreenReader: true }),
  highContrast: () => createMockAccessibilityHook({ isHighContrast: true }),
  keyboardUser: () => createMockAccessibilityHook({ isKeyboardUser: true }),
  reducedMotion: () => createMockAccessibilityHook({ isReducedMotion: true }),
  multipleNeeds: () => createMockAccessibilityHook({
    isScreenReader: true,
    isHighContrast: true,
    isKeyboardUser: true
  })
};

// Verification helpers
export const verifyAccessibilityMockCalls = (mockHook, expectedCalls = {}) => {
  if (expectedCalls.announce) {
    expect(mockHook.announce).toHaveBeenCalledTimes(expectedCalls.announce);
  }
  if (expectedCalls.runAudit) {
    expect(mockHook.runAudit).toHaveBeenCalledTimes(expectedCalls.runAudit);
  }
  if (expectedCalls.getAccessibleClasses) {
    expect(mockHook.getAccessibleClasses).toHaveBeenCalledTimes(expectedCalls.getAccessibleClasses);
  }
};