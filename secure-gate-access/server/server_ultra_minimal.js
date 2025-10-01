// Ultra minimal server.js for testing
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Import the ultra minimal app
import app from './src/app_ultra_minimal.js';

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';

// Start the server
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Ultra Minimal Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check available at http://${HOST}:${PORT}/health`);
  console.log(`🔧 API test available at http://${HOST}:${PORT}/api/test`);
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
