#!/usr/bin/env python3
"""
Simple registration test script
"""

import json
import urllib.request
import urllib.error

# Test data
data = {
    "username": "testuser999",
    "email": "n91599727+cleantest@gmail.com",
    "password": "SecurePass123!",
    "role": "resident",
    "phone": "+254712345678",
    "area": "Muthaiga",
    "house": "42"
}

url = "https://secure-gate-api.onrender.com/api/auth/register"

print("🧪 Testing registration...")
print(f"📧 Email: {data['email']}")
print("")

try:
    # Create request
    json_data = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=json_data,
        headers={'Content-Type': 'application/json'}
    )
    
    # Send request
    with urllib.request.urlopen(req, timeout=30) as response:
        status = response.status
        body = response.read().decode('utf-8')
        
        print(f"✅ Status: {status}")
        print(f"📄 Response:")
        print(json.dumps(json.loads(body), indent=2))
        print("")
        
        if status == 201:
            print("✅ Registration successful!")
            print("📧 Check your email inbox (and spam folder) for verification link")
            print("   Gmail will deliver to: n91599727@gmail.com")
            print("")
            print("⏰ Email should arrive within 1-2 minutes")
            print("")
            print("📊 Next: Check Mailgun dashboard for delivery status:")
            print("   https://app.mailgun.com/app/sending/domains")
            
except urllib.error.HTTPError as e:
    print(f"❌ HTTP Error {e.code}")
    try:
        body = e.read().decode('utf-8')
        print(f"📄 Response:")
        print(json.dumps(json.loads(body), indent=2))
        
        if e.code == 409:
            print("")
            print("⚠️  User already exists. Try these emails instead:")
            print("   • n91599727+test2@gmail.com")
            print("   • n91599727+test3@gmail.com")
            print("   • n91599727+final@gmail.com")
    except:
        print(body)
        
except Exception as e:
    print(f"❌ Error: {e}")
