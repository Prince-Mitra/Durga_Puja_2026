const http = require('http');
const config = require('./config/env');
const connectDB = require('./config/db');
const storage = require('./services/storage');
const socketService = require('./services/socketService');
const { ensureAdmin } = require('./services/adminSeed');
const createApp = require('./app');

async function main() {
  await connectDB();
  await storage.init();
  await ensureAdmin();

  const app = createApp();
  const httpServer = http.createServer(app);
  socketService.init(httpServer);

  httpServer.listen(config.port, () => {
    console.log(`[server] http://localhost:${config.port}  (${config.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error(`[server] failed to start: ${error.message}`);
  process.exit(1);
});
