#!/usr/bin/env python3
import json
import urllib.request
import sys

print("Starting dashboard test...", file=sys.stderr)

with open('/tmp/login.json') as f:
    data = json.load(f)
    token = data['data']['accessToken']

print(f"Token: {token[:30]}...", file=sys.stderr)

req = urllib.request.Request(
    'http://localhost:3001/api/dashboard/stats',
    headers={'Authorization': f'Bearer {token}'}
)

try:
    with urllib.request.urlopen(req, timeout=15) as response:
        print(f'Status: {response.status}')
        body = response.read().decode()
        print(f'Body length: {len(body)}')
        print(f'Body: {body[:800]}')
except urllib.error.HTTPError as e:
    print(f'HTTP Error: {e.code}')
    print(f'Error Body: {e.read().decode()[:600]}')
except Exception as e:
    print(f'Exception: {type(e).__name__}: {e}')
