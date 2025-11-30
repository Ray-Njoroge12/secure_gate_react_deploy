import { generateRealisticVisitor, generateRealisticTimestamp } from '../helpers/mockData.enhanced.js';

export function createVisitorLifecycle(options = {}) {
  const baseVisitor = generateRealisticVisitor(options);

  const invitedAt = generateRealisticTimestamp('past');
  const approvedAt = generateRealisticTimestamp('recent');
  const checkedInAt = generateRealisticTimestamp('present');

  return {
    ...baseVisitor,
    status: options.status || 'checked-in',
    lifecycle: {
      invitedAt,
      approvedAt,
      checkedInAt
    }
  };
}

export function createRecurringVisitor(options = {}) {
  const baseVisitor = generateRealisticVisitor(options);
  const visits = options.visitsCount || 3;

  const history = Array.from({ length: visits }, () =>
    generateRealisticTimestamp('past')
  );

  return {
    ...baseVisitor,
    recurrence: {
      visits,
      history
    }
  };
}

export const testVisitors = [
  generateRealisticVisitor({ status: 'invited' }),
  generateRealisticVisitor({ status: 'approved' }),
  generateRealisticVisitor({ status: 'checked-in' })
];

export default {
  createVisitorLifecycle,
  createRecurringVisitor,
  testVisitors
};
