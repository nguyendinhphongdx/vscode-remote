import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface TokenPayload {
  machineId: string;
}

export function signToken(payload: TokenPayload): { token: string; expiresAt: number } {
  const expiresIn = '24h';
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn });
  return { token, expiresAt };
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}
