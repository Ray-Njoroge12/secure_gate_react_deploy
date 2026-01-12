# Production Environment Configuration

environment = "production"

# Enable Multi-AZ for high availability in production
db_multi_az = true

# Production instance sizes
db_instance_class = "db.t4g.medium"
task_cpu          = "512"
task_memory       = "1024"
desired_count     = 2
min_capacity      = 2
max_capacity      = 6

# Note: Set acm_certificate_arn via command line or environment variable
# Example: terraform apply -var-file="production.tfvars" -var="acm_certificate_arn=arn:aws:acm:..."
