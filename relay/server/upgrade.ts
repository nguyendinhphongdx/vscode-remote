import type { IncomingMessage } from "http";
import type { Socket } from "net";
import type { WebSocketServer } from "ws";
import { handleAgentConnection } from "./agentHandler.js";
import { handleBrowserConnection } from "./browserHandler.js";

export function createUpgradeHandler(
  wss: WebSocketServer,
  nextUpgradeListeners: Function[],
  port: number,
  relaySecret: string | undefined
) {
  return async (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const url = new URL(req.url || "/", `http://localhost:${port}`);

    if (url.pathname === "/api/agent-ws") {
      // Agent connection
      wss.handleUpgrade(req, socket, head, (ws) => {
        handleAgentConnection(ws, relaySecret);
      });
    } else if (url.pathname === "/api/ws") {
      // Browser connection — only machineId required, token sent via first message
      const machineId = url.searchParams.get("machineId");
      if (!machineId) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        handleBrowserConnection(ws, machineId);
      });
    } else {
      // Next.js HMR
      for (const listener of nextUpgradeListeners) {
        (listener as (...args: unknown[]) => void).call(null, req, socket, head);
      }
    }
  };
}
