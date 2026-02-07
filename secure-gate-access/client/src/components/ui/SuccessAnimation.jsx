/**
 * SuccessAnimation Component
 * 
 * Displays success animations and celebrations for completed actions.
 * Supports multiple animation types: checkmark, confetti, pulse.
 * 
 * @component
 * @example
 * <SuccessAnimation
 *   type="checkmark"
 *   message="Visitor created successfully!"
 *   onComplete={() => navigate('/dashboard')}
 * />
 */

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

const SuccessAnimation = ({
  type = 'checkmark',
  message,
  submessage,
  onComplete,
  duration = 3000,
  autoClose = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setTimeout(() => setIsVisible(true), 10);

    if (autoClose) {
      // Start exit animation
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, duration - 500);

      // Complete animation
      const completeTimer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, duration);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [autoClose, duration, onComplete]);

  const renderCheckmark = () => (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      {/* Success Icon Circle */}
      <div 
        className={`
          relative w-24 h-24 rounded-full 
          bg-gradient-to-br from-green-500 to-green-600
          shadow-lg shadow-green-500/50
          flex items-center justify-center
          transition-all duration-500 ease-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
          ${isExiting ? 'scale-95 opacity-90' : ''}
        `}
      >
        {/* Animated Check Icon */}
        <Check 
          className={`
            w-12 h-12 text-white stroke-[3]
            transition-all duration-300 delay-300
            ${isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
          `}
        />
        
        {/* Pulse Ring */}
        <div 
          className={`
            absolute inset-0 rounded-full 
            border-4 border-green-400 
            ${isVisible ? 'animate-ping' : ''}
          `}
          style={{ animationDuration: '1s', animationIterationCount: 1 }}
        />
      </div>

      {/* Success Message */}
      {message && (
        <div 
          className={`
            mt-6 text-center
            transition-all duration-500 delay-500
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
            ${isExiting ? 'translate-y--2 opacity-90' : ''}
          `}
        >
          <h3 className="text-2xl font-semibold text-slate-100 mb-2">
            {message}
          </h3>
          {submessage && (
            <p className="text-lg text-slate-300">
              {submessage}
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderPulse = () => (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      {/* Pulsing Success Icon */}
      <div className="relative">
        <div 
          className={`
            w-20 h-20 rounded-full 
            bg-green-600
            flex items-center justify-center
            transition-all duration-300
            ${isVisible ? 'scale-100 opacity-100 animate-pulse' : 'scale-0 opacity-0'}
          `}
        >
          <Check className="w-10 h-10 text-white stroke-[3]" />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`
          mt-4 text-center
          transition-all duration-300 delay-200
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}>
          <p className="text-lg font-semibold text-slate-100">
            {message}
          </p>
          {submessage && (
            <p className="text-sm text-slate-300 mt-1">
              {submessage}
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderConfetti = () => (
    <div className={`relative flex flex-col items-center justify-center p-8 ${className}`}>
      {/* Confetti Particles */}
      {isVisible && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                backgroundColor: [
                  'var(--color-success, #10B981)', 
                  'var(--color-info, #3B82F6)', 
                  'var(--color-warning, #F59E0B)', 
                  'var(--color-error, #EF4444)', 
                  'var(--color-brand-accent, #8B5CF6)'
                ][i % 5],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Success Icon */}
      <div 
        className={`
          relative z-10 w-24 h-24 rounded-full 
          bg-gradient-to-br from-green-500 to-green-600
          shadow-2xl
          flex items-center justify-center
          transition-all duration-700 ease-out
          ${isVisible ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-180 opacity-0'}
        `}
      >
        <Check className="w-12 h-12 text-white stroke-[3]" />
      </div>

      {/* Message */}
      {message && (
        <div 
          className={`
            relative z-10 mt-6 text-center
            transition-all duration-500 delay-300
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}
        >
          <h3 className="text-2xl font-bold text-slate-100 mb-2">
            {message}
          </h3>
          {submessage && (
            <p className="text-lg text-slate-300">
              {submessage}
            </p>
          )}
        </div>
      )}

    </div>
  );

  // Render appropriate animation type
  switch (type) {
    case 'checkmark':
      return renderCheckmark();
    case 'pulse':
      return renderPulse();
    case 'confetti':
      return renderConfetti();
    default:
      return renderCheckmark();
  }
};

// Preset Success Messages for common actions
export const VisitorCreatedSuccess = ({ onComplete }) => (
  <SuccessAnimation
    type="confetti"
    message="Visitor Created!"
    submessage="QR code pass has been sent via SMS and email"
    onComplete={onComplete}
    duration={3500}
  />
);

export const PassGeneratedSuccess = ({ onComplete }) => (
  <SuccessAnimation
    type="checkmark"
    message="Pass Generated Successfully"
    submessage="Your visitor can now access the premises"
    onComplete={onComplete}
  />
);

export const BulkInviteSuccess = ({ count, onComplete }) => (
  <SuccessAnimation
    type="confetti"
    message={`${count} Invitations Sent!`}
    submessage="All guests have been notified"
    onComplete={onComplete}
    duration={4000}
  />
);

export const DraftSavedSuccess = () => (
  <SuccessAnimation
    type="pulse"
    message="Draft Saved"
    submessage="You can continue later"
    autoClose={true}
    duration={2000}
  />
);

export default SuccessAnimation;
