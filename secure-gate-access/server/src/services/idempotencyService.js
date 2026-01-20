import * as crypto from 'crypto';
import { dbManager } from '../database/db.enhanced.js';

const IDEMPOTENCY_HEADER = 'idempotency-key';
const IDEMPOTENCY_HEADER_ALT = 'x-idempotency-key';

export const getIdempotencyKey = (req) => {
  if (!req?.headers) {
    return null;
  }
  const headerValue = req.headers[IDEMPOTENCY_HEADER] || req.headers[IDEMPOTENCY_HEADER_ALT];
  if (!headerValue) {
    return null;
  }
  return Array.isArray(headerValue) ? headerValue[0] : headerValue;
};

export const buildRequestHash = ({ method, path, body, userId, scopeContext }) => {
  const payload = {
    method,
    path,
    body: body ?? null,
    userId: userId ?? null,
    scopeContext: scopeContext ?? null
  };

  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

export const findIdempotencyRecord = async ({ key, scope }) => {
  const result = await dbManager.query(
    `SELECT key, scope, request_hash, response_code, response_body
     FROM idempotency_keys
     WHERE key = $1 AND scope = $2`,
    [key, scope]
  );

  return result.rows[0] || null;
};

export const storeIdempotencyResponse = async ({ key, scope, requestHash, responseCode, responseBody }) => {
  await dbManager.query(
    `INSERT INTO idempotency_keys (
      key, scope, request_hash, response_code, response_body, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (key, scope)
    DO UPDATE SET
      request_hash = EXCLUDED.request_hash,
      response_code = EXCLUDED.response_code,
      response_body = EXCLUDED.response_body,
      updated_at = NOW()`,
    [key, scope, requestHash, responseCode, JSON.stringify(responseBody)]
  );
};

export const resolveIdempotency = async ({ key, scope, requestHash }) => {
  if (!key) {
    return { hit: false };
  }

  const existing = await findIdempotencyRecord({ key, scope });
  if (!existing) {
    return { hit: false };
  }

  if (existing.request_hash && existing.request_hash !== requestHash) {
    return { hit: true, conflict: true };
  }

  return {
    hit: true,
    response: {
      statusCode: existing.response_code,
      body: existing.response_body
    }
  };
};

export default {
  getIdempotencyKey,
  buildRequestHash,
  findIdempotencyRecord,
  storeIdempotencyResponse,
  resolveIdempotency
};
