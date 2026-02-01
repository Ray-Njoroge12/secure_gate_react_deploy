# Runbook: Guard Device Offline

## Overview
Use this runbook when a guard device loses connectivity or cannot sync events, impacting check‑ins or incident reporting.

## Detection Signals
- Guard reports unable to access dashboard or check-in flow.
- Monitoring shows device last‑seen timestamps stale.
- Incidents queued locally without sync.

## Immediate Actions (0–15 min)
1. **Confirm device status**
   - Verify connectivity (Wi‑Fi/Cellular) and power.
   - Ask guard to restart the app and confirm login.
2. **Fallback operations**
   - Use paper log for check‑ins.
   - Escalate urgent incidents via phone to admin/security.
3. **Validate account**
   - Ensure guard role and estate access are still active.

## Mitigation Steps (15–60 min)
1. **Network troubleshooting**
   - Try a hotspot or alternate network.
   - Check if the device can access `/api/health/ready`.
2. **Local cache recovery**
   - If offline queue exists, re-open app to sync.
3. **Provision backup device**
   - Issue a spare device or allow web access via laptop.

## Recovery & Verification
- Confirm guard can access dashboard and fetch active visitors.
- Ensure queued events (check-ins, incident notes) sync successfully.
- Monitor audit logs for late-arriving events.

## Escalation & Communications
- Notify site supervisor if offline time exceeds 15 minutes.
- Share manual check-in guidance with affected estate admins.
- Log incident in ops channel with device ID and location.

## Post-Incident Follow‑ups
- Record outage duration in incident log.
- Update device inventory and network coverage notes.
- Schedule preventive device health checks.
