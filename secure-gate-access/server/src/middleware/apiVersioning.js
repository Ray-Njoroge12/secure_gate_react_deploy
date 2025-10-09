import { AppError } from './enhancedErrorHandler.js';
import logger from '../config/logger.js';

/**
 * API Versioning Middleware
 * Handles API version detection, validation, and routing
 */

// Supported API versions
const SUPPORTED_VERSIONS = {
  'v1': {
    version: '1.0.0',
    status: 'stable',
    deprecationDate: null,
    sunsetDate: null,
    description: 'Initial API version with core functionality'
  },
  'v2': {
    version: '2.0.0',
    status: 'beta',
    deprecationDate: null,
    sunsetDate: null,
    description: 'Enhanced API with improved features and performance'
  }
};

// Default version
const DEFAULT_VERSION = 'v1';

// Version detection strategies
const VERSION_STRATEGIES = {
  HEADER: 'header',
  URL_PATH: 'url_path',
  QUERY_PARAM: 'query_param',
  ACCEPT_HEADER: 'accept_header'
};

/**
 * Extract version from request using multiple strategies
 */
const extractVersion = (req) => {
  const strategies = [
    // Strategy 1: URL Path (e.g., /api/v1/users)
    () => {
      const pathMatch = req.originalUrl.match(/^\/api\/(v\d+(?:\.\d+)*)/);
      return pathMatch ? pathMatch[1] : null;
    },
    
    // Strategy 2: Accept header (e.g., application/vnd.api+json;version=1.0)
    () => {
      const acceptHeader = req.headers.accept;
      if (acceptHeader) {
        const versionMatch = acceptHeader.match(/version=(\d+(?:\.\d+)*)/);
        return versionMatch ? versionMatch[1] : null;
      }
      return null;
    },
    
    // Strategy 3: Custom header (e.g., API-Version: v1)
    () => {
      return req.headers['api-version'] || req.headers['x-api-version'];
    },
    
    // Strategy 4: Query parameter (e.g., ?version=v1)
    () => {
      return req.query.version;
    }
  ];

  for (const strategy of strategies) {
    try {
      const version = strategy();
      if (version) {
        // Normalize version format
        const normalizedVersion = normalizeVersion(version);
        if (normalizedVersion) {
          return normalizedVersion;
        }
      }
    } catch (error) {
      logger.warn('Error extracting version using strategy:', { error: error.message });
    }
  }

  return null;
};

/**
 * Normalize version string to supported format
 */
const normalizeVersion = (version) => {
  if (!version) return null;
  
  // Remove 'v' prefix if present
  const cleanVersion = version.replace(/^v/, '');
  
  // Check if it's a major version only (e.g., '1' -> 'v1')
  if (/^\d+$/.test(cleanVersion)) {
    return `v${cleanVersion}`;
  }
  
  // Check if it's a semantic version (e.g., '1.0.0' -> 'v1')
  const semanticMatch = cleanVersion.match(/^(\d+)\./);
  if (semanticMatch) {
    return `v${semanticMatch[1]}`;
  }
  
  // Check if it's already in correct format (e.g., 'v1')
  if (/^v\d+$/.test(version)) {
    return version;
  }
  
  return null;
};

/**
 * Validate if version is supported
 */
const isVersionSupported = (version) => {
  return version && SUPPORTED_VERSIONS[version];
};

/**
 * Get version information
 */
const getVersionInfo = (version) => {
  return SUPPORTED_VERSIONS[version] || null;
};

/**
 * Check if version is deprecated
 */
const isVersionDeprecated = (version) => {
  const versionInfo = getVersionInfo(version);
  if (!versionInfo) return false;
  
  if (versionInfo.deprecationDate) {
    const deprecationDate = new Date(versionInfo.deprecationDate);
    return new Date() >= deprecationDate;
  }
  
  return false;
};

/**
 * Check if version is sunset (no longer supported)
 */
const isVersionSunset = (version) => {
  const versionInfo = getVersionInfo(version);
  if (!versionInfo) return true; // Unknown versions are considered sunset
  
  if (versionInfo.sunsetDate) {
    const sunsetDate = new Date(versionInfo.sunsetDate);
    return new Date() >= sunsetDate;
  }
  
  return false;
};

/**
 * Add version headers to response
 */
const addVersionHeaders = (res, version) => {
  const versionInfo = getVersionInfo(version);
  if (versionInfo) {
    res.set({
      'API-Version': version,
      'API-Version-Status': versionInfo.status,
      'API-Version-Date': new Date().toISOString()
    });
    
    if (isVersionDeprecated(version)) {
      res.set('API-Version-Deprecated', 'true');
      if (versionInfo.deprecationDate) {
        res.set('API-Version-Deprecation-Date', versionInfo.deprecationDate);
      }
    }
    
    if (isVersionSunset(version)) {
      res.set('API-Version-Sunset', 'true');
      if (versionInfo.sunsetDate) {
        res.set('API-Version-Sunset-Date', versionInfo.sunsetDate);
      }
    }
  }
};

/**
 * Main API versioning middleware
 */
export const apiVersioning = (options = {}) => {
  const {
    defaultVersion = DEFAULT_VERSION,
    supportedVersions = SUPPORTED_VERSIONS,
    strictMode = false, // If true, reject requests without version
    logVersionUsage = true
  } = options;

  return (req, res, next) => {
    try {
      // Extract version from request
      const requestedVersion = extractVersion(req);
      const version = requestedVersion || defaultVersion;
      
      // Validate version
      if (!isVersionSupported(version)) {
        if (strictMode || requestedVersion) {
          throw new AppError(
            `Unsupported API version: ${version}`,
            400,
            'UNSUPPORTED_API_VERSION',
            {
              requestedVersion: version,
              supportedVersions: Object.keys(supportedVersions),
              defaultVersion
            }
          );
        }
      }
      
      // Check if version is sunset
      if (isVersionSunset(version)) {
        throw new AppError(
          `API version ${version} is no longer supported`,
          410,
          'SUNSET_API_VERSION',
          {
            version,
            sunsetDate: getVersionInfo(version)?.sunsetDate
          }
        );
      }
      
      // Add version information to request
      req.apiVersion = version;
      req.apiVersionInfo = getVersionInfo(version);
      req.isVersionDeprecated = isVersionDeprecated(version);
      
      // Add version headers to response
      addVersionHeaders(res, version);
      
      // Log version usage
      if (logVersionUsage) {
        logger.info('API version usage', {
          version,
          method: req.method,
          url: req.originalUrl,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          isDeprecated: req.isVersionDeprecated
        });
      }
      
      // Add deprecation warning to response if applicable
      if (req.isVersionDeprecated) {
        const versionInfo = getVersionInfo(version);
        res.set('Warning', `299 - "API version ${version} is deprecated. Please upgrade to a supported version."`);
        
        if (versionInfo?.deprecationDate) {
          res.set('Sunset', versionInfo.deprecationDate);
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Version-specific route handler
 */
export const versionedRoute = (version, handler) => {
  return (req, res, next) => {
    if (req.apiVersion === version) {
      return handler(req, res, next);
    }
    next();
  };
};

/**
 * Get supported versions endpoint handler
 */
export const getSupportedVersions = (req, res) => {
  const versions = Object.entries(SUPPORTED_VERSIONS).map(([key, info]) => ({
    version: key,
    ...info,
    isDeprecated: isVersionDeprecated(key),
    isSunset: isVersionSunset(key)
  }));
  
  res.json({
    success: true,
    data: {
      versions,
      defaultVersion: DEFAULT_VERSION,
      currentVersion: req.apiVersion
    },
    message: 'Supported API versions retrieved successfully'
  });
};

/**
 * Version migration guide endpoint
 */
export const getVersionMigrationGuide = (req, res) => {
  const fromVersion = req.query.from || req.apiVersion;
  const toVersion = req.query.to || 'v2';
  
  const migrationGuides = {
    'v1_to_v2': {
      from: 'v1',
      to: 'v2',
      breakingChanges: [
        {
          endpoint: '/api/users',
          change: 'Response format updated',
          before: { id: 1, name: 'John' },
          after: { data: { id: 1, name: 'John' }, meta: {} }
        }
      ],
      newFeatures: [
        'Enhanced error responses',
        'Improved pagination',
        'New filtering options'
      ],
      migrationSteps: [
        'Update API calls to use v2 endpoints',
        'Update response handling code',
        'Test thoroughly in staging environment'
      ]
    }
  };
  
  const guideKey = `${fromVersion}_to_${toVersion}`;
  const guide = migrationGuides[guideKey];
  
  if (!guide) {
    return res.status(404).json({
      success: false,
      message: 'Migration guide not found',
      availableGuides: Object.keys(migrationGuides)
    });
  }
  
  res.json({
    success: true,
    data: guide,
    message: 'Migration guide retrieved successfully'
  });
};

export default {
  apiVersioning,
  versionedRoute,
  getSupportedVersions,
  getVersionMigrationGuide,
  SUPPORTED_VERSIONS,
  VERSION_STRATEGIES
};




