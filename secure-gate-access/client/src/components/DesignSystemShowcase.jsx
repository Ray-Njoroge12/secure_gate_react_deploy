// Design System Showcase Component
// Demonstrates all design system components and tokens

import React, { useState } from 'react';
import { Card, Button, Input, Badge, Modal } from './ui';
import { theme } from '../styles/tokens';

const DesignSystemShowcase = () => {
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-100 mb-4">
            Secure Gate Access Design System
          </h1>
          <p className="text-xl text-slate-400">
            Comprehensive design tokens and component library
          </p>
        </div>

        {/* Color Palette */}
        <Card>
          <Card.Header>
            <Card.Title>Color Palette</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Brand Colors */}
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Brand Colors</h3>
                <div className="space-y-2">
                  {Object.entries(theme.colors.brand).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-md border border-slate-600"
                        style={{ backgroundColor: value }}
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-200">brand-{key}</div>
                        <div className="text-xs text-slate-400 font-mono">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Neutral Colors */}
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Neutral Colors</h3>
                <div className="space-y-2">
                  {Object.entries(theme.colors.slate).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-md border border-slate-600"
                        style={{ backgroundColor: value }}
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-200">slate-{key}</div>
                        <div className="text-xs text-slate-400 font-mono">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Semantic Colors */}
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Semantic Colors</h3>
                <div className="space-y-2">
                  {Object.entries({
                    success: theme.colors.success[500],
                    warning: theme.colors.warning[500],
                    error: theme.colors.error[500],
                    info: theme.colors.info[500],
                  }).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-md border border-slate-600"
                        style={{ backgroundColor: value }}
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-200 capitalize">{key}</div>
                        <div className="text-xs text-slate-400 font-mono">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Typography */}
        <Card>
          <Card.Header>
            <Card.Title>Typography</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-6">
              {/* Font Sizes */}
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Font Sizes</h3>
                <div className="space-y-3">
                  {Object.entries(theme.typography.fontSize).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-4">
                      <div className="w-16 text-sm text-slate-400 font-mono">{key}</div>
                      <div 
                        className="text-slate-200"
                        style={{ fontSize: value[0], lineHeight: value[1].lineHeight }}
                      >
                        The quick brown fox jumps over the lazy dog
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Font Weights */}
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Font Weights</h3>
                <div className="space-y-2">
                  {Object.entries(theme.typography.fontWeight).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-slate-400 font-mono">{key}</div>
                      <div 
                        className="text-slate-200"
                        style={{ fontWeight: value }}
                      >
                        The quick brown fox jumps over the lazy dog
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Spacing Scale */}
        <Card>
          <Card.Header>
            <Card.Title>Spacing Scale</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <p className="text-slate-400">Based on 4px base unit</p>
              <div className="space-y-2">
                {Object.entries(theme.spacing).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-4">
                    <div className="w-16 text-sm text-slate-400 font-mono">{key}</div>
                    <div className="w-20 text-sm text-slate-400 font-mono">{value}</div>
                    <div 
                      className="bg-brand-500 h-4"
                      style={{ width: value }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Component Examples */}
        <Card>
          <Card.Header>
            <Card.Title>Component Examples</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Buttons */}
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Buttons</h3>
                <div className="space-y-3">
                  <Button variant="primary" size="sm">Small Primary</Button>
                  <Button variant="primary" size="md">Medium Primary</Button>
                  <Button variant="primary" size="lg">Large Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                  <Button variant="primary" loading>Loading</Button>
                </div>
              </div>

              {/* Inputs */}
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Inputs</h3>
                <div className="space-y-3">
                  <Input
                    label="Text Input"
                    placeholder="Enter text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  <Input
                    label="Email Input"
                    type="email"
                    placeholder="Enter email"
                  />
                  <Input
                    label="Password Input"
                    type="password"
                    placeholder="Enter password"
                  />
                  <Input
                    label="Input with Error"
                    error="This field is required"
                    placeholder="Enter text"
                  />
                </div>
              </div>

              {/* Badges */}
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Badges</h3>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">Info</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="error">Error</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" size="sm">Small</Badge>
                    <Badge variant="outline" size="md">Medium</Badge>
                    <Badge variant="outline" size="lg">Large</Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Shadows and Elevation */}
        <Card>
          <Card.Header>
            <Card.Title>Shadows and Elevation</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(theme.shadows).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div 
                    className="w-24 h-24 bg-slate-800 rounded-lg mx-auto mb-2"
                    style={{ boxShadow: value }}
                  />
                  <div className="text-sm text-slate-400 font-mono">{key}</div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>

        {/* Border Radius */}
        <Card>
          <Card.Header>
            <Card.Title>Border Radius</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(theme.borderRadius).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div 
                    className="w-16 h-16 bg-brand-500 mx-auto mb-2"
                    style={{ borderRadius: value }}
                  />
                  <div className="text-sm text-slate-400 font-mono">{key}</div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>

        {/* Modal Example */}
        <Card>
          <Card.Header>
            <Card.Title>Modal Example</Card.Title>
          </Card.Header>
          <Card.Content>
            <Button onClick={() => setShowModal(true)}>
              Open Modal
            </Button>
          </Card.Content>
        </Card>

        {/* Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Design System Modal"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-slate-600">
              This modal demonstrates the design system's modal component with consistent styling.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowModal(false)}>
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default DesignSystemShowcase;
