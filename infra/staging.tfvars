# Staging Environment Configuration

environment = "staging"

# Single-AZ pilot for staging to reduce cost
db_multi_az = false

# Staging-specific instance sizes (can be smaller than production)
db_instance_class = "db.t4g.small"
task_cpu          = "256"
task_memory       = "512"
desired_count     = 1
min_capacity      = 1
max_capacity      = 3

# Note: Set acm_certificate_arn via command line or environment variable
# Example: terraform apply -var-file="staging.tfvars" -var="acm_certificate_arn=arn:aws:acm:..."
# Also set alb_certificate_arn for the regional ALB certificate.
