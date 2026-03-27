import { config, configStore } from './config.js';
import { RelayClient } from './relay/relayClient.js';
import { createLocalServer } from './server/local.js';
import { stopWatcher, onFileChange } from './services/watcherService.js';
import { closeAllTerminals } from './services/ptyService.js';
import { MSG } from './protocol.js';
import { logger } from './utils/logger.js';
import { AGENT_SECRET } from './constants.js';

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
  logger.info(`  Secret      : ${AGENT_SECRET}`);
  logger.info('='.repeat(40));

  // Create relay client (outbound WS to relay server)
  const relayClient = new RelayClient(config.relayUrl, store.machineId);

  // Forward file watch events to relay
  onFileChange((event) => relayClient.sendEvent(MSG.FS_WATCH_EVENT, event));

  // Connect to relay
  relayClient.connect();

  // Start local HTTP server (agent UI at localhost)
  createLocalServer(relayClient);

  if (config.workspaceRoot) {
    logger.info(`Workspace: ${config.workspaceRoot}`);
  } else {
    logger.info('No workspace folder set (will be selected from browser)');
  }

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
