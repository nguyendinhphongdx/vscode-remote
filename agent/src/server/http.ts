import express from 'express';
import cors from 'cors';
import { config, configStore } from '../config.js';
import { signToken } from '../auth/jwt.js';
import { verifyPassword } from '../services/passwordService.js';
import { logger } from '../utils/logger.js';
import { adminRoutes } from './adminRoutes.js';
import { serveAdminUi } from './adminUi.js';

export function createHttpServer() {
  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (proxy, curl, etc.) or from allowed origins
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for now since proxy handles security
      }
    },
  }));
  app.use(express.json());

  // Admin API
  app.use('/api/admin', adminRoutes);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', machineId: config.machineId, timestamp: Date.now() });
  });

  // Login with machineId + password
  app.post('/auth/login', async (req, res) => {
    const { machineId, password } = req.body;

    if (machineId !== config.machineId) {
      logger.warn('Failed login attempt: wrong machine ID', { machineId });
      res.status(401).json({ error: 'Invalid machine ID or password' });
      return;
    }

    const store = configStore.get();
    const valid = await verifyPassword(password, store.passwords);
    if (!valid) {
      logger.warn('Failed login attempt: wrong password');
      res.status(401).json({ error: 'Invalid machine ID or password' });
      return;
    }

    const { token, expiresAt } = signToken({ machineId });
    logger.info('Client connected via login', { machineId });
    res.json({ token, expiresAt });
  });

  // Admin UI - serve HTML when browser visits root
  app.get('/', serveAdminUi);

  return app;
}
