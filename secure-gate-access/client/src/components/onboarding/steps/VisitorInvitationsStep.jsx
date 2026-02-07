import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { GradientButton } from '../../ui/GradientButton';

/**
 * VisitorInvitationsStep Component
 * 
 * Second step in the resident welcome flow that teaches how to invite guests
 * and manage their access. Provides hands-on experience with the invitation system.
 * 
 * Features:
 * - Interactive invitation form demonstration
 * - Step-by-step guidance for creating invitations
 * - QR code generation preview
 * - Progress tracking for step completion
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onStepComplete - Callback when step is completed
 * @param {Object} props.stepData - Data about the current step
 * @param {Object} props.userProgress - Current user progress through onboarding
 * @param {Function} props.setUserProgress - Function to update user progress
 */
const VisitorInvitationsStep = ({
  onStepComplete,
  userProgress = {},
  setUserProgress
}) => {
  const { user } = useAuth();
  const [currentDemo, setCurrentDemo] = useState('form');
  const [demoProgress, setDemoProgress] = useState(new Set());
  const [isCompleted, setIsCompleted] = useState(false);

  // Demo stages for invitation process
  const demoStages = [
    {
      id: 'form',
      title: 'Guest Information',
      description: 'Fill in your guest\'s basic information',
      content: 'Start by entering your guest\'s name, phone number, and email address. This information helps security identify them quickly.',
      action: 'Try filling out the demo form below'
    },
    {
      id: 'details',
      title: 'Visit Details',
      description: 'Set visit timing and purpose',
      content: 'Specify when your guest will arrive and the purpose of their visit. This helps security prepare and ensures smooth entry.',
      action: 'Set the expected arrival time and visit purpose'
    },
    {
      id: 'preview',
      title: 'Invitation Preview',
      description: 'Review and send the invitation',
      content: 'Review all details and send the invitation. Your guest will receive an email with a QR code for quick entry.',
      action: 'Review the invitation preview'
    },
    {
      id: 'qr-code',
      title: 'QR Code Generation',
      description: 'Understanding the QR code system',
      content: 'Each invitation generates a unique QR code that contains encrypted visitor information. Guards can scan this for instant verification.',
      action: 'See how QR codes work'
    }
  ];

  const requiredStages = demoStages.length;
  const completionThreshold = Math.ceil(requiredStages * 0.75); // 75% completion

  useEffect(() => {
    // Check if step should be marked as completed
    if (demoProgress.size >= completionThreshold && !isCompleted) {
      setIsCompleted(true);
      
      // Update user progress
      const newProgress = {
        ...userProgress,
        visitorInvitations: {
          completed: true,
          completedStages: Array.from(demoProgress),
          completedAt: new Date().toISOString()
        }
      };
      setUserProgress(newProgress);

      // Track completion
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.track('Onboarding Step Completed', {
          stepId: 'visitor-invitations',
          role: 'resident',
          completedStages: demoProgress.size,
          totalStages: requiredStages,
          userId: user?.id
        });
      }
    }
  }, [demoProgress.size, completionThreshold, isCompleted, userProgress, setUserProgress, user?.id, requiredStages]);

  const handleStageComplete = (stageId) => {
    const newProgress = new Set(demoProgress);
    newProgress.add(stageId);
    setDemoProgress(newProgress);

    // Track stage completion
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Onboarding Demo Stage Completed', {
        stepId: 'visitor-invitations',
        stageId,
        role: 'resident',
        userId: user?.id
      });
    }

    // Auto-advance to next stage
    const currentIndex = demoStages.findIndex(stage => stage.id === stageId);
    if (currentIndex < demoStages.length - 1) {
      setTimeout(() => {
        setCurrentDemo(demoStages[currentIndex + 1].id);
      }, 1000);
    }
  };

  const handleCompleteStep = () => {
    if (onStepComplete) {
      onStepComplete();
    }
  };

  const currentStage = demoStages.find(stage => stage.id === currentDemo);
  const isStageCompleted = demoProgress.has(currentDemo);

  return (
    <div className="visitor-invitations-step">
      {/* Introduction */}
      <div className="intro-section mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Learn to Invite Guests 👥
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Inviting guests is simple and secure. Let's walk through the process step by step, 
          so you'll be confident inviting your first guest.
        </p>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <span className="mr-2">🎯</span>
          <span>Complete {completionThreshold} of {requiredStages} demo stages to continue</span>
        </div>
      </div>

      {/* Demo Navigation */}
      <div className="demo-navigation mb-6">
        <div className="flex flex-wrap gap-2">
          {demoStages.map((stage, index) => {
            const isActive = currentDemo === stage.id;
            const isCompleted = demoProgress.has(stage.id);
            
            return (
              <button
                key={stage.id}
                onClick={() => setCurrentDemo(stage.id)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : isCompleted
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }
                `}
                aria-pressed={isActive}
              >
                <span className="mr-2">
                  {isCompleted ? '✓' : index + 1}
                </span>
                {stage.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Stage Content */}
      {currentStage && (
        <div className="demo-stage bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="stage-header mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {currentStage.title}
            </h4>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {currentStage.description}
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-blue-900 dark:text-blue-100 mb-2">
                {currentStage.content}
              </p>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {currentStage.action}
              </p>
            </div>
          </div>

          {/* Stage-specific Demo Content */}
          <div className="demo-content">
            {currentDemo === 'form' && (
              <div className="demo-form space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Guest Name *
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      onChange={() => !isStageCompleted && handleStageComplete('form')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {currentDemo === 'details' && (
              <div className="demo-details space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expected Arrival Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      onChange={() => !isStageCompleted && handleStageComplete('details')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expected Time
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Purpose of Visit
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                    <option>Social Visit</option>
                    <option>Business Meeting</option>
                    <option>Delivery</option>
                    <option>Maintenance</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            )}

            {currentDemo === 'preview' && (
              <div className="demo-preview">
                <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">Invitation Preview</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Guest:</span>
                      <span className="text-gray-900 dark:text-white">John Doe</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Phone:</span>
                      <span className="text-gray-900 dark:text-white">+1 (555) 123-4567</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Expected:</span>
                      <span className="text-gray-900 dark:text-white">Today at 2:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Purpose:</span>
                      <span className="text-gray-900 dark:text-white">Social Visit</span>
                    </div>
                  </div>
                  <button
                    onClick={() => !isStageCompleted && handleStageComplete('preview')}
                    className="w-full mt-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                  >
                    Send Invitation
                  </button>
                </div>
              </div>
            )}

            {currentDemo === 'qr-code' && (
              <div className="demo-qr text-center">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-gray-200 dark:border-slate-700 inline-block">
                  <div className="w-32 h-32 bg-gray-200 dark:bg-slate-700 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <div className="text-4xl">📱</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    QR Code Generated Successfully
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-300 space-y-1">
                    <div>Invitation ID: INV-2025-001</div>
                    <div>Valid until: Today 11:59 PM</div>
                    <div>Security Level: Encrypted</div>
                  </div>
                  <button
                    onClick={() => !isStageCompleted && handleStageComplete('qr-code')}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                  >
                    Understand QR System
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Summary */}
      <div className="progress-summary p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Demo Progress: {demoProgress.size} of {requiredStages} stages completed
            </p>
            <div className="w-64 bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(demoProgress.size / requiredStages) * 100}%` }}
              />
            </div>
          </div>
          
          {isCompleted && (
            <GradientButton
              onClick={handleCompleteStep}
              variant="primary"
              size="sm"
              className="ml-4"
            >
              Continue to Next Step
            </GradientButton>
          )}
        </div>
      </div>

      {/* Completion Message */}
      {isCompleted && (
        <div className="completion-message mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center">
            <span className="text-2xl mr-3" role="img" aria-label="Success">🎉</span>
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                Excellent! You've mastered the invitation process.
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Ready to learn about managing your guests?
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Accessibility Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isCompleted && "Visitor invitations tutorial completed. Ready to continue to next step."}
      </div>
    </div>
  );
};

export default VisitorInvitationsStep;