# Driver.js Tours — Design Document

**Date:** 2026-02-19
**Status:** Approved
**Author:** Collaborative design session

---

## Problem & Intent

Secure Gate needs guided product tours in two contexts:

1. **In-app onboarding** — Help new residents, guards, and admins learn the system after first login. The existing `OnboardingTour.jsx` component is a custom-built overlay that works but lacks the polish, positioning reliability, and maintainability of a purpose-built tour library.

2. **Marketing demos** — The Secure Labs website needs interactive role-based demos so prospects can experience the product without logging in.

Driver.js (v1.4.0, ~5kb gzipped, zero dependencies) is the chosen library for both contexts.

---

## Architecture: Two Phases, One Narrative

The tour *scripts* — step titles, descriptions, flow narrative — are authored once and reused across both phases. Same story, two canvases.

```
Phase 1: In-App Tours          Phase 2: Marketing Demo Pages
─────────────────────────      ──────────────────────────────
React app (live UI)            Static HTML (Secure Labs site)
driver.js via npm              driver.js via CDN
data-tour attributes           Replicated UI screens
Real components + data         Hardcoded mock data
Triggered on first login       Auto-starts on page load
```

---

## Base Branch

All in-app work is based on **`origin/staging`** (after merge conflict resolution). This is the intended next-state of the codebase where `GeneratePass.jsx` has been deliberately removed and `QuickInvite` is the primary resident invite mechanism.

---

## Phase 1 — In-App Tours

### Installation

```bash
cd secure-gate-access/client
npm install driver.js
```

### File Structure

```
client/src/
├── tours/
│   ├── index.js                  # Tour registry + shared config
│   ├── residentTour.js           # 8 steps
│   ├── guardTour.js              # 7 steps
│   ├── adminTour.js              # 7 steps
│   └── visitorTour.js            # 4 steps (public invite page)
├── services/
│   └── tourService.js            # driver.js singleton + startTour(role)
├── components/
│   └── common/
│       └── TourLauncher.jsx      # Replaces OnboardingTour.jsx internals
└── styles/
    └── driver-theme.css          # Dark theme override for popovers
```

### Integration Strategy

- `OnboardingTour.jsx` is **replaced** — same file, internals swapped to driver.js
- Existing `localStorage` keys (`securegate-tour-completed-{role}`) are **reused** — no migration needed
- Existing `data-tour="..."` attributes on components are **reused** as element selectors
- Missing `data-tour` attributes are added during implementation where steps require them
- `useOnboardingTour()` hook is updated to call `tourService.startTour(role)`

### Trigger Points

| Trigger | Behaviour |
|---|---|
| First login (no localStorage flag) | Auto-offer "Take a Tour" banner |
| Settings page → "Restart Tour" button | Re-launches tour (already exists in Settings pages) |
| `?tour=true` URL param | Force-starts tour (useful for marketing deep-links) |

### Tour Step Scripts

**Resident Tour (8 steps)**

| # | Target (`data-tour`) | Title | Description |
|---|---|---|---|
| 1 | `dashboard-stats` | Welcome to Your Dashboard | Overview of live stats: visitors today, pending approvals, upcoming visits |
| 2 | `quick-invite` | Invite a Visitor | The fastest way to generate a visitor pass — name, phone, date, done |
| 3 | `bulk-invite` | Invite Multiple Guests | Planning an event? Invite your whole guest list at once |
| 4 | `favorite-visitors` | Your Favourite Visitors | Save frequent visitors for one-tap re-invite |
| 5 | `visitor-history` | Full Visitor History | Every invitation, entry, and exit — fully audited |
| 6 | `approvals-panel` | Walk-In Approvals | A guard at the gate needs your approval? You'll see it here instantly |
| 7 | `auto-approval` | Auto-Approval Rules | Set trusted visitors who enter without manual approval every time |
| 8 | `settings` | Notifications & Preferences | Control how and when you're alerted |

**Guard Tour (7 steps)**

| # | Target (`data-tour`) | Title | Description |
|---|---|---|---|
| 1 | `guard-dashboard-kpis` | Guard Station Overview | Live KPIs: visitors on-premise, pending approvals, shift status |
| 2 | `scan-qr` | Scan a Visitor QR Code | Point and scan — the system verifies the visitor instantly |
| 3 | `manual-check` | Manual Visitor Lookup | No QR? Search by name, phone, or ID |
| 4 | `walk-in-registration` | Register a Walk-In | Unexpected visitor? Register them and request resident approval |
| 5 | `pending-approvals` | Pending Approvals Queue | Track which walk-ins are awaiting resident approval in real time |
| 6 | `incident-report` | Report an Incident | Log security incidents directly from the guard station |
| 7 | `shift-handover` | Shift Handover | Brief your relief guard with a structured handover report |

**Admin Tour (7 steps)**

| # | Target (`data-tour`) | Title | Description |
|---|---|---|---|
| 1 | `admin-dashboard` | Estate Control Centre | Full estate overview: active visitors, guard coverage, alerts |
| 2 | `manage-guards` | Manage Guard Accounts | Create, edit, and deactivate guard accounts |
| 3 | `manage-residents` | Manage Residents | Approve new residents, manage existing accounts |
| 4 | `visitor-log` | Complete Visitor Log | Full audit trail of every visitor across the estate |
| 5 | `incident-management` | Incident Management | Review, escalate, and resolve security incidents |
| 6 | `reports` | Generate Reports | Visitor traffic, incident summaries, guard activity — exportable |
| 7 | `system-settings` | System Settings & Integrations | Configure estate policies, SMS/email gateways, and third-party integrations |

**Visitor Tour (4 steps — public `/v/:token` page)**

| # | Target (`data-tour`) | Title | Description |
|---|---|---|---|
| 1 | `visitor-invite-header` | You've Been Invited | Your host has registered your visit — here's everything you need |
| 2 | `visitor-otp` | Verify Your Identity | Enter the OTP sent to your phone to confirm your visit |
| 3 | `visitor-qr` | Your Entry QR Code | Show this to the guard at the gate — it's your digital pass |
| 4 | `visitor-confirm` | You're All Set | Your visit is confirmed. The guard has been notified |

### Driver.js Theme

Custom CSS overrides to match the app's dark UI:

```css
/* client/src/styles/driver-theme.css */
.driver-popover {
  background: #1a1a2e;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: #f8fafc;
}
.driver-popover-title { color: #ffffff; font-weight: 600; }
.driver-popover-description { color: #94a3b8; }
.driver-popover-progress-text { color: #64748b; }
.driver-popover-next-btn { background: #3b82f6; }
.driver-popover-prev-btn { background: transparent; border: 1px solid #334155; color: #94a3b8; }
```

---

## Phase 2 — Marketing Demo Pages

### Location

All files added to: `/Users/raynj/Desktop/Secure labs website/`

### Files

```
Secure labs website/
├── demo.html                  # Role selector landing page
├── demo-resident.html         # Resident demo (8-step tour)
├── demo-guard.html            # Guard demo (7-step tour)
├── demo-admin.html            # Admin demo (7-step tour)
└── demo-visitor.html          # Visitor experience demo (4-step tour)
```

### Visual Design

All demo pages use the **Forest Noir** design system tokens from the existing site:

| Token | Value | Usage |
|---|---|---|
| Background | `#05140A` | Page backgrounds |
| Primary Accent | `#F4A261` | Gold — CTAs, highlights, tour popover accents |
| Secondary | `#1A472A` | Sidebar, panels |
| Text | `#FAF8F3` | Primary text |
| Glass panels | `backdrop-filter: blur(24px)` + 1px gold border | UI card surfaces |

The app UI replica inside each demo page uses a **dark sidebar + main content** layout that faithfully mirrors the real app structure. Typography: Inter for UI, Instrument Serif for headings.

### Mock Data Pattern

Each demo page has a `const MOCK_DATA = {...}` block at the top. All UI elements are populated via vanilla JS `innerHTML` injection on `DOMContentLoaded`. Easy to update without touching layout.

Example:
```javascript
const MOCK_DATA = {
  residentName: "Sarah Kimani",
  unitNumber: "4B",
  visitorsToday: 3,
  pendingApprovals: 1,
  visitors: [
    { name: "James Mwangi", time: "10:30 AM", status: "on-premise" },
    { name: "Alice Odhiambo", time: "2:00 PM", status: "pending" }
  ]
};
```

### Driver.js Delivery

Loaded via jsDelivr CDN (no build process):
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.4.0/dist/driver.css"/>
<script src="https://cdn.jsdelivr.net/npm/driver.js@1.4.0/dist/driver.js.iife.js"></script>
```

Tour auto-starts 500ms after page load. A floating `← Back to Demos` link is always visible. Tour uses the Forest Noir gold (`#F4A261`) as the popover accent colour.

### demo.html — Role Selector

Four role cards with descriptions and "Start Demo" CTAs:

- 🏠 **Resident** — *"See how residents invite visitors, track arrivals, and approve walk-ins"*
- 🛡️ **Guard** — *"See how guards manage entry, scan QR codes, and handle incidents"*
- ⚙️ **Admin** — *"See how estate admins oversee operations, users, and reports"*
- 🚶 **Visitor** — *"See the visitor experience from invitation to gate entry"*

Each card links to its corresponding `demo-{role}.html` page.

### Marketing Site Integration

On `index.html`, a new **"See it in action"** section (above or below the existing pricing/contact CTAs) links to `demo.html`. Button text: *"Explore Interactive Demos →"*.

---

## Sequencing

1. Resolve `staging` merge conflicts (prerequisite — not part of this feature)
2. **Phase 1** — In-app tours (driver.js upgrade)
3. **Phase 2** — Marketing demo pages (built reusing Phase 1 tour scripts)

---

## Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| driver.js version | v1.4.0 | Latest stable |
| In-app import | npm package | Bundled, tree-shakeable |
| Marketing site import | jsDelivr CDN | No build process on static site |
| Existing `OnboardingTour.jsx` | Replace internals, keep file | Preserves hook API, no breaking changes |
| `data-tour` attributes | Reuse existing + add missing | Minimal markup disruption |
| `localStorage` keys | Reuse `securegate-tour-completed-{role}` | Zero migration needed |
| Tour popover theme | Custom CSS dark theme | Consistent with app UI |
| Marketing demo data | `const MOCK_DATA` per page | No API calls, simple to update |
| Demo page styling | Forest Noir tokens + app UI replica | Cohesive brand experience |
| Demo tour auto-start | 500ms delay on load | Feels intentional, not jarring |
