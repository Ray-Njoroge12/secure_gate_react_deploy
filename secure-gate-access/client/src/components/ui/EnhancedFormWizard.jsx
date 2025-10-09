/**
 * Enhanced Form Wizard Component
 * 
 * Advanced multi-step form with progressive disclosure features:
 * - Smart step validation and error handling
 * - Auto-save and draft management
 * - Progress persistence across sessions
 * - Conditional step rendering
 * - Step dependencies and branching
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Mobile-responsive design
 * - Keyboard navigation support
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import logger from 'utils/logger';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  AlertCircle, 
  Save, 
  Eye, 
  EyeOff,
  RotateCcw,
  Home,
  Download,
  Upload
} from 'lucide-react';
import { Button, Card, Badge, Modal, Progress } from './index';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';
import { componentTokens } from '../../design-system';

const EnhancedFormWizard = ({
  // Core configuration
  steps = [],
  initialStep = 0,
  wizardId = 'default-wizard',
  
  // Event handlers
  onComplete,
  onStepChange,
  onSaveDraft,
  onLoadDraft,
  onReset,
  
  // Display options
  showProgress = true,
  showStepNumbers = true,
  showStepTitles = true,
  showStepDescriptions = true,
  allowStepNavigation = true,
  showDraftActions = true,
  showPreviewMode = true,
  
  // Validation options
  validateOnStepChange = true,
  validateOnComplete = true,
  showValidationSummary = true,
  
  // Persistence options
  autoSave = true,
  autoSaveInterval = 30000, // 30 seconds
  draftExpiry = 24 * 60 * 60 * 1000, // 24 hours
  
  // UI customization
  className = '',
  stepClassName = '',
  navigationClassName = '',
  
  // Children render function
  children
}) => {
  const navigate = useNavigate();
  const { handleError, clearAllErrors } = useError();
  const { isLoading, setLoading } = useLoading();
  
  // State management
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [stepData, setStepData] = useState({});
  const [stepErrors, setStepErrors] = useState({});
  const [stepValidation, setStepValidation] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Refs
  const wizardRef = useRef(null);
  const autoSaveRef = useRef(null);
  const validationTimeoutRef = useRef(null);

  // Get current step configuration
  const currentStepConfig = useMemo(() => {
    return steps[currentStep] || {};
  }, [steps, currentStep]);

  // Check if step is accessible
  const isStepAccessible = useCallback((stepIndex) => {
    if (!allowStepNavigation) return stepIndex <= currentStep;
    
    const step = steps[stepIndex];
    if (!step) return false;
    
    // Check dependencies
    if (step.dependsOn) {
      return step.dependsOn.every(dep => {
        if (typeof dep === 'number') {
          return completedSteps.has(dep);
        }
        if (typeof dep === 'function') {
          return dep(stepData, currentStep);
        }
        return false;
      });
    }
    
    return stepIndex <= currentStep || completedSteps.has(stepIndex);
  }, [allowStepNavigation, currentStep, completedSteps, steps, stepData]);

  // Validate step data
  const validateStep = useCallback(async (stepIndex, data) => {
    const step = steps[stepIndex];
    if (!step || !step.validate) return { isValid: true, errors: {} };

    try {
      const result = await step.validate(data, stepData);
      
      if (result === true) {
        return { isValid: true, errors: {} };
      } else if (typeof result === 'object' && result !== null) {
        return { isValid: false, errors: result };
      } else {
        return { isValid: false, errors: { general: 'Validation failed' } };
      }
    } catch (error) {
      logger.error('Step validation error:', error);
      return { isValid: false, errors: { general: error.message } };
    }
  }, [steps, stepData]);

  // Update step data with validation
  const updateStepData = useCallback((stepIndex, data, skipValidation = false) => {
    setStepData(prev => ({
      ...prev,
      [stepIndex]: { ...prev[stepIndex], ...data }
    }));

    // Clear previous validation timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Debounced validation
    if (!skipValidation && validateOnStepChange) {
      validationTimeoutRef.current = setTimeout(async () => {
        const validation = await validateStep(stepIndex, { ...stepData[stepIndex], ...data });
        setStepValidation(prev => ({
          ...prev,
          [stepIndex]: validation
        }));
        
        if (!validation.isValid) {
          setStepErrors(prev => ({
            ...prev,
            [stepIndex]: validation.errors
          }));
        } else {
          setStepErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[stepIndex];
            return newErrors;
          });
        }
      }, 500);
    }
  }, [stepData, validateOnStepChange, validateStep]);

  // Auto-save functionality
  const saveDraft = useCallback(async () => {
    if (!onSaveDraft) return;

    try {
      const draftData = {
        stepData,
        currentStep,
        completedSteps: Array.from(completedSteps),
        timestamp: Date.now(),
        wizardId
      };

      await onSaveDraft(draftData);
      setDraftSaved(true);
      setLastSaved(new Date());
      
      // Clear success message after 3 seconds
      setTimeout(() => setDraftSaved(false), 3000);
    } catch (error) {
      handleError('Failed to save draft', error);
    }
  }, [onSaveDraft, stepData, currentStep, completedSteps, wizardId, handleError]);

  // Load draft functionality
  const loadDraft = useCallback(async () => {
    if (!onLoadDraft) return;

    try {
      const draftData = await onLoadDraft(wizardId);
      if (draftData) {
        setStepData(draftData.stepData || {});
        setCurrentStep(draftData.currentStep || 0);
        setCompletedSteps(new Set(draftData.completedSteps || []));
        setLastSaved(new Date(draftData.timestamp));
      }
    } catch (error) {
      handleError('Failed to load draft', error);
    }
  }, [onLoadDraft, wizardId, handleError]);

  // Set up auto-save
  useEffect(() => {
    if (autoSave && onSaveDraft) {
      autoSaveRef.current = setInterval(saveDraft, autoSaveInterval);
      return () => {
        if (autoSaveRef.current) {
          clearInterval(autoSaveRef.current);
        }
      };
    }
  }, [autoSave, onSaveDraft, saveDraft, autoSaveInterval]);

  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!wizardRef.current?.contains(document.activeElement)) return;

      // Ctrl/Cmd + S to save draft
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDraft();
      }
      
      // Ctrl/Cmd + Enter to go to next step
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (currentStep < steps.length - 1) {
          handleNext();
        } else {
          handleComplete();
        }
      }
      
      // Escape to go back
      if (e.key === 'Escape') {
        e.preventDefault();
        if (currentStep > 0) {
          handlePrevious();
        }
      }
      
      // Ctrl/Cmd + P to toggle preview
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsPreviewMode(prev => !prev);
      }
    };

    const wizard = wizardRef.current;
    if (wizard) {
      wizard.addEventListener('keydown', handleKeyDown);
      return () => wizard.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentStep, steps.length, saveDraft]);

  // Navigation handlers
  const handleNext = async () => {
    if (currentStep >= steps.length - 1) return;

    // Validate current step
    if (validateOnStepChange) {
      setIsValidating(true);
      const validation = await validateStep(currentStep, stepData[currentStep] || {});
      
      if (!validation.isValid) {
        setStepErrors(prev => ({
          ...prev,
          [currentStep]: validation.errors
        }));
        setIsValidating(false);
        return;
      }
    }

    // Mark current step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    
    // Move to next step
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    
    if (onStepChange) {
      onStepChange(nextStep, stepData, { action: 'next' });
    }
  };

  const handlePrevious = () => {
    if (currentStep <= 0) return;
    
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    
    if (onStepChange) {
      onStepChange(prevStep, stepData, { action: 'previous' });
    }
  };

  const handleStepClick = async (stepIndex) => {
    if (!isStepAccessible(stepIndex)) return;
    
    // Validate current step if moving forward
    if (stepIndex > currentStep && validateOnStepChange) {
      const validation = await validateStep(currentStep, stepData[currentStep] || {});
      if (!validation.isValid) {
        setStepErrors(prev => ({
          ...prev,
          [currentStep]: validation.errors
        }));
        return;
      }
    }
    
    setCurrentStep(stepIndex);
    
    if (onStepChange) {
      onStepChange(stepIndex, stepData, { action: 'jump' });
    }
  };

  const handleComplete = async () => {
    if (validateOnComplete) {
      setIsValidating(true);
      
      // Validate all steps
      for (let i = 0; i < steps.length; i++) {
        const validation = await validateStep(i, stepData[i] || {});
        if (!validation.isValid) {
          setStepErrors(prev => ({
            ...prev,
            [i]: validation.errors
          }));
          setCurrentStep(i);
          setIsValidating(false);
          return;
        }
      }
    }

    try {
      await setLoading(true);
      await onComplete(stepData, { completedSteps: Array.from(completedSteps) });
    } catch (error) {
      handleError('Failed to complete wizard', error);
    } finally {
      await setLoading(false);
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setStepData({});
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setStepErrors({});
    setStepValidation({});
    clearAllErrors();
    
    if (onReset) {
      onReset();
    }
  };

  // Get step status
  const getStepStatus = (stepIndex) => {
    if (completedSteps.has(stepIndex)) return 'completed';
    if (stepIndex === currentStep) return 'current';
    if (stepIndex < currentStep) return 'completed';
    return 'upcoming';
  };

  // Get progress percentage
  const getProgressPercentage = () => {
    return Math.round(((currentStep + 1) / steps.length) * 100);
  };

  // Get validation summary
  const getValidationSummary = () => {
    const totalSteps = steps.length;
    const completedStepsCount = completedSteps.size;
    const errorSteps = Object.keys(stepErrors).length;
    
    return {
      totalSteps,
      completedSteps: completedStepsCount,
      errorSteps,
      progress: Math.round((completedStepsCount / totalSteps) * 100)
    };
  };

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const validationSummary = getValidationSummary();

  return (
    <div ref={wizardRef} className={`enhanced-form-wizard ${className}`}>
      {/* Progress Header */}
      {showProgress && steps.length > 1 && (
        <Card className="mb-6">
          <Card.Content className="p-6">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-slate-200">
                  {showStepTitles && currentStepConfig?.title 
                    ? currentStepConfig.title 
                    : `Step ${currentStep + 1}`
                  }
                </h3>
                <div className="flex items-center space-x-2">
                  <Badge variant="info" size="sm">
                    {currentStep + 1} of {steps.length}
                  </Badge>
                  {draftSaved && (
                    <Badge variant="success" size="sm">
                      <Save className="w-3 h-3 mr-1" />
                      Saved
                    </Badge>
                  )}
                </div>
              </div>
              
              <Progress 
                value={getProgressPercentage()} 
                className="h-2"
                variant="brand"
              />
              
              {showStepDescriptions && currentStepConfig?.description && (
                <p className="text-sm text-slate-400 mt-2">
                  {currentStepConfig.description}
                </p>
              )}
            </div>

            {/* Step Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {steps.map((step, index) => {
                  const status = getStepStatus(index);
                  const isAccessible = isStepAccessible(index);
                  const hasErrors = stepErrors[index];
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleStepClick(index)}
                      disabled={!isAccessible}
                      className={`
                        flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-200
                        ${status === 'completed' 
                          ? 'bg-brand-500 text-white' 
                          : status === 'current'
                          ? 'bg-brand-600 text-white ring-2 ring-brand-400'
                          : 'bg-slate-600 text-slate-400'
                        }
                        ${isAccessible 
                          ? 'hover:bg-brand-400 cursor-pointer' 
                          : 'cursor-not-allowed opacity-50'
                        }
                        ${hasErrors ? 'ring-2 ring-red-400' : ''}
                      `}
                      aria-label={`Step ${index + 1}: ${step.title}${hasErrors ? ' (has errors)' : ''}`}
                      title={step.title}
                    >
                      {showStepNumbers ? (
                        status === 'completed' ? (
                          <Check className="w-4 h-4" />
                        ) : hasErrors ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          index + 1
                        )
                      ) : (
                        <div className={`w-2 h-2 rounded-full ${status === 'current' ? 'bg-white' : 'bg-current'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {showPreviewMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    icon={isPreviewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  >
                    {isPreviewMode ? 'Hide' : 'Preview'}
                  </Button>
                )}
                
                {showDraftActions && onSaveDraft && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={saveDraft}
                    disabled={isValidating}
                    icon={<Save className="w-4 h-4" />}
                  >
                    Save Draft
                  </Button>
                )}
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Validation Summary */}
      {showValidationSummary && Object.keys(stepErrors).length > 0 && (
        <Card className="mb-6 border-red-500/20">
          <Card.Content className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h4 className="text-red-400 font-medium">Validation Errors</h4>
            </div>
            <div className="space-y-1">
              {Object.entries(stepErrors).map(([stepIndex, errors]) => (
                <div key={stepIndex} className="text-sm text-red-300">
                  Step {parseInt(stepIndex) + 1}: {Object.values(errors).join(', ')}
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Current Step Content */}
      <Card className={stepClassName}>
        <Card.Content className="p-6">
          {/* Step Header */}
          {showStepTitles && currentStepConfig?.title && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-2">
                {currentStepConfig.title}
              </h2>
              {showStepDescriptions && currentStepConfig.description && (
                <p className="text-slate-400">
                  {currentStepConfig.description}
                </p>
              )}
            </div>
          )}

          {/* Render step content */}
          {children && typeof children === 'function' 
            ? children({
                currentStep,
                stepData: stepData[currentStep] || {},
                updateStepData: (data, skipValidation) => updateStepData(currentStep, data, skipValidation),
                allStepData: stepData,
                isFirstStep,
                isLastStep,
                isValidating,
                isPreviewMode,
                stepErrors: stepErrors[currentStep] || {},
                validationSummary
              })
            : children
          }
        </Card.Content>
      </Card>

      {/* Navigation Buttons */}
      <div className={`flex justify-between items-center mt-6 ${navigationClassName}`}>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep || isValidating}
            icon={<ChevronLeft className="w-4 h-4 mr-2" />}
          >
            Previous
          </Button>

          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isValidating}
            icon={<RotateCcw className="w-4 h-4 mr-2" />}
          >
            Reset
          </Button>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            icon={<Home className="w-4 h-4 mr-2" />}
          >
            Home
          </Button>

          {!isLastStep ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={isValidating}
              loading={isValidating}
              icon={<ChevronRight className="w-4 h-4 ml-2" />}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleComplete}
              disabled={isValidating}
              loading={isValidating}
              icon={<Check className="w-4 h-4 ml-2" />}
            >
              Complete
            </Button>
          )}
        </div>
      </div>

      {/* Draft Status */}
      {lastSaved && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Last saved: {lastSaved.toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default EnhancedFormWizard;
