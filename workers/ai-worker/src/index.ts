import { createAIWorkerConsumer } from './consumer.js';
import { logger } from '../../../apps/api/src/utils/logger.js';

async function main() {
  logger.info('Starting CareerForge AI Worker...');
  const consumer = createAIWorkerConsumer();
  await consumer.start();

  process.on('SIGTERM', async () => {
    logger.info('Shutting down AI Worker...');
    await consumer.stop();
    process.exit(0);
  });
}

if (process.env.NODE_ENV !== 'test') {
  main().catch((err) => {
    logger.error(`AI Worker startup failure: ${err.message}`);
    process.exit(1);
  });
}
