// client/src/services/adminService.js
// Centralized admin API service

import { http } from './_http.js';

const API_BASE = '/api/admin';

// === Dashboard Metrics ===
export const getMetrics = () => http.get(`${API_BASE}/metrics`);

// === Audit Logs ===
export const getAuditLogs = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return http.get(`${API_BASE}/audit-logs${queryString ? `?${queryString}` : ''}`);
};

// === Residents Management ===
export const getAllResidents = () => http.get(`${API_BASE}/residents`);
export const updateResident = (id, data) => http.put(`${API_BASE}/residents/${id}`, data);
export const deleteResident = (id) => http.delete(`${API_BASE}/residents/${id}`);

// === Guards Management ===
export const getAllGuards = () => http.get(`${API_BASE}/guards`);
export const addGuard = (data) => http.post(`${API_BASE}/guards`, data);
export const updateGuard = (id, data) => http.put(`${API_BASE}/guards/${id}`, data);
export const deleteGuard = (id) => http.delete(`${API_BASE}/guards/${id}`);

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
