import { useEffect } from 'react';

import { useToast } from '../../contexts/ToastContext';

/**
 * Listens for 'sync-conflict' CustomEvent (dispatched by background sync logic
 * when offline actions conflict with server state) and shows a toast notification.
 * Must be rendered inside ToastProvider.
 */
export default function SyncConflictListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e) => {
      const conflicts = e.detail?.conflicts || [];
      if (conflicts.length > 0) {
        toast.warning({
          title: 'Sync Conflicts Detected',
          message: `${conflicts.length} action(s) could not be synced. Some changes may have been overridden.`,
          duration: 10000
        });
      }
    };
    window.addEventListener('sync-conflict', handler);
    return () => window.removeEventListener('sync-conflict', handler);
  }, [toast]);

  return null;
}
