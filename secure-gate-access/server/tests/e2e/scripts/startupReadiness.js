import fs from 'node:fs';
import path from 'node:path';

export const STARTUP_MARKER_PREFIX = 'PW_SERVER_STARTUP';

const normalizeValue = (value) => String(value).replace(/\s+/g, ' ').trim();

export const formatStartupMarker = (status, details = {}) => {
  const normalizedStatus = String(status || 'UNKNOWN').toUpperCase();
  const fields = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${normalizeValue(value)}`)
    .join('|');

  return fields
    ? `${STARTUP_MARKER_PREFIX}|${normalizedStatus}|${fields}`
    : `${STARTUP_MARKER_PREFIX}|${normalizedStatus}`;
};

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createStartupMarkerTranscriptWriter = ({
  transcriptPath,
  now = () => new Date().toISOString(),
  appendFileSync = fs.appendFileSync,
  mkdirSync = fs.mkdirSync,
  dirname = path.dirname,
  onError = () => {}
} = {}) => {
  if (!transcriptPath) {
    return () => {};
  }

  let initialized = false;
  let failed = false;

  return (markerLine) => {
    if (!markerLine || failed) {
      return;
    }

    try {
      if (!initialized) {
        mkdirSync(dirname(transcriptPath), { recursive: true });
        initialized = true;
      }

      appendFileSync(transcriptPath, `${now()}|${markerLine}\n`, 'utf8');
    } catch (error) {
      failed = true;
      onError(error);
    }
  };
};

export const waitForReadiness = async ({
  probeUrl,
  timeoutMs,
  intervalMs,
  fetchImpl = globalThis.fetch,
  sleep = defaultSleep,
  now = () => Date.now(),
  onAttempt = () => {}
}) => {
  const start = now();
  let attempts = 0;
  let lastStatusCode = 0;
  let lastError = null;

  while (now() - start < timeoutMs) {
    attempts += 1;

    try {
      const response = await fetchImpl(probeUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });

      lastStatusCode = response.status || 0;
      onAttempt({
        attempt: attempts,
        probeUrl,
        statusCode: lastStatusCode,
        ok: Boolean(response.ok),
        error: null
      });

      if (response.ok) {
        return {
          attempts,
          statusCode: lastStatusCode,
          durationMs: now() - start
        };
      }
    } catch (error) {
      lastError = error;
      onAttempt({
        attempt: attempts,
        probeUrl,
        statusCode: 0,
        ok: false,
        error: error?.message || 'unknown_error'
      });
    }

    await sleep(intervalMs);
  }

  const error = new Error(
    `Readiness probe timed out after ${timeoutMs}ms (attempts=${attempts}, lastStatus=${lastStatusCode})`
  );
  error.attempts = attempts;
  error.lastStatusCode = lastStatusCode;
  error.lastError = lastError;
  throw error;
};
