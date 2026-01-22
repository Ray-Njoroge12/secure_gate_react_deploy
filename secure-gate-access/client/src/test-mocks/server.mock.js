/**
 * MSW Server Setup for Integration Tests
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers.mock';

// Create MSW server with handlers
export const server = setupServer(...handlers);

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn'
  });
});

// Reset handlers after each test (important for test isolation)
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests are done
afterAll(() => {
  server.close();
});

export default server;
