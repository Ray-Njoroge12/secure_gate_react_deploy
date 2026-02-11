/**
 * Progressive Disclosure Component
 * 
 * A component that reveals information progressively to reduce cognitive load:
 * - Collapsible sections with smooth animations
 * - Conditional content based on user selections
 * - Smart defaults with advanced options
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Mobile-responsive design
 * - Keyboard navigation support
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import logger from 'utils/logger';
import Icon from './Icon';
import { Button, Card, Badge } from './index';
import { componentTokens } from '../../design-system';

const ProgressiveDisclosure = ({
  // Core configuration
  sections = [],
  defaultExpanded = [],
  allowMultiple = true,
  allowNone = false,
  
  // Display options
  showIcons = true,
  showBadges = true,
  showProgress = true,
  showAdvancedToggle = true,
  
  // Behavior options
  autoExpand = false,
  expandOnFocus = true,
  collapseOnBlur = false,
  persistState = true,
  stateKey = 'progressive-disclosure',
  
  // Styling
  variant = 'default', // default, card, minimal
  size = 'md', // sm, md, lg
  className = '',
  
  // Event handlers
  onSectionToggle,
  onAllToggle,
  onStateChange,
  
  // Children
  children
}) => {
  const [expandedSections, setExpandedSections] = useState(new Set(defaultExpanded));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [focusedSection, setFocusedSection] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const containerRef = useRef(null);
  const sectionRefs = useRef({});

  // Load persisted state
  useEffect(() => {
    if (persistState && stateKey) {
      const saved = localStorage.getItem(`progressive-disclosure-${stateKey}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setExpandedSections(new Set(parsed.expandedSections || []));
          setShowAdvanced(parsed.showAdvanced || false);
        } catch (error) {
          logger.warn('Failed to load progressive disclosure state:', error);
        }
      }
    }
  }, [persistState, stateKey]);

  // Save state to localStorage
  const saveState = useCallback(() => {
    if (persistState && stateKey) {
      const state = {
        expandedSections: Array.from(expandedSections),
        showAdvanced,
        timestamp: Date.now()
      };
      localStorage.setItem(`progressive-disclosure-${stateKey}`, JSON.stringify(state));
    }
  }, [expandedSections, showAdvanced, persistState, stateKey]);

  // Auto-expand sections
  useEffect(() => {
    if (autoExpand && sections.length > 0) {
      const autoExpandSections = sections
        .map((section, index) => ({ section, index }))
        .filter(({ section }) => section.autoExpand)
        .map(({ index }) => index);
      
      if (autoExpandSections.length > 0) {
        setExpandedSections(new Set(autoExpandSections));
      }
    }
  }, [autoExpand, sections]);

  // Save state when it changes
  useEffect(() => {
    saveState();
  }, [saveState]);

  // Get size-specific styles
  const getSizeStyles = useCallback(() => {
    const sizes = {
      sm: {
        header: 'p-3',
        content: 'p-3',
        icon: 'w-4 h-4',
        text: 'text-sm',
        title: 'text-base'
      },
      md: {
        header: 'p-4',
        content: 'p-4',
        icon: 'w-5 h-5',
        text: 'text-base',
        title: 'text-lg'
      },
      lg: {
        header: 'p-6',
        content: 'p-6',
        icon: 'w-6 h-6',
        text: 'text-lg',
        title: 'text-xl'
      }
    };
    return sizes[size] || sizes.md;
  }, [size]);

  // Get variant-specific styles
  const getVariantStyles = useCallback(() => {
    const variants = {
      default: {
        container: 'space-y-2',
        section: 'border border-slate-700 rounded-lg bg-slate-800',
        header: 'hover:bg-slate-700 transition-colors',
        content: 'border-t border-slate-700'
      },
      card: {
        container: 'space-y-4',
        section: 'bg-slate-800 rounded-lg shadow-sm',
        header: 'hover:bg-slate-700 transition-colors',
        content: 'border-t border-slate-700'
      },
      minimal: {
        container: 'space-y-1',
        section: 'border-b border-slate-700',
        header: 'hover:bg-slate-800 transition-colors',
        content: ''
      }
    };
    return variants[variant] || variants.default;
  }, [variant]);

  // Toggle section
  const toggleSection = useCallback((sectionIndex) => {
    const newExpanded = new Set(expandedSections);
    
    if (newExpanded.has(sectionIndex)) {
      if (!allowNone && newExpanded.size === 1) return; // Prevent closing last section
      newExpanded.delete(sectionIndex);
    } else {
      if (!allowMultiple) {
        newExpanded.clear();
      }
      newExpanded.add(sectionIndex);
    }
    
    setExpandedSections(newExpanded);
    setIsAnimating(true);
    
    if (onSectionToggle) {
      onSectionToggle(sectionIndex, newExpanded.has(sectionIndex), newExpanded);
    }
    
    setTimeout(() => setIsAnimating(false), 300);
  }, [expandedSections, allowMultiple, allowNone, onSectionToggle]);

  // Toggle all sections
  const toggleAll = useCallback(() => {
    const allExpanded = expandedSections.size === sections.length;
    const newExpanded = allExpanded ? new Set() : new Set(sections.map((_, index) => index));
    
    setExpandedSections(newExpanded);
    setIsAnimating(true);
    
    if (onAllToggle) {
      onAllToggle(!allExpanded, newExpanded);
    }
    
    setTimeout(() => setIsAnimating(false), 300);
  }, [expandedSections, sections.length, onAllToggle]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event, sectionIndex) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        toggleSection(sectionIndex);
        break;
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = Math.min(sectionIndex + 1, sections.length - 1);
        sectionRefs.current[nextIndex]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = Math.max(sectionIndex - 1, 0);
        sectionRefs.current[prevIndex]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        sectionRefs.current[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        sectionRefs.current[sections.length - 1]?.focus();
        break;
    }
  }, [toggleSection, sections.length]);

  // Handle focus events
  const handleFocus = useCallback((sectionIndex) => {
    setFocusedSection(sectionIndex);
    if (expandOnFocus && !expandedSections.has(sectionIndex)) {
      toggleSection(sectionIndex);
    }
  }, [expandOnFocus, expandedSections, toggleSection]);

  const handleBlur = useCallback((sectionIndex) => {
    if (collapseOnBlur && expandedSections.has(sectionIndex)) {
      setTimeout(() => {
        if (focusedSection === sectionIndex) {
          toggleSection(sectionIndex);
        }
      }, 100);
    }
    setFocusedSection(null);
  }, [collapseOnBlur, expandedSections, focusedSection, toggleSection]);

  // Get section status
  const getSectionStatus = (section) => {
    if (section.required && !expandedSections.has(sections.indexOf(section))) {
      return 'required';
    }
    if (section.completed) {
      return 'completed';
    }
    if (section.hasErrors) {
      return 'error';
    }
    if (section.warning) {
      return 'warning';
    }
    return 'default';
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Icon name="CheckCircle" className="w-4 h-4 text-green-400" />;
      case 'error':
        return <Icon name="AlertCircle" className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <Icon name="AlertCircle" className="w-4 h-4 text-yellow-400" />;
      case 'required':
        return <Icon name="AlertCircle" className="w-4 h-4 text-blue-400" />;
      default:
        return null;
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" size="sm">Complete</Badge>;
      case 'error':
        return <Badge variant="error" size="sm">Error</Badge>;
      case 'warning':
        return <Badge variant="warning" size="sm">Warning</Badge>;
      case 'required':
        return <Badge variant="info" size="sm">Required</Badge>;
      default:
        return null;
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();
  const allExpanded = expandedSections.size === sections.length;
  const anyExpanded = expandedSections.size > 0;

  return (
    <div ref={containerRef} className={`progressive-disclosure ${variantStyles.container} ${className}`}>
      {/* Header Controls */}
      {(showAdvancedToggle || sections.length > 1) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {sections.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                disabled={isAnimating}
                icon={allExpanded ? <Icon name="ChevronDown" className="w-4 h-4" /> : <Icon name="ChevronRight" className="w-4 h-4" />}
              >
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </Button>
            )}
            
            {showAdvancedToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                icon={showAdvanced ? <Icon name="EyeOff" className="w-4 h-4" /> : <Icon name="Eye" className="w-4 h-4" />}
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced
              </Button>
            )}
          </div>
          
          {showProgress && (
            <div className="text-sm text-slate-400">
              {expandedSections.size} of {sections.length} expanded
            </div>
          )}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-2">
        {sections.map((section, index) => {
          const isExpanded = expandedSections.has(index);
          const status = getSectionStatus(section);
          const isAdvanced = section.advanced && !showAdvanced;
          
          // Skip advanced sections if not showing advanced
          if (isAdvanced) return null;
          
          return (
            <div
              key={section.id || index}
              className={`${variantStyles.section} ${isExpanded ? 'ring-1 ring-brand-500' : ''}`}
            >
              {/* Section Header */}
              <button
                ref={el => sectionRefs.current[index] = el}
                onClick={() => toggleSection(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onFocus={() => handleFocus(index)}
                onBlur={() => handleBlur(index)}
                className={`
                  w-full flex items-center justify-between ${sizeStyles.header}
                  focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900
                  ${variantStyles.header}
                `}
                aria-expanded={isExpanded}
                aria-controls={`section-content-${index}`}
                aria-describedby={section.description ? `section-description-${index}` : undefined}
              >
                <div className="flex items-center space-x-3">
                  {/* Expand/Collapse Icon */}
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <Icon name="ChevronDown" className={`${sizeStyles.icon} text-slate-400`} />
                    ) : (
                      <Icon name="ChevronRight" className={`${sizeStyles.icon} text-slate-400`} />
                    )}
                  </div>
                  
                  {/* Section Icon */}
                  {showIcons && section.icon && (
                    <div className="flex-shrink-0">
                      <Icon name={section.icon} className={`${sizeStyles.icon} text-slate-400`} />
                    </div>
                  )}
                  
                  {/* Section Title */}
                  <div className="flex-1 text-left">
                    <h3 className={`${sizeStyles.title} font-medium text-slate-200`}>
                      {section.title}
                    </h3>
                    {section.description && (
                      <p 
                        id={`section-description-${index}`}
                        className={`${sizeStyles.text} text-slate-400 mt-1`}
                      >
                        {section.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Status Icon */}
                  {getStatusIcon(status)}
                </div>
                
                {/* Right Side Badges */}
                <div className="flex items-center space-x-2">
                  {showBadges && getStatusBadge(status)}
                  {section.badge && (
                    <Badge variant={section.badge.variant || 'default'} size="sm">
                      {section.badge.text}
                    </Badge>
                  )}
                </div>
              </button>
              
              {/* Section Content */}
              <div
                id={`section-content-${index}`}
                className={`
                  overflow-hidden transition-all duration-300 ease-in-out
                  ${isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}
                  ${variantStyles.content}
                `}
                style={{
                  maxHeight: isExpanded ? 'none' : '0px'
                }}
              >
                <div className={`${sizeStyles.content}`}>
                  {section.content && typeof section.content === 'function' 
                    ? section.content({ 
                        isExpanded, 
                        section, 
                        index,
                        toggleSection: () => toggleSection(index)
                      })
                    : section.content
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Custom Children */}
      {children && (
        <div className="mt-6">
          {typeof children === 'function' 
            ? children({ 
                expandedSections, 
                showAdvanced,
                toggleSection,
                toggleAll
              })
            : children
          }
        </div>
      )}
      
      {/* Advanced Options Toggle */}
      {showAdvancedToggle && (
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors duration-200"
          >
             <Icon name="Settings" className="w-4 h-4 mr-2" />
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
            {showAdvanced ? (
              <Icon name="ChevronDown" className="w-4 h-4 ml-1" />
            ) : (
              <Icon name="ChevronRight" className="w-4 h-4 ml-1" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProgressiveDisclosure;




