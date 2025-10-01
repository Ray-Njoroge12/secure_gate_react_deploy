// AuthLayout - Clean, professional authentication layout from original design
import React from 'react';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className="bg-white border border-gray-200 rounded-smooth shadow-card p-6">
          {children}
        </div>
        <p className="text-xs text-gray-500 text-center mt-4">
          Secure Gate Access System
        </p>
      </div>
    </div>
  );
}