/**
 * Date and Time Utilities Unit Tests
 * Tests for date formatting, validation, and manipulation
 */

// Date utility functions for testing
const dateUtils = {
  formatDate: (date, format = 'YYYY-MM-DD') => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  formatRelativeTime: (date) => {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) === 1 ? '' : 's'} ago`;
    
    return dateUtils.formatDate(date, 'MM/DD/YYYY');
  },

  isValidDate: (date) => {
    if (!date) return false;
    const d = new Date(date);
    return !isNaN(d.getTime());
  },

  isFutureDate: (date) => {
    if (!dateUtils.isValidDate(date)) return false;
    const d = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return d >= now;
  },

  isPastDate: (date) => {
    if (!dateUtils.isValidDate(date)) return false;
    const d = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return d < now;
  },

  isToday: (date) => {
    if (!dateUtils.isValidDate(date)) return false;
    const d = new Date(date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  },

  addDays: (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  },

  addHours: (date, hours) => {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
  },

  getDateRange: (start, end) => {
    const dates = [];
    let current = new Date(start);
    const endDate = new Date(end);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  },

  getDayOfWeek: (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(date).getDay()];
  },

  isWeekend: (date) => {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
  },

  isBusinessHours: (date, startHour = 8, endHour = 18) => {
    const d = new Date(date);
    const hour = d.getHours();
    return hour >= startHour && hour < endHour && !dateUtils.isWeekend(d);
  },

  formatDuration: (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  },

  parseTime: (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  }
};

describe('Date Utilities', () => {
  describe('formatDate', () => {
    test('should format date as YYYY-MM-DD by default', () => {
      const result = dateUtils.formatDate('2024-01-15');
      expect(result).toBe('2024-01-15');
    });

    test('should format date with custom format', () => {
      const result = dateUtils.formatDate('2024-01-15', 'MM/DD/YYYY');
      expect(result).toBe('01/15/2024');
    });

    test('should include time when specified', () => {
      const result = dateUtils.formatDate('2024-01-15T10:30:00', 'YYYY-MM-DD HH:mm');
      expect(result).toBe('2024-01-15 10:30');
    });

    test('should return empty string for invalid date', () => {
      expect(dateUtils.formatDate('invalid')).toBe('');
    });

    test('should return empty string for null', () => {
      expect(dateUtils.formatDate(null)).toBe('');
    });

    test('should pad single digit months and days', () => {
      const result = dateUtils.formatDate('2024-1-5');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('formatRelativeTime', () => {
    test('should return "just now" for recent dates', () => {
      const now = new Date();
      expect(dateUtils.formatRelativeTime(now)).toBe('just now');
    });

    test('should return minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(dateUtils.formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    test('should use singular for 1 minute', () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      expect(dateUtils.formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    test('should return hours ago', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(dateUtils.formatRelativeTime(threeHoursAgo)).toBe('3 hours ago');
    });

    test('should return days ago', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(dateUtils.formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
    });

    test('should return weeks ago', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      expect(dateUtils.formatRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
    });

    test('should return formatted date for old dates', () => {
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const result = dateUtils.formatRelativeTime(oldDate);
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('isValidDate', () => {
    test('should return true for valid date string', () => {
      expect(dateUtils.isValidDate('2024-01-15')).toBe(true);
    });

    test('should return true for Date object', () => {
      expect(dateUtils.isValidDate(new Date())).toBe(true);
    });

    test('should return false for invalid string', () => {
      expect(dateUtils.isValidDate('invalid')).toBe(false);
    });

    test('should return false for null', () => {
      expect(dateUtils.isValidDate(null)).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(dateUtils.isValidDate('')).toBe(false);
    });
  });

  describe('isFutureDate', () => {
    test('should return true for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(dateUtils.isFutureDate(tomorrow)).toBe(true);
    });

    test('should return true for today', () => {
      expect(dateUtils.isFutureDate(new Date())).toBe(true);
    });

    test('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(dateUtils.isFutureDate(yesterday)).toBe(false);
    });
  });

  describe('isPastDate', () => {
    test('should return true for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(dateUtils.isPastDate(yesterday)).toBe(true);
    });

    test('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(dateUtils.isPastDate(tomorrow)).toBe(false);
    });
  });

  describe('isToday', () => {
    test('should return true for current date', () => {
      expect(dateUtils.isToday(new Date())).toBe(true);
    });

    test('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(dateUtils.isToday(yesterday)).toBe(false);
    });

    test('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(dateUtils.isToday(tomorrow)).toBe(false);
    });
  });

  describe('addDays', () => {
    test('should add positive days', () => {
      const start = new Date('2024-01-15');
      const result = dateUtils.addDays(start, 5);
      expect(result.getDate()).toBe(20);
    });

    test('should subtract with negative days', () => {
      const start = new Date('2024-01-15');
      const result = dateUtils.addDays(start, -5);
      expect(result.getDate()).toBe(10);
    });

    test('should handle month boundaries', () => {
      const start = new Date('2024-01-30');
      const result = dateUtils.addDays(start, 5);
      expect(result.getMonth()).toBe(1); // February
    });
  });

  describe('addHours', () => {
    test('should add hours', () => {
      const start = new Date('2024-01-15T10:00:00');
      const result = dateUtils.addHours(start, 5);
      expect(result.getHours()).toBe(15);
    });

    test('should handle day overflow', () => {
      const start = new Date('2024-01-15T22:00:00');
      const result = dateUtils.addHours(start, 5);
      expect(result.getDate()).toBe(16);
    });
  });

  describe('getDateRange', () => {
    test('should return array of dates', () => {
      const range = dateUtils.getDateRange('2024-01-15', '2024-01-17');
      expect(range).toHaveLength(3);
    });

    test('should return single date for same start and end', () => {
      const range = dateUtils.getDateRange('2024-01-15', '2024-01-15');
      expect(range).toHaveLength(1);
    });
  });

  describe('getDayOfWeek', () => {
    test('should return day name', () => {
      // January 15, 2024 is a Monday
      expect(dateUtils.getDayOfWeek('2024-01-15')).toBe('Monday');
    });
  });

  describe('isWeekend', () => {
    test('should return true for Saturday', () => {
      // January 20, 2024 is a Saturday
      expect(dateUtils.isWeekend('2024-01-20')).toBe(true);
    });

    test('should return true for Sunday', () => {
      // January 21, 2024 is a Sunday
      expect(dateUtils.isWeekend('2024-01-21')).toBe(true);
    });

    test('should return false for weekday', () => {
      // January 15, 2024 is a Monday
      expect(dateUtils.isWeekend('2024-01-15')).toBe(false);
    });
  });

  describe('isBusinessHours', () => {
    test('should return true during business hours on weekday', () => {
      // Monday at 10:00
      expect(dateUtils.isBusinessHours('2024-01-15T10:00:00')).toBe(true);
    });

    test('should return false before business hours', () => {
      // Monday at 6:00
      expect(dateUtils.isBusinessHours('2024-01-15T06:00:00')).toBe(false);
    });

    test('should return false after business hours', () => {
      // Monday at 20:00
      expect(dateUtils.isBusinessHours('2024-01-15T20:00:00')).toBe(false);
    });

    test('should return false on weekend', () => {
      // Saturday at 10:00
      expect(dateUtils.isBusinessHours('2024-01-20T10:00:00')).toBe(false);
    });

    test('should respect custom hours', () => {
      // Monday at 7:00 with custom hours 6-20
      expect(dateUtils.isBusinessHours('2024-01-15T07:00:00', 6, 20)).toBe(true);
    });
  });

  describe('formatDuration', () => {
    test('should format seconds', () => {
      expect(dateUtils.formatDuration(45000)).toBe('45s');
    });

    test('should format minutes and seconds', () => {
      expect(dateUtils.formatDuration(125000)).toBe('2m 5s');
    });

    test('should format hours and minutes', () => {
      expect(dateUtils.formatDuration(3725000)).toBe('1h 2m');
    });

    test('should format days and hours', () => {
      expect(dateUtils.formatDuration(90000000)).toBe('1d 1h');
    });
  });

  describe('parseTime', () => {
    test('should parse time string', () => {
      const result = dateUtils.parseTime('10:30');
      expect(result).toEqual({ hours: 10, minutes: 30 });
    });

    test('should parse midnight', () => {
      const result = dateUtils.parseTime('00:00');
      expect(result).toEqual({ hours: 0, minutes: 0 });
    });

    test('should parse 24-hour format', () => {
      const result = dateUtils.parseTime('23:59');
      expect(result).toEqual({ hours: 23, minutes: 59 });
    });
  });
});
