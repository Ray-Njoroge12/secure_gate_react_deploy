import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Set global test timeout to prevent hanging tests
jest.setTimeout(10000);

// Mock logger for ErrorProvider
jest.mock('utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

// Mock error queue service for ErrorProvider
jest.mock('./services/errorQueueService', () => ({
  default: {
    addError: jest.fn(),
    getErrors: jest.fn(() => []),
    clearAll: jest.fn(),
    removeError: jest.fn()
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;
