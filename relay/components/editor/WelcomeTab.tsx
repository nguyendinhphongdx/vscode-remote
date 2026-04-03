"use client";

import { useWorkspaceStore } from "@/store/workspaceStore";
import { FolderOpen } from "lucide-react";

interface WelcomeTabProps {
  onOpenFolder?: () => void;
}

export function WelcomeTab({ onOpenFolder }: WelcomeTabProps) {
  const { workspaceRoot } = useWorkspaceStore();

  return (
    <div className="h-full flex items-center justify-center text-text-muted">
      <div className="text-center space-y-4 max-w-[400px]">
        <h2 className="text-2xl font-light text-text-secondary">VS Code Remote</h2>

        {!workspaceRoot ? (
          <div className="space-y-4">
            <p className="text-sm">Open a folder to get started</p>
            <button
              onClick={onOpenFolder}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm rounded"
            >
              <FolderOpen size={16} />
              Open Folder
            </button>
          </div>
        ) : (
          <div className="text-sm space-y-1">
            <p>Open a file from the explorer to start editing</p>
          </div>
        )}

        <div className="mt-4 text-xs space-y-0.5">
          <p><kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Ctrl+S</kbd> Save file</p>
          <p><kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Ctrl+`</kbd> Toggle terminal</p>
          <p><kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Ctrl+B</kbd> Toggle sidebar</p>
        </div>
      </div>
    </div>
  );
}
