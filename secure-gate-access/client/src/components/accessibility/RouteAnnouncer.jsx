import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const RouteAnnouncer = () => {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      const title = document.title || location.pathname.split('/').pop() || 'page';
      setAnnouncement(`Navigated to ${title}`);
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

export default RouteAnnouncer;
