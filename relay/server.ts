import { createServer, type IncomingMessage } from "http";
import type { Socket } from "net";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "9001", 10);
const relaySecret = process.env.RELAY_SECRET || "dev-secret";
const adminPassword = process.env.ADMIN_PASSWORD || "";
const adminTokenSecret = crypto.randomBytes(32).toString("hex");

// ============ Admin Auth Helpers ============

function signAdminToken(): string {
  const payload = JSON.stringify({ role: "admin", iat: Date.now() });
  const hmac = crypto.createHmac("sha256", adminTokenSecret).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64") + "." + hmac;
}

function verifyAdminToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const payload = Buffer.from(parts[0], "base64").toString();
    const data = JSON.parse(payload);
    // Token expires after 24h
    if (Date.now() - data.iat > 24 * 60 * 60 * 1000) return false;
    const expectedHmac = crypto.createHmac("sha256", adminTokenSecret).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expectedHmac));
  } catch {
    return false;
  }
}

function getAdminToken(req: IncomingMessage): string | null {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  return match ? match[1] : null;
}

function isAdminAuthed(req: IncomingMessage): boolean {
  if (!adminPassword) return true; // No password set = open access
  const token = getAdminToken(req);
  return token ? verifyAdminToken(token) : false;
}

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

  // Notify agent that a browser connected (for lazy file watcher)
  agent.ws.send(JSON.stringify({ id: uuid(), type: "browser:connected", payload: {} }));

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

    // Notify agent that a browser disconnected
    const agentConn = agents.get(machineId);
    if (agentConn && agentConn.ws.readyState === WebSocket.OPEN) {
      agentConn.ws.send(JSON.stringify({ id: uuid(), type: "browser:disconnected", payload: {} }));
    }
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

// ============ Token Verification via Agent ============

function verifyTokenViaAgent(
  machineId: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const agent = agents.get(machineId);
    if (!agent) {
      resolve({ success: false, error: "Agent offline" });
      return;
    }

    const id = uuid();
    const timeout = setTimeout(() => {
      pendingHttpRequests.delete(id);
      resolve({ success: false, error: "Verification timeout" });
    }, 5000);

    pendingHttpRequests.set(id, (response) => {
      clearTimeout(timeout);
      const res = response as { success: boolean; error?: string };
      resolve({ success: res.success, error: res.error });
    });

    agent.ws.send(JSON.stringify({
      id,
      type: "auth:verify",
      payload: { token },
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

    // POST /api/admin/login — admin dashboard login
    if (req.url === "/api/admin/login" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => (body += chunk));
      req.on("end", () => {
        try {
          const { password } = JSON.parse(body);
          if (!adminPassword) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Admin password not configured" }));
            return;
          }
          if (password !== adminPassword) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid password" }));
            return;
          }
          const token = signAdminToken();
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Set-Cookie": `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${!dev ? "; Secure" : ""}`,
          });
          res.end(JSON.stringify({ success: true }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }

    // GET /api/admin/check — verify admin session
    if (req.url === "/api/admin/check" && req.method === "GET") {
      const authed = isAdminAuthed(req);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ authenticated: authed, required: !!adminPassword }));
      return;
    }

    // POST /api/admin/logout — clear admin cookie
    if (req.url === "/api/admin/logout" && req.method === "POST") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
      });
      res.end(JSON.stringify({ success: true }));
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

    // GET /api/agents — list online agents (protected, admin only)
    if (req.url === "/api/agents" && req.method === "GET") {
      if (!isAdminAuthed(req)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
      const list = Array.from(agents.values()).map((a) => ({
        machineId: a.machineId,
        connectedAt: a.connectedAt.toISOString(),
        browserCount: getBrowsersForAgent(a.machineId).length,
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ agents: list }));
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

    server.on("upgrade", async (req, socket: Socket, head) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);

      if (url.pathname === "/api/agent-ws") {
        // Agent connection
        wss.handleUpgrade(req, socket, head, (ws) => {
          handleAgentConnection(ws);
        });
      } else if (url.pathname === "/api/ws") {
        // Browser connection — requires machineId + valid token
        const machineId = url.searchParams.get("machineId");
        const token = url.searchParams.get("token");
        if (!machineId) {
          socket.destroy();
          return;
        }
        if (!token) {
          socket.destroy();
          return;
        }
        // Verify token via agent before allowing connection
        const verifyResult = await verifyTokenViaAgent(machineId, token);
        if (!verifyResult.success) {
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
