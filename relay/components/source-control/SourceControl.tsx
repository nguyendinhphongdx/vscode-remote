"use client";

import { useState, useEffect } from "react";
import { useGitStore, type GitFileInfo } from "@/store/gitStore";
import { useGit } from "@/lib/hooks/useGit";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  RefreshCw,
  Plus,
  Minus,
  Undo2,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";
import type { GitFileStatus } from "@/lib/ws/protocol";

const statusLabels: Record<string, string> = {
  M: "Modified",
  A: "Added",
  D: "Deleted",
  R: "Renamed",
  U: "Untracked",
  "?": "Untracked",
};

const statusColors: Record<string, string> = {
  M: "text-[#e2c08d]",
  A: "text-[#73c991]",
  D: "text-[#c74e39]",
  R: "text-[#73c991]",
  U: "text-[#e2c08d]",
  "?": "text-[#73c991]",
};

function StatusBadge({ status }: { status: GitFileStatus }) {
  const label = status === "?" ? "U" : status;
  const color = statusColors[status] || "text-text-secondary";
  return (
    <span className={`text-[11px] font-medium w-4 text-center shrink-0 ${color}`}>
      {label}
    </span>
  );
}

function FileItem({
  file,
  staged,
  onStage,
  onUnstage,
  onDiscard,
}: {
  file: GitFileInfo;
  staged: boolean;
  onStage: () => void;
  onUnstage: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="group flex items-center h-[22px] px-2 hover:bg-[#2a2d2e] cursor-pointer text-[13px]">
      <span className="flex-1 flex items-center min-w-0 gap-1">
        <span className="truncate text-[#cccccc]">{file.filename}</span>
        {file.folder && (
          <span className="text-[#999] text-[11px] truncate shrink-0">{file.folder}</span>
        )}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
        {staged ? (
          <button
            onClick={(e) => { e.stopPropagation(); onUnstage(); }}
            className="p-0.5 rounded hover:bg-[#3c3c3c]"
            title="Unstage Changes"
          >
            <Minus size={12} />
          </button>
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onDiscard(); }}
              className="p-0.5 rounded hover:bg-[#3c3c3c]"
              title="Discard Changes"
            >
              <Undo2 size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onStage(); }}
              className="p-0.5 rounded hover:bg-[#3c3c3c]"
              title="Stage Changes"
            >
              <Plus size={12} />
            </button>
          </>
        )}
      </div>
      <StatusBadge status={file.status} />
    </div>
  );
}

export function SourceControl() {
  const { stagedFiles, changedFiles, changeCount } = useGitStore();
  const { refreshStatus, stageFile, stageAll, unstageFile, unstageAll, discardFile, commit } = useGit();
  const { status } = useWebSocket();
  const [commitMessage, setCommitMessage] = useState("");
  const [stagedExpanded, setStagedExpanded] = useState(true);
  const [changesExpanded, setChangesExpanded] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<string | null>(null);

  useEffect(() => {
    if (status === "connected") {
      refreshStatus();
    }
  }, [status, refreshStatus]);

  const handleCommit = async () => {
    if (!commitMessage.trim() || committing) return;
    setCommitting(true);
    try {
      await commit(commitMessage.trim());
      setCommitMessage("");
    } catch (err) {
      console.error("Commit failed:", err);
    } finally {
      setCommitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleCommit();
    }
  };

  return (
    <div className="h-full flex flex-col text-[13px]">
      {/* Header */}
      <div className="group flex items-center h-[35px] px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider shrink-0 border-b border-border">
        <span className="flex-1">Source Control</span>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            onClick={refreshStatus}
            className="p-1 hover:bg-bg-active rounded"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Commit input */}
      <div className="px-2 py-2 border-b border-border">
        <div className="flex gap-1">
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message (Ctrl+Enter to commit)"
            className="flex-1 bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007fd4] rounded px-2 py-1 text-[12px] text-[#cccccc] placeholder-[#666] outline-none resize-none h-[26px] min-h-[26px]"
            rows={1}
          />
        </div>
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || stagedFiles.length === 0 || committing}
          className="w-full mt-1.5 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white rounded text-[12px] font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <Check size={14} />
          {committing ? "Committing..." : "Commit"}
        </button>
      </div>

      {/* File lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Staged Changes */}
        {stagedFiles.length > 0 && (
          <div>
            <div
              className="flex items-center h-[22px] px-2 cursor-pointer hover:bg-[#2a2d2e] text-[11px] font-semibold uppercase tracking-wide text-text-secondary"
              onClick={() => setStagedExpanded((v) => !v)}
            >
              {stagedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="ml-1 flex-1">Staged Changes</span>
              <span className="bg-[#3c3c3c] rounded-full px-1.5 text-[10px] min-w-[18px] text-center">
                {stagedFiles.length}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); unstageAll(); }}
                className="ml-1 p-0.5 rounded hover:bg-[#3c3c3c]"
                title="Unstage All"
              >
                <Minus size={12} />
              </button>
            </div>
            {stagedExpanded && stagedFiles.map((file) => (
              <FileItem
                key={`staged-${file.path}`}
                file={file}
                staged
                onStage={() => {}}
                onUnstage={() => unstageFile(file.path)}
                onDiscard={() => {}}
              />
            ))}
          </div>
        )}

        {/* Changes */}
        {changedFiles.length > 0 && (
          <div>
            <div
              className="flex items-center h-[22px] px-2 cursor-pointer hover:bg-[#2a2d2e] text-[11px] font-semibold uppercase tracking-wide text-text-secondary"
              onClick={() => setChangesExpanded((v) => !v)}
            >
              {changesExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="ml-1 flex-1">Changes</span>
              <span className="bg-[#3c3c3c] rounded-full px-1.5 text-[10px] min-w-[18px] text-center">
                {changedFiles.length}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); stageAll(); }}
                className="ml-1 p-0.5 rounded hover:bg-[#3c3c3c]"
                title="Stage All"
              >
                <Plus size={12} />
              </button>
            </div>
            {changesExpanded && changedFiles.map((file) => (
              <FileItem
                key={`changed-${file.path}`}
                file={file}
                staged={false}
                onStage={() => stageFile(file.path)}
                onUnstage={() => {}}
                onDiscard={() => setDiscardTarget(file.path)}
              />
            ))}
          </div>
        )}

        {changeCount === 0 && status === "connected" && (
          <div className="px-4 py-8 text-text-muted text-xs text-center">
            No changes detected
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!discardTarget}
        title="Discard Changes"
        message={`Are you sure you want to discard changes to "${discardTarget?.split("/").pop()}"?`}
        confirmLabel="Discard"
        onConfirm={() => {
          if (discardTarget) discardFile(discardTarget);
          setDiscardTarget(null);
        }}
        onCancel={() => setDiscardTarget(null)}
      />
    </div>
  );
}
