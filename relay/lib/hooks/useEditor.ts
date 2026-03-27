"use client";

import { useCallback } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useFileSystem } from "./useFileSystem";
import { getLanguageFromPath } from "@/lib/utils/language";

export function useEditor() {
  const { openTab, closeTab, setActiveTab, updateContent, markSaved, pinTab, tabs, activeTabId } =
    useEditorStore();
  const { readFile, writeFile, statFile } = useFileSystem();

  const doOpen = useCallback(
    async (path: string, preview: boolean) => {
      const { tabs: currentTabs } = useEditorStore.getState();
      const existing = currentTabs.find((t) => t.path === path);
      if (existing) {
        // If opening non-preview but existing is preview, pin it
        if (!preview && existing.isPreview) {
          pinTab(existing.id);
        }
        setActiveTab(existing.id);
        return;
      }

      const candidates = /\.\w+$/.test(path)
        ? [path]
        : [path + ".ts", path + ".tsx", path + ".js", path + ".jsx", path + "/index.ts", path + "/index.tsx", path + "/index.js", path];

      for (const candidate of candidates) {
        try {
          const content = await readFile(candidate);
          const filename = candidate.split("/").pop() || candidate;
          const language = getLanguageFromPath(candidate);
          openTab({ path: candidate, filename, content, language }, preview);
          return;
        } catch {
          // Try next candidate
        }
      }
    },
    [readFile, openTab, setActiveTab, pinTab]
  );

  // Single click from file tree → preview tab (italic, replaceable)
  const openFilePreview = useCallback(
    (path: string) => doOpen(path, true),
    [doOpen]
  );

  // Double click from file tree, or Ctrl+Click import → permanent tab
  const openFile = useCallback(
    (path: string) => doOpen(path, false),
    [doOpen]
  );

  const saveFile = useCallback(
    async (id: string) => {
      const { tabs: currentTabs } = useEditorStore.getState();
      const tab = currentTabs.find((t) => t.id === id);
      if (!tab) return;
      await writeFile(tab.path, tab.content);
      markSaved(id, tab.content);
    },
    [writeFile, markSaved]
  );

  const resolveFilePath = useCallback(
    async (path: string): Promise<string | null> => {
      const candidates = /\.\w+$/.test(path)
        ? [path]
        : [path + ".ts", path + ".tsx", path + ".js", path + ".jsx", path + "/index.ts", path + "/index.tsx", path + "/index.js"];

      for (const candidate of candidates) {
        const stat = await statFile(candidate);
        if (stat.exists) return candidate;
      }
      return null;
    },
    [statFile]
  );

  return {
    openFile,
    openFilePreview,
    pinTab,
    saveFile,
    closeTab,
    setActiveTab,
    updateContent,
    resolveFilePath,
    tabs,
    activeTabId,
    activeTab: tabs.find((t) => t.id === activeTabId) || null,
  };
}
