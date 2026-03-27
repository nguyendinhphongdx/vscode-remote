"use client";

import { useEffect, useState } from "react";
import { useFileSystem } from "@/lib/hooks/useFileSystem";
import { useGit } from "@/lib/hooks/useGit";
import { useFileStore } from "@/store/fileStore";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { MSG, type FsWatchEvent } from "@/lib/ws/protocol";
import { FileTreeNode } from "./FileTreeNode";
import { NewFileDialog } from "./NewFileDialog";
import { FilePlus, FolderPlus, RefreshCw } from "lucide-react";

export function FileExplorer() {
  const { listDirectory, createEntry } = useFileSystem();
  const { refreshStatus } = useGit();
  const { tree } = useFileStore();
  const { ws, status } = useWebSocket();
  const [creating, setCreating] = useState<"file" | "directory" | null>(null);

  useEffect(() => {
    if (status === "connected") {
      listDirectory(".");
      refreshStatus();
    }
  }, [status, listDirectory, refreshStatus]);

  useEffect(() => {
    if (!ws) return;
    const unsub = ws.on(MSG.FS_WATCH_EVENT, (payload) => {
      const event = payload as FsWatchEvent;
      const parentPath = event.path.includes("/")
        ? event.path.substring(0, event.path.lastIndexOf("/"))
        : ".";
      listDirectory(parentPath);
      refreshStatus();
    });
    return unsub;
  }, [ws, listDirectory, refreshStatus]);

  const handleCreate = async (name: string) => {
    if (!creating) return;
    await createEntry(name, creating);
    setCreating(null);
    listDirectory(".");
  };

  const rootEntries = tree.get(".") || [];

  return (
    <div className="h-full flex flex-col text-[13px]">
      {/* Explorer header */}
      <div className="group flex items-center h-[35px] px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider shrink-0 border-b border-border">
        <span className="flex-1">Explorer</span>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => setCreating("file")}
            className="p-1 hover:bg-bg-active rounded"
            title="New File"
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={() => setCreating("directory")}
            className="p-1 hover:bg-bg-active rounded"
            title="New Folder"
          >
            <FolderPlus size={14} />
          </button>
          <button
            onClick={() => listDirectory(".")}
            className="p-1 hover:bg-bg-active rounded"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* File tree */}
      <div className="group/tree flex-1 overflow-y-auto overflow-x-hidden pt-1 focus-within:outline-none" tabIndex={-1}>
        {creating && (
            <NewFileDialog
              type={creating}
              onConfirm={handleCreate}
              onCancel={() => setCreating(null)}
            />
          )}

          {rootEntries.map((entry) => (
            <FileTreeNode key={entry.path} entry={entry} depth={0} />
          ))}

          {rootEntries.length === 0 && status === "connected" && (
            <div className="px-4 py-8 text-text-muted text-xs text-center">
              No files in workspace
            </div>
          )}
          {status !== "connected" && (
            <div className="px-4 py-8 text-text-muted text-xs text-center">
              <div className="animate-spin w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full mx-auto mb-2" />
              Connecting...
            </div>
          )}
      </div>
    </div>
  );
}
