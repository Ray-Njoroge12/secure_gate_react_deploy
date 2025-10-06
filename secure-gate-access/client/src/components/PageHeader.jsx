// Page Header component with breadcrumbs and page title
import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import Breadcrumbs from './ui/Breadcrumbs';
import { Button } from './ui';

const PageHeader = ({ 
  title = null,
  subtitle = null,
  showBreadcrumbs = true,
  showBackButton = false,
  onBack = null,
  actions = null,
  className = ''
}) => {
  const { pageTitle, breadcrumbs, getParentPath } = useNavigation();
  
  const displayTitle = title || pageTitle;
  const backPath = onBack ? null : getParentPath();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      window.history.back();
    }
  };

  return (
    <div className={`mb-6 ${className}`}>
      {/* Breadcrumbs */}
      {showBreadcrumbs && breadcrumbs.length > 1 && (
        <Breadcrumbs breadcrumbs={breadcrumbs} className="mb-4" />
      )}

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Back Button */}
          {showBackButton && (onBack || backPath) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mb-4 text-slate-400 hover:text-slate-200"
              icon={
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              }
            >
              Back
            </Button>
          )}

          {/* Page Title */}
          <h1 className="text-2xl font-bold text-slate-100 mb-2">
            {displayTitle}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-slate-400 text-base">
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center space-x-3 ml-6">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
