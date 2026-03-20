import { authStateMachine, AUTH_STATES } from '../../utils/authStateMachine';

describe('authStateMachine', () => {
    // Helpers to reset state if needed, although state is module-scoped singleton
    // so we should rely on transitions to verify behavior.

    const initialState = { ...authStateMachine.getState() };

    it('should have correct initial state', () => {
        // Note: State might have changed due to other tests if running in parallel execution environments
        // but in unit tests, it should be isolated or at least deterministic.
        const state = authStateMachine.getState();
        expect(state.status).toBeDefined();
    });

    it('should transition to AUTHENTICATED', () => {
        const listener = jest.fn();
        const unsubscribe = authStateMachine.subscribe(listener);

        authStateMachine.transition('AUTHENTICATED', { reason: 'login' });

        const state = authStateMachine.getState();
        expect(state.status).toBe(AUTH_STATES.AUTHENTICATED);
        expect(state.reason).toBe('login');
        expect(listener).toHaveBeenCalledWith(state);

        unsubscribe();
    });

    it('should transition to UNAUTHENTICATED', () => {
        authStateMachine.transition('UNAUTHENTICATED', { reason: 'logout' });
        const state = authStateMachine.getState();
        expect(state.status).toBe(AUTH_STATES.UNAUTHENTICATED);
        expect(state.reason).toBe('logout');
    });

    it('should transition to REFRESHING on REFRESH_START', () => {
        authStateMachine.transition('REFRESH_START');
        const state = authStateMachine.getState();
        expect(state.status).toBe(AUTH_STATES.REFRESHING);
    });

    it('should transition to AUTHENTICATED on REFRESH_SUCCESS', () => {
        authStateMachine.transition('REFRESH_SUCCESS');
        const state = authStateMachine.getState();
        expect(state.status).toBe(AUTH_STATES.AUTHENTICATED);
    });

    it('should transition to UNAUTHENTICATED on REFRESH_FAILURE', () => {
        authStateMachine.transition('REFRESH_FAILURE');
        const state = authStateMachine.getState();
        expect(state.status).toBe(AUTH_STATES.UNAUTHENTICATED);
        expect(state.reason).toBe('refresh_failed');
    });

    it('should transition to ESTATE_REQUIRED', () => {
        authStateMachine.transition('ESTATE_REQUIRED', { code: 'ESTATE_INVALID' });
        const state = authStateMachine.getState();
        expect(state.status).toBe(AUTH_STATES.ESTATE_REQUIRED);
        expect(state.reason).toBe('ESTATE_INVALID');
    });

    it('should ignore invalid events', () => {
        const preState = authStateMachine.getState();
        authStateMachine.transition('INVALID_EVENT');
        const postState = authStateMachine.getState();
        expect(postState).toBe(preState); // Equality check for object reference might fail if not careful, but implementation doesn't change ref on default
        // Wait, the implementation returns on default, so state object is not replaced.
        // However, getState returns the variable 'currentState'.
        // If transition does not hit a case, it returns.
        expect(postState.updatedAt).toBe(preState.updatedAt);
    });

    // MFA_PENDING state tests
    it('AUTH_STATES.MFA_PENDING should equal "mfa_pending"', () => {
        expect(AUTH_STATES.MFA_PENDING).toBe('mfa_pending');
    });

    it('should transition to MFA_PENDING on MFA_REQUIRED event', () => {
        authStateMachine.transition('MFA_REQUIRED');
        const state = authStateMachine.getState();
        expect(state.status).toBe(AUTH_STATES.MFA_PENDING);
        expect(state.reason).toBeNull();
    });

    it('should transition to MFA_PENDING with reason payload', () => {
        authStateMachine.transition('MFA_REQUIRED', { reason: 'totp_required' });
        const state = authStateMachine.getState();
        expect(state.status).toBe(AUTH_STATES.MFA_PENDING);
        expect(state.reason).toBe('totp_required');
    });

    it('should transition from MFA_PENDING to AUTHENTICATED', () => {
        authStateMachine.transition('MFA_REQUIRED');
        expect(authStateMachine.getState().status).toBe(AUTH_STATES.MFA_PENDING);

        authStateMachine.transition('AUTHENTICATED', { reason: 'mfa_complete' });
        const state = authStateMachine.getState();
        expect(state.status).toBe(AUTH_STATES.AUTHENTICATED);
        expect(state.reason).toBe('mfa_complete');
    });
});
