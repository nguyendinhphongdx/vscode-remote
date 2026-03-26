"use client";

import { useCallback } from "react";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { useTerminalStore } from "@/store/terminalStore";
import { MSG, type TerminalCreateResponse } from "@/lib/ws/protocol";

export function useTerminal() {
  const { ws } = useWebSocket();
  const { addSession, removeSession, setActiveSession } = useTerminalStore();

  const createTerminal = useCallback(
    async (cols: number, rows: number) => {
      if (!ws) return null;
      const result = await ws.send<TerminalCreateResponse>(MSG.TERMINAL_CREATE, {
        cols,
        rows,
      });
      addSession({
        id: result.terminalId,
        title: `Terminal ${useTerminalStore.getState().sessions.length + 1}`,
      });
      return result.terminalId;
    },
    [ws, addSession]
  );

  const sendInput = useCallback(
    (terminalId: string, data: string) => {
      if (!ws) return;
      // Fire and forget - no response expected
      ws.send(MSG.TERMINAL_INPUT, { terminalId, data }).catch(() => {});
    },
    [ws]
  );

  const resize = useCallback(
    (terminalId: string, cols: number, rows: number) => {
      if (!ws) return;
      ws.send(MSG.TERMINAL_RESIZE, { terminalId, cols, rows }).catch(() => {});
    },
    [ws]
  );

  const closeTerminal = useCallback(
    async (terminalId: string) => {
      if (!ws) return;
      await ws.send(MSG.TERMINAL_CLOSE, { terminalId });
      removeSession(terminalId);
    },
    [ws, removeSession]
  );

  return { createTerminal, sendInput, resize, closeTerminal, setActiveSession };
}
