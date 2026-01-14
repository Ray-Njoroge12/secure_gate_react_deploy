import logger from '../config/logger.js';
import { dbManager } from '../database/db.enhanced.js';

export const gracefulShutdownHandler = (server) => {
  const shutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully`);

    server.close(() => {
      logger.info('HTTP server closed');

      dbManager.close().then(() => {
        logger.info('Database connections closed');
        process.exit(0);
      }).catch((err) => {
        logger.error('Error closing database connections:', err);
        process.exit(1);
      });
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

export default gracefulShutdownHandler;
