#!/bin/bash
# Secure Gate Access - Step-by-Step AWS Deployment
# Region: af-south-1 (Africa - Cape Town)
# Credits Available: $60

set -e

# Configuration
AWS_REGION="af-south-1"
PROJECT_NAME="securegate"
VPC_ID="vpc-06fa75289f6baad8d"  # Default VPC
SUBNET_ID="subnet-0f6c2914166649a6a"  # af-south-1a
DB_SUBNET_1="subnet-0f6c2914166649a6a"  # af-south-1a
DB_SUBNET_2="subnet-006e8c61d8439ee29"  # af-south-1b

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Secure Gate Access - AWS Deployment                      ║${NC}"
echo -e "${BLUE}║     Region: af-south-1 (Cape Town)                           ║${NC}"
echo -e "${BLUE}║     Credits Available: \$60.00                                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Generate secrets if not provided
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD="SecureGate$(openssl rand -hex 8)!"
    echo -e "${YELLOW}Generated DB Password: $DB_PASSWORD${NC}"
fi

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
fi

if [ -z "$JWT_REFRESH_SECRET" ]; then
    JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
fi

echo -e "${GREEN}Step 1: Creating Security Groups...${NC}"

# Check if security group exists
EC2_SG_ID=$(aws ec2 describe-security-groups --region $AWS_REGION \
    --filters "Name=group-name,Values=${PROJECT_NAME}-api-sg" \
    --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null)

if [ "$EC2_SG_ID" == "None" ] || [ -z "$EC2_SG_ID" ]; then
    EC2_SG_ID=$(aws ec2 create-security-group --region $AWS_REGION \
        --group-name "${PROJECT_NAME}-api-sg" \
        --description "Security group for Secure Gate API" \
        --vpc-id $VPC_ID \
        --query 'GroupId' --output text)
    
    # Add inbound rules
    aws ec2 authorize-security-group-ingress --region $AWS_REGION \
        --group-id $EC2_SG_ID \
        --ip-permissions \
        IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges='[{CidrIp=0.0.0.0/0,Description="SSH"}]' \
        IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges='[{CidrIp=0.0.0.0/0,Description="HTTP"}]' \
        IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges='[{CidrIp=0.0.0.0/0,Description="HTTPS"}]' \
        IpProtocol=tcp,FromPort=3001,ToPort=3001,IpRanges='[{CidrIp=0.0.0.0/0,Description="API"}]'
    
    echo -e "${GREEN}✓ Created EC2 Security Group: $EC2_SG_ID${NC}"
else
    echo -e "${YELLOW}Using existing EC2 Security Group: $EC2_SG_ID${NC}"
fi

# RDS Security Group
RDS_SG_ID=$(aws ec2 describe-security-groups --region $AWS_REGION \
    --filters "Name=group-name,Values=${PROJECT_NAME}-rds-sg" \
    --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null)

if [ "$RDS_SG_ID" == "None" ] || [ -z "$RDS_SG_ID" ]; then
    RDS_SG_ID=$(aws ec2 create-security-group --region $AWS_REGION \
        --group-name "${PROJECT_NAME}-rds-sg" \
        --description "Security group for Secure Gate RDS" \
        --vpc-id $VPC_ID \
        --query 'GroupId' --output text)
    
    # Allow PostgreSQL from EC2 security group
    aws ec2 authorize-security-group-ingress --region $AWS_REGION \
        --group-id $RDS_SG_ID \
        --protocol tcp --port 5432 \
        --source-group $EC2_SG_ID
    
    echo -e "${GREEN}✓ Created RDS Security Group: $RDS_SG_ID${NC}"
else
    echo -e "${YELLOW}Using existing RDS Security Group: $RDS_SG_ID${NC}"
fi

echo ""
echo -e "${GREEN}Step 2: Creating RDS PostgreSQL Database...${NC}"

# Check if DB subnet group exists
aws rds describe-db-subnet-groups --region $AWS_REGION \
    --db-subnet-group-name "${PROJECT_NAME}-db-subnet" &>/dev/null || \
aws rds create-db-subnet-group --region $AWS_REGION \
    --db-subnet-group-name "${PROJECT_NAME}-db-subnet" \
    --db-subnet-group-description "Subnet group for Secure Gate DB" \
    --subnet-ids $DB_SUBNET_1 $DB_SUBNET_2

# Check if RDS instance exists
RDS_STATUS=$(aws rds describe-db-instances --region $AWS_REGION \
    --db-instance-identifier "${PROJECT_NAME}-db" \
    --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "not-found")

if [ "$RDS_STATUS" == "not-found" ]; then
    echo "Creating RDS instance (this takes 5-10 minutes)..."
    aws rds create-db-instance --region $AWS_REGION \
        --db-instance-identifier "${PROJECT_NAME}-db" \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version "15.4" \
        --master-username securegate_admin \
        --master-user-password "$DB_PASSWORD" \
        --db-name secure_gate \
        --allocated-storage 20 \
        --storage-type gp2 \
        --vpc-security-group-ids $RDS_SG_ID \
        --db-subnet-group-name "${PROJECT_NAME}-db-subnet" \
        --backup-retention-period 7 \
        --no-multi-az \
        --storage-encrypted \
        --no-publicly-accessible
    
    echo -e "${YELLOW}Waiting for RDS to be available...${NC}"
    aws rds wait db-instance-available --region $AWS_REGION \
        --db-instance-identifier "${PROJECT_NAME}-db"
    
    echo -e "${GREEN}✓ RDS instance created${NC}"
else
    echo -e "${YELLOW}RDS instance already exists (status: $RDS_STATUS)${NC}"
fi

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances --region $AWS_REGION \
    --db-instance-identifier "${PROJECT_NAME}-db" \
    --query 'DBInstances[0].Endpoint.Address' --output text)

echo -e "${GREEN}RDS Endpoint: $RDS_ENDPOINT${NC}"

echo ""
echo -e "${GREEN}Step 3: Launching EC2 Instance...${NC}"

# Get latest Amazon Linux 2023 AMI
AMI_ID=$(aws ec2 describe-images --region $AWS_REGION \
    --owners amazon \
    --filters "Name=name,Values=al2023-ami-2023*-x86_64" "Name=state,Values=available" \
    --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
    --output text)

echo "Using AMI: $AMI_ID"

# Create user data script
USER_DATA=$(cat << 'USERDATA'
#!/bin/bash
exec > >(tee /var/log/user-data.log) 2>&1

# Update system
dnf update -y

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs git nginx postgresql15

# Install PM2
npm install -g pm2

# Create app directory
mkdir -p /home/ec2-user/app
cd /home/ec2-user

# Clone repository
git clone https://github.com/Ray-Njoroge12/secure_gate_react_deploy.git app
cd app/secure-gate-access/server

# Install dependencies
npm install --production

# PM2 will be configured after environment variables are set
chown -R ec2-user:ec2-user /home/ec2-user/app

# Configure Nginx
cat > /etc/nginx/conf.d/securegate.conf << 'NGINX'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINX

# Remove default nginx config
rm -f /etc/nginx/conf.d/default.conf

# Start Nginx
systemctl enable nginx
systemctl start nginx

echo "Setup complete!"
USERDATA
)

# Check if EC2 instance exists
INSTANCE_ID=$(aws ec2 describe-instances --region $AWS_REGION \
    --filters "Name=tag:Name,Values=${PROJECT_NAME}-api" "Name=instance-state-name,Values=running,pending" \
    --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null)

if [ "$INSTANCE_ID" == "None" ] || [ -z "$INSTANCE_ID" ]; then
    INSTANCE_ID=$(aws ec2 run-instances --region $AWS_REGION \
        --image-id $AMI_ID \
        --instance-type t3.micro \
        --key-name securegate-key \
        --security-group-ids $EC2_SG_ID \
        --subnet-id $SUBNET_ID \
        --associate-public-ip-address \
        --user-data "$USER_DATA" \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT_NAME}-api}]" \
        --query 'Instances[0].InstanceId' --output text)
    
    echo "Waiting for EC2 instance to be running..."
    aws ec2 wait instance-running --region $AWS_REGION --instance-ids $INSTANCE_ID
    
    echo -e "${GREEN}✓ EC2 instance launched: $INSTANCE_ID${NC}"
else
    echo -e "${YELLOW}Using existing EC2 instance: $INSTANCE_ID${NC}"
fi

# Get EC2 public IP
EC2_IP=$(aws ec2 describe-instances --region $AWS_REGION \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo -e "${GREEN}EC2 Public IP: $EC2_IP${NC}"

echo ""
echo -e "${GREEN}Step 4: Creating S3 Bucket for Frontend...${NC}"

BUCKET_NAME="${PROJECT_NAME}-frontend-$(aws sts get-caller-identity --query Account --output text)"

# Create bucket if not exists
aws s3api head-bucket --bucket $BUCKET_NAME --region $AWS_REGION 2>/dev/null || \
aws s3api create-bucket --bucket $BUCKET_NAME --region $AWS_REGION \
    --create-bucket-configuration LocationConstraint=$AWS_REGION

# Configure for static website hosting
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

# Set bucket policy for public read
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
        \"Sid\": \"PublicReadGetObject\",
        \"Effect\": \"Allow\",
        \"Principal\": \"*\",
        \"Action\": \"s3:GetObject\",
        \"Resource\": \"arn:aws:s3:::${BUCKET_NAME}/*\"
    }]
}"

# Disable block public access
aws s3api put-public-access-block --bucket $BUCKET_NAME \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

echo -e "${GREEN}✓ S3 bucket created: $BUCKET_NAME${NC}"

echo ""
echo -e "${GREEN}Step 5: Creating CloudFront Distribution...${NC}"

# Check if distribution exists
CF_DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com'].Id" --output text 2>/dev/null)

if [ -z "$CF_DIST_ID" ] || [ "$CF_DIST_ID" == "None" ]; then
    CF_DIST_ID=$(aws cloudfront create-distribution \
        --origin-domain-name "${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com" \
        --default-root-object index.html \
        --query 'Distribution.Id' --output text)
    
    echo -e "${GREEN}✓ CloudFront distribution created: $CF_DIST_ID${NC}"
else
    echo -e "${YELLOW}Using existing CloudFront distribution: $CF_DIST_ID${NC}"
fi

CF_DOMAIN=$(aws cloudfront get-distribution --id $CF_DIST_ID \
    --query 'Distribution.DomainName' --output text)

echo -e "${GREEN}CloudFront Domain: $CF_DOMAIN${NC}"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    DEPLOYMENT SUMMARY                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Infrastructure deployed successfully!${NC}"
echo ""
echo "EC2 Instance:     $EC2_IP"
echo "RDS Endpoint:     $RDS_ENDPOINT"
echo "S3 Bucket:        $BUCKET_NAME"
echo "CloudFront:       $CF_DOMAIN"
echo ""
echo "Database Password: $DB_PASSWORD"
echo ""
echo -e "${YELLOW}IMPORTANT: Save these credentials securely!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Wait 5-10 minutes for EC2 setup to complete"
echo "2. SSH to EC2: ssh -i ~/.ssh/securegate-key.pem ec2-user@$EC2_IP"
echo "3. Configure environment variables on EC2"
echo "4. Build and deploy frontend to S3"
echo ""

# Save configuration
cat > /tmp/securegate-aws-config.env << EOF
# Secure Gate AWS Configuration
# Generated: $(date)

AWS_REGION=$AWS_REGION
EC2_INSTANCE_ID=$INSTANCE_ID
EC2_PUBLIC_IP=$EC2_IP
RDS_ENDPOINT=$RDS_ENDPOINT
RDS_PASSWORD=$DB_PASSWORD
S3_BUCKET=$BUCKET_NAME
CLOUDFRONT_DISTRIBUTION_ID=$CF_DIST_ID
CLOUDFRONT_DOMAIN=$CF_DOMAIN
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
EOF

echo "Configuration saved to: /tmp/securegate-aws-config.env"
