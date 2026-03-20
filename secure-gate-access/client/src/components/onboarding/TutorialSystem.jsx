import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeEngine';
import { GradientButton } from '../ui/GradientButton';

/**
 * TutorialSystem Component
 * 
 * Provides interactive tutorial overlays with guided tours and contextual tooltips.
 * Supports step-by-step navigation, completion tracking, and just-in-time help.
 * 
 * Features:
 * - Interactive overlay system with contextual tooltips
 * - Guided tour functionality with step-by-step navigation
 * - Just-in-time help for first-time task encounters
 * - Tutorial completion tracking and state management
 * - Accessibility-compliant with keyboard navigation and screen reader support
 * - Responsive design for all device types
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isActive - Whether the tutorial system is currently active
 * @param {Array} props.steps - Array of tutorial steps to display
 * @param {Function} props.onComplete - Callback when tutorial is completed
 * @param {Function} props.onSkip - Callback when tutorial is skipped
 * @param {string} props.tutorialId - Unique identifier for the tutorial
 * @param {Object} props.options - Tutorial configuration options
 */
const TutorialSystem = ({
  isActive = false,
  steps = [],
  onComplete,
  onSkip,
  tutorialId = 'default',
  options = {}
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [targetElement, setTargetElement] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const overlayRef = useRef(null);
  const tooltipRef = useRef(null);
  const focusTrapRef = useRef(null);

  // Default options
  const defaultOptions = {
    showProgress: true,
    allowSkip: true,
    autoAdvance: false,
    highlightTarget: true,
    showBackdrop: true,
    keyboardNavigation: true,
    persistProgress: true,
    ...options
  };

  // Tutorial step structure validation
  const validateSteps = useCallback((steps) => {
    return steps.every(step => 
      step.id && 
      step.title && 
      step.content && 
      (step.target || step.position)
    );
  }, []);

  useEffect(() => {
    if (isActive && steps.length > 0 && validateSteps(steps)) {
      setIsVisible(true);
      setCurrentStep(0);
      
      // Track tutorial start
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.track('Tutorial Started', {
          tutorialId,
          role: user?.role,
          stepCount: steps.length,
          userId: user?.id
        });
      }
    } else {
      setIsVisible(false);
    }
  }, [isActive, steps, tutorialId, user, validateSteps]);

  // Position tooltip relative to target element
  const positionTooltip = useCallback((target, step) => {
    if (!target || !tooltipRef.current) return;

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let position = { x: 0, y: 0 };
    const placement = step.placement || 'auto';
    const offset = step.offset || 10;

    switch (placement) {
      case 'top':
        position.x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        position.y = targetRect.top - tooltipRect.height - offset;
        break;
      case 'bottom':
        position.x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        position.y = targetRect.bottom + offset;
        break;
      case 'left':
        position.x = targetRect.left - tooltipRect.width - offset;
        position.y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        break;
      case 'right':
        position.x = targetRect.right + offset;
        position.y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        break;
      default: // auto
        // Choose best position based on available space
        const spaceTop = targetRect.top;
        const spaceBottom = viewport.height - targetRect.bottom;
        const spaceLeft = targetRect.left;
        const spaceRight = viewport.width - targetRect.right;

        if (spaceBottom >= tooltipRect.height + offset) {
          // Bottom placement
          position.x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          position.y = targetRect.bottom + offset;
        } else if (spaceTop >= tooltipRect.height + offset) {
          // Top placement
          position.x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          position.y = targetRect.top - tooltipRect.height - offset;
        } else if (spaceRight >= tooltipRect.width + offset) {
          // Right placement
          position.x = targetRect.right + offset;
          position.y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        } else {
          // Left placement
          position.x = targetRect.left - tooltipRect.width - offset;
          position.y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        }
    }

    // Ensure tooltip stays within viewport
    position.x = Math.max(10, Math.min(position.x, viewport.width - tooltipRect.width - 10));
    position.y = Math.max(10, Math.min(position.y, viewport.height - tooltipRect.height - 10));

    setTooltipPosition(position);
  }, []);

  // Find and highlight target element
  const highlightTarget = useCallback((step) => {
    let target = null;

    if (step.target) {
      // Find target by selector, data attribute, or aria-label
      target = document.querySelector(step.target) ||
               document.querySelector(`[data-tutorial-target="${step.target}"]`) ||
               document.querySelector(`[aria-label*="${step.target}"]`);
    }

    if (target) {
      setTargetElement(target);
      
      // Add highlight class
      if (defaultOptions.highlightTarget) {
        target.classList.add('tutorial-highlight');
        target.setAttribute('data-tutorial-active', 'true');
      }

      // Scroll target into view
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });

      // Position tooltip
      setTimeout(() => positionTooltip(target, step), 100);
    } else if (step.position) {
      // Use fixed position if no target element
      setTooltipPosition(step.position);
    }

    return target;
  }, [defaultOptions.highlightTarget, positionTooltip]);

  // Remove highlight from previous target
  const removeHighlight = useCallback(() => {
    if (targetElement) {
      targetElement.classList.remove('tutorial-highlight');
      targetElement.removeAttribute('data-tutorial-active');
    }
    
    // Remove all tutorial highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
      el.removeAttribute('data-tutorial-active');
    });
  }, [targetElement]);

  // Navigate to specific step
  const goToStep = useCallback((stepIndex) => {
    if (stepIndex < 0 || stepIndex >= steps.length) return;

    removeHighlight();
    setCurrentStep(stepIndex);
    
    const step = steps[stepIndex];
    const target = highlightTarget(step);

    // Track step view
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Tutorial Step Viewed', {
        tutorialId,
        stepId: step.id,
        stepIndex,
        role: user?.role,
        userId: user?.id
      });
    }

    // Auto-advance if configured
    if (defaultOptions.autoAdvance && step.duration) {
      setTimeout(() => {
        if (stepIndex < steps.length - 1) {
          goToStep(stepIndex + 1);
        }
      }, step.duration);
    }
  }, [steps, removeHighlight, highlightTarget, tutorialId, user, defaultOptions.autoAdvance]);

  // Handle step completion
  const completeStep = useCallback((stepIndex) => {
    const step = steps[stepIndex];
    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.add(step.id);
    setCompletedSteps(newCompletedSteps);

    // Track step completion
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Tutorial Step Completed', {
        tutorialId,
        stepId: step.id,
        stepIndex,
        role: user?.role,
        userId: user?.id
      });
    }

    // Persist progress if enabled
    if (defaultOptions.persistProgress) {
      const progressKey = `tutorial_progress_${tutorialId}_${user?.id}`;
      localStorage.setItem(progressKey, JSON.stringify({
        completedSteps: Array.from(newCompletedSteps),
        currentStep: stepIndex,
        lastUpdated: new Date().toISOString()
      }));
    }
  }, [steps, completedSteps, tutorialId, user, defaultOptions.persistProgress]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    completeStep(currentStep);
    
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length, completeStep, goToStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const handleComplete = useCallback(() => {
    removeHighlight();
    setIsVisible(false);

    // Track tutorial completion
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Tutorial Completed', {
        tutorialId,
        completedSteps: completedSteps.size,
        totalSteps: steps.length,
        completionRate: (completedSteps.size / steps.length) * 100,
        role: user?.role,
        userId: user?.id
      });
    }

    if (onComplete) {
      onComplete({
        tutorialId,
        completedSteps: Array.from(completedSteps),
        totalSteps: steps.length
      });
    }
  }, [removeHighlight, tutorialId, completedSteps, steps.length, user, onComplete]);

  const handleSkip = useCallback(() => {
    removeHighlight();
    setIsVisible(false);

    // Track tutorial skip
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Tutorial Skipped', {
        tutorialId,
        currentStep,
        completedSteps: completedSteps.size,
        totalSteps: steps.length,
        role: user?.role,
        userId: user?.id
      });
    }

    if (onSkip) {
      onSkip({
        tutorialId,
        currentStep,
        completedSteps: Array.from(completedSteps)
      });
    }
  }, [removeHighlight, tutorialId, currentStep, completedSteps, steps.length, user, onSkip]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible || !defaultOptions.keyboardNavigation) return;

    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          handleSkip();
          break;
        case 'ArrowRight':
        case 'Enter':
        case ' ':
          event.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevious();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, defaultOptions.keyboardNavigation, handleSkip, handleNext, handlePrevious]);

  // Initialize tutorial on mount
  useEffect(() => {
    if (isVisible && steps.length > 0) {
      goToStep(0);
    }

    return () => {
      removeHighlight();
    };
  }, [isVisible, steps.length, goToStep, removeHighlight]);

  // Handle window resize
  useEffect(() => {
    if (!isVisible || !targetElement) return;

    const handleResize = () => {
      const step = steps[currentStep];
      if (step) {
        positionTooltip(targetElement, step);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible, targetElement, currentStep, steps, positionTooltip]);

  if (!isVisible || steps.length === 0) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progressPercentage = Math.round(((currentStep + 1) / steps.length) * 100);

  const tutorialOverlay = (
    <div
      ref={overlayRef}
      className="tutorial-overlay fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-content"
    >
      {/* Backdrop */}
      {defaultOptions.showBackdrop && (
        <div className="tutorial-backdrop absolute inset-0 bg-black bg-opacity-50 transition-opacity" />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="tutorial-tooltip absolute bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-gray-200 dark:border-slate-700 max-w-sm z-10"
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: 'translate(0, 0)'
        }}
      >
        {/* Header */}
        <div className="tutorial-header p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 
              id="tutorial-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {currentStepData.title}
            </h3>
            
            {defaultOptions.allowSkip && (
              <Button
                onClick={handleSkip}
                className="text-gray-500 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 transition-colors"
                aria-label="Skip tutorial"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            )}
          </div>

          {/* Progress */}
          {defaultOptions.showProgress && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-300">
              <span>{currentStep + 1} of {steps.length}</span>
              <div className="flex-1 mx-3 bg-gray-200 dark:bg-slate-700 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span>{progressPercentage}%</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="tutorial-content p-4">
          <div 
            id="tutorial-content"
            className="text-gray-700 dark:text-gray-300 mb-4"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentStepData.content) }}
          />

          {/* Action hint */}
          {currentStepData.action && (
            <div className="tutorial-action p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Try it now:
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {currentStepData.action}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="tutorial-footer p-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </Button>

          <div className="flex items-center space-x-2">
            {defaultOptions.allowSkip && (
              <Button
                onClick={handleSkip}
                className="px-3 py-1 text-sm text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Skip
              </Button>
            )}
            
            <GradientButton
              onClick={handleNext}
              size="sm"
              variant="primary"
            >
              {isLastStep ? 'Finish' : 'Next'} →
            </GradientButton>
          </div>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="tutorial-hints fixed bottom-4 left-4 bg-gray-900 text-white text-xs px-3 py-2 rounded-md opacity-75">
        <div>Press ESC to skip • Arrow keys to navigate</div>
      </div>

      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {`Tutorial step ${currentStep + 1} of ${steps.length}: ${currentStepData.title}`}
      </div>
    </div>
  );

  // Render tutorial overlay as portal
  return createPortal(tutorialOverlay, document.body);
};

export default TutorialSystem;