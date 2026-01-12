# Secure Gate Infrastructure (Terraform)

This folder captures the production-ready AWS baseline for Secure Gate using Terraform.

## Architecture Summary

- **Network:** VPC with two public and two private subnets across two AZs, IGW, NAT, and separate route tables.
- **Compute:** ECS Fargate cluster and service fronted by an ALB.
- **Database:** Single-AZ RDS Postgres in private subnets with app-only security group access.
- **Async/Cache:** SQS queue and ElastiCache Redis in private subnets with least-privilege access.
- **Edge:** CloudFront distribution in front of the ALB with ACM TLS certificate.
- **Secrets:** Secrets Manager for DB credentials and API keys accessed by the ECS task role.

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
- `container_image`: Secure Gate container image.
- `cloudfront_aliases`: Optional custom domains for CloudFront.

## Apply Steps

```bash
cd infra
terraform init
terraform apply -var='acm_certificate_arn=arn:aws:acm:us-east-1:123456789012:certificate/abc'
```

## Notes

- Update the `container_image`, secrets payloads, and health check path as needed.
- CloudFront uses the provided ACM certificate to terminate TLS and forwards traffic to the ALB over HTTP.
