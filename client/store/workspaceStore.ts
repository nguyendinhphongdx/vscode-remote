import { create } from "zustand";

interface WorkspaceState {
  workspaceRoot: string;
  folderName: string;
  setWorkspace: (root: string, name: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaceRoot: "",
  folderName: "",
  setWorkspace: (root, name) => set({ workspaceRoot: root, folderName: name }),
}));
