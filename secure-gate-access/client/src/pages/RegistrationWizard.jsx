/**
 * Registration Wizard
 * 
 * A comprehensive multi-step registration process demonstrating:
 * - Enhanced form wizard with progressive disclosure
 * - Step validation and error handling
 * - Auto-save and draft management
 * - Conditional step rendering
 * - Mobile-responsive design
 */

import React, { useState, useCallback } from 'react';
import logger from 'utils/logger';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Building, 
  FileText,
  Camera,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { 
  EnhancedFormWizard, 
  FormStep, 
  ProgressiveDisclosure,
  Card,
  Button,
  Badge,
  Modal
} from '../components/ui';
import { useError, useLoading } from '../contexts';
import Layout from '../components/Layout';

const RegistrationWizard = () => {
  const navigate = useNavigate();
  const { handleError, clearAllErrors } = useError();
  const { isLoading, setLoading } = useLoading();
  
  const [showPreview, setShowPreview] = useState(false);
  const [registrationData, setRegistrationData] = useState({});

  // Wizard steps configuration
  const steps = [
    {
      id: 'personal-info',
      title: 'Personal Information',
      description: 'Tell us about yourself',
      validate: async (data) => {
        const errors = {};
        if (!data.firstName?.trim()) errors.firstName = 'First name is required';
        if (!data.lastName?.trim()) errors.lastName = 'Last name is required';
        if (!data.email?.trim()) errors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = 'Invalid email format';
        if (!data.phone?.trim()) errors.phone = 'Phone number is required';
        if (!data.dateOfBirth?.trim()) errors.dateOfBirth = 'Date of birth is required';
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      id: 'address-info',
      title: 'Address Information',
      description: 'Where do you live?',
      validate: async (data) => {
        const errors = {};
        if (!data.street?.trim()) errors.street = 'Street address is required';
        if (!data.city?.trim()) errors.city = 'City is required';
        if (!data.state?.trim()) errors.state = 'State is required';
        if (!data.zipCode?.trim()) errors.zipCode = 'ZIP code is required';
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      id: 'employment-info',
      title: 'Employment Information',
      description: 'Tell us about your work',
      validate: async (data) => {
        const errors = {};
        if (!data.employer?.trim()) errors.employer = 'Employer is required';
        if (!data.jobTitle?.trim()) errors.jobTitle = 'Job title is required';
        if (!data.workPhone?.trim()) errors.workPhone = 'Work phone is required';
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      id: 'emergency-contact',
      title: 'Emergency Contact',
      description: 'Who should we contact in case of emergency?',
      validate: async (data) => {
        const errors = {};
        if (!data.emergencyName?.trim()) errors.emergencyName = 'Emergency contact name is required';
        if (!data.emergencyPhone?.trim()) errors.emergencyPhone = 'Emergency contact phone is required';
        if (!data.emergencyRelationship?.trim()) errors.emergencyRelationship = 'Relationship is required';
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      id: 'documents',
      title: 'Document Upload',
      description: 'Upload required documents',
      validate: async (data) => {
        const errors = {};
        if (!data.idDocument) errors.idDocument = 'ID document is required';
        if (!data.proofOfAddress) errors.proofOfAddress = 'Proof of address is required';
        
        return Object.keys(errors).length === 0 ? true : errors;
      }
    },
    {
      id: 'review',
      title: 'Review & Submit',
      description: 'Review all information before submitting',
      validate: async (data) => {
        // Final validation - check all previous steps
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
      
      // Store registration data
      setRegistrationData(allStepData);
      setShowPreview(true);
      
    } catch (error) {
      handleError('Registration failed', error);
    } finally {
      await setLoading(false);
    }
  }, [setLoading, handleError]);

  // Handle draft save
  const handleSaveDraft = useCallback(async (draftData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      logger.debug('Draft saved:', draftData);
    } catch (error) {
      handleError('Failed to save draft', error);
    }
  }, [handleError]);

  // Handle draft load
  const handleLoadDraft = useCallback(async (wizardId) => {
    try {
      // Simulate API call
      const savedDraft = localStorage.getItem(`registration-draft-${wizardId}`);
      return savedDraft ? JSON.parse(savedDraft) : null;
    } catch (error) {
      handleError('Failed to load draft', error);
      return null;
    }
  }, [handleError]);

  // Render step content
  const renderStepContent = ({ currentStep, stepData, updateStepData, allStepData, isFirstStep, isLastStep, isValidating, isPreviewMode, stepErrors, validationSummary }) => {
    switch (currentStep) {
      case 0: // Personal Information
        return (
          <FormStep
            stepId="personal-info"
            title="Personal Information"
            description="Please provide your basic personal details"
            fields={[
              {
                id: 'firstName',
                label: 'First Name',
                type: 'text',
                required: true,
                icon: <User className="w-4 h-4" />,
                placeholder: 'Enter your first name'
              },
              {
                id: 'lastName',
                label: 'Last Name',
                type: 'text',
                required: true,
                icon: <User className="w-4 h-4" />,
                placeholder: 'Enter your last name'
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
                required: true,
                icon: <Phone className="w-4 h-4" />,
                placeholder: 'Enter your phone number'
              },
              {
                id: 'dateOfBirth',
                label: 'Date of Birth',
                type: 'date',
                required: true,
                icon: <Calendar className="w-4 h-4" />
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

      case 1: // Address Information
        return (
          <FormStep
            stepId="address-info"
            title="Address Information"
            description="Please provide your current address"
            fields={[
              {
                id: 'street',
                label: 'Street Address',
                type: 'text',
                required: true,
                icon: <MapPin className="w-4 h-4" />,
                placeholder: 'Enter your street address'
              },
              {
                id: 'city',
                label: 'City',
                type: 'text',
                required: true,
                icon: <MapPin className="w-4 h-4" />,
                placeholder: 'Enter your city'
              },
              {
                id: 'state',
                label: 'State',
                type: 'select',
                required: true,
                icon: <MapPin className="w-4 h-4" />,
                options: [
                  { value: '', label: 'Select state' },
                  { value: 'CA', label: 'California' },
                  { value: 'NY', label: 'New York' },
                  { value: 'TX', label: 'Texas' },
                  { value: 'FL', label: 'Florida' }
                ]
              },
              {
                id: 'zipCode',
                label: 'ZIP Code',
                type: 'text',
                required: true,
                icon: <MapPin className="w-4 h-4" />,
                placeholder: 'Enter your ZIP code'
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

      case 2: // Employment Information
        return (
          <FormStep
            stepId="employment-info"
            title="Employment Information"
            description="Tell us about your current employment"
            groups={[
              {
                id: 'employment-details',
                title: 'Current Employment',
                description: 'Information about your current job',
                fields: [
                  {
                    id: 'employer',
                    label: 'Employer',
                    type: 'text',
                    required: true,
                    icon: <Building className="w-4 h-4" />,
                    placeholder: 'Enter your employer name'
                  },
                  {
                    id: 'jobTitle',
                    label: 'Job Title',
                    type: 'text',
                    required: true,
                    icon: <FileText className="w-4 h-4" />,
                    placeholder: 'Enter your job title'
                  },
                  {
                    id: 'workPhone',
                    label: 'Work Phone',
                    type: 'tel',
                    required: true,
                    icon: <Phone className="w-4 h-4" />,
                    placeholder: 'Enter your work phone number'
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

      case 3: // Emergency Contact
        return (
          <FormStep
            stepId="emergency-contact"
            title="Emergency Contact"
            description="Who should we contact in case of emergency?"
            fields={[
              {
                id: 'emergencyName',
                label: 'Contact Name',
                type: 'text',
                required: true,
                icon: <User className="w-4 h-4" />,
                placeholder: 'Enter emergency contact name'
              },
              {
                id: 'emergencyPhone',
                label: 'Contact Phone',
                type: 'tel',
                required: true,
                icon: <Phone className="w-4 h-4" />,
                placeholder: 'Enter emergency contact phone'
              },
              {
                id: 'emergencyRelationship',
                label: 'Relationship',
                type: 'select',
                required: true,
                icon: <User className="w-4 h-4" />,
                options: [
                  { value: '', label: 'Select relationship' },
                  { value: 'spouse', label: 'Spouse' },
                  { value: 'parent', label: 'Parent' },
                  { value: 'sibling', label: 'Sibling' },
                  { value: 'child', label: 'Child' },
                  { value: 'friend', label: 'Friend' },
                  { value: 'other', label: 'Other' }
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

      case 4: // Document Upload
        return (
          <FormStep
            stepId="documents"
            title="Document Upload"
            description="Upload required documents for verification"
            fields={[
              {
                id: 'idDocument',
                label: 'ID Document',
                type: 'file',
                required: true,
                icon: <FileText className="w-4 h-4" />,
                accept: '.pdf,.jpg,.jpeg,.png',
                help: 'Upload a clear photo or scan of your government-issued ID'
              },
              {
                id: 'proofOfAddress',
                label: 'Proof of Address',
                type: 'file',
                required: true,
                icon: <MapPin className="w-4 h-4" />,
                accept: '.pdf,.jpg,.jpeg,.png',
                help: 'Upload a utility bill or bank statement from the last 3 months'
              }
            ]}
            data={stepData}
            errors={stepErrors}
            onDataChange={updateStepData}
            layout="vertical"
            size="md"
          />
        );

      case 5: // Review & Submit
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <CheckCircle className="w-16 h-16 text-brand-500 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-slate-100 mb-2">
                Review Your Information
              </h3>
              <p className="text-slate-400">
                Please review all information before submitting your registration.
              </p>
            </div>

            <ProgressiveDisclosure
              sections={[
                {
                  id: 'personal',
                  title: 'Personal Information',
                  description: 'Your basic personal details',
                  icon: <User className="w-5 h-5" />,
                  completed: true,
                  content: ({ isExpanded }) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-slate-400">First Name:</span>
                          <p className="text-slate-200">{allStepData[0]?.firstName || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Last Name:</span>
                          <p className="text-slate-200">{allStepData[0]?.lastName || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Email:</span>
                          <p className="text-slate-200">{allStepData[0]?.email || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Phone:</span>
                          <p className="text-slate-200">{allStepData[0]?.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Date of Birth:</span>
                          <p className="text-slate-200">{allStepData[0]?.dateOfBirth || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  id: 'address',
                  title: 'Address Information',
                  description: 'Your current address',
                  icon: <MapPin className="w-5 h-5" />,
                  completed: true,
                  content: ({ isExpanded }) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-slate-400">Street:</span>
                          <p className="text-slate-200">{allStepData[1]?.street || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">City:</span>
                          <p className="text-slate-200">{allStepData[1]?.city || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">State:</span>
                          <p className="text-slate-200">{allStepData[1]?.state || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">ZIP Code:</span>
                          <p className="text-slate-200">{allStepData[1]?.zipCode || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  id: 'employment',
                  title: 'Employment Information',
                  description: 'Your current employment details',
                  icon: <Building className="w-5 h-5" />,
                  completed: true,
                  content: ({ isExpanded }) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-slate-400">Employer:</span>
                          <p className="text-slate-200">{allStepData[2]?.employer || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Job Title:</span>
                          <p className="text-slate-200">{allStepData[2]?.jobTitle || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Work Phone:</span>
                          <p className="text-slate-200">{allStepData[2]?.workPhone || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  id: 'emergency',
                  title: 'Emergency Contact',
                  description: 'Your emergency contact information',
                  icon: <Shield className="w-5 h-5" />,
                  completed: true,
                  content: ({ isExpanded }) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-slate-400">Contact Name:</span>
                          <p className="text-slate-200">{allStepData[3]?.emergencyName || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Contact Phone:</span>
                          <p className="text-slate-200">{allStepData[3]?.emergencyPhone || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-slate-400">Relationship:</span>
                          <p className="text-slate-200">{allStepData[3]?.emergencyRelationship || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  )
                }
              ]}
              defaultExpanded={['personal']}
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
    <Layout title="Registration Wizard" role="guest">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            User Registration
          </h1>
          <p className="text-slate-400">
            Complete your registration in a few simple steps
          </p>
        </div>

        {/* Enhanced Form Wizard */}
        <EnhancedFormWizard
          steps={steps}
          wizardId="registration-wizard"
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

        {/* Success Modal */}
        <Modal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title="Registration Complete!"
          size="lg"
        >
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-slate-100 mb-2">
              Registration Successful!
            </h3>
            <p className="text-slate-400 mb-6">
              Your registration has been submitted successfully. You will receive a confirmation email shortly.
            </p>
            <div className="flex justify-center space-x-4">
              <Button
                variant="primary"
                onClick={() => navigate('/login')}
              >
                Go to Login
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default RegistrationWizard;




