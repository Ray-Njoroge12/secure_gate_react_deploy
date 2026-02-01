import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AdaptiveComponent } from '../ui/AdaptiveComponent';
import GradientButton from '../ui/GradientButton';
import ProgressIndicator from '../ui/ProgressIndicator';

// Import step components
import CommunityOverviewStep from './steps/CommunityOverviewStep';
import VisitorInvitationsStep from './steps/VisitorInvitationsStep';
import GuestManagementStep from './steps/GuestManagementStep';
import CommunityFeaturesStep from './steps/CommunityFeaturesStep';

/**
 * WelcomeFlow Component
 * 
 * Provides role-specific welcome flows and registration pages with contextual
 * next-step guidance and progress indicators.
 * 
 * Features:
 * - Role-appropriate welcome content and messaging
 * - Progressive registration forms with validation
 * - Contextual next-step guidance
 * - Progress tracking and completion indicators
 * - Accessibility-compliant navigation and feedback
 * 
 * @param {Object} props - Component props
 * @param {string} props.role - User role for welcome flow customization
 * @param {Function} props.onComplete - Callback when welcome flow is completed
 * @param {boolean} props.isNewUser - Whether this is a new user registration
 */
const WelcomeFlow = ({ 
  role = 'resident', 
  onComplete, 
  isNewUser = false 
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [userProgress, setUserProgress] = useState({});

  // Role-specific welcome flow configurations
  const welcomeFlows = {
    super_admin: {
      title: "Welcome to SecureGate Platform Administration",
      subtitle: "Manage estates, monitor system health, and oversee platform operations",
      steps: [
        {
          id: 'platform-overview',
          title: 'Platform Overview',
          description: 'Understanding your platform-wide responsibilities',
          content: 'PlatformOverviewStep',
          estimatedTime: '3 minutes'
        },
        {
          id: 'estate-management',
          title: 'Estate Management',
          description: 'Learn to manage multiple estates and their configurations',
          content: 'EstateManagementStep',
          estimatedTime: '5 minutes'
        },
        {
          id: 'system-monitoring',
          title: 'System Monitoring',
          description: 'Monitor system health and performance metrics',
          content: 'SystemMonitoringStep',
          estimatedTime: '4 minutes'
        },
        {
          id: 'user-support',
          title: 'User Support',
          description: 'Handle escalations and provide platform support',
          content: 'UserSupportStep',
          estimatedTime: '3 minutes'
        }
      ],
      nextSteps: [
        'Review platform dashboard',
        'Check system health metrics',
        'Review pending support tickets',
        'Configure global settings'
      ]
    },

    admin: {
      title: "Welcome to Your Estate Administration",
      subtitle: "Manage users, oversee security, and configure estate settings",
      steps: [
        {
          id: 'estate-overview',
          title: 'Estate Overview',
          description: 'Understanding your estate management responsibilities',
          content: 'EstateOverviewStep',
          estimatedTime: '4 minutes'
        },
        {
          id: 'user-management',
          title: 'User Management',
          description: 'Approve users, manage roles, and handle permissions',
          content: 'UserManagementStep',
          estimatedTime: '6 minutes'
        },
        {
          id: 'visitor-oversight',
          title: 'Visitor Oversight',
          description: 'Monitor visitor activities and security protocols',
          content: 'VisitorOversightStep',
          estimatedTime: '5 minutes'
        },
        {
          id: 'reporting-analytics',
          title: 'Reporting & Analytics',
          description: 'Generate reports and analyze estate metrics',
          content: 'ReportingAnalyticsStep',
          estimatedTime: '4 minutes'
        }
      ],
      nextSteps: [
        'Review pending user approvals',
        'Check recent visitor activity',
        'Configure estate settings',
        'Set up notification preferences'
      ]
    },

    guard: {
      title: "Welcome to SecureGate Security Operations",
      subtitle: "Process visitors, monitor security, and maintain estate safety",
      steps: [
        {
          id: 'security-overview',
          title: 'Security Overview',
          description: 'Understanding your security responsibilities',
          content: 'SecurityOverviewStep',
          estimatedTime: '3 minutes'
        },
        {
          id: 'visitor-processing',
          title: 'Visitor Processing',
          description: 'Learn to check in/out visitors and verify credentials',
          content: 'VisitorProcessingStep',
          estimatedTime: '7 minutes'
        },
        {
          id: 'qr-scanning',
          title: 'QR Code Scanning',
          description: 'Master the QR code scanning system',
          content: 'QRScanningStep',
          estimatedTime: '4 minutes'
        },
        {
          id: 'incident-management',
          title: 'Incident Management',
          description: 'Handle security incidents and emergency procedures',
          content: 'IncidentManagementStep',
          estimatedTime: '5 minutes'
        }
      ],
      nextSteps: [
        'Test QR code scanner',
        'Review current visitor queue',
        'Check emergency procedures',
        'Set up mobile notifications'
      ]
    },

    resident: {
      title: "Welcome to Your Secure Community",
      subtitle: "Invite guests, manage visits, and stay connected with your community",
      steps: [
        {
          id: 'community-overview',
          title: 'Community Overview',
          description: 'Understanding your community features and benefits',
          content: 'CommunityOverviewStep',
          estimatedTime: '3 minutes'
        },
        {
          id: 'visitor-invitations',
          title: 'Visitor Invitations',
          description: 'Learn to invite guests and manage their access',
          content: 'VisitorInvitationsStep',
          estimatedTime: '6 minutes'
        },
        {
          id: 'guest-management',
          title: 'Guest Management',
          description: 'Track visits, set preferences, and manage favorites',
          content: 'GuestManagementStep',
          estimatedTime: '4 minutes'
        },
        {
          id: 'community-features',
          title: 'Community Features',
          description: 'Explore announcements, events, and neighbor connections',
          content: 'CommunityFeaturesStep',
          estimatedTime: '3 minutes'
        }
      ],
      nextSteps: [
        'Create your first visitor invitation',
        'Set up notification preferences',
        'Explore community announcements',
        'Add frequent visitors to favorites'
      ]
    }
  };

  // Step component mapping
  const stepComponents = {
    // Resident steps
    'CommunityOverviewStep': CommunityOverviewStep,
    'VisitorInvitationsStep': VisitorInvitationsStep,
    'GuestManagementStep': GuestManagementStep,
    'CommunityFeaturesStep': CommunityFeaturesStep,
    
    // Placeholder components for other roles (to be implemented)
    'PlatformOverviewStep': ({ onStepComplete }) => (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">Platform Overview</h3>
        <p className="text-gray-600 mb-6">Learn about your platform-wide responsibilities and capabilities.</p>
        <GradientButton onClick={onStepComplete}>Continue</GradientButton>
      </div>
    ),
    'EstateManagementStep': ({ onStepComplete }) => (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">Estate Management</h3>
        <p className="text-gray-600 mb-6">Discover how to manage multiple estates and their configurations.</p>
        <GradientButton onClick={onStepComplete}>Continue</GradientButton>
      </div>
    ),
    'SystemMonitoringStep': ({ onStepComplete }) => (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">System Monitoring</h3>
        <p className="text-gray-600 mb-6">Learn to monitor system health and performance metrics.</p>
        <GradientButton onClick={onStepComplete}>Continue</GradientButton>
      </div>
    ),
    'UserSupportStep': ({ onStepComplete }) => (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">User Support</h3>
        <p className="text-gray-600 mb-6">Handle escalations and provide platform support.</p>
        <GradientButton onClick={onStepComplete}>Continue</GradientButton>
      </div>
    ),
    'EstateOverviewStep': ({ onStepComplete }) => (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">Estate Overview</h3>
        <p className="text-gray-600 mb-6">Understanding your estate management responsibilities.</p>
        <GradientButton onClick={onStepComplete}>Continue</GradientButton>
      </div>
    ),
    'UserManagementStep': ({ onStepComplete }) => (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">User Management</h3>
        <p className="text-gray-600 mb-6">Approve users, manage roles, and handle permissions.</p>
        <GradientButton onClick={onStepComplete}>Continue</GradientButton>
      </div>
    ),
    'VisitorOversightStep': ({ onStepComplete }) => (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">Visitor Oversight</h3>
        <p className="text-gray-600 mb-6">Monitor visitor activities and security protocols.</p>
        <GradientButton onClick={onStepComplete}>Continue</GradientButton>
      </div>
    ),
    'ReportingAnalyticsStep': ({ onStepComplete }) => (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">Reporting & Analytics</h3>
        <p className="text-gray-600 mb-6">Generate reports and analyze estate metrics.</p>
        <GradientButton onClick={onStepComplete}>Continue</GradientButton>
      </div>
    ),
    'SecurityOverviewStep': ({ onStepComplete }) => (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">Security Overview</h3>
        <p className="text-gray-600 mb-6">Understanding your security responsibilities.</p>
        <GradientButton onClick={onStepComplete}>Continue</GradientButton>
      </div>
    ),
    'VisitorProcessingStep': ({ onStepComplete }) => (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">Visitor Processing</h3>
        <p className="text-gray-600 mb-6">Learn to check in/out visitors and verify credentials.</p>
        <GradientButton onClick={onStepComplete}>Continue</GradientButton>
      </div>
    ),
    'QRScanningStep': ({ onStepComplete }) => (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">QR Code Scanning</h3>
        <p className="text-gray-600 mb-6">Master the QR code scanning system.</p>
        <GradientButton onClick={onStepComplete}>Continue</GradientButton>
      </div>
    ),
    'IncidentManagementStep': ({ onStepComplete }) => (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">Incident Management</h3>
        <p className="text-gray-600 mb-6">Handle security incidents and emergency procedures.</p>
        <GradientButton onClick={onStepComplete}>Continue</GradientButton>
      </div>
    )
  };

  const currentFlow = welcomeFlows[role] || welcomeFlows.resident;
  const totalSteps = currentFlow.steps.length;
  const progressPercentage = Math.round((completedSteps.size / totalSteps) * 100);

  useEffect(() => {
    // Track welcome flow start
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Welcome Flow Started', {
        role,
        isNewUser,
        totalSteps,
        userId: user?.id
      });
    }
  }, [role, isNewUser, totalSteps, user?.id]);

  const handleStepComplete = (stepId) => {
    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.add(stepId);
    setCompletedSteps(newCompletedSteps);

    // Track step completion
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Welcome Step Completed', {
        stepId,
        role,
        completedSteps: newCompletedSteps.size,
        totalSteps,
        userId: user?.id
      });
    }

    // Auto-advance to next step if not the last one
    if (currentStep < totalSteps - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 500);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Track welcome flow completion
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Welcome Flow Completed', {
        role,
        completedSteps: completedSteps.size,
        totalSteps,
        completionRate: progressPercentage,
        userId: user?.id
      });
    }

    if (onComplete) {
      onComplete({
        role,
        completedSteps: Array.from(completedSteps),
        progress: userProgress
      });
    }
  };

  const handleSkip = () => {
    // Track welcome flow skip
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Welcome Flow Skipped', {
        role,
        currentStep,
        completedSteps: completedSteps.size,
        totalSteps,
        userId: user?.id
      });
    }

    if (onComplete) {
      onComplete({
        role,
        skipped: true,
        completedSteps: Array.from(completedSteps)
      });
    }
  };

  const currentStepData = currentFlow.steps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const canProceed = completedSteps.has(currentStepData?.id);

  return (
    <AdaptiveComponent
      variants={{
        mobile: 'div',
        desktop: 'div'
      }}
      className="welcome-flow"
      role="main"
      aria-labelledby="welcome-title"
    >
      <div className="welcome-flow__container max-w-4xl mx-auto p-6">
        {/* Header Section */}
        <header className="welcome-flow__header text-center mb-8">
          <h1 
            id="welcome-title"
            className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
          >
            {currentFlow.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            {currentFlow.subtitle}
          </p>
          
          {/* Progress Indicator */}
          <ProgressIndicator
            current={currentStep + 1}
            total={totalSteps}
            percentage={progressPercentage}
            showLabels={true}
            className="mb-6"
            aria-label={`Welcome flow progress: ${currentStep + 1} of ${totalSteps} steps completed`}
          />
        </header>

        {/* Step Content */}
        <main className="welcome-flow__content">
          {currentStepData && (
            <div className="step-container bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
              <div className="step-header mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {currentStepData.title}
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    {currentStepData.estimatedTime}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {currentStepData.description}
                </p>
              </div>

              {/* Dynamic Step Content */}
              <React.Suspense
                fallback={
                  <div className="step-placeholder p-8 text-center">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto mb-4"></div>
                      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                    </div>
                  </div>
                }
              >
                {(() => {
                  const StepComponent = stepComponents[currentStepData.content];
                  return StepComponent ? (
                    <StepComponent
                      onStepComplete={() => handleStepComplete(currentStepData.id)}
                      stepData={currentStepData}
                      userProgress={userProgress}
                      setUserProgress={setUserProgress}
                    />
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-gray-600 dark:text-gray-400">
                        Step content not yet implemented: {currentStepData.content}
                      </p>
                      <GradientButton 
                        onClick={() => handleStepComplete(currentStepData.id)}
                        className="mt-4"
                      >
                        Continue
                      </GradientButton>
                    </div>
                  );
                })()}
              </React.Suspense>
            </div>
          )}
        </main>

        {/* Navigation Controls */}
        <footer className="welcome-flow__navigation flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Go to previous step"
            >
              ← Previous
            </button>
            
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              aria-label="Skip welcome flow"
            >
              Skip for now
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {!isLastStep ? (
              <GradientButton
                onClick={handleNext}
                disabled={!canProceed}
                variant="primary"
                size="lg"
                aria-label="Continue to next step"
              >
                Continue →
              </GradientButton>
            ) : (
              <GradientButton
                onClick={handleComplete}
                disabled={!canProceed}
                variant="primary"
                size="lg"
                aria-label="Complete welcome flow"
              >
                Get Started
              </GradientButton>
            )}
          </div>
        </footer>

        {/* Next Steps Preview */}
        {isLastStep && canProceed && (
          <aside className="welcome-flow__next-steps mt-8 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4">
              🎉 You're all set! Here's what you can do next:
            </h3>
            <ul className="space-y-2">
              {currentFlow.nextSteps.map((step, index) => (
                <li key={index} className="flex items-center text-green-800 dark:text-green-200">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></span>
                  {step}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {/* Accessibility Live Region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="welcome-flow-announcements"
      >
        {currentStepData && `Now on step ${currentStep + 1}: ${currentStepData.title}`}
      </div>
    </AdaptiveComponent>
  );
};

export default WelcomeFlow;
