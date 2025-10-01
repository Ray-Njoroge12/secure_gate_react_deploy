// client/src/components/BrandHeader.jsx
import React from 'react';
import { Badge } from './ui';
import { brandConfig } from '../styles/theme';

const BrandHeader = ({ 
  showTagline = false,
  showEstateName = true,
  variant = 'default', // 'default' | 'compact' | 'minimal'
  className = ''
}) => {
  const getVariantClasses = () => {
    const variants = {
      default: 'py-6 px-6',
      compact: 'py-4 px-4',
      minimal: 'py-2 px-3'
    };
    return variants[variant] || variants.default;
  };

  const getLogoSize = () => {
    const sizes = {
      default: 'text-2xl xs:text-3xl sm:text-4xl',
      compact: 'text-xl xs:text-2xl',
      minimal: 'text-lg xs:text-xl'
    };
    return sizes[variant] || sizes.default;
  };

  return (
    <header className={`bg-white border-b border-gray-200 ${getVariantClasses()} ${className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 xs:space-x-4">
            {/* Logo Icon */}
            <div className="flex-shrink-0">
              {brandConfig.estate.logo ? (
                <img 
                  src={brandConfig.estate.logo} 
                  alt={`${brandConfig.estate.name} Logo`}
                  className="h-8 xs:h-10 sm:h-12 w-auto"
                />
              ) : (
                <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg xs:text-xl sm:text-2xl">
                  {brandConfig.logo.icon}
                </div>
              )}
            </div>

            {/* Brand Text */}
            <div className="min-w-0 flex-1">
              <h1 className={`font-bold text-gray-900 truncate ${getLogoSize()}`}>
                {brandConfig.logo.text}
              </h1>
              {showTagline && variant !== 'minimal' && (
                <p className="text-xs xs:text-sm text-gray-600 truncate">
                  {brandConfig.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Estate Info & Status */}
          <div className="flex items-center space-x-2 xs:space-x-3">
            {showEstateName && (
              <div className="text-right min-w-0">
                <Badge 
                  variant="outline" 
                  className="text-xs xs:text-sm border-green-200 text-green-700 bg-green-50"
                >
                  {brandConfig.estate.name}
                </Badge>
                {variant === 'default' && (
                  <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                    Access Control System
                  </p>
                )}
              </div>
            )}

            {/* Status Indicator */}
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-600 hidden xs:inline">Online</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default BrandHeader;