import { execFile } from 'child_process';
import { promisify } from 'util';
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'http';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

export interface PortInfo {
  port: number;
  pid: number | null;
  process: string;
}

// Well-known dev server ports to ignore
const IGNORED_PORTS = new Set([22, 53, 631, 5353]);

export async function getListeningPorts(): Promise<PortInfo[]> {
  try {
    const { stdout } = await execFileAsync('ss', ['-tlnp'], { maxBuffer: 1024 * 1024 });
    const ports: PortInfo[] = [];
    const seen = new Set<number>();

    for (const line of stdout.split('\n').slice(1)) {
      if (!line.trim()) continue;

      // Parse ss output: State Recv-Q Send-Q Local Address:Port Peer Address:Port Process
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;

      const localAddr = parts[3];
      const portMatch = localAddr.match(/:(\d+)$/);
      if (!portMatch) continue;

      const port = parseInt(portMatch[1], 10);
      if (IGNORED_PORTS.has(port) || seen.has(port)) continue;
      seen.add(port);

      // Extract process name from "users:(("name",pid=123,fd=4))"
      let pid: number | null = null;
      let processName = '';
      const processCol = parts.slice(5).join(' ');
      const pidMatch = processCol.match(/pid=(\d+)/);
      const nameMatch = processCol.match(/\(\("([^"]+)"/);
      if (pidMatch) pid = parseInt(pidMatch[1], 10);
      if (nameMatch) processName = nameMatch[1];

      ports.push({ port, pid, process: processName });
    }

    return ports.sort((a, b) => a.port - b.port);
  } catch {
    return [];
  }
}

// Proxy HTTP request to a local port
export function proxyToPort(
  targetPort: number,
  req: IncomingMessage,
  res: ServerResponse,
  stripPrefix: string
): void {
  const targetPath = req.url?.replace(stripPrefix, '') || '/';

  const proxyReq = httpRequest(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: targetPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${targetPort}`,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    logger.warn(`Port proxy error for :${targetPort}`, { error: err.message });
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Cannot connect to port ${targetPort}` }));
  });

  req.pipe(proxyReq);
}
