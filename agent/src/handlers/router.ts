import type { WebSocket } from 'ws';
import { v4 as uuid } from 'uuid';
import type { WSMessage, WSResponse } from '../protocol.js';
import { logger } from '../utils/logger.js';
import { handleFsMessage } from './fileSystem.js';
import { handleTerminalMessage } from './terminal.js';
import { handleGitMessage } from './git.js';
import { handlePortMessage } from './port.js';
import { handleWorkspaceMessage } from './workspace.js';
import { handleAuthMessage } from './auth.js';
import { handlePortProxy } from './portProxy.js';
import { MSG } from '../protocol.js';

export function sendResponse(
  ws: WebSocket,
  id: string,
  type: string,
  success: boolean,
  payload?: unknown,
  error?: string
): void {
  const response: WSResponse = { id, type, success, payload, error };
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(response));
  }
}

export function sendEvent(ws: WebSocket, type: string, payload: unknown): void {
  const msg: WSMessage = { id: uuid(), type, payload };
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export async function routeMessage(ws: WebSocket, raw: string): Promise<void> {
  let msg: WSMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    logger.warn('Invalid JSON message');
    return;
  }

  const { id, type, payload } = msg;

  try {
    if (type.startsWith('auth:')) {
      await handleAuthMessage(ws, id, type, payload);
    } else if (type === MSG.PORT_PROXY) {
      await handlePortProxy(ws, id, type, payload);
    } else if (type.startsWith('fs:')) {
      await handleFsMessage(ws, id, type, payload);
    } else if (type.startsWith('terminal:')) {
      await handleTerminalMessage(ws, id, type, payload);
    } else if (type.startsWith('git:')) {
      await handleGitMessage(ws, id, type, payload);
    } else if (type.startsWith('port:')) {
      await handlePortMessage(ws, id, type, payload);
    } else if (type.startsWith('workspace:')) {
      await handleWorkspaceMessage(ws, id, type, payload);
    } else {
      sendResponse(ws, id, type, false, undefined, `Unknown message type: ${type}`);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    // Don't log ENOENT errors (file not found) - expected during path resolution
    const isEnoent = err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
    if (!isEnoent) {
      logger.error(`Handler error [${type}]`, { error });
    }
    sendResponse(ws, id, type, false, undefined, error);
  }
}
