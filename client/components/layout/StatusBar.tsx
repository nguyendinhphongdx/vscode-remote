"use client";

import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { useEditorStore } from "@/store/editorStore";
import { useGitStore } from "@/store/gitStore";
import { useAuth } from "@/components/providers/AuthProvider";
import { LogOut, GitBranch } from "lucide-react";

export function StatusBar() {
  const { status } = useWebSocket();
  const { tabs, activeTabId } = useEditorStore();
  const { branch } = useGitStore();
  const { logout } = useAuth();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="h-[22px] bg-statusbar text-white flex items-center justify-between px-2 text-[11px] shrink-0 select-none">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${
              status === "connected"
                ? "bg-green-400"
                : status === "connecting"
                ? "bg-yellow-400 animate-pulse"
                : "bg-red-400"
            }`}
          />
          {status === "connected"
            ? "Connected"
            : status === "connecting"
            ? "Connecting..."
            : "Disconnected"}
        </span>
        {branch && (
          <span className="flex items-center gap-1">
            <GitBranch size={12} />
            {branch}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {activeTab && (
          <>
            <span>{activeTab.language}</span>
            <span>{activeTab.path}</span>
          </>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-1 hover:bg-white/20 px-1 rounded"
          title="Sign out"
        >
          <LogOut size={12} />
        </button>
      </div>
    </div>
  );
}
