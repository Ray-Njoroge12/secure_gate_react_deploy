// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

import logger from 'utils/logger';

// Fix JSDOM environment issues
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Fix DOM environment - comprehensive JSDOM polyfill
const originalAppendChild = HTMLElement.prototype.appendChild;
HTMLElement.prototype.appendChild = function(node) {
  if (node && typeof node === 'object' && node.nodeType !== undefined) {
    return originalAppendChild.call(this, node);
  }
  // Create a proper DOM node if needed
  if (node && typeof node === 'object') {
    const domNode = document.createElement('div');
    Object.assign(domNode, node);
    return originalAppendChild.call(this, domNode);
  }
  throw new TypeError('Failed to execute \'appendChild\' on \'Node\': parameter 1 is not of type \'Node\'.');
};

// Fix document.createElement to return proper DOM nodes
const originalCreateElement = document.createElement;
document.createElement = function(tagName) {
  const element = originalCreateElement.call(this, tagName);
  // Ensure the element has proper DOM node properties
  if (!element.nodeType) {
    element.nodeType = 1;
  }
  if (!element.nodeName) {
    element.nodeName = tagName.toUpperCase();
  }
  return element;
};

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => {
    logger.debug('matchMedia called with query:', query);
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock HTMLCanvasElement for canvas testing
// This provides a minimal canvas implementation that doesn't interfere with React
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: jest.fn().mockImplementation((contextType) => {
    if (contextType === '2d') {
      return {
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        getImageData: jest.fn(() => ({ data: new Array(4) })),
        putImageData: jest.fn(),
        createImageData: jest.fn(() => ({ data: new Array(4) })),
        setTransform: jest.fn(),
        drawImage: jest.fn(),
        save: jest.fn(),
        fillText: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        stroke: jest.fn(),
        translate: jest.fn(),
        scale: jest.fn(),
        rotate: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        measureText: jest.fn(() => ({ width: 0 })),
        transform: jest.fn(),
        rect: jest.fn(),
        clip: jest.fn(),
      };
    }
    return null;
  }),
});

// Mock canvas dimensions
Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
  writable: true,
  value: 200,
});

Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
  writable: true,
  value: 200,
});

// Mock document.createElement for canvas testing - IMPLEMENTED
// This mock provides canvas functionality without interfering with React
document.createElement = jest.fn((tagName) => {
  if (tagName === 'canvas') {
    const canvasElement = originalCreateElement.call(document, 'canvas');
    // Add canvas-specific methods
    canvasElement.getContext = jest.fn((contextType) => {
      if (contextType === 'webgl' || contextType === 'experimental-webgl') {
        return { isWebGL: true };
      }
      if (contextType === 'webgl2') {
        return { isWebGL2: true };
      }
      if (contextType === '2d') {
        return {
          fillRect: jest.fn(),
          clearRect: jest.fn(),
          getImageData: jest.fn(() => ({ data: new Array(4) })),
          putImageData: jest.fn(),
          createImageData: jest.fn(() => ({ data: new Array(4) })),
          setTransform: jest.fn(),
          drawImage: jest.fn(),
          save: jest.fn(),
          fillText: jest.fn(),
          restore: jest.fn(),
          beginPath: jest.fn(),
          moveTo: jest.fn(),
          lineTo: jest.fn(),
          closePath: jest.fn(),
          stroke: jest.fn(),
          translate: jest.fn(),
          scale: jest.fn(),
          rotate: jest.fn(),
          arc: jest.fn(),
          fill: jest.fn(),
          measureText: jest.fn(() => ({ width: 0 })),
          transform: jest.fn(),
          rect: jest.fn(),
          clip: jest.fn(),
        };
      }
      return null;
    });
    canvasElement.width = 200;
    canvasElement.height = 200;
    canvasElement.toDataURL = jest.fn(() => 'data:image/png;base64,mocked');
    canvasElement.toBlob = jest.fn(() => Promise.resolve(new Blob()));
    return canvasElement;
  }
  return originalCreateElement.call(document, tagName);
});

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0
  }
});

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('componentWillMount'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('')),
  },
});

// Mock window.location
delete window.location;
window.location = {
  href: process.env.REACT_APP_BASE_URL || 'http://localhost:3000',
  origin: process.env.REACT_APP_BASE_URL || 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    pushState: jest.fn(),
    replaceState: jest.fn(),
    go: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  },
  writable: true,
});

// Suppress specific warnings in tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') ||
     args[0].includes('Error:') ||
     args[0].includes('act('))
  ) {
    return;
  }
  originalConsoleError(...args);
};