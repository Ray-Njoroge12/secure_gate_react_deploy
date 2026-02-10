// client/src/services/adminService.js
// Centralized admin API service

import { http } from './_http.js';

const API_BASE = '/api/admin';
const GUARDS_BASE = '/api/guards';

// === Dashboard Metrics ===
export const getMetrics = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/metrics${queryString ? `?${queryString}` : ''}`);
};

// === Estate Management ===
export const getEstateDetails = () => http.get(`${API_BASE}/estate-info`);
export const getAllEstates = () => http.get(`/api/admin/super-admin/estates`); // Re-using super admin endpoint

// === Audit Logs ===
export const getAuditLogs = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/audit-logs${queryString ? `?${queryString}` : ''}`);
};

// === Notification Queue Monitoring ===
export const getNotificationQueueStats = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/notification-queue/stats${queryString ? `?${queryString}` : ''}`);
};
export const getNotificationFailures = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/notification-queue/failed${queryString ? `?${queryString}` : ''}`);
};
export const retryNotificationFailure = (jobId) => http.post(`${API_BASE}/notification-queue/retry/${jobId}`);

// === Health Monitoring ===
export const getHealthDetails = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`/api/health/detailed${queryString ? `?${queryString}` : ''}`);
};

// === Residents Management ===
export const getAllResidents = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/residents${queryString ? `?${queryString}` : ''}`);
};
export const createResident = (data, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.post(`${API_BASE}/residents${queryString ? `?${queryString}` : ''}`, data);
};
export const updateResident = (id, data, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.put(`${API_BASE}/residents/${id}${queryString ? `?${queryString}` : ''}`, data);
};
export const deleteResident = (id, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.delete(`${API_BASE}/residents/${id}${queryString ? `?${queryString}` : ''}`);
};

// === Guards Management ===
export const getAllGuards = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${GUARDS_BASE}${queryString ? `?${queryString}` : ''}`);
};
export const addGuard = (data) => http.post(`${GUARDS_BASE}`, data);
export const updateGuard = (id, data) => http.put(`${GUARDS_BASE}/${id}`, data);
export const deleteGuard = (id) => http.delete(`${GUARDS_BASE}/${id}`);

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

// === Visitor Approvals ===
export const approveVisitor = (visitorId, data = {}) => http.post(`/api/approvals/visitors/${visitorId}/approve`, data);
export const rejectVisitor = (visitorId, data = {}) => http.post(`/api/approvals/visitors/${visitorId}/reject`, data);

// === Access Control ===
export const getAccessLogs = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/access-logs${queryString ? `?${queryString}` : ''}`);
};

// === Incident Management ===
// Admin incident workflow endpoints (use /api/admin/incidents/* for workflow operations)
export const getIncidents = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/incidents/queue${queryString ? `?${queryString}` : ''}`);
};
export const getIncidentStats = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/incidents/stats${queryString ? `?${queryString}` : ''}`);
};
export const updateIncidentStatus = (id, data) => http.put(`${API_BASE}/incidents/${id}/status`, data);
export const assignIncident = (id, data) => http.post(`${API_BASE}/incidents/${id}/assign`, data);
export const escalateIncident = (id, data) => http.post(`${API_BASE}/incidents/${id}/escalate`, data);

// === Users Management (for useAdminData hook) ===
export const getUsers = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/users${queryString ? `?${queryString}` : ''}`);
};
export const updateUser = (id, data) => http.put(`${API_BASE}/users/${id}`, data);
export const deleteUser = (id) => http.delete(`${API_BASE}/users/${id}`);
