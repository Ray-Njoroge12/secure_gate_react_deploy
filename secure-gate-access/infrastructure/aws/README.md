# AWS Security Baseline Assets

This directory contains security-focused templates and policies for Secure Gate AWS deployments.

## IAM policy audits

The following IAM policies are scoped to explicit AWS actions and resources. Replace placeholder values with exact ARNs to keep least-privilege guarantees:

- `iam/ecs-task-role-policy.json`: ECS task role permissions for Secrets Manager, KMS, SSM, and uploads bucket access.
- `iam/eb-instance-profile-policy.json`: Elastic Beanstalk instance profile permissions for deployment bundle reads, logs, and secrets.

### CI/CD role

`iam/ci-cd-role.yml` provides a GitHub OIDC-based role with minimal deployment permissions for ECS, ECR, S3, and CloudFront invalidations. Update the parameters to point to the exact cluster/service/task roles and repository ARNs used by the environment.

## WAF protections

- `cloudformation/waf-alb.yml` creates a REGIONAL WAF WebACL and associates it to an ALB.
- `cloudformation/waf-cloudfront.yml` creates a CLOUDFRONT WebACL for a CloudFront distribution.

Both templates include AWS managed rule groups plus a baseline rate-limit rule.

## HTTPS enforcement + HSTS

- `cloudformation/alb-https-redirect.yml` enforces HTTP → HTTPS redirects at the ALB listener level.
- `cloudformation/cloudfront-security-headers.yml` defines a CloudFront response headers policy that enables HSTS and baseline security headers. Attach it to CloudFront behaviors and use `ViewerProtocolPolicy: redirect-to-https` in the distribution.

## Security group baseline

`cloudformation/security-groups.yml` creates explicit ingress/egress rules that restrict database and Redis access to the application security group only.

## Notes

- Replace all placeholder values (e.g., `<AWS_ACCOUNT_ID>`, `<UPLOADS_BUCKET_NAME>`) with actual resource ARNs.
- If you expand permissions, update `scripts/security/iam-policy-lint.js` so the CI policy lint reflects approved exceptions.
