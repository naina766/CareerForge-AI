import { createServer } from './server.js';
import { env } from '@careerforge/config';
import { logger } from './utils/logger.js';

const app = createServer();
const port = env.PORT;

const server = app.listen(port, () => {
  logger.info(`🚀 CareerForge API server listening on http://localhost:${port}`, {
    environment: env.NODE_ENV,
    port
  });
});

// Graceful Shutdown
const handleShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down API server gracefully...`);
  server.close(() => {
    logger.info('API server closed successfully.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
