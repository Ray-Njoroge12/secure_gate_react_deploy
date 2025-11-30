# Routes Registration Guide

## Backend Routes (server/src/app.js)

Add these imports at the top:

```javascript
import visitorPublicRoutes from './routes/visitorPublicRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminAnalyticsRoutes from './routes/adminAnalyticsRoutes.js';
import incidentWorkflowRoutes from './routes/incidentWorkflowRoutes.js';
import integrationsRoutes from './routes/integrationsRoutes.js';
```

Register routes (add BEFORE authentication middleware):

```javascript
// Public routes (no auth required)
app.use('/api/public', visitorPublicRoutes);
```

Register protected routes (add AFTER authentication middleware):

```javascript
// Protected routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/incidents', incidentWorkflowRoutes);
app.use('/api/admin', integrationsRoutes);
```

---

## Frontend Routes (client/src/App.js)

Add these imports:

```javascript
import VisitorInvitePage from './pages/public/VisitorInvitePage';
import SelfCheckInKiosk from './pages/public/SelfCheckInKiosk';
import AdminOperationsDashboard from './pages/admin/AdminOperationsDashboard';
import RoleManagement from './pages/admin/RoleManagement';
import PolicyManagement from './pages/admin/PolicyManagement';
import WatchlistManagement from './pages/admin/WatchlistManagement';
import IncidentWorkflowDashboard from './pages/admin/IncidentWorkflowDashboard';
import SiteManagement from './pages/admin/SiteManagement';
import IntegrationsHub from './pages/admin/IntegrationsHub';
```

Add routes inside `<Routes>`:

```javascript
{/* Public routes */}
<Route path="/v/:token" element={<VisitorInvitePage />} />
<Route path="/kiosk" element={<SelfCheckInKiosk />} />

{/* Admin routes (protected) */}
<Route path="/admin/dashboard" element={
  <ProtectedRoute allowedRoles={["admin"]}>
    <AdminOperationsDashboard />
  </ProtectedRoute>
} />

<Route path="/admin/roles" element={
  <ProtectedRoute allowedRoles={["admin"]}>
    <RoleManagement />
  </ProtectedRoute>
} />

<Route path="/admin/policies" element={
  <ProtectedRoute allowedRoles={["admin"]}>
    <PolicyManagement />
  </ProtectedRoute>
} />

<Route path="/admin/watchlist" element={
  <ProtectedRoute allowedRoles={["admin"]}>
    <WatchlistManagement />
  </ProtectedRoute>
} />

<Route path="/admin/incidents" element={
  <ProtectedRoute allowedRoles={["admin"]}>
    <IncidentWorkflowDashboard />
  </ProtectedRoute>
} />

<Route path="/admin/sites" element={
  <ProtectedRoute allowedRoles={["admin"]}>
    <SiteManagement />
  </ProtectedRoute>
} />

<Route path="/admin/integrations" element={
  <ProtectedRoute allowedRoles={["admin"]}>
    <IntegrationsHub />
  </ProtectedRoute>
} />
```

---

## Navigation Menu

Add to admin navigation:

```javascript
<nav>
  <Link to="/admin/dashboard">📊 Dashboard</Link>
  <Link to="/admin/roles">🔐 Roles</Link>
  <Link to="/admin/policies">📋 Policies</Link>
  <Link to="/admin/watchlist">🛡️ Watchlist</Link>
  <Link to="/admin/incidents">🚨 Incidents</Link>
  <Link to="/admin/sites">🏢 Sites</Link>
  <Link to="/admin/integrations">⚡ Integrations</Link>
</nav>
```

---

## Testing URLs

After deployment, test these endpoints:

**Public**:
- `/v/test_token_123` - Visitor invite page
- `/kiosk` - Self-service kiosk

**Admin** (requires login):
- `/admin/dashboard` - Analytics
- `/admin/roles` - RBAC
- `/admin/policies` - Policies
- `/admin/watchlist` - Watchlist
- `/admin/incidents` - Incidents
- `/admin/sites` - Sites
- `/admin/integrations` - Integrations
