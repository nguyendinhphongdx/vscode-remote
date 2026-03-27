"use client";

import { useTerminalStore } from "@/store/terminalStore";
import { useTerminal } from "@/lib/hooks/useTerminal";
import { Plus, X, Trash2, ChevronDown, Maximize2, Minimize2, TerminalSquare, PanelRight, PanelBottom } from "lucide-react";

export type TerminalPosition = "bottom" | "right";

interface TerminalTabsProps {
  onCreateTerminal: () => void;
  onToggle?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  position?: TerminalPosition;
  onTogglePosition?: () => void;
}

export function TerminalTabs({ onCreateTerminal, onToggle, isMaximized, onToggleMaximize, position = "bottom", onTogglePosition }: TerminalTabsProps) {
  const { sessions, activeSessionId } = useTerminalStore();
  const { closeTerminal, setActiveSession } = useTerminal();

  return (
    <div className="flex items-center h-[35px] bg-bg-secondary border-b border-border shrink-0 select-none">
      {/* Left: Panel label + actions */}
      <div className="flex items-center h-full shrink-0">
        <div className="flex items-center h-full px-3 text-[11px] uppercase tracking-wider font-semibold text-text-primary border-b border-text-primary">
          Terminal
        </div>
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={onCreateTerminal}
            className="p-1 rounded hover:bg-bg-active text-text-secondary hover:text-text-primary"
            title="New Terminal"
          >
            <Plus size={14} />
          </button>
          {sessions.length > 0 && (
            <button
              onClick={() => {
                if (activeSessionId) closeTerminal(activeSessionId);
              }}
              className="p-1 rounded hover:bg-bg-active text-text-secondary hover:text-text-primary"
              title="Kill Terminal"
            >
              <Trash2 size={14} />
            </button>
          )}
          {onTogglePosition && (
            <button
              onClick={onTogglePosition}
              className="p-1 rounded hover:bg-bg-active text-text-secondary hover:text-text-primary"
              title={position === "bottom" ? "Move Panel Right" : "Move Panel to Bottom"}
            >
              {position === "bottom" ? <PanelRight size={14} /> : <PanelBottom size={14} />}
            </button>
          )}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1 rounded hover:bg-bg-active text-text-secondary hover:text-text-primary"
              title={isMaximized ? "Restore Panel" : "Maximize Panel"}
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1 rounded hover:bg-bg-active text-text-secondary hover:text-text-primary"
              title="Hide Panel"
            >
              <ChevronDown size={14} />
            </button>
          )}
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
