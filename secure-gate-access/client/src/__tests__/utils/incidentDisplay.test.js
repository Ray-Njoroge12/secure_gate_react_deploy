import { FALLBACK_TEXT, safeDisplayText, formatIncidentDateTime } from '../../utils/incidentDisplay';

describe('incidentDisplay utils', () => {
  describe('safeDisplayText', () => {
    test('returns fallback for nullish/blank/undefined values', () => {
      expect(safeDisplayText(null)).toBe(FALLBACK_TEXT);
      expect(safeDisplayText(undefined)).toBe(FALLBACK_TEXT);
      expect(safeDisplayText('   ')).toBe(FALLBACK_TEXT);
      expect(safeDisplayText('undefined')).toBe(FALLBACK_TEXT);
    });

    test('removes embedded placeholder tokens from text', () => {
      expect(safeDisplayText('Visitor arrived at undefined gate')).toBe('Visitor arrived at gate');
      expect(safeDisplayText('null')).toBe(FALLBACK_TEXT);
      expect(safeDisplayText('Resolved by undefined on null')).toBe('Resolved by on');
    });

    test('returns trimmed text for valid values', () => {
      expect(safeDisplayText('  Guard Name  ')).toBe('Guard Name');
      expect(safeDisplayText(42)).toBe('42');
    });
  });

  describe('formatIncidentDateTime', () => {
    test('returns fallback for invalid date values', () => {
      expect(formatIncidentDateTime(null)).toBe(FALLBACK_TEXT);
      expect(formatIncidentDateTime('not-a-date')).toBe(FALLBACK_TEXT);
      expect(formatIncidentDateTime('')).toBe(FALLBACK_TEXT);
    });

    test('returns locale date string for valid date values', () => {
      const formatted = formatIncidentDateTime('2026-03-10T08:30:00.000Z', FALLBACK_TEXT, 'en-US');
      expect(typeof formatted).toBe('string');
      expect(formatted).not.toBe(FALLBACK_TEXT);
    });
  });
});
