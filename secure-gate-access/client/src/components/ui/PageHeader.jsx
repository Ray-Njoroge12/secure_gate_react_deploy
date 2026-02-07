// client/src/components/ui/PageHeader.jsx
// Consistent page header component with back navigation
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, ChevronRight } from 'lucide-react';

/**
 * PageHeader - Consistent page header across all views
 * 
 * @param {string} title - Page title (required)
 * @param {string} subtitle - Optional subtitle/description
 * @param {boolean} showBack - Show back button (default: true)
 * @param {string} backTo - Override back destination (optional)
 * @param {function} onBack - Custom back handler (optional)
 * @param {ReactNode} actions - Right side action buttons
 * @param {Array} breadcrumbs - [{label, path}] for breadcrumb trail
 * @param {string} variant - 'default' | 'transparent' | 'gradient'
 * @param {ReactNode} icon - Optional icon before title
 * @param {boolean} sticky - Make header sticky (default: true)
 */
const PageHeader = ({
  title,
  subtitle,
  showBack = true,
  backTo,
  onBack,
  actions,
  breadcrumbs,
  variant = 'default',
  icon,
  sticky = true,
  className = '',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine the back destination based on current path
  const getDefaultBackPath = () => {
    const path = location.pathname;
    
    // Role-based dashboard mappings
    if (path.startsWith('/resident/')) return '/dashboard/resident';
    if (path.startsWith('/dashboard/guard/')) return '/dashboard/guard';
    if (path.startsWith('/dashboard/admin/')) return '/dashboard/admin';
    
    // Default: go back in history
    return null;
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backTo) {
      navigate(backTo);
    } else {
      const defaultPath = getDefaultBackPath();
      if (defaultPath) {
        navigate(defaultPath);
      } else {
        navigate(-1);
      }
    }
  };

  // Variant styles
  const variantStyles = {
    default: 'bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700',
    transparent: 'bg-transparent',
    gradient: 'bg-gradient-to-r from-green-500 to-green-600 text-white',
  };

  const textStyles = {
    default: {
      title: 'text-gray-900 dark:text-white',
      subtitle: 'text-gray-500 dark:text-gray-300',
      breadcrumb: 'text-gray-500 dark:text-gray-300',
      breadcrumbActive: 'text-gray-900 dark:text-white',
      icon: 'text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700',
    },
    transparent: {
      title: 'text-gray-900 dark:text-white',
      subtitle: 'text-gray-500 dark:text-gray-300',
      breadcrumb: 'text-gray-500 dark:text-gray-300',
      breadcrumbActive: 'text-gray-900 dark:text-white',
      icon: 'text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700',
    },
    gradient: {
      title: 'text-white',
      subtitle: 'text-green-100',
      breadcrumb: 'text-green-200',
      breadcrumbActive: 'text-white',
      icon: 'text-white/80 hover:text-white hover:bg-white/10',
    },
  };

  const styles = textStyles[variant];

  return (
    <header
      className={`
        ${variantStyles[variant]}
        ${sticky ? 'sticky top-0 z-30' : ''}
        ${className}
      `}
    >
      <div className="px-4 py-3 md:px-6 md:py-4">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-sm mb-2" aria-label="Breadcrumb">
            <button
              onClick={() => navigate(getDefaultBackPath() || '/')}
              className={`p-1 rounded ${styles.icon}`}
              aria-label="Go to dashboard"
            >
              <Home className="w-4 h-4" />
            </button>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <ChevronRight className={`w-4 h-4 ${styles.breadcrumb}`} />
                {index === breadcrumbs.length - 1 ? (
                  <span className={`font-medium ${styles.breadcrumbActive}`}>
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    onClick={() => navigate(crumb.path)}
                    className={`${styles.breadcrumb} hover:underline`}
                  >
                    {crumb.label}
                  </button>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Main header row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left side: Back button + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showBack && (
              <button
                onClick={handleBack}
                className={`
                  flex-shrink-0 p-2 rounded-lg transition-colors
                  min-w-[44px] min-h-[44px] flex items-center justify-center
                  ${styles.icon}
                `}
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {icon && (
                  <span className={`flex-shrink-0 ${styles.title}`}>
                    {icon}
                  </span>
                )}
                <h1 className={`text-xl md:text-2xl font-bold truncate ${styles.title}`}>
                  {title}
                </h1>
              </div>
              {subtitle && (
                <p className={`text-sm mt-0.5 truncate ${styles.subtitle}`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right side: Actions */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
