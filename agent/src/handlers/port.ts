import type { WebSocket } from 'ws';
import { MSG } from '../protocol.js';
import type { PortForwardPayload } from '../protocol.js';
import * as portService from '../services/portService.js';
import * as tunnelService from '../services/tunnelService.js';
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
      const forwarded = Array.from(forwardedPorts);
      // Include tunnel URLs for each forwarded port
      const tunnelUrls: Record<number, string | null> = {};
      for (const port of forwarded) {
        tunnelUrls[port] = tunnelService.getTunnelUrl(port);
      }
      sendResponse(ws, id, type, true, { ports, forwarded, tunnelUrls });
      break;
    }
    case MSG.PORT_FORWARD: {
      const { port } = payload as PortForwardPayload;
      forwardedPorts.add(port);
      logger.info(`Port forwarded: ${port}`);

      // Try to create a devtunnel
      let tunnelUrl: string | null = null;
      try {
        tunnelUrl = await tunnelService.createTunnel(port);
      } catch (err) {
        logger.warn(`Failed to create tunnel for port ${port}: ${(err as Error).message}`);
      }

      sendResponse(ws, id, type, true, { port, tunnelUrl });
      break;
    }
    case MSG.PORT_UNFORWARD: {
      const { port } = payload as PortForwardPayload;
      forwardedPorts.delete(port);
      tunnelService.closeTunnel(port);
      logger.info(`Port unforwarded: ${port}`);
      sendResponse(ws, id, type, true);
      break;
    }
  }
}
