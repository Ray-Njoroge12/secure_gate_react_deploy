/**
 * @file OnboardingTour.jsx
 * @description Interactive onboarding tour for new users — powered by driver.js.
 * Phase 3: UI/UX Improvement - P2 Priority
 *
 * Features:
 * - Step-by-step feature introduction via driver.js
 * - Role-specific tours (resident, guard, admin, visitor)
 * - Progress tracking with driver.js built-in progress bar
 * - Skip and restart options
 * - LocalStorage persistence (reuses existing keys)
 * - ?tour=true URL param support for deep-link tour launch
 * - Keyboard navigation (arrow keys, Esc — handled by driver.js)
 *
 * Replaces the previous custom overlay implementation with driver.js v1.4.0.
 * The useOnboardingTour() hook API is preserved for backwards compatibility.
 */

import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { startTour, isTourCompleted, shouldOfferTour, resetTour, destroyActiveTour } from '../../services/tourService';

const OnboardingTour = ({
  role = 'resident',
  onComplete,
  onSkip,
  className = '',
}) => {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);

  // Check if tour should be offered on mount
  useEffect(() => {
    if (user && shouldOfferTour(role)) {
      // Delay showing the banner to let the page render first
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [role, user]);

  const handleStartTour = useCallback(() => {
    setShowBanner(false);
    startTour(role, {
      onComplete: () => {
        setShowBanner(false);
        if (onComplete) onComplete();
      },
      onSkip: () => {
        setShowBanner(false);
        if (onSkip) onSkip();
      },
    });
  }, [role, onComplete, onSkip]);

  // Support ?tour=true URL parameter to force-start a tour
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === 'true') {
      const timer = setTimeout(() => {
        handleStartTour();
        // Clean the URL param without page reload
        const url = new URL(window.location);
        url.searchParams.delete('tour');
        window.history.replaceState({}, '', url.toString());
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [handleStartTour]);

  const handleDismissBanner = useCallback(() => {
    setShowBanner(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyActiveTour();
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 max-w-sm animate-fade-in ${className}`}
      role="complementary"
      aria-label="Tour invitation"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
          <span className="text-lg" role="img" aria-label="Tour">🗺️</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white mb-1">
            Welcome to SecureGate!
          </h4>
          <p className="text-xs text-slate-400 mb-3">
            Take a quick guided tour to learn the key features for your role.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleStartTour}
              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Start Tour
            </button>
            <button
              onClick={handleDismissBanner}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismissBanner}
          className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Dismiss tour invitation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/**
 * Hook to programmatically control the onboarding tour.
 * API preserved for backwards compatibility with existing consumers (Settings pages).
 *
 * @param {string} role - User role
 * @returns {{ startTour: Function, resetTour: Function, restartTour: Function, isTourCompleted: boolean }}
 */
export const useOnboardingTour = (role = 'resident') => {
  const handleStartTour = useCallback(() => {
    resetTour(role);
    startTour(role);
  }, [role]);

  const handleResetTour = useCallback(() => {
    resetTour(role);
  }, [role]);

  const handleRestartTour = useCallback(() => {
    resetTour(role);
    const raf = window.requestAnimationFrame || ((callback) => setTimeout(callback, 16));
    // Use two frames so route/layout updates have finished before driver queries DOM targets.
    raf(() => raf(() => startTour(role)));
  }, [role]);

  return {
    startTour: handleStartTour,
    resetTour: handleResetTour,
    restartTour: handleRestartTour,
    isTourCompleted: isTourCompleted(role),
  };
};

export default OnboardingTour;
