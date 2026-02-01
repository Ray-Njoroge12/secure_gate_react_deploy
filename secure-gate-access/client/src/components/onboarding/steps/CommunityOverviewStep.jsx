import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { GradientButton } from '../../ui/GradientButton';

/**
 * CommunityOverviewStep Component
 * 
 * First step in the resident welcome flow that introduces community features
 * and benefits. Provides an overview of what residents can do in the system.
 * 
 * Features:
 * - Interactive feature showcase with visual demonstrations
 * - Progress tracking for step completion
 * - Accessibility-compliant content and navigation
 * - Responsive design for all device types
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onStepComplete - Callback when step is completed
 * @param {Object} props.stepData - Data about the current step
 * @param {Object} props.userProgress - Current user progress through onboarding
 * @param {Function} props.setUserProgress - Function to update user progress
 */
const CommunityOverviewStep = ({
  onStepComplete,
  userProgress = {},
  setUserProgress
}) => {
  const { user } = useAuth();
  const [viewedSections, setViewedSections] = useState(new Set());
  const [isCompleted, setIsCompleted] = useState(false);

  // Community features to showcase
  const communityFeatures = [
    {
      id: 'visitor-management',
      title: 'Visitor Management',
      description: 'Easily invite guests, track their visits, and manage access permissions',
      icon: '👥',
      benefits: [
        'Send digital invitations with QR codes',
        'Track visitor arrival and departure times',
        'Set up recurring access for regular visitors',
        'Receive real-time notifications about guest arrivals'
      ],
      demoAction: 'See how to invite a guest'
    },
    {
      id: 'security-features',
      title: 'Security & Safety',
      description: 'Stay informed about community security and safety measures',
      icon: '🛡️',
      benefits: [
        'Real-time security alerts and notifications',
        'Emergency contact system for quick assistance',
        'Incident reporting and tracking',
        'Community safety updates and announcements'
      ],
      demoAction: 'Explore security features'
    },
    {
      id: 'community-connection',
      title: 'Community Connection',
      description: 'Connect with neighbors and stay updated on community events',
      icon: '🏘️',
      benefits: [
        'Community announcements and news',
        'Event notifications and RSVP system',
        'Neighbor directory and contact sharing',
        'Community feedback and suggestion system'
      ],
      demoAction: 'View community updates'
    },
    {
      id: 'convenience-tools',
      title: 'Convenience Tools',
      description: 'Access helpful tools that make community living easier',
      icon: '🔧',
      benefits: [
        'Maintenance request submission and tracking',
        'Package delivery notifications',
        'Amenity booking and scheduling',
        'Digital community directory'
      ],
      demoAction: 'Try convenience tools'
    }
  ];

  const requiredSections = communityFeatures.length;
  const completionThreshold = Math.ceil(requiredSections * 0.75); // 75% of sections

  useEffect(() => {
    // Check if step should be marked as completed
    if (viewedSections.size >= completionThreshold && !isCompleted) {
      setIsCompleted(true);
      
      // Update user progress
      const newProgress = {
        ...userProgress,
        communityOverview: {
          completed: true,
          viewedSections: Array.from(viewedSections),
          completedAt: new Date().toISOString()
        }
      };
      setUserProgress(newProgress);

      // Track completion
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.track('Onboarding Step Completed', {
          stepId: 'community-overview',
          role: 'resident',
          viewedSections: viewedSections.size,
          totalSections: requiredSections,
          userId: user?.id
        });
      }
    }
  }, [viewedSections.size, completionThreshold, isCompleted, userProgress, setUserProgress, user?.id, requiredSections]);

  const handleSectionView = (sectionId) => {
    const newViewedSections = new Set(viewedSections);
    newViewedSections.add(sectionId);
    setViewedSections(newViewedSections);

    // Track section interaction
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Onboarding Section Viewed', {
        stepId: 'community-overview',
        sectionId,
        role: 'resident',
        userId: user?.id
      });
    }
  };

  const handleFeatureDemo = (featureId) => {
    // Track demo interaction
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Onboarding Demo Clicked', {
        stepId: 'community-overview',
        featureId,
        role: 'resident',
        userId: user?.id
      });
    }

    // Mark section as viewed
    handleSectionView(featureId);
  };

  const handleCompleteStep = () => {
    if (onStepComplete) {
      onStepComplete();
    }
  };

  return (
    <div className="community-overview-step">
      {/* Welcome Message */}
      <div className="welcome-message mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Welcome to Your Secure Community! 🏡
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          You're now part of a modern, secure community management system designed to make your life easier and safer. 
          Let's explore what you can do with your new resident account.
        </p>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <span className="mr-2">👀</span>
          <span>Explore {completionThreshold} of {requiredSections} features to continue</span>
        </div>
      </div>

      {/* Feature Showcase */}
      <div className="features-showcase">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Discover Your Community Features
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {communityFeatures.map((feature) => {
            const isViewed = viewedSections.has(feature.id);
            
            return (
              <div
                key={feature.id}
                className={`
                  feature-card p-6 rounded-lg border-2 transition-all duration-300 cursor-pointer
                  ${isViewed 
                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20' 
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
                  }
                `}
                onClick={() => handleSectionView(feature.id)}
                role="button"
                tabIndex={0}
                aria-pressed={isViewed}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSectionView(feature.id);
                  }
                }}
              >
                {/* Feature Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3" role="img" aria-hidden="true">
                      {feature.icon}
                    </span>
                    <div>
                      <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {feature.title}
                      </h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  
                  {isViewed && (
                    <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Feature Benefits */}
                <ul className="space-y-2 mb-4">
                  {feature.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      {benefit}
                    </li>
                  ))}
                </ul>

                {/* Demo Action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFeatureDemo(feature.id);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  aria-label={`${feature.demoAction} for ${feature.title}`}
                >
                  {feature.demoAction} →
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="progress-summary mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Progress: {viewedSections.size} of {requiredSections} features explored
            </p>
            <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(viewedSections.size / requiredSections) * 100}%` }}
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
            <span className="text-2xl mr-3" role="img" aria-label="Celebration">🎉</span>
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                Great job! You've explored the key community features.
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Ready to learn how to invite your first guest?
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Accessibility Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isCompleted && "Community overview completed. Ready to continue to next step."}
      </div>
    </div>
  );
};

export default CommunityOverviewStep;