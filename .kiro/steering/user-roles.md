# User Roles & Functionality Guide

## Overview

The Secure Gate Access Control System supports five distinct user roles, each with specific permissions and capabilities designed for their operational needs.

## User Roles

### 1. Super Admin
**System-wide administrative control across all estates**

#### Core Capabilities:
- **Platform Management**: Full control over the entire SecureGate platform
- **Estate Oversight**: View and manage all estates in the system
- **System Health**: Monitor platform-wide health metrics and performance
- **User Management**: Oversee all user accounts across estates
- **Impersonation**: Access any estate's admin dashboard for support

#### Key Features:
- Platform overview dashboard with cross-estate statistics
- Estate management and configuration
- System-wide audit logs and monitoring
- Global user account management
- Platform health and performance metrics

#### Access Patterns:
- Single centralized dashboard (`/dashboard/super-admin`)
- Cross-estate data visibility
- System administration tools

---

### 2. Estate Admin
**Complete estate management and system administration**

#### Core Capabilities:
- **User Management**: Approve, manage, and configure all estate users
- **System Configuration**: Estate settings, integrations, and policies
- **Reporting & Analytics**: Comprehensive visitor and security reports
- **Guard Management**: Schedule guards, assign shifts, monitor performance
- **Incident Management**: Handle security incidents and investigations
- **Data Management**: Export data, manage retention policies

#### Key Features:
- **Dashboard Tabs**:
  - Overview: Metrics, health monitoring, notification queue
  - User Approvals: Pending account approvals and user management
  - User Management: Residents, guards, and admin accounts
  - Visitor Logs: Complete visitor history and analytics
  - Reports: Custom reports and data exports
  - Settings: Estate configuration and integrations

- **Advanced Tools**:
  - Audit logs with filtering and search
  - Notification queue management and retry failed messages
  - Privacy dashboard for GDPR/KDPA compliance
  - Community announcements management
  - Integration hub (SMS, email, webhooks)

#### Access Patterns:
- Tabbed dashboard interface (`/dashboard/admin/:tab`)
- Estate-scoped data access
- Administrative tools and reports

---

### 3. Security Guard
**Visitor processing and security operations**

#### Core Capabilities:
- **Visitor Check-in/Check-out**: Process visitor entries and exits
- **QR Code Scanning**: Quick visitor verification via QR codes
- **Manual Verification**: Search and verify visitors without QR codes
- **Walk-in Registration**: Register unexpected visitors
- **Incident Reporting**: Create and manage security incidents
- **Real-time Monitoring**: Live visitor status and alerts

#### Key Features:
- **Primary Actions**:
  - Scan QR codes for instant check-in/check-out
  - Manual visitor lookup and verification
  - Walk-in visitor registration with approval workflow
  - Visitor status management (approve, deny, revoke)

- **Dashboard Components**:
  - Live visitor feed with real-time updates
  - Pending approvals queue
  - Recent visitors quick lookup
  - Emergency panic button (floating, always accessible)
  - Shift management and handover tools

- **Advanced Features**:
  - Equipment checkout/return tracking
  - Performance metrics and shift reports
  - Training record management
  - Incident workflow management

#### Access Patterns:
- Mobile-first interface optimized for tablets/phones
- Quick action buttons for common tasks
- Real-time SSE updates for live data
- Keyboard shortcuts for efficiency

---

### 4. Resident
**Visitor invitation and management**

#### Core Capabilities:
- **Visitor Invitations**: Create and manage guest invitations
- **Pass Generation**: Generate QR codes and access passes
- **Visitor History**: Track past and upcoming visits
- **Bulk Operations**: Invite multiple visitors simultaneously
- **Favorites Management**: Save frequent visitors for quick invites

#### Key Features:
- **Invitation Types**:
  - Quick Invite: Single visitor, immediate invitation
  - Bulk Invite: Multiple visitors with CSV upload support
  - Recurring Passes: Regular visitors (cleaners, delivery, etc.)
  - Rideshare Entry: Temporary access for ride services

- **Dashboard Widgets** (Customizable):
  - Today's overview with expected/active visitors
  - Upcoming invites with status tracking
  - Recent visitor activity
  - Live visitor feed with real-time updates
  - Visitor insights and analytics

- **Management Tools**:
  - Favorite visitors for quick re-invites
  - Auto-approval rules for trusted visitors
  - Delivery tracking and management
  - Privacy dashboard for data control

#### Access Patterns:
- Widget-based customizable dashboard
- Mobile-optimized quick actions
- Real-time notifications for visitor events
- Keyboard shortcuts for power users

---

### 5. Visitor (Public Access)
**Self-service visitor experience**

#### Core Capabilities:
- **Invitation Response**: Accept/decline visit invitations
- **Self Check-in**: Check-in via QR codes or kiosk
- **Visit Confirmation**: Confirm visit details and timing
- **Digital Passes**: Access QR codes and visit information

#### Key Features:
- **Public Pages** (No authentication required):
  - Invitation acceptance page (`/v/:token`)
  - Self-service check-in kiosk (`/kiosk`)
  - Visit confirmation and details (`/visitor/confirm/:token`)
  - Guest registration for bulk invites (`/invite/:inviteCode`)

- **Self-Service Tools**:
  - QR code display for gate access
  - Visit details and host information
  - Check-in status and timing
  - Emergency contact information

#### Access Patterns:
- Token-based access (no account required)
- Mobile-optimized for smartphone use
- Offline-capable for poor connectivity
- Simple, intuitive interface

---

## Cross-Role Features

### Security & Privacy
- **MFA Setup**: Available to all authenticated users
- **Privacy Dashboard**: GDPR/KDPA compliance tools
- **Session Management**: Secure authentication with refresh tokens
- **Audit Logging**: All actions tracked for security

### Real-time Features
- **WebSocket Integration**: Live updates for guards and residents
- **Push Notifications**: SMS and email alerts
- **Live Visitor Feed**: Real-time visitor status changes
- **Emergency Alerts**: Instant security notifications

### Mobile Support
- **Progressive Web App**: Offline capabilities and mobile optimization
- **Responsive Design**: Works on all device sizes
- **Touch-friendly**: Optimized for tablet and phone use
- **Quick Actions**: Mobile-specific shortcuts and gestures

### Accessibility
- **Keyboard Navigation**: Full keyboard support with shortcuts
- **Screen Reader Support**: ARIA labels and semantic HTML
- **High Contrast**: Dark mode and accessibility themes
- **Focus Management**: Proper focus handling for navigation

## Role-Based Access Control

### Permission Hierarchy
1. **Super Admin**: Full platform access
2. **Estate Admin**: Complete estate control
3. **Guard**: Visitor processing and security operations
4. **Resident**: Visitor invitation and management
5. **Visitor**: Self-service access only

### Data Scoping
- **Estate-based**: All data scoped to specific estates (except Super Admin)
- **Role-based**: Features and data filtered by user role
- **Privacy-first**: Minimal data exposure with masking for sensitive information
- **Audit Trail**: All actions logged with user attribution

This role-based system ensures that each user type has access to exactly the tools and information they need for their responsibilities, while maintaining security and privacy across the platform.