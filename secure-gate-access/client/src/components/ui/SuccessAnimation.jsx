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

import Icon from './Icon.jsx';

const SuccessAnimation = ({
  type = 'checkmark',
  message,
  submessage,
  onComplete,
  duration = 3000,
  autoClose = true,
  className = ''
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
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

  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>
      {/* Animation Container */}
      <div className={`relative mb-4 ${isExiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'} transition-all duration-500`}>
        
        {/* Checkmark Animation */}
        {type === 'checkmark' && (
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="w-full h-full text-green-500" viewBox="0 0 100 100">
              <circle
                className="animate-[dash_1s_ease-in-out_forwards] origin-center rotate-[-90deg]"
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray="283"
                strokeDashoffset="283"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center animate-[scale-up_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)_0.5s_both]">
               <Icon name="check" size={40} className="text-green-600 dark:text-green-400" strokeWidth={4} />
            </div>
          </div>
        )}

        {/* Confetti Animation (CSS-only approximation) */}
        {type === 'confetti' && (
          <div className="relative flex items-center justify-center w-20 h-20">
             <div className="absolute inset-0 flex items-center justify-center animate-bounce">
               <span className="text-4xl text-yellow-500">🎉</span>
             </div>
          </div>
        )}
      </div>

      {/* Message */}
      <div className={`transition-all duration-500 delay-300 ${isExiting ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {message}
        </h3>
        {submessage && (
          <p className="text-gray-500 dark:text-gray-400">
            {submessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default SuccessAnimation;

// Pre-configured variations
export const VisitorCreatedSuccess = (props) => (
  <SuccessAnimation
    type="checkmark"
    message="Visitor Added"
    submessage="Your guest has been successfully invited."
    {...props}
  />
);

export const PassGeneratedSuccess = (props) => (
  <SuccessAnimation
    type="qr"
    message="Pass Generated"
    {...props}
  />
);

export const BulkInviteSuccess = (props) => (
  <SuccessAnimation
    type="checkmark"
    message="Invites Sent"
    submessage={`${props.count} visitors have been invited.`}
    {...props}
  />
);

export const DraftSavedSuccess = (props) => (
  <SuccessAnimation
    type="save"
    message="Draft Saved"
    {...props}
  />
);
