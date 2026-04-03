"use client";

import { useCallback } from "react";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { usePortStore } from "@/store/portStore";
import { MSG, type PortListResponse, type PortForwardResponse } from '@vscode-remote/shared';

export function usePorts() {
  const { ws } = useWebSocket();
  const { setPorts, addForwarded, removeForwarded } = usePortStore();

  const refreshPorts = useCallback(async () => {
    if (!ws) return;
    try {
      const result = await ws.send<PortListResponse>(MSG.PORT_LIST, {});
      setPorts(result.ports, result.forwarded, result.tunnelUrls);
    } catch {
      // ignore
    }
  }, [ws, setPorts]);

  const forwardPort = useCallback(async (port: number): Promise<string> => {
    if (!ws) throw new Error("Not connected");
    const result = await ws.send<PortForwardResponse>(MSG.PORT_FORWARD, { port });
    addForwarded(port, result.tunnelUrl);
    return result.tunnelUrl;
  }, [ws, addForwarded]);

  const unforwardPort = useCallback(async (port: number) => {
    if (!ws) return;
    await ws.send(MSG.PORT_UNFORWARD, { port });
    removeForwarded(port);
  }, [ws, removeForwarded]);

  return { refreshPorts, forwardPort, unforwardPort };
}
