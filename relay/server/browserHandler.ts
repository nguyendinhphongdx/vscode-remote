import { WebSocket, type RawData } from "ws";
import { v4 as uuid } from "uuid";
import { agents, browsers, pendingRequests } from "./state.js";
import { verifyTokenViaAgent } from "./agentBridge.js";

const AUTH_TIMEOUT_MS = 10000;

export function handleBrowserConnection(ws: WebSocket, machineId: string) {
  let authenticated = false;
  let authTimer: ReturnType<typeof setTimeout> | null = null;

  // Must authenticate within timeout
  authTimer = setTimeout(() => {
    if (!authenticated) {
      ws.send(JSON.stringify({ id: uuid(), type: "error", success: false, error: "Auth timeout" }));
      ws.close();
    }
  }, AUTH_TIMEOUT_MS);

  ws.on("message", async (data: RawData) => {
    const raw = data.toString();
    let msg: { id: string; type: string; payload?: unknown };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    // First message must be auth:authenticate
    if (!authenticated) {
      if (msg.type !== "auth:authenticate") {
        ws.send(JSON.stringify({ id: msg.id, type: msg.type, success: false, error: "Not authenticated" }));
        return;
      }

      const payload = msg.payload as { token?: string } | undefined;
      if (!payload?.token) {
        ws.send(JSON.stringify({ id: msg.id, type: "auth:authenticate", success: false, error: "Token required" }));
        ws.close();
        return;
      }

      const verifyResult = await verifyTokenViaAgent(machineId, payload.token);
      if (!verifyResult.success) {
        console.log(`[relay] Browser auth rejected for ${machineId}: ${verifyResult.error}`);
        ws.send(JSON.stringify({ id: msg.id, type: "auth:authenticate", success: false, error: verifyResult.error }));
        ws.close();
        return;
      }

      // Authenticated
      authenticated = true;
      if (authTimer) { clearTimeout(authTimer); authTimer = null; }

      const agent = agents.get(machineId);
      if (!agent) {
        ws.send(JSON.stringify({ id: msg.id, type: "auth:authenticate", success: false, error: "Agent offline" }));
        ws.close();
        return;
      }

      browsers.set(ws, { ws, machineId });
      console.log(`[relay] Browser authenticated for agent ${machineId}`);

      // Notify agent that a browser connected (for lazy file watcher)
      agent.ws.send(JSON.stringify({ id: uuid(), type: "browser:connected", payload: {} }));

      ws.send(JSON.stringify({ id: msg.id, type: "auth:authenticate", success: true }));
      return;
    }

    // Authenticated — forward to agent
    pendingRequests.set(msg.id, ws);

    const agentConn = agents.get(machineId);
    if (agentConn && agentConn.ws.readyState === WebSocket.OPEN) {
      agentConn.ws.send(raw);
    } else {
      pendingRequests.delete(msg.id);
      ws.send(JSON.stringify({ id: msg.id, type: msg.type, success: false, error: "Agent offline" }));
    }
  });

  ws.on("close", () => {
    if (authTimer) { clearTimeout(authTimer); authTimer = null; }
    if (authenticated) {
      browsers.delete(ws);
      console.log(`[relay] Browser disconnected from agent ${machineId}`);

      const agentConn = agents.get(machineId);
      if (agentConn && agentConn.ws.readyState === WebSocket.OPEN) {
        agentConn.ws.send(JSON.stringify({ id: uuid(), type: "browser:disconnected", payload: {} }));
      }
    }
  });

  ws.on("error", () => {
    // onclose handles cleanup
  });
}
