# Performance Optimization Guidelines

## Overview

The Secure Gate Access Control System implements comprehensive performance optimization strategies covering database queries, caching, API response times, and resource utilization. This guide covers optimization patterns, monitoring techniques, and best practices used throughout the system.

## Database Performance Optimization

### Connection Pool Configuration
```javascript
// Optimized pool configuration for cloud environments
const poolConfig = {
  // Pool sizing optimized for cloud environments (Render)
  max: process.env.NODE_ENV === 'test' ? 40 : 20,  // Maximum connections
  min: process.env.NODE_ENV === 'test' ? 10 : 5,   // Minimum connections
  idleTimeoutMillis: 10000,                        // 10 seconds idle timeout
  connectionTimeoutMillis: 60000,                  // 60 seconds for cloud cold starts
  
  // Statement timeouts to prevent hanging queries
  statement_timeout: 30000,                        // 30 seconds max query time
  query_timeout: 30000,
  
  // Enhanced stability features for cloud
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: true
};
```

### Query Optimization Patterns
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_visitors_estate_status_date ON visitors(estate_id, status, date_of_visit);
CREATE INDEX idx_audit_logs_estate_user_time ON audit_logs(estate_id, user_id, created_at);
CREATE INDEX idx_users_estate_role_status ON users(estate_id, role, account_status);

-- Partial indexes for specific conditions
CREATE INDEX idx_visitors_active ON visitors(estate_id, status) 
  WHERE status IN ('PENDING', 'APPROVED', 'VERIFIED', 'ON_PREMISE');

-- Covering indexes to avoid table lookups
CREATE INDEX idx_visitors_estate_status_covering 
ON visitors(estate_id, status) 
INCLUDE (id, name, phone, created_at);

-- Text search indexes for full-text search
CREATE INDEX idx_visitors_name_search ON visitors USING gin(to_tsvector('english', name));
```

### Query Performance Monitoring
```javascript
// Enhanced query method with performance tracking
async query(text, params = [], options = {}) {
  const startTime = Date.now();
  let result;
  
  try {
    result = await this.pool.query(text, params);
    const responseTime = Date.now() - startTime;
    
    // Track performance metrics
    this.metrics.queries++;
    this.metrics.responseTimes.push(responseTime);
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }
    
    // Log slow queries
    if (responseTime > 1000) {
      loggingService.logPerformance('warn', 'Slow query detected', {
        query: text.substring(0, 200),
        responseTime,
        rowCount: result.rowCount,
        params: params.length
      });
    }
    
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    loggingService.logError('Query failed', error, {
      query: text.substring(0, 200),
      responseTime,
      params: params.length
    });
    throw error;
  }
}
```
### Batch Operations
```sql
-- Batch inserts for better performance
INSERT INTO audit_logs (user_id, action, resource, estate_id, created_at)
VALUES 
  ($1, $2, $3, $4, NOW()),
  ($5, $6, $7, $8, NOW()),
  ($9, $10, $11, $12, NOW());

-- Batch updates with CASE statements
UPDATE visitors 
SET status = CASE 
  WHEN id = $1 THEN 'APPROVED'
  WHEN id = $2 THEN 'REJECTED'
  ELSE status
END
WHERE id IN ($1, $2);

-- Use RETURNING to avoid additional queries
INSERT INTO visitors (name, phone, email, estate_id) 
VALUES ($1, $2, $3, $4) 
RETURNING id, created_at, invite_code;
```

## Caching Strategy

### Redis-Based Response Caching
```javascript
class CacheMiddleware {
  constructor(options = {}) {
    this.defaultTTL = options.defaultTTL || 300; // 5 minutes
    this.maxTTL = options.maxTTL || 3600; // 1 hour
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  // Generate cache key from request
  generateCacheKey(req, options = {}) {
    const { includeQuery = true, prefix = 'cache' } = options;
    let key = `${prefix}:${req.method}:${req.path}`;

    if (includeQuery && req.query && Object.keys(req.query).length > 0) {
      const sortedQuery = Object.keys(req.query)
        .sort()
        .map(key => `${key}=${req.query[key]}`)
        .join('&');
      key += `:query:${crypto.createHash('md5').update(sortedQuery).digest('hex')}`;
    }

    return key;
  }

  // Cache middleware factory
  createMiddleware(options = {}) {
    const { ttl = this.defaultTTL, skipCache = false } = options;

    return async (req, res, next) => {
      if (skipCache || !this.isConnected || req.method !== 'GET') {
        return next();
      }

      try {
        const cacheKey = this.generateCacheKey(req);
        const cachedData = await this.get(cacheKey);

        if (cachedData) {
          this.cacheStats.hits++;
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-TTL': ttl.toString(),
            'Cache-Control': `public, max-age=${ttl}`
          });
          return res.json(cachedData);
        }

        // Cache miss - store original json method
        const originalJson = res.json.bind(res);
        res.json = async (data) => {
          await this.set(cacheKey, data, ttl);
          res.set({
            'X-Cache': 'MISS',
            'Cache-Control': `public, max-age=${ttl}`
          });
          return originalJson(data);
        };

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }
}
```

### Application-Level Caching
```javascript
// In-memory cache for frequently accessed data
class MemoryCache {
  constructor(maxSize = 1000, ttl = 300000) { // 5 minutes default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  set(key, value, customTTL = null) {
    const expiresAt = Date.now() + (customTTL || this.ttl);
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }

    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

// Usage in services
const userCache = new MemoryCache(500, 600000); // 10 minutes TTL

export const getUserById = async (id) => {
  const cacheKey = `user:${id}`;
  let user = userCache.get(cacheKey);
  
  if (!user) {
    user = await dbManager.query('SELECT * FROM users WHERE id = $1', [id]);
    if (user.rows.length > 0) {
      userCache.set(cacheKey, user.rows[0]);
    }
  }
  
  return user;
};
```

## API Response Optimization

### Response Compression
```javascript
// Gzip compression middleware
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    // Don't compress responses if the client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all other responses
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024, // Only compress responses larger than 1KB
  memLevel: 8 // Memory usage level (1-9)
}));
```

### Pagination Optimization
```javascript
// Efficient pagination with cursor-based approach for large datasets
export const getPaginatedVisitors = async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    cursor = null, 
    status = null,
    search = null 
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  let query = `
    SELECT id, name, phone, email, status, created_at
    FROM visitors 
    WHERE estate_id = $1
  `;
  const params = [req.user.estate_id];
  let paramIndex = 2;

  // Add filters
  if (status) {
    query += ` AND status = $${paramIndex++}`;
    params.push(status);
  }

  if (search) {
    query += ` AND (name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Cursor-based pagination for large datasets
  if (cursor) {
    query += ` AND created_at < $${paramIndex++}`;
    params.push(new Date(cursor));
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
  params.push(limitNum + 1); // Get one extra to check if there are more

  const result = await dbManager.query(query, params);
  const visitors = result.rows;
  
  const hasMore = visitors.length > limitNum;
  if (hasMore) {
    visitors.pop(); // Remove the extra record
  }

  const nextCursor = hasMore && visitors.length > 0 
    ? visitors[visitors.length - 1].created_at 
    : null;

  successResponse(res, {
    visitors,
    pagination: {
      page: pageNum,
      limit: limitNum,
      hasMore,
      nextCursor,
      count: visitors.length
    }
  });
};
```

### Response Field Selection
```javascript
// Allow clients to specify which fields they need
export const getVisitorDetails = async (req, res) => {
  const { id } = req.params;
  const { fields } = req.query;

  // Default fields
  let selectFields = 'id, name, phone, email, status, created_at';
  
  // Allow client to specify fields
  if (fields) {
    const allowedFields = [
      'id', 'name', 'phone', 'email', 'purpose', 'status', 
      'invite_code', 'qr_code', 'expected_arrival', 'created_at'
    ];
    const requestedFields = fields.split(',').map(f => f.trim());
    const validFields = requestedFields.filter(f => allowedFields.includes(f));
    
    if (validFields.length > 0) {
      selectFields = validFields.join(', ');
    }
  }

  const query = `SELECT ${selectFields} FROM visitors WHERE id = $1 AND estate_id = $2`;
  const result = await dbManager.query(query, [id, req.user.estate_id]);

  if (result.rows.length === 0) {
    return notFoundResponse(res, 'Visitor not found');
  }

  successResponse(res, { visitor: result.rows[0] });
};
```

## Frontend Performance Optimization

### Code Splitting and Lazy Loading
```javascript
// Route-based code splitting
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const VisitorManagement = lazy(() => import('./pages/VisitorManagement'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/visitors" element={<VisitorManagement />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Suspense>
  );
}

// Component-level lazy loading
const HeavyChart = lazy(() => import('./components/HeavyChart'));

function DashboardPage() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => setShowChart(true)}>
        Load Chart
      </button>
      {showChart && (
        <Suspense fallback={<div>Loading chart...</div>}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  );
}
```

### Image Optimization
```javascript
// Optimized image component with lazy loading
import { useState, useRef, useEffect } from 'react';

const OptimizedImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className = '',
  placeholder = '/images/placeholder.svg'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={imgRef}
      className={`relative ${className}`}
      style={{ width, height }}
    >
      {!isLoaded && (
        <img
          src={placeholder}
          alt="Loading..."
          className="absolute inset-0 w-full h-full object-cover blur-sm"
        />
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
      )}
    </div>
  );
};
```

### Virtual Scrolling for Large Lists
```javascript
// Virtual scrolling component for large visitor lists
import { FixedSizeList as List } from 'react-window';

const VirtualizedVisitorList = ({ visitors, onVisitorClick }) => {
  const Row = ({ index, style }) => {
    const visitor = visitors[index];
    
    return (
      <div style={style} className="flex items-center p-4 border-b">
        <div className="flex-1">
          <h3 className="font-medium">{visitor.name}</h3>
          <p className="text-sm text-gray-600">{visitor.phone}</p>
        </div>
        <div className="text-right">
          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(visitor.status)}`}>
            {visitor.status}
          </span>
        </div>
      </div>
    );
  };

  return (
    <List
      height={600} // Container height
      itemCount={visitors.length}
      itemSize={80} // Height of each row
      width="100%"
    >
      {Row}
    </List>
  );
};
```

## Memory Management

### Memory Leak Prevention
```javascript
// Proper cleanup in React components
import { useEffect, useRef } from 'react';

const VisitorDashboard = () => {
  const intervalRef = useRef();
  const abortControllerRef = useRef();

  useEffect(() => {
    // Setup periodic data refresh
    intervalRef.current = setInterval(() => {
      fetchVisitorData();
    }, 30000);

    // Setup abort controller for API calls
    abortControllerRef.current = new AbortController();

    return () => {
      // Cleanup interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Abort pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchVisitorData = async () => {
    try {
      const response = await fetch('/api/visitors', {
        signal: abortControllerRef.current?.signal
      });
      const data = await response.json();
      // Handle data...
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Fetch error:', error);
      }
    }
  };

  return <div>Dashboard content...</div>;
};
```

### Efficient State Management
```javascript
// Use React Query for efficient server state management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const useVisitors = (filters = {}) => {
  return useQuery({
    queryKey: ['visitors', filters],
    queryFn: () => fetchVisitors(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3
  });
};

const useCreateVisitor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createVisitor,
    onSuccess: () => {
      // Invalidate and refetch visitors list
      queryClient.invalidateQueries(['visitors']);
    },
    onError: (error) => {
      console.error('Failed to create visitor:', error);
    }
  });
};

// Usage in component
const VisitorList = () => {
  const [filters, setFilters] = useState({ status: 'PENDING' });
  const { data: visitors, isLoading, error } = useVisitors(filters);
  const createVisitorMutation = useCreateVisitor();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {visitors?.map(visitor => (
        <VisitorCard key={visitor.id} visitor={visitor} />
      ))}
    </div>
  );
};
```

## Performance Monitoring

### Application Performance Monitoring
```javascript
// Performance monitoring service
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiResponseTimes: new Map(),
      databaseQueryTimes: new Map(),
      cacheHitRates: new Map(),
      errorRates: new Map()
    };
  }

  recordAPIResponse(endpoint, responseTime, statusCode) {
    const key = `${endpoint}:${statusCode}`;
    
    if (!this.metrics.apiResponseTimes.has(key)) {
      this.metrics.apiResponseTimes.set(key, []);
    }
    
    const times = this.metrics.apiResponseTimes.get(key);
    times.push(responseTime);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }

    // Alert on slow responses
    if (responseTime > 2000) {
      loggingService.logPerformance('warn', 'Slow API response', {
        endpoint,
        responseTime,
        statusCode
      });
    }
  }

  recordDatabaseQuery(query, responseTime, rowCount) {
    const queryType = query.trim().split(' ')[0].toUpperCase();
    
    if (!this.metrics.databaseQueryTimes.has(queryType)) {
      this.metrics.databaseQueryTimes.set(queryType, []);
    }
    
    const times = this.metrics.databaseQueryTimes.get(queryType);
    times.push({ responseTime, rowCount, timestamp: Date.now() });
    
    if (times.length > 100) {
      times.shift();
    }

    // Alert on slow queries
    if (responseTime > 1000) {
      loggingService.logPerformance('warn', 'Slow database query', {
        queryType,
        responseTime,
        rowCount,
        query: query.substring(0, 100)
      });
    }
  }

  getMetrics() {
    const apiMetrics = {};
    for (const [endpoint, times] of this.metrics.apiResponseTimes) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const p95 = this.calculatePercentile(times, 95);
      
      apiMetrics[endpoint] = {
        average: Math.round(avg),
        p95: Math.round(p95),
        count: times.length
      };
    }

    const dbMetrics = {};
    for (const [queryType, queries] of this.metrics.databaseQueryTimes) {
      const times = queries.map(q => q.responseTime);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const p95 = this.calculatePercentile(times, 95);
      
      dbMetrics[queryType] = {
        average: Math.round(avg),
        p95: Math.round(p95),
        count: queries.length
      };
    }

    return {
      api: apiMetrics,
      database: dbMetrics,
      timestamp: new Date().toISOString()
    };
  }

  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
```

### Real-Time Performance Dashboard
```javascript
// Performance metrics endpoint
router.get('/metrics/performance', authenticateToken, requireRole(['admin']), async (req, res) => {
  const metrics = {
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    database: dbManager.getStatus(),
    cache: cacheMiddleware.getStats(),
    application: performanceMonitor.getMetrics()
  };

  successResponse(res, metrics, 'Performance metrics retrieved');
});

// WebSocket for real-time metrics
const broadcastMetrics = () => {
  const metrics = performanceMonitor.getMetrics();
  
  // Broadcast to connected admin clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.isAdmin) {
      client.send(JSON.stringify({
        type: 'performance_metrics',
        data: metrics
      }));
    }
  });
};

// Broadcast metrics every 30 seconds
setInterval(broadcastMetrics, 30000);
```

## Resource Optimization

### Bundle Size Optimization
```javascript
// Webpack bundle analyzer configuration
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  // ... other config
  plugins: [
    process.env.ANALYZE && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html'
    })
  ].filter(Boolean),
  
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true
        }
      }
    }
  }
};

// Tree shaking for unused code elimination
// Use ES modules and avoid importing entire libraries
import { debounce } from 'lodash-es'; // Good: specific import
// import _ from 'lodash'; // Bad: imports entire library
```

### Service Worker for Caching
```javascript
// Service worker for offline caching
const CACHE_NAME = 'secure-gate-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'visitor-checkin') {
    event.waitUntil(syncVisitorCheckins());
  }
});

const syncVisitorCheckins = async () => {
  const pendingCheckins = await getStoredCheckins();
  
  for (const checkin of pendingCheckins) {
    try {
      await fetch('/api/visitors/check-in', {
        method: 'POST',
        body: JSON.stringify(checkin),
        headers: { 'Content-Type': 'application/json' }
      });
      
      await removeStoredCheckin(checkin.id);
    } catch (error) {
      console.error('Failed to sync checkin:', error);
    }
  }
};
```

This comprehensive performance optimization guide ensures efficient resource utilization, fast response times, and scalable performance across the Secure Gate Access Control System.