/**
 * JSDoc configuration for Secure Gate Access
 * @description Configuration for generating comprehensive API documentation
 */

module.exports = {
  source: {
    include: [
      './src/',
      './README.md'
    ],
    includePattern: '\\.(js|jsx)$',
    exclude: [
      'node_modules/',
      'build/',
      'dist/',
      'coverage/',
      'tests/',
      '*.test.js',
      '*.test.jsx',
      '*.spec.js',
      '*.spec.jsx'
    ]
  },
  plugins: [
    'plugins/markdown',
    'plugins/summarize'
  ],
  opts: {
    destination: './docs/jsdoc/',
    recurse: true,
    template: 'node_modules/docdash'
  },
  templates: {
    docdash: {
      static: true,
      sort: true,
      search: true,
      collapse: true,
      wrap: true,
      typedefs: true,
      removeQuotes: 'all',
      menu: {
        'Project': {
          'Home': 'index.html',
          'API': 'api.html',
          'Components': 'components.html',
          'Hooks': 'hooks.html',
          'Utils': 'utils.html'
        }
      }
    }
  },
  markdown: {
    idHeadings: true
  },
  tags: {
    allowUnknownTags: true,
    dictionaries: [
      'jsdoc',
      'closure'
    ]
  },
  sourceType: 'module',
  ecmaFeatures: {
    jsx: true,
    modules: true
  }
};

