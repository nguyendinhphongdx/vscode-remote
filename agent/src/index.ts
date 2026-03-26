import http from 'http';
import { config, configStore } from './config.js';
import { createHttpServer } from './server/http.js';
import { createWebSocketServer } from './server/websocket.js';
import { startWatcher, stopWatcher } from './services/watcherService.js';
import { closeAllTerminals } from './services/ptyService.js';
import { logger } from './utils/logger.js';

async function main() {
  // Initialize persistent config (machine ID, passwords, settings)
  await configStore.initialize();

  const store = configStore.get();
  logger.info('='.repeat(50));
  logger.info(`Machine ID : ${store.machineId}`);
  if (store.passwords.random) {
    logger.info(`Password   : ${store.passwords.random.displayValue}`);
  }
  logger.info('='.repeat(50));

  const app = createHttpServer();
  const server = http.createServer(app);
  createWebSocketServer(server);
  startWatcher();

  server.listen(config.port, () => {
    logger.info(`Agent running on port ${config.port}`);
    logger.info(`Workspace: ${config.workspaceRoot}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down.......');
    closeAllTerminals();
    stopWatcher();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('Failed to start agent', { error: (err as Error).message });
  process.exit(1);
});
