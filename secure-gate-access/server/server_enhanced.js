// Enhanced server.js with full functionality
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Import the enhanced app
import app from './src/app_enhanced.js';

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';

// Start the server
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Enhanced Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check available at http://${HOST}:${PORT}/health`);
  console.log(`🔧 API endpoints available at http://${HOST}:${PORT}/api/*`);
  console.log(`🔐 Authentication: POST http://${HOST}:${PORT}/api/auth/login`);
  console.log(`👥 Residents: GET http://${HOST}:${PORT}/api/residents`);
  console.log(`🛡️ Guards: GET http://${HOST}:${PORT}/api/guards`);
  console.log(`👑 Admin: GET http://${HOST}:${PORT}/api/admin`);
  console.log(`👤 Visitors: GET/POST http://${HOST}:${PORT}/api/visitors`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default server;
