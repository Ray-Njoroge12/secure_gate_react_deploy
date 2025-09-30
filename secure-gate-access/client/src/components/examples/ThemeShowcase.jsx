// client/src/components/examples/ThemeShowcase.jsx
// Comprehensive showcase of all themed components for testing and documentation

import React, { memo, useState } from 'react';
import { Button, Input, Card, Badge, Toast } from '../ui';
import { BrandHeader } from '../BrandHeader.jsx';
import { themeClass, combineStyles, getEstateBranding } from '../../utils/themeIntegration.js';

const ThemeShowcase = memo(() => {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState('success');
  
  const estateBranding = getEstateBranding('SecureGate');

  return (
    <div className={`min-h-screen ${themeClass.bg.primary} p-8`}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="space-y-4">
          <h1 className={`text-4xl font-bold ${themeClass.text.primary}`}>
            Theme System Showcase
          </h1>
          <p className={themeClass.text.secondary}>
            Comprehensive display of all themed components and their variants
          </p>
        </div>

        {/* Brand Header Showcase */}
        <Card>
          <Card.Header>
            <h2 className="text-xl font-semibold">Brand Header Component</h2>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Default Variant</h3>
                <BrandHeader />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Compact Variant</h3>
                <BrandHeader variant="compact" />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Minimal Variant</h3>
                <BrandHeader variant="minimal" />
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Button Showcase */}
        <Card>
          <Card.Header>
            <h2 className="text-xl font-semibold">Button Variants</h2>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Primary Buttons */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Primary Buttons</h3>
                <div className="space-y-2">
                  <Button variant="primary" size="xs">Extra Small</Button>
                  <Button variant="primary" size="sm">Small</Button>
                  <Button variant="primary" size="md">Medium</Button>
                  <Button variant="primary" size="lg">Large</Button>
                  <Button variant="primary" size="xl">Extra Large</Button>
                </div>
              </div>

              {/* Secondary Buttons */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Secondary Buttons</h3>
                <div className="space-y-2">
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                </div>
              </div>

              {/* Button States */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Button States</h3>
                <div className="space-y-2">
                  <Button variant="primary">Normal</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                  <Button variant="primary" loading>Loading</Button>
                </div>
              </div>

            </div>
          </Card.Content>
        </Card>

        {/* Input Showcase */}
        <Card>
          <Card.Header>
            <h2 className="text-xl font-semibold">Input Components</h2>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                <Input
                  label="Standard Input"
                  placeholder="Enter text here"
                  helperText="This is a helper text"
                />
                <Input
                  label="Email Input"
                  type="email"
                  placeholder="user@example.com"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  }
                />
              </div>

              <div className="space-y-4">
                <Input
                  label="Error State"
                  error="This field is required"
                  placeholder="Error example"
                />
                <Input
                  label="Success State"
                  success="Valid input"
                  placeholder="Success example"
                  defaultValue="Valid input text"
                />
              </div>

            </div>
          </Card.Content>
        </Card>

        {/* Badge Showcase */}
        <Card>
          <Card.Header>
            <h2 className="text-xl font-semibold">Badge Components</h2>
          </Card.Header>
          <Card.Content>
            <div className="flex flex-wrap gap-3">
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="neutral">Neutral</Badge>
            </div>
          </Card.Content>
        </Card>

        {/* Status Indicators */}
        <Card>
          <Card.Header>
            <h2 className="text-xl font-semibold">Status Indicators</h2>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                <span className={themeClass.text.primary}>Online</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-secondary-500"></div>
                <span className={themeClass.text.primary}>Offline</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className={themeClass.text.primary}>Busy</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className={themeClass.text.primary}>Away</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className={themeClass.text.primary}>Error</span>
              </div>

            </div>
          </Card.Content>
        </Card>

        {/* Toast Showcase */}
        <Card>
          <Card.Header>
            <h2 className="text-xl font-semibold">Toast Notifications</h2>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => {
                    setToastType('success');
                    setToastVisible(true);
                    setTimeout(() => setToastVisible(false), 3000);
                  }}
                  variant="primary"
                >
                  Show Success Toast
                </Button>
                <Button 
                  onClick={() => {
                    setToastType('error');
                    setToastVisible(true);
                    setTimeout(() => setToastVisible(false), 3000);
                  }}
                  variant="danger"
                >
                  Show Error Toast
                </Button>
                <Button 
                  onClick={() => {
                    setToastType('warning');
                    setToastVisible(true);
                    setTimeout(() => setToastVisible(false), 3000);
                  }}
                  variant="outline"
                >
                  Show Warning Toast
                </Button>
                <Button 
                  onClick={() => {
                    setToastType('info');
                    setToastVisible(true);
                    setTimeout(() => setToastVisible(false), 3000);
                  }}
                  variant="secondary"
                >
                  Show Info Toast
                </Button>
              </div>
              
              {toastVisible && (
                <Toast
                  type={toastType}
                  message={`This is a ${toastType} toast notification example`}
                  onClose={() => setToastVisible(false)}
                />
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Typography Scale */}
        <Card>
          <Card.Header>
            <h2 className="text-xl font-semibold">Typography Scale</h2>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div className="space-y-2">
              <h1 className={`text-4xl font-bold ${themeClass.text.primary}`}>Heading 1 (4xl)</h1>
              <h2 className={`text-3xl font-bold ${themeClass.text.primary}`}>Heading 2 (3xl)</h2>
              <h3 className={`text-2xl font-semibold ${themeClass.text.primary}`}>Heading 3 (2xl)</h3>
              <h4 className={`text-xl font-semibold ${themeClass.text.primary}`}>Heading 4 (xl)</h4>
              <h5 className={`text-lg font-medium ${themeClass.text.primary}`}>Heading 5 (lg)</h5>
              <h6 className={`text-base font-medium ${themeClass.text.primary}`}>Heading 6 (base)</h6>
            </div>
            
            <div className="space-y-2 pt-4 border-t border-secondary-700">
              <p className={`text-base ${themeClass.text.primary}`}>
                Body text (base) - This is regular body text with normal weight
              </p>
              <p className={`text-sm ${themeClass.text.secondary}`}>
                Secondary text (sm) - This is smaller secondary text
              </p>
              <p className={`text-xs ${themeClass.text.muted}`}>
                Muted text (xs) - This is the smallest muted text
              </p>
            </div>
          </Card.Content>
        </Card>

        {/* Color Palette */}
        <Card>
          <Card.Header>
            <h2 className="text-xl font-semibold">Color Palette</h2>
          </Card.Header>
          <Card.Content>
            <div className="space-y-6">
              
              {/* Primary Colors */}
              <div>
                <h3 className="text-sm font-medium mb-3">Primary Colors</h3>
                <div className="grid grid-cols-10 gap-2">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(shade => (
                    <div key={shade} className="text-center">
                      <div className={`w-full h-12 rounded bg-primary-${shade} mb-1`}></div>
                      <span className="text-xs text-secondary-400">{shade}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secondary Colors */}
              <div>
                <h3 className="text-sm font-medium mb-3">Secondary Colors</h3>
                <div className="grid grid-cols-10 gap-2">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(shade => (
                    <div key={shade} className="text-center">
                      <div className={`w-full h-12 rounded bg-secondary-${shade} mb-1`}></div>
                      <span className="text-xs text-secondary-400">{shade}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accent Colors */}
              <div>
                <h3 className="text-sm font-medium mb-3">Accent Colors</h3>
                <div className="grid grid-cols-10 gap-2">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(shade => (
                    <div key={shade} className="text-center">
                      <div className={`w-full h-12 rounded bg-accent-${shade} mb-1`}></div>
                      <span className="text-xs text-secondary-400">{shade}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </Card.Content>
        </Card>

      </div>
    </div>
  );
});

export default ThemeShowcase;