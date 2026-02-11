/**
 * @fileoverview Stat Card Component
 * @description Dashboard-style KPI card with trend indicators and sparklines
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import Icon from './Icon';
import './StatCard.css';

/**
 * StatCard Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Stat label
 * @param {string|number} props.value - Stat value
 * @param {string} props.icon - Icon emoji or component
 * @param {Object} props.trend - Trend data {value: number, direction: 'up'|'down'|'neutral'}
 * @param {string} props.variant - Card variant (primary, secondary, success, info, warning, danger)
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 */
const StatCard = ({
  label,
  value,
  icon,
  trend = null,
  variant = 'primary',
  loading = false,
  onClick,
  className = '',
  ...rest
}) => {
  // Determine card classes
  const cardClasses = [
    'stat-card',
    `stat-card--${variant}`,
    loading && 'stat-card--loading',
    onClick && 'stat-card--clickable',
    className
  ].filter(Boolean).join(' ');

  // Get trend icon
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <Icon name="trending-up" className="stat-card__trend-icon stat-card__trend-icon--up" />;
      case 'down':
        return <Icon name="trending-down" className="stat-card__trend-icon stat-card__trend-icon--down" />;
      default:
        return <Icon name="minus" className="stat-card__trend-icon stat-card__trend-icon--neutral" />;
    }
  };

  // Get trend class
  const getTrendClass = () => {
    if (!trend) return '';
    
    switch (trend.direction) {
      case 'up':
        return 'stat-card__trend--up';
      case 'down':
        return 'stat-card__trend--down';
      default:
        return 'stat-card__trend--neutral';
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...rest}
    >
      {loading ? (
        /* Loading Skeleton */
        <div className="stat-card__skeleton">
          <div className="stat-card__skeleton-icon"></div>
          <div className="stat-card__skeleton-content">
            <div className="stat-card__skeleton-value"></div>
            <div className="stat-card__skeleton-label"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Icon */}
          {icon && (
            <div className="stat-card__icon">
              {typeof icon === 'string' ? (
                <span className="stat-card__icon-emoji">{icon}</span>
              ) : (
                icon
              )}
            </div>
          )}

          {/* Content */}
          <div className="stat-card__content">
            {/* Value */}
            <div className="stat-card__value">
              {value}
            </div>

            {/* Label */}
            <div className="stat-card__label">
              {label}
            </div>

            {/* Trend */}
            {trend && (
              <div className={`stat-card__trend ${getTrendClass()}`}>
                {getTrendIcon()}
                <span className="stat-card__trend-value">
                  {Math.abs(trend.value)}%
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StatCard;
