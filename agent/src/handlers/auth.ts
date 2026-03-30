import type { WebSocket } from 'ws';
import { MSG } from '@vscode-remote/shared';
import { config, configStore } from '../config.js';
import { signToken, verifyToken } from '../auth/jwt.js';
import { verifyPassword } from '../services/passwordService.js';
import { sendResponse } from './router.js';
import { logger } from '../utils/logger.js';

// Rate limit: max 5 failed login attempts per 60 seconds
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts: { ts: number }[] = [];

function isLoginRateLimited(): boolean {
  const now = Date.now();
  // Remove expired entries
  while (loginAttempts.length > 0 && now - loginAttempts[0].ts > LOGIN_WINDOW_MS) {
    loginAttempts.shift();
  }
  return loginAttempts.length >= LOGIN_MAX_ATTEMPTS;
}

function recordFailedLogin(): void {
  loginAttempts.push({ ts: Date.now() });
}

export async function handleAuthMessage(
  ws: WebSocket,
  id: string,
  type: string,
  payload?: unknown
): Promise<void> {
  switch (type) {
    case MSG.AUTH_LOGIN: {
      const { machineId, password } = (payload || {}) as { machineId?: string; password?: string };

      if (isLoginRateLimited()) {
        logger.warn('Login rate limited');
        sendResponse(ws, id, type, false, undefined, 'Too many login attempts. Try again later.');
        return;
      }

      if (!machineId || !password) {
        sendResponse(ws, id, type, false, undefined, 'machineId and password are required');
        return;
      }

      if (machineId !== config.machineId) {
        recordFailedLogin();
        logger.warn('Failed login attempt: wrong machine ID', { machineId });
        sendResponse(ws, id, type, false, undefined, 'Invalid machine ID or password');
        return;
      }

      const store = configStore.get();
      const valid = await verifyPassword(password, store.passwords);
      if (!valid) {
        recordFailedLogin();
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
