// client/src/services/adminService.js
// Centralized admin API service

import { http } from './_http.js';

const API_BASE = '/api/admin';
const GUARDS_BASE = '/api/guards';

// === Dashboard Metrics ===
export const getMetrics = () => http.get(`${API_BASE}/metrics`);

// === Audit Logs ===
export const getAuditLogs = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/audit-logs${queryString ? `?${queryString}` : ''}`);
};

// === Notification Queue Monitoring ===
export const getNotificationQueueStats = () => http.get(`${API_BASE}/notification-queue/stats`);
export const getNotificationFailures = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/notification-queue/failed${queryString ? `?${queryString}` : ''}`);
};
export const retryNotificationFailure = (jobId) => http.post(`${API_BASE}/notification-queue/retry/${jobId}`);

// === Health Monitoring ===
export const getHealthDetails = () => http.get('/api/health/detailed');

// === Residents Management ===
export const getAllResidents = () => http.get(`${API_BASE}/residents`);
export const updateResident = (id, data) => http.put(`${API_BASE}/residents/${id}`, data);
export const deleteResident = (id) => http.delete(`${API_BASE}/residents/${id}`);

// === Guards Management ===
export const getAllGuards = () => http.get(`${API_BASE}/guards`);
export const addGuard = (data) => http.post(`${API_BASE}/guards`, data);
export const updateGuard = (id, data) => http.put(`${API_BASE}/guards/${id}`, data);
export const deleteGuard = (id) => http.delete(`${API_BASE}/guards/${id}`);

// === Guard Operations (Scheduling, Performance, Equipment, Training) ===
export const getGuardShifts = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${GUARDS_BASE}/shifts${queryString ? `?${queryString}` : ''}`);
};
export const createGuardShift = (data) => http.post(`${GUARDS_BASE}/shifts`, data);
export const updateGuardShift = (shiftId, data) => http.put(`${GUARDS_BASE}/shifts/${shiftId}`, data);
export const getHandoverNotes = (shiftId) => http.get(`${GUARDS_BASE}/handover/${shiftId}`);
export const recordGuardPerformance = (data) => http.post(`${GUARDS_BASE}/performance`, data);
export const getGuardPerformance = (guardId, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${GUARDS_BASE}/${guardId}/performance${queryString ? `?${queryString}` : ''}`);
};
export const checkoutEquipment = (data) => http.post(`${GUARDS_BASE}/equipment/checkout`, data);
export const returnEquipment = (checkoutId, data) => http.post(`${GUARDS_BASE}/equipment/${checkoutId}/return`, data);
export const getEquipmentCheckouts = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${GUARDS_BASE}/equipment${queryString ? `?${queryString}` : ''}`);
};
export const addTrainingRecord = (guardId, data) => http.post(`${GUARDS_BASE}/${guardId}/training`, data);
export const getTrainingRecords = (guardId) => http.get(`${GUARDS_BASE}/${guardId}/training`);

// === Visitor Logs ===
export const getVisitorLogs = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/visitors${queryString ? `?${queryString}` : ''}`);
};
export const checkInVisitor = (visitorId) => http.post(`${API_BASE}/visitors/${visitorId}/check-in`);
export const checkOutVisitor = (visitorId) => http.post(`${API_BASE}/visitors/${visitorId}/check-out`);

// === Access Control ===
export const getAccessLogs = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/access-logs${queryString ? `?${queryString}` : ''}`);
};

// === Incident Management ===
export const getIncidents = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/incidents${queryString ? `?${queryString}` : ''}`);
};
export const createIncident = (data) => http.post(`${API_BASE}/incidents`, data);
export const updateIncident = (id, data) => http.put(`${API_BASE}/incidents/${id}`, data);
export const deleteIncident = (id) => http.delete(`${API_BASE}/incidents/${id}`);

// === Users Management (for useAdminData hook) ===
export const getUsers = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/users${queryString ? `?${queryString}` : ''}`);
};
export const updateUser = (id, data) => http.put(`${API_BASE}/users/${id}`, data);
export const deleteUser = (id) => http.delete(`${API_BASE}/users/${id}`);
