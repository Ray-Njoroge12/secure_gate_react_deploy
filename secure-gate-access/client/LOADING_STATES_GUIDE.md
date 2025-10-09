# Enhanced Loading States Guide

This guide provides comprehensive documentation for the enhanced loading states system implemented in the SecureGate application.

## 📋 Overview

The enhanced loading states system provides:
- **Contextual Loading Messages**: Different messages for different loading types
- **Progressive Loading**: Load critical content first, then secondary content
- **Skeleton Screens**: Realistic loading placeholders
- **Performance Monitoring**: Track loading times and optimize user experience
- **Error Handling**: Graceful error states with retry options
- **Accessibility**: Screen reader support and keyboard navigation

## 🚀 Quick Start

### 1. Basic Usage

```jsx
import { EnhancedLoading, AdvancedSkeleton } from '../components/ui';

// Simple loading spinner
<EnhancedLoading 
  type="initial" 
  message="Loading data..." 
  size="md" 
/>

// Skeleton screen
<AdvancedSkeleton.Card lines={3} showAvatar />
```

### 2. Using Loading Hooks

```jsx
import { useLoadingStates, LOADING_TYPES } from '../hooks/useLoadingStates';

function MyComponent() {
  const {
    loadingState,
    startLoading,
    completeLoading,
    handleError,
  } = useLoadingStates({
    type: LOADING_TYPES.SUBMIT,
    message: 'Submitting form...',
    showProgress: true,
  });

  const handleSubmit = async () => {
    try {
      startLoading();
      await submitForm();
      completeLoading({ success: true, message: 'Form submitted successfully!' });
    } catch (error) {
      handleError(error, 'Failed to submit form');
    }
  };

  return (
    <div>
      {loadingState.isActive && (
        <EnhancedLoading
          type={loadingState.type}
          message={loadingState.message}
          progress={loadingState.progress}
        />
      )}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

### 3. Using Loading Wrappers

```jsx
import { 
  PageLoadingWrapper, 
  ComponentLoadingWrapper, 
  ButtonLoadingWrapper 
} from '../components/ui';

// Page-level loading
<PageLoadingWrapper 
  loadingKey="visitor-history"
  skeletonVariant="table"
>
  <VisitorHistoryTable />
</PageLoadingWrapper>

// Component-level loading
<ComponentLoadingWrapper 
  loadingKey="user-profile"
  skeletonVariant="card"
>
  <UserProfile />
</ComponentLoadingWrapper>

// Button loading
<ButtonLoadingWrapper 
  loadingKey="save-changes"
  loadingType="submit"
  onClick={handleSave}
>
  Save Changes
</ButtonLoadingWrapper>
```

## 🎨 Loading Components

### EnhancedLoading

The main loading component with multiple variants and configurations.

```jsx
<EnhancedLoading
  // Loading state
  type="submit"                    // Loading type
  message="Submitting..."          // Custom message
  progress={75}                    // Progress percentage
  showProgress={true}              // Show progress bar
  
  // Visual appearance
  variant="spinner"                // spinner, dots, pulse, progress, wave
  size="md"                        // sm, md, lg, xl
  overlay={false}                  // Show as overlay
  fullscreen={false}               // Fullscreen overlay
  
  // Interaction
  allowCancel={true}               // Allow cancellation
  onCancel={handleCancel}          // Cancel handler
  
  // State
  isActive={true}                  // Loading state
  success={false}                  // Success state
  error={null}                     // Error state
  cancelled={false}                // Cancelled state
  
  // Styling
  className="custom-class"         // Custom CSS classes
  messageClassName="text-lg"       // Message styling
  progressClassName="h-3"          // Progress bar styling
  
  // Accessibility
  ariaLabel="Loading form"         // Screen reader label
  ariaLive="polite"                // Live region politeness
/>
```

### AdvancedSkeleton

Realistic skeleton screens for different content types.

```jsx
// Card skeleton
<AdvancedSkeleton.Card 
  lines={3}                        // Number of text lines
  showAvatar={true}                // Show avatar placeholder
  showActions={true}               // Show action buttons
  variant="default"                // default, compact, minimal
/>

// Table skeleton
<AdvancedSkeleton.Table 
  rows={5}                         // Number of rows
  columns={4}                      // Number of columns
  showHeader={true}                // Show header row
  variant="default"                // default, compact
/>

// Form skeleton
<AdvancedSkeleton.Form 
  fields={4}                       // Number of form fields
  showSubmit={true}                // Show submit button
  variant="default"                // default, inline, compact
/>

// List skeleton
<AdvancedSkeleton.List 
  items={5}                        // Number of list items
  showAvatar={true}                // Show avatar placeholders
  variant="default"                // default, compact, minimal
/>

// Dashboard skeleton
<AdvancedSkeleton.Dashboard 
  variant="default"                // default, compact
/>

// Chart skeleton
<AdvancedSkeleton.Chart 
  type="line"                      // line, bar, pie
  height="300px"                   // Chart height
/>
```

### ProgressiveLoading

Progressive loading with multiple phases.

```jsx
<ProgressiveLoading
  phases={['initial', 'critical', 'secondary', 'complete']}
  onPhaseComplete={(phase, data) => console.log('Phase complete:', phase)}
  onAllPhasesComplete={(data) => console.log('All phases complete')}
  autoAdvance={true}
  phaseTimeout={1000}
>
  <MyContent />
</ProgressiveLoading>

// Critical content loader
<ProgressiveLoading.Critical
  onLoad={loadCriticalData}
  fallback={<AdvancedSkeleton.Card />}
>
  <CriticalContent />
</ProgressiveLoading.Critical>

// Secondary content loader
<ProgressiveLoading.Secondary
  onLoad={loadSecondaryData}
  delay={300}
  fallback={<AdvancedSkeleton.List />}
>
  <SecondaryContent />
</ProgressiveLoading.Secondary>

// Lazy content loader
<ProgressiveLoading.Lazy
  onLoad={loadLazyData}
  threshold={0.1}
  rootMargin="50px"
  fallback={<AdvancedSkeleton.Chart />}
>
  <LazyContent />
</ProgressiveLoading.Lazy>
```

## 🔧 Loading Hooks

### useLoadingStates

Main hook for managing loading states.

```jsx
const {
  // State
  loadingState,                    // Current loading state
  isActive,                        // Is currently loading
  progress,                        // Progress percentage
  message,                         // Loading message
  error,                           // Error message
  success,                         // Success state
  cancelled,                       // Cancelled state
  duration,                        // Loading duration
  retryCount,                      // Retry count
  
  // Actions
  startLoading,                    // Start loading
  updateProgress,                  // Update progress
  completeLoading,                 // Complete loading
  handleError,                     // Handle error
  cancelLoading,                   // Cancel loading
  resetLoading,                    // Reset loading state
  retry,                           // Retry loading
  
  // Utilities
  isLoading,                       // Is loading (from context)
  canCancel,                       // Can be cancelled
  canRetry,                        // Can be retried
  isLongRunning,                   // Is long running operation
  isSuccess,                       // Is successful
  isError,                         // Has error
  isCancelled,                     // Was cancelled
} = useLoadingStates({
  type: LOADING_TYPES.SUBMIT,
  priority: LOADING_PRIORITIES.HIGH,
  message: 'Submitting form...',
  showProgress: true,
  allowCancel: true,
  autoRetry: true,
  persistState: false,
  onComplete: (result) => console.log('Complete:', result),
  onError: (error) => console.error('Error:', error),
  onCancel: () => console.log('Cancelled'),
});
```

### useProgressiveLoading

Hook for progressive loading with multiple phases.

```jsx
const {
  currentPhase,                    // Current loading phase
  completedPhases,                 // Completed phases
  phaseData,                       // Phase-specific data
  isLoading,                       // Is currently loading
  error,                           // Error state
  completePhase,                   // Complete a phase
  setPhaseError,                   // Set phase error
  advancePhase,                    // Advance to next phase
} = useProgressiveLoading({
  phases: ['initial', 'critical', 'secondary', 'complete'],
  onPhaseComplete: (phase, data) => console.log('Phase complete:', phase),
  onAllPhasesComplete: (data) => console.log('All complete'),
  autoAdvance: true,
  phaseTimeout: 1000,
});
```

### useLoadingPerformance

Hook for monitoring loading performance.

```jsx
const {
  metrics,                         // Performance metrics
  startLoading,                    // Start timing
  startPhase,                      // Start phase timing
  endPhase,                        // End phase timing
  endLoading,                      // End timing
} = useLoadingPerformance();

// Usage
useEffect(() => {
  startLoading();
  startPhase('data-fetch');
  
  // ... loading logic ...
  
  endPhase('data-fetch');
  endLoading();
}, []);
```

## 📊 Loading Types and Priorities

### Loading Types

```jsx
export const LOADING_TYPES = {
  INITIAL: 'initial',              // Initial loading
  REFRESH: 'refresh',              // Refreshing data
  SUBMIT: 'submit',                // Form submission
  UPLOAD: 'upload',                // File upload
  DOWNLOAD: 'download',            // File download
  SEARCH: 'search',                // Search operation
  FILTER: 'filter',                // Filtering data
  SAVE: 'save',                    // Saving data
  DELETE: 'delete',                // Deleting data
  EXPORT: 'export',                // Exporting data
  IMPORT: 'import',                // Importing data
  SYNC: 'sync',                    // Synchronizing
  VALIDATE: 'validate',            // Validation
  PROCESS: 'process',              // Processing
  GENERATE: 'generate',            // Generating content
  ANALYZE: 'analyze',              // Analysis
  CALCULATE: 'calculate',          // Calculations
  RENDER: 'render',                // Rendering
  TRANSFORM: 'transform',          // Data transformation
  MIGRATE: 'migrate',              // Migration
  BACKUP: 'backup',                // Backup
  RESTORE: 'restore',              // Restore
};
```

### Loading Priorities

```jsx
export const LOADING_PRIORITIES = {
  LOW: 'low',                      // Low priority
  NORMAL: 'normal',                // Normal priority
  HIGH: 'high',                    // High priority
  CRITICAL: 'critical',            // Critical priority
};
```

## 🎯 Best Practices

### 1. Use Appropriate Loading Types

```jsx
// ✅ Good - Specific loading type
<EnhancedLoading type="submit" message="Submitting form..." />

// ❌ Bad - Generic loading type
<EnhancedLoading type="initial" message="Loading..." />
```

### 2. Provide Contextual Messages

```jsx
// ✅ Good - Contextual message
<EnhancedLoading 
  type="upload" 
  message="Uploading profile picture..." 
/>

// ❌ Bad - Generic message
<EnhancedLoading 
  type="upload" 
  message="Loading..." 
/>
```

### 3. Use Skeleton Screens for Long Operations

```jsx
// ✅ Good - Skeleton for long loading
<AdvancedSkeleton.Table rows={5} columns={4} />

// ❌ Bad - Spinner for long loading
<EnhancedLoading type="initial" message="Loading data..." />
```

### 4. Implement Progressive Loading

```jsx
// ✅ Good - Progressive loading
<ProgressiveLoading>
  <ProgressiveLoading.Critical onLoad={loadCriticalData}>
    <CriticalContent />
  </ProgressiveLoading.Critical>
  <ProgressiveLoading.Secondary onLoad={loadSecondaryData}>
    <SecondaryContent />
  </ProgressiveLoading.Secondary>
</ProgressiveLoading>

// ❌ Bad - All-or-nothing loading
<EnhancedLoading type="initial" message="Loading everything..." />
```

### 5. Handle Errors Gracefully

```jsx
// ✅ Good - Error handling with retry
const { handleError, retry, canRetry } = useLoadingStates({
  autoRetry: true,
  onError: (error) => {
    console.error('Loading error:', error);
    // Show error message to user
  },
});

if (canRetry) {
  <button onClick={retry}>Retry</button>
}
```

### 6. Use Loading Wrappers for Consistency

```jsx
// ✅ Good - Consistent loading patterns
<PageLoadingWrapper loadingKey="visitor-history" skeletonVariant="table">
  <VisitorHistoryTable />
</PageLoadingWrapper>

// ❌ Bad - Inconsistent loading patterns
<div>
  {loading ? <Spinner /> : <VisitorHistoryTable />}
</div>
```

## 🔍 Performance Optimization

### 1. Minimize Loading States

```jsx
// ✅ Good - Single loading state for related operations
const { startLoading, completeLoading } = useLoadingStates({
  type: LOADING_TYPES.SUBMIT,
});

const handleSubmit = async () => {
  startLoading();
  await Promise.all([
    saveFormData(),
    updateUserProfile(),
    sendNotification(),
  ]);
  completeLoading({ success: true });
};

// ❌ Bad - Multiple loading states for related operations
const [saving, setUpdating, setNotifying] = useState([false, false, false]);
```

### 2. Use Lazy Loading for Non-Critical Content

```jsx
// ✅ Good - Lazy load non-critical content
<ProgressiveLoading.Lazy
  onLoad={loadAnalytics}
  threshold={0.1}
  fallback={<AdvancedSkeleton.Chart />}
>
  <AnalyticsChart />
</ProgressiveLoading.Lazy>
```

### 3. Implement Loading Timeouts

```jsx
// ✅ Good - Timeout for long operations
const { startLoading } = useLoadingStates({
  type: LOADING_TYPES.SEARCH,
  timeout: 10000, // 10 seconds
  onError: (error) => {
    if (error === 'Timeout') {
      // Handle timeout
    }
  },
});
```

## 🧪 Testing Loading States

### 1. Test Loading States

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { EnhancedLoading } from '../components/ui';

test('renders loading state', () => {
  render(
    <EnhancedLoading 
      type="submit" 
      message="Submitting..." 
      isActive={true} 
    />
  );
  
  expect(screen.getByText('Submitting...')).toBeInTheDocument();
  expect(screen.getByRole('status')).toBeInTheDocument();
});
```

### 2. Test Skeleton Screens

```jsx
test('renders skeleton screen', () => {
  render(<AdvancedSkeleton.Card lines={3} />);
  
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

### 3. Test Loading Hooks

```jsx
import { renderHook, act } from '@testing-library/react';
import { useLoadingStates } from '../hooks/useLoadingStates';

test('loading hook works correctly', () => {
  const { result } = renderHook(() => useLoadingStates({
    type: 'submit',
  }));

  expect(result.current.isActive).toBe(false);

  act(() => {
    result.current.startLoading();
  });

  expect(result.current.isActive).toBe(true);
  expect(result.current.message).toBe('Submitting...');
});
```

## 📱 Mobile Considerations

### 1. Touch-Friendly Loading States

```jsx
// ✅ Good - Touch-friendly loading buttons
<ButtonLoadingWrapper 
  loadingKey="save"
  className="min-h-[44px] min-w-[44px]"
>
  Save
</ButtonLoadingWrapper>
```

### 2. Responsive Skeleton Screens

```jsx
// ✅ Good - Responsive skeleton
<AdvancedSkeleton.Card 
  lines={3}
  className="w-full md:w-1/2 lg:w-1/3"
/>
```

### 3. Mobile-Optimized Loading Messages

```jsx
// ✅ Good - Concise mobile messages
<EnhancedLoading 
  type="upload" 
  message="Uploading..." 
  className="text-sm md:text-base"
/>
```

## 🎨 Customization

### 1. Custom Loading Animations

```jsx
// Custom spinner component
const CustomSpinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
);

// Use in EnhancedLoading
<EnhancedLoading
  type="submit"
  message="Submitting..."
  customAnimation={<CustomSpinner />}
/>
```

### 2. Custom Skeleton Patterns

```jsx
// Custom skeleton component
const CustomSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
    <div className="space-y-2">
      <div className="h-4 bg-slate-200 rounded"></div>
      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
    </div>
  </div>
);
```

### 3. Custom Loading Messages

```jsx
// Custom message component
const CustomMessage = ({ message, progress }) => (
  <div className="text-center">
    <p className="text-lg font-medium">{message}</p>
    {progress && (
      <div className="mt-2 text-sm text-slate-500">
        {Math.round(progress)}% complete
      </div>
    )}
  </div>
);
```

## 🚨 Troubleshooting

### Common Issues

1. **Loading state not updating**
   - Check if the loading key is unique
   - Verify the loading hook is properly configured
   - Ensure the component is wrapped in the loading provider

2. **Skeleton screen not showing**
   - Check if the skeleton variant is correct
   - Verify the loading state is active
   - Ensure the skeleton component is imported

3. **Progress not updating**
   - Check if `showProgress` is enabled
   - Verify the progress value is between 0 and 100
   - Ensure the progress is being updated correctly

4. **Error state not clearing**
   - Check if the error is being handled properly
   - Verify the error timeout is set correctly
   - Ensure the error state is being reset

### Debug Tips

1. **Enable loading debug mode**
   ```jsx
   const { loadingState } = useLoadingStates({
     debug: true, // Enable debug logging
   });
   ```

2. **Monitor loading performance**
   ```jsx
   const { metrics } = useLoadingPerformance();
   console.log('Loading metrics:', metrics);
   ```

3. **Check loading state in dev tools**
   ```jsx
   // Add to component
   useEffect(() => {
     console.log('Loading state:', loadingState);
   }, [loadingState]);
   ```

## 📚 Additional Resources

- [Loading States API Reference](./api/loading-states.md)
- [Skeleton Screen Patterns](./patterns/skeleton-screens.md)
- [Progressive Loading Guide](./guides/progressive-loading.md)
- [Performance Optimization](./guides/performance.md)
- [Accessibility Guidelines](./guides/accessibility.md)

---

**Happy Loading! 🚀**

For questions or support, please refer to the project documentation or contact the development team.




