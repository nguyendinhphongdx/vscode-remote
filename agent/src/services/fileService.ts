import fs from 'fs/promises';
import path from 'path';
import { resolveSafePathWithSymlink } from '../utils/pathSecurity.js';
import { config } from '../config.js';
import type { FileEntry } from '../protocol.js';

export async function listDirectory(dirPath: string): Promise<FileEntry[]> {
  const resolved = await resolveSafePathWithSymlink(dirPath);
  const entries = await fs.readdir(resolved, { withFileTypes: true });

  const result: FileEntry[] = [];
  for (const entry of entries) {
    // Skip hidden files starting with .
    const fullPath = path.join(resolved, entry.name);
    const relativePath = path.relative(config.workspaceRoot!, fullPath);
    const stat = await fs.stat(fullPath).catch(() => null);

    result.push({
      name: entry.name,
      path: relativePath,
      type: entry.isDirectory() ? 'directory' : 'file',
      size: stat?.size,
      modified: stat?.mtimeMs,
    });
  }

  // Sort: directories first, then alphabetical
  result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

export async function statFile(filePath: string): Promise<{ exists: boolean; type?: 'file' | 'directory'; size?: number }> {
  try {
    const resolved = await resolveSafePathWithSymlink(filePath);
    const stat = await fs.stat(resolved);
    return {
      exists: true,
      type: stat.isDirectory() ? 'directory' : 'file',
      size: stat.size,
    };
  } catch {
    return { exists: false };
  }
}

export async function readFile(filePath: string): Promise<string> {
  const resolved = await resolveSafePathWithSymlink(filePath);
  const stat = await fs.stat(resolved);

  if (stat.size > config.maxFileSize) {
    throw new Error(`File too large: ${stat.size} bytes (max ${config.maxFileSize})`);
  }

  return await fs.readFile(resolved, 'utf-8');
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const resolved = await resolveSafePathWithSymlink(filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, 'utf-8');
}

export async function createEntry(entryPath: string, type: 'file' | 'directory'): Promise<void> {
  const resolved = await resolveSafePathWithSymlink(entryPath);
  if (type === 'directory') {
    await fs.mkdir(resolved, { recursive: true });
  } else {
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, '', 'utf-8');
  }
}

export async function deleteEntry(entryPath: string): Promise<void> {
  const resolved = await resolveSafePathWithSymlink(entryPath);
  await fs.rm(resolved, { recursive: true, force: true });
}

export async function renameEntry(oldPath: string, newPath: string): Promise<void> {
  const resolvedOld = await resolveSafePathWithSymlink(oldPath);
  const resolvedNew = await resolveSafePathWithSymlink(newPath);
  await fs.rename(resolvedOld, resolvedNew);
}
