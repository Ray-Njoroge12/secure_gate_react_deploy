import React from 'react';
import { AlertTriangle, X, Download, ExternalLink } from 'lucide-react';
import { Button, Card } from './ui';
import { useBrowserCompatibility } from '../hooks/useBrowserCompatibility';

const BrowserCompatibilityWarning = () => {
  const {
    showWarning,
    browserInfo,
    isSupported,
    hasCriticalIssues,
    hasWarnings,
    issues,
    dismissWarning,
    getBrowserSpecificRecommendations
  } = useBrowserCompatibility();

  if (!showWarning || !browserInfo) {
    return null;
  }

  const { browser, version } = browserInfo;
  const criticalIssues = issues.filter(issue => issue.type === 'error');
  const warningIssues = issues.filter(issue => issue.type === 'warning');
  const browserRecommendations = getBrowserSpecificRecommendations();

  // Get browser download links
  const getBrowserDownloadLinks = () => {
    const links = {
      chrome: 'https://www.google.com/chrome/',
      firefox: 'https://www.mozilla.org/firefox/',
      safari: 'https://www.apple.com/safari/',
      edge: 'https://www.microsoft.com/edge/',
      opera: 'https://www.opera.com/'
    };
    return links;
  };

  const downloadLinks = getBrowserDownloadLinks();

  // Get browser icon
  const getBrowserIcon = (browser) => {
    switch (browser) {
      case 'chrome':
        return '🟢';
      case 'firefox':
        return '🟠';
      case 'safari':
        return '🔵';
      case 'edge':
        return '🔷';
      case 'opera':
        return '🔴';
      case 'ie':
        return '🟡';
      default:
        return '❓';
    }
  };

  // Get severity color
  const getSeverityColor = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card className={`border-l-4 ${hasCriticalIssues ? 'border-red-500' : 'border-yellow-500'}`}>
        <Card.Content className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className={`w-5 h-5 ${hasCriticalIssues ? 'text-red-600' : 'text-yellow-600'}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getBrowserIcon(browser)}</span>
                <h3 className="text-sm font-medium text-gray-900">
                  Browser Compatibility Issue
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissWarning}
                  className="ml-auto p-1 h-6 w-6"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                {browser.charAt(0).toUpperCase() + browser.slice(1)} {version} has compatibility issues.
              </p>
              
              {/* Critical Issues */}
              {criticalIssues.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-red-600 mb-1">Critical Issues:</h4>
                  <ul className="text-xs text-red-600 space-y-1">
                    {criticalIssues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{issue.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Warning Issues */}
              {warningIssues.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-yellow-600 mb-1">Warnings:</h4>
                  <ul className="text-xs text-yellow-600 space-y-1">
                    {warningIssues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-yellow-500 mt-0.5">•</span>
                        <span>{issue.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Browser Recommendations */}
              {browserRecommendations.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Recommendations:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {browserRecommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{rec.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {!isSupported && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">Recommended browsers:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(downloadLinks).map(([browserName, url]) => (
                        <Button
                          key={browserName}
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1 h-6"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          {browserName.charAt(0).toUpperCase() + browserName.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-3 py-1 h-6"
                    onClick={() => {
                      // Open browser compatibility details
                      const event = new CustomEvent('showBrowserCompatibility');
                      window.dispatchEvent(event);
                    }}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Details
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-3 py-1 h-6"
                    onClick={dismissWarning}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default BrowserCompatibilityWarning;

