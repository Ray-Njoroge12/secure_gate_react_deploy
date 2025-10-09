/**
 * Validation Demo Page
 * 
 * Comprehensive demonstration of advanced form validation features:
 * - Real-time validation with visual feedback
 * - Async validation examples
 * - Cross-field validation
 * - Validation summary and progress
 * - Accessibility compliance
 * - Mobile responsiveness
 */

import React, { useState, useCallback } from 'react';
import logger from 'utils/logger';
import { useNavigate } from 'react-router-dom';
import { 
  AdvancedValidatedInput,
  ValidationSummary,
  Card,
  Button,
  Badge,
  Switch,
  Select,
  Textarea
} from '../components/ui';
import { useAdvancedValidation } from '../hooks/useAdvancedValidation';
import Layout from '../components/Layout';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Settings,
  CheckCircle,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  Save,
  RefreshCw
} from 'lucide-react';

const ValidationDemo = () => {
  const navigate = useNavigate();
  const [activeDemo, setActiveDemo] = useState('basic-validation');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced validation hook
  const {
    values,
    errors,
    warnings,
    successes,
    touched,
    isValidating,
    validationState,
    registerField,
    registerRules,
    createRule,
    validateField,
    validateAll,
    handleFieldChange,
    handleFieldBlur,
    handleFieldFocus,
    handleSubmit,
    resetForm,
    getFieldState,
    getValidationSummary,
    hasErrors,
    hasWarnings,
    isValid,
    isDirty,
    VALIDATION_STATES,
    RULE_TYPES
  } = useAdvancedValidation({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    website: '',
    age: '',
    bio: '',
    terms: false,
    newsletter: false
  }, {
    validateOnChange: true,
    validateOnBlur: true,
    validateOnSubmit: true,
    debounceDelay: 300,
    enableCaching: true,
    enableCrossFieldValidation: true,
    validationMode: 'aggressive'
  });

  // Create validation rules
  const validationRules = {
    name: [
      createRule(RULE_TYPES.REQUIRED, { message: 'Name is required' }),
      createRule(RULE_TYPES.MIN_LENGTH, { min: 2, message: 'Name must be at least 2 characters' }),
      createRule(RULE_TYPES.MAX_LENGTH, { max: 50, message: 'Name must be no more than 50 characters' })
    ],
    
    email: [
      createRule(RULE_TYPES.REQUIRED, { message: 'Email is required' }),
      createRule(RULE_TYPES.EMAIL, { message: 'Please enter a valid email address' }),
      createRule(RULE_TYPES.ASYNC, {
        message: 'Email is already taken',
        validate: async (value) => {
          // Simulate async validation
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { isValid: value !== 'test@example.com' };
        }
      })
    ],
    
    phone: [
      createRule(RULE_TYPES.PHONE, { message: 'Please enter a valid phone number (0xxxxxxxxx)' })
    ],
    
    password: [
      createRule(RULE_TYPES.REQUIRED, { message: 'Password is required' }),
      createRule(RULE_TYPES.MIN_LENGTH, { min: 8, message: 'Password must be at least 8 characters' }),
      createRule(RULE_TYPES.PATTERN, {
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      })
    ],
    
    confirmPassword: [
      createRule(RULE_TYPES.REQUIRED, { message: 'Please confirm your password' }),
      createRule(RULE_TYPES.CROSS_FIELD, {
        message: 'Passwords do not match',
        validate: (value, fieldName, allValues) => {
          return { isValid: value === allValues.password };
        }
      })
    ],
    
    website: [
      createRule(RULE_TYPES.PATTERN, {
        pattern: /^https?:\/\/.+/,
        message: 'Please enter a valid URL (starting with http:// or https://)'
      })
    ],
    
    age: [
      createRule(RULE_TYPES.REQUIRED, { message: 'Age is required' }),
      createRule(RULE_TYPES.CUSTOM, {
        message: 'Age must be between 18 and 120',
        validate: (value) => {
          const age = parseInt(value);
          return { isValid: age >= 18 && age <= 120 };
        }
      })
    ],
    
    bio: [
      createRule(RULE_TYPES.MAX_LENGTH, { max: 500, message: 'Bio must be no more than 500 characters' })
    ],
    
    terms: [
      createRule(RULE_TYPES.REQUIRED, { message: 'You must accept the terms and conditions' })
    ]
  };

  // Register validation rules
  React.useEffect(() => {
    Object.entries(validationRules).forEach(([fieldName, rules]) => {
      registerRules(fieldName, rules);
    });
  }, [registerRules]);

  // Handle form submission
  const handleFormSubmit = useCallback(async (formData) => {
    logger.debug('Form submitted:', formData);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, message: 'Form submitted successfully!' };
  }, []);

  // Handle validation refresh
  const handleValidationRefresh = useCallback(async () => {
    await validateAll();
  }, [validateAll]);

  // Handle field click in validation summary
  const handleFieldClick = useCallback((fieldName) => {
    const element = document.querySelector(`[name="${fieldName}"]`);
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Handle field dismiss
  const handleFieldDismiss = useCallback((fieldName) => {
    logger.debug(`Dismissed validation for field: ${fieldName}`);
  }, []);

  // Get validation summary
  const validationSummary = getValidationSummary();

  return (
    <Layout title="Validation Demo" role="admin">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            Advanced Form Validation Demo
          </h1>
          <p className="text-slate-400">
            Comprehensive demonstration of real-time validation features
          </p>
        </div>

        {/* Demo Selection */}
        <div className="mb-8">
          <div className="flex space-x-4 mb-6">
            <Button
              variant={activeDemo === 'basic-validation' ? 'primary' : 'outline'}
              onClick={() => setActiveDemo('basic-validation')}
            >
              Basic Validation
            </Button>
            <Button
              variant={activeDemo === 'async-validation' ? 'primary' : 'outline'}
              onClick={() => setActiveDemo('async-validation')}
            >
              Async Validation
            </Button>
            <Button
              variant={activeDemo === 'cross-field' ? 'primary' : 'outline'}
              onClick={() => setActiveDemo('cross-field')}
            >
              Cross-Field Validation
            </Button>
            <Button
              variant={activeDemo === 'advanced-features' ? 'primary' : 'outline'}
              onClick={() => setActiveDemo('advanced-features')}
            >
              Advanced Features
            </Button>
          </div>
        </div>

        {/* Validation Summary */}
        <div className="mb-8">
          <ValidationSummary
            validationState={validationState}
            errors={errors}
            warnings={warnings}
            successes={successes}
            isValidating={isValidating}
            touched={touched}
            showProgress={true}
            showFieldDetails={true}
            showSummary={true}
            showRefreshButton={true}
            collapsible={true}
            defaultExpanded={false}
            onRefresh={handleValidationRefresh}
            onFieldClick={handleFieldClick}
            onDismiss={handleFieldDismiss}
            variant="detailed"
            size="md"
          />
        </div>

        {/* Demo Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card>
            <Card.Header>
              <Card.Title className="text-slate-200">Validation Form</Card.Title>
              <Card.Description className="text-slate-400">
                Try different validation scenarios
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Basic Information</h3>
                
                <AdvancedValidatedInput
                  name="name"
                  label="Full Name"
                  value={values.name}
                  onChange={(value) => handleFieldChange('name', value)}
                  onBlur={() => handleFieldBlur('name')}
                  onFocus={() => handleFieldFocus('name')}
                  placeholder="Enter your full name"
                  required
                  icon={<User className="w-4 h-4" />}
                  showSuccessIndicators={true}
                  showWarningIndicators={true}
                  size="md"
                />

                <AdvancedValidatedInput
                  name="email"
                  label="Email Address"
                  type="email"
                  value={values.email}
                  onChange={(value) => handleFieldChange('email', value)}
                  onBlur={() => handleFieldBlur('email')}
                  onFocus={() => handleFieldFocus('email')}
                  placeholder="Enter your email address"
                  required
                  icon={<Mail className="w-4 h-4" />}
                  showSuccessIndicators={true}
                  showWarningIndicators={true}
                  size="md"
                  helpText="We'll use this to send you important updates"
                />

                <AdvancedValidatedInput
                  name="phone"
                  label="Phone Number"
                  type="tel"
                  value={values.phone}
                  onChange={(value) => handleFieldChange('phone', value)}
                  onBlur={() => handleFieldBlur('phone')}
                  onFocus={() => handleFieldFocus('phone')}
                  placeholder="0xxxxxxxxx"
                  icon={<Phone className="w-4 h-4" />}
                  showSuccessIndicators={true}
                  showWarningIndicators={true}
                  size="md"
                />
              </div>

              {/* Password Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Security</h3>
                
                <AdvancedValidatedInput
                  name="password"
                  label="Password"
                  type="password"
                  value={values.password}
                  onChange={(value) => handleFieldChange('password', value)}
                  onBlur={() => handleFieldBlur('password')}
                  onFocus={() => handleFieldFocus('password')}
                  placeholder="Enter your password"
                  required
                  icon={<Shield className="w-4 h-4" />}
                  showPasswordToggle={true}
                  showSuccessIndicators={true}
                  showWarningIndicators={true}
                  size="md"
                  helpText="Must contain uppercase, lowercase, and numbers"
                />

                <AdvancedValidatedInput
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  value={values.confirmPassword}
                  onChange={(value) => handleFieldChange('confirmPassword', value)}
                  onBlur={() => handleFieldBlur('confirmPassword')}
                  onFocus={() => handleFieldFocus('confirmPassword')}
                  placeholder="Confirm your password"
                  required
                  icon={<Shield className="w-4 h-4" />}
                  showPasswordToggle={true}
                  showSuccessIndicators={true}
                  showWarningIndicators={true}
                  size="md"
                />
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Additional Information</h3>
                
                <AdvancedValidatedInput
                  name="website"
                  label="Website"
                  type="url"
                  value={values.website}
                  onChange={(value) => handleFieldChange('website', value)}
                  onBlur={() => handleFieldBlur('website')}
                  onFocus={() => handleFieldFocus('website')}
                  placeholder="https://example.com"
                  icon={<MapPin className="w-4 h-4" />}
                  showSuccessIndicators={true}
                  showWarningIndicators={true}
                  size="md"
                />

                <AdvancedValidatedInput
                  name="age"
                  label="Age"
                  type="number"
                  value={values.age}
                  onChange={(value) => handleFieldChange('age', value)}
                  onBlur={() => handleFieldBlur('age')}
                  onFocus={() => handleFieldFocus('age')}
                  placeholder="Enter your age"
                  required
                  icon={<Calendar className="w-4 h-4" />}
                  showSuccessIndicators={true}
                  showWarningIndicators={true}
                  size="md"
                  min="18"
                  max="120"
                />

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Bio
                  </label>
                  <Textarea
                    value={values.bio}
                    onChange={(e) => handleFieldChange('bio', e.target.value)}
                    onBlur={() => handleFieldBlur('bio')}
                    onFocus={() => handleFieldFocus('bio')}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    maxLength={500}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                  <div className="mt-1 text-sm text-slate-400">
                    {values.bio?.length || 0}/500 characters
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Agreements</h3>
                
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={values.terms}
                    onCheckedChange={(checked) => handleFieldChange('terms', checked)}
                  />
                  <label className="text-slate-200">
                    I accept the terms and conditions
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    checked={values.newsletter}
                    onCheckedChange={(checked) => handleFieldChange('newsletter', checked)}
                  />
                  <label className="text-slate-200">
                    Subscribe to newsletter (optional)
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-between items-center pt-6 border-t border-slate-700">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  icon={<RefreshCw className="w-4 h-4" />}
                >
                  Reset Form
                </Button>

                <Button
                  variant="primary"
                  onClick={() => handleSubmit(handleFormSubmit)}
                  disabled={!isValid() || hasErrors()}
                  icon={<Save className="w-4 h-4" />}
                >
                  Submit Form
                </Button>
              </div>
            </Card.Content>
          </Card>

          {/* Validation Status */}
          <Card>
            <Card.Header>
              <Card.Title className="text-slate-200">Validation Status</Card.Title>
              <Card.Description className="text-slate-400">
                Real-time validation feedback
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-6">
              {/* Overall Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Overall Status</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-slate-800 rounded-lg">
                    <div className="text-2xl font-bold text-slate-200">
                      {validationSummary.validFields}
                    </div>
                    <div className="text-sm text-slate-400">Valid Fields</div>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-800 rounded-lg">
                    <div className="text-2xl font-bold text-slate-200">
                      {validationSummary.totalFields}
                    </div>
                    <div className="text-sm text-slate-400">Total Fields</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-slate-400">
                      {Math.round((validationSummary.validFields / validationSummary.totalFields) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(validationSummary.validFields / validationSummary.totalFields) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Field Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Field Status</h3>
                
                <div className="space-y-2">
                  {Object.keys(validationState).map(fieldName => {
                    const fieldState = getFieldState(fieldName);
                    return (
                      <div key={fieldName} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {fieldState.isValidating && (
                              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                            )}
                            {!fieldState.isValidating && fieldState.hasErrors && (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            )}
                            {!fieldState.isValidating && fieldState.hasWarnings && (
                              <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            )}
                            {!fieldState.isValidating && fieldState.hasSuccesses && (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                            {!fieldState.isValidating && fieldState.isValid && (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                          
                          <div>
                            <div className="text-slate-200 font-medium">{fieldName}</div>
                            <div className="text-sm text-slate-400">
                              {fieldState.state}
                            </div>
                          </div>
                        </div>
                        
                        <Badge 
                          variant={fieldState.hasErrors ? 'error' : 
                                  fieldState.hasWarnings ? 'warning' : 
                                  fieldState.hasSuccesses ? 'success' : 'default'}
                          size="sm"
                        >
                          {fieldState.state}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Validation Statistics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Statistics</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-800 rounded-lg">
                    <div className="text-lg font-bold text-red-400">
                      {validationSummary.invalidFields}
                    </div>
                    <div className="text-xs text-slate-400">Errors</div>
                  </div>
                  
                  <div className="text-center p-3 bg-slate-800 rounded-lg">
                    <div className="text-lg font-bold text-yellow-400">
                      {validationSummary.warningFields}
                    </div>
                    <div className="text-xs text-slate-400">Warnings</div>
                  </div>
                  
                  <div className="text-center p-3 bg-slate-800 rounded-lg">
                    <div className="text-lg font-bold text-green-400">
                      {validationSummary.successFields}
                    </div>
                    <div className="text-xs text-slate-400">Successes</div>
                  </div>
                  
                  <div className="text-center p-3 bg-slate-800 rounded-lg">
                    <div className="text-lg font-bold text-blue-400">
                      {validationSummary.validatingFields}
                    </div>
                    <div className="text-xs text-slate-400">Validating</div>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Features Overview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <Card.Header>
              <Card.Title className="text-slate-200 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                Real-Time Validation
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Instant feedback as you type</li>
                <li>• Debounced validation (300ms)</li>
                <li>• Visual success indicators</li>
                <li>• Warning and error states</li>
                <li>• Loading states for async validation</li>
                <li>• Accessibility compliance</li>
              </ul>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="text-slate-200 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-blue-400" />
                Advanced Features
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Async validation support</li>
                <li>• Cross-field validation</li>
                <li>• Validation caching</li>
                <li>• Custom validation rules</li>
                <li>• Validation summary</li>
                <li>• Progress tracking</li>
              </ul>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="text-slate-200 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-purple-400" />
                Accessibility
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• ARIA labels and descriptions</li>
                <li>• Screen reader announcements</li>
                <li>• Keyboard navigation</li>
                <li>• High contrast support</li>
                <li>• Focus management</li>
                <li>• WCAG 2.1 AA compliance</li>
              </ul>
            </Card.Content>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ValidationDemo;




