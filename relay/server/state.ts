import type { WebSocket } from "ws";

export interface AgentConnection {
  ws: WebSocket;
  machineId: string;
  connectedAt: Date;
}

export interface BrowserConnection {
  ws: WebSocket;
  machineId: string;
}

// Shared mutable state
export const agents = new Map<string, AgentConnection>();
export const browsers = new Map<WebSocket, BrowserConnection>();
export const pendingRequests = new Map<string, WebSocket>(); // msgId → browser WS
export const pendingHttpRequests = new Map<string, (response: unknown) => void>(); // msgId → HTTP callback

export function getBrowsersForAgent(machineId: string): BrowserConnection[] {
  const result: BrowserConnection[] = [];
  for (const bc of browsers.values()) {
    if (bc.machineId === machineId) result.push(bc);
  }
  return result;
}

export function isResponse(msg: { success?: boolean }): boolean {
  return typeof msg.success === "boolean";
}
