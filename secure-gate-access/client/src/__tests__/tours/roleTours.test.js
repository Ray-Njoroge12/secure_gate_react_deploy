import adminTourSteps from '../../tours/adminTour';
import guardTourSteps from '../../tours/guardTour';
import residentTourSteps from '../../tours/residentTour';

describe('role tour definitions', () => {
  test('resident dashboard tour does not include off-route approval/settings selectors', () => {
    const selectors = residentTourSteps.map((step) => step.element);

    expect(selectors).not.toContain('[data-tour="approvals-panel"]');
    expect(selectors).not.toContain('[data-tour="auto-approval"]');
    expect(selectors).not.toContain('[data-tour="settings"]');
    expect(selectors).not.toContain('[data-tour="visitor-history"]');
  });

  test('guard dashboard tour does not include off-route selectors', () => {
    const selectors = guardTourSteps.map((step) => step.element);

    expect(selectors).not.toContain('[data-tour="walk-in-registration"]');
    expect(selectors).not.toContain('[data-tour="incident-report"]');
    expect(selectors).not.toContain('[data-tour="shift-handover"]');
  });

  test('admin tour steps request expected tab switches', () => {
    const tabsSeen = [];
    const handler = (event) => tabsSeen.push(event.detail?.tab);
    window.addEventListener('securegate-tour-admin-tab', handler);

    try {
      adminTourSteps.forEach((step) => {
        if (step.onHighlightStarted) {
          step.onHighlightStarted();
        }
      });
    } finally {
      window.removeEventListener('securegate-tour-admin-tab', handler);
    }

    expect(tabsSeen).toEqual([
      'overview',
      'guards',
      'residents',
      'visitors',
      'reports',
      'settings',
    ]);
  });
});
