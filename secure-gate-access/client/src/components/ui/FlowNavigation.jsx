// client/src/components/ui/FlowNavigation.jsx
import React from 'react';
import Button from './Button.jsx';
import { useNavigationFlow } from '../../utils/navigationFlow';

const FlowNavigation = ({ 
  currentPath, 
  userRole, 
  flowName = null,
  showProgress = true,
  className = '' 
}) => {
  const { 
    goToNextInFlow, 
    goToPreviousInFlow, 
    getCurrentFlowStep 
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
    <div className={`flex items-center justify-between p-4 bg-gray-50 border-t ${className}`}>
      {/* Progress indicator */}
      {showProgress && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
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