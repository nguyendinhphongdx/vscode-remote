"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { useGitStore } from "@/store/gitStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { MSG, type WorkspaceInfoResponse } from "@/lib/ws/protocol";
import {
  Search,
  Settings,
  Minus,
  Square,
  X,
} from "lucide-react";

interface MenuItem {
  label: string;
  shortcut?: string;
  divider?: boolean;
  disabled?: boolean;
  action?: () => void;
}

interface Menu {
  label: string;
  items: MenuItem[];
}

interface TitleBarProps {
  onOpenFolder?: () => void;
}

export function TitleBar({ onOpenFolder }: TitleBarProps) {
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const { branch } = useGitStore();

  const menus: Menu[] = [
    {
      label: "File",
      items: [
        { label: "New File", shortcut: "Ctrl+N" },
        { label: "New Folder" },
        { label: "divider", divider: true },
        { label: "Open Folder...", action: onOpenFolder },
        { label: "divider", divider: true },
        { label: "Save", shortcut: "Ctrl+S" },
        { label: "Save All", shortcut: "Ctrl+Shift+S", disabled: true },
        { label: "divider", divider: true },
        { label: "Preferences", disabled: true },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z" },
        { label: "Redo", shortcut: "Ctrl+Shift+Z" },
        { label: "divider", divider: true },
        { label: "Cut", shortcut: "Ctrl+X" },
        { label: "Copy", shortcut: "Ctrl+C" },
        { label: "Paste", shortcut: "Ctrl+V" },
        { label: "divider", divider: true },
        { label: "Find", shortcut: "Ctrl+F" },
        { label: "Replace", shortcut: "Ctrl+H" },
      ],
    },
    {
      label: "Selection",
      items: [
        { label: "Select All", shortcut: "Ctrl+A" },
        { label: "Expand Selection", shortcut: "Shift+Alt+→", disabled: true },
        { label: "Shrink Selection", shortcut: "Shift+Alt+←", disabled: true },
        { label: "divider", divider: true },
        { label: "Copy Line Up", shortcut: "Shift+Alt+↑", disabled: true },
        { label: "Copy Line Down", shortcut: "Shift+Alt+↓", disabled: true },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Explorer", shortcut: "Ctrl+Shift+E" },
        { label: "Search", shortcut: "Ctrl+Shift+F", disabled: true },
        { label: "Source Control", shortcut: "Ctrl+Shift+G", disabled: true },
        { label: "divider", divider: true },
        { label: "Terminal", shortcut: "Ctrl+`" },
        { label: "divider", divider: true },
        { label: "Word Wrap", shortcut: "Alt+Z", disabled: true },
      ],
    },
    {
      label: "Go",
      items: [
        { label: "Go to File...", shortcut: "Ctrl+P", disabled: true },
        { label: "Go to Symbol...", shortcut: "Ctrl+Shift+O", disabled: true },
        { label: "Go to Line...", shortcut: "Ctrl+G", disabled: true },
        { label: "divider", divider: true },
        { label: "Go to Definition", shortcut: "F12", disabled: true },
        { label: "Go to References", shortcut: "Shift+F12", disabled: true },
      ],
    },
    {
      label: "Terminal",
      items: [
        { label: "New Terminal", shortcut: "Ctrl+Shift+`" },
        { label: "divider", divider: true },
        { label: "Run Task...", disabled: true },
        { label: "Run Build Task...", shortcut: "Ctrl+Shift+B", disabled: true },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "Keyboard Shortcuts", shortcut: "Ctrl+K Ctrl+S", disabled: true },
        { label: "divider", divider: true },
        { label: "About", disabled: true },
      ],
    },
  ];

  // Close menu when clicking outside
  useEffect(() => {
    if (activeMenu === null) return;
    const handleClick = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [activeMenu]);

  // Close on Escape
  useEffect(() => {
    if (activeMenu === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveMenu(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeMenu]);

  const { ws, status } = useWebSocket();
  const { folderName, setWorkspace } = useWorkspaceStore();

  // Fetch workspace info on connect
  const fetchWorkspaceInfo = useCallback(async () => {
    if (!ws) return;
    try {
      const result = await ws.send<WorkspaceInfoResponse>(MSG.WORKSPACE_INFO, {});
      setWorkspace(result.workspaceRoot, result.folderName);
    } catch {
      // ignore
    }
  }, [ws, setWorkspace]);

  useEffect(() => {
    if (status === "connected") {
      fetchWorkspaceInfo();
    }
  }, [status, fetchWorkspaceInfo]);

  const projectName = folderName || "No Folder Opened";

  return (
    <div className="relative h-[30px] bg-[#3c3c3c] flex items-center select-none shrink-0 text-[12px] text-[#cccccc]">
      {/* App icon */}
      <div className="w-12 flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 100 100" className="text-[#007acc]">
          <path
            d="M97.15 27.83L75.96 4.08c-2.87-3.22-7.58-4.2-11.52-2.4L2.68 30.65a7.92 7.92 0 0 0-.18 14.27l10.7 5.9L2.5 56.71a7.92 7.92 0 0 0 .18 14.27l61.76 28.97c3.94 1.8 8.65.82 11.52-2.4l21.19-23.75a7.93 7.93 0 0 0 0-10.53L76.34 40.12l20.81-1.76a7.93 7.93 0 0 0 0-10.53z"
            fill="currentColor"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* Menu bar — hidden on mobile */}
      <div ref={menuBarRef} className="hidden sm:flex items-center h-full">
        {menus.map((menu, idx) => (
          <div key={menu.label} className="relative h-full">
            <button
              className={`h-full px-2 hover:bg-[#505050] ${
                activeMenu === idx ? "bg-[#505050]" : ""
              }`}
              onClick={() => setActiveMenu(activeMenu === idx ? null : idx)}
              onMouseEnter={() => {
                if (activeMenu !== null) setActiveMenu(idx);
              }}
            >
              {menu.label}
            </button>

            {/* Dropdown */}
            {activeMenu === idx && (
              <div className="absolute top-full left-0 z-50 min-w-[220px] bg-[#3c3c3c] border border-[#454545] rounded-[5px] py-1 shadow-xl">
                {menu.items.map((item, itemIdx) =>
                  item.divider ? (
                    <div key={itemIdx} className="h-px bg-[#454545] mx-2 my-1" />
                  ) : (
                    <button
                      key={itemIdx}
                      className={`w-full flex items-center justify-between px-6 py-[3px] text-left text-[12px] ${
                        item.disabled
                          ? "text-[#6b6b6b] cursor-default"
                          : "text-[#cccccc] hover:bg-[#094771]"
                      }`}
                      onClick={() => {
                        if (!item.disabled) {
                          setActiveMenu(null);
                          item.action?.();
                        }
                      }}
                      disabled={item.disabled}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className={`ml-8 text-[11px] ${item.disabled ? "text-[#555]" : "text-[#999]"}`}>
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Center: Title / Search — positioned at viewport center */}
      <div className="flex-1" />
      <button
        onClick={onOpenFolder}
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-[2px] bg-[#505050] hover:bg-[#5a5a5a] rounded-md text-[12px] text-[#999] w-[70%] sm:w-[40%] sm:min-w-[200px] max-w-[500px] justify-center truncate"
      >
        <Search size={12} />
        <span>
          {projectName}
          {branch ? ` (${branch})` : ""}
          {status !== "connected" ? " — Disconnected" : ""}
        </span>
      </button>

      {/* Right: Settings + Window controls — hidden on mobile */}
      <div className="hidden sm:flex items-center h-full shrink-0">
        <button className="p-2 hover:bg-[#505050] h-full flex items-center" title="Settings">
          <Settings size={14} />
        </button>
        <div className="flex items-center h-full ml-2">
          <button className="px-3 h-full hover:bg-[#505050] flex items-center" title="Minimize">
            <Minus size={14} />
          </button>
          <button className="px-3 h-full hover:bg-[#505050] flex items-center" title="Maximize">
            <Square size={12} />
          </button>
          <button className="px-3 h-full hover:bg-[#e81123] hover:text-white flex items-center" title="Close">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
