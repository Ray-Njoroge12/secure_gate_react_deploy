/**
 * @file GlobalStyles.jsx
 * @description Global UI styles and CSS-in-JS enhancements
 * Phase 4: UI/UX Improvements - Global Style System
 * 
 * Features:
 * - Smooth scroll behavior
 * - Focus management styles
 * - Animation definitions
 * - Print styles
 * - High contrast mode support
 * - Reduced motion support
 */

import React from 'react';

/**
 * Global CSS styles injected at app level
 */
const globalStyles = `
  /* ==========================================================================
     Base & Reset Enhancements
     ========================================================================== */
  
  html {
    scroll-behavior: smooth;
    -webkit-tap-highlight-color: transparent;
    text-size-adjust: 100%;
  }
  
  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }
    
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  
  /* ==========================================================================
     Focus Styles - Accessible & Beautiful
     ========================================================================== */
  
  /* Remove default focus outline but add it back with better styling */
  *:focus {
    outline: none;
  }
  
  /* Visible focus for keyboard navigation only */
  *:focus-visible {
    outline: 2px solid var(--color-brand-500, #10b981);
    outline-offset: 2px;
    border-radius: 4px;
  }
  
  /* Focus within for parent containers */
  .focus-within-ring:focus-within {
    box-shadow: 0 0 0 2px var(--color-brand-500, #10b981);
  }
  
  /* Skip to main content link */
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--color-brand-600, #059669);
    color: white;
    padding: 8px 16px;
    z-index: 9999;
    transition: top 0.2s ease-in-out;
    border-radius: 0 0 8px 0;
    font-weight: 500;
  }
  
  .skip-link:focus {
    top: 0;
  }
  
  /* ==========================================================================
     Animation Keyframes
     ========================================================================== */
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes slideInFromTop {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInFromBottom {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInFromLeft {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes bounce {
    0%, 100% {
      transform: translateY(-5%);
      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
    }
    50% {
      transform: translateY(0);
      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
    20%, 40%, 60%, 80% { transform: translateX(4px); }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  /* Animation utility classes */
  .animate-fade-in {
    animation: fadeIn 0.2s ease-out;
  }
  
  .animate-slide-in-top {
    animation: slideInFromTop 0.3s ease-out;
  }
  
  .animate-slide-in-bottom {
    animation: slideInFromBottom 0.3s ease-out;
  }
  
  .animate-slide-in-left {
    animation: slideInFromLeft 0.3s ease-out;
  }
  
  .animate-slide-in-right {
    animation: slideInFromRight 0.3s ease-out;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.2s ease-out;
  }
  
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  .animate-bounce {
    animation: bounce 1s infinite;
  }
  
  .animate-shake {
    animation: shake 0.5s ease-in-out;
  }
  
  .animate-shimmer {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.4) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  
  /* ==========================================================================
     Transition Utilities
     ========================================================================== */
  
  .transition-fast {
    transition: all 0.15s ease-out;
  }
  
  .transition-normal {
    transition: all 0.2s ease-out;
  }
  
  .transition-slow {
    transition: all 0.3s ease-out;
  }
  
  .transition-colors {
    transition: color 0.2s, background-color 0.2s, border-color 0.2s;
  }
  
  .transition-transform {
    transition: transform 0.2s ease-out;
  }
  
  .transition-opacity {
    transition: opacity 0.2s ease-out;
  }
  
  /* ==========================================================================
     Interactive States
     ========================================================================== */
  
  .hover-lift {
    transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
  }
  
  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
  
  .hover-scale {
    transition: transform 0.2s ease-out;
  }
  
  .hover-scale:hover {
    transform: scale(1.02);
  }
  
  .hover-glow {
    transition: box-shadow 0.2s ease-out;
  }
  
  .hover-glow:hover {
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
  }
  
  .active-press:active {
    transform: scale(0.98);
  }
  
  /* ==========================================================================
     Touch & Mobile Enhancements
     ========================================================================== */
  
  /* Touch target minimum size */
  .touch-target {
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Safe area insets for notched devices */
  .safe-area-inset-top {
    padding-top: env(safe-area-inset-top, 0px);
  }
  
  .safe-area-inset-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  
  .safe-area-inset-left {
    padding-left: env(safe-area-inset-left, 0px);
  }
  
  .safe-area-inset-right {
    padding-right: env(safe-area-inset-right, 0px);
  }
  
  /* Prevent text selection on buttons */
  button, [role="button"] {
    user-select: none;
  }
  
  /* ==========================================================================
     Scrollbar Styling
     ========================================================================== */
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
  
  /* Hide scrollbar but allow scrolling */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  /* ==========================================================================
     High Contrast Mode Support
     ========================================================================== */
  
  @media (prefers-contrast: high) {
    *:focus-visible {
      outline-width: 3px;
      outline-color: currentColor;
    }
    
    button, [role="button"], a {
      text-decoration: underline;
    }
    
    .card, .modal, .dropdown {
      border: 2px solid currentColor;
    }
  }
  
  /* ==========================================================================
     Print Styles
     ========================================================================== */
  
  @media print {
    /* Hide non-essential elements */
    nav, .sidebar, .toast, .modal-overlay, .toolbar, button[aria-label*="close"] {
      display: none !important;
    }
    
    /* Ensure good contrast */
    body {
      color: #000 !important;
      background: #fff !important;
    }
    
    a {
      text-decoration: underline;
      color: #000 !important;
    }
    
    /* Show link URLs */
    a[href]:after {
      content: " (" attr(href) ")";
      font-size: 0.8em;
    }
    
    /* Page break controls */
    .page-break-before {
      page-break-before: always;
    }
    
    .page-break-after {
      page-break-after: always;
    }
    
    .no-page-break {
      page-break-inside: avoid;
    }
  }
  
  /* ==========================================================================
     Loading & Skeleton States
     ========================================================================== */
  
  .skeleton {
    background: linear-gradient(
      90deg,
      #f0f0f0 25%,
      #e0e0e0 50%,
      #f0f0f0 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }
  
  .loading-dots::after {
    content: '';
    animation: dots 1.5s steps(4) infinite;
  }
  
  @keyframes dots {
    0% { content: ''; }
    25% { content: '.'; }
    50% { content: '..'; }
    75% { content: '...'; }
  }
  
  /* ==========================================================================
     RTL (Right-to-Left) Support
     ========================================================================== */
  
  /* Base RTL styles */
  [dir="rtl"] {
    direction: rtl;
    text-align: right;
  }
  
  /* RTL text alignment utilities */
  [dir="rtl"] .text-left {
    text-align: right;
  }
  
  [dir="rtl"] .text-right {
    text-align: left;
  }
  
  /* RTL flex direction */
  [dir="rtl"] .flex-row {
    flex-direction: row-reverse;
  }
  
  [dir="rtl"] .flex-row-reverse {
    flex-direction: row;
  }
  
  /* RTL margins and paddings */
  [dir="rtl"] .ml-auto {
    margin-left: 0;
    margin-right: auto;
  }
  
  [dir="rtl"] .mr-auto {
    margin-right: 0;
    margin-left: auto;
  }
  
  [dir="rtl"] .pl-4 {
    padding-left: 0;
    padding-right: 1rem;
  }
  
  [dir="rtl"] .pr-4 {
    padding-right: 0;
    padding-left: 1rem;
  }
  
  /* RTL positioning */
  [dir="rtl"] .left-0 {
    left: auto;
    right: 0;
  }
  
  [dir="rtl"] .right-0 {
    right: auto;
    left: 0;
  }
  
  /* RTL borders */
  [dir="rtl"] .border-l {
    border-left: none;
    border-right: 1px solid;
  }
  
  [dir="rtl"] .border-r {
    border-right: none;
    border-left: 1px solid;
  }
  
  /* RTL transforms for icons/arrows */
  [dir="rtl"] .rtl-flip {
    transform: scaleX(-1);
  }
  
  /* RTL slide animations */
  [dir="rtl"] .animate-slide-in-left {
    animation: slideInFromRight 0.3s ease-out;
  }
  
  [dir="rtl"] .animate-slide-in-right {
    animation: slideInFromLeft 0.3s ease-out;
  }
  
  /* RTL navigation */
  [dir="rtl"] nav ul {
    padding-right: 0;
  }
  
  /* RTL forms */
  [dir="rtl"] input,
  [dir="rtl"] textarea,
  [dir="rtl"] select {
    text-align: right;
  }
  
  [dir="rtl"] input[type="email"],
  [dir="rtl"] input[type="url"],
  [dir="rtl"] input[type="tel"] {
    direction: ltr;
    text-align: right;
  }
  
  /* RTL checkboxes and radios */
  [dir="rtl"] input[type="checkbox"],
  [dir="rtl"] input[type="radio"] {
    margin-left: 0.5rem;
    margin-right: 0;
  }
  
  /* RTL icons in buttons */
  [dir="rtl"] .btn-icon-left svg {
    margin-right: 0;
    margin-left: 0.5rem;
  }
  
  [dir="rtl"] .btn-icon-right svg {
    margin-left: 0;
    margin-right: 0.5rem;
  }
  
  /* RTL list styles */
  [dir="rtl"] ul, [dir="rtl"] ol {
    padding-right: 1.5rem;
    padding-left: 0;
  }
  
  /* RTL table alignment */
  [dir="rtl"] th, [dir="rtl"] td {
    text-align: right;
  }
  
  /* RTL modal positioning */
  [dir="rtl"] .modal-close {
    right: auto;
    left: 1rem;
  }
  
  /* RTL sidebar */
  [dir="rtl"] .sidebar {
    left: auto;
    right: 0;
  }
  
  [dir="rtl"] .sidebar-closed {
    transform: translateX(100%);
  }
  
  /* RTL dropdown menus */
  [dir="rtl"] .dropdown-menu {
    left: auto;
    right: 0;
  }
  
  /* RTL progress bars */
  [dir="rtl"] .progress-bar {
    direction: rtl;
  }
  
  [dir="rtl"] .progress-fill {
    transform-origin: right center;
  }
  
  /* RTL breadcrumbs */
  [dir="rtl"] .breadcrumb-separator {
    transform: scaleX(-1);
  }
  
  /* RTL tooltips */
  [dir="rtl"] .tooltip-left {
    left: auto;
    right: 100%;
  }
  
  [dir="rtl"] .tooltip-right {
    right: auto;
    left: 100%;
  }
  
  /* RTL card layouts */
  [dir="rtl"] .card-actions {
    flex-direction: row-reverse;
  }
  
  /* RTL number inputs remain LTR */
  [dir="rtl"] input[type="number"] {
    direction: ltr;
  }
  
  /* ==========================================================================
     Dark Mode Support (Future)
     ========================================================================== */
  
  @media (prefers-color-scheme: dark) {
    :root.auto-dark-mode {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-tertiary: #0f3460;
      --text-primary: #eaeaea;
      --text-secondary: #b8b8b8;
      --border-color: #2d2d44;
    }
  }
`;

/**
 * GlobalStyles Component
 * Injects global CSS styles into the document head
 */
const GlobalStyles = () => {
  return (
    <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
  );
};

/**
 * Skip to Main Content Link Component
 * Provides keyboard navigation to skip repeated content
 */
export const SkipLink = ({ mainContentId = 'main-content', children = 'Skip to main content' }) => {
  return (
    <a href={`#${mainContentId}`} className="skip-link">
      {children}
    </a>
  );
};

/**
 * Visible focus wrapper
 * Adds visible focus ring when focused via keyboard
 */
export const FocusRing = ({ children, className = '' }) => {
  return (
    <div className={`focus-within-ring ${className}`}>
      {children}
    </div>
  );
};

/**
 * Animation wrapper component
 */
export const Animated = ({ 
  animation = 'fade-in', 
  delay = 0, 
  duration, 
  children, 
  className = '' 
}) => {
  const style = {
    animationDelay: delay ? `${delay}ms` : undefined,
    animationDuration: duration ? `${duration}ms` : undefined,
  };

  return (
    <div className={`animate-${animation} ${className}`} style={style}>
      {children}
    </div>
  );
};

/**
 * Touch target wrapper - ensures 44px minimum touch target
 */
export const TouchTarget = ({ children, className = '', as: Component = 'div' }) => {
  return (
    <Component className={`touch-target ${className}`}>
      {children}
    </Component>
  );
};

export default GlobalStyles;
