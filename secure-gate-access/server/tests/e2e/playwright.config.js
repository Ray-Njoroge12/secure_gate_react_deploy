/**
 * Playwright E2E Test Configuration
 * Phase 4: End-to-End Testing
 */

import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import shared from '../../../playwright.shared.cjs';

const isListMode = process.argv.includes('--list');
const configDir = path.dirname(fileURLToPath(import.meta.url));
const readinessWrapperPath = path.resolve(configDir, 'scripts/start-server-with-readiness.js');
const webServerUrl = 'http://localhost:3001/health/ready';
const defaultWebServerTimeoutMs = 120000;
const smokeWebServerTimeoutMs = 180000;
const isSmokeProfile = process.env.PW_SMOKE_PROFILE === '1';
const webServerCommand = `node "${readinessWrapperPath}" --probe-url "${webServerUrl}"`;
const repoRoot = path.resolve(configDir, '../../../../');
const traceDir = process.env.PW_TRACE_LOG_DIR
  ? path.resolve(process.env.PW_TRACE_LOG_DIR)
  : path.resolve(repoRoot, 'docs/plan/clean-20260325-01/logs');

const buildTracePrefix = () => {
  const now = new Date();
  const pad = (value, size = 2) => String(value).padStart(size, '0');
  const stamp = [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate())
  ].join('') + `-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}${pad(now.getUTCMilliseconds(), 3)}`;

  return `PW_${stamp}_${process.pid}`;
};

const tracePrefix = !isListMode
  ? process.env.PW_WRAPPER_TRACE_PREFIX || buildTracePrefix()
  : null;
const markerTranscriptPath = tracePrefix
  ? path.join(traceDir, `${tracePrefix}_wrapper_startup.log`)
  : null;

const webServerEnv = tracePrefix
  ? {
      ...process.env,
      PW_WRAPPER_TRACE_PREFIX: tracePrefix,
      PW_TRACE_LOG_DIR: traceDir,
      PW_WRAPPER_TRANSCRIPT_PATH: markerTranscriptPath
    }
  : undefined;

if (tracePrefix && !isListMode) {
  try {
    fs.mkdirSync(traceDir, { recursive: true });
    fs.writeFileSync(
      path.join(traceDir, `${tracePrefix}_wrapper_command.txt`),
      `${webServerCommand}\n`,
      'utf8'
    );
  } catch (error) {
    console.warn('[PW_WRAPPER_TRACE] Failed to write wrapper command artifact:', error?.message || error);
  }
}

export default defineConfig({
  testDir: './specs',
  testMatch: ['**/*.spec.js'],
  testIgnore: ['**/*.test.js', '**/__tests__/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: '../../../test-results/e2e-report' }],
    ['json', { outputFile: '../../../test-results/e2e-results.json' }],
    ['list']
  ],
  
  use: shared.makeUseDefaults({
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    actionTimeout: 15000,
    navigationTimeout: 30000
  }),

  projects: [
    ...shared.projectNames.desktop.map((project) => ({
      name: project.name,
      use: { ...devices[project.device] },
    })),
    {
      name: 'mobile-chrome',
      use: { ...devices[shared.deviceNames.mobileChrome] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices[shared.deviceNames.mobileSafari] },
    },
  ],

  webServer: isListMode
    ? undefined
    : {
        command: webServerCommand,
        url: webServerUrl,
        env: webServerEnv,
        reuseExistingServer: !process.env.CI,
        timeout: isSmokeProfile ? smokeWebServerTimeoutMs : defaultWebServerTimeoutMs,
      },
});
