# Security Baseline Findings

This document records the baseline security posture tasks added in this change set.

## Completed

- Scoped ECS task role and Elastic Beanstalk instance profile policies to explicit AWS actions/resources.
- Added a least-privilege CI/CD IAM role template for deployments.
- Added WAFv2 templates for CloudFront and ALB with managed rule sets and rate limiting.
- Added HTTPS enforcement templates (ALB redirect, CloudFront HSTS headers policy).
- Added security group baseline templates restricting DB/Redis ingress to the application security group only.
- Added CI checks for IAM policy linting and conditional tfsec scans.

## Follow-up verification

- Replace all placeholder ARNs in the IAM policies/templates with environment-specific values.
- Confirm WAF rule exclusions for any false positives (e.g., file uploads, admin paths).
- Attach the CloudFront response headers policy to each cache behavior and enable `redirect-to-https` viewer protocol policy.
- Confirm SG rules align with runtime ports (AppPort/DB/Redis) and remove any unused egress.
