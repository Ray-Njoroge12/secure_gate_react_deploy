import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { GradientButton } from '../../ui/GradientButton';

/**
 * GuestManagementStep Component
 * 
 * Third step in the resident welcome flow that teaches guest management,
 * tracking visits, and setting up preferences for frequent visitors.
 * 
 * Features:
 * - Interactive guest management demonstration
 * - Visitor status tracking explanation
 * - Favorites and preferences setup
 * - Progress tracking for step completion
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onStepComplete - Callback when step is completed
 * @param {Object} props.stepData - Data about the current step
 * @param {Object} props.userProgress - Current user progress through onboarding
 * @param {Function} props.setUserProgress - Function to update user progress
 */
const GuestManagementStep = ({
  onStepComplete,
  userProgress = {},
  setUserProgress
}) => {
  const { user } = useAuth();
  const [exploredFeatures, setExploredFeatures] = useState(new Set());
  const [isCompleted, setIsCompleted] = useState(false);

  // Guest management features to explore
  const managementFeatures = [
    {
      id: 'visitor-status',
      title: 'Visitor Status Tracking',
      description: 'Monitor your guests from invitation to departure',
      icon: '📊',
      content: {
        explanation: 'Track your visitors through every stage of their visit, from pending approval to successful departure.',
        statuses: [
          { status: 'PENDING', description: 'Invitation sent, awaiting guest confirmation', color: 'yellow' },
          { status: 'APPROVED', description: 'Guest confirmed, ready for arrival', color: 'blue' },
          { status: 'VERIFIED', description: 'Guest identity verified at gate', color: 'purple' },
          { status: 'ON_PREMISE', description: 'Guest currently on the premises', color: 'green' },
          { status: 'CHECKED_OUT', description: 'Visit completed successfully', color: 'gray' }
        ]
      },
      action: 'Explore visitor statuses'
    },
    {
      id: 'favorites-system',
      title: 'Favorite Visitors',
      description: 'Save frequent guests for quick re-invitations',
      icon: '⭐',
      content: {
        explanation: 'Add regular visitors to your favorites list for one-click invitations. Perfect for family, friends, and service providers.',
        benefits: [
          'One-click invitation sending',
          'Pre-filled guest information',
          'Automatic approval for trusted visitors',
          'Quick access from dashboard'
        ],
        examples: [
          { name: 'Mom & Dad', visits: 12, lastVisit: '2 days ago' },
          { name: 'Cleaning Service', visits: 8, lastVisit: '1 week ago' },
          { name: 'Best Friend Sarah', visits: 15, lastVisit: '3 days ago' }
        ]
      },
      action: 'Set up favorite visitors'
    },
    {
      id: 'visit-history',
      title: 'Visit History & Analytics',
      description: 'Review past visits and visitor patterns',
      icon: '📈',
      content: {
        explanation: 'Keep track of all your visitors with detailed history and helpful analytics to understand your hosting patterns.',
        features: [
          'Complete visit timeline',
          'Visitor frequency analysis',
          'Peak visiting hours',
          'Monthly visit summaries'
        ],
        insights: [
          'Most visits happen on weekends',
          'Average visit duration: 2.5 hours',
          'Top visitor: Family members (45%)',
          'Busiest month: December'
        ]
      },
      action: 'View visit analytics'
    },
    {
      id: 'notification-preferences',
      title: 'Notification Settings',
      description: 'Customize how you receive visitor updates',
      icon: '🔔',
      content: {
        explanation: 'Stay informed about your visitors with customizable notifications. Choose when and how you want to be notified.',
        options: [
          { type: 'Email', description: 'Detailed email notifications with visit summaries' },
          { type: 'SMS', description: 'Quick text alerts for urgent updates' },
          { type: 'Push', description: 'Real-time app notifications' },
          { type: 'In-App', description: 'Dashboard notifications and alerts' }
        ],
        events: [
          'Guest confirms invitation',
          'Guest arrives at gate',
          'Guest checked in successfully',
          'Guest departure notification'
        ]
      },
      action: 'Configure notifications'
    }
  ];

  const requiredFeatures = managementFeatures.length;
  const completionThreshold = Math.ceil(requiredFeatures * 0.75); // 75% completion

  useEffect(() => {
    // Check if step should be marked as completed
    if (exploredFeatures.size >= completionThreshold && !isCompleted) {
      setIsCompleted(true);
      
      // Update user progress
      const newProgress = {
        ...userProgress,
        guestManagement: {
          completed: true,
          exploredFeatures: Array.from(exploredFeatures),
          completedAt: new Date().toISOString()
        }
      };
      setUserProgress(newProgress);

      // Track completion
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.track('Onboarding Step Completed', {
          stepId: 'guest-management',
          role: 'resident',
          exploredFeatures: exploredFeatures.size,
          totalFeatures: requiredFeatures,
          userId: user?.id
        });
      }
    }
  }, [exploredFeatures.size, completionThreshold, isCompleted, userProgress, setUserProgress, user?.id, requiredFeatures]);

  const handleFeatureExplore = (featureId) => {
    const newExplored = new Set(exploredFeatures);
    newExplored.add(featureId);
    setExploredFeatures(newExplored);

    // Track feature exploration
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Onboarding Feature Explored', {
        stepId: 'guest-management',
        featureId,
        role: 'resident',
        userId: user?.id
      });
    }
  };

  const handleCompleteStep = () => {
    if (onStepComplete) {
      onStepComplete();
    }
  };

  return (
    <div className="guest-management-step">
      {/* Introduction */}
      <div className="intro-section mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Master Guest Management 🎯
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Once you've invited guests, you'll want to track their visits, manage favorites, 
          and stay updated on their status. Let's explore the powerful guest management features.
        </p>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <span className="mr-2">🔍</span>
          <span>Explore {completionThreshold} of {requiredFeatures} management features to continue</span>
        </div>
      </div>

      {/* Management Features */}
      <div className="features-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
        {managementFeatures.map((feature) => {
          const isExplored = exploredFeatures.has(feature.id);
          
          return (
            <div
              key={feature.id}
              className={`
                feature-card p-6 rounded-lg border-2 transition-all duration-300
                ${isExplored 
                  ? 'border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20' 
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:border-slate-700 dark:bg-slate-800'
                }
              `}
            >
              {/* Feature Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-3xl mr-3" role="img" aria-hidden="true">
                    {feature.icon}
                  </span>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {feature.description}
                    </p>
                  </div>
                </div>
                
                {isExplored && (
                  <div className="flex-shrink-0 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Feature Content */}
              <div className="feature-content mb-4">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {feature.content.explanation}
                </p>

                {/* Feature-specific content */}
                {feature.id === 'visitor-status' && (
                  <div className="status-demo space-y-2">
                    {feature.content.statuses.map((status, index) => (
                      <div key={status.status} className="flex items-center p-2 bg-gray-50 dark:bg-slate-900 rounded">
                        <div className={`w-3 h-3 rounded-full mr-3 bg-${status.color}-500`}></div>
                        <div className="flex-1">
                          <span className="font-medium text-gray-900 dark:text-white">{status.status}</span>
                          <p className="text-xs text-gray-600 dark:text-gray-300">{status.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {feature.id === 'favorites-system' && (
                  <div className="favorites-demo">
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Benefits:</h5>
                      <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        {feature.content.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Example Favorites:</h5>
                      <div className="space-y-2">
                        {feature.content.examples.map((example, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-900 rounded text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">{example.name}</span>
                            <span className="text-gray-600 dark:text-gray-300">{example.visits} visits</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {feature.id === 'visit-history' && (
                  <div className="history-demo">
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Available Features:</h5>
                      <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        {feature.content.features.map((featureItem, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
                            {featureItem}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Your Insights:</h5>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                        {feature.content.insights.map((insight, index) => (
                          <div key={index} className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2"></span>
                            {insight}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {feature.id === 'notification-preferences' && (
                  <div className="notifications-demo">
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Notification Types:</h5>
                      <div className="space-y-2">
                        {feature.content.options.map((option, index) => (
                          <div key={index} className="flex items-start p-2 bg-gray-50 dark:bg-slate-900 rounded">
                            <input type="checkbox" className="mt-1 mr-3" defaultChecked={index < 2} />
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">{option.type}</span>
                              <p className="text-xs text-gray-600 dark:text-gray-300">{option.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Notification Events:</h5>
                      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        {feature.content.events.map((event, index) => (
                          <div key={index} className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                            {event}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <Button
                onClick={() => handleFeatureExplore(feature.id)}
                disabled={isExplored}
                className={`
                  w-full px-4 py-2 text-sm font-medium rounded-md transition-colors
                  ${isExplored
                    ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/20 dark:text-brand-300 cursor-default'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                  }
                `}
                aria-label={`${feature.action} for ${feature.title}`}
              >
                {isExplored ? '✓ Explored' : feature.action} →
              </Button>
            </div>
          );
        })}
      </div>

      {/* Progress Summary */}
      <div className="progress-summary mt-8 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Exploration Progress: {exploredFeatures.size} of {requiredFeatures} features explored
            </p>
            <div className="w-64 bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(exploredFeatures.size / requiredFeatures) * 100}%` }}
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
        <div className="completion-message mt-6 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-800">
          <div className="flex items-center">
            <span className="text-2xl mr-3" role="img" aria-label="Achievement">🏆</span>
            <div>
              <p className="font-medium text-brand-900 dark:text-brand-100">
                Outstanding! You're now a guest management expert.
              </p>
              <p className="text-sm text-brand-700 dark:text-brand-300">
                Ready to explore community features and connect with neighbors?
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Accessibility Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isCompleted && "Guest management tutorial completed. Ready to continue to next step."}
      </div>
    </div>
  );
};

export default GuestManagementStep;