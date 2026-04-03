"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTerminalStore } from "@/store/terminalStore";
import { useTerminal } from "@/lib/hooks/useTerminal";
import { Plus, X, Trash2, ChevronDown, Maximize2, Minimize2, TerminalSquare, PanelRight, PanelBottom, Ellipsis } from "lucide-react";
import { VoiceMicButton } from "./VoiceMicButton";
import type { ShellInfo } from "@vscode-remote/shared";

export type TerminalPosition = "bottom" | "right";

interface TerminalTabsProps {
  onCreateTerminal: (shell?: string) => void;
  onToggle?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  position?: TerminalPosition;
  onTogglePosition?: () => void;
}

export function TerminalTabs({ onCreateTerminal, onToggle, isMaximized, onToggleMaximize, position = "bottom", onTogglePosition }: TerminalTabsProps) {
  const { sessions, activeSessionId } = useTerminalStore();
  const { closeTerminal, setActiveSession, fetchShells } = useTerminal();
  const [shells, setShells] = useState<ShellInfo[]>([]);
  const [showShellMenu, setShowShellMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const shellMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Fetch available shells once
  useEffect(() => {
    fetchShells().then((res) => {
      if (res) setShells(res.shells);
    });
  }, [fetchShells]);

  // Close menus on outside click
  useEffect(() => {
    if (!showShellMenu && !showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (showShellMenu && shellMenuRef.current && !shellMenuRef.current.contains(e.target as Node)) {
        setShowShellMenu(false);
      }
      if (showMoreMenu && moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showShellMenu, showMoreMenu]);

  const handleShellSelect = useCallback((shell: string) => {
    setShowShellMenu(false);
    onCreateTerminal(shell);
  }, [onCreateTerminal]);

  return (
    <div className="flex items-center h-[35px] bg-bg-secondary border-b border-border shrink-0 select-none">
      {/* Left: Panel label + primary actions */}
      <div className="flex items-center h-full shrink-0">
        <div className="flex items-center h-full px-3 text-[11px] uppercase tracking-wider font-semibold text-text-primary border-b border-text-primary">
          Terminal
        </div>
        <div className="flex items-center gap-0.5 ml-1">
          {/* New Terminal + shell dropdown */}
          <div className="relative" ref={shellMenuRef}>
            <div className="flex items-center">
              <button
                onClick={() => onCreateTerminal()}
                className="p-1 rounded-l hover:bg-bg-active text-text-secondary hover:text-text-primary"
                title="New Terminal"
              >
                <Plus size={14} />
              </button>
              {shells.length > 1 && (
                <button
                  onClick={() => { setShowShellMenu((v) => !v); setShowMoreMenu(false); }}
                  className="px-0.5 py-1 rounded-r hover:bg-bg-active text-text-secondary hover:text-text-primary border-l border-border"
                  title="Select Shell Type"
                >
                  <ChevronDown size={10} />
                </button>
              )}
            </div>
            {showShellMenu && (
              <div className="absolute top-full left-0 mt-1 bg-bg-secondary border border-border rounded shadow-lg z-50 min-w-40 py-1">
                {shells.map((shell) => (
                  <button
                    key={shell.id}
                    onClick={() => handleShellSelect(shell.path)}
                    className="w-full text-left px-3 py-1.5 text-[12px] text-text-secondary hover:bg-bg-active hover:text-text-primary"
                  >
                    {shell.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kill Terminal */}
          {sessions.length > 0 && (
            <button
              onClick={() => { if (activeSessionId) closeTerminal(activeSessionId); }}
              className="p-1 rounded hover:bg-bg-active text-text-secondary hover:text-text-primary"
              title="Kill Terminal"
            >
              <Trash2 size={14} />
            </button>
          )}

          {/* More actions (...) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => { setShowMoreMenu((v) => !v); setShowShellMenu(false); }}
              className="p-1 rounded hover:bg-bg-active text-text-secondary hover:text-text-primary"
              title="More Actions"
            >
              <Ellipsis size={14} />
            </button>
            {showMoreMenu && (
              <div className="absolute top-full left-0 mt-1 bg-bg-secondary border border-border rounded shadow-lg z-50 min-w-44 py-1">
                <VoiceMicButton asMenuItem />
                {onTogglePosition && (
                  <button
                    onClick={() => { onTogglePosition(); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-bg-active hover:text-text-primary"
                  >
                    {position === "bottom" ? <PanelRight size={13} /> : <PanelBottom size={13} />}
                    {position === "bottom" ? "Move Panel Right" : "Move Panel to Bottom"}
                  </button>
                )}
                {onToggleMaximize && (
                  <button
                    onClick={() => { onToggleMaximize(); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-bg-active hover:text-text-primary"
                  >
                    {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    {isMaximized ? "Restore Panel" : "Maximize Panel"}
                  </button>
                )}
                {onToggle && (
                  <button
                    onClick={() => { onToggle(); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-bg-active hover:text-text-primary"
                  >
                    <ChevronDown size={13} />
                    Hide Panel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Terminal instance tabs */}
      <div className="flex items-center h-full overflow-x-auto gap-px pr-1">
        {sessions.map((session, index) => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              className={`group/tab flex items-center gap-1.5 h-[27px] my-auto px-2 cursor-pointer text-[12px] rounded-sm ${
                isActive
                  ? "bg-editor text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-[#2a2d2e]"
              }`}
              onClick={() => setActiveSession(session.id)}
            >
              <TerminalSquare size={13} className={isActive ? "text-text-primary" : "text-text-muted"} />
              <span className="whitespace-nowrap">
                {session.title || `Terminal ${index + 1}`}
              </span>
              <button
                className={`p-0.5 rounded hover:bg-bg-active ${
                  isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover/tab:opacity-100"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(session.id);
                }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
