import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const EstateRequired = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const errorCode = params.get('code');
  const title = errorCode === 'ESTATE_INVALID' ? 'Estate access denied' : 'Estate assignment required';
  const description = errorCode === 'ESTATE_INVALID'
    ? 'Your account is linked to an invalid estate. Please contact support or select the correct estate.'
    : 'Your account is authenticated, but it is not linked to an estate yet. Please contact your estate administrator or support to complete your setup.';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">🏡</div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          {title}
        </h1>
        <p className="text-gray-600 dark:text-gray-200 mb-6">
          {description}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/estate-selection"
            className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            Select estate
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Back to login
          </Link>
          <a
            href="mailto:support@securegate.com"
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
};

export default EstateRequired;
