export const FALLBACK_TEXT = 'N/A';
const SEVERITY_LEVELS = new Set(['low', 'medium', 'high', 'critical']);
const PLACEHOLDER_TOKEN_PATTERN = /\b(?:undefined|null)\b/gi;

export function safeDisplayText(value, fallback = FALLBACK_TEXT) {
  if (value === null || value === undefined) return fallback;
  const rawText = String(value).trim();
  const text = rawText.replace(PLACEHOLDER_TOKEN_PATTERN, '').replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : fallback;
}

export function formatIncidentDateTime(value, fallback = FALLBACK_TEXT, locale) {
  if (!value) return fallback;

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return parsed.toLocaleString(locale);
}

export function sanitizeIncidentForDisplay(incident = {}) {
  const severityCandidate = safeDisplayText(incident.severity, 'medium').toLowerCase();
  const severity = SEVERITY_LEVELS.has(severityCandidate) ? severityCandidate : 'medium';

  return {
    ...incident,
    category: safeDisplayText(incident.category, 'unknown'),
    severity,
    description: safeDisplayText(incident.description),
    guard_name: safeDisplayText(incident.guard_name, ''),
    visitor_name: safeDisplayText(incident.visitor_name, ''),
    resolution: safeDisplayText(incident.resolution, ''),
    resolved_by_name: safeDisplayText(incident.resolved_by_name, '')
  };
}
