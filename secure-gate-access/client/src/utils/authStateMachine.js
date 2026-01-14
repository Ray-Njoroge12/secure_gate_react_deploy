export const AUTH_STATES = Object.freeze({
  UNKNOWN: 'unknown',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  REFRESHING: 'refreshing',
  ESTATE_REQUIRED: 'estate_required'
});

const listeners = new Set();

let currentState = {
  status: AUTH_STATES.UNKNOWN,
  reason: null,
  updatedAt: Date.now()
};

const notify = () => {
  listeners.forEach((listener) => listener(currentState));
};

export const authStateMachine = {
  getState: () => currentState,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  transition: (event, payload = {}) => {
    switch (event) {
      case 'AUTHENTICATED':
        currentState = {
          status: AUTH_STATES.AUTHENTICATED,
          reason: payload.reason || null,
          updatedAt: Date.now()
        };
        break;
      case 'UNAUTHENTICATED':
        currentState = {
          status: AUTH_STATES.UNAUTHENTICATED,
          reason: payload.reason || null,
          updatedAt: Date.now()
        };
        break;
      case 'REFRESH_START':
        currentState = {
          status: AUTH_STATES.REFRESHING,
          reason: payload.reason || null,
          updatedAt: Date.now()
        };
        break;
      case 'REFRESH_SUCCESS':
        currentState = {
          status: AUTH_STATES.AUTHENTICATED,
          reason: payload.reason || null,
          updatedAt: Date.now()
        };
        break;
      case 'REFRESH_FAILURE':
        currentState = {
          status: AUTH_STATES.UNAUTHENTICATED,
          reason: payload.reason || 'refresh_failed',
          updatedAt: Date.now()
        };
        break;
      case 'ESTATE_REQUIRED':
        currentState = {
          status: AUTH_STATES.ESTATE_REQUIRED,
          reason: payload.reason || payload.code || null,
          updatedAt: Date.now()
        };
        break;
      default:
        return;
    }

    notify();
  }
};
