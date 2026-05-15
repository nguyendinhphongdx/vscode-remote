import { create } from "zustand";
import type { Platform } from "@vscode-remote/shared";

interface WorkspaceState {
  workspaceRoot: string | null;
  folderName: string | null;
  platform: Platform | null;
  setWorkspace: (root: string | null, name: string | null, platform?: Platform | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaceRoot: null,
  folderName: null,
  platform: null,
  setWorkspace: (root, name, platform) =>
    set((state) => ({
      workspaceRoot: root,
      folderName: name,
      platform: platform !== undefined ? platform : state.platform,
    })),
}));
