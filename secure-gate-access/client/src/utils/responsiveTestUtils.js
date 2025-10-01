// client/src/utils/responsiveTestUtils.js
import React, { useState, useEffect } from 'react';
import { useScreenSize, useCurrentBreakpoint, BREAKPOINTS } from './responsive';

// Component to test responsive behavior
export function ResponsiveTestDisplay({ className = '' }) {
  const { width, height } = useScreenSize();
  const currentBreakpoint = useCurrentBreakpoint();
  const [isVisible, setIsVisible] = useState(false);

  // Show/hide with keyboard shortcut (Ctrl/Cmd + R + T)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className={`fixed top-4 right-4 bg-black bg-opacity-90 text-white p-3 rounded-lg text-xs z-50 font-mono ${className}`}
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <div className="space-y-1">
        <div className="font-semibold text-yellow-400">Screen Info</div>
        <div>Size: {width}x{height}</div>
        <div>Breakpoint: <span className="text-green-400">{currentBreakpoint}</span></div>
        <div className="border-t border-gray-600 pt-2 mt-2">
          <div className="text-gray-400">Breakpoints:</div>
          {Object.entries(BREAKPOINTS).map(([bp, size]) => (
            <div 
              key={bp} 
              className={`text-xs ${currentBreakpoint === bp ? 'text-green-400' : 'text-gray-500'}`}
            >
              {bp}: {size}px {width >= size ? '✓' : '✗'}
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-400 pt-2 border-t border-gray-600">
          Ctrl+Shift+R to toggle
        </div>
      </div>
    </div>
  );
}

// Test component for responsive layouts
export function ResponsiveLayoutTester({ children, testModes = false }) {
  const [forcedBreakpoint, setForcedBreakpoint] = useState(null);
  
  if (!testModes) {
    return children;
  }

  const breakpointButtons = Object.keys(BREAKPOINTS).map(bp => (
    <button
      key={bp}
      onClick={() => setForcedBreakpoint(bp === forcedBreakpoint ? null : bp)}
      className={`px-2 py-1 text-xs rounded ${
        forcedBreakpoint === bp 
          ? 'bg-green-600 text-white' 
          : 'bg-gray-200 text-gray-700'
      }`}
    >
      {bp}
    </button>
  ));

  return (
    <div>
      <div className="p-2 bg-gray-100 border-b flex gap-2 flex-wrap">
        <span className="text-xs text-gray-600 mr-2">Test Breakpoints:</span>
        {breakpointButtons}
        {forcedBreakpoint && (
          <button
            onClick={() => setForcedBreakpoint(null)}
            className="px-2 py-1 text-xs rounded bg-red-500 text-white ml-2"
          >
            Reset
          </button>
        )}
      </div>
      <div 
        className={forcedBreakpoint ? `max-w-[${BREAKPOINTS[forcedBreakpoint]}px] mx-auto border-x-2 border-red-300` : ''}
        style={forcedBreakpoint ? { maxWidth: `${BREAKPOINTS[forcedBreakpoint]}px` } : {}}
      >
        {children}
      </div>
    </div>
  );
}

// Hook to test component at different breakpoints
export function useResponsiveTesting() {
  const [isTestMode, setIsTestMode] = useState(false);
  const [testBreakpoint, setTestBreakpoint] = useState(null);
  
  const enableTestMode = () => setIsTestMode(true);
  const disableTestMode = () => {
    setIsTestMode(false);
    setTestBreakpoint(null);
  };
  
  const testAtBreakpoint = (breakpoint) => {
    setTestBreakpoint(breakpoint);
  };
  
  return {
    isTestMode,
    testBreakpoint,
    enableTestMode,
    disableTestMode,
    testAtBreakpoint
  };
}

// Generate responsive test data
export const RESPONSIVE_TEST_CASES = {
  mobile: { width: 360, height: 640, name: 'Mobile Portrait' },
  mobileLandscape: { width: 640, height: 360, name: 'Mobile Landscape' },
  tablet: { width: 768, height: 1024, name: 'Tablet Portrait' },
  tabletLandscape: { width: 1024, height: 768, name: 'Tablet Landscape' },
  laptop: { width: 1366, height: 768, name: 'Laptop' },
  desktop: { width: 1920, height: 1080, name: 'Desktop' }
};

// Viewport size simulator
export function viewportSizeTest(testCase) {
  if (typeof window === 'undefined') return;
  
  const { width, height } = RESPONSIVE_TEST_CASES[testCase];
  
  // This won't actually resize the window, but can be used for testing
  console.log(`Testing at ${width}x${height} (${RESPONSIVE_TEST_CASES[testCase].name})`);
  
  return { width, height };
}