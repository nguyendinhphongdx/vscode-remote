import { execFile } from 'child_process';
import { promisify } from 'util';
import { createConnection } from 'net';
import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'http';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

export interface PortInfo {
  port: number;
  pid: number | null;
  process: string;
}

const IGNORED_PORTS = new Set([22, 53, 631, 5353]);

/**
 * Check if a single port is listening by attempting a TCP connection.
 * Works on all platforms (Linux, macOS, Windows).
 */
function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    socket.setTimeout(200);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { resolve(false); });
  });
}

/**
 * Get listening ports with process info using platform-specific commands.
 * Falls back to port scanning if no command is available.
 */
export async function getListeningPorts(): Promise<PortInfo[]> {
  // Try platform-specific commands first (they give process info)
  const result = await getListeningPortsNative();
  if (result) return result;

  // Fallback: scan common dev ports via TCP connect
  return scanCommonPorts();
}

async function getListeningPortsNative(): Promise<PortInfo[] | null> {
  const platform = process.platform;

  try {
    if (platform === 'linux') {
      return await parseLinuxSs();
    } else if (platform === 'darwin') {
      return await parseMacLsof();
    } else if (platform === 'win32') {
      return await parseWindowsNetstat();
    }
  } catch {
    // Command not available, will fallback
  }
  return null;
}

// Linux: ss -tlnp
async function parseLinuxSs(): Promise<PortInfo[]> {
  const { stdout } = await execFileAsync('ss', ['-tlnp'], { maxBuffer: 1024 * 1024 });
  const ports: PortInfo[] = [];
  const seen = new Set<number>();

  for (const line of stdout.split('\n').slice(1)) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;

    const portMatch = parts[3].match(/:(\d+)$/);
    if (!portMatch) continue;

    const port = parseInt(portMatch[1], 10);
    if (IGNORED_PORTS.has(port) || seen.has(port)) continue;
    seen.add(port);

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
}

// macOS: lsof -iTCP -sTCP:LISTEN -nP
async function parseMacLsof(): Promise<PortInfo[]> {
  const { stdout } = await execFileAsync('lsof', ['-iTCP', '-sTCP:LISTEN', '-nP'], { maxBuffer: 1024 * 1024 });
  const ports: PortInfo[] = [];
  const seen = new Set<number>();

  for (const line of stdout.split('\n').slice(1)) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s+/);
    // COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
    if (parts.length < 9) continue;

    const name = parts[parts.length - 1]; // e.g. *:3000 or 127.0.0.1:8080
    const portMatch = name.match(/:(\d+)$/);
    if (!portMatch) continue;

    const port = parseInt(portMatch[1], 10);
    if (IGNORED_PORTS.has(port) || seen.has(port)) continue;
    seen.add(port);

    const processName = parts[0];
    const pid = parseInt(parts[1], 10) || null;

    ports.push({ port, pid, process: processName });
  }
  return ports.sort((a, b) => a.port - b.port);
}

// Windows: netstat -ano
async function parseWindowsNetstat(): Promise<PortInfo[]> {
  const { stdout } = await execFileAsync('netstat', ['-ano'], { maxBuffer: 1024 * 1024 });
  const ports: PortInfo[] = [];
  const seen = new Set<number>();

  for (const line of stdout.split('\n')) {
    if (!line.includes('LISTENING')) continue;
    const parts = line.trim().split(/\s+/);
    // Proto Local_Address Foreign_Address State PID
    if (parts.length < 5) continue;

    const portMatch = parts[1].match(/:(\d+)$/);
    if (!portMatch) continue;

    const port = parseInt(portMatch[1], 10);
    if (IGNORED_PORTS.has(port) || seen.has(port)) continue;
    seen.add(port);

    const pid = parseInt(parts[parts.length - 1], 10) || null;
    ports.push({ port, pid, process: '' });
  }
  return ports.sort((a, b) => a.port - b.port);
}

// Fallback: scan common dev ports via TCP connect (no process info)
async function scanCommonPorts(): Promise<PortInfo[]> {
  const ranges = [
    ...Array.from({ length: 20 }, (_, i) => 3000 + i),  // 3000-3019
    ...Array.from({ length: 20 }, (_, i) => 5000 + i),  // 5000-5019
    ...Array.from({ length: 20 }, (_, i) => 8000 + i),  // 8000-8019
    ...Array.from({ length: 20 }, (_, i) => 8080 + i),  // 8080-8099
    4200, 4321, 4444, 9000, 9001, 9090, 9200, 9300,
  ];

  const checks = ranges
    .filter((p) => !IGNORED_PORTS.has(p))
    .map(async (port): Promise<PortInfo | null> => {
      const listening = await isPortListening(port);
      return listening ? { port, pid: null, process: '' } : null;
    });

  const results = await Promise.all(checks);
  return results.filter((r): r is PortInfo => r !== null).sort((a, b) => a.port - b.port);
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
