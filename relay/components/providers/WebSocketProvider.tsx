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
let wsMachineId: string | null = null;

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

function connectWs(token: string, machineId: string) {
  // Already connected with same token + machineId
  if (wsClient && wsToken === token && wsMachineId === machineId) return;

  // Disconnect old
  disconnectWs();

  const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = typeof window !== "undefined" ? window.location.host : "localhost:9001";
  const wsUrl = `${protocol}//${host}/api/ws?machineId=${machineId}`;

  const client = new WebSocketClient(wsUrl, token);
  wsUnsubscribe = client.onStatusChange((s) => {
    wsStore = { ws: client, status: s };
    notify();
  });

  client.connect();
  wsClient = client;
  wsToken = token;
  wsMachineId = machineId;
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
  wsMachineId = null;
  wsStore = { ws: null, status: "disconnected" };
  notify();
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token, machineId, logout } = useAuth();
  const store = useSyncExternalStore(subscribeWs, getWsSnapshot, () => serverSnapshot);

  useEffect(() => {
    if (token && machineId) {
      connectWs(token, machineId);
    } else {
      disconnectWs();
    }
  }, [token, machineId]);

  // Force logout when token is rejected by server
  useEffect(() => {
    if (store.status === "auth_expired") {
      disconnectWs();
      logout();
    }
  }, [store.status, logout]);

  return (
    <WSContext.Provider value={store}>
      {children}
    </WSContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WSContext);
}
