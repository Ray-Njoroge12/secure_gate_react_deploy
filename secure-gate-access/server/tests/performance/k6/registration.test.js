import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m30s', target: 10 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<700', 'p(99)<1200']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

export default function () {
  const email = `reg_${uuidv4()}@test.com`;
  const payload = JSON.stringify({
    name: 'Perf User',
    email,
    phone: '+2547123' + Math.floor(Math.random() * 10000),
    password: 'SecurePass123!',
    role: 'resident'
  });
  const headers = { 'Content-Type': 'application/json' };
  const res = http.post(`${BASE_URL}/api/auth/register`, payload, { headers });
  check(res, {
    'status 201/200': (r) => r.status === 201 || r.status === 200
  });
  sleep(1);
}






