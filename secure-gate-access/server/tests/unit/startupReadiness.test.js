import { describe, expect, jest, test } from '@jest/globals';
import {
  createStartupMarkerTranscriptWriter,
  formatStartupMarker,
  waitForReadiness,
  STARTUP_MARKER_PREFIX
} from '../e2e/scripts/startupReadiness.js';

describe('startupReadiness helpers', () => {
  test('formats deterministic startup markers', () => {
    const marker = formatStartupMarker('STARTING', {
      timeoutMs: 120000,
      probeUrl: 'http://localhost:3001/health/ready',
      command: 'npm run dev'
    });

    expect(marker).toBe(
      `${STARTUP_MARKER_PREFIX}|STARTING|command=npm run dev|probeUrl=http://localhost:3001/health/ready|timeoutMs=120000`
    );
  });

  test('waitForReadiness resolves when probe returns success', async () => {
    const statuses = [503, 503, 200];
    const fetchImpl = jest.fn(async () => {
      const currentStatus = statuses.shift() || 200;
      return {
        ok: currentStatus >= 200 && currentStatus < 300,
        status: currentStatus
      };
    });

    const result = await waitForReadiness({
      probeUrl: 'http://localhost:3001/health/ready',
      timeoutMs: 2000,
      intervalMs: 10,
      fetchImpl,
      sleep: async () => {}
    });

    expect(result.attempts).toBe(3);
    expect(result.statusCode).toBe(200);
  });

  test('waitForReadiness reports probe URL on every attempt via callback', async () => {
    const statuses = [503, 200];
    const fetchImpl = jest.fn(async () => {
      const currentStatus = statuses.shift() || 200;
      return {
        ok: currentStatus >= 200 && currentStatus < 300,
        status: currentStatus
      };
    });

    const onAttempt = jest.fn();
    await waitForReadiness({
      probeUrl: 'http://localhost:3001/health/ready',
      timeoutMs: 2000,
      intervalMs: 10,
      fetchImpl,
      sleep: async () => {},
      onAttempt
    });

    expect(onAttempt).toHaveBeenCalledTimes(2);
    expect(onAttempt).toHaveBeenNthCalledWith(1, {
      attempt: 1,
      probeUrl: 'http://localhost:3001/health/ready',
      statusCode: 503,
      ok: false,
      error: null
    });
    expect(onAttempt).toHaveBeenNthCalledWith(2, {
      attempt: 2,
      probeUrl: 'http://localhost:3001/health/ready',
      statusCode: 200,
      ok: true,
      error: null
    });
  });

  test('waitForReadiness throws timeout with last status code context', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 503 }));

    await expect(
      waitForReadiness({
        probeUrl: 'http://localhost:3001/health/ready',
        timeoutMs: 25,
        intervalMs: 10,
        fetchImpl,
        sleep: async () => {}
      })
    ).rejects.toThrow('Readiness probe timed out');
  });

  test('createStartupMarkerTranscriptWriter appends timestamped marker lines', () => {
    const appendFileSync = jest.fn();
    const mkdirSync = jest.fn();
    const dirname = jest.fn(() => '/tmp');
    const now = jest.fn(() => '2026-03-27T12:34:56.000Z');

    const writeMarker = createStartupMarkerTranscriptWriter({
      transcriptPath: '/tmp/pw-wrapper.log',
      appendFileSync,
      mkdirSync,
      dirname,
      now
    });

    writeMarker(`${STARTUP_MARKER_PREFIX}|STARTING|probeUrl=http://localhost:3001/health/ready`);

    expect(mkdirSync).toHaveBeenCalledWith('/tmp', { recursive: true });
    expect(appendFileSync).toHaveBeenCalledWith(
      '/tmp/pw-wrapper.log',
      '2026-03-27T12:34:56.000Z|PW_SERVER_STARTUP|STARTING|probeUrl=http://localhost:3001/health/ready\n',
      'utf8'
    );
  });

  test('createStartupMarkerTranscriptWriter is a noop when transcript path is not set', () => {
    const appendFileSync = jest.fn();
    const writeMarker = createStartupMarkerTranscriptWriter({ appendFileSync });

    writeMarker(`${STARTUP_MARKER_PREFIX}|READY|statusCode=200`);

    expect(appendFileSync).not.toHaveBeenCalled();
  });
});
