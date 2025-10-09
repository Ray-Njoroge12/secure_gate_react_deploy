# Secure Gate Access - Frontend

A modern, responsive visitor management system built with React and Tailwind CSS.

## 🚀 Features

### Core Functionality
- **Visitor Management**: Create, track, and manage visitor invitations
- **QR Code Generation**: Generate QR codes for visitor passes
- **Real-time Updates**: Live updates for guard dashboard
- **Role-based Access**: Separate interfaces for residents, guards, and admins
- **Bulk Operations**: Bulk visitor invitations for events

### User Experience
- **Mobile-First Design**: Responsive design optimized for all devices
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Advanced Search**: Real-time search and filtering across all data
- **Form Wizards**: Multi-step forms with progressive disclosure

### Technical Features
- **Performance Optimized**: Code splitting, lazy loading, and memoization
- **Cross-Browser Compatible**: Support for Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Error Handling**: Comprehensive error management with user-friendly messages
- **Loading States**: Skeleton screens and loading indicators
- **Design System**: Consistent styling with Tailwind CSS

## 📋 Prerequisites

- Node.js 16.0 or higher
- npm 7.0 or higher
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd secure-gate-react-express/secure-gate-access/client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   REACT_APP_API_URL=http://localhost:5003/api
   REACT_APP_WS_URL=http://localhost:5003
   REACT_APP_ENVIRONMENT=development
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (Button, Input, Card, etc.)
│   ├── ErrorBoundary/   # Error boundary components
│   ├── Sidebar.jsx      # Navigation sidebar
│   ├── Topbar.jsx       # Top navigation bar
│   └── ...
├── contexts/            # React context providers
│   ├── AuthContext.jsx  # Authentication context
│   ├── ErrorContext.jsx # Error handling context
│   ├── LoadingContext.jsx # Loading state context
│   ├── SearchContext.jsx # Search and filtering context
│   └── BrowserCompatibilityContext.jsx # Browser compatibility context
├── hooks/               # Custom React hooks
│   ├── useAuth.js       # Authentication hook
│   ├── useError.js      # Error handling hook
│   ├── useLoadingState.js # Loading state hook
│   ├── useSearch.js     # Search functionality hook
│   └── useBrowserCompatibility.js # Browser compatibility hook
├── pages/               # Page components
│   ├── resident/        # Resident-specific pages
│   ├── guard/           # Guard-specific pages
│   ├── admin/           # Admin-specific pages
│   ├── Login.jsx        # Login page
│   └── Register.js      # Registration page
├── utils/               # Utility functions
│   ├── api.js           # API utility functions
│   ├── errorMapper.js   # Error message mapping
│   ├── validationRules.js # Form validation rules
│   ├── browserCompatibility.js # Browser compatibility utilities
│   └── performanceOptimization.js # Performance optimization utilities
├── styles/              # Styling files
│   ├── styles.css       # Main CSS file
│   └── browserCompatibility.css # Browser-specific styles
├── polyfills/           # Browser polyfills
│   └── index.js         # Polyfill loader
├── docs/                # Documentation
│   ├── SEARCH_AND_FILTERING.md # Search system documentation
│   ├── BROWSER_COMPATIBILITY.md # Browser compatibility guide
│   └── DESIGN_SYSTEM.md # Design system documentation
└── tests/               # Test files
    ├── components/      # Component tests
    ├── integration/     # Integration tests
    └── accessibility/   # Accessibility tests
```

## 🎨 Design System

The application uses a comprehensive design system built on Tailwind CSS with:

### Color Palette
- **Primary**: Blue (#3b82f6)
- **Secondary**: Gray (#6b7280)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)

### Typography
- **Headings**: Inter font family
- **Body**: System font stack
- **Sizes**: 12px, 14px, 16px, 18px, 20px, 24px, 32px

### Spacing
- **Base Unit**: 4px
- **Scale**: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px

### Components
- **Buttons**: Primary, secondary, ghost, destructive variants
- **Forms**: Input, select, textarea with validation states
- **Cards**: Container, header, content, footer sections
- **Navigation**: Sidebar, breadcrumbs, pagination

## 🔧 Available Scripts

### Development
```bash
npm start          # Start development server
npm run dev        # Start development server with hot reload
```

### Testing
```bash
npm test           # Run unit tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:accessibility # Run accessibility tests
```

### Building
```bash
npm run build      # Build for production
npm run build:analyze # Build with bundle analysis
```

### Linting
```bash
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint errors
```

### Type Checking
```bash
npm run type-check # Run TypeScript type checking
```

## 🧪 Testing

The application includes comprehensive testing:

### Unit Tests
- Component rendering tests
- Hook functionality tests
- Utility function tests
- Coverage target: 70%+

### Integration Tests
- User flow testing
- API integration testing
- Form submission testing

### Accessibility Tests
- WCAG 2.1 AA compliance
- Screen reader compatibility
- Keyboard navigation testing

### Visual Regression Tests
- Component visual testing
- Cross-browser consistency
- Responsive design validation

## 🌐 Browser Support

### Supported Browsers
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+
- **Opera**: 76+

### Mobile Browsers
- **iOS Safari**: 14+
- **Android Chrome**: 90+

### Features
- Automatic polyfill loading
- Browser-specific fixes
- Graceful degradation
- Performance optimization based on device capabilities

## ♿ Accessibility

The application is built with accessibility in mind:

### WCAG 2.1 AA Compliance
- Color contrast ratios meet AA standards
- Keyboard navigation support
- Screen reader compatibility
- Focus management

### Features
- ARIA labels and descriptions
- Semantic HTML structure
- Skip navigation links
- Live regions for dynamic content
- Touch targets meet 44px minimum

## 🚀 Performance

### Optimization Features
- Code splitting with React.lazy()
- Bundle size optimization
- Image lazy loading
- Virtual scrolling for large lists
- Memoization for expensive components

### Performance Targets
- Lighthouse Performance Score: 85+
- First Contentful Paint: < 2s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

## 🔍 Search and Filtering

Advanced search and filtering system:

### Features
- Real-time search with debouncing
- Multi-criteria filtering
- Sorting by multiple columns
- Pagination for large datasets
- Search state persistence
- Saved searches

### Usage
```jsx
import { useSearchData } from './hooks/useSearch';

const {
  data: filteredData,
  searchTerm,
  setSearchTerm,
  filters,
  setFilters
} = useSearchData(originalData, searchFields, filterFields);
```

## 🛡️ Error Handling

Comprehensive error handling system:

### Features
- Global error boundary
- Network error handling
- Authentication error handling
- User-friendly error messages
- Error recovery actions
- Error logging and monitoring

### Usage
```jsx
import { useError } from './hooks/useError';

const { handleError, handleSuccess, clearAllErrors } = useError();
```

## 📱 Mobile Optimization

Mobile-first responsive design:

### Features
- Touch-friendly interface (44px minimum touch targets)
- Responsive layouts for all screen sizes
- Mobile-optimized navigation
- Progressive web app capabilities
- Offline functionality

### Breakpoints
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px+

## 🔐 Security

Security features and best practices:

### Features
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- XSS protection
- CSRF protection
- Secure API communication

### Best Practices
- No sensitive data in localStorage
- Secure token storage
- Input validation on both client and server
- Regular security audits

## 📊 Monitoring and Analytics

### Performance Monitoring
- React DevTools Profiler integration
- Bundle size monitoring
- Performance metrics collection
- Error tracking and reporting

### User Analytics
- Page view tracking
- User interaction tracking
- Performance metrics
- Error rate monitoring

## 🤝 Contributing

### Development Workflow
1. Create a feature branch
2. Make your changes
3. Write tests for new functionality
4. Run the test suite
5. Submit a pull request

### Code Standards
- Follow ESLint configuration
- Write comprehensive tests
- Document new features
- Follow accessibility guidelines
- Maintain performance standards

## 📚 Documentation

### Component Documentation
- JSDoc comments for all components
- Props documentation
- Usage examples
- Accessibility notes

### API Documentation
- Endpoint documentation
- Request/response schemas
- Error codes and messages
- Authentication requirements

### User Guides
- Getting started guide
- Feature documentation
- Troubleshooting guide
- FAQ

## 🐛 Troubleshooting

### Common Issues

1. **Build Errors**
   - Check Node.js version compatibility
   - Clear node_modules and reinstall
   - Verify environment variables

2. **Runtime Errors**
   - Check browser console for errors
   - Verify API connectivity
   - Check authentication status

3. **Performance Issues**
   - Use React DevTools Profiler
   - Check bundle size
   - Verify lazy loading implementation

4. **Accessibility Issues**
   - Run accessibility tests
   - Check ARIA attributes
   - Test with screen readers

### Debug Tools
- React Developer Tools
- Browser DevTools
- Lighthouse audits
- Accessibility testing tools

## 🧩 Component Architecture

### Core UI Components

The application uses a comprehensive component library built with React and Tailwind CSS:

#### Button Component
```jsx
<Button 
  variant="primary" 
  size="md" 
  onClick={handleClick}
  disabled={false}
  loading={false}
>
  Click me
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
- `size`: 'sm' | 'md' | 'lg'
- `disabled`: boolean
- `loading`: boolean
- `icon`: React.ReactNode

#### Input Component
```jsx
<Input
  type="email"
  value={email}
  onChange={setEmail}
  placeholder="Enter your email"
  error={emailError}
  label="Email Address"
  helperText="We'll never share your email"
/>
```

#### Card Component
```jsx
<Card variant="elevated" padding="md">
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

### Form Components

#### ValidatedInput
Real-time validation with debouncing:
```jsx
<ValidatedInput
  name="email"
  value={email}
  onChange={setEmail}
  validation={[validationRules.required, validationRules.email]}
  debounceMs={300}
  showValidationOn="change"
/>
```

#### FormWizard
Multi-step form with progress tracking:
```jsx
<FormWizard
  steps={[
    { id: 'personal', title: 'Personal Info', component: PersonalStep },
    { id: 'contact', title: 'Contact Details', component: ContactStep }
  ]}
  onComplete={handleComplete}
  initialData={formData}
/>
```

### Navigation Components

#### Breadcrumbs
```jsx
<Breadcrumbs
  items={[
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Visitors', current: true }
  ]}
  separator={<ChevronRight />}
/>
```

#### FlowNavigation
```jsx
<FlowNavigation
  currentStep={2}
  totalSteps={5}
  onStepChange={setCurrentStep}
  onNext={handleNext}
  onPrevious={handlePrevious}
  canGoNext={isStepValid}
  canGoPrevious={currentStep > 1}
/>
```

### Search Components

#### SearchBar
```jsx
<SearchBar
  value={searchTerm}
  onChange={setSearchTerm}
  onSearch={handleSearch}
  suggestions={suggestions}
  showHistory={true}
  showSavedSearches={true}
/>
```

#### FilterPanel
```jsx
<FilterPanel
  filters={filterConfig}
  values={filterValues}
  onChange={setFilterValues}
  onClear={clearFilters}
/>
```

### Feedback Components

#### Loading States
```jsx
<Loading size="lg" variant="spinner" text="Loading visitors..." />
<Skeleton variant="card" width="100%" height="200px" />
<ProgressiveLoading steps={loadingSteps} />
```

#### Error Handling
```jsx
<ErrorQueue
  errors={errors}
  onDismiss={removeError}
  onRetry={retryOperation}
  maxVisible={5}
/>
```

### Browser Compatibility Components

#### BrowserCompatibilityWarning
```jsx
<BrowserCompatibilityWarning
  show={!isCompatible}
  onDismiss={handleDismiss}
/>
```

## 🎨 Design System

### Color Palette
```javascript
const colors = {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    900: '#1e3a8a'
  },
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    900: '#14532d'
  },
  // ... more colors
};
```

### Typography
```javascript
const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace']
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem'
  }
};
```

### Spacing Scale
```javascript
const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  8: '2rem',
  16: '4rem'
};
```

## 🔧 Custom Hooks

### useError
```javascript
const { errors, addError, removeError, handleError } = useError();
```

### useLoading
```javascript
const { isLoading, setLoading, withLoading } = useLoading();
```

### useSearch
```javascript
const { 
  searchState, 
  updateSearchTerm, 
  updateFilters, 
  searchData 
} = useSearch();
```

### useFormValidation
```javascript
const { 
  errors, 
  validate, 
  isValid, 
  validateField 
} = useFormValidation(rules);
```

## 🧪 Testing Architecture

### Test Structure
```
__tests__/
├── components/          # Component unit tests
├── pages/              # Page integration tests
├── utils/              # Utility function tests
├── integration/        # Cross-component tests
├── accessibility/      # A11y tests
└── performance/        # Performance tests
```

### Testing Utilities
```javascript
// Custom render with providers
const renderWithProviders = (ui, options) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Mock functions
const mockLocalStorage = () => {
  const store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    // ... more methods
  };
};
```

## 📱 Responsive Design

### Breakpoints
```javascript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px'   // Large desktop
};
```

### Touch Targets
All interactive elements meet WCAG 2.1 AA requirements:
- Minimum 44px touch target size
- Adequate spacing between touch targets
- High contrast ratios

## ♿ Accessibility Features

### ARIA Support
- Comprehensive ARIA labels and descriptions
- Live regions for dynamic content
- Proper heading hierarchy
- Focus management

### Keyboard Navigation
- Tab order follows logical flow
- Escape key closes modals
- Arrow keys navigate menus
- Enter/Space activate buttons

### Screen Reader Support
- Semantic HTML structure
- Alt text for images
- Descriptive link text
- Form labels and descriptions

## 🚀 Performance Optimizations

### Code Splitting
```javascript
const LazyComponent = lazy(() => import('./LazyComponent'));
```

### Memoization
```javascript
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* expensive rendering */}</div>;
});
```

### Bundle Optimization
- Tree shaking for unused code
- Dynamic imports for heavy components
- Image optimization and lazy loading
- Service worker for caching

## 🌐 Browser Compatibility

### Supported Browsers
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+
- iOS Safari 12+
- Android Chrome 8+

### Polyfills
- ES6+ features (Promises, Arrow functions, etc.)
- Web APIs (Fetch, IntersectionObserver, etc.)
- CSS features (Grid, Flexbox, Custom Properties)

## 📚 Documentation

- [Component API](./docs/COMPONENT_API.md) - Complete component documentation
- [Testing Guide](./docs/TESTING_GUIDE.md) - Comprehensive testing instructions
- [Architecture Decisions](./docs/ARCHITECTURE_DECISIONS.md) - ADR documentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- React team for the excellent framework
- Tailwind CSS for the utility-first CSS framework
- All contributors and testers
- The open-source community

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Contact the development team

---

**Built with ❤️ by the Secure Gate Access Team**

