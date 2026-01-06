#!/bin/bash
# Script to set environment variables on Render using the API

SERVICE_ID="srv-cu83f7ij1k6c73c81nv0"
API_KEY="${RENDER_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo "❌ Error: RENDER_API_KEY environment variable is not set"
    echo "Please set your Render API key:"
    echo "export RENDER_API_KEY='your-api-key-here'"
    exit 1
fi

echo "🔧 Setting ENABLE_EXTERNAL_NOTIFICATIONS=true on Render..."

# Update environment variables using Render API
curl -X PUT "https://api.render.com/v1/services/${SERVICE_ID}/env-vars/ENABLE_EXTERNAL_NOTIFICATIONS" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "true"
  }'

echo ""
echo "✅ Environment variable set successfully!"
echo "⚠️  Note: You may need to manually trigger a redeploy for changes to take effect"
echo ""
echo "To trigger a redeploy, visit:"
echo "https://dashboard.render.com/web/${SERVICE_ID}"
