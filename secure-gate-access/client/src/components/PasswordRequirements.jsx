// Password Requirements Component
import React from 'react';

const PasswordRequirements = ({ password }) => {
    const requirements = [
        {
            label: 'At least 8 characters',
            test: (pwd) => pwd.length >= 8
        },
        {
            label: 'One uppercase letter (A-Z)',
            test: (pwd) => /[A-Z]/.test(pwd)
        },
        {
            label: 'One lowercase letter (a-z)',
            test: (pwd) => /[a-z]/.test(pwd)
        },
        {
            label: 'One number (0-9)',
            test: (pwd) => /[0-9]/.test(pwd)
        },
        {
            label: 'One special character (!@#$%^&*)',
            test: (pwd) => /[^A-Za-z0-9]/.test(pwd)
        }
    ];

    const allMet = requirements.every(req => req.test(password));

    return (
        <div className={`mt-3 p-3 rounded-md ${password ? 'bg-gray-50 dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-800 opacity-70'}`}>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password Requirements:
            </p>
            <ul className="space-y-1">
                {requirements.map((req, idx) => {
                    const isMet = req.test(password);
                    return (
                        <li
                            key={idx}
                            className={`text-xs flex items-center transition-colors ${isMet
                                    ? 'text-green-600 dark:text-green-400'
                                    : password
                                        ? 'text-gray-500 dark:text-gray-400'
                                        : 'text-gray-400 dark:text-gray-500'
                                }`}
                        >
                            <span className="mr-2 font-bold">{isMet ? '✓' : '○'}</span>
                            {req.label}
                        </li>
                    );
                })}
            </ul>
            {password && allMet && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    All requirements met!
                </p>
            )}
        </div>
    );
};

export default PasswordRequirements;
