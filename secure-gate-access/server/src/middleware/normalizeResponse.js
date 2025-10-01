// server/src/middleware/normalizeResponse.js
import { camelize } from '../utils/respond.js';

export default function normalizeResponse(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    try {
      if (payload && typeof payload === 'object' && 'data' in payload) {
        payload = { ...payload, data: camelize(payload.data) };
      }
    } catch {}
    return originalJson(payload);
  };
  next();
}
