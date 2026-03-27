"use client";

import { useState, useCallback, useEffect } from "react";
import { FileExplorer } from "@/components/file-explorer/FileExplorer";
import { SourceControl } from "@/components/source-control/SourceControl";
import { EditorTabs } from "@/components/editor/EditorTabs";
import { MonacoEditor } from "@/components/editor/MonacoEditor";
import { WelcomeTab } from "@/components/editor/WelcomeTab";
import { TerminalComponent } from "@/components/terminal/Terminal";
import { TerminalTabs, type TerminalPosition } from "@/components/terminal/TerminalTabs";
import { TitleBar } from "./TitleBar";
import { StatusBar } from "./StatusBar";
import { ResizeHandle } from "./ResizeHandle";
import { WorkspacePicker } from "./WorkspacePicker";
import { useEditor } from "@/lib/hooks/useEditor";
import { useTerminal } from "@/lib/hooks/useTerminal";
import { useTerminalStore } from "@/store/terminalStore";
import { useGitStore } from "@/store/gitStore";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { PortsPanel } from "@/components/ports/PortsPanel";
import { Files, Terminal, GitBranch, Radio } from "lucide-react";

export function AppShell() {
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [terminalWidth, setTerminalWidth] = useState(400);
  const [activeSidebar, setActiveSidebar] = useState<"explorer" | "scm" | "ports" | null>("explorer");
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalMaximized, setTerminalMaximized] = useState(false);
  const [terminalPosition, setTerminalPosition] = useState<TerminalPosition>("bottom");
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  const { tabs, activeTab, activeTabId, updateContent, saveFile, setActiveTab, openFile, resolveFilePath } =
    useEditor();
  const { createTerminal } = useTerminal();
  const { sessions, activeSessionId } = useTerminalStore();
  const { changeCount } = useGitStore();
  const { status } = useWebSocket();

  const toggleSidebar = (panel: "explorer" | "scm" | "ports") => {
    setActiveSidebar((prev) => (prev === panel ? null : panel));
  };

  const handleOpenFolder = useCallback(() => {
    setFolderPickerOpen(true);
  }, []);

  const handleCreateTerminal = useCallback(async () => {
    const id = await createTerminal(80, 24);
    if (id) setShowTerminal(true);
  }, [createTerminal]);

  const handleTogglePosition = useCallback(() => {
    setTerminalPosition((p) => (p === "bottom" ? "right" : "bottom"));
    setTerminalMaximized(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        if (!showTerminal && sessions.length === 0) {
          handleCreateTerminal();
        } else {
          setShowTerminal((v) => !v);
        }
      }
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        setActiveSidebar((v) => v ? null : "explorer");
      }
      if (e.ctrlKey && e.shiftKey && e.key === "G") {
        e.preventDefault();
        toggleSidebar("scm");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showTerminal, sessions.length, handleCreateTerminal]);

  const showTerminalPanel = showTerminal && sessions.length > 0;

  const terminalPanel = (
    <div
      className={`bg-terminal flex flex-col overflow-hidden ${
        terminalMaximized ? "flex-1" : "shrink-0"
      }`}
      style={
        terminalMaximized
          ? undefined
          : terminalPosition === "bottom"
          ? { height: terminalHeight }
          : { width: terminalWidth }
      }
    >
      <TerminalTabs
        onCreateTerminal={handleCreateTerminal}
        onToggle={() => setShowTerminal(false)}
        isMaximized={terminalMaximized}
        onToggleMaximize={() => setTerminalMaximized((v) => !v)}
        position={terminalPosition}
        onTogglePosition={handleTogglePosition}
      />
      <div className="flex-1 overflow-hidden">
        {sessions.map((session) => (
          <TerminalComponent
            key={session.id}
            terminalId={session.id}
            isActive={session.id === activeSessionId}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <TitleBar onOpenFolder={handleOpenFolder} />
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-bg-secondary flex flex-col items-center pt-1 shrink-0 border-r border-border">
          <button
            onClick={() => toggleSidebar("explorer")}
            className={`w-12 h-12 flex items-center justify-center relative transition-colors ${
              activeSidebar === "explorer"
                ? "text-text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[2px] before:h-6 before:bg-accent before:rounded-r"
                : "text-text-muted hover:text-text-primary"
            }`}
            title="Explorer (Ctrl+B)"
          >
            <Files size={22} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => toggleSidebar("scm")}
            className={`w-12 h-12 flex items-center justify-center relative transition-colors ${
              activeSidebar === "scm"
                ? "text-text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[2px] before:h-6 before:bg-accent before:rounded-r"
                : "text-text-muted hover:text-text-primary"
            }`}
            title="Source Control (Ctrl+Shift+G)"
          >
            <GitBranch size={22} strokeWidth={1.5} />
            {changeCount > 0 && (
              <span className="absolute top-1.5 right-1 bg-accent text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                {changeCount > 99 ? "99+" : changeCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              if (!showTerminal && sessions.length === 0) {
                handleCreateTerminal();
              } else {
                setShowTerminal((v) => !v);
              }
            }}
            className={`w-12 h-12 flex items-center justify-center relative transition-colors ${
              showTerminal
                ? "text-text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[2px] before:h-6 before:bg-accent before:rounded-r"
                : "text-text-muted hover:text-text-primary"
            }`}
            title="Terminal (Ctrl+`)"
          >
            <Terminal size={22} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => toggleSidebar("ports")}
            className={`w-12 h-12 flex items-center justify-center relative transition-colors ${
              activeSidebar === "ports"
                ? "text-text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[2px] before:h-6 before:bg-accent before:rounded-r"
                : "text-text-muted hover:text-text-primary"
            }`}
            title="Ports"
          >
            <Radio size={22} strokeWidth={1.5} />
          </button>
        </div>

        {/* Sidebar */}
        {activeSidebar && (
          <>
            <div
              className="bg-sidebar overflow-hidden shrink-0"
              style={{ width: sidebarWidth }}
            >
              {activeSidebar === "explorer" && <FileExplorer onOpenFolder={handleOpenFolder} />}
              {activeSidebar === "scm" && <SourceControl />}
              {activeSidebar === "ports" && <PortsPanel />}
            </div>
            <ResizeHandle
              direction="horizontal"
              onResize={(delta) =>
                setSidebarWidth((w) => Math.max(150, Math.min(500, w + delta)))
              }
            />
          </>
        )}

        {/* Main Area: Editor + Terminal (layout depends on position) */}
        <div className={`flex-1 flex overflow-hidden ${
          terminalPosition === "right" ? "flex-row" : "flex-col"
        }`}>
          {/* Editor */}
          {!terminalMaximized && (
            <div className="flex-1 flex flex-col overflow-hidden bg-editor">
              <EditorTabs />
              <div className="flex-1 overflow-hidden">
                {activeTab ? (
                  <MonacoEditor
                    key={activeTab.id}
                    content={activeTab.content}
                    language={activeTab.language}
                    path={activeTab.path}
                    onChange={(value) => updateContent(activeTab.id, value)}
                    onSave={() => saveFile(activeTab.id)}
                    onOpenFile={(filePath) => openFile(filePath)}
                    resolveFilePath={resolveFilePath}
                  />
                ) : (
                  <WelcomeTab onOpenFolder={handleOpenFolder} />
                )}
              </div>
            </div>
          )}

          {/* Terminal Panel */}
          {showTerminalPanel && (
            <>
              {!terminalMaximized && (
                <ResizeHandle
                  direction={terminalPosition === "right" ? "horizontal" : "vertical"}
                  onResize={(delta) => {
                    if (terminalPosition === "right") {
                      setTerminalWidth((w) => Math.max(200, Math.min(800, w - delta)));
                    } else {
                      setTerminalHeight((h) => Math.max(100, Math.min(600, h - delta)));
                    }
                  }}
                />
              )}
              {terminalPanel}
            </>
          )}
        </div>
      </div>

      <StatusBar />

      {/* Folder picker */}
      <WorkspacePicker open={folderPickerOpen} onClose={() => setFolderPickerOpen(false)} />
    </div>
  );
}
