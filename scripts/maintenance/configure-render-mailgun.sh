#!/bin/bash
# =============================================================================
# RENDER MAILGUN CONFIGURATION SCRIPT
# =============================================================================
# This script configures Render to use Mailgun for email delivery
# Run this to switch from local MailHog to production Mailgun
# =============================================================================

SERVICE_ID="srv-cu83f7ij1k6c73c81nv0"
API_KEY="${RENDER_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo "❌ Error: RENDER_API_KEY environment variable is not set"
    echo ""
    echo "To get your Render API key:"
    echo "1. Go to https://dashboard.render.com/u/settings/api-keys"
    echo "2. Create a new API key"
    echo "3. Run: export RENDER_API_KEY='your-key-here'"
    echo ""
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   CONFIGURING RENDER FOR MAILGUN EMAIL DELIVERY               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Mailgun configuration from your .env
MAILGUN_API_KEY="384194fbcc249187502fb33969b35269-96164d60-b4388e96"
MAILGUN_DOMAIN="sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org"
MAILGUN_BASE_URL="https://api.mailgun.net"
EMAIL_FROM="noreply@sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org"
EMAIL_FROM_NAME="Secure Gate Access"
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_USER="postmaster@sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org"
SMTP_PASS="9e1d5b8936fc15ec09e88b08908e2a37-5e1ffd43-becdfdc6"

# Function to set environment variable
set_env_var() {
    local key=$1
    local value=$2
    
    echo "📝 Setting $key..."
    
    response=$(curl -s -w "\n%{http_code}" -X PUT \
        "https://api.render.com/v1/services/${SERVICE_ID}/env-vars/${key}" \
        -H "Authorization: Bearer ${API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"value\": \"${value}\"}")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo "   ✅ $key set successfully"
    else
        echo "   ⚠️  $key - HTTP $http_code"
        echo "   Response: $(echo "$response" | head -n-1)"
    fi
}

echo "🔧 Configuring Mailgun settings..."
echo ""

# Set all Mailgun-related environment variables
set_env_var "EMAIL_PROVIDER" "mailgun"
set_env_var "MAILGUN_API_KEY" "$MAILGUN_API_KEY"
set_env_var "MAILGUN_DOMAIN" "$MAILGUN_DOMAIN"
set_env_var "MAILGUN_BASE_URL" "$MAILGUN_BASE_URL"
set_env_var "EMAIL_FROM" "$EMAIL_FROM"
set_env_var "EMAIL_FROM_NAME" "$EMAIL_FROM_NAME"
set_env_var "SMTP_HOST" "$SMTP_HOST"
set_env_var "SMTP_PORT" "$SMTP_PORT"
set_env_var "SMTP_SECURE" "false"
set_env_var "SMTP_USER" "$SMTP_USER"
set_env_var "SMTP_PASS" "$SMTP_PASS"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ✅ MAILGUN CONFIGURATION COMPLETE                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  IMPORTANT: MAILGUN SANDBOX LIMITATION"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Your Mailgun account is using a SANDBOX domain, which means:"
echo "❌ Emails will ONLY be sent to AUTHORIZED recipients"
echo "❌ You must authorize each recipient email in Mailgun dashboard"
echo ""
echo "🔧 TO FIX THIS:"
echo ""
echo "Option 1: AUTHORIZE RECIPIENTS (Quick Fix for Testing)"
echo "──────────────────────────────────────────────────────────────"
echo "1. Go to Mailgun Dashboard:"
echo "   https://app.mailgun.com/app/sending/domains/$MAILGUN_DOMAIN"
echo ""
echo "2. Find 'Authorized Recipients' section"
echo "3. Click 'Add Recipient' or 'Invite'"
echo "4. Enter the email address you want to test with"
echo "5. Mailgun will send a verification email to that address"
echo "6. Click the verification link in that email"
echo "7. Now you can receive emails from your app!"
echo ""
echo "OR"
echo ""
echo "Option 2: UPGRADE TO VERIFIED DOMAIN (Recommended for Production)"
echo "──────────────────────────────────────────────────────────────"
echo "1. Add a custom domain in Mailgun (e.g., mg.yourdomain.com)"
echo "2. Configure DNS records for domain verification"
echo "3. Update these environment variables with new domain"
echo "4. No recipient restrictions!"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Redeploy your Render service to apply changes:"
echo "   https://dashboard.render.com/web/${SERVICE_ID}"
echo ""
echo "2. Authorize your test email in Mailgun dashboard"
echo ""
echo "3. Test registration with authorized email"
echo ""
echo "💡 TIP: To test locally with MailHog instead:"
echo "   Just run: mailhog"
echo "   Server will use local MailHog (EMAIL_PROVIDER=smtp in local .env)"
echo ""
