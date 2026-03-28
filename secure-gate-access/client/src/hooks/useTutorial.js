import { useState, useEffect, useCallback, useRef } from 'react';

import { useAuth } from '../contexts/AuthContext';

/**
 * useTutorial Hook
 * 
 * Manages tutorial state, progress tracking, and just-in-time help system.
 * Provides a centralized way to control tutorials across the application.
 * 
 * Features:
 * - Tutorial state management and progress tracking
 * - Just-in-time help triggers for first-time encounters
 * - Persistent tutorial completion tracking
 * - Role-based tutorial content delivery
 * - Accessibility-compliant tutorial management
 * 
 * @param {Object} options - Hook configuration options
 * @param {string} options.tutorialId - Unique identifier for the tutorial
 * @param {boolean} options.autoStart - Whether to auto-start tutorial for new users
 * @param {boolean} options.persistProgress - Whether to persist tutorial progress
 * @param {Function} options.onComplete - Callback when tutorial is completed
 */
const useTutorial = (options = {}) => {
  const { user } = useAuth();
  const {
    tutorialId = 'default',
    autoStart = false,
    persistProgress = true,
    onComplete
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState(null);
  const [completedTutorials, setCompletedTutorials] = useState(new Set());
  const [tutorialProgress, setTutorialProgress] = useState({});
  const [justInTimeHelp, setJustInTimeHelp] = useState(null);
  const observerRef = useRef(null);

  // Tutorial definitions by role and context
  const tutorialDefinitions = {
    // Dashboard tutorials
    dashboard: {
      resident: {
        id: 'resident-dashboard',
        title: 'Your Resident Dashboard',
        steps: [
          {
            id: 'dashboard-overview',
            title: 'Welcome to Your Dashboard',
            content: 'This is your personal control center where you can manage visitors, view announcements, and access community features.',
            target: '[data-tutorial-target="dashboard-main"]',
            placement: 'bottom'
          },
          {
            id: 'quick-invite',
            title: 'Quick Visitor Invite',
            content: 'Click here to quickly invite a guest. You can send them a digital invitation with a QR code for easy access.',
            target: '[data-tutorial-target="quick-invite-button"]',
            placement: 'bottom',
            action: 'Click the "Invite Guest" button to try it'
          },
          {
            id: 'visitor-list',
            title: 'Your Visitors',
            content: 'Here you can see all your current and upcoming visitors. You can track their status and manage their access.',
            target: '[data-tutorial-target="visitor-list"]',
            placement: 'left'
          },
          {
            id: 'notifications',
            title: 'Stay Updated',
            content: 'Get real-time notifications about your visitors, community announcements, and important updates.',
            target: '[data-tutorial-target="notification-center"]',
            placement: 'bottom'
          }
        ]
      },
      guard: {
        id: 'guard-dashboard',
        title: 'Security Guard Dashboard',
        steps: [
          {
            id: 'qr-scanner',
            title: 'QR Code Scanner',
            content: 'Use this scanner to quickly check in visitors. Simply scan their QR code to verify and process their entry.',
            target: '[data-tutorial-target="qr-scanner"]',
            placement: 'right',
            action: 'Click to open the QR scanner'
          },
          {
            id: 'visitor-queue',
            title: 'Visitor Queue',
            content: 'See all pending visitors waiting for check-in. You can process them manually if they don\'t have a QR code.',
            target: '[data-tutorial-target="visitor-queue"]',
            placement: 'left'
          },
          {
            id: 'emergency-button',
            title: 'Emergency Alert',
            content: 'In case of emergency, use this button to immediately alert administrators and security personnel.',
            target: '[data-tutorial-target="emergency-button"]',
            placement: 'top'
          },
          {
            id: 'incident-report',
            title: 'Incident Reporting',
            content: 'Report and track security incidents. All reports are logged and can be reviewed by administrators.',
            target: '[data-tutorial-target="incident-report"]',
            placement: 'top'
          }
        ]
      },
      admin: {
        id: 'admin-dashboard',
        title: 'Estate Administration',
        steps: [
          {
            id: 'user-approvals',
            title: 'User Approvals',
            content: 'Review and approve new user registrations. You can see pending requests and manage user permissions.',
            target: '[data-tutorial-target="user-approvals"]',
            placement: 'bottom'
          },
          {
            id: 'visitor-analytics',
            title: 'Visitor Analytics',
            content: 'Monitor visitor patterns and security metrics. Use this data to optimize estate operations.',
            target: '[data-tutorial-target="visitor-analytics"]',
            placement: 'left'
          },
          {
            id: 'security-alerts',
            title: 'Security Monitoring',
            content: 'Stay informed about security events and incidents. Configure alerts for different types of activities.',
            target: '[data-tutorial-target="security-alerts"]',
            placement: 'bottom'
          },
          {
            id: 'reports-center',
            title: 'Reports & Analytics',
            content: 'Generate comprehensive reports on estate activities, user behavior, and security metrics.',
            target: '[data-tutorial-target="reports-center"]',
            placement: 'top'
          }
        ]
      }
    },

    // Feature-specific tutorials
    'visitor-invite': {
      resident: {
        id: 'visitor-invite-tutorial',
        title: 'Inviting Guests',
        steps: [
          {
            id: 'invite-form',
            title: 'Guest Information',
            content: 'Fill in your guest\'s details. The more information you provide, the smoother their entry process will be.',
            target: '[data-tutorial-target="invite-form"]',
            placement: 'right'
          },
          {
            id: 'visit-details',
            title: 'Visit Details',
            content: 'Set the expected arrival time and visit purpose. This helps security guards prepare for your guest.',
            target: '[data-tutorial-target="visit-details"]',
            placement: 'bottom'
          },
          {
            id: 'send-invitation',
            title: 'Send Invitation',
            content: 'Your guest will receive an email with a QR code they can use for quick entry at the gate.',
            target: '[data-tutorial-target="send-button"]',
            placement: 'top',
            action: 'Click "Send Invitation" to complete the process'
          }
        ]
      }
    },

    // QR scanning tutorial
    'qr-scanning': {
      guard: {
        id: 'qr-scanning-tutorial',
        title: 'QR Code Scanning',
        steps: [
          {
            id: 'camera-access',
            title: 'Camera Permission',
            content: 'Allow camera access to scan QR codes. Make sure you have good lighting for best results.',
            target: '[data-tutorial-target="camera-view"]',
            placement: 'bottom'
          },
          {
            id: 'scan-process',
            title: 'Scanning Process',
            content: 'Point the camera at the visitor\'s QR code. The system will automatically detect and process it.',
            target: '[data-tutorial-target="scan-area"]',
            placement: 'top'
          },
          {
            id: 'manual-entry',
            title: 'Manual Entry',
            content: 'If the QR code doesn\'t work, you can manually search for the visitor using their name or phone number.',
            target: '[data-tutorial-target="manual-search"]',
            placement: 'bottom'
          }
        ]
      }
    }
  };

  // Load tutorial progress from storage
  useEffect(() => {
    if (!user || !persistProgress) return;

    const progressKey = `tutorial_progress_${user.id}`;
    const completedKey = `completed_tutorials_${user.id}`;

    try {
      const savedProgress = localStorage.getItem(progressKey);
      const savedCompleted = localStorage.getItem(completedKey);

      if (savedProgress) {
        setTutorialProgress(JSON.parse(savedProgress));
      }

      if (savedCompleted) {
        setCompletedTutorials(new Set(JSON.parse(savedCompleted)));
      }
    } catch (error) {
      console.warn('Failed to load tutorial progress:', error);
    }
  }, [user, persistProgress]);

  // Save tutorial progress to storage
  const saveProgress = useCallback((progress, completed) => {
    if (!user || !persistProgress) return;

    const progressKey = `tutorial_progress_${user.id}`;
    const completedKey = `completed_tutorials_${user.id}`;

    try {
      localStorage.setItem(progressKey, JSON.stringify(progress));
      localStorage.setItem(completedKey, JSON.stringify(Array.from(completed)));
    } catch (error) {
      console.warn('Failed to save tutorial progress:', error);
    }
  }, [user, persistProgress]);

  // Start a specific tutorial
  const startTutorial = useCallback((context, role = user?.role) => {
    if (!role || !tutorialDefinitions[context]?.[role]) {
      console.warn(`No tutorial found for context: ${context}, role: ${role}`);
      return false;
    }

    const tutorial = tutorialDefinitions[context][role];
    
    // Check if already completed
    if (completedTutorials.has(tutorial.id)) {
      return false;
    }

    setCurrentTutorial(tutorial);
    setIsActive(true);

    // Track tutorial start
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Tutorial Started', {
        tutorialId: tutorial.id,
        context,
        role,
        userId: user?.id
      });
    }

    return true;
  }, [user, tutorialDefinitions, completedTutorials]);

  // Complete tutorial
  const completeTutorial = useCallback((tutorialData) => {
    const { tutorialId } = tutorialData;
    
    const newCompleted = new Set(completedTutorials);
    newCompleted.add(tutorialId);
    setCompletedTutorials(newCompleted);

    const newProgress = {
      ...tutorialProgress,
      [tutorialId]: {
        ...tutorialData,
        completedAt: new Date().toISOString()
      }
    };
    setTutorialProgress(newProgress);

    saveProgress(newProgress, newCompleted);
    setIsActive(false);
    setCurrentTutorial(null);

    if (onComplete) {
      onComplete(tutorialData);
    }

    // Track completion
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Tutorial Completed', {
        ...tutorialData,
        userId: user?.id
      });
    }
  }, [completedTutorials, tutorialProgress, saveProgress, onComplete, user]);

  // Skip tutorial
  const skipTutorial = useCallback((tutorialData) => {
    setIsActive(false);
    setCurrentTutorial(null);

    // Track skip
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Tutorial Skipped', {
        ...tutorialData,
        userId: user?.id
      });
    }
  }, [user]);

  // Check if tutorial is completed
  const isTutorialCompleted = useCallback((context, role = user?.role) => {
    if (!role || !tutorialDefinitions[context]?.[role]) return true;
    
    const tutorial = tutorialDefinitions[context][role];
    return completedTutorials.has(tutorial.id);
  }, [user, tutorialDefinitions, completedTutorials]);

  // Just-in-time help system
  const triggerJustInTimeHelp = useCallback((element, helpContent) => {
    if (!element || !helpContent) return;

    setJustInTimeHelp({
      element,
      content: helpContent,
      timestamp: Date.now()
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      setJustInTimeHelp(null);
    }, 10000);

    // Track just-in-time help
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Just In Time Help Triggered', {
        helpId: helpContent.id,
        userId: user?.id
      });
    }
  }, [user]);

  // Auto-start tutorial for new users
  useEffect(() => {
    if (!autoStart || !user || !tutorialId) return;

    // Check if user is new (created within last 24 hours)
    const userCreated = new Date(user.created_at);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const isNewUser = userCreated > dayAgo;

    if (isNewUser && !isTutorialCompleted('dashboard')) {
      // Delay to allow page to load
      setTimeout(() => {
        startTutorial('dashboard');
      }, 2000);
    }
  }, [autoStart, user, tutorialId, isTutorialCompleted, startTutorial]);

  // Set up intersection observer for just-in-time help
  useEffect(() => {
    if (!user) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const helpId = element.getAttribute('data-help-id');
          
          if (helpId && !completedTutorials.has(`help-${helpId}`)) {
            // Trigger just-in-time help for first-time encounters
            const helpContent = {
              id: helpId,
              title: element.getAttribute('data-help-title') || 'Need help?',
              content: element.getAttribute('data-help-content') || 'This feature can help you accomplish your task.',
              action: element.getAttribute('data-help-action')
            };

            triggerJustInTimeHelp(element, helpContent);
          }
        }
      });
    }, {
      threshold: 0.5,
      rootMargin: '0px 0px -100px 0px'
    });

    // Observe elements with help attributes
    const helpElements = document.querySelectorAll('[data-help-id]');
    helpElements.forEach(el => observer.observe(el));

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [user, completedTutorials, triggerJustInTimeHelp]);

  return {
    // State
    isActive,
    currentTutorial,
    completedTutorials: Array.from(completedTutorials),
    tutorialProgress,
    justInTimeHelp,

    // Actions
    startTutorial,
    completeTutorial,
    skipTutorial,
    triggerJustInTimeHelp,

    // Utilities
    isTutorialCompleted,
    getTutorialProgress: (tutorialId) => tutorialProgress[tutorialId],
    resetTutorials: () => {
      setCompletedTutorials(new Set());
      setTutorialProgress({});
      if (persistProgress && user) {
        const progressKey = `tutorial_progress_${user.id}`;
        const completedKey = `completed_tutorials_${user.id}`;
        localStorage.removeItem(progressKey);
        localStorage.removeItem(completedKey);
      }
    }
  };
};

export default useTutorial;