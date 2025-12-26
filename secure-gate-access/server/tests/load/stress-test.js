/**
 * PERF-002: Stress Test - Find Breaking Point
 * Gradually increases load until system fails
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Warm up
    { duration: '5m', target: 200 },   // Moderate load
    { duration: '5m', target: 500 },   // Heavy load
    { duration: '5m', target: 1000 },  // Stress load
    { duration: '2m', target: 0 },     // Recovery
  ],
  thresholds: {
    'error_rate': ['rate<0.10'],       // Allow up to 10% errors under stress
    'response_time': ['p(99)<5000'],   // 99% under 5s even under stress
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5001/api';

export default function () {
  const startTime = Date.now();
  
  // Mix of different endpoint calls
  const endpoints = [
    { method: 'GET', path: '/health', weight: 20 },
    { method: 'GET', path: '/visitors?limit=10', weight: 30 },
    { method: 'POST', path: '/auth/login', weight: 20, body: { email: 'test@test.com', password: 'test' } },
    { method: 'GET', path: '/recurring-passes', weight: 15 },
    { method: 'GET', path: '/check-in/today', weight: 15 },
  ];

  // Weighted random selection
  const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;
  let selected = endpoints[0];
  
  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      selected = endpoint;
      break;
    }
  }

  let response;
  const headers = { 'Content-Type': 'application/json' };

  if (selected.method === 'GET') {
    response = http.get(`${BASE_URL}${selected.path}`, { headers });
  } else {
    response = http.post(`${BASE_URL}${selected.path}`, JSON.stringify(selected.body || {}), { headers });
  }

  const duration = Date.now() - startTime;
  responseTime.add(duration);

  const success = check(response, {
    'status is not 5xx': (r) => r.status < 500,
    'response time < 5s': (r) => r.timings.duration < 5000,
  });

  if (success && response.status < 400) {
    successfulRequests.add(1);
    errorRate.add(0);
  } else {
    failedRequests.add(1);
    errorRate.add(1);
  }

  sleep(0.1);
}

export function handleSummary(data) {
  const errorRateValue = data.metrics.error_rate?.values?.rate || 0;
  const p95ResponseTime = data.metrics.response_time?.values?.['p(95)'] || 0;
  const maxVUs = data.metrics.vus_max?.values?.max || 0;

  console.log('\n========== STRESS TEST RESULTS ==========');
  console.log(`Max VUs reached: ${maxVUs}`);
  console.log(`Error rate: ${(errorRateValue * 100).toFixed(2)}%`);
  console.log(`P95 Response Time: ${p95ResponseTime.toFixed(0)}ms`);
  console.log(`Successful requests: ${data.metrics.successful_requests?.values?.count || 0}`);
  console.log(`Failed requests: ${data.metrics.failed_requests?.values?.count || 0}`);
  
  if (errorRateValue > 0.05) {
    console.log(`\n⚠️ BREAKING POINT DETECTED around ${maxVUs} concurrent users`);
  } else {
    console.log(`\n✅ System handled ${maxVUs} concurrent users successfully`);
  }
  console.log('==========================================\n');

  return {
    'stress-test-results.json': JSON.stringify(data, null, 2),
  };
}
