import WebSocket from 'ws';
import { v4 as uuid } from 'uuid';
import { MSG, type WSMessage, type WSResponse } from '@vscode-remote/shared';
import { routeMessage, sendEvent } from '../handlers/router.js';
import { addSubscriber, removeSubscriber } from '../services/watcherService.js';
import { logger } from '../utils/logger.js';

export class RelayClient {
  private ws: WebSocket | null = null;
  private relayUrl: string;
  private machineId: string;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private registered = false;

  constructor(relayUrl: string, machineId: string) {
    this.relayUrl = relayUrl;
    this.machineId = machineId;
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    logger.info('Connecting to relay...', { url: this.relayUrl });

    this.ws = new WebSocket(this.relayUrl);

    this.ws.on('open', () => {
      logger.info('Connected to relay, registering...');
      this.reconnectDelay = 1000;
      this.registered = false;

      // Send registration
      const registerMsg: WSMessage = {
        id: uuid(),
        type: MSG.AGENT_REGISTER,
        payload: { machineId: this.machineId, secret: process.env.RELAY_SECRET || '' },
      };
      this.ws!.send(JSON.stringify(registerMsg));
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      const raw = data.toString();

      // Check for registration response or relay notifications
      try {
        const parsed = JSON.parse(raw);
        if (parsed.type === MSG.AGENT_REGISTERED) {
          if (parsed.success) {
            this.registered = true;
            logger.info('Registered with relay successfully');
          } else {
            logger.error('Relay registration rejected', { error: parsed.error });
            this.shouldReconnect = false;
            this.ws?.close();
          }
          return;
        }

        // Browser connect/disconnect → manage file watcher lifecycle
        if (parsed.type === MSG.BROWSER_CONNECTED) {
          addSubscriber();
          return;
        }
        if (parsed.type === MSG.BROWSER_DISCONNECTED) {
          removeSubscriber();
          return;
        }
      } catch {
        // Not JSON, ignore
      }

      // Forward all other messages to router
      if (this.registered && this.ws) {
        routeMessage(this.ws, raw);
      }
    });

    this.ws.on('close', () => {
      logger.warn('Disconnected from relay');
      this.registered = false;
      this.ws = null;
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (err) => {
      logger.error('Relay connection error', { error: err.message });
      // onclose will fire after this
    });
  }

  /**
   * Send an event to the relay (file watch, terminal output, etc.)
   */
  sendEvent(type: string, payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.registered) return;
    sendEvent(this.ws, type, payload);
  }

  /**
   * Get the raw WebSocket connection (used by terminal/watcher callbacks)
   */
  getWs(): WebSocket | null {
    return this.ws;
  }

  isConnected(): boolean {
    return this.registered && this.ws?.readyState === WebSocket.OPEN;
  }

  reconnect(newUrl?: string): void {
    if (newUrl) this.relayUrl = newUrl;
    this.shouldReconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      // onclose will trigger scheduleReconnect
    } else {
      this.reconnectDelay = 1000;
      this.connect();
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.registered = false;
  }

  private scheduleReconnect(): void {
    const jitter = Math.random() * 1000;
    const delay = this.reconnectDelay + jitter;
    logger.info(`Reconnecting to relay in ${Math.round(delay / 1000)}s...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      this.connect();
    }, delay);
  }
}
