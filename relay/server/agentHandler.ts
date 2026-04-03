import { WebSocket, type RawData } from "ws";
import { agents, browsers, pendingRequests, pendingHttpRequests, getBrowsersForAgent, isResponse } from "./state.js";

export function handleAgentConnection(ws: WebSocket, relaySecret: string | undefined) {
  let agentMachineId: string | null = null;

  ws.on("message", (data: RawData) => {
    const raw = data.toString();
    let msg: { id: string; type: string; success?: boolean; payload?: unknown; error?: string };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    // Registration
    if (msg.type === "agent:register") {
      const payload = msg.payload as { machineId?: string; secret?: string };
      if (!payload?.machineId || payload.secret !== relaySecret) {
        ws.send(JSON.stringify({ id: msg.id, type: "agent:registered", success: false, error: "Invalid secret" }));
        ws.close();
        return;
      }

      agentMachineId = payload.machineId;

      // Kick old agent with same ID
      const existing = agents.get(agentMachineId);
      if (existing) {
        console.warn(`[relay] Agent replacement for ${agentMachineId} — kicking old connection`);
        existing.ws.close();
      }

      agents.set(agentMachineId, { ws, machineId: agentMachineId, connectedAt: new Date() });
      ws.send(JSON.stringify({ id: msg.id, type: "agent:registered", success: true }));
      console.log(`[relay] Agent registered: ${agentMachineId}`);
      return;
    }

    if (!agentMachineId) {
      ws.close();
      return;
    }

    // Response to pending HTTP request (login/verify)
    if (isResponse(msg) && pendingHttpRequests.has(msg.id)) {
      const callback = pendingHttpRequests.get(msg.id)!;
      pendingHttpRequests.delete(msg.id);
      callback(msg);
      return;
    }

    // Response to pending browser request
    if (isResponse(msg) && pendingRequests.has(msg.id)) {
      const browserWs = pendingRequests.get(msg.id)!;
      pendingRequests.delete(msg.id);
      if (browserWs.readyState === WebSocket.OPEN) {
        browserWs.send(raw);
      }
      return;
    }

    // Event (terminal:output, fs:watch:event, etc.) → broadcast to all browsers
    const connectedBrowsers = getBrowsersForAgent(agentMachineId);
    for (const bc of connectedBrowsers) {
      if (bc.ws.readyState === WebSocket.OPEN) {
        bc.ws.send(raw);
      }
    }
  });

  ws.on("close", () => {
    if (agentMachineId) {
      const current = agents.get(agentMachineId);
      if (current && current.ws === ws) {
        agents.delete(agentMachineId);
        console.log(`[relay] Agent disconnected: ${agentMachineId}`);
      }
    }
  });

  ws.on("error", () => {
    // onclose handles cleanup
  });
}
