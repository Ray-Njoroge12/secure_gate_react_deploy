# AWS Security Baseline Assets

This directory contains security-focused templates and policies for Secure Gate AWS deployments.

Repository-level index: [README.md](../../../README.md)

## IAM policy audits

The following IAM policies are scoped to explicit AWS actions and resources. Replace placeholder values with exact ARNs to keep least-privilege guarantees:

- `iam/ecs-task-role-policy.json`: ECS task role permissions for Secrets Manager, KMS, SSM, and uploads bucket access.

### CI/CD role

`iam/ci-cd-role.yml` provides a GitHub OIDC-based role with minimal deployment permissions for ECS, ECR, S3, and CloudFront invalidations. Update the parameters to point to the exact cluster/service/task roles and repository ARNs used by the environment.

## WAF protections

- `cloudformation/waf-alb.yml` creates a REGIONAL WAF WebACL and associates it to an ALB.
- `cloudformation/waf-cloudfront.yml` creates a CLOUDFRONT WebACL for a CloudFront distribution.

Both templates include AWS managed rule groups plus a baseline rate-limit rule.

### WAF tuning workflow

Use the following operational checklist to move the WAF from baseline protection to tuned enforcement:

1. Enable WAF logging to a centralized sink (CloudWatch Logs, S3, or Kinesis Data Firehose).
2. Collect baseline traffic for 2–4 weeks; tag or query by endpoint, tenant, and status code.
3. Analyze false positives to identify legitimate requests that were blocked; map them back to the rule IDs.
4. Tune managed rule overrides in count mode and define custom allowlists or rule exceptions where needed.
5. Add custom rules for abuse patterns (rate-based rules, geo matches, bot/UA filters).
6. Roll out changes from count mode → block mode; monitor false positives and request error rates.

## HTTPS enforcement + HSTS

- `cloudformation/alb-https-redirect.yml` enforces HTTP → HTTPS redirects at the ALB listener level.
- `cloudformation/cloudfront-security-headers.yml` defines a CloudFront response headers policy that enables HSTS and baseline security headers. Attach it to CloudFront behaviors and use `ViewerProtocolPolicy: redirect-to-https` in the distribution.

## Scope boundary

- This directory keeps supplemental security templates (WAF and headers) and IAM policy baselines.
- Core network and security group resources are defined in Terraform under `infra/` and should not be duplicated here.

## Notes

- Replace all placeholder values (e.g., `<AWS_ACCOUNT_ID>`, `<UPLOADS_BUCKET_NAME>`) with actual resource ARNs.
- If you expand permissions, run your IAM policy lint/check process and review exceptions before promoting changes.
