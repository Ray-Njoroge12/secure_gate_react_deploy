// Simple in-memory rate limiter for small deployments
// Tracks key (ip + path) within a rolling window and logs blocks

const buckets = new Map();

function now() { return Date.now(); }

export function rateLimit({ windowMs = 60_000, max = 5 } = {}) {
  return (req, res, next) => {
    try {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const key = `${ip}:${req.path}`;
      const rec = buckets.get(key) || { start: now(), count: 0 };
      const elapsed = now() - rec.start;
      if (elapsed > windowMs) {
        rec.start = now();
        rec.count = 0;
      }
      rec.count += 1;
      buckets.set(key, rec);
      if (rec.count > max) {
        // Log minimal details; avoid sensitive info
        const email = (req.body && (req.body.email || req.body.username)) || null;
        console.warn('[rate-limit]', { ip, path: req.path, email: email || undefined, count: rec.count, windowMs });
        return res.status(429).json({ success: false, error: 'Too many requests', code: 429 });
      }
      return next();
    } catch (e) {
      // Fail open on limiter errors
      return next();
    }
  };
}

export default rateLimit;
