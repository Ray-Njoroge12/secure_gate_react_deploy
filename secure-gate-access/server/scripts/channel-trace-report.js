#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { resolve } from 'path';

const USAGE = 'Usage: node scripts/channel-trace-report.js --files <file1,file2> [--format text|json]';
const VALID_FORMATS = new Set(['text', 'json']);

function parseArgs(argv) {
  const options = {
    files: [],
    format: 'text',
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--files') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('Missing value for --files');
      }
      options.files = value.split(',').map((item) => item.trim()).filter(Boolean);
      i += 1;
      continue;
    }

    if (arg.startsWith('--files=')) {
      const value = arg.slice('--files='.length);
      options.files = value.split(',').map((item) => item.trim()).filter(Boolean);
      continue;
    }

    if (arg === '--format') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('Missing value for --format');
      }
      options.format = value.trim().toLowerCase();
      i += 1;
      continue;
    }

    if (arg.startsWith('--format=')) {
      options.format = arg.slice('--format='.length).trim().toLowerCase();
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.help && options.files.length === 0) {
    throw new Error('The --files argument is required');
  }

  if (!VALID_FORMATS.has(options.format)) {
    throw new Error(`Invalid --format value: ${options.format}`);
  }

  return options;
}

function normalizeText(value, fallback = 'unknown') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeError(entry) {
  const candidate = entry.error ?? entry.reason ?? entry.failure ?? null;
  if (candidate === null || candidate === undefined) {
    return null;
  }

  if (typeof candidate === 'string') {
    const normalized = candidate.trim();
    return normalized.length > 0 ? normalized : null;
  }

  return String(candidate);
}

function normalizeTraceRecord(entry, source, timestamp) {
  const safeEntry = entry && typeof entry === 'object' ? entry : {};
  return {
    timestamp: timestamp ?? null,
    source,
    channel: normalizeText(safeEntry.channel),
    status: normalizeText(safeEntry.status).toLowerCase(),
    error: normalizeError(safeEntry)
  };
}

function extractNormalizedRecords(parsedLine) {
  const metadata = parsedLine?.metadata;
  if (!metadata || typeof metadata !== 'object') {
    return [];
  }

  const timestamp = parsedLine.timestamp ?? metadata.timestamp ?? null;
  const records = [];

  if (Array.isArray(metadata.attempts)) {
    for (const attempt of metadata.attempts) {
      records.push(normalizeTraceRecord(attempt, 'attempts', timestamp));
    }
  }

  if (Array.isArray(metadata.deliveryTrace)) {
    for (const traceItem of metadata.deliveryTrace) {
      records.push(normalizeTraceRecord(traceItem, 'deliveryTrace', timestamp));
    }
  }

  return records;
}

function createChannelStats() {
  return {
    total: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    unknown: 0
  };
}

function buildAggregates(records) {
  const channelCounts = {};
  const errorCounts = {};

  for (const record of records) {
    const channel = normalizeText(record.channel);
    const status = normalizeText(record.status).toLowerCase();

    if (!channelCounts[channel]) {
      channelCounts[channel] = createChannelStats();
    }

    channelCounts[channel].total += 1;
    if (Object.prototype.hasOwnProperty.call(channelCounts[channel], status)) {
      channelCounts[channel][status] += 1;
    } else {
      channelCounts[channel].unknown += 1;
    }

    if (record.error) {
      errorCounts[record.error] = (errorCounts[record.error] || 0) + 1;
    }
  }

  return {
    channelCounts,
    errorCounts
  };
}

async function parseLogFiles(files) {
  const summary = {
    files: files.map((filePath) => resolve(filePath)),
    totalLines: 0,
    parsedJsonLines: 0,
    skippedLines: 0,
    incidentCount: 0,
    normalizedRecordCount: 0
  };
  const records = [];

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      summary.totalLines += 1;

      let parsedLine;
      try {
        parsedLine = JSON.parse(line);
      } catch {
        summary.skippedLines += 1;
        continue;
      }

      summary.parsedJsonLines += 1;
      const extractedRecords = extractNormalizedRecords(parsedLine);
      if (extractedRecords.length > 0) {
        summary.incidentCount += 1;
        records.push(...extractedRecords);
      }
    }
  }

  summary.normalizedRecordCount = records.length;
  const aggregates = buildAggregates(records);

  return {
    summary,
    channelCounts: aggregates.channelCounts,
    errorCounts: aggregates.errorCounts
  };
}

function formatTextReport(report) {
  const lines = [];
  lines.push('Channel Trace Report');
  lines.push('====================');
  lines.push(`Files: ${report.summary.files.join(', ')}`);
  lines.push(`Total lines scanned: ${report.summary.totalLines}`);
  lines.push(`Parsed JSON lines: ${report.summary.parsedJsonLines}`);
  lines.push(`Skipped malformed lines: ${report.summary.skippedLines}`);
  lines.push(`Incident totals: ${report.summary.incidentCount}`);
  lines.push(`Normalized trace records: ${report.summary.normalizedRecordCount}`);
  lines.push('');

  lines.push('Channel Aggregate Counts');
  lines.push('------------------------');
  const channelEntries = Object.entries(report.channelCounts).sort(([a], [b]) => a.localeCompare(b));
  if (channelEntries.length === 0) {
    lines.push('(none)');
  } else {
    for (const [channel, counts] of channelEntries) {
      lines.push(
        `${channel}: total=${counts.total}, sent=${counts.sent}, failed=${counts.failed}, skipped=${counts.skipped}, unknown=${counts.unknown}`
      );
    }
  }
  lines.push('');

  lines.push('Error Aggregate Counts');
  lines.push('----------------------');
  const errorEntries = Object.entries(report.errorCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (errorEntries.length === 0) {
    lines.push('(none)');
  } else {
    for (const [error, count] of errorEntries) {
      lines.push(`${error}: ${count}`);
    }
  }

  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(USAGE);
    return;
  }

  const report = await parseLogFiles(options.files);

  if (options.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(formatTextReport(report));
}

main().catch((error) => {
  console.error(`[channel-trace-report] ${error.message}`);
  console.error(USAGE);
  process.exit(1);
});