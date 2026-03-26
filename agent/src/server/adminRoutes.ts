import { Router } from 'express';
import { configStore } from '../config.js';
import { getConnectionCount, getConnections } from './websocket.js';

const startTime = Date.now();

export const adminRoutes = Router();

// GET /api/admin/status
adminRoutes.get('/status', (_req, res) => {
  const store = configStore.get();
  res.json({
    machineId: store.machineId,
    connections: getConnectionCount(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    port: store.settings.port,
    workspaceRoot: store.settings.workspaceRoot,
  });
});

// GET /api/admin/settings
adminRoutes.get('/settings', (_req, res) => {
  const settings = configStore.getSettings();
  // Don't expose jwtSecret
  const { jwtSecret: _, ...safe } = settings;
  res.json(safe);
});

// PUT /api/admin/settings
adminRoutes.put('/settings', async (req, res) => {
  const allowed = ['workspaceRoot', 'maxConnections', 'maxTerminals', 'allowedOrigins'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }
  const settings = await configStore.updateSettings(updates);
  const { jwtSecret: _, ...safe } = settings;
  res.json(safe);
});

// GET /api/admin/password
adminRoutes.get('/password', (_req, res) => {
  const store = configStore.get();
  res.json({
    randomPassword: store.passwords.random?.displayValue || null,
    hasFixedPassword: store.passwords.fixed !== null,
  });
});

// POST /api/admin/password/regenerate
adminRoutes.post('/password/regenerate', async (_req, res) => {
  const newPassword = await configStore.regenerateRandomPassword();
  res.json({ randomPassword: newPassword });
});

// PUT /api/admin/password/fixed
adminRoutes.put('/password/fixed', async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters' });
    return;
  }
  await configStore.setFixedPassword(password);
  res.json({ success: true });
});

// DELETE /api/admin/password/fixed
adminRoutes.delete('/password/fixed', async (_req, res) => {
  await configStore.clearFixedPassword();
  res.json({ success: true });
});

// GET /api/admin/connections
adminRoutes.get('/connections', (_req, res) => {
  res.json({ count: getConnectionCount(), connections: getConnections() });
});
