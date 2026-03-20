import { sanitizeHighlight, sanitizeContent } from '../../utils/sanitize';

describe('sanitizeHighlight', () => {
  it('preserves mark tags', () => {
    expect(sanitizeHighlight('<mark>term</mark>')).toContain('<mark>');
  });

  it('strips img/script/iframe', () => {
    expect(sanitizeHighlight('<img src=x onerror=alert(1)>')).not.toContain('img');
    expect(sanitizeHighlight('<script>x</script>')).not.toContain('script');
    expect(sanitizeHighlight('<iframe src=x>')).not.toContain('iframe');
  });

  it('strips event handlers', () => {
    expect(sanitizeHighlight('<span onmouseover=alert(1)>x</span>')).not.toContain('onmouseover');
  });

  it('preserves class attribute on allowed tags', () => {
    const result = sanitizeHighlight('<span class="highlight">text</span>');
    expect(result).toContain('class="highlight"');
  });

  it('strips disallowed attributes', () => {
    const result = sanitizeHighlight('<span style="color:red" id="x">text</span>');
    expect(result).not.toContain('style');
    expect(result).not.toContain('id=');
  });
});

describe('sanitizeContent', () => {
  it('preserves safe tutorial HTML', () => {
    const html = '<p>Click the <strong>button</strong> to proceed.</p>';
    expect(sanitizeContent(html)).toContain('<p>');
    expect(sanitizeContent(html)).toContain('<strong>');
  });

  it('preserves links with href', () => {
    const html = '<a href="/help" target="_blank" rel="noopener">Help</a>';
    const result = sanitizeContent(html);
    expect(result).toContain('href="/help"');
    expect(result).toContain('target="_blank"');
  });

  it('preserves lists', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    expect(sanitizeContent(html)).toContain('<ul>');
    expect(sanitizeContent(html)).toContain('<li>');
  });

  it('strips dangerous tags', () => {
    expect(sanitizeContent('<script>alert(1)</script>')).not.toContain('script');
    expect(sanitizeContent('<iframe src=x>')).not.toContain('iframe');
  });

  it('strips dangerous attributes on allowed tags', () => {
    expect(sanitizeContent('<p onclick=alert(1)>text</p>')).not.toContain('onclick');
  });
});
