import { browserDetection } from '../../utils/browserDetection';

describe('browserDetection feature support caching', () => {
  let originalCSS;

  beforeEach(() => {
    jest.restoreAllMocks();
    browserDetection.clearFeatureSupportCache();

    originalCSS = global.CSS;
    if (!global.CSS) {
      global.CSS = { supports: () => false };
    } else if (typeof global.CSS.supports !== 'function') {
      global.CSS.supports = () => false;
    }
  });

  afterEach(() => {
    global.CSS = originalCSS;
    browserDetection.clearFeatureSupportCache();
  });

  test('reuses cached feature support and avoids repeated WebGL probing', () => {
    const nativeCreateElement = document.createElement.bind(document);
    const getContextMock = jest.fn((kind) => {
      if (kind === 'webgl' || kind === 'webgl2' || kind === '2d' || kind === 'experimental-webgl') {
        return {};
      }
      return null;
    });

    jest.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = nativeCreateElement(tagName, options);
      if (String(tagName).toLowerCase() === 'canvas') {
        Object.defineProperty(element, 'getContext', {
          configurable: true,
          value: getContextMock
        });
      }
      return element;
    });

    const firstSupport = browserDetection.getFeatureSupport();
    const callsAfterFirstProbe = getContextMock.mock.calls.length;

    const secondSupport = browserDetection.getFeatureSupport();

    expect(secondSupport).toBe(firstSupport);
    expect(getContextMock.mock.calls.length).toBe(callsAfterFirstProbe);
  });

  test('clearFeatureSupportCache forces a fresh probe', () => {
    const nativeCreateElement = document.createElement.bind(document);
    const getContextMock = jest.fn(() => ({}));

    jest.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = nativeCreateElement(tagName, options);
      if (String(tagName).toLowerCase() === 'canvas') {
        Object.defineProperty(element, 'getContext', {
          configurable: true,
          value: getContextMock
        });
      }
      return element;
    });

    browserDetection.getFeatureSupport();
    const firstProbeCalls = getContextMock.mock.calls.length;

    browserDetection.clearFeatureSupportCache();
    browserDetection.getFeatureSupport();

    expect(getContextMock.mock.calls.length).toBeGreaterThan(firstProbeCalls);
  });
});
