/**
 * Progressive Loading Component
 * 
 * Implements progressive loading patterns for better user experience:
 * - Critical content loads first
 * - Non-critical content loads progressively
 * - Skeleton screens for different loading phases
 * - Performance monitoring
 * - User feedback optimization
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import logger from 'utils/logger';
import { useLoadingStates, LOADING_TYPES } from '../../hooks/useLoadingStates';
import AdvancedSkeleton from './AdvancedSkeleton';

// Loading phases for progressive loading
export const LOADING_PHASES = {
  INITIAL: 'initial',
  CRITICAL: 'critical',
  SECONDARY: 'secondary',
  TERTIARY: 'tertiary',
  COMPLETE: 'complete',
};

// Loading phase configuration
export const PHASE_CONFIG = {
  [LOADING_PHASES.INITIAL]: {
    priority: 1,
    timeout: 0,
    skeleton: 'minimal',
    message: 'Initializing...',
  },
  [LOADING_PHASES.CRITICAL]: {
    priority: 2,
    timeout: 100,
    skeleton: 'default',
    message: 'Loading essential content...',
  },
  [LOADING_PHASES.SECONDARY]: {
    priority: 3,
    timeout: 300,
    skeleton: 'default',
    message: 'Loading additional content...',
  },
  [LOADING_PHASES.TERTIARY]: {
    priority: 4,
    timeout: 500,
    skeleton: 'enhanced',
    message: 'Loading enhanced features...',
  },
  [LOADING_PHASES.COMPLETE]: {
    priority: 5,
    timeout: 0,
    skeleton: null,
    message: 'Complete',
  },
};

// Progressive loading hook
export const useProgressiveLoading = (options = {}) => {
  const {
    phases = Object.values(LOADING_PHASES),
    onPhaseComplete = null,
    onAllPhasesComplete = null,
    autoAdvance = true,
    phaseTimeout = 1000,
  } = options;

  const [currentPhase, setCurrentPhase] = useState(LOADING_PHASES.INITIAL);
  const [completedPhases, setCompletedPhases] = useState(new Set());
  const [phaseData, setPhaseData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const phaseTimeouts = useRef({});
  const phaseCallbacks = useRef({});

  // Advance to next phase
  const advancePhase = useCallback((phase, data = {}) => {
    if (!phases.includes(phase)) return;

    setCurrentPhase(phase);
    setCompletedPhases(prev => new Set([...prev, phase]));
    setPhaseData(prev => ({ ...prev, [phase]: data }));

    if (onPhaseComplete) {
      onPhaseComplete(phase, data);
    }

    // Check if all phases are complete
    if (phase === LOADING_PHASES.COMPLETE || completedPhases.size === phases.length - 1) {
      setIsLoading(false);
      if (onAllPhasesComplete) {
        onAllPhasesComplete(phaseData);
      }
    }
  }, [phases, completedPhases, onPhaseComplete, onAllPhasesComplete]);

  // Complete a specific phase
  const completePhase = useCallback((phase, data = {}) => {
    advancePhase(phase, data);
  }, [advancePhase]);

  // Set phase error
  const setPhaseError = useCallback((phase, error) => {
    setError({ phase, error });
    // Continue to next phase even if current phase failed
    const currentIndex = phases.indexOf(phase);
    if (currentIndex < phases.length - 1) {
      advancePhase(phases[currentIndex + 1]);
    }
  }, [phases, advancePhase]);

  // Auto-advance phases
  useEffect(() => {
    if (autoAdvance && currentPhase !== LOADING_PHASES.COMPLETE) {
      const timeout = setTimeout(() => {
        const currentIndex = phases.indexOf(currentPhase);
        if (currentIndex < phases.length - 1) {
          advancePhase(phases[currentIndex + 1]);
        }
      }, phaseTimeout);

      return () => clearTimeout(timeout);
    }
  }, [currentPhase, phases, autoAdvance, phaseTimeout, advancePhase]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(phaseTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  return {
    currentPhase,
    completedPhases,
    phaseData,
    isLoading,
    error,
    completePhase,
    setPhaseError,
    advancePhase,
  };
};

// Progressive loading component
const ProgressiveLoading = ({
  children,
  phases = Object.values(LOADING_PHASES),
  onPhaseComplete = null,
  onAllPhasesComplete = null,
  autoAdvance = true,
  phaseTimeout = 1000,
  className = '',
  ...props
}) => {
  const {
    currentPhase,
    completedPhases,
    phaseData,
    isLoading,
    error,
    completePhase,
    setPhaseError,
  } = useProgressiveLoading({
    phases,
    onPhaseComplete,
    onAllPhasesComplete,
    autoAdvance,
    phaseTimeout,
  });

  // Render skeleton based on current phase
  const renderSkeleton = () => {
    const config = PHASE_CONFIG[currentPhase];
    if (!config || !config.skeleton) return null;

    switch (config.skeleton) {
      case 'minimal':
        return <AdvancedSkeleton.Base height="2rem" width="100%" />;
      case 'default':
        return <AdvancedSkeleton.Card lines={3} />;
      case 'enhanced':
        return <AdvancedSkeleton.Dashboard />;
      default:
        return <AdvancedSkeleton.Base height="4rem" width="100%" />;
    }
  };

  // Render phase indicator
  const renderPhaseIndicator = () => {
    if (currentPhase === LOADING_PHASES.COMPLETE) return null;

    const config = PHASE_CONFIG[currentPhase];
    const progress = (completedPhases.size / phases.length) * 100;

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-slate-300">{config.message}</span>
          <span className="text-sm text-gray-500 dark:text-slate-400">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
          <div 
            className="bg-brand-500 rounded-full h-2 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`} {...props}>
        {renderPhaseIndicator()}
        {renderSkeleton()}
        {error && (
          <div className="text-error-500 text-sm">
            Error in {error.phase}: {error.error.message}
          </div>
        )}
      </div>
    );
  }

  return <div className={className} {...props}>{children}</div>;
};

// Critical content loader
const CriticalContentLoader = ({
  children,
  onLoad = null,
  fallback = null,
  className = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCriticalContent = async () => {
      try {
        if (onLoad) {
          await onLoad();
        }
        setIsLoaded(true);
      } catch (err) {
        setError(err);
        setIsLoaded(true); // Still show content even if there's an error
      }
    };

    loadCriticalContent();
  }, [onLoad]);

  if (!isLoaded) {
    return fallback || <AdvancedSkeleton.Base height="4rem" width="100%" />;
  }

  if (error) {
    logger.warn('Critical content load error:', error);
  }

  return <div className={className} {...props}>{children}</div>;
};

// Secondary content loader
const SecondaryContentLoader = ({
  children,
  onLoad = null,
  delay = 300,
  fallback = null,
  className = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSecondaryContent = async () => {
      try {
        // Add delay to prevent overwhelming the main thread
        await new Promise(resolve => setTimeout(resolve, delay));
        
        if (onLoad) {
          await onLoad();
        }
        setIsLoaded(true);
      } catch (err) {
        setError(err);
        setIsLoaded(true);
      }
    };

    loadSecondaryContent();
  }, [onLoad, delay]);

  if (!isLoaded) {
    return fallback || <AdvancedSkeleton.Card lines={2} variant="compact" />;
  }

  if (error) {
    logger.warn('Secondary content load error:', error);
  }

  return <div className={className} {...props}>{children}</div>;
};

// Lazy content loader with intersection observer
const LazyContentLoader = ({
  children,
  onLoad = null,
  threshold = 0.1,
  rootMargin = '50px',
  fallback = null,
  className = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState(null);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (isVisible && !isLoaded) {
      const loadContent = async () => {
        try {
          if (onLoad) {
            await onLoad();
          }
          setIsLoaded(true);
        } catch (err) {
          setError(err);
          setIsLoaded(true);
        }
      };

      loadContent();
    }
  }, [isVisible, isLoaded, onLoad]);

  if (!isLoaded) {
    return (
      <div ref={elementRef} className={className} {...props}>
        {fallback || <AdvancedSkeleton.Base height="4rem" width="100%" />}
      </div>
    );
  }

  if (error) {
    logger.warn('Lazy content load error:', error);
  }

  return <div className={className} {...props}>{children}</div>;
};

// Performance monitoring hook
export const useLoadingPerformance = () => {
  const [metrics, setMetrics] = useState({
    startTime: null,
    endTime: null,
    duration: 0,
    phases: {},
  });

  const startTime = useRef(null);
  const phaseTimes = useRef({});

  const startLoading = useCallback(() => {
    startTime.current = Date.now();
    setMetrics(prev => ({
      ...prev,
      startTime: startTime.current,
    }));
  }, []);

  const startPhase = useCallback((phase) => {
    phaseTimes.current[phase] = Date.now();
  }, []);

  const endPhase = useCallback((phase) => {
    const endTime = Date.now();
    const startTime = phaseTimes.current[phase];
    const duration = endTime - startTime;

    setMetrics(prev => ({
      ...prev,
      phases: {
        ...prev.phases,
        [phase]: {
          startTime,
          endTime,
          duration,
        },
      },
    }));
  }, []);

  const endLoading = useCallback(() => {
    const endTime = Date.now();
    const duration = startTime.current ? endTime - startTime.current : 0;

    setMetrics(prev => ({
      ...prev,
      endTime,
      duration,
    }));
  }, []);

  return {
    metrics,
    startLoading,
    startPhase,
    endPhase,
    endLoading,
  };
};

// Export components
ProgressiveLoading.Critical = CriticalContentLoader;
ProgressiveLoading.Secondary = SecondaryContentLoader;
ProgressiveLoading.Lazy = LazyContentLoader;

export default ProgressiveLoading;




