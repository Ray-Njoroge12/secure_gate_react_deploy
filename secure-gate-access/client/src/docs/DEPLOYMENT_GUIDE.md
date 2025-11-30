# Deployment Guide

This document provides comprehensive guidance for deploying the Secure Gate Access application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Build Process](#build-process)
- [Deployment Options](#deployment-options)
- [Production Configuration](#production-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

The Secure Gate Access application is a modern React-based visitor management system that can be deployed in various environments. This guide covers deployment strategies for different platforms and configurations.

## Prerequisites

### System Requirements

- **Node.js**: 16.0 or higher
- **npm**: 7.0 or higher
- **Memory**: 2GB RAM minimum, 4GB recommended
- **Storage**: 1GB available space
- **Network**: HTTPS support required for production

### Required Services

- **Backend API**: Secure Gate Access API server
- **Database**: PostgreSQL 12+
- **Redis**: For session storage and caching
- **CDN**: For static asset delivery (recommended)

## Environment Setup

### Environment Variables

Create environment-specific configuration files:

#### Development (`.env.development`)

```env
# API Configuration
REACT_APP_API_URL=http://localhost:5003/api
REACT_APP_WS_URL=http://localhost:5003
REACT_APP_ENVIRONMENT=development

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_DEBUG=true
REACT_APP_ENABLE_MOCK_DATA=false

# External Services
REACT_APP_SENTRY_DSN=
REACT_APP_GOOGLE_ANALYTICS_ID=
```

#### Production (`.env.production`)

```env
# API Configuration
REACT_APP_API_URL=https://api.securegateaccess.com/api
REACT_APP_WS_URL=https://api.securegateaccess.com
REACT_APP_ENVIRONMENT=production

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_DEBUG=false
REACT_APP_ENABLE_MOCK_DATA=false

# External Services
REACT_APP_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
REACT_APP_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

#### Staging (`.env.staging`)

```env
# API Configuration
REACT_APP_API_URL=https://staging-api.securegateaccess.com/api
REACT_APP_WS_URL=https://staging-api.securegateaccess.com
REACT_APP_ENVIRONMENT=staging

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_DEBUG=true
REACT_APP_ENABLE_MOCK_DATA=false

# External Services
REACT_APP_SENTRY_DSN=https://your-staging-sentry-dsn@sentry.io/project-id
REACT_APP_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

### Build Configuration

#### Webpack Configuration (`webpack.config.js`)

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
      publicPath: '/',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react']
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name].[contenthash][ext]'
          }
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        minify: isProduction
      }),
      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: '[name].[contenthash].css',
          chunkFilename: '[name].[contenthash].chunk.css'
        })
      ] : [])
    ],
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction
            }
          }
        }),
        new CssMinimizerPlugin()
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    },
    devServer: {
      static: './public',
      port: 3000,
      hot: true,
      historyApiFallback: true
    }
  };
};
```

## Build Process

### Local Build

```bash
# Install dependencies
npm install

# Run tests
npm run test:coverage

# Build for production
npm run build

# Build for staging
npm run build:staging

# Build for development
npm run build:dev
```

### Build Scripts

#### Package.json Scripts

```json
{
  "scripts": {
    "build": "NODE_ENV=production webpack --mode production",
    "build:staging": "NODE_ENV=staging webpack --mode production",
    "build:dev": "NODE_ENV=development webpack --mode development",
    "build:analyze": "npm run build && npx webpack-bundle-analyzer build/static/js/*.js",
    "preview": "serve -s build -l 3000",
    "test:coverage": "jest --coverage --watchAll=false",
    "test:ci": "jest --coverage --watchAll=false --ci",
    "lint": "eslint src/ --ext .js,.jsx",
    "lint:fix": "eslint src/ --ext .js,.jsx --fix"
  }
}
```

### Build Optimization

#### Bundle Analysis

```bash
# Analyze bundle size
npm run build:analyze

# Check for duplicate dependencies
npx duplicate-package-checker

# Check for unused dependencies
npx depcheck
```

#### Performance Optimization

1. **Code Splitting**:
   ```javascript
   // Lazy load components
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   const Settings = lazy(() => import('./pages/Settings'));
   ```

2. **Tree Shaking**:
   ```javascript
   // Import only what you need
   import { Button } from './components/ui';
   // Instead of
   import * as UI from './components/ui';
   ```

3. **Image Optimization**:
   ```javascript
   // Use optimized images
   import logo from './images/logo.webp';
   ```

## Deployment Options

### 1. Static Hosting (Recommended)

#### Netlify

1. **Connect Repository**:
   - Connect your Git repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `build`

2. **Environment Variables**:
   ```env
   REACT_APP_API_URL=https://api.securegateaccess.com/api
   REACT_APP_WS_URL=https://api.securegateaccess.com
   REACT_APP_ENVIRONMENT=production
   ```

3. **Build Settings**:
   ```yaml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = "build"
   
   [build.environment]
     NODE_VERSION = "16"
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

#### Vercel

1. **Deploy Configuration**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "build"
         }
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/index.html"
       }
     ]
   }
   ```

2. **Environment Variables**:
   - Set in Vercel dashboard
   - Or use `.env.local` file

#### AWS S3 + CloudFront

1. **S3 Configuration**:
   ```bash
   # Install AWS CLI
   aws configure
   
   # Create S3 bucket
   aws s3 mb s3://securegateaccess-frontend
   
   # Upload build files
   aws s3 sync build/ s3://securegateaccess-frontend --delete
   
   # Set bucket policy for public read
   aws s3api put-bucket-policy --bucket securegateaccess-frontend --policy file://bucket-policy.json
   ```

2. **CloudFront Distribution**:
   - Create CloudFront distribution
   - Set S3 bucket as origin
   - Configure caching rules
   - Set up custom error pages

### 2. Container Deployment

#### Docker Configuration

```dockerfile
# Dockerfile
FROM node:16-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "80:80"
    environment:
      - REACT_APP_API_URL=http://backend:5003/api
    depends_on:
      - backend
  
  backend:
    image: securegateaccess/backend:latest
    ports:
      - "5003:5003"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/securegateaccess
    depends_on:
      - db
  
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=securegateaccess
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Kubernetes

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: securegateaccess-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: securegateaccess-frontend
  template:
    metadata:
      labels:
        app: securegateaccess-frontend
    spec:
      containers:
      - name: frontend
        image: securegateaccess/frontend:latest
        ports:
        - containerPort: 80
        env:
        - name: REACT_APP_API_URL
          value: "https://api.securegateaccess.com/api"
---
apiVersion: v1
kind: Service
metadata:
  name: securegateaccess-frontend-service
spec:
  selector:
    app: securegateaccess-frontend
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

### 3. Server Deployment

#### Nginx Configuration

```nginx
# nginx.conf
server {
    listen 80;
    server_name securegateaccess.com;
    root /var/www/securegateaccess/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend:5003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Apache Configuration

```apache
# .htaccess
RewriteEngine On

# Handle client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Cache static assets
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, immutable"
</FilesMatch>

# Security headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
```

## Production Configuration

### Performance Optimization

#### CDN Configuration

```javascript
// cdn-config.js
const CDN_URL = process.env.REACT_APP_CDN_URL || '';

export const getAssetUrl = (path) => {
  return CDN_URL ? `${CDN_URL}${path}` : path;
};

// Usage
import logo from './images/logo.png';
const logoUrl = getAssetUrl(logo);
```

#### Service Worker

```javascript
// public/sw.js
const CACHE_NAME = 'securegateaccess-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
```

### Security Configuration

#### Content Security Policy

```html
<!-- public/index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.securegateaccess.com;
">
```

#### HTTPS Configuration

```javascript
// src/utils/security.js
export const enforceHTTPS = () => {
  if (process.env.NODE_ENV === 'production' && location.protocol !== 'https:') {
    location.replace('https:' + window.location.href.substring(window.location.protocol.length));
  }
};
```

### Monitoring and Analytics

#### Error Tracking (Sentry)

```javascript
// src/utils/sentry.js
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.REACT_APP_ENVIRONMENT,
  integrations: [
    new Integrations.BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
});

export default Sentry;
```

#### Performance Monitoring

```javascript
// src/utils/analytics.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const sendToAnalytics = (metric) => {
  // Send to your analytics service
  console.log(metric);
};

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## Monitoring and Logging

### Application Monitoring

#### Health Checks

```javascript
// src/utils/healthCheck.js
export const healthCheck = async () => {
  try {
    const response = await fetch('/api/health');
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

// Check every 30 seconds
setInterval(healthCheck, 30000);
```

#### Performance Monitoring

```javascript
// src/utils/performance.js
export const measurePerformance = () => {
  if ('performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    console.log('Navigation timing:', {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime
    });
  }
};
```

### Logging

#### Client-Side Logging

```javascript
// src/utils/logger.js
class Logger {
  constructor() {
    this.level = process.env.REACT_APP_LOG_LEVEL || 'info';
  }

  log(level, message, data = {}) {
    if (this.shouldLog(level)) {
      console[level](`[${new Date().toISOString()}] ${message}`, data);
    }
  }

  shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug'];
    return levels.indexOf(level) <= levels.indexOf(this.level);
  }

  error(message, data) {
    this.log('error', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  info(message, data) {
    this.log('info', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }
}

export default new Logger();
```

## Security Considerations

### Security Headers

```javascript
// src/utils/security.js
export const securityHeaders = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'"
};
```

### Input Validation

```javascript
// src/utils/validation.js
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
};
```

### Authentication Security

```javascript
// src/utils/auth.js
export const authClient = {
  login: async (credentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // httpOnly cookies for auth
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json();
  },

  logout: async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  },
};
```

## Troubleshooting

### Common Issues

#### Build Failures

1. **Memory Issues**:
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

2. **Dependency Issues**:
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Environment Variables**:
   ```bash
   # Check environment variables
   npm run build 2>&1 | grep -i "undefined"
   ```

#### Runtime Issues

1. **CORS Errors**:
   - Check API URL configuration
   - Verify CORS settings on backend
   - Check network connectivity

2. **Routing Issues**:
   - Verify server configuration for SPA routing
   - Check for missing redirects
   - Verify base path configuration

3. **Performance Issues**:
   - Check bundle size
   - Verify CDN configuration
   - Check for memory leaks

### Debug Tools

#### Development Tools

```javascript
// src/utils/debug.js
export const debugMode = process.env.REACT_APP_ENABLE_DEBUG === 'true';

export const debugLog = (message, data) => {
  if (debugMode) {
    console.log(`[DEBUG] ${message}`, data);
  }
};

// React DevTools
if (process.env.NODE_ENV === 'development') {
  window.React = require('react');
}
```

#### Production Debugging

```javascript
// src/utils/productionDebug.js
export const enableProductionDebug = () => {
  if (process.env.NODE_ENV === 'production') {
    // Add debug information to window object
    window.__DEBUG__ = {
      version: process.env.REACT_APP_VERSION,
      buildTime: process.env.REACT_APP_BUILD_TIME,
      environment: process.env.REACT_APP_ENVIRONMENT
    };
  }
};
```

### Rollback Strategy

#### Version Management

```bash
# Tag releases
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Rollback to previous version
git checkout v0.9.0
npm run build
npm run deploy
```

#### Database Migrations

```sql
-- Rollback script
-- Always test rollback procedures

-- Example rollback for user table changes
ALTER TABLE users DROP COLUMN new_field;
```

## Conclusion

This deployment guide provides comprehensive coverage for deploying the Secure Gate Access application. Follow these guidelines to ensure a smooth, secure, and scalable deployment.

For questions or support, please refer to the main documentation or contact the development team.

---

**Last Updated**: January 2024
**Version**: 1.0.0

