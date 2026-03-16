/**
 * @file tours/adminTour.js
 * @description Driver.js tour steps for the Admin role.
 * 6-step guided tour covering estate administration features.
 */

const switchToAdminTab = (tab) => {
  window.dispatchEvent(new CustomEvent('securegate-tour-admin-tab', { detail: { tab } }));
};

const adminTourSteps = [
  {
    element: '[data-tour="admin-dashboard"]',
    onHighlightStarted: () => switchToAdminTab('overview'),
    popover: {
      title: 'Estate Control Centre',
      description: 'Your estate-wide overview — active visitors, guard coverage, security alerts, and system health at a glance.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="manage-guards"]',
    onHighlightStarted: () => switchToAdminTab('guards'),
    popover: {
      title: 'Manage Guard Accounts',
      description: 'Create, edit, and deactivate guard accounts. Assign shifts and monitor guard activity across the estate.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="manage-residents"]',
    onHighlightStarted: () => switchToAdminTab('residents'),
    popover: {
      title: 'Manage Residents',
      description: 'Approve new resident registrations, manage existing accounts, and oversee unit assignments.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="visitor-log"]',
    onHighlightStarted: () => switchToAdminTab('visitors'),
    popover: {
      title: 'Complete Visitor Log',
      description: 'Full audit trail of every visitor across the estate — searchable, filterable, and exportable for compliance.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="reports"]',
    onHighlightStarted: () => switchToAdminTab('reports'),
    popover: {
      title: 'Generate Reports',
      description: 'Visitor traffic patterns, incident summaries, guard activity logs — generate and export detailed reports.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="system-settings"]',
    onHighlightStarted: () => switchToAdminTab('settings'),
    popover: {
      title: 'System Settings & Integrations',
      description: 'Configure estate policies, SMS and email gateways, third-party integrations, and system-wide preferences.',
      side: 'left',
      align: 'start',
    },
  },
];

export default adminTourSteps;
