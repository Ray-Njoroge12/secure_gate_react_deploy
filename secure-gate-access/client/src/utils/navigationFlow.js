// client/src/utils/navigationFlow.js
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Navigation flow configurations for different user roles
export const NAVIGATION_FLOWS = {
  resident: {
    entry: '/dashboard/resident',
    flows: {
      'invite-creation': [
        '/resident/generate-pass',
        '/resident/visitor-history'
      ],
      'bulk-invite': [
        '/resident/bulk-invite',
        '/resident/visitor-history'
      ],
      'visitor-management': [
        '/dashboard/resident',
        '/resident/visitor-history',
      ]
    }
  },
  guard: {
    entry: '/dashboard/guard',
    flows: {
      'visitor-verification': [
        '/dashboard/guard/scan-qr',
        '/dashboard/guard/manual-check',
        '/dashboard/guard/visitor-history'
      ],
      'monitoring': [
        '/dashboard/guard',
        '/dashboard/guard/active-visitors',
        '/dashboard/guard/reports'
      ]
    }
  },
  security: {
    entry: '/dashboard/guard',
    flows: {
      'visitor-verification': [
        '/dashboard/guard/scan-qr',
        '/dashboard/guard/manual-check',
        '/dashboard/guard/visitor-history'
      ],
      'monitoring': [
        '/dashboard/guard',
        '/dashboard/guard/active-visitors',
        '/dashboard/guard/reports'
      ]
    }
  }
};

// Session timeout configuration
export const SESSION_CONFIG = {
  warningTime: 5 * 60 * 1000, // 5 minutes before expiry
  maxIdleTime: 30 * 60 * 1000, // 30 minutes idle timeout
  extendTime: 15 * 60 * 1000,  // 15 minutes extension
};

// Role-based redirect rules
export const ROLE_REDIRECTS = {
  resident: '/dashboard/resident',
  guard: '/dashboard/guard',
  security: '/dashboard/guard',
  admin: '/admin/dashboard',
  default: '/dashboard'
};

// Get appropriate redirect URL based on user role
export function getRoleBasedRedirect(role, fallback = '/dashboard') {
  return ROLE_REDIRECTS[role] || ROLE_REDIRECTS.default || fallback;
}

// Check if user has access to a specific route
export function hasRouteAccess(userRole, routePath, routeRoles = []) {
  if (!routeRoles.length) return true; // Public route
  return routeRoles.includes(userRole);
}

// Navigation flow helper hook
export function useNavigationFlow(userRole) {
  const navigate = useNavigate();
  const location = useLocation();

  const goToNextInFlow = (currentFlow, currentPath) => {
    const flowConfig = NAVIGATION_FLOWS[userRole]?.flows[currentFlow];
    if (!flowConfig) return null;

    const currentIndex = flowConfig.indexOf(currentPath);
    if (currentIndex >= 0 && currentIndex < flowConfig.length - 1) {
      const nextPath = flowConfig[currentIndex + 1];
      navigate(nextPath);
      return nextPath;
    }
    return null;
  };

  const goToPreviousInFlow = (currentFlow, currentPath) => {
    const flowConfig = NAVIGATION_FLOWS[userRole]?.flows[currentFlow];
    if (!flowConfig) return null;

    const currentIndex = flowConfig.indexOf(currentPath);
    if (currentIndex > 0) {
      const previousPath = flowConfig[currentIndex - 1];
      navigate(previousPath);
      return previousPath;
    }
    return null;
  };

  const goToFlowStart = (flowName) => {
    const flowConfig = NAVIGATION_FLOWS[userRole]?.flows[flowName];
    if (flowConfig && flowConfig.length > 0) {
      navigate(flowConfig[0]);
      return flowConfig[0];
    }
    return null;
  };

  const getCurrentFlowStep = (currentPath) => {
    const roleConfig = NAVIGATION_FLOWS[userRole];
    if (!roleConfig) return null;

    for (const [flowName, steps] of Object.entries(roleConfig.flows)) {
      const stepIndex = steps.indexOf(currentPath);
      if (stepIndex >= 0) {
        return {
          flowName,
          stepIndex,
          totalSteps: steps.length,
          currentStep: stepIndex + 1,
          isFirstStep: stepIndex === 0,
          isLastStep: stepIndex === steps.length - 1,
          nextStep: stepIndex < steps.length - 1 ? steps[stepIndex + 1] : null,
          previousStep: stepIndex > 0 ? steps[stepIndex - 1] : null,
        };
      }
    }
    return null;
  };

  return {
    goToNextInFlow,
    goToPreviousInFlow,
    goToFlowStart,
    getCurrentFlowStep,
    navigate
  };
}

// Session timeout management hook
export function useSessionTimeout() {
  const navigate = useNavigate();

  useEffect(() => {
    let warningTimer;
    let logoutTimer;
    let lastActivity = Date.now();

    const resetTimers = () => {
      lastActivity = Date.now();

      if (warningTimer) clearTimeout(warningTimer);
      if (logoutTimer) clearTimeout(logoutTimer);

      // Set warning timer
      warningTimer = setTimeout(() => {
        const shouldExtend = window.confirm(
          'Your session will expire in 5 minutes. Do you want to extend it?'
        );

        if (shouldExtend) {
          resetTimers(); // Reset on extension
        } else {
          // Set final logout timer
          logoutTimer = setTimeout(() => {
            handleSessionExpiry();
          }, SESSION_CONFIG.warningTime);
        }
      }, SESSION_CONFIG.maxIdleTime - SESSION_CONFIG.warningTime);
    };

    const handleSessionExpiry = () => {
      navigate('/login?reason=session_expired');
    };

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 30000) { // Throttle to 30 seconds
        resetTimers();
      }
    };

    // Initialize timers
    resetTimers();

    // Add activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup
    return () => {
      if (warningTimer) clearTimeout(warningTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [navigate]);
}

// Smooth page transitions hook
export function usePageTransitions() {
  const location = useLocation();

  useEffect(() => {
    // Add page transition class
    document.body.classList.add('page-transitioning');

    // Remove after transition
    const timer = setTimeout(() => {
      document.body.classList.remove('page-transitioning');
    }, 300);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}

// Breadcrumb generation
export function generateBreadcrumbs(currentPath, userRole) {
  const pathSegments = currentPath.split('/').filter(Boolean);
  const breadcrumbs = [];

  // Start with role-based home
  const roleEntry = NAVIGATION_FLOWS[userRole]?.entry || '/dashboard';
  breadcrumbs.push({
    label: 'Home',
    path: roleEntry,
    isCurrent: currentPath === roleEntry
  });

  // Build breadcrumb path
  let currentPathBuild = '';
  pathSegments.forEach((segment, index) => {
    currentPathBuild += `/${segment}`;

    if (currentPathBuild !== roleEntry) {
      const label = formatBreadcrumbLabel(segment);
      breadcrumbs.push({
        label,
        path: currentPathBuild,
        isCurrent: index === pathSegments.length - 1
      });
    }
  });

  return breadcrumbs;
}

// Format breadcrumb labels
function formatBreadcrumbLabel(segment) {
  const labelMap = {
    'dashboard': 'Dashboard',
    'resident': 'Resident',
    'guard': 'Guard',
    'admin': 'Admin',

    'generate-pass': 'Generate Pass',
    'visitor-history': 'History',
    'bulk-invite': 'Bulk Invite',
    'scan-qr': 'Scan QR',
    'manual-check': 'Manual Check',
    'settings': 'Settings',
    'reports': 'Reports',
    'users': 'Users',
    'audit-logs': 'Audit Logs',
    'pages': 'Pages'
  };

  return labelMap[segment] || segment.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// Enhanced navigation with flow context
export function enhanceNavigation(Component) {
  return function NavigationEnhancedComponent(props) {
    useSessionTimeout();
    usePageTransitions();

    return <Component {...props} />;
  };
}