/**
 * Validation Feedback Component
 * 
 * Provides inline validation feedback with correction suggestions
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './ValidationFeedback.css';

const ValidationFeedback = ({
  field,
  errors = [],
  warnings = [],
  suggestions = [],
  isValid = false,
  isValidating = false,
  showSuggestions = true,
  className = ''
}) => {
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const hasSuggestions = suggestions.length > 0;

  const getValidationIcon = () => {
    if (isValidating) return '⏳';
    if (hasErrors) return '❌';
    if (hasWarnings) return '⚠️';
    if (isValid) return '✅';
    return null;
  };

  const getValidationClass = () => {
    if (isValidating) return 'validation-feedback--validating';
    if (hasErrors) return 'validation-feedback--error';
    if (hasWarnings) return 'validation-feedback--warning';
    if (isValid) return 'validation-feedback--valid';
    return 'validation-feedback--neutral';
  };

  const renderMessages = (messages, type) => {
    if (messages.length === 0) return null;

    return (
      <div className={`validation-feedback__messages validation-feedback__messages--${type}`}>
        {messages.map((message, index) => (
          <div key={index} className="validation-feedback__message">
            {message}
          </div>
        ))}
      </div>
    );
  };

  const renderSuggestions = () => {
    if (!showSuggestions || !hasSuggestions) return null;

    const visibleSuggestions = showAllSuggestions ? suggestions : suggestions.slice(0, 2);
    const hasMoreSuggestions = suggestions.length > 2 && !showAllSuggestions;

    return (
      <div className="validation-feedback__suggestions">
        <div className="validation-feedback__suggestions-header">
          <span className="validation-feedback__suggestions-icon">💡</span>
          <span className="validation-feedback__suggestions-title">Suggestions:</span>
        </div>
        <div className="validation-feedback__suggestions-list">
          {visibleSuggestions.map((suggestion, index) => (
            <div key={index} className="validation-feedback__suggestion">
              {suggestion}
            </div>
          ))}
        </div>
        {hasMoreSuggestions && (
          <button
            className="validation-feedback__show-more"
            onClick={() => setShowAllSuggestions(true)}
            type="button"
          >
            Show {suggestions.length - 2} more suggestions
          </button>
        )}
      </div>
    );
  };

  // Don't render if no feedback to show
  if (!hasErrors && !hasWarnings && !isValidating && !isValid && !hasSuggestions) {
    return null;
  }

  return (
    <div 
      className={`validation-feedback ${getValidationClass()} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`Validation feedback for ${field}`}
    >
      <div className="validation-feedback__content">
        {getValidationIcon() && (
          <div className="validation-feedback__icon">
            {getValidationIcon()}
          </div>
        )}
        
        <div className="validation-feedback__text">
          {isValidating && (
            <div className="validation-feedback__validating">
              Checking {field}...
            </div>
          )}
          
          {renderMessages(errors, 'error')}
          {renderMessages(warnings, 'warning')}
          
          {isValid && !hasErrors && !hasWarnings && (
            <div className="validation-feedback__valid-message">
              {field} looks good!
            </div>
          )}
          
          {renderSuggestions()}
        </div>
      </div>
    </div>
  );
};

ValidationFeedback.propTypes = {
  field: PropTypes.string.isRequired,
  errors: PropTypes.arrayOf(PropTypes.string),
  warnings: PropTypes.arrayOf(PropTypes.string),
  suggestions: PropTypes.arrayOf(PropTypes.string),
  isValid: PropTypes.bool,
  isValidating: PropTypes.bool,
  showSuggestions: PropTypes.bool,
  className: PropTypes.string
};

export default ValidationFeedback;