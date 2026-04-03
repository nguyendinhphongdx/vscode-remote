import { create } from "zustand";

interface WorkspaceState {
  workspaceRoot: string | null;
  folderName: string | null;
  setWorkspace: (root: string | null, name: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaceRoot: null,
  folderName: null,
  setWorkspace: (root, name) => set({ workspaceRoot: root, folderName: name }),
}));
