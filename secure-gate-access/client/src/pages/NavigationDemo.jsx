/**
 * Navigation Demo Page
 * 
 * A comprehensive demonstration of all navigation features including:
 * - Enhanced breadcrumbs
 * - Navigation flow
 * - Navigation analytics
 * - Keyboard navigation
 * - Mobile responsiveness
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  EnhancedBreadcrumbs, 
  NavigationFlow, 
  NavigationAnalytics,
  Card,
  Button 
} from '../components/ui';
import { useNavigation, useBreadcrumbs } from '../contexts/NavigationContext';

const NavigationDemo = () => {
  const navigate = useNavigate();
  const { 
    breadcrumbs, 
    navigationHistory, 
    currentRoute, 
    getNavigationAnalytics,
    navigateTo 
  } = useNavigation();
  
  const { addBreadcrumb, updateBreadcrumb } = useBreadcrumbs();
  
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState(null);

  // Demo navigation flows
  const demoFlows = [
    {
      name: 'visitor-creation',
      label: 'Visitor Creation Flow',
      description: 'Complete flow for creating and managing visitors',
      steps: [
        'Add Visitor',
        'Generate Pass',
        'Visitor History'
      ]
    },
    {
      name: 'bulk-invite',
      label: 'Bulk Invite Flow',
      description: 'Flow for creating multiple invitations at once',
      steps: [
        'Bulk Invite',
        'Review Invitations',
        'Send Invitations'
      ]
    }
  ];

  // Handle custom breadcrumb creation
  const createCustomBreadcrumbs = () => {
    const custom = [
      { label: 'Home', path: '/dashboard', isCurrent: false },
      { label: 'Demo', path: '/demo', isCurrent: false },
      { label: 'Navigation', path: '/demo/navigation', isCurrent: false },
      { label: 'Custom Breadcrumbs', path: '/demo/navigation/custom', isCurrent: true }
    ];
    setCustomBreadcrumbs(custom);
  };

  // Handle breadcrumb updates
  const updateBreadcrumbLabel = (index, newLabel) => {
    if (customBreadcrumbs) {
      const updated = [...customBreadcrumbs];
      updated[index] = { ...updated[index], label: newLabel };
      setCustomBreadcrumbs(updated);
    }
  };

  // Navigation analytics data
  const analytics = getNavigationAnalytics();

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-50 mb-4">
            Navigation System Demo
          </h1>
          <p className="text-slate-300 text-lg">
            Comprehensive navigation features with breadcrumbs, flows, and analytics
          </p>
        </div>

        {/* Current Navigation State */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-50 mb-4">Current Navigation State</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-slate-200 mb-3">Current Route</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Path:</span>
                  <span className="text-slate-300 ml-2 font-mono">{currentRoute?.path || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Search:</span>
                  <span className="text-slate-300 ml-2 font-mono">{currentRoute?.search || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Hash:</span>
                  <span className="text-slate-300 ml-2 font-mono">{currentRoute?.hash || 'None'}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-200 mb-3">Navigation Stats</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Total Navigations:</span>
                  <span className="text-slate-300 ml-2">{analytics.totalNavigations}</span>
                </div>
                <div>
                  <span className="text-slate-400">Unique Routes:</span>
                  <span className="text-slate-300 ml-2">{analytics.uniqueRoutes}</span>
                </div>
                <div>
                  <span className="text-slate-400">Current Depth:</span>
                  <span className="text-slate-300 ml-2">{analytics.currentDepth}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Enhanced Breadcrumbs Demo */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-50 mb-4">Enhanced Breadcrumbs</h2>
          
          <div className="space-y-6">
            {/* Default Breadcrumbs */}
            <div>
              <h3 className="text-lg font-medium text-slate-200 mb-3">Default Breadcrumbs</h3>
              <EnhancedBreadcrumbs 
                breadcrumbs={breadcrumbs}
                userRole="resident"
                size="md"
                showProgress={false}
                collapsible={true}
              />
            </div>

            {/* Custom Breadcrumbs */}
            <div>
              <h3 className="text-lg font-medium text-slate-200 mb-3">Custom Breadcrumbs</h3>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Button 
                    onClick={createCustomBreadcrumbs}
                    size="sm"
                  >
                    Create Custom Breadcrumbs
                  </Button>
                  <Button 
                    onClick={() => setCustomBreadcrumbs(null)}
                    variant="secondary"
                    size="sm"
                  >
                    Reset to Default
                  </Button>
                </div>
                
                {customBreadcrumbs && (
                  <EnhancedBreadcrumbs 
                    breadcrumbs={customBreadcrumbs}
                    size="md"
                    showProgress={true}
                    collapsible={true}
                  />
                )}
              </div>
            </div>

            {/* Different Sizes */}
            <div>
              <h3 className="text-lg font-medium text-slate-200 mb-3">Different Sizes</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2">Small</p>
                  <EnhancedBreadcrumbs 
                    breadcrumbs={breadcrumbs.slice(0, 3)}
                    size="sm"
                    showProgress={false}
                  />
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-2">Large</p>
                  <EnhancedBreadcrumbs 
                    breadcrumbs={breadcrumbs.slice(0, 3)}
                    size="lg"
                    showProgress={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Navigation Flow Demo */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-50 mb-4">Navigation Flow</h2>
          
          <div className="space-y-6">
            {demoFlows.map((flow) => (
              <div key={flow.name} className="border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-slate-200 mb-2">{flow.label}</h3>
                <p className="text-slate-400 text-sm mb-4">{flow.description}</p>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={() => navigateTo(`/demo/flow/${flow.name}`)}
                    size="sm"
                  >
                    Start Flow
                  </Button>
                  <span className="text-slate-400 text-sm">
                    Steps: {flow.steps.join(' → ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Navigation Analytics Demo */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-slate-50">Navigation Analytics</h2>
            <Button 
              onClick={() => setShowAnalytics(!showAnalytics)}
              variant="secondary"
              size="sm"
            >
              {showAnalytics ? 'Hide' : 'Show'} Analytics
            </Button>
          </div>
          
          {showAnalytics && (
            <NavigationAnalytics 
              showDetailed={true}
              showCharts={true}
            />
          )}
        </Card>

        {/* Keyboard Navigation Demo */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-50 mb-4">Keyboard Navigation</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-slate-200 mb-3">Breadcrumb Navigation</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">Tab</kbd> - Navigate between breadcrumbs</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">Enter</kbd> - Activate breadcrumb</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">←</kbd> / <kbd className="px-2 py-1 bg-slate-700 rounded">→</kbd> - Navigate left/right</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">Home</kbd> - Go to first breadcrumb</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">End</kbd> - Go to last breadcrumb</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">Esc</kbd> - Clear focus</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-slate-200 mb-3">General Navigation</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">Alt + ←</kbd> - Go back</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">Alt + →</kbd> - Go forward</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">Ctrl + H</kbd> - Go to home</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">F1</kbd> - Show help</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">Esc</kbd> - Close modals/menus</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Mobile Responsiveness Demo */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-50 mb-4">Mobile Responsiveness</h2>
          
          <div className="space-y-4">
            <p className="text-slate-300">
              The navigation system is fully responsive and adapts to different screen sizes:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border border-slate-700 rounded-lg">
                <div className="text-2xl mb-2">📱</div>
                <h4 className="font-medium text-slate-200 mb-2">Mobile</h4>
                <p className="text-sm text-slate-400">
                  Collapsible breadcrumbs, touch-friendly targets, hamburger menu
                </p>
              </div>
              
              <div className="text-center p-4 border border-slate-700 rounded-lg">
                <div className="text-2xl mb-2">📱</div>
                <h4 className="font-medium text-slate-200 mb-2">Tablet</h4>
                <p className="text-sm text-slate-400">
                  Optimized spacing, partial sidebar, responsive breadcrumbs
                </p>
              </div>
              
              <div className="text-center p-4 border border-slate-700 rounded-lg">
                <div className="text-2xl mb-2">💻</div>
                <h4 className="font-medium text-slate-200 mb-2">Desktop</h4>
                <p className="text-sm text-slate-400">
                  Full sidebar, complete breadcrumbs, keyboard shortcuts
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button 
            onClick={() => navigate('/dashboard/resident')}
            variant="primary"
          >
            Go to Resident Dashboard
          </Button>
          <Button 
            onClick={() => navigate('/dashboard/guard')}
            variant="secondary"
          >
            Go to Guard Dashboard
          </Button>
          <Button 
            onClick={() => window.history.back()}
            variant="ghost"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NavigationDemo;




