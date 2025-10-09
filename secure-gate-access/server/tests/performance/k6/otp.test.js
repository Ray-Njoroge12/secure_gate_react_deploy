import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 10,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

export default function () {
  const payload = JSON.stringify({ phone: '+254712345678' });
  const headers = { 'Content-Type': 'application/json' };
  const res = http.post(`${BASE_URL}/api/otp/send`, payload, { headers });
  check(res, {
    'status 200/201/202': (r) => [200, 201, 202].includes(r.status)
  });
  sleep(1);
}






