import { describe, expect, it } from '@jest/globals';
import { PASS_STATUS } from '../../../src/constants/statuses.js';
import { validateVisitorTransition } from '../../../src/services/visitorStateService.js';

describe('visitorStateService', () => {
  it('allows valid transitions to on-premise', () => {
    const result = validateVisitorTransition(PASS_STATUS.PENDING, PASS_STATUS.ON_PREMISE);
    expect(result.valid).toBe(true);
  });

  it('allows on-premise to checked-out transition', () => {
    const result = validateVisitorTransition(PASS_STATUS.ON_PREMISE, PASS_STATUS.CHECKED_OUT);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid transitions', () => {
    const result = validateVisitorTransition(PASS_STATUS.CHECKED_OUT, PASS_STATUS.ON_PREMISE);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid visitor transition');
  });

  it('rejects unknown current status', () => {
    const result = validateVisitorTransition('mystery', PASS_STATUS.ON_PREMISE);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Unknown visitor status');
  });
});
