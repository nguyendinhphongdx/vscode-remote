import { createServer, request as httpRequest } from "http";
import type { Socket } from "net";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "9001", 10);
const agentUrl = new URL(process.env.AGENT_URL || "http://localhost:9000");

const app = next({ dev, turbopack: dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    // Proxy /api/agent/* to agent HTTP
    if (req.url?.startsWith("/api/agent/")) {
      const targetPath = req.url.replace("/api/agent", "");
      const proxyReq = httpRequest(
        {
          hostname: agentUrl.hostname,
          port: agentUrl.port,
          path: targetPath,
          method: req.method,
          headers: { ...req.headers, host: agentUrl.host },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );
      proxyReq.on("error", () => {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Agent unreachable" }));
      });
      req.pipe(proxyReq);
      return;
    }

    // Next.js handles everything else
    handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> Proxying agent at ${agentUrl.origin}`);

    // Hijack upgrade events AFTER Next.js registers its HMR handler
    const nextUpgradeListeners = server.listeners("upgrade").slice();
    server.removeAllListeners("upgrade");

    server.on("upgrade", (req, socket: Socket, head) => {
      if (req.url?.startsWith("/api/ws")) {
        // Native WebSocket proxy to agent
        const queryString = req.url.includes("?") ? req.url.split("?")[1] : "";
        const targetPath = queryString ? `/?${queryString}` : "/";

        const proxyReq = httpRequest({
          hostname: agentUrl.hostname,
          port: agentUrl.port,
          path: targetPath,
          method: "GET",
          headers: {
            ...req.headers,
            host: agentUrl.host,
          },
        });

        proxyReq.on("upgrade", (_proxyRes, proxySocket, proxyHead) => {
          console.log("[proxy] WS connected to agent");

          // Send back the upgrade response to browser
          socket.write(
            "HTTP/1.1 101 Switching Protocols\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            `Sec-WebSocket-Accept: ${_proxyRes.headers["sec-websocket-accept"]}\r\n` +
            "\r\n"
          );

          // Write any buffered data
          if (proxyHead.length > 0) socket.write(proxyHead);
          if (head.length > 0) proxySocket.write(head);

          // Pipe both directions
          socket.pipe(proxySocket);
          proxySocket.pipe(socket);

          socket.on("error", () => proxySocket.destroy());
          proxySocket.on("error", () => socket.destroy());
          socket.on("close", () => proxySocket.destroy());
          proxySocket.on("close", () => socket.destroy());
        });

        proxyReq.on("error", (err) => {
          console.error("[proxy] WS proxy error:", err.message);
          socket.destroy();
        });

        proxyReq.end();
      } else {
        // Forward to Next.js (HMR)
        for (const listener of nextUpgradeListeners) {
          (listener as (...args: unknown[]) => void).call(server, req, socket, head);
        }
      }
    });

    console.log(`> WebSocket proxy ready`);
  });
});
