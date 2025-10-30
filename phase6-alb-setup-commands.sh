#!/bin/bash
# Phase 6: Application Load Balancer Setup
# Run after Phase 5 is complete (backend operational)

set -e

REGION="af-south-1"
CLUSTER_NAME="secure-gate-cluster"
VPC_ID=$(aws ec2 describe-subnets --subnet-ids subnet-0a1d89b3aa0e01a04 --region $REGION --query 'Subnets[0].VpcId' --output text)
PUBLIC_SUBNET_1="subnet-0a1d89b3aa0e01a04"  # af-south-1a
PUBLIC_SUBNET_2="subnet-025d8d5e86db8c91c"  # af-south-1b

echo "============================================"
echo "Phase 6: Application Load Balancer Setup"
echo "============================================"
echo ""
echo "VPC ID: $VPC_ID"
echo "Region: $REGION"
echo "Public Subnets: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
echo ""

# Step 1: Create Security Group for ALB
echo "Step 1: Creating ALB Security Group..."
ALB_SG_ID=$(aws ec2 create-security-group \
    --group-name secure-gate-alb-sg \
    --description "Security group for Application Load Balancer" \
    --vpc-id $VPC_ID \
    --region $REGION \
    --query 'GroupId' \
    --output text)

echo "  ✓ ALB Security Group created: $ALB_SG_ID"

# Add ingress rules for ALB
echo "  Adding ingress rules..."
aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $REGION

aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $REGION

echo "  ✓ Ingress rules added (HTTP:80, HTTPS:443)"

# Step 2: Update ECS Security Group to allow traffic from ALB
echo ""
echo "Step 2: Updating ECS Security Group..."
ECS_SG_ID="sg-06f1c8515846af911"

# Allow backend traffic from ALB
aws ec2 authorize-security-group-ingress \
    --group-id $ECS_SG_ID \
    --protocol tcp \
    --port 5000 \
    --source-group $ALB_SG_ID \
    --region $REGION \
    2>/dev/null || echo "  Rule may already exist"

# Allow frontend traffic from ALB
aws ec2 authorize-security-group-ingress \
    --group-id $ECS_SG_ID \
    --protocol tcp \
    --port 80 \
    --source-group $ALB_SG_ID \
    --region $REGION \
    2>/dev/null || echo "  Rule may already exist"

echo "  ✓ ECS Security Group updated"

# Step 3: Create Application Load Balancer
echo ""
echo "Step 3: Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name secure-gate-alb \
    --subnets $PUBLIC_SUBNET_1 $PUBLIC_SUBNET_2 \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --region $REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

echo "  ✓ ALB created: $ALB_ARN"

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --region $REGION \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo "  ✓ ALB DNS: $ALB_DNS"

# Step 4: Create Target Groups
echo ""
echo "Step 4: Creating Target Groups..."

# Backend Target Group
BACKEND_TG_ARN=$(aws elbv2 create-target-group \
    --name secure-gate-backend-tg \
    --protocol HTTP \
    --port 5000 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-enabled \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

echo "  ✓ Backend Target Group created: $BACKEND_TG_ARN"

# Frontend Target Group
FRONTEND_TG_ARN=$(aws elbv2 create-target-group \
    --name secure-gate-frontend-tg \
    --protocol HTTP \
    --port 80 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-enabled \
    --health-check-protocol HTTP \
    --health-check-path / \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

echo "  ✓ Frontend Target Group created: $FRONTEND_TG_ARN"

# Step 5: Create Listeners
echo ""
echo "Step 5: Creating ALB Listeners..."

# HTTP Listener (will forward to frontend by default, route /api/* to backend)
HTTP_LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG_ARN \
    --region $REGION \
    --query 'Listeners[0].ListenerArn' \
    --output text)

echo "  ✓ HTTP Listener created: $HTTP_LISTENER_ARN"

# Create rule for backend API
aws elbv2 create-rule \
    --listener-arn $HTTP_LISTENER_ARN \
    --priority 1 \
    --conditions Field=path-pattern,Values='/api/*' \
    --actions Type=forward,TargetGroupArn=$BACKEND_TG_ARN \
    --region $REGION

echo "  ✓ Backend routing rule created (/api/*)"

# Create rule for health endpoint
aws elbv2 create-rule \
    --listener-arn $HTTP_LISTENER_ARN \
    --priority 2 \
    --conditions Field=path-pattern,Values='/health' \
    --actions Type=forward,TargetGroupArn=$BACKEND_TG_ARN \
    --region $REGION

echo "  ✓ Health endpoint routing rule created"

# Step 6: Update ECS Services to use ALB
echo ""
echo "Step 6: Updating ECS Services to use ALB..."

# Get backend service name
BACKEND_SERVICE=$(aws ecs list-services \
    --cluster $CLUSTER_NAME \
    --region $REGION \
    --query "serviceArns[?contains(@, 'backend')]" \
    --output text | awk -F/ '{print $NF}')

# Get frontend service name
FRONTEND_SERVICE=$(aws ecs list-services \
    --cluster $CLUSTER_NAME \
    --region $REGION \
    --query "serviceArns[?contains(@, 'frontend')]" \
    --output text | awk -F/ '{print $NF}')

echo "  Backend Service: $BACKEND_SERVICE"
echo "  Frontend Service: $FRONTEND_SERVICE"

# Update backend service
echo "  Updating backend service..."
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $BACKEND_SERVICE \
    --load-balancers targetGroupArn=$BACKEND_TG_ARN,containerName=backend,containerPort=5000 \
    --health-check-grace-period-seconds 60 \
    --force-new-deployment \
    --region $REGION \
    > /dev/null

echo "  ✓ Backend service updated"

# Update frontend service (if running)
if [ ! -z "$FRONTEND_SERVICE" ]; then
    echo "  Updating frontend service..."
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $FRONTEND_SERVICE \
        --load-balancers targetGroupArn=$FRONTEND_TG_ARN,containerName=frontend,containerPort=80 \
        --health-check-grace-period-seconds 60 \
        --force-new-deployment \
        --region $REGION \
        > /dev/null 2>&1 || echo "  ⚠ Frontend service update skipped (not ready)"
fi

# Step 7: Summary
echo ""
echo "============================================"
echo "Phase 6 Complete! ✓"
echo "============================================"
echo ""
echo "📋 Summary:"
echo "  ALB DNS Name: $ALB_DNS"
echo "  ALB Security Group: $ALB_SG_ID"
echo "  Backend Target Group: $BACKEND_TG_ARN"
echo "  Frontend Target Group: $FRONTEND_TG_ARN"
echo ""
echo "🔗 Test URLs:"
echo "  Frontend: http://$ALB_DNS"
echo "  Backend API: http://$ALB_DNS/api/health"
echo "  Health: http://$ALB_DNS/health"
echo ""
echo "⏱️  Wait 2-3 minutes for targets to become healthy"
echo ""
echo "🔍 Verify health:"
echo "  aws elbv2 describe-target-health \\"
echo "    --target-group-arn $BACKEND_TG_ARN \\"
echo "    --region $REGION"
echo ""
echo "✅ Next Step: Phase 7 - SSL/TLS Certificate"
echo "  Run: ./phase7-ssl-setup.sh"
echo ""

# Save configuration
cat > alb-config.txt << EOF
ALB_ARN=$ALB_ARN
ALB_DNS=$ALB_DNS
ALB_SG_ID=$ALB_SG_ID
BACKEND_TG_ARN=$BACKEND_TG_ARN
FRONTEND_TG_ARN=$FRONTEND_TG_ARN
HTTP_LISTENER_ARN=$HTTP_LISTENER_ARN
EOF

echo "Configuration saved to: alb-config.txt"
echo ""
