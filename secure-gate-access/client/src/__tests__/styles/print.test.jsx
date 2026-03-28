describe('Print CSS', () => {
  test('print stylesheet contains @media print rules', () => {
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../styles.css'),
      'utf-8'
    );

    expect(css).toContain('@media print');
  });

  test('print CSS hides navigation and non-essential elements', () => {
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(
      path.resolve(__dirname, '../../styles.css'),
      'utf-8'
    );

    // Should hide nav elements
    expect(css).toMatch(/nav.*display:\s*none/s);
    // Should have rules for visitor pass
    expect(css).toMatch(/visitor-pass|qr-code/i);
  });
});
