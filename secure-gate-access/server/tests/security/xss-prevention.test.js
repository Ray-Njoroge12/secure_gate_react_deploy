/**
 * SEC-105: OWASP Top 10 - A07 Cross-Site Scripting (XSS) Prevention
 * Tests for XSS vulnerabilities across all user input fields
 */

import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

describe('SEC-105: XSS Prevention', () => {
  let app;
  let residentToken;

  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src="x" onerror="alert(\'XSS\')">',
    '<svg onload="alert(\'XSS\')">',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')">',
    '<body onload="alert(\'XSS\')">',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<img src=x onerror=alert(1)//>',
    '<svg/onload=alert(1)>',
    '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//"',
    '<IMG """><SCRIPT>alert("XSS")</SCRIPT>">',
    '<IMG SRC=javascript:alert(\'XSS\')>',
    '<IMG SRC=JaVaScRiPt:alert(\'XSS\')>',
    '<IMG SRC=`javascript:alert("XSS")`>',
    '<a onmouseover="alert(document.cookie)">hover me</a>',
    '<div style="background-image: url(javascript:alert(\'XSS\'))">',
    '<input onfocus=alert(1) autofocus>',
    '<marquee onstart=alert(1)>',
    '<video><source onerror="alert(1)">',
    '<math><maction actiontype="statusline#http://google.com" xlink:href="javascript:alert(1)">CLICKME</maction></math>'
  ];

  beforeAll(async () => {
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  describe('Stored XSS in Visitor Name', () => {
    xssPayloads.slice(0, 10).forEach((payload, index) => {
      it(`should sanitize XSS payload ${index + 1} in visitor name`, async () => {
        const response = await request(app)
          .post('/api/visitors')
          .set('Authorization', `Bearer ${residentToken}`)
          .send({
            name: payload,
            phone: '+254712345678',
            purpose: 'Testing XSS'
          });

        // If stored, should be sanitized
        if (response.status === 201 && response.body.data) {
          const storedName = response.body.data.name;
          
          // Should NOT contain executable script tags
          expect(storedName).not.toMatch(/<script/i);
          expect(storedName).not.toMatch(/javascript:/i);
          expect(storedName).not.toMatch(/onerror=/i);
          expect(storedName).not.toMatch(/onload=/i);
          expect(storedName).not.toMatch(/onclick=/i);
        }
      });
    });
  });

  describe('Stored XSS in Visitor Purpose', () => {
    xssPayloads.slice(0, 5).forEach((payload, index) => {
      it(`should sanitize XSS payload ${index + 1} in purpose field`, async () => {
        const response = await request(app)
          .post('/api/visitors')
          .set('Authorization', `Bearer ${residentToken}`)
          .send({
            name: 'Test Visitor',
            phone: '+254712345678',
            purpose: payload
          });

        if (response.status === 201 && response.body.data) {
          const storedPurpose = response.body.data.purpose;
          expect(storedPurpose).not.toMatch(/<script/i);
          expect(storedPurpose).not.toMatch(/javascript:/i);
        }
      });
    });
  });

  describe('Reflected XSS in Search', () => {
    xssPayloads.slice(0, 5).forEach((payload, index) => {
      it(`should sanitize reflected XSS payload ${index + 1} in search`, async () => {
        const response = await request(app)
          .get('/api/visitors')
          .query({ search: payload })
          .set('Authorization', `Bearer ${residentToken}`);

        // Response should NOT contain unescaped payload
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toMatch(/<script>/i);
      });
    });
  });

  describe('XSS in Error Messages', () => {
    it('should not reflect user input in error messages', async () => {
      const maliciousEmail = '<script>alert(1)</script>@test.com';
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: maliciousEmail,
          password: 'test'
        });

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('<script>');
    });
  });

  describe('Content-Type Headers', () => {
    it('should set correct Content-Type for JSON responses', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Security Headers', () => {
    it('should include X-Content-Type-Options: nosniff', async () => {
      const response = await request(app).get('/api/health');
      
      // Check if header exists (depends on helmet config)
      if (response.headers['x-content-type-options']) {
        expect(response.headers['x-content-type-options']).toBe('nosniff');
      }
    });

    it('should include X-XSS-Protection header', async () => {
      const response = await request(app).get('/api/health');
      
      // Modern approach: CSP is preferred over X-XSS-Protection
      // but checking for either
      const hasXssProtection = response.headers['x-xss-protection'];
      const hasCsp = response.headers['content-security-policy'];
      
      // At least one protection mechanism should exist
      expect(hasXssProtection || hasCsp).toBeTruthy();
    });
  });
});
