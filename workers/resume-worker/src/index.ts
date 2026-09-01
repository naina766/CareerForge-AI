import { createResumeWorkerConsumer } from './consumer.js';
import { logger } from '../../../apps/api/src/utils/logger.js';

async function main() {
  logger.info('Starting CareerForge Resume Worker...');
  const consumer = createResumeWorkerConsumer();
  await consumer.start();

  process.on('SIGTERM', async () => {
    logger.info('Shutting down Resume Worker...');
    await consumer.stop();
    process.exit(0);
  });
}

if (process.env.NODE_ENV !== 'test') {
  main().catch((err) => {
    logger.error(`Resume Worker startup failure: ${err.message}`);
    process.exit(1);
  });
}
