/**
 * Status Colors Utility
 * Provides consistent color mapping for visitor statuses across the application
 * Phase A8: UI/UX Improvement - Status chip color consistency
 */

/**
 * Get color classes for a visitor status
 * @param {string} status - The visitor status
 * @returns {object} Object with text and background color classes
 */
export function getStatusColors(status) {
  const statusMap = {
    // Blue - Confirmed/Expected
    'CONFIRMED': {
      text: 'text-blue-700',
      bg: 'bg-blue-100',
      border: 'border-blue-200',
      chip: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    'EXPECTED': {
      text: 'text-blue-700',
      bg: 'bg-blue-100',
      border: 'border-blue-200',
      chip: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    'VERIFIED': {
      text: 'text-blue-700',
      bg: 'bg-blue-100',
      border: 'border-blue-200',
      chip: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    
    // Green - Active/On Premise
    'ON_PREMISE': {
      text: 'text-green-700',
      bg: 'bg-green-100',
      border: 'border-green-200',
      chip: 'bg-green-100 text-green-700 border-green-200'
    },
    'CHECKED_IN': {
      text: 'text-green-700',
      bg: 'bg-green-100',
      border: 'border-green-200',
      chip: 'bg-green-100 text-green-700 border-green-200'
    },
    'ACTIVE': {
      text: 'text-green-700',
      bg: 'bg-green-100',
      border: 'border-green-200',
      chip: 'bg-green-100 text-green-700 border-green-200'
    },
    'APPROVED': {
      text: 'text-green-700',
      bg: 'bg-green-100',
      border: 'border-green-200',
      chip: 'bg-green-100 text-green-700 border-green-200'
    },
    
    // Gray - Exited/Completed
    'EXITED': {
      text: 'text-gray-700',
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      chip: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    'CHECKED_OUT': {
      text: 'text-gray-700',
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      chip: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    'COMPLETED': {
      text: 'text-gray-700',
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      chip: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    'EXPIRED': {
      text: 'text-gray-700',
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      chip: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    
    // Red - Revoked/Denied
    'REVOKED': {
      text: 'text-red-700',
      bg: 'bg-red-100',
      border: 'border-red-200',
      chip: 'bg-red-100 text-red-700 border-red-200'
    },
    'DENIED': {
      text: 'text-red-700',
      bg: 'bg-red-100',
      border: 'border-red-200',
      chip: 'bg-red-100 text-red-700 border-red-200'
    },
    'REJECTED': {
      text: 'text-red-700',
      bg: 'bg-red-100',
      border: 'border-red-200',
      chip: 'bg-red-100 text-red-700 border-red-200'
    },
    'BLOCKED': {
      text: 'text-red-700',
      bg: 'bg-red-100',
      border: 'border-red-200',
      chip: 'bg-red-100 text-red-700 border-red-200'
    },
    
    // Amber - Pending/Warning
    'PENDING': {
      text: 'text-amber-700',
      bg: 'bg-amber-100',
      border: 'border-amber-200',
      chip: 'bg-amber-100 text-amber-700 border-amber-200'
    },
    'PENDING_APPROVAL': {
      text: 'text-amber-700',
      bg: 'bg-amber-100',
      border: 'border-amber-200',
      chip: 'bg-amber-100 text-amber-700 border-amber-200'
    },
    'WAITING': {
      text: 'text-amber-700',
      bg: 'bg-amber-100',
      border: 'border-amber-200',
      chip: 'bg-amber-100 text-amber-700 border-amber-200'
    },
    
    // Default fallback
    'DEFAULT': {
      text: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      chip: 'bg-gray-50 text-gray-600 border-gray-200'
    }
  };
  
  const upperStatus = (status || '').toUpperCase().replace(/[- ]/g, '_');
  return statusMap[upperStatus] || statusMap.DEFAULT;
}

/**
 * Get a status badge/chip component class string
 * @param {string} status - The visitor status
 * @param {string} size - Size variant ('sm', 'md', 'lg')
 * @returns {string} Complete class string for a status chip
 */
export function getStatusChipClass(status, size = 'md') {
  const colors = getStatusColors(status);
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };
  
  return `${colors.chip} ${sizeClasses[size]} rounded-full font-medium border`;
}

/**
 * Get status icon
 * @param {string} status - The visitor status
 * @returns {string} Icon character or emoji for the status
 */
export function getStatusIcon(status) {
  const iconMap = {
    'CONFIRMED': '✓',
    'EXPECTED': '📅',
    'VERIFIED': '✓',
    'ON_PREMISE': '🟢',
    'CHECKED_IN': '➡️',
    'ACTIVE': '✅',
    'APPROVED': '✅',
    'EXITED': '⬅️',
    'CHECKED_OUT': '⬅️',
    'COMPLETED': '✓',
    'EXPIRED': '⏰',
    'REVOKED': '🚫',
    'DENIED': '❌',
    'REJECTED': '❌',
    'BLOCKED': '🔴',
    'PENDING': '⏳',
    'PENDING_APPROVAL': '⏳',
    'WAITING': '⏰'
  };
  
  const upperStatus = (status || '').toUpperCase().replace(/[- ]/g, '_');
  return iconMap[upperStatus] || '•';
}

/**
 * Status Chip React Component (for use in JSX)
 */
export const StatusChip = ({ status, size = 'md', showIcon = false, className = '' }) => {
  const chipClass = getStatusChipClass(status, size);
  const icon = showIcon ? getStatusIcon(status) : null;
  
  return `<span className="${chipClass} ${className}">
    ${icon ? `${icon} ` : ''}${status}
  </span>`;
};

const statusColorUtils = {
  getStatusColors,
  getStatusChipClass,
  getStatusIcon,
  StatusChip
};

export default statusColorUtils;
