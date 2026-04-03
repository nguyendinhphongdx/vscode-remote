import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { config, configStore } from '../config.js';
import type { RelayClient } from '../relay/relayClient.js';
import { logger } from '../utils/logger.js';
import { generateSecret, generateBackupCodes, verifyCode, generateQRCode } from '../services/totpService.js';

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
      totpEnabled: store.totp !== null,
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

    // Build the relay editor URL from persisted settings (not env override)
    const store = configStore.get();
    const actualRelayUrl = store.settings.relayUrl || config.relayUrl;
    const relayHttpUrl = actualRelayUrl
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

  // ===== TOTP / 2FA APIs =====

  // GET /api/totp/status — check if TOTP is enabled + backup codes remaining
  app.get('/api/totp/status', (_req, res) => {
    const totpConfig = configStore.getTotpConfig();
    res.json({
      enabled: totpConfig !== null,
      backupCodesRemaining: totpConfig?.backupCodes.length ?? 0,
    });
  });

  // POST /api/totp/setup — generate new secret + QR code (does NOT enable yet)
  app.post('/api/totp/setup', async (_req, res) => {
    try {
      const store = configStore.get();
      const secret = generateSecret();
      const qrCode = await generateQRCode(secret, store.machineId);
      const backupCodes = generateBackupCodes();
      res.json({ secret, qrCode, backupCodes });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/totp/enable — verify a code then enable TOTP
  app.post('/api/totp/enable', async (req, res) => {
    const { secret, code, backupCodes } = req.body;
    if (!secret || !code || !backupCodes) {
      res.status(400).json({ error: 'secret, code, and backupCodes are required' });
      return;
    }

    const store = configStore.get();
    const valid = verifyCode(secret, code, store.machineId);
    if (!valid) {
      res.status(400).json({ error: 'Invalid verification code. Make sure your authenticator is synced.' });
      return;
    }

    await configStore.enableTotp(secret, backupCodes);
    logger.info('TOTP 2FA enabled');
    res.json({ success: true });
  });

  // POST /api/totp/disable — disable TOTP (requires current password)
  app.post('/api/totp/disable', async (req, res) => {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: 'Password is required to disable 2FA' });
      return;
    }

    const store = configStore.get();
    const { verifyPassword } = await import('../services/passwordService.js');
    const valid = await verifyPassword(password, store.passwords);
    if (!valid) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    await configStore.disableTotp();
    logger.info('TOTP 2FA disabled');
    res.json({ success: true });
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
