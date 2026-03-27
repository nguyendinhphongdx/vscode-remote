"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { useWorkspaceStore } from "@/store/workspaceStore";
import {
  MSG,
  type WorkspaceBrowseResponse,
  type WorkspaceInfoResponse,
} from "@/lib/ws/protocol";
import { Folder, ChevronRight, CornerDownLeft } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WorkspacePicker({ open, onClose }: Props) {
  const { ws } = useWebSocket();
  const { setWorkspace } = useWorkspaceStore();
  const [inputValue, setInputValue] = useState("~/");
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<{ name: string; path: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setInputValue("~/");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Browse directory when input changes
  const browse = useCallback(
    async (path: string) => {
      if (!ws) return;
      setLoading(true);
      try {
        const result = await ws.send<WorkspaceBrowseResponse>(
          MSG.WORKSPACE_BROWSE,
          { path }
        );
        setCurrentPath(result.path);
        setEntries(result.entries);
        setSelectedIndex(0);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [ws]
  );

  // Browse on input change (debounced)
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      browse(inputValue);
    }, 150);
    return () => clearTimeout(timer);
  }, [inputValue, open, browse]);

  // Filter entries based on last segment of input
  const lastSlash = Math.max(inputValue.lastIndexOf("/"), inputValue.lastIndexOf("\\"));
  const filterText = lastSlash >= 0 ? inputValue.slice(lastSlash + 1).toLowerCase() : inputValue.toLowerCase();
  const filteredEntries = filterText
    ? entries.filter((e) => e.name.toLowerCase().includes(filterText))
    : entries;

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const selectEntry = async (entry: { name: string; path: string }) => {
    // Use the absolute path from the agent, append / for browsing
    const sep = entry.path.includes("\\") ? "\\" : "/";
    const normalized = entry.path.endsWith(sep) ? entry.path : entry.path + sep;
    setInputValue(normalized);
  };

  const confirmWorkspace = async (path?: string) => {
    if (!ws) return;
    const targetPath = path || currentPath || inputValue;
    try {
      const result = await ws.send<WorkspaceInfoResponse>(
        MSG.WORKSPACE_CHANGE,
        { path: targetPath }
      );
      setWorkspace(result.workspaceRoot, result.folderName);
      onClose();
      // Reload to re-init file explorer etc
      window.location.reload();
    } catch (err) {
      console.error("Failed to change workspace:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredEntries.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Tab":
        e.preventDefault();
        if (filteredEntries[selectedIndex]) {
          selectEntry(filteredEntries[selectedIndex]);
        }
        break;
      case "Enter":
        e.preventDefault();
        if (e.ctrlKey || e.metaKey || filteredEntries.length === 0) {
          // Ctrl+Enter or no entries = confirm current path as workspace
          confirmWorkspace();
        } else if (filteredEntries[selectedIndex]) {
          selectEntry(filteredEntries[selectedIndex]);
        }
        break;
      case "Escape":
        onClose();
        break;
      case "Backspace":
        // If input ends with / or \, go up one directory
        if ((inputValue.endsWith("/") || inputValue.endsWith("\\")) && inputValue.length > 1) {
          e.preventDefault();
          const trimmed = inputValue.slice(0, -1);
          const parentSlash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
          if (parentSlash >= 0) {
            setInputValue(trimmed.slice(0, parentSlash + 1));
          }
        }
        break;
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100]" onClick={onClose} />

      {/* Picker dropdown */}
      <div className="fixed top-[30px] left-1/2 -translate-x-1/2 z-[101] w-[600px] max-w-[90vw] bg-[#252526] border border-[#454545] rounded-b-md shadow-2xl">
        {/* Input */}
        <div className="flex items-center px-3 py-2 border-b border-[#454545]">
          <Folder size={14} className="text-[#999] shrink-0 mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a path to open as workspace (from ~/)"
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-[#cccccc] placeholder-[#666]"
            spellCheck={false}
          />
          {currentPath && (
            <button
              onClick={() => confirmWorkspace()}
              className="ml-2 px-2 py-0.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-[11px] rounded flex items-center gap-1 shrink-0"
              title="Open this folder as workspace"
            >
              Open
              <CornerDownLeft size={11} />
            </button>
          )}
        </div>

        {/* Current path display */}
        <div className="px-3 py-1 text-[11px] text-[#666] border-b border-[#333]">
          {loading ? "Loading..." : currentPath || "~"}
        </div>

        {/* Directory list */}
        <div ref={listRef} className="max-h-[300px] overflow-y-auto py-1">
          {filteredEntries.length === 0 && !loading && (
            <div className="px-4 py-3 text-[12px] text-[#666] text-center">
              {entries.length === 0
                ? "No subdirectories"
                : "No matches"}
            </div>
          )}
          {filteredEntries.map((entry, idx) => (
            <button
              key={entry.path}
              className={`w-full flex items-center px-3 py-[4px] text-left text-[13px] ${
                idx === selectedIndex
                  ? "bg-[#094771] text-white"
                  : "text-[#cccccc] hover:bg-[#2a2d2e]"
              }`}
              onClick={() => selectEntry(entry)}
              onDoubleClick={() => confirmWorkspace(entry.path)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <Folder size={14} className="mr-2 text-[#dcb67a] shrink-0" />
              <span className="flex-1 truncate">{entry.name}</span>
              <ChevronRight
                size={12}
                className="text-[#666] shrink-0 ml-2"
              />
            </button>
          ))}
        </div>

        {/* Hint */}
        <div className="px-3 py-1.5 border-t border-[#333] text-[11px] text-[#666] flex items-center gap-4">
          <span>
            <kbd className="px-1 bg-[#333] rounded text-[10px]">Tab</kbd> enter folder
          </span>
          <span>
            <kbd className="px-1 bg-[#333] rounded text-[10px]">Enter</kbd> enter folder
          </span>
          <span>
            <kbd className="px-1 bg-[#333] rounded text-[10px]">Ctrl+Enter</kbd> open as workspace
          </span>
          <span>
            <kbd className="px-1 bg-[#333] rounded text-[10px]">Esc</kbd> cancel
          </span>
        </div>
      </div>
    </>
  );
}
