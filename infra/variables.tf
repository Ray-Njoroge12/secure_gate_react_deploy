variable "aws_region" {
  type        = string
  description = "AWS region for primary resources."
  default     = "us-west-2"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC."
  default     = "10.40.0.0/16"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets (must align with two AZs)."
  default     = ["10.40.0.0/20", "10.40.16.0/20"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets (must align with two AZs)."
  default     = ["10.40.128.0/20", "10.40.144.0/20"]
}

variable "container_image" {
  type        = string
  description = "Container image for the Secure Gate app."
  default     = "public.ecr.aws/nginx/nginx:stable"
}

variable "container_port" {
  type        = number
  description = "Container port exposed by the app."
  default     = 3000
}

variable "health_check_path" {
  type        = string
  description = "Health check path for the ALB target group."
  default     = "/health"
}

variable "environment" {
  type        = string
  description = "Deployment environment name."
  default     = "production"
}

variable "task_cpu" {
  type        = string
  description = "CPU units for the ECS task definition."
  default     = "512"
}

variable "task_memory" {
  type        = string
  description = "Memory (MiB) for the ECS task definition."
  default     = "1024"
}

variable "desired_count" {
  type        = number
  description = "Desired number of ECS tasks."
  default     = 2
}

variable "min_capacity" {
  type        = number
  description = "Minimum ECS tasks for autoscaling."
  default     = 2
}

variable "max_capacity" {
  type        = number
  description = "Maximum ECS tasks for autoscaling."
  default     = 6
}

variable "cpu_target" {
  type        = number
  description = "Target CPU utilization for autoscaling."
  default     = 60
}

variable "db_username" {
  type        = string
  description = "Master username for RDS Postgres."
  default     = "securegate"
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class for Postgres."
  default     = "db.t4g.medium"
}

variable "db_allocated_storage" {
  type        = number
  description = "Allocated storage (GiB) for Postgres."
  default     = 50
}

variable "db_engine_version" {
  type        = string
  description = "Postgres engine version."
  default     = "15.4"
}

variable "db_multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for the RDS instance."
  default     = true
}

variable "app_config_json" {
  type        = string
  description = "JSON blob stored in SSM Parameter Store for app configuration."
  default     = "{}"
}

variable "redis_node_type" {
  type        = string
  description = "ElastiCache Redis node type."
  default     = "cache.t4g.small"
}

variable "alb_certificate_arn" {
  type        = string
  description = "ACM certificate ARN in the regional account for the ALB HTTPS listener."
}

variable "acm_certificate_arn" {
  type        = string
  description = "ACM certificate ARN in us-east-1 for CloudFront."
}

variable "cloudfront_aliases" {
  type        = list(string)
  description = "Custom domain names for CloudFront distribution."
  default     = []
}

variable "waf_rate_limit" {
  type        = number
  description = "Rate limit for WAF rules (requests per 5 minutes per IP)."
  default     = 2000
}

variable "waf_alb_web_acl_name" {
  type        = string
  description = "Name for the ALB WAF WebACL."
  default     = "secure-gate-alb-web-acl"
}

variable "waf_cloudfront_web_acl_name" {
  type        = string
  description = "Name for the CloudFront WAF WebACL."
  default     = "secure-gate-cloudfront-web-acl"
}

variable "cloudfront_response_headers_policy_name" {
  type        = string
  description = "Name for the CloudFront response headers policy."
  default     = "secure-gate-response-headers"
}

variable "hsts_max_age_seconds" {
  type        = number
  description = "HSTS max-age seconds for the CloudFront response headers policy."
  default     = 31536000
}
