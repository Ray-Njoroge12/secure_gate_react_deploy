/**
 * @fileoverview Web Vitals Performance Monitoring
 * @description Tracks Core Web Vitals (LCP, FID, CLS, TTFB, INP)
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB, getINP } from 'web-vitals';

/**
 * Performance thresholds based on Google's recommendations
 */
export const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint (ms)
  FID: { good: 100, needsImprovement: 300 },   // First Input Delay (ms)
  CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint (ms)
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte (ms)
  INP: { good: 200, needsImprovement: 500 },   // Interaction to Next Paint (ms)
};

/**
 * Determine rating based on value and thresholds
 * 
 * @param {number} value - Metric value
 * @param {Object} threshold - Threshold config
 * @returns {string} - 'good' | 'needs-improvement' | 'poor'
 */
function getRating(value, threshold) {
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Format metric for reporting
 * 
 * @param {Object} metric - Web Vitals metric
 * @returns {Object} - Formatted metric data
 */
function formatMetric(metric) {
  return {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    timestamp: Date.now(),
    url: window.location.href,
  };
}

/**
 * Send metrics to analytics/backend
 * 
 * @param {Object} metric - Formatted metric
 */
async function sendToAnalytics(metric) {
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    const color = metric.rating === 'good' ? '\x1b[32m' : 
                  metric.rating === 'needs-improvement' ? '\x1b[33m' : '\x1b[31m';
    console.log(
      `[Web Vitals] ${color}${metric.name}\x1b[0m: ${metric.value.toFixed(2)} (${metric.rating})`
    );
  }

  // Send to backend performance endpoint
  try {
    await fetch('/api/monitoring/web-vitals', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    });
  } catch (err) {
    // Silently fail - performance monitoring shouldn't break the app
  }

  // TODO: Send to Google Analytics 4 when configured
  // gtag('event', metric.name, {
  //   value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
  //   event_category: 'Web Vitals',
  //   event_label: metric.id,
  //   non_interaction: true,
  // });
}

/**
 * Handle individual metric callback
 * 
 * @param {Object} metric - Web Vitals metric
 */
function handleMetric(metric) {
  const formatted = formatMetric(metric);
  sendToAnalytics(formatted);
  
  // Store in session for debugging
  const vitals = JSON.parse(sessionStorage.getItem('webVitals') || '{}');
  vitals[metric.name] = formatted;
  sessionStorage.setItem('webVitals', JSON.stringify(vitals));
}

/**
 * Initialize Web Vitals monitoring
 * Call this early in app initialization
 */
export function initWebVitals() {
  // Core Web Vitals
  getLCP(handleMetric);
  getFID(handleMetric);
  getCLS(handleMetric);
  
  // Additional metrics
  getFCP(handleMetric);
  getTTFB(handleMetric);
  getINP(handleMetric);

  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals] Performance monitoring initialized');
  }
}

/**
 * Get current Web Vitals from session storage
 * 
 * @returns {Object} - Current vitals data
 */
export function getCurrentVitals() {
  try {
    return JSON.parse(sessionStorage.getItem('webVitals') || '{}');
  } catch {
    return {};
  }
}

/**
 * Get performance summary
 * 
 * @returns {Object} - Summary with overall score
 */
export function getPerformanceSummary() {
  const vitals = getCurrentVitals();
  const metrics = Object.values(vitals);
  
  if (metrics.length === 0) {
    return { score: null, metrics: [], message: 'No metrics collected yet' };
  }

  const goodCount = metrics.filter(m => m.rating === 'good').length;
  const score = Math.round((goodCount / metrics.length) * 100);

  return {
    score,
    metrics,
    message: score >= 80 ? 'Excellent performance' :
             score >= 60 ? 'Good performance, room for improvement' :
             'Performance needs attention',
  };
}

/**
 * Custom performance mark
 * 
 * @param {string} name - Mark name
 */
export function mark(name) {
  if ('performance' in window) {
    performance.mark(name);
  }
}

/**
 * Custom performance measure
 * 
 * @param {string} name - Measure name
 * @param {string} startMark - Start mark name
 * @param {string} endMark - End mark name (optional, defaults to now)
 * @returns {number|null} - Duration in ms
 */
export function measure(name, startMark, endMark) {
  if ('performance' in window) {
    try {
      const measureEntry = performance.measure(name, startMark, endMark);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name}: ${measureEntry.duration.toFixed(2)}ms`);
      }
      
      return measureEntry.duration;
    } catch (err) {
      return null;
    }
  }
  return null;
}

/**
 * Track component render time
 * 
 * @param {string} componentName - Component name
 * @returns {Function} - Cleanup function to call when render completes
 */
export function trackRender(componentName) {
  const startMark = `${componentName}-start`;
  mark(startMark);
  
  return () => {
    const endMark = `${componentName}-end`;
    mark(endMark);
    measure(`${componentName}-render`, startMark, endMark);
  };
}

export default {
  initWebVitals,
  getCurrentVitals,
  getPerformanceSummary,
  mark,
  measure,
  trackRender,
  THRESHOLDS,
};
