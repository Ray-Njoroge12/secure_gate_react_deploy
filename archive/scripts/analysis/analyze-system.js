/**
 * System Functionality Analysis Script
 * SecureGate Access Control System
 * 
 * This script analyzes the complete system to verify:
 * - Route definitions and API endpoints
 * - Service implementations
 * - Frontend component integrations
 * - Real-time features
 * - Security implementations
 */

const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;

// Analysis Results
const analysis = {
  timestamp: new Date().toISOString(),
  summary: {},
  routes: {
    backend: [],
    frontend: []
  },
  services: [],
  components: {
    pages: [],
    ui: [],
    hooks: []
  },
  realtime: {
    websocket: false,
    sse: false,
    pushNotifications: false
  },
  security: {
    authentication: false,
    authorization: false,
    rateLimit: false,
    csrf: false,
    mfa: false
  },
  features: {
    darkMode: false,
    favorites: false,
    notifications: false,
    qrCode: false,
    analytics: false
  },
  issues: [],
  recommendations: []
};

// Helper functions
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return null;
  }
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (e) {
    return false;
  }
}

function listFiles(dirPath, extension = '') {
  try {
    const files = fs.readdirSync(dirPath);
    if (extension) {
      return files.filter(f => f.endsWith(extension));
    }
    return files;
  } catch (e) {
    return [];
  }
}

// Analyze Backend Routes
function analyzeBackendRoutes() {
  console.log('📡 Analyzing Backend Routes...');
  const routesDir = path.join(projectRoot, 'server/src/routes');
  const routeFiles = listFiles(routesDir, '.js');
  
  routeFiles.forEach(file => {
    const content = readFile(path.join(routesDir, file));
    if (content) {
      const routes = [];
      
      // Find route definitions
      const getRoutes = content.match(/router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/g) || [];
      getRoutes.forEach(route => {
        const match = route.match(/router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/);
        if (match) {
          routes.push({ method: match[1].toUpperCase(), path: match[2] });
        }
      });
      
      analysis.routes.backend.push({
        file: file,
        routes: routes,
        count: routes.length
      });
    }
  });
  
  console.log(`   Found ${analysis.routes.backend.length} route files`);
  console.log(`   Total routes: ${analysis.routes.backend.reduce((sum, r) => sum + r.count, 0)}`);
}

// Analyze Backend Services
function analyzeServices() {
  console.log('⚙️  Analyzing Backend Services...');
  const servicesDir = path.join(projectRoot, 'server/src/services');
  const serviceFiles = listFiles(servicesDir, '.js');
  
  serviceFiles.forEach(file => {
    const filePath = path.join(servicesDir, file);
    const stats = fs.statSync(filePath);
    analysis.services.push({
      name: file.replace('.js', ''),
      file: file,
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024)
    });
  });
  
  console.log(`   Found ${analysis.services.length} services`);
}

// Analyze Frontend Components
function analyzeFrontendComponents() {
  console.log('🎨 Analyzing Frontend Components...');
  
  // Pages
  const pagesDir = path.join(projectRoot, 'client/src/pages');
  ['resident', 'guard', 'admin', 'public'].forEach(role => {
    const roleDir = path.join(pagesDir, role);
    if (fs.existsSync(roleDir)) {
      const pages = listFiles(roleDir, '.jsx');
      analysis.components.pages.push({
        role: role,
        pages: pages,
        count: pages.length
      });
    }
  });
  
  // UI Components
  const uiDir = path.join(projectRoot, 'client/src/components/ui');
  if (fs.existsSync(uiDir)) {
    const uiComponents = listFiles(uiDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));
    analysis.components.ui = uiComponents;
  }
  
  // Hooks
  const hooksDir = path.join(projectRoot, 'client/src/hooks');
  if (fs.existsSync(hooksDir)) {
    const hooks = listFiles(hooksDir, '.js').filter(f => f.startsWith('use'));
    analysis.components.hooks = hooks;
  }
  
  console.log(`   Found ${analysis.components.pages.reduce((s, p) => s + p.count, 0)} page components`);
  console.log(`   Found ${analysis.components.ui.length} UI components`);
  console.log(`   Found ${analysis.components.hooks.length} custom hooks`);
}

// Analyze Real-time Features
function analyzeRealtimeFeatures() {
  console.log('⚡ Analyzing Real-time Features...');
  
  // WebSocket
  const wsServicePath = path.join(projectRoot, 'server/src/services/websocketService.js');
  analysis.realtime.websocket = fileExists(wsServicePath);
  
  // SSE Routes
  const sseRoutePath = path.join(projectRoot, 'server/src/routes/sseRoutes.js');
  analysis.realtime.sse = fileExists(sseRoutePath);
  
  // Push Notifications
  const swPath = path.join(projectRoot, 'client/public/service-worker.js');
  if (fileExists(swPath)) {
    const content = readFile(swPath);
    analysis.realtime.pushNotifications = content && content.includes('push');
  }
  
  console.log(`   WebSocket: ${analysis.realtime.websocket ? '✅' : '❌'}`);
  console.log(`   SSE: ${analysis.realtime.sse ? '✅' : '❌'}`);
  console.log(`   Push Notifications: ${analysis.realtime.pushNotifications ? '✅' : '❌'}`);
}

// Analyze Security Features
function analyzeSecurityFeatures() {
  console.log('🔐 Analyzing Security Features...');
  
  const middlewareDir = path.join(projectRoot, 'server/src/middleware');
  
  // Authentication
  const authMiddleware = path.join(middlewareDir, 'authMiddleware.js');
  analysis.security.authentication = fileExists(authMiddleware);
  
  // Rate Limiting
  const configDir = path.join(projectRoot, 'server/src/config');
  const rateLimits = path.join(configDir, 'rateLimits.js');
  analysis.security.rateLimit = fileExists(rateLimits);
  
  // CSRF
  const securityHeaders = path.join(middlewareDir, 'securityHeaders.js');
  if (fileExists(securityHeaders)) {
    const content = readFile(securityHeaders);
    analysis.security.csrf = content && content.includes('csrf');
  }
  
  // MFA
  const mfaRoutes = path.join(projectRoot, 'server/src/routes/mfaRoutes.js');
  analysis.security.mfa = fileExists(mfaRoutes);
  
  // Authorization
  const authRoutes = path.join(projectRoot, 'server/src/routes/authRoutes.js');
  if (fileExists(authRoutes)) {
    const content = readFile(authRoutes);
    analysis.security.authorization = content && content.includes('role');
  }
  
  console.log(`   Authentication: ${analysis.security.authentication ? '✅' : '❌'}`);
  console.log(`   Authorization: ${analysis.security.authorization ? '✅' : '❌'}`);
  console.log(`   Rate Limiting: ${analysis.security.rateLimit ? '✅' : '❌'}`);
  console.log(`   CSRF Protection: ${analysis.security.csrf ? '✅' : '❌'}`);
  console.log(`   MFA Support: ${analysis.security.mfa ? '✅' : '❌'}`);
}

// Analyze Feature Implementations
function analyzeFeatures() {
  console.log('✨ Analyzing Feature Implementations...');
  
  // Dark Mode
  const themeContext = path.join(projectRoot, 'client/src/contexts/ThemeContext.jsx');
  analysis.features.darkMode = fileExists(themeContext);
  
  // Favorites
  const favoritesPage = path.join(projectRoot, 'client/src/pages/resident/FavoriteVisitors.jsx');
  const favoritesService = path.join(projectRoot, 'server/src/services/favoriteVisitorService.js');
  analysis.features.favorites = fileExists(favoritesPage) && fileExists(favoritesService);
  
  // Notifications
  const notificationBell = path.join(projectRoot, 'client/src/components/ui/NotificationBell.jsx');
  const notificationRoutes = path.join(projectRoot, 'server/src/routes/notificationRoutes.js');
  analysis.features.notifications = fileExists(notificationBell) && fileExists(notificationRoutes);
  
  // QR Code
  const qrRoutes = path.join(projectRoot, 'server/src/routes/qrCodeRoutes.js');
  analysis.features.qrCode = fileExists(qrRoutes);
  
  // Analytics
  const analyticsRoutes = path.join(projectRoot, 'server/src/routes/adminAnalyticsRoutes.js');
  analysis.features.analytics = fileExists(analyticsRoutes);
  
  console.log(`   Dark Mode: ${analysis.features.darkMode ? '✅' : '❌'}`);
  console.log(`   Favorites: ${analysis.features.favorites ? '✅' : '❌'}`);
  console.log(`   Notifications: ${analysis.features.notifications ? '✅' : '❌'}`);
  console.log(`   QR Code: ${analysis.features.qrCode ? '✅' : '❌'}`);
  console.log(`   Analytics: ${analysis.features.analytics ? '✅' : '❌'}`);
}

// Check for Issues
function checkForIssues() {
  console.log('🔍 Checking for Potential Issues...');
  
  // Check for missing dependencies
  const packageJson = path.join(projectRoot, 'server/package.json');
  if (fileExists(packageJson)) {
    const pkg = JSON.parse(readFile(packageJson));
    if (!pkg.dependencies['socket.io']) {
      analysis.issues.push('Missing socket.io dependency for WebSocket support');
    }
    if (!pkg.dependencies['web-push']) {
      analysis.issues.push('Missing web-push dependency for push notifications');
    }
  }
  
  // Check for missing migrations
  const migrationsDir = path.join(projectRoot, 'server/src/migrations');
  const migrations = listFiles(migrationsDir, '.sql');
  if (!migrations.some(m => m.includes('push-notifications'))) {
    analysis.issues.push('Push notifications migration may need to be run');
  }
  if (!migrations.some(m => m.includes('favorite-visitors'))) {
    analysis.issues.push('Favorite visitors migration may need to be run');
  }
  
  // Check for environment variables
  const envExample = path.join(projectRoot, '.env.example');
  if (fileExists(envExample)) {
    const content = readFile(envExample);
    if (!content.includes('VAPID')) {
      analysis.recommendations.push('Add VAPID keys to environment variables for push notifications');
    }
  }
  
  console.log(`   Found ${analysis.issues.length} potential issues`);
  console.log(`   Found ${analysis.recommendations.length} recommendations`);
}

// Generate Summary
function generateSummary() {
  const totalBackendRoutes = analysis.routes.backend.reduce((sum, r) => sum + r.count, 0);
  const totalPages = analysis.components.pages.reduce((sum, p) => sum + p.count, 0);
  
  analysis.summary = {
    backendRouteFiles: analysis.routes.backend.length,
    totalBackendRoutes: totalBackendRoutes,
    totalServices: analysis.services.length,
    totalPages: totalPages,
    totalUIComponents: analysis.components.ui.length,
    totalHooks: analysis.components.hooks.length,
    securityScore: Object.values(analysis.security).filter(Boolean).length * 20,
    featureScore: Object.values(analysis.features).filter(Boolean).length * 20,
    realtimeScore: Object.values(analysis.realtime).filter(Boolean).length * 33
  };
}

// Main Analysis Function
function runAnalysis() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     SecureGate Access Control System - Functionality Analysis  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  analyzeBackendRoutes();
  console.log('');
  
  analyzeServices();
  console.log('');
  
  analyzeFrontendComponents();
  console.log('');
  
  analyzeRealtimeFeatures();
  console.log('');
  
  analyzeSecurityFeatures();
  console.log('');
  
  analyzeFeatures();
  console.log('');
  
  checkForIssues();
  console.log('');
  
  generateSummary();
  
  // Print Summary
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                        SUMMARY                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📊 Backend:`);
  console.log(`   Route Files: ${analysis.summary.backendRouteFiles}`);
  console.log(`   Total Routes: ${analysis.summary.totalBackendRoutes}`);
  console.log(`   Services: ${analysis.summary.totalServices}`);
  console.log('');
  console.log(`🎨 Frontend:`);
  console.log(`   Pages: ${analysis.summary.totalPages}`);
  console.log(`   UI Components: ${analysis.summary.totalUIComponents}`);
  console.log(`   Custom Hooks: ${analysis.summary.totalHooks}`);
  console.log('');
  console.log(`📈 Scores:`);
  console.log(`   Security: ${analysis.summary.securityScore}%`);
  console.log(`   Features: ${analysis.summary.featureScore}%`);
  console.log(`   Real-time: ${analysis.summary.realtimeScore}%`);
  console.log('');
  
  if (analysis.issues.length > 0) {
    console.log('⚠️  Issues:');
    analysis.issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('');
  }
  
  if (analysis.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    analysis.recommendations.forEach(rec => console.log(`   - ${rec}`));
    console.log('');
  }
  
  // Save full analysis to JSON
  const outputPath = path.join(projectRoot, 'SYSTEM_ANALYSIS_REPORT.json');
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log(`📄 Full analysis saved to: SYSTEM_ANALYSIS_REPORT.json`);
  
  return analysis;
}

// Run the analysis
runAnalysis();
