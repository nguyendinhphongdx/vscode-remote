import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from '../config.js';
import { authenticateWS } from '../auth/middleware.js';
import { routeMessage, sendEvent } from '../handlers/router.js';
import { onFileChange } from '../services/watcherService.js';
import { MSG } from '../protocol.js';
import { logger } from '../utils/logger.js';

interface ConnectionInfo {
  connectedAt: Date;
}

const connections = new Map<WebSocket, ConnectionInfo>();

export function getConnectionCount(): number {
  return connections.size;
}

export function getConnections(): { connectedAt: string }[] {
  return Array.from(connections.values()).map((c) => ({
    connectedAt: c.connectedAt.toISOString(),
  }));
}

export function createWebSocketServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    // Check origin - skip if request comes from local proxy
    const origin = req.headers.origin;
    const remoteIp = req.socket.remoteAddress;
    const isLocalProxy = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1';
    if (origin && !isLocalProxy && !config.allowedOrigins.includes(origin)) {
      logger.warn('Rejected WS connection from origin', { origin });
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    // Check auth
    const user = authenticateWS(req);
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Check max connections
    if (connections.size >= config.maxConnections) {
      logger.warn('Max connections reached');
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, user);
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    connections.set(ws, { connectedAt: new Date() });
    logger.info(`Client connected (${connections.size} total)`);

    // Subscribe to file watcher events
    const unsubscribe = onFileChange((event) => {
      sendEvent(ws, MSG.FS_WATCH_EVENT, event);
    });

    ws.on('message', (data) => {
      routeMessage(ws, data.toString());
    });

    ws.on('close', () => {
      connections.delete(ws);
      unsubscribe();
      logger.info(`Client disconnected (${connections.size} total)`);
    });

    ws.on('error', (err) => {
      logger.error('WebSocket error', { error: err.message });
    });
  });

  return wss;
}
