import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from './ui';
import { AlertTriangle, CheckCircle, XCircle, Info, Download } from 'lucide-react';
import browserCompatibility from '../utils/browserCompatibility';

const BrowserCompatibility = ({ showDetails = false, onClose }) => {
  const [browserInfo, setBrowserInfo] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [issues, setIssues] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showFullDetails, setShowFullDetails] = useState(showDetails);

  useEffect(() => {
    const info = browserCompatibility.getBrowserInfo();
    const caps = browserCompatibility.getCapabilities();
    const browserIssues = browserCompatibility.getKnownIssues();
    const browserRecommendations = browserCompatibility.getRecommendations();

    setBrowserInfo(info);
    setCapabilities(caps);
    setIssues(browserIssues);
    setRecommendations(browserRecommendations);

    // Apply browser-specific fixes
    browserCompatibility.applyBrowserFixes();

    // Add browser classes to document
    const classes = browserCompatibility.getBrowserClasses();
    document.documentElement.classList.add(...classes);
  }, []);

  if (!browserInfo || !capabilities) {
    return null;
  }

  const { browser, version } = browserInfo;
  const { meetsRequirements } = capabilities;

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

  // Get status color
  const getStatusColor = (meetsRequirements) => {
    return meetsRequirements ? 'text-green-600' : 'text-red-600';
  };

  // Get status icon
  const getStatusIcon = (meetsRequirements) => {
    return meetsRequirements ? CheckCircle : XCircle;
  };

  // Get issue severity color
  const getIssueColor = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600 dark:text-gray-200';
    }
  };

  // Get issue icon
  const getIssueIcon = (type) => {
    switch (type) {
      case 'error':
        return XCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return Info;
    }
  };

  // Get recommendation type color
  const getRecommendationColor = (type) => {
    switch (type) {
      case 'performance':
        return 'text-purple-600';
      case 'memory':
        return 'text-orange-600';
      case 'network':
        return 'text-blue-600';
      default:
        return 'text-gray-600 dark:text-gray-200';
    }
  };

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

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <Card.Header>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getBrowserIcon(browser)}</span>
            <div>
              <h2 className="text-xl font-semibold">Browser Compatibility</h2>
              <p className="text-sm text-gray-600 dark:text-gray-200">
                {browser.charAt(0).toUpperCase() + browser.slice(1)} {version}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={meetsRequirements ? "success" : "destructive"}
              className="flex items-center gap-1"
            >
              {React.createElement(getStatusIcon(meetsRequirements), { className: "w-4 h-4" })}
              {meetsRequirements ? 'Compatible' : 'Incompatible'}
            </Badge>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </Card.Header>

      <Card.Content className="space-y-6">
        {/* Browser Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white">Browser Information</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-200">Browser:</span>
                <span className="font-medium">{browser.charAt(0).toUpperCase() + browser.slice(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-200">Version:</span>
                <span className="font-medium">{version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-200">Status:</span>
                <span className={`font-medium ${getStatusColor(meetsRequirements)}`}>
                  {meetsRequirements ? 'Supported' : 'Not Supported'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white">System Information</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-200">Platform:</span>
                <span className="font-medium">{navigator.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-200">User Agent:</span>
                <span className="font-medium text-xs truncate" title={navigator.userAgent}>
                  {navigator.userAgent.substring(0, 50)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-200">Language:</span>
                <span className="font-medium">{navigator.language}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Issues */}
        {issues.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white">Issues Found</h3>
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                  {React.createElement(
                    getIssueIcon(issue.type),
                    { className: `w-5 h-5 mt-0.5 ${getIssueColor(issue.type)}` }
                  )}
                  <div className="flex-1">
                    <div className={`font-medium ${getIssueColor(issue.type)}`}>
                      {issue.message}
                    </div>
                    {issue.fix && (
                      <div className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                        {issue.fix}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white">Recommendations</h3>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Info className="w-5 h-5 mt-0.5 text-blue-600" />
                  <div className="flex-1">
                    <div className={`font-medium ${getRecommendationColor(rec.type)}`}>
                      {rec.message}
                    </div>
                    {rec.suggestion && (
                      <div className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                        {rec.suggestion}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browser Download Links */}
        {!meetsRequirements && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white">Recommended Browsers</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(downloadLinks).map(([browserName, url]) => (
                <Button
                  key={browserName}
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => window.open(url, '_blank')}
                >
                  <Download className="w-4 h-4" />
                  {browserName.charAt(0).toUpperCase() + browserName.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Feature Support Details */}
        {showFullDetails && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white">Feature Support</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullDetails(!showFullDetails)}
              >
                {showFullDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(capabilities.features).map(([feature, supported]) => (
                <div
                  key={feature}
                  className={`flex items-center gap-2 p-2 rounded ${
                    supported ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {React.createElement(
                    supported ? CheckCircle : XCircle,
                    { className: "w-4 h-4" }
                  )}
                  <span className="text-sm font-medium">
                    {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show Details Toggle */}
        {!showFullDetails && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setShowFullDetails(true)}
            >
              Show Feature Details
            </Button>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default BrowserCompatibility;

