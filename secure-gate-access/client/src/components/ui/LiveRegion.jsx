// client/src/components/ui/LiveRegion.jsx
import React from 'react';

const LiveRegion = ({ 
  message, 
  level = 'polite', 
  role = 'status',
  className = 'sr-only',
  ...props 
}) => {
  if (!message) return null;
  
  return (
    <div
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