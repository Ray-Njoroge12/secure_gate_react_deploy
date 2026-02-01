/**
 * @fileoverview Notification Context adapter
 * @description Wraps ToastContext to provide useNotification hook
 * expected by collaboration components.
 */

import { useToast } from './ToastContext.jsx';

export const useNotification = () => {
  const toast = useToast();
  return {
    notify: (message, type = 'info') => {
      if (type === 'error') toast.error(message);
      else if (type === 'success') toast.success(message);
      else if (type === 'warning') toast.warning(message);
      else toast.info(message);
    },
    success: (message) => toast.success(message),
    error: (message) => toast.error(message),
    warning: (message) => toast.warning(message),
    info: (message) => toast.info(message),
  };
};
