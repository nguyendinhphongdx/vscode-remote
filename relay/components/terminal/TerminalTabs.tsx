"use client";

import { useTerminalStore } from "@/store/terminalStore";
import { useTerminal } from "@/lib/hooks/useTerminal";
import { Plus, X, Trash2, ChevronDown, Maximize2, Minimize2 } from "lucide-react";

interface TerminalTabsProps {
  onCreateTerminal: () => void;
  onToggle?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export function TerminalTabs({ onCreateTerminal, onToggle, isMaximized, onToggleMaximize }: TerminalTabsProps) {
  const { sessions, activeSessionId } = useTerminalStore();
  const { closeTerminal, setActiveSession } = useTerminal();

  return (
    <div className="flex items-center h-[35px] bg-bg-secondary border-b border-border shrink-0 select-none">
      {/* Left: Panel title tabs */}
      <div className="flex items-center h-full">
        <div className="flex items-center h-full px-3 text-[11px] uppercase tracking-wider font-semibold text-text-primary border-b border-text-primary">
          Terminal
        </div>
      </div>

      {/* Center: Terminal instance tabs */}
      <div className="flex items-center flex-1 h-full overflow-x-auto ml-2 gap-px">
        {sessions.map((session, index) => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              className={`group/tab flex items-center gap-1 h-full px-2 cursor-pointer text-[12px] ${
                isActive
                  ? "text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setActiveSession(session.id)}
            >
              <span className="text-[11px]">
                {isActive ? "●" : "○"}
              </span>
              <span>{session.title || `bash ${index + 1}`}</span>
              <button
                className="p-0.5 rounded hover:bg-bg-active opacity-0 group-hover/tab:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(session.id);
                }}
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5 px-1 shrink-0">
        <button
          onClick={onCreateTerminal}
          className="p-1 rounded hover:bg-bg-active text-text-secondary hover:text-text-primary"
          title="New Terminal (Ctrl+Shift+`)"
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
  );
}
