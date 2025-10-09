# Component API Documentation

This document provides comprehensive API documentation for all UI components in the Secure Gate Access application.

## Table of Contents

- [Core UI Components](#core-ui-components)
- [Form Components](#form-components)
- [Navigation Components](#navigation-components)
- [Feedback Components](#feedback-components)
- [Layout Components](#layout-components)
- [Search Components](#search-components)
- [Browser Compatibility Components](#browser-compatibility-components)
- [Utility Components](#utility-components)

## Core UI Components

### Button

A versatile button component with multiple variants and sizes.

**File**: `src/components/ui/Button.jsx`

**Props**:
```typescript
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
}
```

**Examples**:
```jsx
// Primary button
<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>

// Button with icon
<Button variant="outline" icon={<PlusIcon />}>
  Add Item
</Button>

// Loading button
<Button loading={true} disabled={true}>
  Processing...
</Button>
```

### Input

A form input component with validation support.

**File**: `src/components/ui/Input.jsx`

**Props**:
```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}
```

**Examples**:
```jsx
// Basic input
<Input
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={setEmail}
/>

// Input with validation
<Input
  type="text"
  label="Username"
  value={username}
  onChange={setUsername}
  error={usernameError}
  helperText="Choose a unique username"
/>
```

### Card

A container component for grouping related content.

**File**: `src/components/ui/Card.jsx`

**Props**:
```typescript
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}
```

**Examples**:
```jsx
// Basic card
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

// Clickable card
<Card onClick={handleCardClick} variant="elevated">
  <Card.Content>
    <h4>Clickable Card</h4>
  </Card.Content>
</Card>
```

## Form Components

### ValidatedInput

An input component with real-time validation and error handling.

**File**: `src/components/ui/ValidatedInput.jsx`

**Props**:
```typescript
interface ValidatedInputProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  validation?: ValidationRule[];
  debounceMs?: number;
  showValidationOn?: 'change' | 'blur' | 'submit';
  className?: string;
  // ... all Input props
}
```

**Examples**:
```jsx
// Email validation
<ValidatedInput
  name="email"
  value={email}
  onChange={setEmail}
  validation={[validationRules.required, validationRules.email]}
  placeholder="Enter your email"
/>

// Custom validation
<ValidatedInput
  name="password"
  value={password}
  onChange={setPassword}
  validation={[
    validationRules.required,
    validationRules.minLength(8),
    validationRules.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  ]}
  type="password"
/>
```

### FormWizard

A multi-step form component with progress tracking.

**File**: `src/components/ui/FormWizard.jsx`

**Props**:
```typescript
interface FormWizardProps {
  steps: FormStep[];
  onComplete: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
  className?: string;
}

interface FormStep {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<any>;
  validation?: (data: any) => ValidationResult;
  isOptional?: boolean;
}
```

**Examples**:
```jsx
const steps = [
  {
    id: 'personal',
    title: 'Personal Information',
    component: PersonalInfoStep,
    validation: validatePersonalInfo
  },
  {
    id: 'contact',
    title: 'Contact Details',
    component: ContactInfoStep,
    validation: validateContactInfo
  }
];

<FormWizard
  steps={steps}
  onComplete={handleFormComplete}
  initialData={formData}
/>
```

## Navigation Components

### Breadcrumbs

A navigation component showing the current page hierarchy.

**File**: `src/components/ui/Breadcrumbs.jsx`

**Props**:
```typescript
interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
  maxItems?: number;
  showHome?: boolean;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
  icon?: React.ReactNode;
}
```

**Examples**:
```jsx
// Basic breadcrumbs
<Breadcrumbs
  items={[
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Visitors', current: true }
  ]}
/>

// With custom separator
<Breadcrumbs
  items={breadcrumbItems}
  separator={<ChevronRight className="w-4 h-4" />}
/>
```

### FlowNavigation

A navigation component for multi-step flows.

**File**: `src/components/ui/FlowNavigation.jsx`

**Props**:
```typescript
interface FlowNavigationProps {
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  className?: string;
}
```

## Feedback Components

### Loading

A loading indicator component with multiple variants.

**File**: `src/components/ui/Loading.jsx`

**Props**:
```typescript
interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  className?: string;
  'aria-label'?: string;
}
```

### Toast

A notification component for displaying temporary messages.

**File**: `src/components/ui/Toast.jsx`

**Props**:
```typescript
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}
```

### ErrorQueue

A component for displaying multiple error messages.

**File**: `src/components/ui/ErrorQueue.jsx`

**Props**:
```typescript
interface ErrorQueueProps {
  errors: ErrorItem[];
  onDismiss: (id: string) => void;
  onRetry?: (id: string) => void;
  maxVisible?: number;
  className?: string;
}

interface ErrorItem {
  id: string;
  message: string;
  type: 'error' | 'warning';
  timestamp: Date;
  retryable?: boolean;
}
```

## Search Components

### SearchBar

A search input component with autocomplete functionality.

**File**: `src/components/ui/SearchBar.jsx`

**Props**:
```typescript
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  showHistory?: boolean;
  showSavedSearches?: boolean;
  className?: string;
}
```

### FilterPanel

A component for advanced filtering options.

**File**: `src/components/ui/FilterPanel.jsx`

**Props**:
```typescript
interface FilterPanelProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
  onClear: () => void;
  className?: string;
}

interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'dateRange' | 'text' | 'numberRange';
  options?: string[];
  placeholder?: string;
  required?: boolean;
}
```

## Browser Compatibility Components

### BrowserCompatibilityWarning

A component for displaying browser compatibility warnings.

**File**: `src/components/ui/BrowserCompatibilityWarning.jsx`

**Props**:
```typescript
interface BrowserCompatibilityWarningProps {
  show?: boolean;
  onDismiss?: () => void;
  className?: string;
}
```

### BrowserCompatibility

A development component for testing browser compatibility.

**File**: `src/components/ui/BrowserCompatibility.jsx`

**Props**:
```typescript
interface BrowserCompatibilityProps {
  show?: boolean;
  className?: string;
}
```

## Utility Components

### Skeleton

A placeholder component for loading states.

**File**: `src/components/ui/Skeleton.jsx`

**Props**:
```typescript
interface SkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'card' | 'table' | 'list';
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}
```

### Modal

A modal dialog component.

**File**: `src/components/ui/Modal.jsx`

**Props**:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}
```

## Context Hooks

### useError

Hook for error handling and display.

**File**: `src/hooks/useError.js`

**Returns**:
```typescript
interface ErrorContextValue {
  errors: ErrorItem[];
  addError: (error: ErrorItem) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  handleError: (error: Error) => void;
  handleApiError: (error: ApiError) => void;
}
```

### useLoading

Hook for loading state management.

**File**: `src/hooks/useLoading.js`

**Returns**:
```typescript
interface LoadingContextValue {
  isLoading: boolean;
  loadingStates: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;
  withLoading: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
}
```

### useSearch

Hook for search functionality.

**File**: `src/hooks/useSearch.js`

**Returns**:
```typescript
interface SearchContextValue {
  searchState: SearchState;
  updateSearchTerm: (term: string) => void;
  updateFilters: (filters: Record<string, any>) => void;
  clearFilters: () => void;
  searchData: (data: any[], searchFields: string[], filterFields: string[]) => any[];
  getPaginatedData: (data: any[]) => PaginatedResult;
}
```

## Styling and Theming

All components support custom styling through the `className` prop and use the design system tokens defined in `src/styles/theme.js`.

### Design Tokens

- **Colors**: Primary, secondary, success, warning, error, neutral
- **Typography**: Font families, sizes, weights, line heights
- **Spacing**: Consistent spacing scale
- **Breakpoints**: Mobile-first responsive breakpoints
- **Shadows**: Elevation system
- **Border Radius**: Consistent corner rounding

### Responsive Design

Components automatically adapt to different screen sizes using Tailwind CSS responsive utilities:

- `sm:` - Small screens (640px+)
- `md:` - Medium screens (768px+)
- `lg:` - Large screens (1024px+)
- `xl:` - Extra large screens (1280px+)

## Accessibility

All components are built with accessibility in mind and include:

- **ARIA labels** and descriptions
- **Keyboard navigation** support
- **Focus management** for modals and dropdowns
- **Screen reader** compatibility
- **High contrast** support
- **Touch target** compliance (minimum 44px)

## Testing

Components include comprehensive test coverage with:

- **Unit tests** for individual component behavior
- **Integration tests** for component interactions
- **Accessibility tests** using jest-axe
- **Visual regression tests** for UI consistency
- **Responsive tests** for different screen sizes

## Performance

Components are optimized for performance with:

- **React.memo** for expensive components
- **useCallback** and **useMemo** for expensive calculations
- **Lazy loading** for heavy components
- **Code splitting** for better bundle management
- **Virtual scrolling** for large lists



