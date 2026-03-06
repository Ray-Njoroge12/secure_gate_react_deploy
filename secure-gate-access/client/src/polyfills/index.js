// Polyfills for cross-browser compatibility
// Import this file at the top of your main entry point

// Promise is natively supported in all target browsers (Chrome 60+, Safari 12+).

// Fetch is natively supported in all target browsers. Axios is the primary API client.

// URL/URLSearchParams are natively supported in all target browsers.

// Intersection Observer polyfill
if (!window.IntersectionObserver) {
  import('intersection-observer');
}

// Resize Observer polyfill
if (!window.ResizeObserver) {
  import('resize-observer-polyfill');
}

// Custom Event polyfill for older browsers
if (!window.CustomEvent) {
  (function () {
    function CustomEvent(event, params) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      const evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    }
    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;
  })();
}

// Object.assign polyfill for older browsers
if (!Object.assign) {
  Object.assign = function (target) {
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    const to = Object(target);
    for (let index = 1; index < arguments.length; index++) {
      const nextSource = arguments[index];
      if (nextSource != null) {
        for (const nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

// Array.from polyfill for older browsers
if (!Array.from) {
  Array.from = function (arrayLike, mapFn, thisArg) {
    const C = this;
    const items = Object(arrayLike);
    if (arrayLike == null) {
      throw new TypeError('Array.from requires an array-like object - not null or undefined');
    }
    const mapFunction = mapFn !== undefined ? mapFn : false;
    let T;
    if (typeof mapFunction !== 'undefined') {
      if (typeof mapFunction !== 'function') {
        throw new TypeError('Array.from: when provided, the second argument must be a function');
      }
      if (arguments.length > 2) {
        T = thisArg;
      }
    }
    const len = parseInt(items.length) || 0;
    const A = typeof C === 'function' ? Object(new C(len)) : new Array(len);
    let k = 0;
    let kValue;
    while (k < len) {
      kValue = items[k];
      if (mapFunction) {
        A[k] = typeof T === 'undefined' ? mapFunction(kValue, k) : mapFunction.call(T, kValue, k);
      } else {
        A[k] = kValue;
      }
      k += 1;
    }
    A.length = len;
    return A;
  };
}

// Array.includes polyfill for older browsers
if (!Array.prototype.includes) {
  Array.prototype.includes = function (searchElement, fromIndex) {
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }
    const O = Object(this);
    const len = parseInt(O.length) || 0;
    if (len === 0) {
      return false;
    }
    const n = parseInt(fromIndex) || 0;
    let k = n >= 0 ? n : Math.max(len + n, 0);
    while (k < len) {
      if (O[k] === searchElement) {
        return true;
      }
      k++;
    }
    return false;
  };
}

// String.includes polyfill for older browsers
if (!String.prototype.includes) {
  String.prototype.includes = function (search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// String.startsWith polyfill for older browsers
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function (searchString, position) {
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

// String.endsWith polyfill for older browsers
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function (searchString, length) {
    if (length === undefined || length > this.length) {
      length = this.length;
    }
    return this.substring(length - searchString.length, length) === searchString;
  };
}

// Number.isNaN polyfill for older browsers
if (!Number.isNaN) {
  Number.isNaN = function (value) {
    return typeof value === 'number' && isNaN(value);
  };
}

// Number.isFinite polyfill for older browsers
if (!Number.isFinite) {
  Number.isFinite = function (value) {
    return typeof value === 'number' && isFinite(value);
  };
}

// Object.values polyfill for older browsers
if (!Object.values) {
  Object.values = function (obj) {
    if (obj !== Object(obj)) {
      throw new TypeError('Object.values called on a non-object');
    }
    const val = [];
    let key;
    for (key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        val.push(obj[key]);
      }
    }
    return val;
  };
}

// Object.entries polyfill for older browsers
if (!Object.entries) {
  Object.entries = function (obj) {
    if (obj !== Object(obj)) {
      throw new TypeError('Object.entries called on a non-object');
    }
    const entries = [];
    let key;
    for (key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        entries.push([key, obj[key]]);
      }
    }
    return entries;
  };
}

// CSS.supports polyfill for older browsers
if (!window.CSS || !CSS.supports) {
  window.CSS = window.CSS || {};
  CSS.supports = function (property, value) {
    if (arguments.length === 1) {
      return CSS.supports(property);
    }
    const style = document.createElement('div').style;
    style[property] = value;
    return style[property] === value;
  };
}

// requestAnimationFrame polyfill for older browsers
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = function (callback) {
    return window.setTimeout(callback, 1000 / 60);
  };
}

// cancelAnimationFrame polyfill for older browsers
if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = function (id) {
    window.clearTimeout(id);
  };
}

// console polyfill for older browsers
if (!window.console) {
  window.console = {
    log: function () { },
    warn: function () { },
    error: function () { },
    info: function () { },
    debug: function () { }
  };
}

// localStorage polyfill for older browsers
if (!window.localStorage) {
  (function () {
    const storage = {};
    window.localStorage = {
      getItem: function (key) {
        return storage[key] || null;
      },
      setItem: function (key, value) {
        storage[key] = value;
      },
      removeItem: function (key) {
        delete storage[key];
      },
      clear: function () {
        Object.keys(storage).forEach(key => delete storage[key]);
      },
      length: 0,
      key: function (index) {
        const keys = Object.keys(storage);
        return keys[index] || null;
      }
    };
  })();
}

// sessionStorage polyfill for older browsers
if (!window.sessionStorage) {
  (function () {
    const storage = {};
    window.sessionStorage = {
      getItem: function (key) {
        return storage[key] || null;
      },
      setItem: function (key, value) {
        storage[key] = value;
      },
      removeItem: function (key) {
        delete storage[key];
      },
      clear: function () {
        Object.keys(storage).forEach(key => delete storage[key]);
      },
      length: 0,
      key: function (index) {
        const keys = Object.keys(storage);
        return keys[index] || null;
      }
    };
  })();
}

// Export polyfills
export default {
  // Check if polyfills are loaded
  isLoaded: true,

  // Get list of loaded polyfills
  getLoadedPolyfills() {
    const polyfills = [];

    if (window.Promise) polyfills.push('Promise');
    if (window.fetch) polyfills.push('Fetch');
    if (window.URL && window.URLSearchParams) polyfills.push('URL');
    if (window.IntersectionObserver) polyfills.push('IntersectionObserver');
    if (window.ResizeObserver) polyfills.push('ResizeObserver');
    if (window.CustomEvent) polyfills.push('CustomEvent');
    if (Object.assign) polyfills.push('Object.assign');
    if (Array.from) polyfills.push('Array.from');
    if (Array.prototype.includes) polyfills.push('Array.includes');
    if (String.prototype.includes) polyfills.push('String.includes');
    if (String.prototype.startsWith) polyfills.push('String.startsWith');
    if (String.prototype.endsWith) polyfills.push('String.endsWith');
    if (Number.isNaN) polyfills.push('Number.isNaN');
    if (Number.isFinite) polyfills.push('Number.isFinite');
    if (Object.values) polyfills.push('Object.values');
    if (Object.entries) polyfills.push('Object.entries');
    if (CSS.supports) polyfills.push('CSS.supports');
    if (window.requestAnimationFrame) polyfills.push('requestAnimationFrame');
    if (window.cancelAnimationFrame) polyfills.push('cancelAnimationFrame');
    if (window.console) polyfills.push('Console');
    if (window.localStorage) polyfills.push('localStorage');
    if (window.sessionStorage) polyfills.push('sessionStorage');

    return polyfills;
  }
};

