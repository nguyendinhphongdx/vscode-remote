import { v4 as uuid } from "uuid";
import type { WSMessage, WSResponse } from "./protocol";

type EventHandler = (payload: unknown) => void;

interface PendingRequest {
  resolve: (payload: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private shouldReconnect = true;

  constructor(
    private url: string,
    private token: string
  ) {}

  connect(): void {
    this.shouldReconnect = true;
    this.notifyStatus("connecting");

    const separator = this.url.includes("?") ? "&" : "?";
    const wsUrl = `${this.url}${separator}token=${encodeURIComponent(this.token)}`;
    console.log("[ws] Connecting to:", wsUrl.substring(0, 50) + "...");
    const connectStart = Date.now();
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("[ws] Connected");
      this.reconnectDelay = 1000;
      this.notifyStatus("connected");
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = (event) => {
      console.log("[ws] Closed, code:", event.code, "reason:", event.reason, "shouldReconnect:", this.shouldReconnect);
      this.notifyStatus("disconnected");
      this.rejectAllPending();
      if (this.shouldReconnect) {
        // If closed very quickly after opening, retry fast (likely agent was reconnecting)
        const elapsed = Date.now() - connectStart;
        if (elapsed < 3000) {
          console.log("[ws] Connection closed quickly, retrying in 1s...");
          this.reconnectDelay = 1000;
        }
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.log("[ws] Error:", event);
    };
  }

  disconnect(): void {
    console.log("[ws] disconnect() called");
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.rejectAllPending();
  }

  async send<T = unknown>(type: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      const id = uuid();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${type}`));
      }, 30000);

      this.pendingRequests.set(id, {
        resolve: resolve as (payload: unknown) => void,
        reject,
        timeout,
      });

      const msg: WSMessage = { id, type, payload };
      this.ws.send(JSON.stringify(msg));
    });
  }

  on(type: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(handler);
    return () => this.eventHandlers.get(type)?.delete(handler);
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private handleMessage(raw: string): void {
    let data: WSResponse | WSMessage;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    // Check if this is a response to a pending request
    const pending = this.pendingRequests.get(data.id);
    if (pending && "success" in data) {
      this.pendingRequests.delete(data.id);
      clearTimeout(pending.timeout);
      if (data.success) {
        pending.resolve(data.payload);
      } else {
        pending.reject(new Error(data.error || "Request failed"));
      }
      return;
    }

    // Otherwise, dispatch as event
    const handlers = this.eventHandlers.get(data.type);
    if (handlers) {
      for (const handler of handlers) {
        handler("payload" in data ? data.payload : undefined);
      }
    }
  }

  private scheduleReconnect(): void {
    const jitter = Math.random() * 1000;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay + jitter);
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxReconnectDelay
    );
  }

  private rejectAllPending(): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Connection lost"));
    }
    this.pendingRequests.clear();
  }

  private notifyStatus(status: ConnectionStatus): void {
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}
