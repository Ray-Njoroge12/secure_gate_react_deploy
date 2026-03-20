/**
 * XSS sanitization tests for TutorialSystem component
 * Verifies that DOMPurify is used to sanitize tutorial content
 */
import DOMPurify from 'dompurify';

describe('TutorialSystem XSS sanitization', () => {
  it('DOMPurify.sanitize strips script tags from tutorial content', () => {
    const malicious = '<script>alert("xss")</script>Welcome to the tutorial';
    const sanitized = DOMPurify.sanitize(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert("xss")');
  });

  it('DOMPurify.sanitize strips javascript: href attacks', () => {
    const malicious = '<a href="javascript:alert(1)">click me</a>';
    const sanitized = DOMPurify.sanitize(malicious);
    expect(sanitized).not.toContain('javascript:');
  });

  it('DOMPurify.sanitize preserves safe <p> tags', () => {
    const safe = '<p>Welcome to the tutorial step.</p>';
    const sanitized = DOMPurify.sanitize(safe);
    expect(sanitized).toContain('<p>');
    expect(sanitized).toContain('Welcome to the tutorial step.');
  });

  it('DOMPurify.sanitize preserves <b>, <i>, <em>, <strong> tags', () => {
    const safe = '<b>bold</b> <i>italic</i> <em>emphasis</em> <strong>strong</strong>';
    const sanitized = DOMPurify.sanitize(safe);
    expect(sanitized).toContain('<b>');
    expect(sanitized).toContain('<i>');
    expect(sanitized).toContain('<em>');
    expect(sanitized).toContain('<strong>');
  });

  it('DOMPurify.sanitize preserves <a> and <mark> tags', () => {
    const safe = '<a href="https://example.com">link</a> and <mark>highlight</mark>';
    const sanitized = DOMPurify.sanitize(safe);
    expect(sanitized).toContain('href="https://example.com"');
    expect(sanitized).toContain('<mark>');
  });

  it('TutorialSystem.jsx source uses DOMPurify.sanitize for step content rendering', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(
      __dirname,
      '../../../components/onboarding/TutorialSystem.jsx'
    );
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain("DOMPurify.sanitize(currentStepData.content)");
    expect(content).toContain("import DOMPurify from 'dompurify'");
  });
});
