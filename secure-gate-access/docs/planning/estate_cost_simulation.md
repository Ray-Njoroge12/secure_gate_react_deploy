# Estate 200-Unit Cost Simulation (AWS + Africa's Talking + Mailgun)

## Scope
This simulation models a **200-unit estate** launch using the current system functionality, with:
- **AWS for frontend + backend production hosting**
- **Africa's Talking for SMS**
- **Mailgun for email** (SendGrid deferred)

> This is a sizing and cost worksheet with explicit formulas so rates can be dropped in once vendor pricing is finalized.

---

## 1) Core Assumptions (from Kenyan estate research)
| Item | Assumption | Notes |
|---|---|---|
| Units | 200 | Target estate size |
| Active residents per unit | 5 | Family + staff |
| Guest entries per unit per month | 40 | Deliveries, rides, social, service |
| Monthly guest entries | 8,000 | 200 × 40 |
| Average daily guest entries | ~267 | 8,000 / 30 |

### Resident and guest identity footprint
- **Active resident identities:** 200 × 5 = **1,000**
- **Monthly guest entries:** **8,000**
- **Peak burst assumption:** 5–10% of monthly guest entries arriving within a peak hour on weekends → **400–800 entries/hour**

---

## 2) Notification Volume Model (SMS + Email)
The system supports SMS invites/OTP delivery and email notifications. Use the following to estimate monthly messaging costs.

### SMS volume (Africa's Talking)
Assumptions to plug in:
- **SMS per guest entry:** 1.0–2.0 (invite + OTP/confirmation)
- **SMS per resident per month:** 1–4 (alerts, confirmations)

**Estimated monthly SMS count (guest-driven only):**
- Low: 8,000 × 1.0 = **8,000 SMS**
- Mid: 8,000 × 1.5 = **12,000 SMS**
- High: 8,000 × 2.0 = **16,000 SMS**

**Monthly SMS cost formula:**
```
SMS_Cost = SMS_Count × AT_SMS_Rate
```

### Email volume (Mailgun)
Assumptions to plug in:
- **Emails per guest entry:** 0.5–1.0 (invite, reminders)
- **Emails per resident per month:** 1–3 (account, password, notifications)

**Estimated monthly email count (guest-driven only):**
- Low: 8,000 × 0.5 = **4,000 emails**
- High: 8,000 × 1.0 = **8,000 emails**

**Monthly email cost formula:**
```
Email_Cost = Email_Count × Mailgun_Rate
```

---

## 3) AWS Infrastructure Sizing (Baseline for 200 Units)
This is a minimal production footprint for the observed traffic, intended to be verified with load tests.

### Suggested baseline (starter)
| Component | Suggested AWS Service | Baseline Size | Rationale |
|---|---|---|---|
| Frontend | S3 + CloudFront | 1 bucket + CDN | Static React build |
| Backend API | ECS/Fargate or EC2 + ALB | 1–2 tasks / instances | Handles ~400–800 peak entries/hour |
| Database | RDS Postgres | db.t4g.small (or equivalent) | Visitor logs, passes, audits |
| Cache/rate limit | ElastiCache Redis (optional) | cache.t4g.micro | Rate limiting + session caching |
| Object storage | S3 | minimal | QR/attachments if enabled |
| Logs/metrics | CloudWatch | baseline | API logs + metrics |

### AWS cost formula worksheet
```
Compute_Cost = (Instance_Hours × Instance_Rate) + (ALB_LCU × LCU_Rate)
DB_Cost = (DB_Hours × DB_Rate) + Storage_GB × Storage_Rate
CDN_Cost = Data_Transfer_GB × CloudFront_Rate
Log_Cost = Log_GB × CloudWatch_Rate
Total_AWS = Compute_Cost + DB_Cost + CDN_Cost + Log_Cost + Storage_Cost
```

---

## 4) Concurrency & Throughput Simulation
Using the peak assumption (400–800 guest entries/hour):
- **Peak per minute:** ~7–13 guests/minute
- **Peak per second:** ~0.12–0.22 guests/second

This traffic profile is modest for a Node/Express backend and can be handled by a small AWS footprint if the DB is sized appropriately. For high-density estates or multi-estate rollouts, scale the backend horizontally and move rate limiting to Redis.

---

## 5) Guest/Staff Considerations at Launch
- **Recurring staff access:** modeled via recurring passes and schedule-based entries.
- **Walk-ins:** supported and should be expected for deliveries/riders at peak times.
- **Approval traffic:** approvals and OTP-based flows are the biggest SMS cost drivers.

---

## 6) Next Inputs Needed to Finalize Pricing
To turn this simulation into actual monthly estimates, plug in:
1. **Africa's Talking SMS rate** (KES/SMS)
2. **Mailgun email rate** (USD/1,000 emails)
3. **AWS region + service rates** (use AWS Pricing Calculator)

---

## 7) Summary Snapshot (200-Unit Estate)
| Metric | Estimate |
|---|---|
| Active residents | ~1,000 |
| Monthly guest entries | ~8,000 |
| Monthly SMS volume | 8,000–16,000 |
| Monthly email volume | 4,000–8,000 |
| Peak guest throughput | 400–800 per hour |

---

## 8) Implementation Notes
- SMS integrations are **Africa's Talking only**.
- Email is still **Mailgun/SMTP** for now (SendGrid deferred).
- AWS deployment checklist should be aligned with this sizing once final rates are confirmed.
