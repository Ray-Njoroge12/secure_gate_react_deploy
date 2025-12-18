/**
 * Component bundles for better code splitting and performance
 * This file groups related components to reduce bundle size and improve loading performance
 */

// UI Components Bundle - Core UI components used across the app
export { default as Button } from '../ui/Button';
export { default as Input } from '../ui/Input';
export { default as Card } from '../ui/Card';
export { default as Badge } from '../ui/Badge';
export { default as Progress } from '../ui/Progress';
export { default as Tooltip } from '../ui/Tooltip';
export { default as Toast } from '../ui/Toast';
export { default as Loading } from '../ui/Loading';
export { default as Skeleton } from '../ui/Skeleton';
export { default as Modal } from '../ui/Modal';
export { default as Dropdown } from '../ui/Dropdown';

// Form Components Bundle - Form-related components
export { default as ValidatedInput } from '../ui/ValidatedInput';
export { default as ValidatedForm } from '../ui/ValidatedForm';
export { default as AdvancedValidatedInput } from '../ui/AdvancedValidatedInput';
export { default as ValidationSummary } from '../ui/ValidationSummary';
export { default as FormField } from '../ui/FormField';
export { default as FormWizard } from '../ui/FormWizard';
export { default as EnhancedFormWizard } from '../ui/EnhancedFormWizard';
export { default as FormStep } from '../ui/FormStep';

// Navigation Components Bundle - Navigation and routing components
export { default as Sidebar } from '../Sidebar';
export { default as Topbar } from '../Topbar';
export { default as Layout } from '../Layout';
export { default as Breadcrumbs } from '../ui/Breadcrumbs';
export { default as EnhancedBreadcrumbs } from '../ui/EnhancedBreadcrumbs';
export { default as NavigationFlow } from '../ui/NavigationFlow';
export { default as NavigationAnalytics } from '../ui/NavigationAnalytics';
export { default as FlowNavigation } from '../ui/FlowNavigation';

// Data Display Components Bundle - Tables, lists, and data visualization
export { default as ResponsiveTable } from '../ui/ResponsiveTable';
export { default as VirtualList } from '../ui/VirtualList';
export { default as Pagination } from '../Pagination';
export { default as SearchFilter } from '../SearchFilter';
export { default as SearchResults } from '../SearchResults';

// Error and Loading Components Bundle - Error handling and loading states
export { default as ErrorBoundary } from '../ui/ErrorBoundary';
export { default as ErrorDisplay } from '../ui/ErrorDisplay';
export { default as SuccessDisplay } from '../ui/SuccessDisplay';
export { default as ErrorQueue } from '../ui/ErrorQueue';
export { default as EnhancedLoading } from '../ui/EnhancedLoading';
export { default as AdvancedSkeleton } from '../ui/AdvancedSkeleton';
export { default as ProgressiveLoading } from '../ui/ProgressiveLoading';
export { default as LoadingStatesManager } from '../ui/LoadingStatesManager';

// Utility Components Bundle - Helper and utility components
export { default as QRCodeDisplay } from '../QRCodeDisplay';
export { default as KeyboardShortcuts } from '../ui/KeyboardShortcuts';
export { default as LiveRegion } from '../ui/LiveRegion';
export { default as BrowserCompatibility } from '../BrowserCompatibility';
export { default as BrowserCompatibilityWarning } from '../BrowserCompatibilityWarning';
export { default as OptimizedImage } from '../ui/OptimizedImage';

// Loading States Integration Bundle
export {
  useLoadingIntegration,
  LoadingStatesProvider,
  PageLoadingWrapper,
  ComponentLoadingWrapper,
  ButtonLoadingWrapper,
  GlobalLoadingIndicator,
} from '../ui/LoadingStatesIntegration';



