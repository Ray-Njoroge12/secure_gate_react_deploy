let appNavigator = null;

export const setAppNavigator = (navigator) => {
  appNavigator = navigator;
};

export const clearAppNavigator = () => {
  appNavigator = null;
};

export const navigateTo = (path, { replace = false, state = null } = {}) => {
  if (appNavigator) {
    appNavigator(path, { replace, state });
    return;
  }
  window.location.assign(path);
};

export const getAppNavigator = () => appNavigator;
