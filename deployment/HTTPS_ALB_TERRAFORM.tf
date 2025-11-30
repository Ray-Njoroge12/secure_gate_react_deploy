terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "af-south-1"
}

variable "domain_name" {
  description = "Domain name for API endpoint"
  type        = string
  default     = "api.securegate.com"
}

variable "existing_alb_arn" {
  description = "ARN of existing Application Load Balancer"
  type        = string
}

variable "existing_target_group_arn" {
  description = "ARN of existing Target Group"
  type        = string
}

variable "create_certificate" {
  description = "Create new ACM certificate or use existing"
  type        = bool
  default     = true
}

variable "certificate_arn" {
  description = "ARN of existing ACM certificate (if create_certificate = false)"
  type        = string
  default     = ""
}

# Request SSL Certificate
resource "aws_acm_certificate" "main" {
  count             = var.create_certificate ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  tags = {
    Name    = "secure-gate-ssl-cert"
    Project = "SecureGate"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# HTTPS Listener (Port 443)
resource "aws_lb_listener" "https" {
  load_balancer_arn = var.existing_alb_arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.create_certificate ? aws_acm_certificate.main[0].arn : var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = var.existing_target_group_arn
  }
}

# HTTP Listener (Port 80) - Redirect to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = var.existing_alb_arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Outputs
output "https_endpoint" {
  description = "HTTPS endpoint URL"
  value       = "https://${var.domain_name}"
}

output "certificate_arn" {
  description = "SSL Certificate ARN"
  value       = var.create_certificate ? aws_acm_certificate.main[0].arn : var.certificate_arn
}

output "https_listener_arn" {
  description = "HTTPS Listener ARN"
  value       = aws_lb_listener.https.arn
}

output "certificate_validation_records" {
  description = "DNS records for certificate validation"
  value = var.create_certificate ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      value  = dvo.resource_record_value
    }
  } : {}
}
