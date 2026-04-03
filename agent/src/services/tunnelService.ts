import { spawn, execFile, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

interface TunnelInfo {
  port: number;
  url: string | null;
  process: ChildProcess;
  status: 'starting' | 'active' | 'error';
}

const tunnels = new Map<number, TunnelInfo>();

function getCloudflaredPath(): string {
  const localBin = path.join(os.homedir(), '.local', 'bin', 'cloudflared');
  return localBin;
}

/**
 * Check if cloudflared is available, install if not
 */
async function ensureCloudflared(): Promise<string> {
  // Try system-wide first
  try {
    await execFileAsync('cloudflared', ['--version']);
    return 'cloudflared';
  } catch {
    // Not in PATH
  }

  // Try local bin
  const localPath = getCloudflaredPath();
  try {
    await fs.access(localPath);
    await execFileAsync(localPath, ['--version']);
    return localPath;
  } catch {
    // Not installed locally
  }

  // Auto-install to ~/.local/bin
  logger.info('cloudflared not found, installing...');
  const binDir = path.join(os.homedir(), '.local', 'bin');
  await fs.mkdir(binDir, { recursive: true });

  const arch = os.arch() === 'arm64' ? 'arm64' : 'amd64';
  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch}`;

  try {
    await execFileAsync('curl', ['-sL', url, '-o', localPath], { timeout: 60000 });
    await fs.chmod(localPath, 0o755);
    logger.info('cloudflared installed successfully');
    return localPath;
  } catch (err) {
    throw new Error(`Failed to install cloudflared: ${(err as Error).message}`);
  }
}

/**
 * Create a Cloudflare Tunnel for a local port.
 * Spawns `cloudflared tunnel --url http://localhost:<port>` and parses the tunnel URL from output.
 */
export function createTunnel(port: number): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (tunnels.has(port)) {
      const existing = tunnels.get(port)!;
      if (existing.url) {
        resolve(existing.url);
        return;
      }
    }

    let bin: string;
    try {
      bin = await ensureCloudflared();
    } catch (err) {
      reject(err);
      return;
    }

    const proc = spawn(bin, ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const info: TunnelInfo = { port, url: null, process: proc, status: 'starting' };
    tunnels.set(port, info);

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Tunnel creation timed out after 30s'));
      }
    }, 30000);

    const handleOutput = (data: Buffer) => {
      const text = data.toString();

      // cloudflared outputs URL on stderr like:
      // "INF +----------------------------+"
      // "INF |  https://xxx.trycloudflare.com |"
      // Or: "INF Registered tunnel connection ... url=https://xxx.trycloudflare.com"
      const urlMatch = text.match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
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
        reject(new Error(`Failed to start cloudflared: ${err.message}`));
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      logger.info(`Tunnel for port ${port} closed (code: ${code})`);
      tunnels.delete(port);
      if (!resolved) {
        resolved = true;
        reject(new Error(`cloudflared exited with code ${code}`));
      }
    });
  });
}

export function closeTunnel(port: number): void {
  const info = tunnels.get(port);
  if (info) {
    info.process.kill('SIGTERM');
    tunnels.delete(port);
    logger.info(`Tunnel closed for port ${port}`);
  }
}

export function getTunnelUrl(port: number): string | null {
  return tunnels.get(port)?.url ?? null;
}

export function getActiveTunnels(): { port: number; url: string | null; status: string }[] {
  return Array.from(tunnels.values()).map((t) => ({
    port: t.port,
    url: t.url,
    status: t.status,
  }));
}

export function closeAllTunnels(): void {
  for (const [port] of tunnels) {
    closeTunnel(port);
  }
}
