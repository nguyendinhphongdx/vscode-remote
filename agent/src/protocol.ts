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

export interface FsStatPayload {
  path: string;
}

export interface FsStatResponse {
  exists: boolean;
  path: string;
  type?: 'file' | 'directory';
  size?: number;
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

// ============ Port Types ============

export interface PortInfo {
  port: number;
  pid: number | null;
  process: string;
}

export interface PortListResponse {
  ports: PortInfo[];
  forwarded: number[];
}

export interface PortForwardPayload {
  port: number;
}

// ============ Git Types ============

export type GitFileStatus = 'M' | 'A' | 'D' | 'R' | 'U' | '?' | '!';

export interface GitStatusEntry {
  path: string;
  status: GitFileStatus;
  staged: boolean;
}

export interface GitStatusResponse {
  branch: string;
  entries: GitStatusEntry[];
}

export interface GitStagePayload {
  path: string;
}

export interface GitCommitPayload {
  message: string;
}

export interface GitCommitResponse {
  hash: string;
  summary: string;
}

export interface GitDiffPayload {
  path: string;
  staged: boolean;
}

export interface GitDiffResponse {
  diff: string;
}

// ============ Workspace Types ============

export interface WorkspaceBrowsePayload {
  path: string; // absolute path to list directories from
}

export interface WorkspaceBrowseResponse {
  path: string;
  entries: { name: string; path: string; type: 'directory' | 'file' }[];
}

export interface WorkspaceInfoResponse {
  workspaceRoot: string;
  folderName: string;
}

export interface WorkspaceChangePayload {
  path: string; // absolute path to new workspace
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

// ============ Relay Types ============

export interface AgentRegisterPayload {
  machineId: string;
  secret: string;
}

export interface AgentRegisteredPayload {
  ok: boolean;
}

// ============ Port Proxy Types (HTTP-over-WS) ============

export interface PortProxyPayload {
  requestId: string;
  port: number;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: string; // base64 encoded
}

export interface PortProxyResponse {
  requestId: string;
  statusCode: number;
  headers: Record<string, string>;
  body: string; // base64 encoded
}

// ============ Message Type Constants ============

export const MSG = {
  // Auth
  AUTH_LOGIN: 'auth:login',

  // Relay
  AGENT_REGISTER: 'agent:register',
  AGENT_REGISTERED: 'agent:registered',
  BROWSER_CONNECTED: 'browser:connected',
  BROWSER_DISCONNECTED: 'browser:disconnected',

  // Port Proxy (HTTP-over-WS)
  PORT_PROXY: 'port:proxy',
  PORT_PROXY_RESPONSE: 'port:proxy:response',

  // File System
  FS_LIST: 'fs:list',
  FS_READ: 'fs:read',
  FS_WRITE: 'fs:write',
  FS_CREATE: 'fs:create',
  FS_DELETE: 'fs:delete',
  FS_RENAME: 'fs:rename',
  FS_STAT: 'fs:stat',
  FS_WATCH_EVENT: 'fs:watch:event',

  // Terminal
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  TERMINAL_EXIT: 'terminal:exit:event',

  // Ports
  PORT_LIST: 'port:list',
  PORT_FORWARD: 'port:forward',
  PORT_UNFORWARD: 'port:unforward',

  // Workspace
  WORKSPACE_INFO: 'workspace:info',
  WORKSPACE_BROWSE: 'workspace:browse',
  WORKSPACE_CHANGE: 'workspace:change',

  // Git
  GIT_STATUS: 'git:status',
  GIT_STAGE: 'git:stage',
  GIT_STAGE_ALL: 'git:stage:all',
  GIT_UNSTAGE: 'git:unstage',
  GIT_UNSTAGE_ALL: 'git:unstage:all',
  GIT_DISCARD: 'git:discard',
  GIT_COMMIT: 'git:commit',
  GIT_DIFF: 'git:diff',
} as const;
