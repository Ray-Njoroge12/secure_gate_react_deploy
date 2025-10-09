/**
 * Design System Showcase
 * 
 * A comprehensive showcase component that demonstrates all aspects
 * of the SecureGate design system including colors, typography,
 * components, and usage examples.
 */

import React, { useState } from 'react';
import { tokens, componentTokens, guidelines } from './index';

const DesignSystemShowcase = () => {
  const [activeSection, setActiveSection] = useState('colors');

  const sections = [
    { id: 'colors', label: 'Colors', icon: '🎨' },
    { id: 'typography', label: 'Typography', icon: '📝' },
    { id: 'spacing', label: 'Spacing', icon: '📏' },
    { id: 'components', label: 'Components', icon: '🧩' },
    { id: 'guidelines', label: 'Guidelines', icon: '📋' },
  ];

  const ColorSwatch = ({ colorName, colorValue, description }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div 
        className="w-full h-16 rounded-md mb-3 border border-slate-600"
        style={{ backgroundColor: colorValue }}
      />
      <h4 className="text-sm font-semibold text-slate-50 mb-1">{colorName}</h4>
      <p className="text-xs text-slate-400 mb-2">{colorValue}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );

  const TypographyExample = ({ variant, size, weight, description }) => {
    const sizeClass = `text-${size}`;
    const weightClass = `font-${weight}`;
    
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className={`${sizeClass} ${weightClass} text-slate-50 mb-2`}>
          {variant} - {size} - {weight}
        </div>
        <p className="text-xs text-slate-400 mb-2">
          {tokens.typography.fontSize[size]?.[0] || 'N/A'} / {tokens.typography.fontWeight[weight] || 'N/A'}
        </p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    );
  };

  const SpacingExample = ({ size, value, description }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center mb-2">
        <div 
          className="bg-brand-500 rounded-sm"
          style={{ width: value, height: '16px' }}
        />
        <span className="ml-3 text-sm text-slate-50">{size}</span>
      </div>
      <p className="text-xs text-slate-400 mb-1">{value}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );

  const ButtonExample = ({ variant, size, label, description }) => {
    const baseClasses = "px-5 py-3 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900";
    
    const variantClasses = {
      primary: "bg-brand-500 hover:bg-brand-600 text-white",
      secondary: "bg-transparent hover:bg-slate-700 text-slate-300 border border-slate-600",
      danger: "bg-error-500 hover:bg-error-600 text-white",
      ghost: "bg-transparent hover:bg-slate-800 text-slate-400",
    };

    const sizeClasses = {
      sm: "px-3 py-2 text-sm",
      md: "px-5 py-3 text-base",
      lg: "px-6 py-4 text-lg",
    };

    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <button className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} mb-3`}>
          {label}
        </button>
        <h4 className="text-sm font-semibold text-slate-50 mb-1">{variant} - {size}</h4>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    );
  };

  const renderColors = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-slate-50 mb-4">Brand Colors</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(tokens.colors.brand).map(([shade, value]) => (
            <ColorSwatch
              key={shade}
              colorName={`Brand ${shade}`}
              colorValue={value}
              description={`Primary brand color shade ${shade}`}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-slate-50 mb-4">Semantic Colors</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch
            colorName="Success"
            colorValue={tokens.colors.success[500]}
            description="Success states and confirmations"
          />
          <ColorSwatch
            colorName="Warning"
            colorValue={tokens.colors.warning[500]}
            description="Warnings and cautions"
          />
          <ColorSwatch
            colorName="Error"
            colorValue={tokens.colors.error[500]}
            description="Errors and destructive actions"
          />
          <ColorSwatch
            colorName="Info"
            colorValue={tokens.colors.info[500]}
            description="Informational content"
          />
        </div>
      </div>
    </div>
  );

  const renderTypography = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-slate-50 mb-4">Font Sizes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(tokens.typography.fontSize).map(([size, value]) => (
            <TypographyExample
              key={size}
              variant="Heading"
              size={size}
              weight="semibold"
              description={`Font size ${size} - ${Array.isArray(value) ? value[0] : value}`}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-slate-50 mb-4">Font Weights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(tokens.typography.fontWeight).map(([weight, value]) => (
            <TypographyExample
              key={weight}
              variant="Text"
              size="base"
              weight={weight}
              description={`Font weight ${weight} - ${value}`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderSpacing = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-slate-50 mb-4">Spacing Scale (4px base unit)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(tokens.spacing).slice(0, 16).map(([size, value]) => (
            <SpacingExample
              key={size}
              size={size}
              value={value}
              description={`${size} spacing unit`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderComponents = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-slate-50 mb-4">Buttons</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ButtonExample
            variant="primary"
            size="md"
            label="Primary"
            description="Main actions and CTAs"
          />
          <ButtonExample
            variant="secondary"
            size="md"
            label="Secondary"
            description="Secondary actions"
          />
          <ButtonExample
            variant="danger"
            size="md"
            label="Danger"
            description="Destructive actions"
          />
          <ButtonExample
            variant="ghost"
            size="md"
            label="Ghost"
            description="Subtle actions"
          />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-slate-50 mb-4">Button Sizes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ButtonExample
            variant="primary"
            size="sm"
            label="Small"
            description="Compact interfaces"
          />
          <ButtonExample
            variant="primary"
            size="md"
            label="Medium"
            description="Standard size"
          />
          <ButtonExample
            variant="primary"
            size="lg"
            label="Large"
            description="Prominent actions"
          />
        </div>
      </div>
    </div>
  );

  const renderGuidelines = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-slate-50 mb-4">Design Principles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(guidelines.principles).map(([key, principle]) => (
            <div key={key} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-slate-50 mb-2">{principle.title}</h4>
              <p className="text-slate-300 mb-4">{principle.description}</p>
              <ul className="space-y-2">
                {principle.examples.map((example, index) => (
                  <li key={index} className="text-sm text-slate-400 flex items-start">
                    <span className="text-brand-500 mr-2">•</span>
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-slate-50 mb-4">Accessibility Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(guidelines.accessibility).map(([key, guideline]) => (
            <div key={key} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-slate-50 mb-2">{guideline.title}</h4>
              <p className="text-slate-300 mb-4">{guideline.description}</p>
              {guideline.requirements && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-slate-200 mb-2">Requirements:</h5>
                  <ul className="space-y-1">
                    {guideline.requirements.map((req, index) => (
                      <li key={index} className="text-sm text-slate-400 flex items-start">
                        <span className="text-brand-500 mr-2">•</span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'colors':
        return renderColors();
      case 'typography':
        return renderTypography();
      case 'spacing':
        return renderSpacing();
      case 'components':
        return renderComponents();
      case 'guidelines':
        return renderGuidelines();
      default:
        return renderColors();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="container-app py-6">
          <h1 className="text-3xl font-bold text-slate-50 mb-2">SecureGate Design System</h1>
          <p className="text-slate-300">A comprehensive design system for building accessible, responsive interfaces</p>
        </div>
      </div>

      <div className="container-app py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64">
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="mr-3">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignSystemShowcase;




