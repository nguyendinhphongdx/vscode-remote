import path from 'path';
import fs from 'fs/promises';
import { config } from '../config.js';

export class PathSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathSecurityError';
  }
}

export function resolveSafePath(userPath: string): string {
  if (!config.workspaceRoot) {
    throw new PathSecurityError('No workspace folder is open');
  }

  // Reject null bytes
  if (userPath.includes('\0')) {
    throw new PathSecurityError('Path contains null bytes');
  }

  // Resolve against workspace root
  const resolved = path.resolve(config.workspaceRoot, userPath);

  // Ensure it's within workspace root
  if (!resolved.startsWith(config.workspaceRoot)) {
    throw new PathSecurityError('Path traversal detected');
  }

  return resolved;
}

export async function resolveSafePathWithSymlink(userPath: string): Promise<string> {
  if (!config.workspaceRoot) {
    throw new PathSecurityError('No workspace folder is open');
  }

  const resolved = resolveSafePath(userPath);

  // Check symlink target
  try {
    const real = await fs.realpath(resolved);
    if (!real.startsWith(config.workspaceRoot!)) {
      throw new PathSecurityError('Symlink points outside workspace');
    }
    return real;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist yet (creating), just return resolved
      return resolved;
    }
    throw err;
  }
}
