import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { config, configStore } from '../config.js';
import type { RelayClient } from '../relay/relayClient.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dev (tsx): __dirname = src/server/ → ../../ui
// prod (tsup bundle into dist/): __dirname = dist/ → ../ui
const UI_DIR = existsSync(path.resolve(__dirname, '../../ui/index.html'))
  ? path.resolve(__dirname, '../../ui')
  : path.resolve(__dirname, '../ui');
const DOCS_DIR = path.resolve(UI_DIR, 'docs');

export function createLocalServer(relayClient: RelayClient): void {
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

  // API: regenerate random password
  app.post('/api/password/regenerate', async (_req, res) => {
    const newPassword = await configStore.regenerateRandomPassword();
    res.json({ password: newPassword });
  });

  // API: get settings
  app.get('/api/settings', (_req, res) => {
    const store = configStore.get();
    res.json({
      relayUrl: store.settings.relayUrl,
      workspaceRoot: store.settings.workspaceRoot,
      localPort: store.settings.localPort,
    });
  });

  // API: update settings (requires restart for some changes)
  app.put('/api/settings', async (req, res) => {
    const { relayUrl, workspaceRoot } = req.body;
    const updates: Record<string, unknown> = {};

    if (relayUrl !== undefined) updates.relayUrl = relayUrl;
    if (workspaceRoot !== undefined) updates.workspaceRoot = workspaceRoot;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No settings to update' });
      return;
    }

    try {
      await configStore.updateSettings(updates as Parameters<typeof configStore.updateSettings>[0]);
      logger.info('Settings updated', updates);

      // Auto-reconnect relay if URL changed
      if (relayUrl !== undefined) {
        relayClient.reconnect(relayUrl);
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // API: list docs
  app.get('/api/docs', async (_req, res) => {
    try {
      const files = await fs.readdir(DOCS_DIR);
      const docs = files
        .filter((f) => f.endsWith('.md'))
        .map((f) => {
          const slug = f.replace('.md', '');
          const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          return { slug, title, file: f };
        })
        .sort((a, b) => {
          // Pin getting-started first, then alphabetical
          if (a.slug === 'getting-started') return -1;
          if (b.slug === 'getting-started') return 1;
          return a.title.localeCompare(b.title);
        });
      res.json(docs);
    } catch {
      res.json([]);
    }
  });

  // API: get single doc content (raw markdown)
  app.get('/api/docs/:slug', async (req, res) => {
    const slug = req.params.slug.replace(/[^a-z0-9-]/gi, '');
    const filePath = path.join(DOCS_DIR, `${slug}.md`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      res.type('text/markdown').send(content);
    } catch {
      res.status(404).json({ error: 'Doc not found' });
    }
  });

  const port = config.localPort;
  app.listen(port, '127.0.0.1', () => {
    logger.info(`Agent UI available at http://localhost:${port}`);
  });

}
