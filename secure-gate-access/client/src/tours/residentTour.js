/**
 * @file tours/residentTour.js
 * @description Driver.js tour steps for the Resident role.
 * 8-step guided tour covering the core resident workflow.
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
    element: '[data-tour="visitor-history"]',
    popover: {
      title: 'Full Visitor History',
      description: 'Every invitation, entry, and exit — fully audited and searchable. Track who visited and when.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="approvals-panel"]',
    popover: {
      title: 'Walk-In Approvals',
      description: 'When a guard at the gate needs your approval for an unexpected visitor, the request appears here in real time.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="auto-approval"]',
    popover: {
      title: 'Auto-Approval Rules',
      description: 'Set trusted visitors who can enter without manual approval every time. Perfect for regular service providers.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="settings"]',
    popover: {
      title: 'Notifications & Preferences',
      description: 'Control how and when you\'re alerted — push notifications, SMS, email. Adjust your privacy and profile settings here.',
      side: 'left',
      align: 'start',
    },
  },
];

export default residentTourSteps;
