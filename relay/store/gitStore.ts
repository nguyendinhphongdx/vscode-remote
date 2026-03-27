import { create } from "zustand";
import type { GitFileStatus, GitStatusEntry } from '@vscode-remote/shared';

export interface GitFileInfo {
  path: string;
  status: GitFileStatus;
  filename: string;
  folder: string;
}

interface GitState {
  branch: string;
  stagedFiles: GitFileInfo[];
  changedFiles: GitFileInfo[];
  // For file tree coloring
  fileStatuses: Map<string, { status: GitFileStatus; staged: boolean }>;
  dirtyDirs: Set<string>;
  changeCount: number;

  setStatus: (branch: string, entries: GitStatusEntry[]) => void;
  getFileStatus: (path: string) => { status: GitFileStatus; staged: boolean } | null;
  getDirStatus: (path: string) => GitFileStatus | null;
}

function toFileInfo(path: string, status: GitFileStatus): GitFileInfo {
  const parts = path.split("/");
  return {
    path,
    status,
    filename: parts[parts.length - 1],
    folder: parts.length > 1 ? parts.slice(0, -1).join("/") : "",
  };
}

export const useGitStore = create<GitState>((set, get) => ({
  branch: "",
  stagedFiles: [],
  changedFiles: [],
  fileStatuses: new Map(),
  dirtyDirs: new Set(),
  changeCount: 0,

  setStatus: (branch, entries) => {
    const fileStatuses = new Map<string, { status: GitFileStatus; staged: boolean }>();
    const dirtyDirs = new Set<string>();
    const staged: GitFileInfo[] = [];
    const changed: GitFileInfo[] = [];

    for (const entry of entries) {
      if (entry.staged) {
        staged.push(toFileInfo(entry.path, entry.status));
      } else {
        changed.push(toFileInfo(entry.path, entry.status));
      }

      const existing = fileStatuses.get(entry.path);
      if (!existing || !entry.staged) {
        fileStatuses.set(entry.path, { status: entry.status, staged: entry.staged });
      }

      const parts = entry.path.split("/");
      for (let i = 1; i < parts.length; i++) {
        dirtyDirs.add(parts.slice(0, i).join("/"));
      }
    }

    set({
      branch,
      stagedFiles: staged,
      changedFiles: changed,
      fileStatuses,
      dirtyDirs,
      changeCount: staged.length + changed.length,
    });
  },

  getFileStatus: (path) => get().fileStatuses.get(path) || null,

  getDirStatus: (path) => {
    if (!get().dirtyDirs.has(path)) return null;
    return "M";
  },
}));
