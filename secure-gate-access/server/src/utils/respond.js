// server/src/utils/respond.js
import { buildErrorPayload } from './responseFormatter.js';

export function toCamel(s) {
  return s.replace(/_([a-z])/g, (_, p) => p.toUpperCase());
}

export function camelize(obj) {
  if (Array.isArray(obj)) return obj.map(camelize);
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const out = {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const key = toCamel(k);
      out[key] = camelize(v);
    }
    return out;
  }
  return obj;
}

export function respond(res, data) {
  const status = arguments.length >= 3 ? arguments[2] : 200;
  return res.status(status).json({ success: true, data: camelize(data) });
}

const statusCodeMap = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_ERROR'
};

export function respondError(res, code, message, req = null) {
  const errorCode = statusCodeMap[code] || 'ERROR';
  const response = buildErrorPayload(req, res, message, errorCode);
  return res.status(code).json(response);
}

export default { respond, respondError, camelize, toCamel };
