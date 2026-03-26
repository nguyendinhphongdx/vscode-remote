import { spawn, type ChildProcess } from 'child_process';
import { logger } from '../utils/logger.js';

interface TunnelInfo {
  port: number;
  url: string | null;
  process: ChildProcess;
  status: 'starting' | 'active' | 'error';
}

const tunnels = new Map<number, TunnelInfo>();

/**
 * Check if devtunnel CLI is available
 */
export async function isDevTunnelAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('devtunnel', ['--version'], { stdio: 'pipe' });
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Create a dev tunnel for a local port.
 * Spawns `devtunnel host -p <port> --allow-anonymous` and parses the tunnel URL from stdout.
 */
export function createTunnel(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (tunnels.has(port)) {
      const existing = tunnels.get(port)!;
      if (existing.url) {
        resolve(existing.url);
        return;
      }
    }

    const proc = spawn('devtunnel', ['host', '-p', String(port), '--allow-anonymous'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const info: TunnelInfo = { port, url: null, process: proc, status: 'starting' };
    tunnels.set(port, info);

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        // Even if we didn't get URL yet, tunnel might still be starting
        reject(new Error('Tunnel creation timed out after 30s'));
      }
    }, 30000);

    const handleOutput = (data: Buffer) => {
      const text = data.toString();
      logger.info(`[devtunnel:${port}] ${text.trim()}`);

      // devtunnel outputs URL like: "Connect via browser: https://xxxxx.asse.devtunnels.ms"
      // or "Your url is: https://xxxxx.devtunnels.ms:PORT"
      // Match any https URL containing devtunnels
      const urlMatch = text.match(/(https:\/\/[^\s]+devtunnels[^\s]*)/);
      if (urlMatch && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        info.url = urlMatch[1];
        info.status = 'active';
        logger.info(`Tunnel active for port ${port}: ${info.url}`);
        resolve(info.url);
      }
    };

    proc.stdout?.on('data', handleOutput);
    proc.stderr?.on('data', handleOutput);

    proc.on('error', (err) => {
      clearTimeout(timeout);
      tunnels.delete(port);
      info.status = 'error';
      if (!resolved) {
        resolved = true;
        reject(new Error(`Failed to start devtunnel: ${err.message}`));
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      logger.info(`Tunnel for port ${port} closed (code: ${code})`);
      tunnels.delete(port);
      if (!resolved) {
        resolved = true;
        reject(new Error(`devtunnel exited with code ${code}`));
      }
    });
  });
}

/**
 * Close a tunnel for a specific port
 */
export function closeTunnel(port: number): void {
  const info = tunnels.get(port);
  if (info) {
    info.process.kill('SIGTERM');
    tunnels.delete(port);
    logger.info(`Tunnel closed for port ${port}`);
  }
}

/**
 * Get tunnel URL for a port (null if not tunneled)
 */
export function getTunnelUrl(port: number): string | null {
  return tunnels.get(port)?.url ?? null;
}

/**
 * Get all active tunnels info
 */
export function getActiveTunnels(): { port: number; url: string | null; status: string }[] {
  return Array.from(tunnels.values()).map((t) => ({
    port: t.port,
    url: t.url,
    status: t.status,
  }));
}

/**
 * Close all tunnels (for graceful shutdown)
 */
export function closeAllTunnels(): void {
  for (const [port] of tunnels) {
    closeTunnel(port);
  }
}
