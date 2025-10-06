/**
 * E2E Test: Password Reset Flow (Complete)
 * 
 * This test covers the complete password reset workflow from
 * requesting reset to successfully logging in with new password.
 */

const { test, expect } = require('@playwright/test');

test.describe('Password Reset Flow', () => {
  let userPage;
  let resetEmail = 'password-reset@test.com';
  let resetToken;

  test.beforeEach(async ({ browser }) => {
    userPage = await browser.newPage();
  });

  test.afterEach(async () => {
    if (userPage) await userPage.close();
  });

  test('Complete password reset workflow', async () => {
    // Step 1: User requests password reset
    await test.step('User requests password reset', async () => {
      await userPage.goto('/login');
      
      // Click forgot password link
      await userPage.click('[data-testid="forgot-password-link"]');
      await expect(userPage.locator('[data-testid="forgot-password-page"]')).toBeVisible();
      
      // Enter email for password reset
      await userPage.fill('[data-testid="reset-email-input"]', resetEmail);
      await userPage.click('[data-testid="send-reset-button"]');
      
      // Verify reset request sent
      await expect(userPage.locator('[data-testid="reset-sent-message"]')).toBeVisible();
      await expect(userPage.locator('[data-testid="reset-sent-message"]')).toContainText('Password reset email sent');
    });

    // Step 2: User receives reset email and clicks link
    await test.step('User clicks reset link from email', async () => {
      // In a real scenario, this would involve checking email
      // For testing, we'll simulate the reset token
      resetToken = 'test-reset-token-123456';
      
      // Navigate to reset password page with token
      await userPage.goto(`/reset-password?token=${resetToken}`);
      await expect(userPage.locator('[data-testid="reset-password-page"]')).toBeVisible();
      
      // Verify token is valid
      await expect(userPage.locator('[data-testid="token-valid-message"]')).toBeVisible();
    });

    // Step 3: User enters new password
    await test.step('User sets new password', async () => {
      const newPassword = 'NewSecurePassword123!';
      
      // Enter new password
      await userPage.fill('[data-testid="new-password-input"]', newPassword);
      await userPage.fill('[data-testid="confirm-password-input"]', newPassword);
      
      // Verify password strength indicator
      await expect(userPage.locator('[data-testid="password-strength-indicator"]')).toContainText('Strong');
      
      // Submit new password
      await userPage.click('[data-testid="submit-new-password-button"]');
      
      // Verify password reset success
      await expect(userPage.locator('[data-testid="password-reset-success"]')).toBeVisible();
      await expect(userPage.locator('[data-testid="password-reset-success"]')).toContainText('Password reset successfully');
    });

    // Step 4: User logs in with new password
    await test.step('User logs in with new password', async () => {
      // Redirected to login page
      await expect(userPage.locator('[data-testid="login-page"]')).toBeVisible();
      
      // Login with new password
      await userPage.fill('[data-testid="email-input"]', resetEmail);
      await userPage.fill('[data-testid="password-input"]', 'NewSecurePassword123!');
      await userPage.click('[data-testid="login-button"]');
      
      // Verify successful login
      await expect(userPage.locator('[data-testid="dashboard"]')).toBeVisible();
      await expect(userPage.locator('[data-testid="success-message"]')).toContainText('Login successful');
    });

    // Step 5: Verify old password no longer works
    await test.step('Verify old password is invalid', async () => {
      await userPage.goto('/logout');
      await userPage.goto('/login');
      
      // Try to login with old password
      await userPage.fill('[data-testid="email-input"]', resetEmail);
      await userPage.fill('[data-testid="password-input"]', 'OldPassword123!');
      await userPage.click('[data-testid="login-button"]');
      
      // Verify login fails
      await expect(userPage.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    });

    // Step 6: Verify security measures
    await test.step('Verify security measures', async () => {
      // Check that reset token is invalidated
      await userPage.goto(`/reset-password?token=${resetToken}`);
      await expect(userPage.locator('[data-testid="token-invalid-message"]')).toBeVisible();
      
      // Check that user is logged out from all sessions
      await userPage.goto('/dashboard');
      await expect(userPage.locator('[data-testid="login-page"]')).toBeVisible();
    });
  });

  test('Password reset error handling', async () => {
    await test.step('Handle invalid email for reset', async () => {
      await userPage.goto('/forgot-password');
      
      // Enter non-existent email
      await userPage.fill('[data-testid="reset-email-input"]', 'nonexistent@test.com');
      await userPage.click('[data-testid="send-reset-button"]');
      
      // Verify error message
      await expect(userPage.locator('[data-testid="error-message"]')).toContainText('Email not found');
    });

    await test.step('Handle invalid reset token', async () => {
      await userPage.goto('/reset-password?token=invalid-token');
      
      // Verify error message
      await expect(userPage.locator('[data-testid="token-invalid-message"]')).toBeVisible();
      await expect(userPage.locator('[data-testid="token-invalid-message"]')).toContainText('Invalid or expired token');
    });

    await test.step('Handle expired reset token', async () => {
      // Simulate expired token
      const expiredToken = 'expired-token-123456';
      await userPage.goto(`/reset-password?token=${expiredToken}`);
      
      // Verify expiration message
      await expect(userPage.locator('[data-testid="token-expired-message"]')).toBeVisible();
    });

    await test.step('Handle password mismatch', async () => {
      await userPage.goto('/reset-password?token=valid-token');
      
      // Enter mismatched passwords
      await userPage.fill('[data-testid="new-password-input"]', 'NewPassword123!');
      await userPage.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
      await userPage.click('[data-testid="submit-new-password-button"]');
      
      // Verify error message
      await expect(userPage.locator('[data-testid="password-mismatch-error"]')).toContainText('Passwords do not match');
    });

    await test.step('Handle weak password', async () => {
      await userPage.goto('/reset-password?token=valid-token');
      
      // Enter weak password
      await userPage.fill('[data-testid="new-password-input"]', '123');
      await userPage.fill('[data-testid="confirm-password-input"]', '123');
      await userPage.click('[data-testid="submit-new-password-button"]');
      
      // Verify error message
      await expect(userPage.locator('[data-testid="password-weak-error"]')).toContainText('Password is too weak');
    });
  });

  test('Password reset security features', async () => {
    await test.step('Test rate limiting on reset requests', async () => {
      await userPage.goto('/forgot-password');
      
      // Make multiple rapid reset requests
      for (let i = 0; i < 5; i++) {
        await userPage.fill('[data-testid="reset-email-input"]', resetEmail);
        await userPage.click('[data-testid="send-reset-button"]');
        await userPage.waitForTimeout(100);
      }
      
      // Verify rate limiting
      await expect(userPage.locator('[data-testid="rate-limit-error"]')).toContainText('Too many requests');
    });

    await test.step('Test token expiration', async () => {
      // Request password reset
      await userPage.goto('/forgot-password');
      await userPage.fill('[data-testid="reset-email-input"]', resetEmail);
      await userPage.click('[data-testid="send-reset-button"]');
      
      // Wait for token to expire (simulate)
      await userPage.waitForTimeout(1000);
      
      // Try to use expired token
      await userPage.goto('/reset-password?token=expired-token');
      await expect(userPage.locator('[data-testid="token-expired-message"]')).toBeVisible();
    });

    await test.step('Test token single use', async () => {
      const singleUseToken = 'single-use-token-123456';
      
      // Use token first time
      await userPage.goto(`/reset-password?token=${singleUseToken}`);
      await userPage.fill('[data-testid="new-password-input"]', 'NewPassword123!');
      await userPage.fill('[data-testid="confirm-password-input"]', 'NewPassword123!');
      await userPage.click('[data-testid="submit-new-password-button"]');
      
      // Try to use same token again
      await userPage.goto(`/reset-password?token=${singleUseToken}`);
      await expect(userPage.locator('[data-testid="token-used-message"]')).toBeVisible();
    });
  });

  test('Password reset email verification', async () => {
    await test.step('Verify reset email content', async () => {
      // This would typically involve checking email content
      // For testing, we'll verify the email was sent via API
      const response = await userPage.request.get('http://localhost:3001/api/emails/sent');
      const emails = await response.json();
      
      // Find reset email
      const resetEmail = emails.find(email => 
        email.to === resetEmail && 
        email.subject.includes('Password Reset')
      );
      
      expect(resetEmail).toBeDefined();
      expect(resetEmail.content).toContain('password reset');
      expect(resetEmail.content).toContain('reset-password?token=');
    });

    await test.step('Verify email security', async () => {
      // Check that email contains secure reset link
      const response = await userPage.request.get('http://localhost:3001/api/emails/sent');
      const emails = await response.json();
      
      const resetEmail = emails.find(email => 
        email.to === resetEmail && 
        email.subject.includes('Password Reset')
      );
      
      // Verify email contains HTTPS link
      expect(resetEmail.content).toContain('https://');
      
      // Verify email contains expiration notice
      expect(resetEmail.content).toContain('expires in');
    });
  });

  test('Password reset accessibility', async () => {
    await test.step('Test keyboard navigation', async () => {
      await userPage.goto('/forgot-password');
      
      // Test tab navigation
      await userPage.keyboard.press('Tab');
      await expect(userPage.locator('[data-testid="reset-email-input"]')).toBeFocused();
      
      await userPage.keyboard.press('Tab');
      await expect(userPage.locator('[data-testid="send-reset-button"]')).toBeFocused();
    });

    await test.step('Test screen reader compatibility', async () => {
      await userPage.goto('/reset-password?token=valid-token');
      
      // Check for proper ARIA labels
      await expect(userPage.locator('[data-testid="new-password-input"]')).toHaveAttribute('aria-label');
      await expect(userPage.locator('[data-testid="confirm-password-input"]')).toHaveAttribute('aria-label');
      
      // Check for error announcements
      await userPage.fill('[data-testid="new-password-input"]', '123');
      await userPage.click('[data-testid="submit-new-password-button"]');
      
      await expect(userPage.locator('[data-testid="password-weak-error"]')).toHaveAttribute('role', 'alert');
    });
  });
});
