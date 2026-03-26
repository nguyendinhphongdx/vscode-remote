// WebSocket Message Protocol for VS Code Remote

// ============ Envelope ============

export interface WSMessage {
  id: string;
  type: string;
  payload: unknown;
}

export interface WSResponse {
  id: string;
  type: string;
  success: boolean;
  payload?: unknown;
  error?: string;
}

// ============ File System Types ============

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: number;
}

// FS Payloads
export interface FsListPayload {
  path: string;
}

export interface FsListResponse {
  entries: FileEntry[];
}

export interface FsReadPayload {
  path: string;
}

export interface FsReadResponse {
  path: string;
  content: string;
}

export interface FsWritePayload {
  path: string;
  content: string;
}

export interface FsCreatePayload {
  path: string;
  type: 'file' | 'directory';
}

export interface FsDeletePayload {
  path: string;
}

export interface FsRenamePayload {
  oldPath: string;
  newPath: string;
}

export interface FsWatchEvent {
  event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
}

// ============ Terminal Types ============

export interface TerminalCreatePayload {
  cols: number;
  rows: number;
  shell?: string;
}

export interface TerminalCreateResponse {
  terminalId: string;
}

export interface TerminalInputPayload {
  terminalId: string;
  data: string;
}

export interface TerminalOutputPayload {
  terminalId: string;
  data: string;
}

export interface TerminalResizePayload {
  terminalId: string;
  cols: number;
  rows: number;
}

export interface TerminalClosePayload {
  terminalId: string;
}

export interface TerminalExitEvent {
  terminalId: string;
  exitCode: number;
}

// ============ Auth Types ============

export interface AuthLoginPayload {
  machineId: string;
  password: string;
}

export interface AuthLoginResponse {
  token: string;
  expiresAt: number;
}

// ============ Message Type Constants ============

export const MSG = {
  // Auth
  AUTH_LOGIN: 'auth:login',

  // File System
  FS_LIST: 'fs:list',
  FS_READ: 'fs:read',
  FS_WRITE: 'fs:write',
  FS_CREATE: 'fs:create',
  FS_DELETE: 'fs:delete',
  FS_RENAME: 'fs:rename',
  FS_WATCH_EVENT: 'fs:watch:event',

  // Terminal
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  TERMINAL_EXIT: 'terminal:exit:event',
} as const;
