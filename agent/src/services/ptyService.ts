import * as pty from 'node-pty';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

interface PtySession {
  id: string;
  process: pty.IPty;
}

const sessions = new Map<string, PtySession>();

function getDefaultShell(): string {
  if (process.platform === 'win32') return 'powershell.exe';
  return process.env.SHELL || '/bin/bash';
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
    cwd: config.workspaceRoot,
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
