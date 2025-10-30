#!/bin/bash
# Phase 7: SSL/TLS Certificate Setup
# Run after Phase 6 is complete (ALB operational)

set -e

REGION="af-south-1"
DOMAIN_NAME="${1:-securegate.com}"  # Replace with your actual domain

echo "============================================"
echo "Phase 7: SSL/TLS Certificate Setup"
echo "============================================"
echo ""
echo "Domain: $DOMAIN_NAME"
echo "Region: $REGION"
echo ""

# Load ALB configuration
if [ ! -f "alb-config.txt" ]; then
    echo "❌ Error: alb-config.txt not found"
    echo "   Run phase6-alb-setup-commands.sh first"
    exit 1
fi

source alb-config.txt

# Step 1: Request SSL Certificate
echo "Step 1: Requesting SSL Certificate..."
CERT_ARN=$(aws acm request-certificate \
    --domain-name $DOMAIN_NAME \
    --subject-alternative-names "*.$DOMAIN_NAME" \
    --validation-method DNS \
    --region $REGION \
    --query 'CertificateArn' \
    --output text)

echo "  ✓ Certificate requested: $CERT_ARN"

# Step 2: Get DNS validation records
echo ""
echo "Step 2: Getting DNS Validation Records..."
sleep 5  # Wait for AWS to generate validation records

aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region $REGION \
    --query 'Certificate.DomainValidationOptions[*].ResourceRecord' \
    --output table

echo ""
echo "📋 ACTION REQUIRED:"
echo "  1. Copy the DNS validation records above"
echo "  2. Add them to your domain's DNS settings"
echo "  3. Wait for validation (5-30 minutes)"
echo ""
echo "To check validation status:"
echo "  aws acm describe-certificate \\"
echo "    --certificate-arn $CERT_ARN \\"
echo "    --region $REGION \\"
echo "    --query 'Certificate.Status'"
echo ""

# Wait for validation (optional - can be run manually)
read -p "Wait for certificate validation now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Waiting for certificate validation..."
    while true; do
        STATUS=$(aws acm describe-certificate \
            --certificate-arn $CERT_ARN \
            --region $REGION \
            --query 'Certificate.Status' \
            --output text)
        
        if [ "$STATUS" == "ISSUED" ]; then
            echo "  ✓ Certificate validated and issued!"
            break
        elif [ "$STATUS" == "FAILED" ]; then
            echo "  ❌ Certificate validation failed"
            exit 1
        else
            echo "  Status: $STATUS (waiting...)"
            sleep 30
        fi
    done
fi

# Step 3: Create HTTPS Listener (only if certificate is issued)
CERT_STATUS=$(aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region $REGION \
    --query 'Certificate.Status' \
    --output text)

if [ "$CERT_STATUS" == "ISSUED" ]; then
    echo ""
    echo "Step 3: Creating HTTPS Listener..."
    
    HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
        --load-balancer-arn $ALB_ARN \
        --protocol HTTPS \
        --port 443 \
        --certificates CertificateArn=$CERT_ARN \
        --ssl-policy ELBSecurityPolicy-TLS-1-2-2017-01 \
        --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG_ARN \
        --region $REGION \
        --query 'Listeners[0].ListenerArn' \
        --output text)
    
    echo "  ✓ HTTPS Listener created: $HTTPS_LISTENER_ARN"
    
    # Create backend routing rule for HTTPS
    aws elbv2 create-rule \
        --listener-arn $HTTPS_LISTENER_ARN \
        --priority 1 \
        --conditions Field=path-pattern,Values='/api/*' \
        --actions Type=forward,TargetGroupArn=$BACKEND_TG_ARN \
        --region $REGION
    
    echo "  ✓ HTTPS backend routing rule created"
    
    # Step 4: Update HTTP listener to redirect to HTTPS
    echo ""
    echo "Step 4: Updating HTTP listener to redirect to HTTPS..."
    
    aws elbv2 modify-listener \
        --listener-arn $HTTP_LISTENER_ARN \
        --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
        --region $REGION \
        > /dev/null
    
    echo "  ✓ HTTP → HTTPS redirect configured"
    
    # Step 5: Update backend environment to enforce HTTPS
    echo ""
    echo "Step 5: Backend HTTPS enforcement..."
    echo "  ⚠️  Update backend task definition:"
    echo "     ENFORCE_HTTPS=true"
    echo ""
    
    # Summary
    echo "============================================"
    echo "Phase 7 Complete! ✓"
    echo "============================================"
    echo ""
    echo "📋 Summary:"
    echo "  Certificate ARN: $CERT_ARN"
    echo "  HTTPS Listener: $HTTPS_LISTENER_ARN"
    echo "  SSL Policy: TLS 1.2"
    echo ""
    echo "🔗 Test URLs:"
    echo "  Frontend: https://$DOMAIN_NAME"
    echo "  Backend API: https://$DOMAIN_NAME/api/health"
    echo ""
    echo "✅ Next Step: Phase 8 - Route 53 DNS Configuration"
    echo "  Run: ./phase8-dns-setup.sh $DOMAIN_NAME"
    echo ""
    
    # Save configuration
    cat >> alb-config.txt << EOF
CERT_ARN=$CERT_ARN
HTTPS_LISTENER_ARN=$HTTPS_LISTENER_ARN
DOMAIN_NAME=$DOMAIN_NAME
EOF
    
else
    echo ""
    echo "⏸️  Certificate not yet validated"
    echo "   Status: $CERT_STATUS"
    echo ""
    echo "Complete DNS validation, then run this script again:"
    echo "  ./phase7-ssl-setup.sh $DOMAIN_NAME"
    echo ""
    
    # Save partial configuration
    cat >> alb-config.txt << EOF
CERT_ARN=$CERT_ARN
DOMAIN_NAME=$DOMAIN_NAME
EOF
fi
