import {
  getStatusColors,
  getStatusChipClass,
  getStatusIcon
} from '../../utils/statusColors';

describe('statusColors utility', () => {
  describe('getStatusColors', () => {
    test('returns color object for known status', () => {
      const colors = getStatusColors('APPROVED');
      expect(colors).toBeDefined();
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('bg');
      expect(colors).toHaveProperty('chip');
    });

    test('returns default colors for unknown status', () => {
      const colors = getStatusColors('unknown_status');
      expect(colors).toBeDefined();
      expect(colors).toHaveProperty('text');
    });

    test('handles case-insensitive status', () => {
      const colors1 = getStatusColors('APPROVED');
      const colors2 = getStatusColors('approved');
      expect(colors1.text).toBe(colors2.text);
      expect(colors1.bg).toBe(colors2.bg);
    });

    test('handles null/undefined status', () => {
      const colors = getStatusColors(null);
      expect(colors).toBeDefined();
    });

    test('returns correct colors for PENDING status', () => {
      const colors = getStatusColors('PENDING');
      expect(colors.text).toContain('amber');
    });

    test('returns correct colors for CHECKED_IN status', () => {
      const colors = getStatusColors('CHECKED_IN');
      expect(colors.text).toContain('green');
    });

    test('returns correct colors for REJECTED status', () => {
      const colors = getStatusColors('REJECTED');
      expect(colors.text).toContain('red');
    });
  });

  describe('getStatusChipClass', () => {
    test('returns CSS classes for status', () => {
      const classes = getStatusChipClass('PENDING');
      expect(typeof classes).toBe('string');
      expect(classes.length).toBeGreaterThan(0);
      expect(classes).toContain('rounded-full');
    });

    test('includes size classes for md size (default)', () => {
      const classes = getStatusChipClass('APPROVED', 'md');
      expect(classes).toContain('px-3');
    });

    test('includes size classes for sm size', () => {
      const classes = getStatusChipClass('APPROVED', 'sm');
      expect(classes).toContain('px-2');
    });

    test('includes size classes for lg size', () => {
      const classes = getStatusChipClass('APPROVED', 'lg');
      expect(classes).toContain('px-4');
    });
  });

  describe('getStatusIcon', () => {
    test('returns icon for APPROVED status', () => {
      const icon = getStatusIcon('APPROVED');
      expect(icon).toBe('✅');
    });

    test('returns icon for PENDING status', () => {
      const icon = getStatusIcon('PENDING');
      expect(icon).toBe('⏳');
    });

    test('returns default icon for unknown status', () => {
      const icon = getStatusIcon('unknown');
      expect(icon).toBe('•');
    });

    test('handles null/undefined status', () => {
      const icon = getStatusIcon(null);
      expect(icon).toBe('•');
    });
  });
});
