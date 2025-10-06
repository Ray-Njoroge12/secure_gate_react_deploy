// FormWizard component for multi-step forms with progressive disclosure
import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Badge } from './index';
import { useNavigation } from '../../contexts/NavigationContext';

const FormWizard = ({
  steps = [],
  initialStep = 0,
  onComplete,
  onStepChange,
  onSaveDraft,
  showProgress = true,
  showStepNumbers = true,
  allowStepNavigation = true,
  className = '',
  children
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [stepData, setStepData] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const wizardRef = useRef(null);
  const { setPageTitle } = useNavigation();

  // Update page title when step changes
  useEffect(() => {
    if (steps[currentStep]) {
      setPageTitle(steps[currentStep].title);
    }
  }, [currentStep, steps, setPageTitle]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to save draft
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSaveDraft) {
          onSaveDraft(stepData);
        }
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
    };

    const wizard = wizardRef.current;
    if (wizard) {
      wizard.addEventListener('keydown', handleKeyDown);
      return () => wizard.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentStep, steps.length, stepData, onSaveDraft]);

  const handleNext = async () => {
    if (currentStep >= steps.length - 1) return;

    // Validate current step
    const currentStepConfig = steps[currentStep];
    if (currentStepConfig.validate) {
      setIsValidating(true);
      try {
        const isValid = await currentStepConfig.validate(stepData[currentStep] || {});
        if (!isValid) {
          setIsValidating(false);
          return;
        }
      } catch (error) {
        console.error('Step validation error:', error);
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }

    // Mark current step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    
    // Move to next step
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    
    if (onStepChange) {
      onStepChange(nextStep, stepData);
    }
  };

  const handlePrevious = () => {
    if (currentStep <= 0) return;
    
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    
    if (onStepChange) {
      onStepChange(prevStep, stepData);
    }
  };

  const handleStepClick = (stepIndex) => {
    if (!allowStepNavigation) return;
    
    // Only allow navigation to completed steps or next step
    if (stepIndex <= currentStep || completedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex);
      
      if (onStepChange) {
        onStepChange(stepIndex, stepData);
      }
    }
  };

  const handleComplete = async () => {
    // Validate all steps
    for (let i = 0; i < steps.length; i++) {
      const stepConfig = steps[i];
      if (stepConfig.validate) {
        const isValid = await stepConfig.validate(stepData[i] || {});
        if (!isValid) {
          setCurrentStep(i);
          return;
        }
      }
    }

    if (onComplete) {
      await onComplete(stepData);
    }
  };

  const updateStepData = (stepIndex, data) => {
    setStepData(prev => ({
      ...prev,
      [stepIndex]: { ...prev[stepIndex], ...data }
    }));
  };

  const getStepStatus = (stepIndex) => {
    if (completedSteps.has(stepIndex)) return 'completed';
    if (stepIndex === currentStep) return 'current';
    if (stepIndex < currentStep) return 'completed';
    return 'upcoming';
  };

  const getProgressPercentage = () => {
    return Math.round(((currentStep + 1) / steps.length) * 100);
  };

  const currentStepConfig = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div ref={wizardRef} className={`form-wizard ${className}`}>
      {/* Progress Header */}
      {showProgress && steps.length > 1 && (
        <Card className="mb-6">
          <Card.Content className="p-6">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-slate-200">
                  {currentStepConfig?.title || `Step ${currentStep + 1}`}
                </h3>
                <Badge variant="info" size="sm">
                  {currentStep + 1} of {steps.length}
                </Badge>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>

            {/* Step Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {steps.map((step, index) => {
                  const status = getStepStatus(index);
                  const isClickable = allowStepNavigation && (index <= currentStep || completedSteps.has(index));
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleStepClick(index)}
                      disabled={!isClickable}
                      className={`
                        flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-200
                        ${status === 'completed' 
                          ? 'bg-brand-500 text-white' 
                          : status === 'current'
                          ? 'bg-brand-600 text-white ring-2 ring-brand-400'
                          : 'bg-slate-600 text-slate-400'
                        }
                        ${isClickable 
                          ? 'hover:bg-brand-400 cursor-pointer' 
                          : 'cursor-not-allowed opacity-50'
                        }
                      `}
                      aria-label={`Step ${index + 1}: ${step.title}`}
                      title={step.title}
                    >
                      {showStepNumbers ? (
                        status === 'completed' ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
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

              {/* Step Description */}
              {currentStepConfig?.description && (
                <p className="text-sm text-slate-400 max-w-md">
                  {currentStepConfig.description}
                </p>
              )}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Current Step Content */}
      <Card>
        <Card.Content className="p-6">
          {currentStepConfig?.title && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-2">
                {currentStepConfig.title}
              </h2>
              {currentStepConfig.description && (
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
                updateStepData: (data) => updateStepData(currentStep, data),
                allStepData: stepData,
                isFirstStep,
                isLastStep,
                isValidating
              })
            : children
          }
        </Card.Content>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-6">
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
            icon={
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            }
          >
            Previous
          </Button>

          {onSaveDraft && (
            <Button
              variant="ghost"
              onClick={() => onSaveDraft(stepData)}
              disabled={isValidating}
            >
              Save Draft
            </Button>
          )}
        </div>

        <div className="flex space-x-3">
          {!isLastStep ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={isValidating}
              loading={isValidating}
              icon={
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              }
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleComplete}
              disabled={isValidating}
              loading={isValidating}
              icon={
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              }
            >
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormWizard;
