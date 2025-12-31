// client/src/components/ui/index.js
import React from 'react';

// Phase 1: Enhanced UI Components (UI/UX Roadmap)
export { default as FloatingLabelInput } from './FloatingLabelInput.jsx';
export { default as GradientButton } from './GradientButton.jsx';
export { default as GradientCard } from './GradientCard.jsx';
export { default as StatCard } from './StatCard.jsx';

// Existing Components
export { default as Button } from './Button.jsx';
export { default as Input } from './Input.jsx';
export { default as Card } from './Card.jsx';
export { default as Badge } from './Badge.jsx';
export { default as EmptyState, UpcomingVisitsEmpty, RecentVisitorsEmpty, SearchEmpty, ErrorState } from './EmptyState.jsx';
export { default as EnhancedInput } from './EnhancedInput.jsx';
export { default as SuccessAnimation, VisitorCreatedSuccess, PassGeneratedSuccess, BulkInviteSuccess, DraftSavedSuccess } from './SuccessAnimation.jsx';
export { default as Progress } from './Progress.jsx';
export { default as Tooltip } from './Tooltip.jsx';
export { default as Toast } from './Toast.jsx';
export { default as Loading } from './Loading.jsx';
export { default as LoadingStates } from './LoadingStates.jsx';
export { default as Skeleton } from './Skeleton.jsx';
export { default as Modal } from './Modal.jsx';
export { default as FormField } from './FormField.jsx';
export { default as ErrorBoundary } from './ErrorBoundary.jsx';
export { default as Breadcrumbs } from './Breadcrumbs.jsx';
export { default as EnhancedBreadcrumbs } from './EnhancedBreadcrumbs.jsx';
export { default as PageHeader } from './PageHeader.jsx';
export { default as BottomNav } from './BottomNav.jsx';
export { default as FAB } from './FAB.jsx';
export { default as PageLayout, PageSection, PageGrid, MobileDesktopView, ActionBar } from './PageLayout.jsx';
export { default as FlowNavigation } from './FlowNavigation.jsx';
export { default as NavigationFlow } from './NavigationFlow.jsx';
export { default as NavigationAnalytics } from './NavigationAnalytics.jsx';
export { default as LiveRegion, StatusAnnouncement, AlertAnnouncement, LoadingAnnouncement } from './LiveRegion.jsx';
export { default as ErrorDisplay } from './ErrorDisplay.jsx';
export { default as SuccessDisplay } from './SuccessDisplay.jsx';
export { default as ErrorQueue } from './ErrorQueue.jsx';
// Lazy load heavy form components
export const FormWizard = React.lazy(() => import('./FormWizard.jsx'));
export const EnhancedFormWizard = React.lazy(() => import('./EnhancedFormWizard.jsx'));
export { default as FormStep } from './FormStep.jsx';
export { default as ProgressiveDisclosure } from './ProgressiveDisclosure.jsx';
export { default as ValidatedInput, ValidatedForm } from './ValidatedInput.jsx';
export { default as AdvancedValidatedInput } from './AdvancedValidatedInput.jsx';
export { default as ValidationSummary } from './ValidationSummary.jsx';
export { default as ResponsiveTable } from './ResponsiveTable.jsx'; // Added for Task 1.3
export { default as OptimizedImage } from './OptimizedImage.jsx'; // Added for Task 3.2
export { default as Dropdown } from './Dropdown.jsx'; // Added for Task 1.5
export { default as KeyboardShortcuts } from './KeyboardShortcuts.jsx'; // Added for Task 1.5
export { default as VirtualList } from './VirtualList.jsx';       // Added for Task 3.2
export { default as SearchBar } from './SearchBar.jsx'; // Added for Task 3.3
export { default as FilterPanel } from './FilterPanel.jsx'; // Added for Task 3.3
export { default as SearchFilter } from './SearchFilter.jsx'; // Added for Task 3.3
export { default as SearchResults } from './SearchResults.jsx'; // Added for Task 3.3
export { default as Pagination } from './Pagination.jsx'; // Added for Task 3.3
export { default as BrowserCompatibility } from './BrowserCompatibility.jsx'; // Added for Task 3.4
export { default as BrowserCompatibilityWarning } from './BrowserCompatibilityWarning.jsx'; // Added for Task 3.4
export { default as ThemeToggle, ThemeDropdown, ThemeRadioGroup } from './ThemeToggle.jsx'; // Dark Mode Toggle
export { default as NotificationBell } from './NotificationBell.jsx'; // Real-time Notifications
export { Alert, AlertTitle, AlertDescription } from './Alert.jsx';
export { Checkbox } from './Checkbox.jsx';
export { default as IconButton } from './IconButton.jsx';
export { Label } from './Label.jsx';
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './Select.jsx';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs.jsx';

// Enhanced Loading States (Task 2.6)
export { default as EnhancedLoading } from './EnhancedLoading.jsx';
export { default as AdvancedSkeleton } from './AdvancedSkeleton.jsx';
// Lazy load heavy loading components
export const LoadingStatesManager = React.lazy(() => import('./LoadingStatesManager.jsx'));
export const ProgressiveLoading = React.lazy(() => import('./ProgressiveLoading.jsx'));
export { 
  useLoadingIntegration,
  LoadingStatesProvider,
  PageLoadingWrapper,
  ComponentLoadingWrapper,
  ButtonLoadingWrapper,
  GlobalLoadingIndicator,
} from './LoadingStatesIntegration.jsx';

// Phase 4: UI/UX Improvements
export { default as EnhancedToast, Toast as EnhancedToastItem, ToastContainer } from './EnhancedToast.jsx';
export { default as BottomSheet } from './BottomSheet.jsx';
export { default as HelpTooltip } from './HelpTooltip.jsx';
export { default as GlobalStyles, SkipLink, FocusRing, Animated, TouchTarget } from './GlobalStyles.jsx';