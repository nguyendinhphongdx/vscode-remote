import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, configStore } from '../config.js';
import type { RelayClient } from '../relay/relayClient.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.resolve(__dirname, '../../ui');

export function createLocalServer(relayClient: RelayClient) {
  const app = express();
  app.use(express.json());

  // Serve agent UI static files
  app.use(express.static(UI_DIR));

  // API: agent status
  app.get('/api/status', (_req, res) => {
    const store = configStore.get();
    res.json({
      machineId: store.machineId,
      password: store.passwords.random?.displayValue || null,
      hasFixedPassword: store.passwords.fixed !== null,
      relayConnected: relayClient.isConnected(),
      relayUrl: config.relayUrl,
      workspaceRoot: config.workspaceRoot,
    });
  });

  // API: connect to remote agent (browser asks local agent to initiate)
  app.post('/api/connect', (req, res) => {
    const { machineId } = req.body;
    if (!machineId) {
      res.status(400).json({ error: 'machineId is required' });
      return;
    }

    // Build the relay editor URL
    const relayHttpUrl = config.relayUrl
      .replace('ws://', 'http://')
      .replace('wss://', 'https://')
      .replace('/api/agent-ws', '');

    const editorUrl = `${relayHttpUrl}/editor/${machineId}`;
    res.json({ editorUrl });
  });

  const port = config.localPort;
  app.listen(port, '127.0.0.1', () => {
    logger.info(`Agent UI available at http://localhost:${port}`);
  });

  return app;
}
