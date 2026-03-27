"use client";

import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { useTerminal } from "@/lib/hooks/useTerminal";
import { MSG, type TerminalOutputPayload, type TerminalExitEvent } from "@/lib/ws/protocol";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  terminalId: string;
  isActive: boolean;
}

export function TerminalComponent({ terminalId, isActive }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { ws } = useWebSocket();
  const { sendInput, resize } = useTerminal();

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
      ref={containerRef}
      className="h-full w-full"
      style={{ display: isActive ? "block" : "none" }}
    />
  );
}
