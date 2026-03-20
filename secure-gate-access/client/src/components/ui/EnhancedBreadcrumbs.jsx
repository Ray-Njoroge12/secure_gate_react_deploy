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
import Icon from './Icon.jsx';
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

  // Render collapsed items logic
  const renderCollapsedItems = () => {
    const items = displayBreadcrumbs;

    // If not collapsed, render all items
    if (!isCollapsed) return items;

    // If collapsed, show first item, ellipsis, and last item
    const collapsedItems = items.slice(1, -1);
    if (collapsedItems.length === 0) return items;

    return [
      items[0],
      <li key="ellipsis" className="flex items-center">
        <Icon 
          name="chevron-right" 
          className={`text-gray-400 mx-1 ${sizeStyles.icon}`} 
          aria-hidden="true" 
        />
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400"
          aria-label="Show intermediate pages"
        >
          <Icon name="more-horizontal" size={16} aria-hidden="true" />
        </button>
      </li>,
      ...items.slice(-2)
    ];
  };

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={`flex ${className} ${sizeStyles.container}`}
      ref={breadcrumbsRef}
    >
      <ol className="flex items-center flex-wrap">
        {/* Home Link */}
        {showHome && (
          <li className="flex items-center">
            <Link
              to={userRole ? `/dashboard/${userRole.toLowerCase()}` : '/dashboard'}
              className={`
                flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors
                ${sizeStyles.item}
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 rounded
              `}
              aria-label="Home"
            >
              <Icon 
                name="home" 
                className={`${sizeStyles.homeIcon}`} 
                aria-hidden="true" 
              />
            </Link>
          </li>
        )}

        {/* Separator for Home */}
        {showHome && currentBreadcrumbs.length > 0 && (
          <li aria-hidden="true">
            <Icon 
              name="chevron-right" 
              className={`text-gray-400 mx-1 ${sizeStyles.icon}`} 
            />
          </li>
        )}

        {/* Breadcrumb Items */}
        {renderCollapsedItems().map((item, index, arr) => {
          // If it's a React element (ellipsis), return it directly
          if (React.isValidElement(item)) return item;

          const isLast = index === arr.length - 1;
          const routeTo = item.path;

          return (
            <li key={item.path} className="flex items-center">
              {index > 0 && !showHome && (
                <Icon 
                  name="chevron-right" 
                  className={`text-gray-400 mx-1 ${sizeStyles.icon}`} 
                  aria-hidden="true" 
                />
              )}
              
              {index === 0 && !showHome ? null : (
                 // Use separator if not first item (handled above)
                 // But wait, the loop logic above `if (index > 0 && !showHome)` adds separator for items after first if home is hidden
                 // If home is SHOWN, we need separator for ALL items.
                 // Correct logic:
                 // Home -> (sep) -> Item 1 -> (sep) -> Item 2
                 // My code above added sep for Home -> Item 1. 
                 // Code inside map needs to add sep BEFORE item if it's not the first item overall (considering Home)
                 // But `renderCollapsedItems` returns the array of items to render.
                 // Let's rely on standard logic: SEPARATOR before item unless it's the very first element in the nav.
                 // If Home is shown, Home is first. All items get separator before them.
                 // If Home is hidden, first item gets no separator.
                 (showHome || index > 0) && (
                    <Icon 
                      name="chevron-right" 
                      className={`text-gray-400 mx-1 ${sizeStyles.icon}`} 
                      aria-hidden="true" 
                    />
                 )  
               )}

              {isLast ? (
                <span 
                  className={`${sizeStyles.item} text-slate-200 font-medium rounded-md bg-slate-800`}
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={routeTo}
                  onClick={() => handleBreadcrumbClick(item, index)}
                  className={`${sizeStyles.item} text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900`}
                  aria-label={`Navigate to ${item.label}`}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {/* Collapse/Expand button for desktop */}
      {collapsible && currentBreadcrumbs.length > maxItems && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`ml-4 ${sizeStyles.item} text-slate-500 dark:text-slate-300 hover:text-slate-300 hover:bg-slate-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900`}
          aria-label={isCollapsed ? "Show all breadcrumbs" : "Hide some breadcrumbs"}
          aria-expanded={!isCollapsed}
        >
          <Icon name="more-horizontal" className={sizeStyles.icon} />
        </button>
      )}
    </nav>
  );
};

export default EnhancedBreadcrumbs;




