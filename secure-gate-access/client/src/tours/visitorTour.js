/**
 * @file tours/visitorTour.js
 * @description Driver.js tour steps for the Visitor experience.
 * 4-step guided tour covering the public visitor invite flow (the /v/:token page).
 */

const visitorTourSteps = [
  {
    element: '[data-tour="visitor-invite-header"]',
    popover: {
      title: "You've Been Invited",
      description: 'Your host has registered your visit. Here you\'ll see all the details — who invited you, the estate, date, and time.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="visitor-otp"]',
    popover: {
      title: 'Verify Your Identity',
      description: 'Enter the OTP sent to your phone to confirm your visit. This ensures only you can use this invitation.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="visitor-qr"]',
    popover: {
      title: 'Your Entry QR Code',
      description: 'Show this QR code to the guard at the gate — it\'s your digital pass. The guard scans it for instant verification.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="visitor-confirm"]',
    popover: {
      title: "You're All Set",
      description: 'Your visit is confirmed and the guard has been notified. Keep this page handy — you\'ll need the QR code at the gate.',
      side: 'top',
      align: 'center',
    },
  },
];

export default visitorTourSteps;
