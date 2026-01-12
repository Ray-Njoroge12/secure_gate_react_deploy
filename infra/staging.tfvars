# Staging Environment Configuration

environment = "staging"

# Enable Multi-AZ for high availability in staging
db_multi_az = true

# Staging-specific instance sizes (can be smaller than production)
db_instance_class = "db.t4g.small"
task_cpu          = "256"
task_memory       = "512"
desired_count     = 1
min_capacity      = 1
max_capacity      = 3

# Note: Set acm_certificate_arn via command line or environment variable
# Example: terraform apply -var-file="staging.tfvars" -var="acm_certificate_arn=arn:aws:acm:..."
