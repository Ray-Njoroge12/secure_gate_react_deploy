#!/bin/bash
# Real-time monitoring script for email delivery

echo "==============================================="
echo "📊 EMAIL DELIVERY MONITORING"
echo "==============================================="
echo ""

echo "🔍 Step 1: Check Latest Deployment"
echo "-------------------------------------------"
echo "Latest commit on GitHub:"
git log --oneline -1
echo ""

echo "🌐 Step 2: Test API Health"
echo "-------------------------------------------"
python3 << 'PYTHON'
import urllib.request
import json
try:
    with urllib.request.urlopen('https://secure-gate-api.onrender.com/api/health', timeout=5) as r:
        data = json.loads(r.read())
        print(f"✅ API Status: {data.get('status')}")
        print(f"   Uptime: {data.get('uptime', 0):.0f}s ({data.get('uptime', 0)/60:.1f} minutes)")
        print(f"   Version: {data.get('version')}")
except Exception as e:
    print(f"❌ API Health Check Failed: {e}")
PYTHON
echo ""

echo "📧 Step 3: Check Mailgun Configuration"
echo "-------------------------------------------"
echo "Mailgun domain configured: Check your .env"
echo "Authorized recipients: Must include n91599727@gmail.com"
echo ""

echo "📝 Step 4: TESTING INSTRUCTIONS"
echo "-------------------------------------------"
echo ""
echo "🌐 OPTION A - Test via Browser (EASIEST):"
echo "   1. Go to: https://securegate-access.netlify.app"
echo "   2. Register with: n91599727+cleantest@gmail.com"
echo "   3. Check Gmail inbox (and spam folder)"
echo ""
echo "💻 OPTION B - Test via API:"
echo "   Run this in your browser console:"
echo ""
echo "   fetch('https://secure-gate-api.onrender.com/api/auth/register', {"
echo "     method: 'POST',"
echo "     headers: { 'Content-Type': 'application/json' },"
echo "     body: JSON.stringify({"
echo "       username: 'test$(date +%s)',"
echo "       email: 'n91599727+test@gmail.com',"
echo "       password: 'SecurePass123!',"
echo "       role: 'resident',"
echo "       phone: '+254712345678',"
echo "       area: 'Muthaiga',"
echo "       house: '42'"
echo "     })"
echo "   })"
echo "   .then(r => r.json())"
echo "   .then(console.log)"
echo ""

echo "==============================================="
echo "📊 WHAT TO LOOK FOR:"
echo "==============================================="
echo ""
echo "✅ SUCCESS INDICATORS:"
echo "   • Registration returns 201 status"
echo "   • Response includes: emailVerificationRequired: true"
echo "   • Email arrives within 1-2 minutes"
echo "   • Server logs show: '🔍 User object for email verification'"
echo ""
echo "❌ FAILURE INDICATORS:"
echo "   • Registration returns 409 (user exists) - use different email"
echo "   • Registration returns 500 (server error) - check logs"
echo "   • No email received after 5 minutes - check Mailgun"
echo "   • Server logs show: '[EMAIL STUB]' - Mailgun not configured"
echo ""
echo "==============================================="
echo "🔗 USEFUL LINKS:"
echo "==============================================="
echo "• Frontend: https://securegate-access.netlify.app"
echo "• API: https://secure-gate-api.onrender.com"
echo "• Render Dashboard: https://dashboard.render.com"
echo "• Mailgun Dashboard: https://app.mailgun.com"
echo "• Gmail: https://mail.google.com"
echo ""
echo "==============================================="
echo "Ready to test! Follow Option A or B above ☝️"
echo "==============================================="
