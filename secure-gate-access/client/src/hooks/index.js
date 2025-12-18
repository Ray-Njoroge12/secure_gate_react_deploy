/**
 * Hooks Index
 * Export all custom React hooks
 */

// Core Hooks
export { useCurrentRole } from './useCurrentRole';
export { useDebounce } from './useDebounce';
export { useLoadingState } from './useLoadingState';
export { useLoadingStates } from './useLoadingStates';

// Form Hooks
export { useApiForm } from './useApiForm';
export { useFormValidation } from './useFormValidation';
export { useAdvancedValidation } from './useAdvancedValidation';

// API and Data Hooks
export { useSearch, useSearchData } from './useSearch';
export { useErrorHandler } from './useErrorHandler';

// Real-time Hooks
export { default as useWebSocket, useNotifications, useSecurityAlerts } from './useWebSocket';
export { useVisitorEvents as useWSVisitorEvents } from './useWebSocket';
export { 
  useVisitorEvents,
  useResidentVisitorEvents,
  useGuardVisitorEvents,
  useAdminVisitorEvents,
  VISITOR_EVENTS 
} from './useVisitorEvents';
export { default as usePushNotifications } from './usePushNotifications';

// UI/UX Hooks
export { useAccessibility } from './useAccessibility';
export { useBrowserCompatibility } from './useBrowserCompatibility';
