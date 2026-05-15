import type { WebSocket } from 'ws';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { MSG } from '@vscode-remote/shared';
import { config, configStore } from '../config.js';
import { sendResponse } from './router.js';
import { logger } from '../utils/logger.js';

export async function handleWorkspaceMessage(
  ws: WebSocket,
  id: string,
  type: string,
  payload?: unknown
): Promise<void> {
  switch (type) {
    case MSG.WORKSPACE_INFO: {
      const root = config.workspaceRoot;
      sendResponse(ws, id, type, true, {
        workspaceRoot: root,
        folderName: root ? path.basename(root) : null,
        platform: process.platform,
      });
      break;
    }

    case MSG.WORKSPACE_BROWSE: {
      const { path: browsePath } = (payload || {}) as { path?: string };
      const isWindows = process.platform === 'win32';

      // On Windows, an empty / root path returns the list of available drives
      // as virtual "directories" so users can navigate to D:\, E:\, etc.
      if (isWindows && (!browsePath || browsePath === '/' || browsePath === '\\')) {
        const candidates = Array.from({ length: 26 }, (_, i) =>
          String.fromCharCode(65 + i) + ':\\');
        const drives = await Promise.all(
          candidates.map(async (drive) => {
            try {
              await fs.access(drive);
              return drive;
            } catch {
              return null;
            }
          })
        );
        const entries = drives
          .filter((d): d is string => d !== null)
          .map((drive) => ({
            name: drive.slice(0, 2), // "C:"
            path: drive,             // "C:\"
            type: 'directory' as const,
          }));
        sendResponse(ws, id, type, true, { path: '', entries });
        break;
      }

      // Resolve ~ to home dir
      let absPath = browsePath || os.homedir();
      if (absPath.startsWith('~/') || absPath === '~') {
        absPath = path.join(os.homedir(), absPath.slice(1));
      }
      absPath = path.resolve(absPath);

      try {
        const entries = await fs.readdir(absPath, { withFileTypes: true });
        const result = entries
          .filter(e => !e.name.startsWith('.')) // hide dotfiles
          .map(e => ({
            name: e.name,
            path: path.join(absPath, e.name),
            type: (e.isDirectory() ? 'directory' : 'file') as 'directory' | 'file',
          }))
          .filter(e => e.type === 'directory') // only show directories for workspace selection
          .sort((a, b) => a.name.localeCompare(b.name));

        sendResponse(ws, id, type, true, { path: absPath, entries: result });
      } catch (err) {
        sendResponse(ws, id, type, false, undefined,
          `Cannot read directory: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      break;
    }

    case MSG.WORKSPACE_CHANGE: {
      const { path: newPath } = (payload || {}) as { path?: string };
      if (!newPath) {
        sendResponse(ws, id, type, false, undefined, 'Path is required');
        return;
      }

      let absPath = newPath;
      if (absPath.startsWith('~/') || absPath === '~') {
        absPath = path.join(os.homedir(), absPath.slice(1));
      }
      absPath = path.resolve(absPath);

      // Verify it exists and is a directory
      try {
        const stat = await fs.stat(absPath);
        if (!stat.isDirectory()) {
          sendResponse(ws, id, type, false, undefined, 'Path is not a directory');
          return;
        }
      } catch {
        sendResponse(ws, id, type, false, undefined, 'Directory does not exist');
        return;
      }

      // Update config
      await configStore.updateSettings({ workspaceRoot: absPath });
      logger.info('Workspace changed', { workspaceRoot: absPath });

      sendResponse(ws, id, type, true, {
        workspaceRoot: absPath,
        folderName: path.basename(absPath),
      });
      break;
    }

    default:
      sendResponse(ws, id, type, false, undefined, `Unknown workspace message: ${type}`);
  }
}
