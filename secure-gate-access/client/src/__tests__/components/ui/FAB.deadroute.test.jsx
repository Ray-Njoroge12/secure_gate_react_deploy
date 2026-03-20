/**
 * Dead route tests for FAB, QuickActionMenu, and navigationFlow
 * Ensures no references to removed /resident/generate-pass route
 */
const fs = require('fs');
const path = require('path');

const SRC_ROOT = path.join(__dirname, '../../../');

describe('Dead route: /resident/generate-pass should not exist', () => {
  it('FAB.jsx does not reference /resident/generate-pass', () => {
    const filePath = path.join(SRC_ROOT, 'components/ui/FAB.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).not.toContain('/resident/generate-pass');
  });

  it('FAB.jsx uses /resident/quick-invite instead', () => {
    const filePath = path.join(SRC_ROOT, 'components/ui/FAB.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('/resident/quick-invite');
  });

  it('QuickActionMenu.jsx does not reference /resident/generate-pass', () => {
    const filePath = path.join(SRC_ROOT, 'components/common/QuickActionMenu.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).not.toContain('/resident/generate-pass');
  });

  it('QuickActionMenu.jsx uses /resident/quick-invite instead', () => {
    const filePath = path.join(SRC_ROOT, 'components/common/QuickActionMenu.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('/resident/quick-invite');
  });

  it('navigationFlow.js does not reference /resident/generate-pass', () => {
    const filePath = path.join(SRC_ROOT, 'utils/navigationFlow.js');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).not.toContain('/resident/generate-pass');
  });

  it('navigationFlow.js uses /resident/quick-invite instead', () => {
    const filePath = path.join(SRC_ROOT, 'utils/navigationFlow.js');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('/resident/quick-invite');
  });
});
