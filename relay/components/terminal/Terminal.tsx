"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { useTerminal } from "@/lib/hooks/useTerminal";
import { MSG, type TerminalOutputPayload, type TerminalExitEvent } from '@vscode-remote/shared';
import { MobileTerminalToolbar } from "./MobileTerminalToolbar";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  terminalId: string;
  isActive: boolean;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      setIsMobile(
        "ontouchstart" in window || window.innerWidth < 768
      );
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function TerminalComponent({ terminalId, isActive }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { ws, status } = useWebSocket();
  const { sendInput, resize } = useTerminal();
  const isMobile = useIsMobile();

  const handleToolbarKey = useCallback(
    (data: string) => {
      sendInput(terminalId, data);
      xtermRef.current?.focus();
    },
    [terminalId, sendInput]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const xterm = new XTerm({
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#aeafad",
        selectionBackground: "rgba(0, 120, 212, 0.4)",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#e5e5e5",
      },
      fontSize: 14,
      fontFamily: "'Cascadia Code', 'Fira Code', Menlo, Monaco, monospace",
      cursorBlink: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Send input to server
    xterm.onData((data) => {
      sendInput(terminalId, data);
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      resize(terminalId, xterm.cols, xterm.rows);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [terminalId, sendInput, resize]);

  // Listen for terminal output
  useEffect(() => {
    if (!ws) return;

    const unsubOutput = ws.on(MSG.TERMINAL_OUTPUT, (payload) => {
      const data = payload as TerminalOutputPayload;
      if (data.terminalId === terminalId && xtermRef.current) {
        xtermRef.current.write(data.data);
      }
    });

    return () => {
      unsubOutput();
    };
  }, [ws, terminalId]);

  // Focus when active
  useEffect(() => {
    if (isActive && xtermRef.current) {
      xtermRef.current.focus();
      fitAddonRef.current?.fit();
    }
  }, [isActive]);

  return (
    <div
      className="h-full w-full flex flex-col"
      style={{ display: isActive ? "flex" : "none" }}
    >
      <div ref={containerRef} className="flex-1 min-h-0" />
      {isMobile && (
        <MobileTerminalToolbar
          onKey={handleToolbarKey}
          networkStatus={status === "connected" ? "connected" : status === "disconnected" || status === "auth_expired" ? "disconnected" : "connecting"}
        />
      )}
    </div>
  );
}
