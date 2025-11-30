/**
 * Puppeteer Test Configuration
 * SecureGate Access Control System
 */

export const config = {
  // Base URLs
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3001',
  
  // Viewport settings
  viewport: {
    desktop: { width: 1920, height: 1080 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 812 }
  },
  
  // Test timeouts
  timeouts: {
    navigation: 30000,
    element: 10000,
    animation: 500
  },
  
  // Test accounts
  accounts: {
    admin: {
      username: 'admin@test.com',
      password: 'Test123!'
    },
    resident: {
      username: 'resident@test.com',
      password: 'Test123!'
    },
    guard: {
      username: 'guard@test.com',
      password: 'Test123!'
    },
    newUser: {
      username: `testuser_${Date.now()}@test.com`,
      password: 'NewUser123!',
      name: 'Test User'
    }
  },
  
  // Selectors
  selectors: {
    // Login page
    login: {
      usernameInput: 'input[name="username"], input[name="email"], input[type="email"]',
      passwordInput: 'input[name="password"], input[type="password"]',
      submitButton: 'button[type="submit"]',
      errorMessage: '[role="alert"], .error-message, .text-red-500',
      forgotPassword: 'a[href*="forgot"], button:has-text("Forgot")'
    },
    // Registration page
    register: {
      nameInput: 'input[name="name"], input[name="username"]',
      emailInput: 'input[name="email"], input[type="email"]',
      passwordInput: 'input[name="password"]',
      confirmPassword: 'input[name="confirmPassword"], input[name="password_confirmation"]',
      roleSelect: 'select[name="role"], [data-testid="role-select"]',
      submitButton: 'button[type="submit"]',
      successMessage: '.success, [role="alert"]:has-text("success")'
    },
    // Dashboard
    dashboard: {
      sidebar: '[data-testid="sidebar"], .sidebar, nav',
      userMenu: '[data-testid="user-menu"], .user-menu',
      logoutButton: 'button:has-text("Logout"), [data-testid="logout"]',
      statsCard: '.stats-card, [data-testid="stats"]'
    },
    // Navigation
    nav: {
      home: 'a[href="/"], a[href="/dashboard"]',
      visitors: 'a[href*="visitor"]',
      settings: 'a[href*="settings"]',
      reports: 'a[href*="reports"]'
    }
  },
  
  // Screenshot settings
  screenshots: {
    enabled: true,
    dir: './tests/puppeteer/screenshots',
    onFailure: true
  }
};

export default config;
