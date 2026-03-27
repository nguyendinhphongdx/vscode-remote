import { config, configStore } from './config.js';
import { RelayClient } from './relay/relayClient.js';
import { createLocalServer } from './server/local.js';
import { startWatcher, stopWatcher, onFileChange } from './services/watcherService.js';
import { closeAllTerminals } from './services/ptyService.js';
import { MSG } from './protocol.js';
import { logger } from './utils/logger.js';

async function main() {
  await configStore.initialize();

  const store = configStore.get();
  const mid = store.machineId;

  const formattedId = `${mid.slice(0,3)}-${mid.slice(3,6)}-${mid.slice(6)}`;
  logger.info('='.repeat(40));
  logger.info(`  Machine ID : ${formattedId}`);
  if (store.passwords.random) {
    logger.info(`  Password   : ${store.passwords.random.displayValue}`);
  }
  logger.info(`  Relay      : ${config.relayUrl}`);
  logger.info('='.repeat(40));

  // Start file watcher
  startWatcher();

  // Create relay client (outbound WS to relay server)
  const relayClient = new RelayClient(config.relayUrl, store.machineId, config.agentSecret);

  // Forward file watch events to relay
  onFileChange((event) => relayClient.sendEvent(MSG.FS_WATCH_EVENT, event));

  // Connect to relay
  relayClient.connect();

  // Start local HTTP server (agent UI at localhost)
  createLocalServer(relayClient);

  logger.info(`Workspace: ${config.workspaceRoot}`);

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down...');
    closeAllTerminals();
    stopWatcher();
    relayClient.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('Failed to start agent', { error: (err as Error).message });
  process.exit(1);
});
