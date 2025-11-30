/**
 * Enhanced Breadcrumbs Component
 * 
 * A comprehensive breadcrumb navigation component with advanced features:
 * - Smart breadcrumb generation based on current route and user role
 * - Keyboard navigation support
 * - Mobile-responsive design
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Custom breadcrumb support
 * - Collapsible breadcrumbs for long paths
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import { generateBreadcrumbs } from '../../utils/navigationFlow';
import { componentTokens } from '../../design-system';

const EnhancedBreadcrumbs = ({ 
  breadcrumbs = null, 
  className = '',
  showHome = true,
  maxItems = 5,
  userRole = null,
  onBreadcrumbClick = null,
  showProgress = false,
  collapsible = true,
  size = 'md'
}) => {
  const breadcrumbsRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Generate breadcrumbs if not provided
  const currentBreadcrumbs = useMemo(() => {
    if (breadcrumbs) return breadcrumbs;
    if (!userRole) return [];
    return generateBreadcrumbs(location.pathname, userRole);
  }, [breadcrumbs, userRole, location.pathname]);

  // Get size-specific styles
  const sizeStyles = useMemo(() => {
    const sizes = {
      sm: {
        container: 'text-xs',
        item: 'px-2 py-1',
        icon: 'w-3 h-3',
        homeIcon: 'w-3 h-3'
      },
      md: {
        container: 'text-sm',
        item: 'px-2 py-1.5',
        icon: 'w-4 h-4',
        homeIcon: 'w-4 h-4'
      },
      lg: {
        container: 'text-base',
        item: 'px-3 py-2',
        icon: 'w-5 h-5',
        homeIcon: 'w-5 h-5'
      }
    };
    return sizes[size] || sizes.md;
  }, [size]);

  // Handle breadcrumb click
  const handleBreadcrumbClick = (crumb, index) => {
    if (crumb.isCurrent || crumb.isEllipsis) return;
    
    if (onBreadcrumbClick) {
      onBreadcrumbClick(crumb, index);
    } else {
      navigate(crumb.path);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!breadcrumbsRef.current) return;

      const links = Array.from(breadcrumbsRef.current.querySelectorAll('a, button'));
      const currentIndex = links.indexOf(document.activeElement);

      switch (e.key) {
        case 'Home':
          e.preventDefault();
          if (links[0]) {
            links[0].focus();
            setFocusedIndex(0);
          }
          break;
        case 'End':
          e.preventDefault();
          if (links[links.length - 1]) {
            links[links.length - 1].focus();
            setFocusedIndex(links.length - 1);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : links.length - 1;
          if (links[prevIndex]) {
            links[prevIndex].focus();
            setFocusedIndex(prevIndex);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          const nextIndex = currentIndex < links.length - 1 ? currentIndex + 1 : 0;
          if (links[nextIndex]) {
            links[nextIndex].focus();
            setFocusedIndex(nextIndex);
          }
          break;
        case 'Enter':
        case ' ':
          if (document.activeElement.tagName === 'BUTTON') {
            e.preventDefault();
            document.activeElement.click();
          }
          break;
        case 'Escape':
          e.preventDefault();
          document.activeElement.blur();
          setFocusedIndex(-1);
          break;
      }
    };

    const breadcrumbs = breadcrumbsRef.current;
    if (breadcrumbs) {
      breadcrumbs.addEventListener('keydown', handleKeyDown);
      return () => breadcrumbs.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentBreadcrumbs]);

  // Auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && currentBreadcrumbs.length > 3) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentBreadcrumbs.length]);

  // Determine which breadcrumbs to display (must be before early returns)
  const displayBreadcrumbs = useMemo(() => {
    if (!currentBreadcrumbs.length) return [];
    if (!collapsible || currentBreadcrumbs.length <= maxItems) {
      return currentBreadcrumbs;
    }

    if (isCollapsed) {
      return [
        currentBreadcrumbs[0], // Always show first (Home)
        { label: '...', path: '', isEllipsis: true, id: 'ellipsis' },
        ...currentBreadcrumbs.slice(-2) // Show last 2 items
      ];
    }

    return currentBreadcrumbs;
  }, [currentBreadcrumbs, maxItems, collapsible, isCollapsed]);

  // Calculate progress if enabled (must be before early returns)
  const progress = useMemo(() => {
    if (!showProgress || !currentBreadcrumbs.length) return null;
    const currentIndex = currentBreadcrumbs.findIndex(crumb => crumb.isCurrent);
    return currentIndex >= 0 ? ((currentIndex + 1) / currentBreadcrumbs.length) * 100 : 0;
  }, [currentBreadcrumbs, showProgress]);

  // Early return after all hooks
  if (!currentBreadcrumbs.length) return null;

  return (
    <div className={`breadcrumbs-container ${className}`}>
      {/* Progress bar */}
      {showProgress && progress !== null && (
        <div className="w-full bg-slate-700 rounded-full h-1 mb-4">
          <div 
            className="bg-brand-500 h-1 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`Navigation progress: ${Math.round(progress)}%`}
          />
        </div>
      )}

      {/* Breadcrumbs */}
      <nav 
        ref={breadcrumbsRef}
        className={`flex items-center ${sizeStyles.container} text-slate-400 mb-6`}
        aria-label="Breadcrumb navigation"
        role="navigation"
      >
        <ol className="flex items-center space-x-1">
          {displayBreadcrumbs.map((crumb, index) => (
            <li key={`${crumb.path}-${index}`} className="flex items-center">
              {/* Separator */}
              {index > 0 && (
                <ChevronRight 
                  className={`${sizeStyles.icon} mx-2 text-slate-500 flex-shrink-0`}
                  aria-hidden="true"
                />
              )}
              
              {/* Breadcrumb item */}
              {crumb.isEllipsis ? (
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className={`${sizeStyles.item} text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900`}
                  aria-label={isCollapsed ? "Expand breadcrumbs" : "Collapse breadcrumbs"}
                  aria-expanded={!isCollapsed}
                >
                  <MoreHorizontal className={sizeStyles.icon} />
                </button>
              ) : crumb.isCurrent ? (
                <span 
                  className={`${sizeStyles.item} text-slate-200 font-medium rounded-md bg-slate-800`}
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  onClick={() => handleBreadcrumbClick(crumb, index)}
                  className={`${sizeStyles.item} text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900`}
                  aria-label={`Navigate to ${crumb.label}`}
                >
                  {index === 0 && showHome ? (
                    <div className="flex items-center">
                      <Home className={`${sizeStyles.homeIcon} mr-1`} aria-hidden="true" />
                      <span>{crumb.label}</span>
                    </div>
                  ) : (
                    crumb.label
                  )}
                </Link>
              )}
            </li>
          ))}
        </ol>

        {/* Collapse/Expand button for desktop */}
        {collapsible && currentBreadcrumbs.length > maxItems && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`ml-4 ${sizeStyles.item} text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900`}
            aria-label={isCollapsed ? "Show all breadcrumbs" : "Hide some breadcrumbs"}
            aria-expanded={!isCollapsed}
          >
            <MoreHorizontal className={sizeStyles.icon} />
          </button>
        )}
      </nav>

      {/* Screen reader announcement for navigation changes */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        id="breadcrumb-announcement"
      />
    </div>
  );
};

export default EnhancedBreadcrumbs;




