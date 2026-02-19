/**
 * @file tours/guardTour.js
 * @description Driver.js tour steps for the Guard role.
 * 7-step guided tour covering the core guard station workflow.
 */

const guardTourSteps = [
  {
    element: '[data-tour="guard-dashboard-kpis"]',
    popover: {
      title: 'Guard Station Overview',
      description: 'Your live dashboard — visitors currently on-premise, pending approvals, and your shift status all in one view.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="scan-qr"]',
    popover: {
      title: 'Scan a Visitor QR Code',
      description: 'Point and scan — the system verifies the visitor\'s identity and pass validity instantly. The fastest way to check someone in.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="manual-check"]',
    popover: {
      title: 'Manual Visitor Lookup',
      description: 'No QR code? Search by name, phone number, or ID to find and verify a visitor manually.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="walk-in-registration"]',
    popover: {
      title: 'Register a Walk-In',
      description: 'Unexpected visitor at the gate? Register them here and send an instant approval request to the resident.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="pending-approvals"]',
    popover: {
      title: 'Pending Approvals Queue',
      description: 'Track which walk-in visitors are awaiting resident approval in real time. You\'ll see status updates as they come in.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="incident-report"]',
    popover: {
      title: 'Report an Incident',
      description: 'Log security incidents directly from the guard station — suspicious activity, access violations, or emergencies.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="shift-handover"]',
    popover: {
      title: 'Shift Handover',
      description: 'End of shift? Create a structured handover report so the next guard knows exactly what\'s happening on the ground.',
      side: 'left',
      align: 'start',
    },
  },
];

export default guardTourSteps;
