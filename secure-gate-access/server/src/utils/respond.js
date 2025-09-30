// server/src/utils/respond.js
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
  return res.json({ success: true, data: camelize(data) });
}

export function respondError(res, code, message) {
  return res.status(code).json({ success: false, error: { code, message } });
}

export default { respond, respondError, camelize, toCamel };
