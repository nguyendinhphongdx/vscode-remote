import type { WebSocket } from 'ws';
import { MSG } from '@vscode-remote/shared';
import type { PortForwardPayload } from '@vscode-remote/shared';
import * as portService from '../services/portService.js';
import * as tunnelService from '../services/tunnelService.js';
import { sendResponse } from './router.js';
import { logger } from '../utils/logger.js';

// Ports that should never be forwarded (security-sensitive services)
const PORT_BLACKLIST = new Set([
  22,    // SSH
  23,    // Telnet
  25,    // SMTP
  53,    // DNS
  135,   // MSRPC
  139,   // NetBIOS
  445,   // SMB
  3306,  // MySQL
  5432,  // PostgreSQL
  6379,  // Redis
  27017, // MongoDB
]);

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
      const tunnelUrls: Record<number, string | null> = {};
      for (const port of forwarded) {
        tunnelUrls[port] = tunnelService.getTunnelUrl(port);
      }
      sendResponse(ws, id, type, true, { ports, forwarded, tunnelUrls });
      break;
    }
    case MSG.PORT_FORWARD: {
      const { port } = payload as PortForwardPayload;
      if (PORT_BLACKLIST.has(port)) {
        sendResponse(ws, id, type, false, { error: `Port ${port} is blacklisted for security reasons` });
        break;
      }
      try {
        const tunnelUrl = await tunnelService.createTunnel(port);
        forwardedPorts.add(port);
        logger.info(`Port forwarded: ${port} → ${tunnelUrl}`);
        sendResponse(ws, id, type, true, { port, tunnelUrl });
      } catch (err) {
        const message = (err as Error).message;
        logger.warn(`Failed to create tunnel for port ${port}: ${message}`);
        sendResponse(ws, id, type, false, { error: message });
      }
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
