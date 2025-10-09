import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '2m', target: 15 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<700', 'p(99)<1200']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@securegate.com';
const ADMIN_PASS = __ENV.ADMIN_PASSWORD || 'AdminPass123!';

function login(email, password) {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, password }), { headers: { 'Content-Type': 'application/json' } });
  const token = res.json('data.token') || res.json('token');
  return token;
}

export default function () {
  // Admin login (requires valid admin credentials in environment)
  const token = login(ADMIN_EMAIL, ADMIN_PASS);
  if (!token) {
    return;
  }
  const authHeaders = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };

  // Create visitor invitation
  const visitor = {
    name: 'Visitor ' + uuidv4().slice(0, 8),
    phone: '+2547' + Math.floor(Math.random() * 10000000),
    email: `visitor_${uuidv4()}@test.com`,
    purpose: 'Meeting',
    expectedArrival: new Date().toISOString()
  };

  const createRes = http.post(`${BASE_URL}/api/visitors`, JSON.stringify(visitor), authHeaders);
  check(createRes, { 'create visitor 201/200': (r) => r.status === 201 || r.status === 200 });

  // List visitors (admin scope)
  const listRes = http.get(`${BASE_URL}/api/visitors`, authHeaders);
  check(listRes, { 'list visitors 200': (r) => r.status === 200 });

  sleep(1);
}






