/**
 * Password Strength Indicator Component
 * Shows real-time password strength feedback
 */

import React from 'react';

const PasswordStrengthIndicator = ({ password, className = '' }) => {
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: 'gray' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };

    // Calculate score
    Object.values(checks).forEach(check => {
      if (check) score++;
    });

    // Determine strength level
    let strength, label, color;
    if (score === 0) {
      strength = 0;
      label = '';
      color = 'gray';
    } else if (score <= 2) {
      strength = 1;
      label = 'Weak';
      color = 'red';
    } else if (score <= 3) {
      strength = 2;
      label = 'Fair';
      color = 'orange';
    } else if (score <= 4) {
      strength = 3;
      label = 'Good';
      color = 'yellow';
    } else {
      strength = 4;
      label = 'Strong';
      color = 'green';
    }

    return { strength, label, color, checks };
  };

  const { strength, label, color, checks } = getPasswordStrength(password);

  if (!password) return null;

  const colorClasses = {
    gray: 'bg-gray-300',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500'
  };

  const textColorClasses = {
    gray: 'text-gray-600',
    red: 'text-red-600',
    orange: 'text-orange-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600'
  };

  return (
    <div className={`mt-2 ${className}`}>
      {/* Strength bar */}
      <div className="flex space-x-1 mb-2">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-2 flex-1 rounded-full ${
              level <= strength ? colorClasses[color] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Strength label */}
      {label && (
        <div className={`text-sm font-medium ${textColorClasses[color]} mb-2`}>
          Password strength: {label}
        </div>
      )}

      {/* Requirements checklist */}
      <div className="text-xs space-y-1">
        <div className={`flex items-center ${checks?.length ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-2">{checks?.length ? '✓' : '○'}</span>
          At least 8 characters
        </div>
        <div className={`flex items-center ${checks?.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-2">{checks?.lowercase ? '✓' : '○'}</span>
          One lowercase letter
        </div>
        <div className={`flex items-center ${checks?.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-2">{checks?.uppercase ? '✓' : '○'}</span>
          One uppercase letter
        </div>
        <div className={`flex items-center ${checks?.number ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-2">{checks?.number ? '✓' : '○'}</span>
          One number
        </div>
        <div className={`flex items-center ${checks?.special ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="mr-2">{checks?.special ? '✓' : '○'}</span>
          One special character (@$!%*?&)
        </div>
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
