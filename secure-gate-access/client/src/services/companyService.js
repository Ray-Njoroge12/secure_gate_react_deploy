// Company & Worker Service (client)
// API integration for company management and worker access

import { http } from './_http.js';

const COMPANY_BASE = '/api/companies';
const WORKER_BASE = '/api/workers';

// === Companies ===
export const registerCompany = (payload) => http.post(`${COMPANY_BASE}/register`, payload);
export const listCompanies = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return http.get(`${COMPANY_BASE}${query ? `?${query}` : ''}`);
};
export const getCompany = (id) => http.get(`${COMPANY_BASE}/${id}`);
export const updateCompany = (id, payload) => http.put(`${COMPANY_BASE}/${id}`, payload);
export const approveCompany = (id) => http.post(`${COMPANY_BASE}/${id}/approve`);
export const rejectCompany = (id, reason) => http.post(`${COMPANY_BASE}/${id}/reject`, { reason });
export const suspendCompany = (id) => http.post(`${COMPANY_BASE}/${id}/suspend`);

// === Company Locations ===
export const addCompanyLocation = (companyId, payload) => http.post(`${COMPANY_BASE}/${companyId}/locations`, payload);
export const getCompanyLocations = (companyId) => http.get(`${COMPANY_BASE}/${companyId}/locations`);
export const deleteCompanyLocation = (companyId, locationId) => http.delete(`${COMPANY_BASE}/${companyId}/locations/${locationId}`);

// === Workers ===
export const registerWorker = (payload) => http.post(WORKER_BASE, payload);
export const bulkRegisterWorkers = (payload) => http.post(`${WORKER_BASE}/bulk`, payload);
export const listWorkers = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return http.get(`${WORKER_BASE}${query ? `?${query}` : ''}`);
};
export const getWorker = (id) => http.get(`${WORKER_BASE}/${id}`);
export const updateWorker = (id, payload) => http.put(`${WORKER_BASE}/${id}`, payload);
export const preApproveWorker = (id) => http.post(`${WORKER_BASE}/${id}/pre-approve`);
export const revokeWorker = (id) => http.post(`${WORKER_BASE}/${id}/revoke`);

// === Worker Passes ===
export const generateWorkerPass = (workerId, payload = {}) => http.post(`${WORKER_BASE}/${workerId}/passes`, payload);
export const getWorkerPasses = (workerId) => http.get(`${WORKER_BASE}/${workerId}/passes`);
export const validateWorkerPass = (qrToken) => http.post(`${WORKER_BASE}/passes/validate`, { qrToken });
export const revokeWorkerPass = (passId) => http.post(`${WORKER_BASE}/passes/${passId}/revoke`);

// === Worker Check-in/out ===
export const checkInWorker = (workerId, payload = {}) => http.post(`${WORKER_BASE}/${workerId}/check-in`, payload);
export const checkOutWorker = (checkInId) => http.post(`${WORKER_BASE}/check-ins/${checkInId}/check-out`);
export const getActiveWorkers = () => http.get(`${WORKER_BASE}/active`);
export const getCheckInHistory = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return http.get(`${WORKER_BASE}/check-in-history${query ? `?${query}` : ''}`);
};
