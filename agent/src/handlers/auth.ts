import type { WebSocket } from 'ws';
import { MSG } from '../protocol.js';
import { config, configStore } from '../config.js';
import { signToken, verifyToken } from '../auth/jwt.js';
import { verifyPassword } from '../services/passwordService.js';
import { sendResponse } from './router.js';
import { logger } from '../utils/logger.js';

export async function handleAuthMessage(
  ws: WebSocket,
  id: string,
  type: string,
  payload?: unknown
): Promise<void> {
  switch (type) {
    case MSG.AUTH_LOGIN: {
      const { machineId, password } = (payload || {}) as { machineId?: string; password?: string };

      if (!machineId || !password) {
        sendResponse(ws, id, type, false, undefined, 'machineId and password are required');
        return;
      }

      if (machineId !== config.machineId) {
        logger.warn('Failed login attempt: wrong machine ID', { machineId });
        sendResponse(ws, id, type, false, undefined, 'Invalid machine ID or password');
        return;
      }

      const store = configStore.get();
      const valid = await verifyPassword(password, store.passwords);
      if (!valid) {
        logger.warn('Failed login attempt: wrong password');
        sendResponse(ws, id, type, false, undefined, 'Invalid machine ID or password');
        return;
      }

      const { token, expiresAt } = signToken({ machineId });
      logger.info('Client authenticated via relay', { machineId });
      sendResponse(ws, id, type, true, { token, expiresAt });
      break;
    }

    case MSG.AUTH_VERIFY: {
      const { token } = (payload || {}) as { token?: string };
      if (!token) {
        sendResponse(ws, id, type, false, undefined, 'Token is required');
        return;
      }

      try {
        const decoded = verifyToken(token);
        if (decoded.machineId !== config.machineId) {
          sendResponse(ws, id, type, false, undefined, 'Token machine ID mismatch');
          return;
        }
        sendResponse(ws, id, type, true, { machineId: decoded.machineId });
      } catch {
        sendResponse(ws, id, type, false, undefined, 'Invalid or expired token');
      }
      break;
    }

    default:
      sendResponse(ws, id, type, false, undefined, `Unknown auth message: ${type}`);
  }
}
