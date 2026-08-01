module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
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
    'react-hooks/exhaustive-deps': 'warn',

    // --- UI/UX Consistency Rules ---

    // Discourage raw <button> elements — prefer the design-system <Button> component
    // from 'components/ui/Button'. Set to 'warn' to allow incremental migration.
    'no-restricted-elements': 'off', // Note: react/forbid-elements handles JSX
    'react/forbid-elements': ['warn', {
      forbid: [
        {
          element: 'button',
          message: 'Use the design-system <Button> component from "components/ui/Button" instead of raw <button> for consistent styling, sizing, and accessibility.'
        }
      ]
    }],

    // Discourage importing from @heroicons — use lucide-react via the unified Icon component
    'no-restricted-imports': ['error', {
      paths: [
        {
          name: '@heroicons/react/24/outline',
          message: 'Use lucide-react icons via the unified <Icon> component from "components/ui/Icon" instead.'
        },
        {
          name: '@heroicons/react/24/solid',
          message: 'Use lucide-react icons via the unified <Icon> component from "components/ui/Icon" instead.'
        },
        {
          name: '@heroicons/react/20/solid',
          message: 'Use lucide-react icons via the unified <Icon> component from "components/ui/Icon" instead.'
        }
      ]
    }],

    // Enforce accessible interactive elements
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
    'jsx-a11y/no-noninteractive-element-interactions': 'warn'
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
    },
    {
      // Feature-detected (if (!X.prototype.y)) polyfill shims must extend natives by design
      files: ['**/polyfills/index.js'],
      rules: {
        'no-extend-native': 'off'
      }
    },
    {
      // Allow raw <button> in the Button component definition itself
      files: ['**/components/ui/Button.jsx', '**/components/ui/Button.tsx'],
      rules: {
        'react/forbid-elements': 'off'
      }
    }
  ]
};
