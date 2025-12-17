/**
 * @fileoverview Date Formatting Utilities
 * @description Consistent date formatting across the application
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { format, formatDistance, formatRelative, isToday, isYesterday, isTomorrow, parseISO, isValid } from 'date-fns';

/**
 * Default date format patterns
 */
export const DATE_FORMATS = {
  short: 'MMM d, yyyy',           // Dec 13, 2025
  long: 'MMMM d, yyyy',           // December 13, 2025
  full: 'EEEE, MMMM d, yyyy',     // Saturday, December 13, 2025
  time: 'h:mm a',                 // 9:30 AM
  time24: 'HH:mm',                // 09:30
  dateTime: 'MMM d, yyyy h:mm a', // Dec 13, 2025 9:30 AM
  iso: "yyyy-MM-dd'T'HH:mm:ss",   // 2025-12-13T09:30:00
  dayMonth: 'MMM d',              // Dec 13
  monthYear: 'MMMM yyyy',         // December 2025
};

/**
 * Parse date string to Date object
 * 
 * @param {string|Date} date - Date string or Date object
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
export function parseDate(date) {
  if (!date) return null;
  
  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }
  
  try {
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Format date with specified format
 * 
 * @param {string|Date} date - Date to format
 * @param {string} formatString - Format pattern or DATE_FORMATS key
 * @returns {string} - Formatted date string
 * 
 * @example
 * formatDate('2025-12-13', 'short') // 'Dec 13, 2025'
 * formatDate(new Date(), 'time')    // '9:30 AM'
 */
export function formatDate(date, formatString = 'short') {
  const parsed = parseDate(date);
  if (!parsed) return '';
  
  const pattern = DATE_FORMATS[formatString] || formatString;
  return format(parsed, pattern);
}

/**
 * Format date and time together
 * 
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date and time
 */
export function formatDateTime(date) {
  return formatDate(date, 'dateTime');
}

/**
 * Format time only
 * 
 * @param {string|Date} date - Date to format
 * @param {boolean} use24Hour - Use 24-hour format
 * @returns {string} - Formatted time
 */
export function formatTime(date, use24Hour = false) {
  return formatDate(date, use24Hour ? 'time24' : 'time');
}

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 * 
 * @param {string|Date} date - Date to compare
 * @param {Date} baseDate - Base date for comparison (defaults to now)
 * @returns {string} - Relative time string
 * 
 * @example
 * getRelativeTime('2025-12-12') // 'yesterday'
 * getRelativeTime('2025-12-10') // '3 days ago'
 */
export function getRelativeTime(date, baseDate = new Date()) {
  const parsed = parseDate(date);
  if (!parsed) return '';
  
  return formatDistance(parsed, baseDate, { addSuffix: true });
}

/**
 * Get smart relative date (Today, Yesterday, Tomorrow, or date)
 * 
 * @param {string|Date} date - Date to format
 * @returns {string} - Smart formatted date
 * 
 * @example
 * getSmartDate(today) // 'Today at 9:30 AM'
 * getSmartDate(yesterday) // 'Yesterday at 3:00 PM'
 * getSmartDate(lastWeek) // 'Dec 6, 2025'
 */
export function getSmartDate(date) {
  const parsed = parseDate(date);
  if (!parsed) return '';
  
  if (isToday(parsed)) {
    return `Today at ${formatTime(parsed)}`;
  }
  
  if (isYesterday(parsed)) {
    return `Yesterday at ${formatTime(parsed)}`;
  }
  
  if (isTomorrow(parsed)) {
    return `Tomorrow at ${formatTime(parsed)}`;
  }
  
  return formatDateTime(parsed);
}

/**
 * Format date range
 * 
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {string} - Formatted date range
 * 
 * @example
 * formatDateRange('2025-12-13', '2025-12-15') // 'Dec 13 - 15, 2025'
 */
export function formatDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (!start || !end) return '';
  
  const startYear = format(start, 'yyyy');
  const endYear = format(end, 'yyyy');
  const startMonth = format(start, 'MMM');
  const endMonth = format(end, 'MMM');
  
  // Same year
  if (startYear === endYear) {
    // Same month
    if (startMonth === endMonth) {
      return `${startMonth} ${format(start, 'd')} - ${format(end, 'd')}, ${startYear}`;
    }
    return `${startMonth} ${format(start, 'd')} - ${endMonth} ${format(end, 'd')}, ${startYear}`;
  }
  
  // Different years
  return `${formatDate(start, 'short')} - ${formatDate(end, 'short')}`;
}

/**
 * Get duration between two dates in human readable format
 * 
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {string} - Duration string
 */
export function getDuration(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (!start || !end) return '';
  
  return formatDistance(start, end);
}

/**
 * Check if date is in the past
 * 
 * @param {string|Date} date - Date to check
 * @returns {boolean} - True if date is in the past
 */
export function isPastDate(date) {
  const parsed = parseDate(date);
  if (!parsed) return false;
  return parsed < new Date();
}

/**
 * Check if date is in the future
 * 
 * @param {string|Date} date - Date to check
 * @returns {boolean} - True if date is in the future
 */
export function isFutureDate(date) {
  const parsed = parseDate(date);
  if (!parsed) return false;
  return parsed > new Date();
}

/**
 * Format visitor check-in/check-out time
 * 
 * @param {string|Date} checkIn - Check-in time
 * @param {string|Date} checkOut - Check-out time (optional)
 * @returns {string} - Formatted duration
 */
export function formatVisitDuration(checkIn, checkOut) {
  const start = parseDate(checkIn);
  const end = checkOut ? parseDate(checkOut) : new Date();
  
  if (!start) return '';
  
  if (!checkOut) {
    return `Since ${formatTime(start)}`;
  }
  
  const duration = getDuration(start, end);
  return `${formatTime(start)} - ${formatTime(end)} (${duration})`;
}

export default {
  formatDate,
  formatDateTime,
  formatTime,
  getRelativeTime,
  getSmartDate,
  formatDateRange,
  getDuration,
  isPastDate,
  isFutureDate,
  formatVisitDuration,
  parseDate,
  DATE_FORMATS,
};
