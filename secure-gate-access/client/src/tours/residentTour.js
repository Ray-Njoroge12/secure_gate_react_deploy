/**
 * @file tours/residentTour.js
 * @description Driver.js tour steps for the Resident role.
 * Dashboard-scoped tour covering the core resident workflow.
 */

const residentTourSteps = [
  {
    element: '[data-tour="dashboard-stats"]',
    popover: {
      title: 'Welcome to Your Dashboard',
      description: 'Here\'s your command centre — live stats on visitors today, pending approvals, and upcoming visits at a glance.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="quick-invite"]',
    popover: {
      title: 'Invite a Visitor',
      description: 'The fastest way to generate a visitor pass. Enter a name, phone number, and date — your guest receives a QR code instantly.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="bulk-invite"]',
    popover: {
      title: 'Invite Multiple Guests',
      description: 'Planning an event or expecting several visitors? Use Bulk Invite to send passes to your entire guest list at once.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="favorite-visitors"]',
    popover: {
      title: 'Your Favourite Visitors',
      description: 'Save frequent visitors as favourites for one-tap re-invites. No need to re-enter their details each time.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="quick-actions"]',
    popover: {
      title: 'Quick Actions',
      description: 'Jump straight to your most-used tools from here — invites, history, privacy controls, and favourites.',
      side: 'top',
      align: 'center',
    },
  },
];

export default residentTourSteps;
