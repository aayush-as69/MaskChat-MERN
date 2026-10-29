import http from 'node:http';
import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';
import { attachSocketServer } from './socket.js';
import { processMatchingQueueBatch } from './matching-queue.js';
import { incrementMetric } from './observability.js';

const app = createApp();
const server = http.createServer(app);
attachSocketServer(server);

async function start() {
  await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const queueTimer = setInterval(() => processMatchingQueueBatch().catch((error) => { incrementMetric('matching_queue_worker_errors'); console.error('Matching queue worker failed:', error.message); }), 15_000);
  queueTimer.unref();
  server.listen(config.PORT, () => console.log(`MaskChat API listening on port ${config.PORT}`));
}
async function shutdown(signal) {
  console.log(`${signal}: shutting down`);
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
start().catch((error) => {
  console.error('Startup failed:', error.message);
  process.exit(1);
});
