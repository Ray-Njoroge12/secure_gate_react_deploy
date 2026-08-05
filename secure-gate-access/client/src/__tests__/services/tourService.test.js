import {
  startTour,
  resetTour,
  isTourCompleted,
  shouldOfferTour,
  destroyActiveTour,
} from '../../services/tourService';

const mockCreateDriver = jest.fn();

let lastDriverOptions;
let isLastStep = false;

jest.mock('../../tours', () => ({
  createDriver: (...args) => mockCreateDriver(...args),
  residentTourSteps: [{ element: '[data-tour="dashboard-stats"]' }],
  guardTourSteps: [{ element: '[data-tour="guard-dashboard-kpis"]' }],
  adminTourSteps: [{ element: '[data-tour="admin-dashboard"]' }],
  visitorTourSteps: [{ element: '[data-tour="visitor-dashboard"]' }],
}));

const TOUR_COMPLETED_KEY = 'securegate-tour-completed-resident';
const TOUR_SKIPPED_KEY = 'securegate-tour-skipped-resident';

describe('tourService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    isLastStep = false;

    mockCreateDriver.mockImplementation((_steps, options = {}) => {
      lastDriverOptions = options;
      return {
        drive: jest.fn(),
        destroy: jest.fn(() => {
          if (options.onDestroyed) {
            options.onDestroyed();
          }
        }),
        isLastStep: jest.fn(() => isLastStep),
      };
    });
  });

  afterEach(() => {
    destroyActiveTour();
  });

  test('marks tour as skipped (not completed) when user dismisses early', () => {
    startTour('resident');
    lastDriverOptions.onDestroyStarted();

    expect(localStorage.getItem(TOUR_COMPLETED_KEY)).toBeNull();
    expect(localStorage.getItem(TOUR_SKIPPED_KEY)).toBe('pending');
  });

  test('marks tour as completed and clears skipped state on final step', () => {
    localStorage.setItem(TOUR_SKIPPED_KEY, 'pending');
    isLastStep = true;

    startTour('resident');
    lastDriverOptions.onDestroyStarted();

    expect(localStorage.getItem(TOUR_COMPLETED_KEY)).toBe('completed');
    expect(localStorage.getItem(TOUR_SKIPPED_KEY)).toBeNull();
    expect(isTourCompleted('resident')).toBe(true);
  });

  test('re-offers skipped tour once, then stops auto-offering after second skip', () => {
    startTour('resident');
    lastDriverOptions.onDestroyStarted();

    expect(shouldOfferTour('resident')).toBe(true);
    expect(localStorage.getItem(TOUR_SKIPPED_KEY)).toBe('reoffered');

    startTour('resident');
    lastDriverOptions.onDestroyStarted();

    expect(localStorage.getItem(TOUR_SKIPPED_KEY)).toBe('done');
    expect(shouldOfferTour('resident')).toBe(false);
  });

  test('resetTour clears both completion and skipped keys', () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'completed');
    localStorage.setItem(TOUR_SKIPPED_KEY, 'done');

    resetTour('resident');

    expect(localStorage.getItem(TOUR_COMPLETED_KEY)).toBeNull();
    expect(localStorage.getItem(TOUR_SKIPPED_KEY)).toBeNull();
  });
});
