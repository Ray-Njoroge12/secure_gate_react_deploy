/**
 * Navigation Flow Component
 * 
 * A component that provides step-by-step navigation through defined flows,
 * with progress indication, step validation, and navigation controls.
 */

import React, { useState, useEffect, useMemo } from 'react';
import logger from 'utils/logger';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Home } from 'lucide-react';
import Button from './Button';
import { useNavigation } from '../../contexts/NavigationContext';
import { NAVIGATION_FLOWS } from '../../utils/navigationFlow';

const NavigationFlow = ({
  flowName,
  userRole,
  onStepChange = null,
  onFlowComplete = null,
  onFlowCancel = null,
  showProgress = true,
  showStepNumbers = true,
  allowSkip = false,
  validateSteps = false,
  className = ''
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCurrentFlowStep, goToNextInFlow, goToPreviousInFlow } = useNavigation();
  
  const [currentStep, setCurrentStep] = useState(null);
  const [stepValidation, setStepValidation] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get flow configuration
  const flowConfig = useMemo(() => {
    if (!userRole || !flowName) return null;
    return NAVIGATION_FLOWS[userRole]?.flows[flowName];
  }, [userRole, flowName]);

  // Get current step information
  useEffect(() => {
    if (flowConfig) {
      const stepInfo = getCurrentFlowStep(location.pathname);
      if (stepInfo && stepInfo.flowName === flowName) {
        setCurrentStep(stepInfo);
      }
    }
  }, [flowConfig, location.pathname, flowName, getCurrentFlowStep]);

  // Handle step validation
  const validateCurrentStep = async () => {
    if (!validateSteps || !currentStep) return true;

    try {
      // This would integrate with your validation system
      // For now, we'll simulate validation
      const isValid = true; // Replace with actual validation logic
      
      setStepValidation(prev => ({
        ...prev,
        [currentStep.stepIndex]: { isValid, timestamp: Date.now() }
      }));

      return isValid;
    } catch (error) {
      setStepValidation(prev => ({
        ...prev,
        [currentStep.stepIndex]: { isValid: false, error: error.message, timestamp: Date.now() }
      }));
      return false;
    }
  };

  // Navigate to next step
  const handleNext = async () => {
    if (!currentStep || !flowConfig) return;

    // Validate current step if validation is enabled
    if (validateSteps) {
      const isValid = await validateCurrentStep();
      if (!isValid) return;
    }

    setIsTransitioning(true);

    try {
      const nextPath = goToNextInFlow(flowName, location.pathname);
      if (nextPath) {
        if (onStepChange) {
          onStepChange(currentStep.stepIndex + 1, nextPath);
        }
      } else {
        // Flow completed
        if (onFlowComplete) {
          onFlowComplete(currentStep);
        }
      }
    } catch (error) {
      logger.error('Navigation error:', error);
    } finally {
      setIsTransitioning(false);
    }
  };

  // Navigate to previous step
  const handlePrevious = () => {
    if (!currentStep || !flowConfig) return;

    setIsTransitioning(true);

    try {
      const previousPath = goToPreviousInFlow(flowName, location.pathname);
      if (previousPath && onStepChange) {
        onStepChange(currentStep.stepIndex - 1, previousPath);
      }
    } catch (error) {
      logger.error('Navigation error:', error);
    } finally {
      setIsTransitioning(false);
    }
  };

  // Skip to specific step
  const handleSkipTo = (stepIndex) => {
    if (!flowConfig || stepIndex < 0 || stepIndex >= flowConfig.length) return;

    const targetPath = flowConfig[stepIndex];
    navigate(targetPath);
    
    if (onStepChange) {
      onStepChange(stepIndex, targetPath);
    }
  };

  // Cancel flow
  const handleCancel = () => {
    if (onFlowCancel) {
      onFlowCancel(currentStep);
    } else {
      // Default: go to role-based dashboard
      const roleEntry = NAVIGATION_FLOWS[userRole]?.entry || '/dashboard';
      navigate(roleEntry);
    }
  };

  // Go to home
  const handleHome = () => {
    const roleEntry = NAVIGATION_FLOWS[userRole]?.entry || '/dashboard';
    navigate(roleEntry);
  };

  if (!currentStep || !flowConfig) return null;

  const progress = ((currentStep.stepIndex + 1) / currentStep.totalSteps) * 100;
  const isFirstStep = currentStep.isFirstStep;
  const isLastStep = currentStep.isLastStep;

  return (
    <div className={`navigation-flow ${className}`}>
      {/* Progress Bar */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">
              Step {currentStep.currentStep} of {currentStep.totalSteps}
            </span>
            <span className="text-sm text-slate-400">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-brand-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step Navigation */}
      <div className="flex items-center justify-between mb-6">
        {/* Previous Button */}
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrevious}
            disabled={isFirstStep || isTransitioning}
            className="flex items-center"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          {/* Step Numbers */}
          {showStepNumbers && (
            <div className="flex items-center space-x-1 ml-4">
              {flowConfig.map((_, index) => {
                const isCompleted = index < currentStep.stepIndex;
                const isCurrent = index === currentStep.stepIndex;
                const isAccessible = index <= currentStep.stepIndex || allowSkip;
                const stepValidationState = stepValidation[index];

                return (
                  <button
                    key={index}
                    onClick={() => isAccessible && handleSkipTo(index)}
                    disabled={!isAccessible}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                      transition-all duration-200
                      ${isCurrent 
                        ? 'bg-brand-500 text-white' 
                        : isCompleted 
                          ? 'bg-brand-600 text-white' 
                          : isAccessible
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }
                    `}
                    aria-label={`Step ${index + 1}${isCurrent ? ' (current)' : ''}${isCompleted ? ' (completed)' : ''}`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : stepValidationState && !stepValidationState.isValid ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Next Button */}
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleHome}
            className="flex items-center"
          >
            <Home className="w-4 h-4 mr-1" />
            Home
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancel}
            className="flex items-center"
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
            disabled={isTransitioning}
            className="flex items-center"
          >
            {isLastStep ? 'Complete' : 'Next'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Step Validation Messages */}
      {validateSteps && Object.keys(stepValidation).length > 0 && (
        <div className="mb-4">
          {Object.entries(stepValidation).map(([stepIndex, validation]) => (
            <div
              key={stepIndex}
              className={`p-3 rounded-md text-sm ${
                validation.isValid 
                  ? 'bg-success-500/10 text-success-400 border border-success-500/20'
                  : 'bg-error-500/10 text-error-400 border border-error-500/20'
              }`}
            >
              {validation.isValid ? (
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-2" />
                  Step {parseInt(stepIndex) + 1} completed successfully
                </div>
              ) : (
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Step {parseInt(stepIndex) + 1} validation failed: {validation.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
            <span className="text-slate-300">Navigating...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationFlow;

