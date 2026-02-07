// client/src/components/ui/FlowNavigation.jsx
import React, { useEffect, useRef } from 'react';
import Button from './Button.jsx';
import { useNavigationFlow } from '../../utils/navigationFlow';

const FlowNavigation = ({ 
  currentPath, 
  userRole, 
  flowName = null,
  showProgress = true,
  className = '' 
}) => {
  const flowRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Arrow keys to navigate between steps
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
      // Home key to go to first step
      if (e.key === 'Home') {
        e.preventDefault();
        // Go to first step in flow
        const firstStep = flowInfo?.steps?.[0];
        if (firstStep?.path) {
          navigate(firstStep.path);
        }
      }
      // End key to go to last step
      if (e.key === 'End') {
        e.preventDefault();
        // Go to last step in flow
        const lastStep = flowInfo?.steps?.[flowInfo.steps.length - 1];
        if (lastStep?.path) {
          navigate(lastStep.path);
        }
      }
    };

    const flow = flowRef.current;
    if (flow) {
      flow.addEventListener('keydown', handleKeyDown);
      return () => flow.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentPath, userRole, flowName, flowInfo, navigate]);
  const { 
    goToNextInFlow, 
    goToPreviousInFlow, 
    getCurrentFlowStep,
    navigate
  } = useNavigationFlow(userRole);

  const flowInfo = getCurrentFlowStep(currentPath);
  
  if (!flowInfo) return null;

  const handleNext = () => {
    goToNextInFlow(flowInfo.flowName, currentPath);
  };

  const handlePrevious = () => {
    goToPreviousInFlow(flowInfo.flowName, currentPath);
  };

  return (
    <div ref={flowRef} className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 border-t ${className}`}>
      {/* Progress indicator */}
      {showProgress && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-200">
            Step {flowInfo.currentStep} of {flowInfo.totalSteps}
          </span>
          <div className="flex space-x-1">
            {Array.from({ length: flowInfo.totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < flowInfo.currentStep 
                    ? 'bg-green-600' 
                    : i === flowInfo.currentStep - 1 
                      ? 'bg-blue-600' 
                      : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={flowInfo.isFirstStep}
          className="min-w-[80px]"
        >
          Previous
        </Button>
        
        <Button
          variant="primary"
          size="sm"
          onClick={handleNext}
          disabled={flowInfo.isLastStep}
          className="min-w-[80px]"
        >
          {flowInfo.isLastStep ? 'Complete' : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export default FlowNavigation;
