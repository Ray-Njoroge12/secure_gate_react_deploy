/**
 * Settings Wizard
 * 
 * A comprehensive settings configuration wizard for admin users:
 * - System configuration
 * - User management settings
 * - Security settings
 * - Notification preferences
 * - Advanced options with progressive disclosure
 */

import React, { useState, useCallback } from 'react';
import logger from 'utils/logger';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Users, 
  Shield, 
  Bell, 
  Database, 
  Globe, 
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info,
  Save,
  RotateCcw
} from 'lucide-react';
import { 
  EnhancedFormWizard, 
  FormStep, 
  ProgressiveDisclosure,
  Card,
  Button,
  Badge,
  Switch,
  Select
} from '../components/ui';
import { useError, useLoading } from '../../contexts';
import Layout from '../components/Layout';

const SettingsWizard = () => {
  const navigate = useNavigate();
  const { handleError, clearAllErrors } = useError();
  const { isLoading, setLoading } = useLoading();
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settingsData, setSettingsData] = useState({});

  // Wizard steps configuration
  const steps = [
    {
      id: 'general-settings',
      title: 'General Settings',
      description: 'Basic system configuration',
      validate: async (data) => {
        const errors = {};
        if (!data.siteName?.trim()) errors.siteName = 'Site name is required';
        if (!data.adminEmail?.trim()) errors.adminEmail = 'Admin email is required';
        else if (!/\S+@\S+\.\S+/.test(data.adminEmail)) errors.adminEmail = 'Invalid email format';
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Configure user registration and permissions',
      validate: async (data) => {
        const errors = {};
        if (data.requireEmailVerification === undefined) {
          errors.requireEmailVerification = 'Email verification setting is required';
        }
        if (data.allowSelfRegistration === undefined) {
          errors.allowSelfRegistration = 'Self registration setting is required';
        }
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      id: 'security-settings',
      title: 'Security Settings',
      description: 'Configure security and authentication',
      validate: async (data) => {
        const errors = {};
        if (!data.sessionTimeout) errors.sessionTimeout = 'Session timeout is required';
        if (data.requireTwoFactor === undefined) {
          errors.requireTwoFactor = 'Two-factor authentication setting is required';
        }
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      id: 'notifications',
      title: 'Notification Settings',
      description: 'Configure email and system notifications',
      validate: async (data) => {
        const errors = {};
        if (!data.smtpHost?.trim()) errors.smtpHost = 'SMTP host is required';
        if (!data.smtpPort) errors.smtpPort = 'SMTP port is required';
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      id: 'advanced-settings',
      title: 'Advanced Settings',
      description: 'Advanced system configuration',
      validate: async (data) => {
        // Advanced settings are optional
        return true;
      }
    },
    {
      id: 'review',
      title: 'Review & Apply',
      description: 'Review all settings before applying',
      validate: async (data) => {
        return true;
      }
    }
  ];

  // Handle wizard completion
  const handleComplete = useCallback(async (allStepData) => {
    try {
      await setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Store settings data
      setSettingsData(allStepData);
      
      // Show success message
      logger.debug('Settings saved successfully:', allStepData);
      
    } catch (error) {
      handleError('Failed to save settings', error);
    } finally {
      await setLoading(false);
    }
  }, [setLoading, handleError]);

  // Handle draft save
  const handleSaveDraft = useCallback(async (draftData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      logger.debug('Settings draft saved:', draftData);
    } catch (error) {
      handleError('Failed to save draft', error);
    }
  }, [handleError]);

  // Handle draft load
  const handleLoadDraft = useCallback(async (wizardId) => {
    try {
      // Simulate API call
      const savedDraft = localStorage.getItem(`settings-draft-${wizardId}`);
      return savedDraft ? JSON.parse(savedDraft) : null;
    } catch (error) {
      handleError('Failed to load draft', error);
      return null;
    }
  }, [handleError]);

  // Render step content
  const renderStepContent = ({ currentStep, stepData, updateStepData, allStepData, isFirstStep, isLastStep, isValidating, isPreviewMode, stepErrors, validationSummary }) => {
    switch (currentStep) {
      case 0: // General Settings
        return (
          <FormStep
            stepId="general-settings"
            title="General Settings"
            description="Configure basic system settings"
            fields={[
              {
                id: 'siteName',
                label: 'Site Name',
                type: 'text',
                required: true,
                icon: <Globe className="w-4 h-4" />,
                placeholder: 'Enter site name',
                help: 'This will be displayed in the browser title and emails'
              },
              {
                id: 'adminEmail',
                label: 'Admin Email',
                type: 'email',
                required: true,
                icon: <Settings className="w-4 h-4" />,
                placeholder: 'admin@example.com',
                help: 'Primary administrator email address'
              },
              {
                id: 'timezone',
                label: 'Timezone',
                type: 'select',
                required: true,
                icon: <Globe className="w-4 h-4" />,
                options: [
                  { value: 'UTC', label: 'UTC' },
                  { value: 'America/New_York', label: 'Eastern Time' },
                  { value: 'America/Chicago', label: 'Central Time' },
                  { value: 'America/Denver', label: 'Mountain Time' },
                  { value: 'America/Los_Angeles', label: 'Pacific Time' }
                ]
              },
              {
                id: 'language',
                label: 'Default Language',
                type: 'select',
                required: true,
                icon: <Globe className="w-4 h-4" />,
                options: [
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Spanish' },
                  { value: 'fr', label: 'French' },
                  { value: 'de', label: 'German' }
                ]
              }
            ]}
            data={stepData}
            errors={stepErrors}
            onDataChange={updateStepData}
            layout="grid"
            columns={2}
            size="md"
          />
        );

      case 1: // User Management
        return (
          <FormStep
            stepId="user-management"
            title="User Management"
            description="Configure user registration and permissions"
            groups={[
              {
                id: 'registration-settings',
                title: 'Registration Settings',
                description: 'Control how users can register',
                fields: [
                  {
                    id: 'allowSelfRegistration',
                    label: 'Allow Self Registration',
                    type: 'switch',
                    required: true,
                    icon: <Users className="w-4 h-4" />,
                    help: 'Allow users to register themselves'
                  },
                  {
                    id: 'requireEmailVerification',
                    label: 'Require Email Verification',
                    type: 'switch',
                    required: true,
                    icon: <Shield className="w-4 h-4" />,
                    help: 'Require users to verify their email before activation'
                  },
                  {
                    id: 'requireAdminApproval',
                    label: 'Require Admin Approval',
                    type: 'switch',
                    required: false,
                    icon: <Users className="w-4 h-4" />,
                    help: 'Require admin approval for new registrations'
                  }
                ]
              },
              {
                id: 'permission-settings',
                title: 'Permission Settings',
                description: 'Configure default user permissions',
                fields: [
                  {
                    id: 'defaultUserRole',
                    label: 'Default User Role',
                    type: 'select',
                    required: true,
                    icon: <Users className="w-4 h-4" />,
                    options: [
                      { value: 'resident', label: 'Resident' },
                      { value: 'guard', label: 'Guard' },
                      { value: 'admin', label: 'Administrator' }
                    ]
                  },
                  {
                    id: 'allowRoleChange',
                    label: 'Allow Role Changes',
                    type: 'switch',
                    required: false,
                    icon: <Users className="w-4 h-4" />,
                    help: 'Allow users to change their own roles'
                  }
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

      case 2: // Security Settings
        return (
          <FormStep
            stepId="security-settings"
            title="Security Settings"
            description="Configure security and authentication"
            groups={[
              {
                id: 'authentication-settings',
                title: 'Authentication Settings',
                description: 'Configure login and session security',
                fields: [
                  {
                    id: 'sessionTimeout',
                    label: 'Session Timeout (minutes)',
                    type: 'number',
                    required: true,
                    icon: <Shield className="w-4 h-4" />,
                    placeholder: '30',
                    min: 5,
                    max: 480,
                    help: 'How long users stay logged in (5-480 minutes)'
                  },
                  {
                    id: 'requireTwoFactor',
                    label: 'Require Two-Factor Authentication',
                    type: 'switch',
                    required: true,
                    icon: <Key className="w-4 h-4" />,
                    help: 'Require 2FA for all users'
                  },
                  {
                    id: 'maxLoginAttempts',
                    label: 'Max Login Attempts',
                    type: 'number',
                    required: true,
                    icon: <Shield className="w-4 h-4" />,
                    placeholder: '5',
                    min: 3,
                    max: 10,
                    help: 'Maximum failed login attempts before lockout'
                  }
                ]
              },
              {
                id: 'password-settings',
                title: 'Password Settings',
                description: 'Configure password requirements',
                fields: [
                  {
                    id: 'minPasswordLength',
                    label: 'Minimum Password Length',
                    type: 'number',
                    required: true,
                    icon: <Key className="w-4 h-4" />,
                    placeholder: '8',
                    min: 6,
                    max: 32,
                    help: 'Minimum password length (6-32 characters)'
                  },
                  {
                    id: 'requireSpecialChars',
                    label: 'Require Special Characters',
                    type: 'switch',
                    required: false,
                    icon: <Key className="w-4 h-4" />,
                    help: 'Require special characters in passwords'
                  },
                  {
                    id: 'passwordExpiry',
                    label: 'Password Expiry (days)',
                    type: 'number',
                    required: false,
                    icon: <Key className="w-4 h-4" />,
                    placeholder: '90',
                    min: 30,
                    max: 365,
                    help: 'Days before password expires (leave empty for no expiry)'
                  }
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

      case 3: // Notification Settings
        return (
          <FormStep
            stepId="notifications"
            title="Notification Settings"
            description="Configure email and system notifications"
            groups={[
              {
                id: 'email-settings',
                title: 'Email Configuration',
                description: 'Configure SMTP settings for sending emails',
                fields: [
                  {
                    id: 'smtpHost',
                    label: 'SMTP Host',
                    type: 'text',
                    required: true,
                    icon: <Settings className="w-4 h-4" />,
                    placeholder: 'smtp.gmail.com',
                    help: 'SMTP server hostname'
                  },
                  {
                    id: 'smtpPort',
                    label: 'SMTP Port',
                    type: 'number',
                    required: true,
                    icon: <Settings className="w-4 h-4" />,
                    placeholder: '587',
                    min: 1,
                    max: 65535,
                    help: 'SMTP server port (usually 587 for TLS)'
                  },
                  {
                    id: 'smtpUsername',
                    label: 'SMTP Username',
                    type: 'text',
                    required: false,
                    icon: <Settings className="w-4 h-4" />,
                    placeholder: 'your-email@gmail.com',
                    help: 'SMTP authentication username'
                  },
                  {
                    id: 'smtpPassword',
                    label: 'SMTP Password',
                    type: 'password',
                    required: false,
                    icon: <Key className="w-4 h-4" />,
                    placeholder: 'Enter SMTP password',
                    help: 'SMTP authentication password'
                  }
                ]
              },
              {
                id: 'notification-preferences',
                title: 'Notification Preferences',
                description: 'Configure what notifications to send',
                fields: [
                  {
                    id: 'sendWelcomeEmails',
                    label: 'Send Welcome Emails',
                    type: 'switch',
                    required: false,
                    icon: <Bell className="w-4 h-4" />,
                    help: 'Send welcome emails to new users'
                  },
                  {
                    id: 'sendPasswordResetEmails',
                    label: 'Send Password Reset Emails',
                    type: 'switch',
                    required: false,
                    icon: <Bell className="w-4 h-4" />,
                    help: 'Send password reset emails'
                  },
                  {
                    id: 'sendSecurityAlerts',
                    label: 'Send Security Alerts',
                    type: 'switch',
                    required: false,
                    icon: <Shield className="w-4 h-4" />,
                    help: 'Send security alert emails to admins'
                  }
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

      case 4: // Advanced Settings
        return (
          <ProgressiveDisclosure
            sections={[
              {
                id: 'database-settings',
                title: 'Database Settings',
                description: 'Configure database connection and backup settings',
                icon: <Database className="w-5 h-5" />,
                content: ({ isExpanded }) => (
                  <FormStep
                    stepId="database-settings"
                    title="Database Configuration"
                    description="Advanced database settings"
                    fields={[
                      {
                        id: 'dbBackupEnabled',
                        label: 'Enable Automatic Backups',
                        type: 'switch',
                        required: false,
                        icon: <Database className="w-4 h-4" />,
                        help: 'Automatically backup database daily'
                      },
                      {
                        id: 'dbBackupRetention',
                        label: 'Backup Retention (days)',
                        type: 'number',
                        required: false,
                        icon: <Database className="w-4 h-4" />,
                        placeholder: '30',
                        min: 7,
                        max: 365,
                        help: 'How long to keep database backups'
                      }
                    ]}
                    data={stepData}
                    errors={stepErrors}
                    onDataChange={updateStepData}
                    layout="vertical"
                    size="md"
                  />
                )
              },
              {
                id: 'logging-settings',
                title: 'Logging Settings',
                description: 'Configure system logging and monitoring',
                icon: <Settings className="w-5 h-5" />,
                content: ({ isExpanded }) => (
                  <FormStep
                    stepId="logging-settings"
                    title="Logging Configuration"
                    description="System logging and monitoring settings"
                    fields={[
                      {
                        id: 'logLevel',
                        label: 'Log Level',
                        type: 'select',
                        required: true,
                        icon: <Settings className="w-4 h-4" />,
                        options: [
                          { value: 'error', label: 'Error Only' },
                          { value: 'warn', label: 'Warning and Error' },
                          { value: 'info', label: 'Info, Warning and Error' },
                          { value: 'debug', label: 'All Logs' }
                        ]
                      },
                      {
                        id: 'logRetention',
                        label: 'Log Retention (days)',
                        type: 'number',
                        required: true,
                        icon: <Settings className="w-4 h-4" />,
                        placeholder: '30',
                        min: 1,
                        max: 365,
                        help: 'How long to keep log files'
                      }
                    ]}
                    data={stepData}
                    errors={stepErrors}
                    onDataChange={updateStepData}
                    layout="vertical"
                    size="md"
                  />
                )
              }
            ]}
            defaultExpanded={[]}
            showProgress={true}
            showAdvancedToggle={true}
          />
        );

      case 5: // Review & Apply
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <CheckCircle className="w-16 h-16 text-brand-500 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-slate-100 mb-2">
                Review Settings
              </h3>
              <p className="text-slate-400">
                Review all settings before applying them to the system.
              </p>
            </div>

            <ProgressiveDisclosure
              sections={[
                {
                  id: 'general-review',
                  title: 'General Settings',
                  description: 'Basic system configuration',
                  icon: <Settings className="w-5 h-5" />,
                  completed: true,
                  content: ({ isExpanded }) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-slate-400">Site Name:</span>
                          <p className="text-slate-200">{allStepData[0]?.siteName || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Admin Email:</span>
                          <p className="text-slate-200">{allStepData[0]?.adminEmail || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Timezone:</span>
                          <p className="text-slate-200">{allStepData[0]?.timezone || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Language:</span>
                          <p className="text-slate-200">{allStepData[0]?.language || 'Not set'}</p>
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  id: 'security-review',
                  title: 'Security Settings',
                  description: 'Security and authentication configuration',
                  icon: <Shield className="w-5 h-5" />,
                  completed: true,
                  content: ({ isExpanded }) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-slate-400">Session Timeout:</span>
                          <p className="text-slate-200">{allStepData[2]?.sessionTimeout || 'Not set'} minutes</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Two-Factor Auth:</span>
                          <p className="text-slate-200">{allStepData[2]?.requireTwoFactor ? 'Required' : 'Optional'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Max Login Attempts:</span>
                          <p className="text-slate-200">{allStepData[2]?.maxLoginAttempts || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Min Password Length:</span>
                          <p className="text-slate-200">{allStepData[2]?.minPasswordLength || 'Not set'} characters</p>
                        </div>
                      </div>
                    </div>
                  )
                }
              ]}
              defaultExpanded={['general-review']}
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
    <Layout title="Settings Wizard" role="admin">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            System Settings
          </h1>
          <p className="text-slate-400">
            Configure your system settings and preferences
          </p>
        </div>

        {/* Enhanced Form Wizard */}
        <EnhancedFormWizard
          steps={steps}
          wizardId="settings-wizard"
          onComplete={handleComplete}
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
      </div>
    </Layout>
  );
};

export default SettingsWizard;




