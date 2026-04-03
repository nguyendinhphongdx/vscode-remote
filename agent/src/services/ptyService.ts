import * as pty from 'node-pty';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type { ShellInfo } from '@vscode-remote/shared';

interface PtySession {
  id: string;
  process: pty.IPty;
}

const sessions = new Map<string, PtySession>();

function getDefaultShell(): string {
  if (process.platform === 'win32') return 'powershell.exe';
  return process.env.SHELL || '/bin/bash';
}

const WIN_SHELLS: { id: string; name: string; path: string }[] = [
  { id: 'powershell', name: 'PowerShell', path: 'powershell.exe' },
  { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' },
  { id: 'gitbash', name: 'Git Bash', path: 'C:\\Program Files\\Git\\bin\\bash.exe' },
];

const UNIX_SHELLS: { id: string; name: string; path: string }[] = [
  { id: 'bash', name: 'Bash', path: '/bin/bash' },
  { id: 'zsh', name: 'Zsh', path: '/bin/zsh' },
  { id: 'sh', name: 'sh', path: '/bin/sh' },
];

let cachedShells: ShellInfo[] | null = null;

export function getAvailableShells(): ShellInfo[] {
  if (cachedShells) return cachedShells;

  const candidates = process.platform === 'win32' ? WIN_SHELLS : UNIX_SHELLS;
  cachedShells = candidates.filter((s) => {
    try {
      fs.accessSync(s.path, fs.constants.X_OK);
      return true;
    } catch {
      return process.platform === 'win32' && (s.id === 'powershell' || s.id === 'cmd');
    }
  });

  return cachedShells;
}

export function createTerminal(
  cols: number,
  rows: number,
  shell?: string,
  onData?: (data: string) => void,
  onExit?: (exitCode: number) => void
): string {
  if (sessions.size >= config.maxTerminals) {
    throw new Error(`Max terminals reached (${config.maxTerminals})`);
  }

  const id = uuid();
  const proc = pty.spawn(shell || getDefaultShell(), [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: config.workspaceRoot || undefined,
    env: process.env as Record<string, string>,
  });

  if (onData) {
    proc.onData((data) => onData(data));
  }

  proc.onExit(({ exitCode }) => {
    logger.info(`Terminal ${id} exited`, { exitCode });
    sessions.delete(id);
    if (onExit) onExit(exitCode);
  });

  sessions.set(id, { id, process: proc });
  logger.info(`Terminal created: ${id}`);
  return id;
}

export function writeToTerminal(id: string, data: string): void {
  const session = sessions.get(id);
  if (!session) throw new Error(`Terminal ${id} not found`);
  session.process.write(data);
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  const session = sessions.get(id);
  if (!session) throw new Error(`Terminal ${id} not found`);
  session.process.resize(cols, rows);
}

export function closeTerminal(id: string): void {
  const session = sessions.get(id);
  if (!session) return;
  session.process.kill();
  sessions.delete(id);
  logger.info(`Terminal closed: ${id}`);
}

export function closeAllTerminals(): void {
  for (const [id] of sessions) {
    closeTerminal(id);
  }
}
