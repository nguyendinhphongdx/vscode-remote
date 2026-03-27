import { createServer } from "http";
import type { Socket } from "net";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import { v4 as uuid } from "uuid";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "9001", 10);
const relaySecret = process.env.RELAY_SECRET || "dev-secret";

const app = next({ dev, turbopack: dev });
const handle = app.getRequestHandler();

// ============ State ============

interface AgentConnection {
  ws: WebSocket;
  machineId: string;
  connectedAt: Date;
}

interface BrowserConnection {
  ws: WebSocket;
  machineId: string;
}

const agents = new Map<string, AgentConnection>();
const browsers = new Map<WebSocket, BrowserConnection>();
const pendingRequests = new Map<string, WebSocket>(); // msgId → browser WS
const pendingHttpRequests = new Map<string, (response: unknown) => void>(); // msgId → HTTP response callback

// ============ Helpers ============

function getBrowsersForAgent(machineId: string): BrowserConnection[] {
  const result: BrowserConnection[] = [];
  for (const bc of browsers.values()) {
    if (bc.machineId === machineId) result.push(bc);
  }
  return result;
}

function isResponse(msg: { success?: boolean }): boolean {
  return typeof msg.success === "boolean";
}

// ============ Agent WS Handler ============

function handleAgentConnection(ws: WebSocket) {
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

    // Check if this is a response to a pending HTTP request (login)
    if (isResponse(msg) && pendingHttpRequests.has(msg.id)) {
      const callback = pendingHttpRequests.get(msg.id)!;
      pendingHttpRequests.delete(msg.id);
      callback(msg);
      return;
    }

    // Check if this is a response to a pending browser request
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
      agents.delete(agentMachineId);
      console.log(`[relay] Agent disconnected: ${agentMachineId}`);
    }
  });

  ws.on("error", () => {
    // onclose handles cleanup
  });
}

// ============ Browser WS Handler ============

function handleBrowserConnection(ws: WebSocket, machineId: string) {
  const agent = agents.get(machineId);
  if (!agent) {
    ws.send(JSON.stringify({ id: uuid(), type: "error", success: false, error: "Agent offline" }));
    ws.close();
    return;
  }

  browsers.set(ws, { ws, machineId });
  console.log(`[relay] Browser connected to agent ${machineId}`);

  ws.on("message", (data: RawData) => {
    const raw = data.toString();
    let msg: { id: string; type: string };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    // Track this request so we can route the response back
    pendingRequests.set(msg.id, ws);

    // Forward to agent
    const agentConn = agents.get(machineId);
    if (agentConn && agentConn.ws.readyState === WebSocket.OPEN) {
      agentConn.ws.send(raw);
    } else {
      // Agent went offline
      pendingRequests.delete(msg.id);
      ws.send(JSON.stringify({ id: msg.id, type: msg.type, success: false, error: "Agent offline" }));
    }
  });

  ws.on("close", () => {
    browsers.delete(ws);
    console.log(`[relay] Browser disconnected from agent ${machineId}`);
  });

  ws.on("error", () => {
    // onclose handles cleanup
  });
}

// ============ HTTP Login Forwarding ============

function forwardLoginToAgent(
  machineId: string,
  password: string
): Promise<{ success: boolean; payload?: unknown; error?: string }> {
  return new Promise((resolve) => {
    const agent = agents.get(machineId);
    if (!agent) {
      resolve({ success: false, error: "Agent offline" });
      return;
    }

    const id = uuid();
    const timeout = setTimeout(() => {
      pendingHttpRequests.delete(id);
      resolve({ success: false, error: "Agent timeout" });
    }, 10000);

    pendingHttpRequests.set(id, (response) => {
      clearTimeout(timeout);
      resolve(response as { success: boolean; payload?: unknown; error?: string });
    });

    agent.ws.send(JSON.stringify({
      id,
      type: "auth:login",
      payload: { machineId, password },
    }));
  });
}

// ============ Port Proxy Forwarding (HTTP-over-WS) ============

function forwardPortProxy(
  machineId: string,
  portNum: number,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: string
): Promise<{ success: boolean; payload?: unknown; error?: string }> {
  return new Promise((resolve) => {
    const agent = agents.get(machineId);
    if (!agent) {
      resolve({ success: false, error: "Agent offline" });
      return;
    }

    const id = uuid();
    const requestId = uuid();
    const timeout = setTimeout(() => {
      pendingHttpRequests.delete(id);
      resolve({ success: false, error: "Port proxy timeout" });
    }, 30000);

    pendingHttpRequests.set(id, (response) => {
      clearTimeout(timeout);
      resolve(response as { success: boolean; payload?: unknown; error?: string });
    });

    agent.ws.send(JSON.stringify({
      id,
      type: "port:proxy",
      payload: { requestId, port: portNum, method, path, headers, body },
    }));
  });
}

// ============ Start ============

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    // CORS for agent UI cross-origin requests
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // POST /api/auth/login — forward to agent via WS
    if (req.url === "/api/auth/login" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { machineId, password } = JSON.parse(body);
          if (!machineId || !password) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "machineId and password required" }));
            return;
          }

          const result = await forwardLoginToAgent(machineId, password);
          if (result.success) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result.payload));
          } else {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: result.error }));
          }
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // GET /api/agents — list online agents (for dashboard)
    if (req.url === "/api/agents" && req.method === "GET") {
      const list = Array.from(agents.values()).map((a) => ({
        machineId: a.machineId,
        connectedAt: a.connectedAt.toISOString(),
        browserCount: getBrowsersForAgent(a.machineId).length,
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ agents: list }));
      return;
    }

    // /port/:machineId/:port/* — port forwarding via WS
    const portMatch = req.url?.match(/^\/port\/(\d{9})\/(\d+)(\/.*)?$/);
    if (portMatch) {
      const machineId = portMatch[1];
      const portNum = parseInt(portMatch[2], 10);
      const targetPath = portMatch[3] || "/";

      const reqHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (v) reqHeaders[k] = Array.isArray(v) ? v.join(", ") : v;
      }

      let bodyBuf = "";
      req.on("data", (chunk) => {
        bodyBuf += Buffer.from(chunk).toString("base64");
      });
      req.on("end", async () => {
        const result = await forwardPortProxy(
          machineId, portNum, req.method || "GET", targetPath, reqHeaders,
          bodyBuf || undefined
        );

        if (!result.success) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: result.error }));
          return;
        }

        const payload = result.payload as {
          requestId: string; statusCode: number;
          headers: Record<string, string>; body: string;
        };
        res.writeHead(payload.statusCode, payload.headers);
        res.end(Buffer.from(payload.body, "base64"));
      });
      return;
    }

    // Everything else → Next.js
    handle(req, res);
  });

  // WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  server.listen(port, () => {
    console.log(`> Relay server ready on http://localhost:${port}`);

    // Hijack upgrade events after Next.js sets up HMR
    const nextUpgradeListeners = server.listeners("upgrade").slice();
    server.removeAllListeners("upgrade");

    server.on("upgrade", (req, socket: Socket, head) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);

      if (url.pathname === "/api/agent-ws") {
        // Agent connection
        wss.handleUpgrade(req, socket, head, (ws) => {
          handleAgentConnection(ws);
        });
      } else if (url.pathname === "/api/ws") {
        // Browser connection
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
          (listener as (...args: unknown[]) => void).call(server, req, socket, head);
        }
      }
    });

    console.log("> WebSocket relay ready (agent: /api/agent-ws, browser: /api/ws)");
  });
});
