import { create } from "zustand";
import type { FileEntry } from '@vscode-remote/shared';

interface FileState {
  tree: Map<string, FileEntry[]>; // parentPath -> children
  expandedDirs: Set<string>;
  selectedPath: string | null;

  setChildren: (parentPath: string, entries: FileEntry[]) => void;
  toggleDir: (path: string) => void;
  expandDir: (path: string) => void;
  collapseDir: (path: string) => void;
  selectFile: (path: string | null) => void;
  clearTree: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  tree: new Map(),
  expandedDirs: new Set(),
  selectedPath: null,

  setChildren: (parentPath, entries) =>
    set((state) => {
      const newTree = new Map(state.tree);
      newTree.set(parentPath, entries);
      return { tree: newTree };
    }),

  toggleDir: (path) =>
    set((state) => {
      const newExpanded = new Set(state.expandedDirs);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return { expandedDirs: newExpanded };
    }),

  expandDir: (path) =>
    set((state) => {
      const newExpanded = new Set(state.expandedDirs);
      newExpanded.add(path);
      return { expandedDirs: newExpanded };
    }),

  collapseDir: (path) =>
    set((state) => {
      const newExpanded = new Set(state.expandedDirs);
      newExpanded.delete(path);
      return { expandedDirs: newExpanded };
    }),

  selectFile: (path) => set({ selectedPath: path }),

  clearTree: () =>
    set({ tree: new Map(), expandedDirs: new Set(), selectedPath: null }),
}));
