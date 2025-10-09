import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '2m', target: 25 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.001'],
    http_req_duration: ['p(95)<500', 'p(99)<1000']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';
const EMAIL = __ENV.TEST_EMAIL || `perf_${uuidv4()}@test.com`;
const PASSWORD = __ENV.TEST_PASSWORD || 'SecurePass123!';

export default function () {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const headers = { 'Content-Type': 'application/json' };
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, { headers });
  check(res, {
    'status 200/201': (r) => r.status === 200 || r.status === 201,
    'has token or success': (r) => r.body && r.body.length > 0
  });
  sleep(1);
}






