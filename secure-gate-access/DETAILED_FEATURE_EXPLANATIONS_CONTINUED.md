# Detailed Feature Explanations — Continued

Date: 27 November 2025

This document completes the in-depth explanations for the improvements you selected. It continues from Visitor Direction Sharing and covers multi-language acquisition (i18n), Community Announcements, a short implementation prioritization rationale, and recommended next steps.

---

## Visitor Direction Sharing — Continued

### Complete Functionality
- Open-in-Map buttons for Google Maps, Waze, Apple Maps (detect platform).
- Per-invite resident instructions: free-text field with structured suggestions ("Use Gate 2", "Park in visitor bays", "Call guard on arrival").
- Location-aware suggestions: when visitor opens invite on mobile, show a single-tap "Start navigation" that supplies origin (visitor current position) and destination (estate coordinate + gate coordinate).
- Gate selection: estate admin maintains a list of gates with names, lat/lng, phone number, and instructions; resident can select which gate to use for each invite.
- Short links and deep links: include map deep-link URL and fallback to plain address + instructions if maps not available.
- Turn-by-turn ETA estimation (approx): compute ETA using client device's network and travel mode (driving/walking); optional estimate sent to host as "Visitor ETA".
- Offline directions: allow visitor to download a small directions snippet (text + image/map snapshot or PDF) when data access is poor.

### Integration Points
- Frontend: `VisitorInvitePage.jsx` — add "Directions" UI and gate selector.
- Backend: `passService.js` / `visitorRoutes.js` — include gate metadata in invite payload.
- Admin UI: estate `SiteManagement.jsx` — gate definitions management (lat/lng, name, default instructions).
- Notifications: when visitor taps "Get Directions", optionally send ETA to host via push/WhatsApp.
- Privacy: do not store visitor's real-time location server-side unless visitor explicitly shares it; use client-side deep-linking for navigation.

### APIs & Implementation Tips
- Google Maps URL: `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=driving`
- Waze URL: `https://waze.com/ul?ll=<lat>,<lng>&navigate=yes`
- Apple Maps: `http://maps.apple.com/?daddr=<lat>,<lng>`
- For ETA approximation: use Google Distance Matrix API (requires API key and quota) or client-side estimate using known average speeds.
- Gate DB schema: `gates(id, name, lat, lng, phone, instructions, is_active)`.

### UX Notes
- Actionable primary CTA: "Get Directions"; secondary: "Call Guard".
- Show concise instructions above the map link to reduce scanning required by drivers.
- Respect user's device locale and map defaults.

---

## Multi-language Acquisition (i18n)

### Goals
- Provide full UI translation for residents, guards, and visitors in high-priority languages (English, Swahili), and pluggable support for additional languages (Kikuyu, Luo) later.
- Ensure kiosks and printed/QR content (invite pages) show the visitor's chosen language when possible.

### Core Requirements
1. Centralized translation files per locale (JSON or i18n resource format).
2. Runtime locale detection (Accept-Language, browser locale, query param), with explicit user override in settings.
3. Pluralization, variable interpolation, date/time/number localization.
4. Translation coverage for client UI, kiosk flows, email/SMS templates, and push notifications.
5. Translation workflow: developer strings → i18n keys → translation files → human review → staging QA.
6. Ability to hot-add locales without app redeploy (loading locale files from CDN/endpoint).

### Implementation Plan
- Use a mature i18n library: `react-i18next` for React frontend (supports lazy-loading namespaces, interpolation, plurals).
- For server templates and email/SMS: use `i18next` or templating with localized message files.
- Kiosk (SelfCheckInKiosk.jsx): present language-switch UI with prominent locale buttons (EN/SW) and remember selection in localStorage.
- Date/time formatting: use `Intl.DateTimeFormat` and `dayjs`/`date-fns` with locale packs.
- Right-to-left (RTL) consideration: include framework support (Tailwind + dir="rtl") if adding RTL languages in future.

### File & Data Layout
- `locales/en/common.json` — base English strings
- `locales/sw/common.json` — Swahili translations
- `locales/<lang>/...` — additional namespaces: `dashboard.json`, `guard.json`, `kiosk.json`, `emails.json`.

### Operational & Quality Considerations
- Set up a translation pipeline (CSV/JSON export) for translators (Crowdin/Transifex/Locize).
- Keep copywriters in the loop to ensure contextual translations for instructions (legal/terms text reviewed).
- Add automated checks in CI for missing translation keys.

### Scope Prioritization
1. Kiosk and visitor invite pages (EN + SW) — highest priority.
2. Guard mobile pages (EN + SW) — high priority.
3. Resident dashboard (EN + SW) — high priority.
4. Admin flows + notifications — medium priority.

---

## Community Announcements (Estate Broadcasts)

### Purpose
- Allow admins to broadcast messages (announcements, events, maintenance alerts) to targeted audiences (all residents, blocks, or custom groups) via in-app banner, push, SMS, and email.

### Key Features
- Create announcement with title, body, urgency level (info/warning/critical), scheduled publish/duration, attachments (PDF/image), and audience segments.
- Audience segmentation: all residents, by block/phase, subscribed groups, roles (residents, guards, admins), or custom CSV upload.
- Multi-channel delivery: in-app banner (sticky), push notifications, email, SMS fallback — choose channels per audience.
- Scheduling and repeat rules (e.g., weekly trash pickup reminder every Thursday morning).
- Announcement lifecycle: Draft → Scheduled → Published → Archived.
- Analytics: open rates, push delivery stats, SMS bounce rates, number of views/clicks.
- Opt-out controls: residents can opt-out of non-critical channels but must receive critical safety alerts (opt-out exemption for emergency alerts).

### Integration Points
- Admin UI: `IntegrationsHub.jsx` / `Announcements.jsx` — compose and schedule messages.
- Notification service: reuse `notificationService.js` to send multi-channel messages and store delivery status.
- Resident UI: in-app `AnnouncementsPanel.jsx` and persistent banner on dashboard.
- Audit log: store publisher, timestamps, and recipient counts for compliance.

### Data Model (Simplified)
```sql
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  body TEXT,
  author_id INT REFERENCES users(id),
  audience JSONB,
  channels JSONB, -- { "push": true, "sms": false }
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  expires_at TIMESTAMP,
  urgency VARCHAR(20), -- info|warning|critical
  attachment_urls TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE announcement_stats (
  id SERIAL PRIMARY KEY,
  announcement_id INT REFERENCES announcements(id),
  resident_id INT REFERENCES users(id),
  channel VARCHAR(20), -- push|sms|email|banner
  delivered BOOLEAN,
  opened BOOLEAN,
  clicked BOOLEAN,
  timestamp TIMESTAMP
);
```

### UX Considerations
- Critical alerts must bypass resident opt-out and appear prominently on dashboard plus push/SMS.
- Non-critical announcements should respect user's channel preferences in `NotificationSettings`.
- Provide a collapsible history of announcements for residents.

---

## Prioritization Rationale & Implementation Sequence

You identified a cluster of improvements. Prioritization below balances impact, user pain, and implementation complexity.

1. **Guard Panic Button** (High impact, low-medium effort): safety-critical, high ROI in trust. Implement first.
2. **Save Pass to Device (Visitor)** (High impact, low-medium effort): resolves offline/pass reliability; good second step.
3. **Recent Visitors Quick Lookup (Guard)** (Medium impact, low effort): operational efficiency; implement with guard dashboard updates.
4. **Delivery & Package Management** (High impact, medium effort): many daily interactions; next priority.
5. **Auto-Approval Rules Engine** (High impact, medium effort): integrates with favorites and staff; implement after delivery/staff basics exist.
6. **Domestic Staff Module** (Very high impact, larger effort): critical for Kenya market; follow auto-approval or run parallel if resources allow.
7. **Offline Mode & Sync** (High effort, high impact): foundational for reliability; schedule during/after guard workflows and pass saving are implemented.
8. **Visitor Direction Sharing** (Low effort, medium impact): implement as part of pass page enhancements.
9. **Multi-language (EN+SW)** (Medium effort, high impact): do kiosk + invite pages first, then the rest.
10. **Community Announcements** (Medium effort, medium impact): implement once notification infra is stable.

---

## Recommended Next Steps (Technical)
1. Implement Panic Button UI + backend endpoint + notification flow (2-3 days end-to-end testable).
2. Implement Save-Pass-to-Device: add image & PDF download first, then plan Wallet integration (Apple/Google) as second phase.
3. Add Recent Visitors list to guard dashboard; simple DB query + guard UI; add server-side `/visitors/recent` endpoint.
4. Prototyping: Delivery table & guard delivery UI; resident package dashboard.
5. Start domestic staff schema + API (migrations) and simple CRUD UI; connect to auto-approval rules placeholder.
6. Add i18n to `VisitorInvitePage.jsx` and kiosk; deliver Swahili translations for those two pages.
7. Plan offline mode in parallel with sync design doc and small PoC caching daily visitors.
8. Add announcements admin screen after push & SMS reliability confirmed.

---

## Closing Notes
- Most of the features reuse existing infra: notification service, web sockets, visitor & user models. The largest new areas are the staff/delivery migrations, offline sync, and Wallet pass generation.
- Implementation should favor incremental delivery: small deployable slices that can be tested in production (feature flags recommended).
- For high-security features (panic button, offline validation, Wallet pass), add automated tests and privacy/security review before production release.

If you want, I can now begin implementing any one of the prioritized items. Specify which feature to start with and I will create implementation tasks and begin edits.
