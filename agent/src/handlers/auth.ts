import type { WebSocket } from 'ws';
import crypto from 'crypto';
import { MSG } from '@vscode-remote/shared';
import { config, configStore } from '../config.js';
import { signToken, verifyToken } from '../auth/jwt.js';
import { verifyPassword } from '../services/passwordService.js';
import { verifyCode as verifyTotpCode } from '../services/totpService.js';
import { sendResponse } from './router.js';
import { logger } from '../utils/logger.js';

// Rate limit: max 5 failed login attempts per 60 seconds
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts: { ts: number }[] = [];

// Pending OTP sessions (password verified, awaiting TOTP code)
// Maps sessionId -> { machineId, expiresAt }
const OTP_SESSION_TTL = 5 * 60 * 1000; // 5 minutes
const otpSessions = new Map<string, { machineId: string; expiresAt: number }>();

function isLoginRateLimited(): boolean {
  const now = Date.now();
  while (loginAttempts.length > 0 && now - loginAttempts[0].ts > LOGIN_WINDOW_MS) {
    loginAttempts.shift();
  }
  return loginAttempts.length >= LOGIN_MAX_ATTEMPTS;
}

function recordFailedLogin(): void {
  loginAttempts.push({ ts: Date.now() });
}

function createOtpSession(machineId: string): string {
  const sessionId = crypto.randomBytes(32).toString('hex');
  otpSessions.set(sessionId, {
    machineId,
    expiresAt: Date.now() + OTP_SESSION_TTL,
  });
  return sessionId;
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of otpSessions) {
    if (now > session.expiresAt) otpSessions.delete(id);
  }
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

      // Check if 2FA is enabled
      if (configStore.isTotpEnabled()) {
        // Password OK, but need OTP verification
        cleanupExpiredSessions();
        const otpSession = createOtpSession(machineId);
        logger.info('Password verified, awaiting OTP', { machineId });
        sendResponse(ws, id, type, true, {
          requireOtp: true,
          otpSession,
        });
        return;
      }

      // No 2FA - issue token directly
      const { token, expiresAt } = signToken({ machineId });
      logger.info('Client authenticated via relay', { machineId });
      sendResponse(ws, id, type, true, { token, expiresAt });
      break;
    }

    case MSG.AUTH_OTP_VERIFY: {
      const { machineId, otpSession, code } = (payload || {}) as {
        machineId?: string;
        otpSession?: string;
        code?: string;
      };

      if (isLoginRateLimited()) {
        sendResponse(ws, id, type, false, undefined, 'Too many attempts. Try again later.');
        return;
      }

      if (!machineId || !otpSession || !code) {
        sendResponse(ws, id, type, false, undefined, 'machineId, otpSession, and code are required');
        return;
      }

      // Validate OTP session
      cleanupExpiredSessions();
      const session = otpSessions.get(otpSession);
      if (!session || session.machineId !== machineId) {
        recordFailedLogin();
        sendResponse(ws, id, type, false, undefined, 'Invalid or expired OTP session');
        return;
      }

      const totpConfig = configStore.getTotpConfig();
      if (!totpConfig) {
        // TOTP was disabled between login and OTP verify — just issue token
        otpSessions.delete(otpSession);
        const { token, expiresAt } = signToken({ machineId });
        sendResponse(ws, id, type, true, { token, expiresAt });
        return;
      }

      // Try TOTP code first
      const totpValid = verifyTotpCode(totpConfig.secret, code, machineId);

      if (totpValid) {
        otpSessions.delete(otpSession);
        const { token, expiresAt } = signToken({ machineId });
        logger.info('Client authenticated with 2FA', { machineId });
        sendResponse(ws, id, type, true, { token, expiresAt });
        return;
      }

      // Try backup code
      const normalizedCode = code.toLowerCase().trim();
      const backupValid = await configStore.consumeBackupCode(normalizedCode);

      if (backupValid) {
        otpSessions.delete(otpSession);
        const { token, expiresAt } = signToken({ machineId });
        logger.info('Client authenticated with backup code', { machineId });
        sendResponse(ws, id, type, true, { token, expiresAt });
        return;
      }

      recordFailedLogin();
      logger.warn('Failed OTP verification', { machineId });
      sendResponse(ws, id, type, false, undefined, 'Invalid verification code');
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
