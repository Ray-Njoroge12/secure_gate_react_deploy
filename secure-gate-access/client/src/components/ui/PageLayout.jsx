// client/src/components/ui/PageLayout.jsx
// Unified page layout component for consistent structure across all pages
import React from 'react';
import PageHeader from './PageHeader';

/**
 * PageLayout - Consistent page layout wrapper
 * Handles both mobile and desktop views with proper spacing
 * 
 * @param {string} title - Page title
 * @param {string} subtitle - Optional subtitle
 * @param {ReactNode} icon - Optional icon for header
 * @param {boolean} showBack - Show back button
 * @param {string} backTo - Back destination
 * @param {ReactNode} actions - Header action buttons
 * @param {ReactNode} children - Page content
 * @param {string} maxWidth - Max content width: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
 * @param {boolean} noPadding - Remove default padding
 * @param {string} bgColor - Background color class
 */
const PageLayout = ({
  title,
  subtitle,
  icon,
  showBack = true,
  backTo,
  onBack,
  actions,
  breadcrumbs,
  children,
  maxWidth = 'xl',
  noPadding = false,
  bgColor = 'bg-gray-50',
  className = '',
}) => {
  // Max width mapping
  const maxWidthClasses = {
    sm: 'max-w-lg',      // 512px
    md: 'max-w-2xl',     // 672px
    lg: 'max-w-4xl',     // 896px
    xl: 'max-w-6xl',     // 1152px
    '2xl': 'max-w-7xl',  // 1280px
    full: 'max-w-full',
  };

  return (
    <div className={`min-h-screen ${bgColor}`}>
      {/* Page Header */}
      {title && (
        <PageHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          showBack={showBack}
          backTo={backTo}
          onBack={onBack}
          actions={actions}
          breadcrumbs={breadcrumbs}
        />
      )}
      
      {/* Page Content */}
      <main className={`
        ${maxWidthClasses[maxWidth]} mx-auto
        ${noPadding ? '' : 'px-4 sm:px-6 lg:px-8 py-6'}
        ${className}
      `}>
        {children}
      </main>
    </div>
  );
};

/**
 * PageSection - Consistent section wrapper within pages
 */
export const PageSection = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
  noPadding = false,
}) => (
  <section className={`
    bg-white rounded-xl border border-gray-200 shadow-sm
    ${noPadding ? '' : 'p-4 md:p-6'}
    ${className}
  `}>
    {(title || actions) && (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          {title && <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>}
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-300 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

/**
 * PageGrid - Responsive grid layout for dashboard-style pages
 */
export const PageGrid = ({
  children,
  cols = { default: 1, sm: 2, lg: 3 },
  gap = 4,
  className = '',
}) => {
  const colClasses = `
    grid-cols-${cols.default || 1}
    ${cols.sm ? `sm:grid-cols-${cols.sm}` : ''}
    ${cols.md ? `md:grid-cols-${cols.md}` : ''}
    ${cols.lg ? `lg:grid-cols-${cols.lg}` : ''}
    ${cols.xl ? `xl:grid-cols-${cols.xl}` : ''}
  `;

  return (
    <div className={`grid ${colClasses} gap-${gap} ${className}`}>
      {children}
    </div>
  );
};

/**
 * MobileDesktopView - Show different content for mobile vs desktop
 */
export const MobileDesktopView = ({
  mobileContent,
  desktopContent,
  breakpoint = 'md',
}) => (
  <>
    {/* Mobile View */}
    <div className={`block ${breakpoint}:hidden`}>
      {mobileContent}
    </div>
    {/* Desktop View */}
    <div className={`hidden ${breakpoint}:block`}>
      {desktopContent}
    </div>
  </>
);

/**
 * ActionBar - Sticky action bar for mobile forms
 */
export const ActionBar = ({
  children,
  position = 'bottom',
  className = '',
}) => (
  <div className={`
    ${position === 'bottom' ? 'fixed bottom-0 left-0 right-0 pb-safe' : ''}
    bg-white border-t border-gray-200 p-4
    md:relative md:border-t-0 md:p-0 md:bg-transparent
    z-30
    ${className}
  `}>
    {children}
  </div>
);

export default PageLayout;
