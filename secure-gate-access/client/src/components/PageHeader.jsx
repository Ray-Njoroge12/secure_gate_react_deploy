// Page Header component with breadcrumbs and page title
import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import Breadcrumbs from './ui/Breadcrumbs';
import { Button, Icon } from './ui';

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
              className="mb-4 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
              icon={
                <Icon name="ArrowLeft" className="w-4 h-4 mr-2" />
              }
            >
              Back
            </Button>
          )}

          {/* Page Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {displayTitle}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-gray-600 dark:text-gray-300 text-base">
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
