"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { WebSocketClient, type ConnectionStatus } from "@/lib/ws/client";
import { useAuth } from "./AuthProvider";

interface WSContextValue {
  ws: WebSocketClient | null;
  status: ConnectionStatus;
}

const WSContext = createContext<WSContextValue>({
  ws: null,
  status: "disconnected",
});

// External store - persists across React Strict Mode remounts
let wsClient: WebSocketClient | null = null;
let wsUnsubscribe: (() => void) | null = null;
let wsToken: string | null = null;

let wsStore: { ws: WebSocketClient | null; status: ConnectionStatus } = {
  ws: null,
  status: "disconnected",
};
const wsListeners = new Set<() => void>();

function notify() {
  for (const cb of wsListeners) cb();
}

function subscribeWs(cb: () => void) {
  wsListeners.add(cb);
  return () => wsListeners.delete(cb);
}

function getWsSnapshot() {
  return wsStore;
}

const serverSnapshot: typeof wsStore = { ws: null, status: "disconnected" };

function connectWs(token: string) {
  // Already connected with same token
  if (wsClient && wsToken === token) return;

  // Disconnect old
  disconnectWs();

  const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = typeof window !== "undefined" ? window.location.host : "localhost:9001";
  const wsUrl = `${protocol}//${host}/api/ws`;

  const client = new WebSocketClient(wsUrl, token);
  wsUnsubscribe = client.onStatusChange((s) => {
    wsStore = { ws: client, status: s };
    notify();
  });

  client.connect();
  wsClient = client;
  wsToken = token;
  wsStore = { ws: client, status: "connecting" };
  notify();
}

function disconnectWs() {
  if (wsUnsubscribe) {
    wsUnsubscribe();
    wsUnsubscribe = null;
  }
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
  wsToken = null;
  wsStore = { ws: null, status: "disconnected" };
  notify();
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const store = useSyncExternalStore(subscribeWs, getWsSnapshot, () => serverSnapshot);

  useEffect(() => {
    if (token) {
      connectWs(token);
    } else {
      disconnectWs();
    }
    // Don't disconnect on cleanup - connection persists across Strict Mode remounts
    // Disconnect only when token changes to null (logout)
  }, [token]);

  return (
    <WSContext.Provider value={store}>
      {children}
    </WSContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WSContext);
}
