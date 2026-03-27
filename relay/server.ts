import { createServer } from "http";
import express from "express";
import { WebSocketServer } from "ws";
import crypto from "crypto";
import next from "next";
import { loadEnvConfig } from "@next/env";
import { createAdminAuth } from "./server/adminAuth.js";
import { createAdminRouter } from "./server/routes/admin.js";
import { createAuthRouter } from "./server/routes/auth.js";
import { createAgentsRouter } from "./server/routes/agents.js";
import { createUpgradeHandler } from "./server/upgrade.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from monorepo root (npm workspaces sets CWD to package dir)
loadEnvConfig(path.resolve(__dirname, ".."));

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "9001", 10);
const relaySecret = process.env.RELAY_SECRET;
const adminPassword = process.env.ADMIN_PASSWORD || "";
const adminTokenSecret = crypto.randomBytes(32).toString("hex");

const adminAuth = createAdminAuth(adminPassword, adminTokenSecret);

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : null;

const app = next({ dev, turbopack: dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = express();

  // Request logging
  expressApp.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.url?.startsWith("/_next/") || req.url?.startsWith("/__nextjs")) return;
      console.log(`[relay] ${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });

  // CORS
  expressApp.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      if (dev || !allowedOrigins || allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      }
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // JSON body parsing for API routes
  expressApp.use("/api", express.json());

  // Routes
  expressApp.use("/api/admin", createAdminRouter(adminAuth, adminPassword, dev));
  expressApp.use("/api/auth", createAuthRouter());
  expressApp.use("/api/agents", createAgentsRouter(adminAuth));

  // Fallback to Next.js
  expressApp.all("*", (req, res) => {
    handle(req, res);
  });

  const server = createServer(expressApp);
  const wss = new WebSocketServer({ noServer: true });

  server.listen(port, () => {
    console.log(`> Relay server ready on http://localhost:${port}`);

    // Hijack upgrade events after Next.js sets up HMR
    const nextUpgradeListeners = server.listeners("upgrade").slice();
    server.removeAllListeners("upgrade");
    server.on("upgrade", createUpgradeHandler(wss, nextUpgradeListeners, port, relaySecret));

    console.log("> WebSocket relay ready (agent: /api/agent-ws, browser: /api/ws)");
  });
});
