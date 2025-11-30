module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
    // Prevent console statements in production code
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    
    // Allow console in test files
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    
    // Import order rules
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],
    
    // Prevent unused variables
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    
    // Require consistent naming
    'react/jsx-pascal-case': 'warn',
    
    // Ensure hooks are called correctly
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  },
  overrides: [
    {
      // Allow console in test files
      files: ['**/*.test.js', '**/*.test.jsx', '**/__tests__/**'],
      rules: {
        'no-console': 'off'
      }
    },
    {
      // Allow console in utils/logger.js
      files: ['**/utils/logger.js'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
