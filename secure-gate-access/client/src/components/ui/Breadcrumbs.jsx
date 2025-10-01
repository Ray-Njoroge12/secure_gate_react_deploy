// client/src/components/ui/Breadcrumbs.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Breadcrumbs = ({ breadcrumbs = [], className = '' }) => {
  if (!breadcrumbs.length) return null;

  return (
    <nav 
      className={`flex text-sm text-gray-600 mb-4 ${className}`}
      aria-label="Breadcrumbs"
    >
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center">
            {index > 0 && (
              <svg 
                className="w-4 h-4 mx-2 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M9 5l7 7-7 7" 
                />
              </svg>
            )}
            
            {crumb.isCurrent ? (
              <span className="text-gray-900 font-medium" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;