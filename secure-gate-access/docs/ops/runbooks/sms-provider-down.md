# Runbook: SMS Provider Down

## Overview
Use this runbook when SMS delivery is failing or the provider is unavailable, impacting OTPs, visitor invites, or alerts.

## Detection Signals
- Notification queue failures spike with provider `sms` or delivery status `failed`.
- Admin dashboard → **Notification Queue Failures** shows multiple SMS retries.
- `/api/health/detailed` shows degraded status for SMS/email integrations.
- Support tickets report OTPs not received within expected SLA.

## Immediate Actions (0–15 min)
1. **Confirm scope**
   - Check recent failures in Admin → Notification Queue Failures.
   - Validate current provider status page (if available).
2. **Switch to fallback channel**
   - Enable email OTPs as primary for affected estates, if permitted.
   - Communicate short-term guidance to guards/admins: manual verification.
3. **Throttle outbound retries**
   - Reduce retry volume to avoid provider rate limits.
   - Leave DLQ entries in place to avoid duplication.

## Mitigation Steps (15–60 min)
1. **Inspect webhook delivery failures**
   - Confirm signature validation errors vs. provider outages.
2. **Validate credentials and API keys**
   - Rotate or re-apply SMS API keys if the provider reports auth issues.
3. **Enable alternate provider (if configured)**
   - Update provider config and run a test delivery.

## Recovery & Verification
- Re-enable standard retry schedule.
- Use Admin → Notification Queue Failures to retry DLQ jobs.
- Confirm new OTP deliveries succeed for at least three test numbers.

## Escalation & Communications
- Notify customer success with expected impact and ETA.
- Post status update in incident channel and set next update time.
- Escalate to vendor support if outage exceeds SLA threshold.

## Post-Incident Follow‑ups
- Export DLQ jobs that were not retried automatically.
- Add incident notes to audit logs and notify customer success.
- File a provider incident report if SLA was breached.
