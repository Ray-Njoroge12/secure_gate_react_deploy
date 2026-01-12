output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC id."
}

output "public_subnets" {
  value       = aws_subnet.public[*].id
  description = "Public subnet ids."
}

output "private_subnets" {
  value       = aws_subnet.private[*].id
  description = "Private subnet ids."
}

output "alb_dns_name" {
  value       = aws_lb.app.dns_name
  description = "ALB DNS name."
}

output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.app.domain_name
  description = "CloudFront distribution domain."
}

output "alb_waf_arn" {
  value       = aws_cloudformation_stack.alb_waf.outputs["AlbWebAclArn"]
  description = "ALB WAF WebACL ARN."
}

output "cloudfront_waf_arn" {
  value       = aws_cloudformation_stack.cloudfront_waf.outputs["CloudFrontWebAclArn"]
  description = "CloudFront WAF WebACL ARN."
}

output "cloudfront_response_headers_policy_id" {
  value       = aws_cloudformation_stack.cloudfront_headers.outputs["ResponseHeadersPolicyId"]
  description = "CloudFront response headers policy ID."
}

output "rds_endpoint" {
  value       = aws_db_instance.postgres.address
  description = "RDS Postgres endpoint."
}

output "redis_endpoint" {
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
  description = "Redis endpoint."
}

output "sqs_queue_url" {
  value       = aws_sqs_queue.app.id
  description = "SQS queue URL."
}
