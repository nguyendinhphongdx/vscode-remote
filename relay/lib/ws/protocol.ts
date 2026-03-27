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

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modified?: number;
}

export interface FsListResponse {
  entries: FileEntry[];
}

export interface FsReadResponse {
  path: string;
  content: string;
}

export interface FsStatResponse {
  exists: boolean;
  path: string;
  type?: "file" | "directory";
  size?: number;
}

export interface FsWatchEvent {
  event: "add" | "change" | "unlink" | "addDir" | "unlinkDir";
  path: string;
}

export interface PortInfo {
  port: number;
  pid: number | null;
  process: string;
}

export interface PortListResponse {
  ports: PortInfo[];
  forwarded: number[];
  tunnelUrls: Record<number, string | null>;
}

export interface PortForwardResponse {
  port: number;
  tunnelUrl: string | null;
}

export type GitFileStatus = "M" | "A" | "D" | "R" | "U" | "?" | "!";

export interface GitStatusEntry {
  path: string;
  status: GitFileStatus;
  staged: boolean;
}

export interface GitStatusResponse {
  branch: string;
  entries: GitStatusEntry[];
}

export interface GitCommitResponse {
  hash: string;
  summary: string;
}

export interface GitDiffResponse {
  diff: string;
}

export interface TerminalCreateResponse {
  terminalId: string;
}

export interface TerminalOutputPayload {
  terminalId: string;
  data: string;
}

export interface TerminalExitEvent {
  terminalId: string;
  exitCode: number;
}

export interface WorkspaceBrowseEntry {
  name: string;
  path: string;
  type: "directory" | "file";
}

export interface WorkspaceBrowseResponse {
  path: string;
  entries: WorkspaceBrowseEntry[];
}

export interface WorkspaceInfoResponse {
  workspaceRoot: string | null;
  folderName: string | null;
}

export const MSG = {
  AUTH_LOGIN: "auth:login",
  FS_LIST: "fs:list",
  FS_READ: "fs:read",
  FS_WRITE: "fs:write",
  FS_CREATE: "fs:create",
  FS_DELETE: "fs:delete",
  FS_RENAME: "fs:rename",
  FS_STAT: "fs:stat",
  FS_WATCH_EVENT: "fs:watch:event",
  TERMINAL_CREATE: "terminal:create",
  TERMINAL_INPUT: "terminal:input",
  TERMINAL_OUTPUT: "terminal:output",
  TERMINAL_RESIZE: "terminal:resize",
  TERMINAL_CLOSE: "terminal:close",
  TERMINAL_EXIT: "terminal:exit:event",
  PORT_LIST: "port:list",
  PORT_FORWARD: "port:forward",
  PORT_UNFORWARD: "port:unforward",
  WORKSPACE_INFO: "workspace:info",
  WORKSPACE_BROWSE: "workspace:browse",
  WORKSPACE_CHANGE: "workspace:change",
  GIT_STATUS: "git:status",
  GIT_STAGE: "git:stage",
  GIT_STAGE_ALL: "git:stage:all",
  GIT_UNSTAGE: "git:unstage",
  GIT_UNSTAGE_ALL: "git:unstage:all",
  GIT_DISCARD: "git:discard",
  GIT_COMMIT: "git:commit",
  GIT_DIFF: "git:diff",
} as const;
