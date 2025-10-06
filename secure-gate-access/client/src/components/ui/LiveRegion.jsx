// client/src/components/ui/LiveRegion.jsx
import React, { useEffect, useRef } from 'react';

const LiveRegion = ({ 
  message, 
  level = 'polite', 
  role = 'status',
  className = 'sr-only',
  ...props 
}) => {
  const liveRegionRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to clear message
      if (e.key === 'Escape' && liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
      // Ctrl/Cmd + A to announce message
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && liveRegionRef.current) {
        e.preventDefault();
        // Re-announce the current message
        const currentMessage = liveRegionRef.current.textContent;
        if (currentMessage) {
          liveRegionRef.current.textContent = '';
          setTimeout(() => {
            liveRegionRef.current.textContent = currentMessage;
          }, 100);
        }
      }
    };

    const liveRegion = liveRegionRef.current;
    if (liveRegion) {
      liveRegion.addEventListener('keydown', handleKeyDown);
      return () => liveRegion.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  if (!message) return null;
  
  return (
    <div
      ref={liveRegionRef}
      role={role}
      aria-live={level}
      aria-atomic="true"
      className={className}
      {...props}
    >
      {message}
    </div>
  );
};

// Specific components for common use cases
export const StatusAnnouncement = ({ message, ...props }) => (
  <LiveRegion 
    message={message} 
    level="polite" 
    role="status"
    {...props}
  />
);

export const AlertAnnouncement = ({ message, ...props }) => (
  <LiveRegion 
    message={message} 
    level="assertive" 
    role="alert"
    {...props}
  />
);

export const LoadingAnnouncement = ({ isLoading, loadingText = "Loading...", completeText = "Loading complete" }) => (
  <LiveRegion 
    message={isLoading ? loadingText : completeText}
    level="polite"
    role="status"
  />
);

export default LiveRegion;