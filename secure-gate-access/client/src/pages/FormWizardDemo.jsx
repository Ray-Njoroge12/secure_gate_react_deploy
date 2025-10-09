/**
 * Form Wizard Demo Page
 * 
 * A comprehensive demonstration of form wizard and progressive disclosure features:
 * - Enhanced form wizard with all features
 * - Progressive disclosure examples
 * - Form step demonstrations
 * - Mobile responsiveness
 * - Accessibility features
 */

import React, { useState } from 'react';
import logger from 'utils/logger';
import { useNavigate } from 'react-router-dom';
import { 
  FormWizard,
  EnhancedFormWizard,
  FormStep,
  ProgressiveDisclosure,
  Card,
  Button,
  Badge,
  Switch,
  Select,
  Input,
  Textarea
} from '../components/ui';
import { useError, useLoading } from '../contexts';
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
  Download,
  Upload
} from 'lucide-react';

const FormWizardDemo = () => {
  const navigate = useNavigate();
  const { handleError, clearAllErrors } = useError();
  const { isLoading, setLoading } = useLoading();
  
  const [activeDemo, setActiveDemo] = useState('enhanced-wizard');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Demo wizard steps
  const demoSteps = [
    {
      id: 'basic-info',
      title: 'Basic Information',
      description: 'Enter your basic details',
      validate: async (data) => {
        const errors = {};
        if (!data.name?.trim()) errors.name = 'Name is required';
        if (!data.email?.trim()) errors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = 'Invalid email format';
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'Configure your preferences',
      validate: async (data) => {
        const errors = {};
        if (!data.theme) errors.theme = 'Theme selection is required';
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      id: 'advanced',
      title: 'Advanced Settings',
      description: 'Optional advanced configuration',
      validate: async (data) => {
        return true; // Advanced settings are optional
      }
    },
    {
      id: 'review',
      title: 'Review & Submit',
      description: 'Review all information before submitting',
      validate: async (data) => {
        return true;
      }
    }
  ];

  // Progressive disclosure sections
  const disclosureSections = [
    {
      id: 'personal-info',
      title: 'Personal Information',
      description: 'Your basic personal details',
      icon: <User className="w-5 h-5" />,
      completed: true,
      content: ({ isExpanded }) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">First Name</label>
              <Input placeholder="Enter first name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Last Name</label>
              <Input placeholder="Enter last name" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Email</label>
            <Input type="email" placeholder="Enter email address" />
          </div>
        </div>
      )
    },
    {
      id: 'contact-info',
      title: 'Contact Information',
      description: 'How to reach you',
      icon: <Phone className="w-5 h-5" />,
      completed: false,
      content: ({ isExpanded }) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Phone Number</label>
            <Input type="tel" placeholder="Enter phone number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Address</label>
            <Textarea placeholder="Enter your address" rows={3} />
          </div>
        </div>
      )
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'Your system preferences',
      icon: <Settings className="w-5 h-5" />,
      completed: false,
      content: ({ isExpanded }) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Theme</label>
            <Select
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'auto', label: 'Auto' }
              ]}
              placeholder="Select theme"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch />
            <span className="text-slate-200">Enable notifications</span>
          </div>
        </div>
      )
    },
    {
      id: 'advanced-settings',
      title: 'Advanced Settings',
      description: 'Advanced configuration options',
      icon: <Shield className="w-5 h-5" />,
      advanced: true,
      content: ({ isExpanded }) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">API Key</label>
            <Input type="password" placeholder="Enter API key" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Server URL</label>
            <Input placeholder="https://api.example.com" />
          </div>
        </div>
      )
    }
  ];

  // Handle wizard completion
  const handleWizardComplete = async (allStepData) => {
    try {
      await setLoading(true);
      logger.debug('Wizard completed:', allStepData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      handleError('Wizard completion failed', error);
    } finally {
      await setLoading(false);
    }
  };

  // Handle draft save
  const handleSaveDraft = async (draftData) => {
    try {
      logger.debug('Draft saved:', draftData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      handleError('Failed to save draft', error);
    }
  };

  // Handle draft load
  const handleLoadDraft = async (wizardId) => {
    try {
      const savedDraft = localStorage.getItem(`demo-draft-${wizardId}`);
      return savedDraft ? JSON.parse(savedDraft) : null;
    } catch (error) {
      handleError('Failed to load draft', error);
      return null;
    }
  };

  // Render step content
  const renderStepContent = ({ currentStep, stepData, updateStepData, allStepData, isFirstStep, isLastStep, isValidating, isPreviewMode, stepErrors, validationSummary }) => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <FormStep
            stepId="basic-info"
            title="Basic Information"
            description="Enter your basic details"
            fields={[
              {
                id: 'name',
                label: 'Full Name',
                type: 'text',
                required: true,
                icon: <User className="w-4 h-4" />,
                placeholder: 'Enter your full name'
              },
              {
                id: 'email',
                label: 'Email Address',
                type: 'email',
                required: true,
                icon: <Mail className="w-4 h-4" />,
                placeholder: 'Enter your email address'
              },
              {
                id: 'phone',
                label: 'Phone Number',
                type: 'tel',
                required: false,
                icon: <Phone className="w-4 h-4" />,
                placeholder: 'Enter your phone number'
              }
            ]}
            data={stepData}
            errors={stepErrors}
            onDataChange={updateStepData}
            layout="vertical"
            size="md"
          />
        );

      case 1: // Preferences
        return (
          <FormStep
            stepId="preferences"
            title="Preferences"
            description="Configure your preferences"
            fields={[
              {
                id: 'theme',
                label: 'Theme',
                type: 'select',
                required: true,
                icon: <Settings className="w-4 h-4" />,
                options: [
                  { value: '', label: 'Select theme' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'auto', label: 'Auto' }
                ]
              },
              {
                id: 'notifications',
                label: 'Enable Notifications',
                type: 'switch',
                required: false,
                icon: <Settings className="w-4 h-4" />,
                help: 'Receive email notifications'
              },
              {
                id: 'language',
                label: 'Language',
                type: 'select',
                required: false,
                icon: <Settings className="w-4 h-4" />,
                options: [
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Spanish' },
                  { value: 'fr', label: 'French' }
                ]
              }
            ]}
            data={stepData}
            errors={stepErrors}
            onDataChange={updateStepData}
            layout="vertical"
            size="md"
          />
        );

      case 2: // Advanced Settings
        return (
          <ProgressiveDisclosure
            sections={[
              {
                id: 'security-settings',
                title: 'Security Settings',
                description: 'Configure security options',
                icon: <Shield className="w-5 h-5" />,
                content: ({ isExpanded }) => (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">Two-Factor Authentication</label>
                      <div className="flex items-center space-x-2">
                        <Switch />
                        <span className="text-slate-200">Enable 2FA</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">Session Timeout</label>
                      <Select
                        options={[
                          { value: '15', label: '15 minutes' },
                          { value: '30', label: '30 minutes' },
                          { value: '60', label: '1 hour' },
                          { value: '120', label: '2 hours' }
                        ]}
                        placeholder="Select timeout"
                      />
                    </div>
                  </div>
                )
              },
              {
                id: 'api-settings',
                title: 'API Settings',
                description: 'Configure API access',
                icon: <Settings className="w-5 h-5" />,
                content: ({ isExpanded }) => (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">API Key</label>
                      <Input type="password" placeholder="Enter API key" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">Server URL</label>
                      <Input placeholder="https://api.example.com" />
                    </div>
                  </div>
                )
              }
            ]}
            defaultExpanded={['security-settings']}
            showProgress={true}
            showAdvancedToggle={true}
          />
        );

      case 3: // Review
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <CheckCircle className="w-16 h-16 text-brand-500 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-slate-100 mb-2">
                Review Information
              </h3>
              <p className="text-slate-400">
                Please review all information before submitting.
              </p>
            </div>

            <ProgressiveDisclosure
              sections={[
                {
                  id: 'basic-review',
                  title: 'Basic Information',
                  description: 'Your basic details',
                  icon: <User className="w-5 h-5" />,
                  completed: true,
                  content: ({ isExpanded }) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-slate-400">Name:</span>
                          <p className="text-slate-200">{allStepData[0]?.name || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Email:</span>
                          <p className="text-slate-200">{allStepData[0]?.email || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Phone:</span>
                          <p className="text-slate-200">{allStepData[0]?.phone || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  id: 'preferences-review',
                  title: 'Preferences',
                  description: 'Your system preferences',
                  icon: <Settings className="w-5 h-5" />,
                  completed: true,
                  content: ({ isExpanded }) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-slate-400">Theme:</span>
                          <p className="text-slate-200">{allStepData[1]?.theme || 'Not selected'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Notifications:</span>
                          <p className="text-slate-200">{allStepData[1]?.notifications ? 'Enabled' : 'Disabled'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Language:</span>
                          <p className="text-slate-200">{allStepData[1]?.language || 'Not selected'}</p>
                        </div>
                      </div>
                    </div>
                  )
                }
              ]}
              defaultExpanded={['basic-review']}
              showProgress={true}
              showAdvancedToggle={false}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout title="Form Wizard Demo" role="admin">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            Form Wizard & Progressive Disclosure Demo
          </h1>
          <p className="text-slate-400">
            Comprehensive demonstration of form wizard and progressive disclosure features
          </p>
        </div>

        {/* Demo Selection */}
        <div className="mb-8">
          <div className="flex space-x-4 mb-6">
            <Button
              variant={activeDemo === 'enhanced-wizard' ? 'primary' : 'outline'}
              onClick={() => setActiveDemo('enhanced-wizard')}
            >
              Enhanced Wizard
            </Button>
            <Button
              variant={activeDemo === 'progressive-disclosure' ? 'primary' : 'outline'}
              onClick={() => setActiveDemo('progressive-disclosure')}
            >
              Progressive Disclosure
            </Button>
            <Button
              variant={activeDemo === 'form-steps' ? 'primary' : 'outline'}
              onClick={() => setActiveDemo('form-steps')}
            >
              Form Steps
            </Button>
          </div>
        </div>

        {/* Enhanced Wizard Demo */}
        {activeDemo === 'enhanced-wizard' && (
          <Card>
            <Card.Header>
              <Card.Title className="text-slate-200">Enhanced Form Wizard</Card.Title>
              <Card.Description className="text-slate-400">
                Advanced multi-step form with validation, auto-save, and progressive disclosure
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <EnhancedFormWizard
                steps={demoSteps}
                wizardId="demo-wizard"
                onComplete={handleWizardComplete}
                onSaveDraft={handleSaveDraft}
                onLoadDraft={handleLoadDraft}
                showProgress={true}
                showStepNumbers={true}
                showStepTitles={true}
                showStepDescriptions={true}
                allowStepNavigation={true}
                showDraftActions={true}
                showPreviewMode={true}
                validateOnStepChange={true}
                validateOnComplete={true}
                showValidationSummary={true}
                autoSave={true}
                autoSaveInterval={30000}
                draftExpiry={24 * 60 * 60 * 1000}
              >
                {renderStepContent}
              </EnhancedFormWizard>
            </Card.Content>
          </Card>
        )}

        {/* Progressive Disclosure Demo */}
        {activeDemo === 'progressive-disclosure' && (
          <Card>
            <Card.Header>
              <Card.Title className="text-slate-200">Progressive Disclosure</Card.Title>
              <Card.Description className="text-slate-400">
                Reveal information progressively to reduce cognitive load
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <ProgressiveDisclosure
                sections={disclosureSections}
                defaultExpanded={['personal-info']}
                allowMultiple={true}
                allowNone={false}
                showIcons={true}
                showBadges={true}
                showProgress={true}
                showAdvancedToggle={true}
                variant="card"
                size="md"
                persistState={true}
                stateKey="demo-disclosure"
              />
            </Card.Content>
          </Card>
        )}

        {/* Form Steps Demo */}
        {activeDemo === 'form-steps' && (
          <Card>
            <Card.Header>
              <Card.Title className="text-slate-200">Form Steps</Card.Title>
              <Card.Description className="text-slate-400">
                Individual form steps with validation and field grouping
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <FormStep
                stepId="demo-step"
                title="Demo Form Step"
                description="This demonstrates a single form step with various field types"
                fields={[
                  {
                    id: 'textField',
                    label: 'Text Field',
                    type: 'text',
                    required: true,
                    icon: <User className="w-4 h-4" />,
                    placeholder: 'Enter text'
                  },
                  {
                    id: 'emailField',
                    label: 'Email Field',
                    type: 'email',
                    required: true,
                    icon: <Mail className="w-4 h-4" />,
                    placeholder: 'Enter email'
                  },
                  {
                    id: 'selectField',
                    label: 'Select Field',
                    type: 'select',
                    required: false,
                    icon: <Settings className="w-4 h-4" />,
                    options: [
                      { value: '', label: 'Select option' },
                      { value: 'option1', label: 'Option 1' },
                      { value: 'option2', label: 'Option 2' }
                    ]
                  },
                  {
                    id: 'switchField',
                    label: 'Switch Field',
                    type: 'switch',
                    required: false,
                    icon: <Settings className="w-4 h-4" />,
                    help: 'Toggle this setting'
                  }
                ]}
                groups={[
                  {
                    id: 'group1',
                    title: 'Field Group',
                    description: 'A group of related fields',
                    fields: [
                      {
                        id: 'groupField1',
                        label: 'Group Field 1',
                        type: 'text',
                        required: false,
                        placeholder: 'Enter value'
                      },
                      {
                        id: 'groupField2',
                        label: 'Group Field 2',
                        type: 'text',
                        required: false,
                        placeholder: 'Enter value'
                      }
                    ]
                  }
                ]}
                data={{}}
                errors={{}}
                onDataChange={(data) => logger.debug('Data changed:', data)}
                layout="grid"
                columns={2}
                size="md"
                showTitle={true}
                showDescription={true}
                showProgress={true}
                showFieldHelp={true}
                showFieldIcons={true}
                validateOnChange={true}
                validateOnBlur={true}
                showValidationSummary={true}
                allowSkip={true}
              />
            </Card.Content>
          </Card>
        )}

        {/* Features Overview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <Card.Header>
              <Card.Title className="text-slate-200 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                Enhanced Wizard
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Smart step validation</li>
                <li>• Auto-save and draft management</li>
                <li>• Progress persistence</li>
                <li>• Conditional step rendering</li>
                <li>• Keyboard navigation</li>
                <li>• Mobile responsive</li>
              </ul>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="text-slate-200 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-blue-400" />
                Progressive Disclosure
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Collapsible sections</li>
                <li>• Smooth animations</li>
                <li>• Conditional content</li>
                <li>• Smart defaults</li>
                <li>• Advanced options toggle</li>
                <li>• State persistence</li>
              </ul>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="text-slate-200 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-purple-400" />
                Form Steps
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Field grouping</li>
                <li>• Layout management</li>
                <li>• Real-time validation</li>
                <li>• Progress indicators</li>
                <li>• Accessibility compliance</li>
                <li>• Custom field types</li>
              </ul>
            </Card.Content>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default FormWizardDemo;




