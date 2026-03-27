import type { WebSocket } from 'ws';
import { MSG } from '../protocol.js';
import type { PortForwardPayload } from '../protocol.js';
import * as portService from '../services/portService.js';
import { sendResponse } from './router.js';
import { logger } from '../utils/logger.js';

// Track which ports are being forwarded
const forwardedPorts = new Set<number>();

export function getForwardedPorts(): Set<number> {
  return forwardedPorts;
}

export function isPortForwarded(port: number): boolean {
  return forwardedPorts.has(port);
}

export async function handlePortMessage(
  ws: WebSocket,
  id: string,
  type: string,
  payload?: unknown,
): Promise<void> {
  switch (type) {
    case MSG.PORT_LIST: {
      const ports = await portService.getListeningPorts();
      sendResponse(ws, id, type, true, {
        ports,
        forwarded: Array.from(forwardedPorts),
      });
      break;
    }
    case MSG.PORT_FORWARD: {
      const { port } = payload as PortForwardPayload;
      forwardedPorts.add(port);
      logger.info(`Port forwarded: ${port}`);
      sendResponse(ws, id, type, true, { port });
      break;
    }
    case MSG.PORT_UNFORWARD: {
      const { port } = payload as PortForwardPayload;
      forwardedPorts.delete(port);
      logger.info(`Port unforwarded: ${port}`);
      sendResponse(ws, id, type, true);
      break;
    }
  }
}
