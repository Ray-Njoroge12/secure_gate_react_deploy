# Secure Gate Infrastructure (Terraform)

This folder captures the production-ready AWS baseline for Secure Gate using Terraform.

Repository-level index: [README.md](../README.md)

## Architecture Summary

- **Network:** VPC with two public and two private subnets across two AZs, IGW, NAT, and separate route tables.
- **Compute:** ECS Fargate cluster and service fronted by an ALB.
- **Database:** RDS Postgres in private subnets with app-only security group access; staging is configured for a single-AZ pilot via `db_multi_az = false`.
- **Async/Cache:** SQS queue and ElastiCache Redis in private subnets with least-privilege access.
- **Edge:** CloudFront distribution in front of the ALB with ACM TLS certificate, WAF, and security headers.
- **Secrets/Config:** Secrets Manager for DB credentials and API keys plus SSM Parameter Store for app config.

## CIDR Ranges

| Component | CIDR |
| --- | --- |
| VPC | `10.40.0.0/16` |
| Public subnet (AZ1) | `10.40.0.0/20` |
| Public subnet (AZ2) | `10.40.16.0/20` |
| Private subnet (AZ1) | `10.40.128.0/20` |
| Private subnet (AZ2) | `10.40.144.0/20` |

## Key Inputs

- `acm_certificate_arn`: ACM certificate ARN in **us-east-1** for CloudFront.
- `alb_certificate_arn`: ACM certificate ARN in the regional account for the ALB HTTPS listener.
- `container_image`: Secure Gate container image.
- `cloudfront_aliases`: Optional custom domains for CloudFront.

## Apply Steps

### Staging Environment

```bash
cd infra
terraform init
terraform apply -var-file="staging.tfvars" \
  -var='acm_certificate_arn=arn:aws:acm:us-east-1:123456789012:certificate/abc' \
  -var='alb_certificate_arn=arn:aws:acm:us-west-2:123456789012:certificate/def'
```

### Production Environment

```bash
cd infra
terraform init
terraform apply -var-file="production.tfvars" \
  -var='acm_certificate_arn=arn:aws:acm:us-east-1:123456789012:certificate/abc' \
  -var='alb_certificate_arn=arn:aws:acm:us-west-2:123456789012:certificate/def'
```

### Environment Configuration

- **staging.tfvars**: Configures staging environment as a single-AZ pilot with smaller instance sizes
- **production.tfvars**: Configures production environment with Multi-AZ enabled and production-grade instance sizes
- Multi-AZ for RDS is controlled by the `db_multi_az` variable

## Notes

- Update the `container_image`, secrets payloads, and health check path as needed.
- CloudFront uses the provided ACM certificate to terminate TLS and forwards traffic to the ALB over HTTPS.
- WAF and HTTPS enforcement are provisioned via CloudFormation templates in `secure-gate-access/infrastructure/aws`.

## Scaling Targets & Policies

### Targets to Monitor

| Service | Metric | Purpose | Suggested Alarm/Target |
| --- | --- | --- | --- |
| App (ECS) | CPU utilization | Capacity saturation | Target 60-70% (target tracking) |
| App (ECS) | Memory utilization | Prevent OOM | Target 60-70% (target tracking) |
| App (ALB) | Request latency (p95) | User experience | Alarm if p95 > 1s for 5 min |
| App (ALB) | 5xx error rate | Reliability | Alarm if > 1% for 5 min |
| Workers | SQS queue depth | Backlog growth | Step scale based on depth |
| Workers | Oldest message age | SLA risk | Alarm if > 5 min |
| Workers | CPU/Memory | Saturation | Target 60-70% |

### App Scaling (ECS Service)

The Terraform configuration currently applies CPU target tracking for the ECS service and enforces min/max capacity via `min_capacity` and `max_capacity`. For production, add memory target tracking and app-level alarms.

- **CPU target tracking:** `var.cpu_target` (default 60%).
- **Memory target tracking:** add a second policy to track `ECSServiceAverageMemoryUtilization`.
- **Cooldowns:** keep scale-in/scale-out cooldowns at 60-120s to avoid thrash.
- **Scale-in protection:** consider AWS App Auto Scaling scale-in protection during traffic spikes.

### Worker Scaling (ECS Service or Lambda Consumers)

Workers should scale based on queue backlog and message age:

- **Step scaling on queue depth:** e.g., add 1 worker per 50 messages above baseline.
- **Step scaling on oldest message age:** scale out if oldest message age exceeds 5 minutes.
- **CPU/memory target tracking:** keep workers at 60-70% utilization for steady-state.

### Min/Max Capacity

Define per-service limits to bound cost and preserve availability:

- **App (ECS):** `min_capacity` 2, `max_capacity` 6 (adjust per load profile).
- **Workers:** start with min 1, max 10, then tune with load tests.
- **Cooldowns:** 60-120s scale-out, 120-300s scale-in to avoid oscillation.
- **Scale-in protection:** enable when queue backlog is non-zero or during incident response.

## Synthetic Load Testing

Use synthetic load to validate thresholds and document outcomes:

1. **Generate load:** k6, Gatling, or Artillery against the ALB/CloudFront URL.
2. **Record:** time to scale-out, p95 latency, and cost impact during ramp.
3. **Validate:** autoscaling triggers at expected CPU/memory thresholds and queue depth.
4. **Adjust:** refine targets, step thresholds, and cooldowns based on results.

## Runbooks

### Scaling Anomalies

1. **Check alarms:** CPU, memory, latency, 5xx, queue depth, and age-of-oldest-message.
2. **Verify capacity:** compare desired vs. running task counts in ECS.
3. **Confirm limits:** ensure max capacity is not blocking scale-out.
4. **Review errors:** inspect CloudWatch logs for 5xx spikes or worker failures.
5. **Mitigate:** increase max capacity temporarily or reduce traffic via rate limiting.

### Emergency Overrides

1. **Manual scale:** temporarily set desired count in ECS.
2. **Disable scale-in:** turn on scale-in protection until load stabilizes.
3. **Throttle traffic:** adjust WAF rules or rate limits.
4. **Document changes:** note time, reason, and rollback steps.
