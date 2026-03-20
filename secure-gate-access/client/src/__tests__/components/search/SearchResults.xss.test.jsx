/**
 * XSS sanitization tests for SearchResults component
 * Verifies that DOMPurify is used to sanitize innerHTML content
 */
import DOMPurify from 'dompurify';

describe('SearchResults XSS sanitization', () => {
  it('DOMPurify.sanitize strips XSS onerror payloads', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const sanitized = DOMPurify.sanitize(malicious);
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('alert(1)');
  });

  it('DOMPurify.sanitize strips script tags', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = DOMPurify.sanitize(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert("xss")');
  });

  it('DOMPurify.sanitize preserves <mark> tags used for search highlighting', () => {
    const safe = '<mark>search term</mark>';
    const sanitized = DOMPurify.sanitize(safe);
    expect(sanitized).toContain('<mark>');
    expect(sanitized).toContain('search term');
  });

  it('DOMPurify.sanitize preserves safe inline HTML', () => {
    const safe = '<strong>John</strong> <em>Doe</em>';
    const sanitized = DOMPurify.sanitize(safe);
    expect(sanitized).toContain('<strong>');
    expect(sanitized).toContain('<em>');
  });

  it('SearchResults.jsx source uses DOMPurify.sanitize for highlight text rendering', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(
      __dirname,
      '../../../components/search/SearchResults.jsx'
    );
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain("DOMPurify.sanitize(highlight.text)");
    expect(content).toContain("import DOMPurify from 'dompurify'");
  });
});
