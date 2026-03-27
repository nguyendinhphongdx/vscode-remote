import type { WebSocket } from 'ws';
import { request as httpRequest } from 'http';
import { MSG, type PortProxyPayload } from '../protocol.js';
import { sendResponse } from './router.js';

export async function handlePortProxy(
  ws: WebSocket,
  id: string,
  _type: string,
  payload?: unknown
): Promise<void> {
  const { requestId, port, method, path, headers, body } =
    (payload || {}) as PortProxyPayload;

  if (!requestId || !port || !method || !path) {
    sendResponse(ws, id, MSG.PORT_PROXY_RESPONSE, false, undefined, 'Invalid port proxy request');
    return;
  }

  return new Promise<void>((resolve) => {
    const proxyReq = httpRequest(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          ...headers,
          host: `localhost:${port}`,
        },
      },
      (proxyRes) => {
        const chunks: Buffer[] = [];
        proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('base64');
          const responseHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value) {
              responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
            }
          }

          sendResponse(ws, id, MSG.PORT_PROXY_RESPONSE, true, {
            requestId,
            statusCode: proxyRes.statusCode || 500,
            headers: responseHeaders,
            body: responseBody,
          });
          resolve();
        });
      }
    );

    proxyReq.on('error', (err) => {
      sendResponse(ws, id, MSG.PORT_PROXY_RESPONSE, false, { requestId }, `Proxy error: ${err.message}`);
      resolve();
    });

    // Write request body if present (base64 decoded)
    if (body) {
      proxyReq.write(Buffer.from(body, 'base64'));
    }
    proxyReq.end();
  });
}
