import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { GradientButton } from '../../ui/GradientButton';

/**
 * CommunityFeaturesStep Component
 * 
 * Final step in the resident welcome flow that introduces community features,
 * announcements, events, and neighbor connections.
 * 
 * Features:
 * - Community features exploration
 * - Announcements and events overview
 * - Neighbor connection features
 * - Progress tracking for step completion
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onStepComplete - Callback when step is completed
 * @param {Object} props.stepData - Data about the current step
 * @param {Object} props.userProgress - Current user progress through onboarding
 * @param {Function} props.setUserProgress - Function to update user progress
 */
const CommunityFeaturesStep = ({
  onStepComplete,
  userProgress = {},
  setUserProgress
}) => {
  const { user } = useAuth();
  const [discoveredFeatures, setDiscoveredFeatures] = useState(new Set());
  const [isCompleted, setIsCompleted] = useState(false);

  // Community features to discover
  const communityFeatures = [
    {
      id: 'announcements',
      title: 'Community Announcements',
      description: 'Stay informed about important community updates',
      icon: '📢',
      category: 'Communication',
      content: {
        explanation: 'Get timely updates about community events, maintenance schedules, policy changes, and important notices.',
        examples: [
          {
            type: 'Maintenance',
            title: 'Pool Maintenance Scheduled',
            preview: 'The community pool will be closed for maintenance on Saturday, January 30th from 8 AM to 2 PM.',
            priority: 'Medium'
          },
          {
            type: 'Event',
            title: 'Community BBQ This Weekend',
            preview: 'Join us for our monthly community BBQ this Saturday at 6 PM in the clubhouse area.',
            priority: 'Low'
          },
          {
            type: 'Security',
            title: 'Gate System Update',
            preview: 'Our gate access system will receive an update tonight. Temporary access codes will be provided.',
            priority: 'High'
          }
        ],
        features: [
          'Real-time push notifications',
          'Priority-based filtering',
          'Archive and search history',
          'RSVP for community events'
        ]
      },
      action: 'Browse announcements'
    },
    {
      id: 'events-calendar',
      title: 'Events & Activities',
      description: 'Discover and participate in community events',
      icon: '📅',
      category: 'Social',
      content: {
        explanation: 'Stay connected with your community through events, activities, and social gatherings organized by residents and management.',
        upcomingEvents: [
          {
            title: 'Yoga in the Park',
            date: 'Every Tuesday',
            time: '7:00 AM',
            location: 'Community Garden',
            attendees: 12
          },
          {
            title: 'Book Club Meeting',
            date: 'February 5th',
            time: '7:30 PM',
            location: 'Clubhouse',
            attendees: 8
          },
          {
            title: 'Kids Movie Night',
            date: 'February 12th',
            time: '6:00 PM',
            location: 'Recreation Center',
            attendees: 25
          }
        ],
        features: [
          'Event calendar integration',
          'RSVP and attendance tracking',
          'Create your own events',
          'Recurring event management'
        ]
      },
      action: 'Explore events calendar'
    },
    {
      id: 'neighbor-directory',
      title: 'Neighbor Directory',
      description: 'Connect with your neighbors and build community',
      icon: '👥',
      category: 'Social',
      content: {
        explanation: 'Build meaningful connections with your neighbors through our secure directory and communication features.',
        features: [
          'Opt-in neighbor directory',
          'Private messaging system',
          'Skill and service sharing',
          'Emergency contact network'
        ],
        examples: [
          {
            name: 'Sarah Johnson',
            unit: 'Building A, Unit 205',
            interests: ['Gardening', 'Book Club'],
            services: ['Pet Sitting', 'Plant Care']
          },
          {
            name: 'Mike Chen',
            unit: 'Building B, Unit 301',
            interests: ['Fitness', 'Cooking'],
            services: ['Tech Support', 'Tutoring']
          },
          {
            name: 'Lisa Rodriguez',
            unit: 'Building C, Unit 102',
            interests: ['Art', 'Music'],
            services: ['Art Lessons', 'Event Planning']
          }
        ]
      },
      action: 'Meet your neighbors'
    },
    {
      id: 'amenity-booking',
      title: 'Amenity Reservations',
      description: 'Book community amenities and facilities',
      icon: '🏊‍♀️',
      category: 'Facilities',
      content: {
        explanation: 'Reserve community amenities like the pool, gym, clubhouse, and other facilities with our easy booking system.',
        amenities: [
          {
            name: 'Swimming Pool',
            availability: 'Daily 6 AM - 10 PM',
            capacity: '15 people',
            booking: 'Up to 7 days in advance'
          },
          {
            name: 'Fitness Center',
            availability: '24/7 with key card',
            capacity: '10 people',
            booking: 'Walk-in or reserve'
          },
          {
            name: 'Clubhouse',
            availability: 'Events only',
            capacity: '50 people',
            booking: 'Up to 30 days in advance'
          },
          {
            name: 'BBQ Area',
            availability: 'Daily 10 AM - 8 PM',
            capacity: '20 people',
            booking: 'Up to 14 days in advance'
          }
        ],
        features: [
          'Real-time availability checking',
          'Automatic confirmation emails',
          'Cancellation and rescheduling',
          'Usage history and preferences'
        ]
      },
      action: 'Check amenity availability'
    },
    {
      id: 'feedback-suggestions',
      title: 'Community Feedback',
      description: 'Share ideas and feedback to improve community life',
      icon: '💡',
      category: 'Engagement',
      content: {
        explanation: 'Your voice matters! Share suggestions, report issues, and participate in community decision-making.',
        categories: [
          {
            type: 'Suggestion',
            title: 'New Amenity Ideas',
            description: 'Propose new facilities or services for the community'
          },
          {
            type: 'Issue Report',
            title: 'Maintenance Requests',
            description: 'Report maintenance issues or safety concerns'
          },
          {
            type: 'Feedback',
            title: 'Service Improvement',
            description: 'Share feedback on existing services and policies'
          },
          {
            type: 'Poll',
            title: 'Community Decisions',
            description: 'Participate in community polls and voting'
          }
        ],
        features: [
          'Anonymous feedback option',
          'Status tracking for submissions',
          'Community voting on proposals',
          'Regular feedback summaries'
        ]
      },
      action: 'Share your thoughts'
    }
  ];

  const requiredFeatures = communityFeatures.length;
  const completionThreshold = Math.ceil(requiredFeatures * 0.8); // 80% completion for final step

  useEffect(() => {
    // Check if step should be marked as completed
    if (discoveredFeatures.size >= completionThreshold && !isCompleted) {
      setIsCompleted(true);
      
      // Update user progress
      const newProgress = {
        ...userProgress,
        communityFeatures: {
          completed: true,
          discoveredFeatures: Array.from(discoveredFeatures),
          completedAt: new Date().toISOString()
        }
      };
      setUserProgress(newProgress);

      // Track completion
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.track('Onboarding Step Completed', {
          stepId: 'community-features',
          role: 'resident',
          discoveredFeatures: discoveredFeatures.size,
          totalFeatures: requiredFeatures,
          userId: user?.id
        });
      }
    }
  }, [discoveredFeatures.size, completionThreshold, isCompleted, userProgress, setUserProgress, user?.id, requiredFeatures]);

  const handleFeatureDiscover = (featureId) => {
    const newDiscovered = new Set(discoveredFeatures);
    newDiscovered.add(featureId);
    setDiscoveredFeatures(newDiscovered);

    // Track feature discovery
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Onboarding Feature Discovered', {
        stepId: 'community-features',
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

  // Group features by category
  const featuresByCategory = communityFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {});

  return (
    <div className="community-features-step">
      {/* Introduction */}
      <div className="intro-section mb-8 p-6 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Discover Your Community 🌟
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Your community offers amazing features to help you connect, stay informed, and make the most of your living experience. 
          Let's explore what's available to you as a valued resident.
        </p>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <span className="mr-2">🎯</span>
          <span>Discover {completionThreshold} of {requiredFeatures} community features to complete your onboarding</span>
        </div>
      </div>

      {/* Features by Category */}
      {Object.entries(featuresByCategory).map(([category, features]) => (
        <div key={category} className="category-section mb-8">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            {category} Features
          </h4>
          
          <div className="features-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
            {features.map((feature) => {
              const isDiscovered = discoveredFeatures.has(feature.id);
              
              return (
                <div
                  key={feature.id}
                  className={`
                    feature-card p-6 rounded-lg border-2 transition-all duration-300
                    ${isDiscovered 
                      ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20' 
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
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
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {feature.title}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    
                    {isDiscovered && (
                      <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
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
                    {feature.id === 'announcements' && (
                      <div className="announcements-demo space-y-3">
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white">Recent Announcements:</h6>
                        {feature.content.examples.map((announcement, index) => (
                          <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900 rounded border-l-4 border-blue-500">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{announcement.type}</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                announcement.priority === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                announcement.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                              }`}>
                                {announcement.priority}
                              </span>
                            </div>
                            <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-1">{announcement.title}</h6>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{announcement.preview}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {feature.id === 'events-calendar' && (
                      <div className="events-demo">
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Upcoming Events:</h6>
                        <div className="space-y-2">
                          {feature.content.upcomingEvents.map((event, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                              <div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</span>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{event.date} at {event.time}</p>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-500">{event.attendees} attending</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {feature.id === 'neighbor-directory' && (
                      <div className="neighbors-demo">
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Your Neighbors:</h6>
                        <div className="space-y-2">
                          {feature.content.examples.map((neighbor, index) => (
                            <div key={index} className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{neighbor.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-500">{neighbor.unit}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mb-1">
                                {neighbor.interests.map((interest, i) => (
                                  <span key={i} className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-2 py-1 rounded">
                                    {interest}
                                  </span>
                                ))}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                Services: {neighbor.services.join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {feature.id === 'amenity-booking' && (
                      <div className="amenities-demo">
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Available Amenities:</h6>
                        <div className="space-y-2">
                          {feature.content.amenities.map((amenity, index) => (
                            <div key={index} className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{amenity.name}</span>
                                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-1 rounded">
                                  Available
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                <div>Hours: {amenity.availability}</div>
                                <div>Capacity: {amenity.capacity}</div>
                                <div>Booking: {amenity.booking}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {feature.id === 'feedback-suggestions' && (
                      <div className="feedback-demo">
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Feedback Categories:</h6>
                        <div className="space-y-2">
                          {feature.content.categories.map((category, index) => (
                            <div key={index} className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{category.title}</span>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{category.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleFeatureDiscover(feature.id)}
                    disabled={isDiscovered}
                    className={`
                      w-full px-4 py-2 text-sm font-medium rounded-md transition-colors
                      ${isDiscovered
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 cursor-default'
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                      }
                    `}
                    aria-label={`${feature.action} for ${feature.title}`}
                  >
                    {isDiscovered ? '✓ Discovered' : feature.action} →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Progress Summary */}
      <div className="progress-summary p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Discovery Progress: {discoveredFeatures.size} of {requiredFeatures} features discovered
            </p>
            <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(discoveredFeatures.size / requiredFeatures) * 100}%` }}
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
              Complete Onboarding
            </GradientButton>
          )}
        </div>
      </div>

      {/* Completion Message */}
      {isCompleted && (
        <div className="completion-message mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-center">
            <span className="text-4xl mb-4 block" role="img" aria-label="Celebration">🎉</span>
            <h4 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
              Welcome to Your Community!
            </h4>
            <p className="text-green-700 dark:text-green-300 mb-4">
              You've successfully completed the onboarding process and discovered the amazing features available to you. 
              You're now ready to make the most of your community living experience!
            </p>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700">
              <h5 className="font-medium text-gray-900 dark:text-white mb-2">Quick Start Checklist:</h5>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 text-left">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Create your first visitor invitation
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Set up your notification preferences
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Explore community announcements
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Connect with your neighbors
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Accessibility Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isCompleted && "Community features tutorial completed. Onboarding process finished successfully."}
      </div>
    </div>
  );
};

export default CommunityFeaturesStep;