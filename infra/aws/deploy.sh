#!/bin/bash
# Secure Gate Access - AWS Deployment Script
# Region: af-south-1 (Africa - Cape Town)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-af-south-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
STACK_NAME="${STACK_NAME:-securegate-${ENVIRONMENT}}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Secure Gate Access - AWS Deployment Script               ║${NC}"
echo -e "${BLUE}║     Region: ${AWS_REGION}                                         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}Error: AWS CLI is not installed${NC}"
        echo "Install: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}Error: AWS credentials not configured${NC}"
        echo "Run: aws configure"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: npm is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All prerequisites met${NC}"
    echo ""
}

# Display AWS account info
show_account_info() {
    echo -e "${YELLOW}AWS Account Information:${NC}"
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    echo "  Account ID: $ACCOUNT_ID"
    echo "  User/Role: $USER_ARN"
    echo "  Region: $AWS_REGION"
    echo ""
}

# Create or update CloudFormation stack
deploy_infrastructure() {
    echo -e "${YELLOW}Deploying infrastructure via CloudFormation...${NC}"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" &> /dev/null; then
        echo "Stack exists, updating..."
        ACTION="update-stack"
    else
        echo "Creating new stack..."
        ACTION="create-stack"
    fi
    
    # Prompt for required parameters if not set
    if [ -z "$DB_PASSWORD" ]; then
        echo -e "${YELLOW}Enter database password (min 12 characters):${NC}"
        read -s DB_PASSWORD
        echo ""
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        echo -e "${YELLOW}Generating JWT secrets...${NC}"
        JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        echo -e "${GREEN}✓ JWT secrets generated${NC}"
    fi
    
    if [ -z "$KEY_PAIR_NAME" ]; then
        echo -e "${YELLOW}Available EC2 Key Pairs:${NC}"
        aws ec2 describe-key-pairs --region "$AWS_REGION" --query 'KeyPairs[*].KeyName' --output table
        echo ""
        echo -e "${YELLOW}Enter key pair name:${NC}"
        read KEY_PAIR_NAME
    fi
    
    # Deploy stack
    aws cloudformation $ACTION \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --template-body file://${PROJECT_ROOT}/infra/aws/cloudformation-template.yaml \
        --parameters \
            ParameterKey=EnvironmentName,ParameterValue="$ENVIRONMENT" \
            ParameterKey=DBPassword,ParameterValue="$DB_PASSWORD" \
            ParameterKey=JWTSecret,ParameterValue="$JWT_SECRET" \
            ParameterKey=JWTRefreshSecret,ParameterValue="$JWT_REFRESH_SECRET" \
            ParameterKey=KeyPairName,ParameterValue="$KEY_PAIR_NAME" \
        --capabilities CAPABILITY_NAMED_IAM \
        --tags Key=Project,Value=SecureGate Key=Environment,Value="$ENVIRONMENT"
    
    echo -e "${YELLOW}Waiting for stack to complete (this may take 10-15 minutes)...${NC}"
    aws cloudformation wait stack-$( [ "$ACTION" = "create-stack" ] && echo "create" || echo "update" )-complete \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION"
    
    echo -e "${GREEN}✓ Infrastructure deployed successfully${NC}"
    echo ""
}

# Get stack outputs
get_stack_outputs() {
    echo -e "${YELLOW}Getting stack outputs...${NC}"
    
    EC2_IP=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='EC2PublicIP'].OutputValue" --output text)
    
    RDS_ENDPOINT=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='RDSEndpoint'].OutputValue" --output text)
    
    S3_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text)
    
    CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" --output text)
    
    CLOUDFRONT_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)
    
    echo -e "${GREEN}Stack Outputs:${NC}"
    echo "  EC2 Public IP: $EC2_IP"
    echo "  RDS Endpoint: $RDS_ENDPOINT"
    echo "  S3 Bucket: $S3_BUCKET"
    echo "  CloudFront Domain: $CLOUDFRONT_DOMAIN"
    echo "  CloudFront ID: $CLOUDFRONT_ID"
    echo ""
}

# Build and deploy frontend
deploy_frontend() {
    echo -e "${YELLOW}Building frontend...${NC}"
    
    cd "${PROJECT_ROOT}/secure-gate-access/client"
    
    # Set environment variables for build
    export REACT_APP_API_URL="https://${CLOUDFRONT_DOMAIN}/api"
    export REACT_APP_WS_URL="wss://${CLOUDFRONT_DOMAIN}"
    
    # Install dependencies
    npm ci
    
    # Build production
    npm run build:production
    
    echo -e "${GREEN}✓ Frontend built successfully${NC}"
    echo ""
    
    # Upload to S3
    echo -e "${YELLOW}Uploading to S3...${NC}"
    aws s3 sync build/ "s3://${S3_BUCKET}" --delete --region "$AWS_REGION"
    
    echo -e "${GREEN}✓ Frontend uploaded to S3${NC}"
    echo ""
    
    # Invalidate CloudFront cache
    echo -e "${YELLOW}Invalidating CloudFront cache...${NC}"
    aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_ID" \
        --paths "/*" \
        --region us-east-1  # CloudFront API is always in us-east-1
    
    echo -e "${GREEN}✓ CloudFront cache invalidated${NC}"
    echo ""
}

# Run database migrations
run_migrations() {
    echo -e "${YELLOW}Running database migrations...${NC}"
    
    # SSH to EC2 and run migrations
    ssh -i "${KEY_PAIR_FILE:-~/.ssh/securegate-key.pem}" -o StrictHostKeyChecking=no \
        ec2-user@"$EC2_IP" \
        "cd secure_gate_react_deploy/secure-gate-access/server && npm run db:migrate"
    
    echo -e "${GREEN}✓ Database migrations completed${NC}"
    echo ""
}

# Health check
health_check() {
    echo -e "${YELLOW}Running health checks...${NC}"
    
    # Check API health
    API_URL="https://${CLOUDFRONT_DOMAIN}/api/health"
    echo "Checking API: $API_URL"
    
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo -e "${GREEN}✓ API is healthy (HTTP $HTTP_STATUS)${NC}"
    else
        echo -e "${RED}✗ API health check failed (HTTP $HTTP_STATUS)${NC}"
    fi
    
    # Check frontend
    FRONTEND_URL="https://${CLOUDFRONT_DOMAIN}"
    echo "Checking Frontend: $FRONTEND_URL"
    
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo -e "${GREEN}✓ Frontend is accessible (HTTP $HTTP_STATUS)${NC}"
    else
        echo -e "${RED}✗ Frontend check failed (HTTP $HTTP_STATUS)${NC}"
    fi
    
    echo ""
}

# Print summary
print_summary() {
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    DEPLOYMENT COMPLETE                       ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Application URLs:${NC}"
    echo "  Frontend:  https://${CLOUDFRONT_DOMAIN}"
    echo "  API:       https://${CLOUDFRONT_DOMAIN}/api"
    echo "  Health:    https://${CLOUDFRONT_DOMAIN}/api/health"
    echo ""
    echo -e "${BLUE}AWS Resources:${NC}"
    echo "  EC2:       $EC2_IP (SSH: ssh -i your-key.pem ec2-user@$EC2_IP)"
    echo "  RDS:       $RDS_ENDPOINT"
    echo "  S3:        $S3_BUCKET"
    echo "  CDN:       $CLOUDFRONT_DOMAIN"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Update DNS to point to CloudFront: $CLOUDFRONT_DOMAIN"
    echo "  2. Configure SSL certificate in CloudFront for custom domain"
    echo "  3. Set up monitoring alerts in CloudWatch"
    echo "  4. Configure backup retention for RDS"
    echo ""
}

# Main deployment flow
main() {
    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            show_account_info
            deploy_infrastructure
            get_stack_outputs
            deploy_frontend
            health_check
            print_summary
            ;;
        frontend)
            check_prerequisites
            get_stack_outputs
            deploy_frontend
            health_check
            ;;
        migrate)
            check_prerequisites
            get_stack_outputs
            run_migrations
            ;;
        status)
            check_prerequisites
            get_stack_outputs
            health_check
            ;;
        destroy)
            echo -e "${RED}WARNING: This will delete all resources!${NC}"
            echo "Type 'yes' to confirm:"
            read CONFIRM
            if [ "$CONFIRM" = "yes" ]; then
                # Empty S3 bucket first
                aws s3 rm "s3://${S3_BUCKET}" --recursive --region "$AWS_REGION" 2>/dev/null || true
                # Delete stack
                aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$AWS_REGION"
                echo "Waiting for stack deletion..."
                aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$AWS_REGION"
                echo -e "${GREEN}✓ Stack deleted${NC}"
            else
                echo "Cancelled"
            fi
            ;;
        help|*)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  deploy    - Full deployment (infrastructure + frontend)"
            echo "  frontend  - Deploy frontend only"
            echo "  migrate   - Run database migrations"
            echo "  status    - Check deployment status"
            echo "  destroy   - Delete all resources"
            echo "  help      - Show this help"
            echo ""
            echo "Environment Variables:"
            echo "  AWS_REGION      - AWS region (default: af-south-1)"
            echo "  ENVIRONMENT     - Environment name (default: production)"
            echo "  STACK_NAME      - CloudFormation stack name"
            echo "  DB_PASSWORD     - Database password"
            echo "  KEY_PAIR_NAME   - EC2 key pair name"
            echo "  KEY_PAIR_FILE   - Path to SSH private key"
            ;;
    esac
}

main "$@"
