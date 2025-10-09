# Component Documentation

This document provides comprehensive documentation for all React components in the Secure Gate Access application.

## Table of Contents

- [UI Components](#ui-components)
- [Layout Components](#layout-components)
- [Page Components](#page-components)
- [Context Providers](#context-providers)
- [Hooks](#hooks)
- [Utilities](#utilities)

## UI Components

### Button

A versatile button component with multiple variants and sizes.

```jsx
import { Button } from './components/ui';

<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
```

**Props:**
- `variant` (string): Button style variant
  - `primary`: Primary action button (blue)
  - `secondary`: Secondary action button (gray)
  - `ghost`: Transparent button with hover effects
  - `destructive`: Destructive action button (red)
- `size` (string): Button size
  - `sm`: Small button (32px height)
  - `md`: Medium button (40px height)
  - `lg`: Large button (48px height)
- `disabled` (boolean): Disable button interaction
- `loading` (boolean): Show loading spinner
- `icon` (ReactNode): Icon to display before text
- `onClick` (function): Click handler
- `className` (string): Additional CSS classes

**Accessibility:**
- Supports keyboard navigation (Space, Enter)
- ARIA attributes for screen readers
- Focus indicators for keyboard users

### Input

A form input component with validation states and error handling.

```jsx
import { Input } from './components/ui';

<Input
  type="email"
  label="Email Address"
  placeholder="Enter your email"
  value={email}
  onChange={setEmail}
  error={emailError}
  required
/>
```

**Props:**
- `type` (string): Input type (text, email, password, etc.)
- `label` (string): Input label
- `placeholder` (string): Placeholder text
- `value` (string): Input value
- `onChange` (function): Change handler
- `error` (string): Error message to display
- `required` (boolean): Mark as required field
- `disabled` (boolean): Disable input
- `helperText` (string): Helper text below input
- `icon` (ReactNode): Icon to display in input
- `className` (string): Additional CSS classes

**Validation States:**
- `default`: Normal state
- `error`: Error state with red styling
- `success`: Success state with green styling
- `warning`: Warning state with yellow styling

### Card

A container component for grouping related content.

```jsx
import { Card } from './components/ui';

<Card>
  <Card.Header>
    <h3>Card Title</h3>
  </Card.Header>
  <Card.Content>
    <p>Card content goes here</p>
  </Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>
```

**Props:**
- `variant` (string): Card style variant
  - `default`: Standard card with border
  - `elevated`: Card with shadow
  - `outlined`: Card with border only
- `padding` (string): Padding size
  - `sm`: Small padding (16px)
  - `md`: Medium padding (24px)
  - `lg`: Large padding (32px)
- `className` (string): Additional CSS classes

**Sub-components:**
- `Card.Header`: Card header section
- `Card.Content`: Card main content
- `Card.Footer`: Card footer section

### Badge

A small status indicator component.

```jsx
import { Badge } from './components/ui';

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Error</Badge>
```

**Props:**
- `variant` (string): Badge color variant
  - `success`: Green badge
  - `warning`: Yellow badge
  - `error`: Red badge
  - `info`: Blue badge
  - `outline`: Outlined badge
- `size` (string): Badge size
  - `sm`: Small badge
  - `md`: Medium badge
  - `lg`: Large badge
- `className` (string): Additional CSS classes

### Modal

A modal dialog component for overlays and confirmations.

```jsx
import { Modal } from './components/ui';

<Modal
  isOpen={isModalOpen}
  onClose={closeModal}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure you want to proceed?</p>
  <div className="flex gap-2">
    <Button onClick={handleConfirm}>Confirm</Button>
    <Button variant="ghost" onClick={closeModal}>Cancel</Button>
  </div>
</Modal>
```

**Props:**
- `isOpen` (boolean): Whether modal is open
- `onClose` (function): Close handler
- `title` (string): Modal title
- `size` (string): Modal size
  - `sm`: Small modal (400px)
  - `md`: Medium modal (600px)
  - `lg`: Large modal (800px)
  - `xl`: Extra large modal (1000px)
- `closable` (boolean): Show close button (default: true)
- `backdrop` (boolean): Show backdrop (default: true)
- `className` (string): Additional CSS classes

**Accessibility:**
- Focus trap when open
- Escape key to close
- ARIA attributes for screen readers
- Focus management

### Loading

A loading spinner component with customizable size and text.

```jsx
import { Loading } from './components/ui';

<Loading size="md" text="Loading data..." />
```

**Props:**
- `size` (string): Loading spinner size
  - `sm`: Small spinner (20px)
  - `md`: Medium spinner (32px)
  - `lg`: Large spinner (48px)
- `text` (string): Loading text to display
- `className` (string): Additional CSS classes

### Skeleton

A skeleton loading component for placeholder content.

```jsx
import { Skeleton } from './components/ui';

<Skeleton.Text className="w-3/4" />
<Skeleton.Avatar className="h-10 w-10" />
<Skeleton.Card>
  <Skeleton.Text className="w-1/2" />
  <Skeleton.Text className="w-full" />
</Skeleton.Card>
```

**Props:**
- `className` (string): Additional CSS classes

**Sub-components:**
- `Skeleton.Text`: Text skeleton
- `Skeleton.Avatar`: Avatar skeleton
- `Skeleton.Card`: Card skeleton
- `Skeleton.ListItem`: List item skeleton
- `Skeleton.Table`: Table skeleton

### Toast

A toast notification component for temporary messages.

```jsx
import { Toast } from './components/ui';

<Toast
  type="success"
  title="Success"
  message="Operation completed successfully"
  duration={5000}
  onClose={handleClose}
/>
```

**Props:**
- `type` (string): Toast type
  - `success`: Success toast (green)
  - `error`: Error toast (red)
  - `warning`: Warning toast (yellow)
  - `info`: Info toast (blue)
- `title` (string): Toast title
- `message` (string): Toast message
- `duration` (number): Auto-close duration in ms
- `onClose` (function): Close handler
- `className` (string): Additional CSS classes

## Layout Components

### AppShell

The main application shell that provides the overall layout structure.

```jsx
import AppShell from './layouts/AppShell';

<AppShell
  role="resident"
  title="Dashboard"
  onLogout={handleLogout}
>
  <DashboardContent />
</AppShell>
```

**Props:**
- `role` (string): User role (resident, guard, admin)
- `title` (string): Page title
- `onLogout` (function): Logout handler
- `children` (ReactNode): Page content
- `className` (string): Additional CSS classes

**Features:**
- Responsive sidebar navigation
- Top navigation bar
- Role-based navigation
- Mobile menu support
- Keyboard shortcuts

### AuthLayout

A layout component for authentication pages.

```jsx
import AuthLayout from './layouts/AuthLayout';

<AuthLayout title="Sign In">
  <LoginForm />
</AuthLayout>
```

**Props:**
- `title` (string): Page title
- `subtitle` (string): Page subtitle
- `children` (ReactNode): Form content
- `className` (string): Additional CSS classes

**Features:**
- Centered card layout
- Responsive design
- Consistent styling
- Accessibility support

## Page Components

### ResidentDashboard

The main dashboard for residents to manage visitors.

```jsx
import ResidentDashboard from './pages/resident/ResidentDashboard';

<ResidentDashboard />
```

**Features:**
- Upcoming visitor invitations
- Recent visitor history
- Quick action buttons
- Real-time updates
- Responsive design

**Sections:**
- Header with page title and actions
- Upcoming invites card
- Recent visitors card
- Quick action grid
- Navigation to other pages

### GuardDashboard

The main dashboard for guards to manage visitor access.

```jsx
import GuardDashboard from './pages/guard/GuardDashboard';

<GuardDashboard />
```

**Features:**
- Active visitors list
- Check-in/check-out functionality
- QR code scanning
- Real-time updates
- Mobile-optimized interface

**Sections:**
- Header with guard information
- Active visitors list
- Quick actions
- Real-time notifications

### AdminDashboard

The main dashboard for administrators to manage the system.

```jsx
import AdminDashboard from './pages/admin/AdminDashboard';

<AdminDashboard />
```

**Features:**
- System metrics
- User management
- Visitor statistics
- Audit logs
- System configuration

**Sections:**
- Metrics overview
- User management
- Visitor statistics
- System logs
- Configuration options

## Context Providers

### AuthProvider

Provides authentication state and methods throughout the application.

```jsx
import { AuthProvider } from './context/AuthContext';

<AuthProvider>
  <App />
</AuthProvider>
```

**Context Value:**
- `user` (object): Current user information
- `isAuthenticated` (boolean): Authentication status
- `login` (function): Login method
- `logout` (function): Logout method
- `register` (function): Registration method
- `loading` (boolean): Authentication loading state

### ErrorProvider

Provides error handling state and methods throughout the application.

```jsx
import { ErrorProvider } from './contexts/ErrorContext';

<ErrorProvider>
  <App />
</ErrorProvider>
```

**Context Value:**
- `errors` (array): Current errors
- `handleError` (function): Add error method
- `handleSuccess` (function): Add success message
- `clearError` (function): Clear specific error
- `clearAllErrors` (function): Clear all errors

### LoadingProvider

Provides loading state management throughout the application.

```jsx
import { LoadingProvider } from './contexts/LoadingContext';

<LoadingProvider>
  <App />
</LoadingProvider>
```

**Context Value:**
- `isLoading` (boolean): Global loading state
- `loadingMessage` (string): Loading message
- `startLoading` (function): Start loading
- `stopLoading` (function): Stop loading
- `setLoadingError` (function): Set loading error

### SearchProvider

Provides search and filtering functionality throughout the application.

```jsx
import { SearchProvider } from './contexts/SearchContext';

<SearchProvider>
  <App />
</SearchProvider>
```

**Context Value:**
- `searchTerm` (string): Current search term
- `filters` (object): Current filters
- `setSearchTerm` (function): Set search term
- `setFilters` (function): Set filters
- `clearSearch` (function): Clear search
- `clearFilters` (function): Clear filters

## Hooks

### useAuth

A hook for accessing authentication state and methods.

```jsx
import { useAuth } from './hooks/useAuth';

const { user, isAuthenticated, login, logout } = useAuth();
```

**Returns:**
- `user` (object): Current user information
- `isAuthenticated` (boolean): Authentication status
- `login` (function): Login method
- `logout` (function): Logout method
- `register` (function): Registration method
- `loading` (boolean): Authentication loading state

### useError

A hook for accessing error handling state and methods.

```jsx
import { useError } from './hooks/useError';

const { handleError, handleSuccess, clearAllErrors } = useError();
```

**Returns:**
- `errors` (array): Current errors
- `handleError` (function): Add error method
- `handleSuccess` (function): Add success message
- `clearError` (function): Clear specific error
- `clearAllErrors` (function): Clear all errors

### useLoadingState

A hook for accessing loading state management.

```jsx
import { useLoadingState } from './hooks/useLoadingState';

const { isLoading, startLoading, stopLoading } = useLoadingState();
```

**Returns:**
- `isLoading` (boolean): Loading state
- `loadingMessage` (string): Loading message
- `startLoading` (function): Start loading
- `stopLoading` (function): Stop loading
- `setLoadingError` (function): Set loading error

### useSearch

A hook for accessing search and filtering functionality.

```jsx
import { useSearch } from './hooks/useSearch';

const { searchTerm, setSearchTerm, filters, setFilters } = useSearch();
```

**Returns:**
- `searchTerm` (string): Current search term
- `filters` (object): Current filters
- `setSearchTerm` (function): Set search term
- `setFilters` (function): Set filters
- `clearSearch` (function): Clear search
- `clearFilters` (function): Clear filters

### useBrowserCompatibility

A hook for accessing browser compatibility information.

```jsx
import { useBrowserCompatibility } from './hooks/useBrowserCompatibility';

const { isSupported, supportsFeature, browserInfo } = useBrowserCompatibility();
```

**Returns:**
- `isSupported` (boolean): Browser support status
- `supportsFeature` (function): Check feature support
- `browserInfo` (object): Browser information
- `capabilities` (object): Browser capabilities
- `issues` (array): Compatibility issues
- `recommendations` (array): Browser recommendations

## Utilities

### API Utilities

Functions for making API calls with proper error handling.

```jsx
import { api } from './utils/api';

// GET request
const data = await api.get('/visitors');

// POST request
const result = await api.post('/visitors', visitorData);

// PUT request
const updated = await api.put('/visitors/123', updateData);

// DELETE request
await api.delete('/visitors/123');
```

**Features:**
- Automatic token handling
- Error handling and mapping
- Request/response interceptors
- Loading state management
- Retry logic for failed requests

### Validation Utilities

Functions for form validation and data validation.

```jsx
import { validateEmail, validatePhone, validateRequired } from './utils/validation';

const emailError = validateEmail(email);
const phoneError = validatePhone(phone);
const requiredError = validateRequired(value, 'Field is required');
```

**Validation Functions:**
- `validateEmail`: Email format validation
- `validatePhone`: Phone number validation
- `validateRequired`: Required field validation
- `validatePassword`: Password strength validation
- `validateDate`: Date format validation

### Error Mapping

Functions for mapping API errors to user-friendly messages.

```jsx
import { mapError } from './utils/errorMapper';

const userMessage = mapError(error);
```

**Features:**
- API error code mapping
- User-friendly error messages
- Localization support
- Error categorization

### Performance Utilities

Functions for performance optimization and monitoring.

```jsx
import { debounce, throttle, memoize } from './utils/performance';

const debouncedSearch = debounce(searchFunction, 300);
const throttledScroll = throttle(scrollFunction, 100);
const memoizedResult = memoize(expensiveFunction);
```

**Performance Functions:**
- `debounce`: Debounce function calls
- `throttle`: Throttle function calls
- `memoize`: Memoize function results
- `lazyLoad`: Lazy load components
- `virtualScroll`: Virtual scrolling for large lists

## Styling

### Design System

The application uses a comprehensive design system built on Tailwind CSS.

**Color Palette:**
- Primary: Blue (#3b82f6)
- Secondary: Gray (#6b7280)
- Success: Green (#10b981)
- Warning: Yellow (#f59e0b)
- Error: Red (#ef4444)

**Typography:**
- Headings: Inter font family
- Body: System font stack
- Sizes: 12px, 14px, 16px, 18px, 20px, 24px, 32px

**Spacing:**
- Base unit: 4px
- Scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px

### Responsive Design

All components are built with mobile-first responsive design.

**Breakpoints:**
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

**Responsive Utilities:**
- `useScreenSize`: Hook for screen size detection
- `useBreakpoint`: Hook for breakpoint detection
- `getResponsiveClasses`: Utility for responsive classes

### Accessibility

All components are built with accessibility in mind.

**Features:**
- ARIA attributes
- Keyboard navigation
- Screen reader support
- Focus management
- Color contrast compliance

**Accessibility Utilities:**
- `useFocusManagement`: Hook for focus management
- `useAriaAttributes`: Hook for ARIA attributes
- `useKeyboardNavigation`: Hook for keyboard navigation

## Testing

### Component Testing

All components include comprehensive tests.

**Test Types:**
- Unit tests for component logic
- Integration tests for component interactions
- Accessibility tests for WCAG compliance
- Visual regression tests for UI consistency

**Testing Utilities:**
- `renderWithProviders`: Render component with context providers
- `mockAPI`: Mock API responses
- `testAccessibility`: Test accessibility compliance
- `testKeyboardNavigation`: Test keyboard navigation

### Example Test

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './components/ui';

test('Button renders with correct text and handles click', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  const button = screen.getByRole('button', { name: /click me/i });
  expect(button).toBeInTheDocument();
  
  fireEvent.click(button);
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

## Best Practices

### Component Design

1. **Single Responsibility**: Each component should have one clear purpose
2. **Composition over Inheritance**: Use composition to build complex components
3. **Props Interface**: Define clear, typed props interfaces
4. **Default Props**: Provide sensible defaults for optional props
5. **Error Boundaries**: Wrap components in error boundaries

### Performance

1. **Memoization**: Use React.memo for expensive components
2. **Callback Optimization**: Use useCallback for event handlers
3. **State Optimization**: Use useMemo for expensive calculations
4. **Lazy Loading**: Lazy load components and routes
5. **Bundle Splitting**: Split code at logical boundaries

### Accessibility

1. **Semantic HTML**: Use appropriate HTML elements
2. **ARIA Attributes**: Add ARIA attributes where needed
3. **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
4. **Focus Management**: Manage focus appropriately
5. **Screen Reader Support**: Test with screen readers

### Testing

1. **Test Coverage**: Aim for 70%+ test coverage
2. **Test Behavior**: Test component behavior, not implementation
3. **Accessibility Testing**: Include accessibility tests
4. **Integration Testing**: Test component interactions
5. **Visual Testing**: Use visual regression testing

## Migration Guide

### Upgrading Components

When upgrading components, follow these steps:

1. **Check Breaking Changes**: Review changelog for breaking changes
2. **Update Props**: Update component props to match new interface
3. **Test Thoroughly**: Test all component functionality
4. **Update Tests**: Update component tests if needed
5. **Document Changes**: Document any changes made

### Deprecation Policy

Components are deprecated with a 6-month notice period:

1. **Deprecation Notice**: Component marked as deprecated
2. **Migration Guide**: Provide migration guide
3. **Support Period**: Continue support for 6 months
4. **Removal**: Remove deprecated component after 6 months

## Support

For component support and questions:

- **Documentation**: Check this documentation first
- **GitHub Issues**: Create an issue for bugs or feature requests
- **Discord**: Join our Discord community for help
- **Email**: Contact support@securegateaccess.com

---

**Last Updated**: January 2024
**Version**: 1.0.0

