// client/src/components/ui/Breadcrumbs.jsx
import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { generateBreadcrumbs } from '../../utils/navigationFlow';
import { componentTokens } from '../../design-system';

const Breadcrumbs = ({ 
  breadcrumbs = null, 
  className = '',
  showHome = true,
  maxItems = 5,
  userRole = null 
}) => {
  const breadcrumbsRef = useRef(null);
  const location = useLocation();
  
  // Generate breadcrumbs if not provided
  const currentBreadcrumbs = breadcrumbs || (userRole ? generateBreadcrumbs(location.pathname, userRole) : []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Home key to go to first breadcrumb
      if (e.key === 'Home' && breadcrumbsRef.current) {
        e.preventDefault();
        const firstLink = breadcrumbsRef.current.querySelector('a');
        if (firstLink) {
          firstLink.focus();
        }
      }
      // End key to go to last breadcrumb
      if (e.key === 'End' && breadcrumbsRef.current) {
        e.preventDefault();
        const links = breadcrumbsRef.current.querySelectorAll('a');
        const lastLink = links[links.length - 1];
        if (lastLink) {
          lastLink.focus();
        }
      }
      // Arrow keys to navigate between breadcrumbs
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const links = Array.from(breadcrumbsRef.current.querySelectorAll('a'));
        const currentIndex = links.indexOf(document.activeElement);
        let nextIndex;
        
        if (e.key === 'ArrowLeft') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : links.length - 1;
        } else {
          nextIndex = currentIndex < links.length - 1 ? currentIndex + 1 : 0;
        }
        
        if (links[nextIndex]) {
          links[nextIndex].focus();
        }
      }
    };

    const breadcrumbs = breadcrumbsRef.current;
    if (breadcrumbs) {
      breadcrumbs.addEventListener('keydown', handleKeyDown);
      return () => breadcrumbs.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentBreadcrumbs]);

  if (!currentBreadcrumbs.length) return null;

  // Limit breadcrumbs if too many
  const displayBreadcrumbs = currentBreadcrumbs.length > maxItems 
    ? [
        currentBreadcrumbs[0], // Always show first (Home)
        { label: '...', path: '', isEllipsis: true },
        ...currentBreadcrumbs.slice(-2) // Show last 2 items
      ]
    : currentBreadcrumbs;

  return (
    <nav 
      ref={breadcrumbsRef}
      className={`flex items-center text-sm text-gray-500 dark:text-slate-400 mb-6 ${className}`}
      aria-label="Breadcrumb navigation"
      role="navigation"
    >
      <ol className="flex items-center space-x-1">
        {displayBreadcrumbs.map((crumb, index) => (
          <li key={`${crumb.path}-${index}`} className="flex items-center">
            {index > 0 && (
              <svg 
                className="w-4 h-4 mx-2 text-gray-400 dark:text-slate-500 flex-shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M9 5l7 7-7 7" 
                />
              </svg>
            )}
            
            {crumb.isEllipsis ? (
              <span className="text-gray-400 dark:text-slate-500 px-2" aria-hidden="true">
                ...
              </span>
            ) : crumb.isCurrent ? (
              <span 
                className="text-gray-900 dark:text-slate-200 font-medium px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800" 
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 px-2 py-1 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                aria-label={`Navigate to ${crumb.label}`}
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