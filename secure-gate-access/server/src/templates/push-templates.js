const fallback = (value, defaultValue = '') => (value == null ? defaultValue : value);

const templates = {
  guard_invite_created: (data) => ({
    title: 'New visitor invite',
    body: `${fallback(data.residentName, 'A resident')} created a visitor invite for ${fallback(data.visitorName, 'a guest')}.`
  }),
  guard_manual_lookup: (data) => ({
    title: 'Manual lookup requested',
    body: `Lookup requested for ${fallback(data.visitorName, 'a visitor')}.`
  }),
  guard_check_in: (data) => ({
    title: 'Visitor checked in',
    body: `${fallback(data.visitorName, 'A visitor')} checked in at ${fallback(data.location, 'the gate')}.`
  }),
  guard_check_out: (data) => ({
    title: 'Visitor checked out',
    body: `${fallback(data.visitorName, 'A visitor')} checked out at ${fallback(data.location, 'the gate')}.`
  }),
  guard_panic_alert: (data) => ({
    title: '🚨 Panic alert',
    body: `${fallback(data.guardName, 'A guard')} triggered a panic alert at ${fallback(data.location, 'the gate')}.`
  }),
  resident_invite_created: (data) => ({
    title: 'Invite created',
    body: `Your invite for ${fallback(data.visitorName, 'your guest')} is ready.`
  }),
  resident_invite_approved: (data) => ({
    title: 'Invite approved',
    body: `Your invite for ${fallback(data.visitorName, 'your guest')} was approved.`
  }),
  resident_invite_denied: (data) => ({
    title: 'Invite denied',
    body: `Your invite for ${fallback(data.visitorName, 'your guest')} was denied.`
  }),
  resident_visit_checked_in: (data) => ({
    title: 'Guest arrived',
    body: `${fallback(data.visitorName, 'Your guest')} checked in at ${fallback(data.location, 'the gate')}.`
  }),
  resident_visit_checked_out: (data) => ({
    title: 'Guest departed',
    body: `${fallback(data.visitorName, 'Your guest')} checked out at ${fallback(data.location, 'the gate')}.`
  }),
  notification_generic: (data) => ({
    title: fallback(data.title, 'Secure Gate update'),
    body: fallback(data.body, 'You have a new notification.')
  })
};

export function renderPushTemplate(name, data = {}) {
  const template = templates[name];
  if (!template) {
    return {
      title: 'Secure Gate update',
      body: 'You have a new notification.'
    };
  }

  return template(data);
}

export const pushTemplateNames = Object.keys(templates);
