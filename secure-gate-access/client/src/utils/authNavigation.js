let authNavigator = null;

export const setAuthNavigator = (navigator) => {
  authNavigator = navigator;
};

export const clearAuthNavigator = () => {
  authNavigator = null;
};

export const navigateToLogin = ({ search = '', state = null, replace = true } = {}) => {
  const path = `/login${search}`;
  if (authNavigator) {
    authNavigator(path, { replace, state });
    return;
  }
  window.location.assign(path);
};

export const navigateToEstateRequired = ({ code, replace = true } = {}) => {
  const params = new URLSearchParams();
  if (code) {
    params.set('code', code);
  }
  const query = params.toString();
  const path = query ? `/estate-required?${query}` : '/estate-required';
  if (authNavigator) {
    authNavigator(path, { replace });
    return;
  }
  window.location.assign(path);
};

export const getAuthNavigator = () => authNavigator;
