import { IncomingMessage } from 'http';
import { verifyToken, TokenPayload } from './jwt.js';
import { logger } from '../utils/logger.js';

export function authenticateWS(req: IncomingMessage): TokenPayload | null {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      logger.warn('WS connection without token');
      return null;
    }

    return verifyToken(token);
  } catch (err) {
    logger.warn('WS auth failed', { error: (err as Error).message });
    return null;
  }
}
