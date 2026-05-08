import { config, configStore } from './config.js';
import { RelayClient } from './relay/relayClient.js';
import { createLocalServer } from './server/local.js';
import { stopWatcher, onFileChange } from './services/watcherService.js';
import { closeAllTerminals } from './services/ptyService.js';
import { MSG } from '@vscode-remote/shared';
import { logger } from './utils/logger.js';

async function main() {
  await configStore.initialize();

  const store = configStore.get();
  const mid = store.machineId;
  const relayUrl = config.relayUrl;
  const relaySecret = config.relaySecret;

  const formattedId = `${mid.slice(0,3)}-${mid.slice(3,6)}-${mid.slice(6)}`;
  logger.info('='.repeat(40));
  logger.info(`  Machine ID : ${formattedId}`);
  const pw = configStore.getRandomPassword();
  logger.info(`  Password   : ${pw || '(none — use fixed password)'}`);
  logger.info(`  Relay      : ${relayUrl || '(not set)'}`);
  logger.info(`  Secret     : ${relaySecret ? '***configured***' : '⚠ NOT SET'}`);
  logger.info('='.repeat(40));

  if (!relayUrl || !relaySecret) {
    logger.error('Relay is not configured. Run:');
    logger.error('  opencode setup <relay-url> <relay-secret>');
    logger.error('Example:');
    logger.error('  opencode setup wss://relay.example.com/api/agent-ws my-secret');
    process.exit(1);
  }

  const relayClient = new RelayClient(relayUrl, store.machineId);
  onFileChange((event) => relayClient.sendEvent(MSG.FS_WATCH_EVENT, event));
  relayClient.connect();
  createLocalServer(relayClient);

  if (config.workspaceRoot) {
    logger.info(`Workspace: ${config.workspaceRoot}`);
  } else {
    logger.info('No workspace folder set (will be selected from browser)');
  }

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
