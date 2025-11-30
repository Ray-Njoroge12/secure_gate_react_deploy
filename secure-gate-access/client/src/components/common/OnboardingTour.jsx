/**
 * @file OnboardingTour.jsx
 * @description Interactive onboarding tour for new users
 * Phase 3: UI/UX Improvement - P2 Priority
 * 
 * Features:
 * - Step-by-step feature introduction
 * - Role-specific tours
 * - Progress tracking
 * - Skip and restart options
 * - LocalStorage persistence
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// Tour step configurations by role
const tourSteps = {
  resident: [
    {
      id: 'welcome',
      target: null, // Center modal
      title: 'Welcome to SecureGate! 👋',
      content: 'Let\'s take a quick tour to help you get started with managing your visitors.',
      position: 'center'
    },
    {
      id: 'dashboard',
      target: '[data-tour="dashboard-stats"]',
      title: 'Your Dashboard',
      content: 'Here you\'ll see an overview of your visitors, including active passes and recent activity.',
      position: 'bottom'
    },
    {
      id: 'quick-actions',
      target: '[data-tour="quick-actions"]',
      title: 'Quick Actions',
      content: 'Use these tiles to quickly invite visitors, generate passes, or view your history.',
      position: 'bottom'
    },
    {
      id: 'add-visitor',
      target: '[data-tour="add-visitor"]',
      title: 'Add a Visitor',
      content: 'Click here to create an invite for a single visitor. They\'ll receive an access QR code.',
      position: 'right'
    },
    {
      id: 'bulk-invite',
      target: '[data-tour="bulk-invite"]',
      title: 'Bulk Invites',
      content: 'Hosting an event? Use bulk invite to send passes to multiple guests at once.',
      position: 'right'
    },
    {
      id: 'favorites',
      target: '[data-tour="favorites"]',
      title: 'Favorite Visitors',
      content: 'Save frequent visitors as favorites for quick one-tap invites.',
      position: 'right'
    },
    {
      id: 'settings',
      target: '[data-tour="settings"]',
      title: 'Your Settings',
      content: 'Customize your preferences, manage privacy settings, and update your profile.',
      position: 'right'
    },
    {
      id: 'complete',
      target: null,
      title: 'You\'re All Set! 🎉',
      content: 'You\'re ready to start inviting visitors. Need help? Check the settings for support options.',
      position: 'center'
    }
  ],
  guard: [
    {
      id: 'welcome',
      target: null,
      title: 'Welcome, Security Officer! 🛡️',
      content: 'This tour will help you get familiar with the guard station features.',
      position: 'center'
    },
    {
      id: 'scan-qr',
      target: '[data-tour="scan-qr"]',
      title: 'QR Scanner',
      content: 'Use this to quickly scan visitor QR codes for instant verification.',
      position: 'bottom'
    },
    {
      id: 'manual-check',
      target: '[data-tour="manual-check"]',
      title: 'Manual Check',
      content: 'For visitors without a QR code, search by name, phone, or ID number.',
      position: 'right'
    },
    {
      id: 'expected-visitors',
      target: '[data-tour="expected-visitors"]',
      title: 'Expected Visitors',
      content: 'View today\'s expected arrivals and their scheduled check-in times.',
      position: 'bottom'
    },
    {
      id: 'panic-button',
      target: '[data-tour="panic-button"]',
      title: 'Emergency Panic Button',
      content: 'In an emergency, press this button to alert all security personnel and management.',
      position: 'left'
    },
    {
      id: 'complete',
      target: null,
      title: 'Ready for Duty! 🎖️',
      content: 'You\'re set to manage visitor access. Stay vigilant and secure!',
      position: 'center'
    }
  ],
  admin: [
    {
      id: 'welcome',
      target: null,
      title: 'Welcome, Administrator! ⚙️',
      content: 'Let\'s explore the admin dashboard features.',
      position: 'center'
    },
    {
      id: 'metrics',
      target: '[data-tour="admin-metrics"]',
      title: 'System Metrics',
      content: 'Monitor key performance indicators including active invites, check-ins, and security alerts.',
      position: 'bottom'
    },
    {
      id: 'user-management',
      target: '[data-tour="user-management"]',
      title: 'User Management',
      content: 'Add, edit, or remove residents and security staff from the system.',
      position: 'right'
    },
    {
      id: 'audit-logs',
      target: '[data-tour="audit-logs"]',
      title: 'Audit Logs',
      content: 'Track all system activities for security and compliance purposes.',
      position: 'bottom'
    },
    {
      id: 'reports',
      target: '[data-tour="reports"]',
      title: 'Reports & Analytics',
      content: 'Generate detailed reports on visitor traffic, incidents, and system usage.',
      position: 'right'
    },
    {
      id: 'announcements',
      target: '[data-tour="announcements"]',
      title: 'Community Announcements',
      content: 'Post important updates that residents and guards will see in their dashboards.',
      position: 'right'
    },
    {
      id: 'complete',
      target: null,
      title: 'Administration Ready! 🚀',
      content: 'You have full control over the SecureGate system. Explore the features at your own pace.',
      position: 'center'
    }
  ]
};

const OnboardingTour = ({ 
  role = 'resident',
  onComplete,
  onSkip,
  className = '' 
}) => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const tooltipRef = useRef(null);

  const steps = tourSteps[role] || tourSteps.resident;
  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  // Check if tour should start
  useEffect(() => {
    const tourKey = `securegate-tour-completed-${role}`;
    const hasCompletedTour = localStorage.getItem(tourKey);
    
    if (!hasCompletedTour && user) {
      // Delay tour start to allow page to render
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [role, user]);

  // Update highlight position when step changes
  useEffect(() => {
    if (!isActive || !currentStep.target) {
      setHighlightRect(null);
      return;
    }

    const updateHighlight = () => {
      const targetElement = document.querySelector(currentStep.target);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setHighlightRect({
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16
        });
        
        // Scroll element into view
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setHighlightRect(null);
      }
    };

    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);

    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
    };
  }, [isActive, currentStep, currentStepIndex]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStepIndex, totalSteps]);

  // Handle previous step
  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  // Handle skip
  const handleSkip = useCallback(() => {
    setIsActive(false);
    const tourKey = `securegate-tour-completed-${role}`;
    localStorage.setItem(tourKey, 'skipped');
    if (onSkip) onSkip();
  }, [role, onSkip]);

  // Handle complete
  const handleComplete = useCallback(() => {
    setIsActive(false);
    const tourKey = `securegate-tour-completed-${role}`;
    localStorage.setItem(tourKey, 'completed');
    if (onComplete) onComplete();
  }, [role, onComplete]);

  // Restart tour
  const restartTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'Escape':
          handleSkip();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleNext, handlePrevious, handleSkip]);

  // Get tooltip position styles
  const getTooltipStyles = () => {
    if (!highlightRect || currentStep.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const padding = 16;
    const tooltipWidth = 320;

    switch (currentStep.position) {
      case 'top':
        return {
          position: 'fixed',
          bottom: `${window.innerHeight - highlightRect.top + padding}px`,
          left: `${highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2}px`
        };
      case 'bottom':
        return {
          position: 'fixed',
          top: `${highlightRect.top + highlightRect.height + padding}px`,
          left: `${Math.max(padding, Math.min(highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding))}px`
        };
      case 'left':
        return {
          position: 'fixed',
          top: `${highlightRect.top + highlightRect.height / 2}px`,
          right: `${window.innerWidth - highlightRect.left + padding}px`,
          transform: 'translateY(-50%)'
        };
      case 'right':
        return {
          position: 'fixed',
          top: `${highlightRect.top + highlightRect.height / 2}px`,
          left: `${highlightRect.left + highlightRect.width + padding}px`,
          transform: 'translateY(-50%)'
        };
      default:
        return {};
    }
  };

  if (!isActive) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[9998]"
        style={{
          clipPath: highlightRect 
            ? `polygon(
                0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                ${highlightRect.left}px ${highlightRect.top}px,
                ${highlightRect.left}px ${highlightRect.top + highlightRect.height}px,
                ${highlightRect.left + highlightRect.width}px ${highlightRect.top + highlightRect.height}px,
                ${highlightRect.left + highlightRect.width}px ${highlightRect.top}px,
                ${highlightRect.left}px ${highlightRect.top}px
              )`
            : undefined
        }}
        aria-hidden="true"
      />

      {/* Highlight ring */}
      {highlightRect && (
        <div 
          className="fixed border-2 border-green-500 rounded-lg z-[9998] pointer-events-none animate-pulse"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`z-[9999] bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-80 ${className}`}
        style={getTooltipStyles()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-t-xl overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-5">
          {/* Step indicator */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Step {currentStepIndex + 1} of {totalSteps}
          </div>

          {/* Title */}
          <h3 
            id="tour-step-title"
            className="text-lg font-bold text-gray-900 dark:text-white mb-2"
          >
            {currentStep.title}
          </h3>

          {/* Content */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {currentStep.content}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip tour
            </button>

            <div className="flex gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>

          {/* Keyboard hint */}
          <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">
            Use arrow keys to navigate, Esc to skip
          </p>
        </div>
      </div>
    </>
  );
};

// Hook to manually trigger tour
export const useOnboardingTour = (role = 'resident') => {
  const startTour = useCallback(() => {
    const tourKey = `securegate-tour-completed-${role}`;
    localStorage.removeItem(tourKey);
    window.dispatchEvent(new CustomEvent('startOnboardingTour', { detail: { role } }));
  }, [role]);

  const resetTour = useCallback(() => {
    const tourKey = `securegate-tour-completed-${role}`;
    localStorage.removeItem(tourKey);
  }, [role]);

  return { startTour, resetTour };
};

export default OnboardingTour;
