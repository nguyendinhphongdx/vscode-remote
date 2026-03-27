import { create } from "zustand";

export interface Tab {
  id: string;
  path: string;
  filename: string;
  content: string;
  language: string;
  isDirty: boolean;
  originalContent: string;
  isPreview: boolean;
}

interface EditorState {
  tabs: Tab[];
  activeTabId: string | null;

  openTab: (tab: Omit<Tab, "id" | "isDirty" | "originalContent" | "isPreview">, preview?: boolean) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  markSaved: (id: string, content: string) => void;
  pinTab: (id: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (tabData, preview = false) => {
    const { tabs } = get();
    // Check if file already open
    const existing = tabs.find((t) => t.path === tabData.path);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    const newTab: Tab = {
      ...tabData,
      id: tabData.path,
      isDirty: false,
      originalContent: tabData.content,
      isPreview: preview,
    };

    // If preview mode, replace existing preview tab
    if (preview) {
      const existingPreview = tabs.find((t) => t.isPreview);
      if (existingPreview) {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === existingPreview.id ? newTab : t)),
          activeTabId: newTab.id,
        }));
        return;
      }
    }

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
  },

  closeTab: (id) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id);
      let newActiveId = state.activeTabId;

      if (state.activeTabId === id) {
        const idx = state.tabs.findIndex((t) => t.id === id);
        newActiveId =
          newTabs[Math.min(idx, newTabs.length - 1)]?.id || null;
      }

      return { tabs: newTabs, activeTabId: newActiveId };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateContent: (id, content) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id
          ? { ...t, content, isDirty: content !== t.originalContent, isPreview: false }
          : t
      ),
    })),

  markSaved: (id, content) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id
          ? { ...t, isDirty: false, originalContent: content, content }
          : t
      ),
    })),

  pinTab: (id) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, isPreview: false } : t
      ),
    })),
}));
