"use client";

import { useState, useEffect, useCallback } from "react";
import { usePorts } from "@/lib/hooks/usePorts";
import { usePortStore } from "@/store/portStore";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  RefreshCw,
  Globe,
  GlobeLock,
  ExternalLink,
  Play,
  Square,
  Copy,
  Check,
} from "lucide-react";

export function PortsPanel() {
  const { refreshPorts, forwardPort, unforwardPort } = usePorts();
  const { ports, forwardedPorts } = usePortStore();
  const { status } = useWebSocket();
  const { machineId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [copiedPort, setCopiedPort] = useState<number | null>(null);

  const doRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await refreshPorts();
    } finally {
      setLoading(false);
    }
  }, [refreshPorts]);

  useEffect(() => {
    if (status !== "connected") return;
    doRefresh();
    const interval = setInterval(doRefresh, 5000);
    return () => clearInterval(interval);
  }, [status, doRefresh]);

  const handleToggleForward = async (port: number) => {
    if (forwardedPorts.has(port)) {
      await unforwardPort(port);
    } else {
      await forwardPort(port);
    }
  };

  const getProxyUrl = (port: number) => {
    return `${window.location.origin}/port/${machineId}/${port}/`;
  };

  const handleCopyUrl = (port: number) => {
    navigator.clipboard.writeText(getProxyUrl(port));
    setCopiedPort(port);
    setTimeout(() => setCopiedPort(null), 2000);
  };

  const handleOpen = (port: number) => {
    window.open(getProxyUrl(port), "_blank");
  };

  return (
    <div className="h-full flex flex-col text-[13px]">
      {/* Header */}
      <div className="group flex items-center h-[35px] px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider shrink-0 border-b border-border">
        <span className="flex-1">Ports</span>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            onClick={doRefresh}
            className="p-1 hover:bg-bg-active rounded"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center h-[24px] px-3 text-[11px] text-text-muted border-b border-border bg-[#1e1e1e] shrink-0">
        <span className="w-[60px] shrink-0">Port</span>
        <span className="flex-1">Address</span>
        <span className="w-[50px] shrink-0" />
      </div>

      {/* Port list */}
      <div className="flex-1 overflow-y-auto">
        {ports.length === 0 && status === "connected" && (
          <div className="px-4 py-8 text-text-muted text-xs text-center">
            No listening ports detected
          </div>
        )}
        {ports.map((p) => {
          const isForwarded = forwardedPorts.has(p.port);

          return (
            <div
              key={p.port}
              className="group flex items-center h-[32px] px-3 hover:bg-[#2a2d2e] cursor-default"
            >
              {/* Port number */}
              <span className="w-[60px] shrink-0 font-mono text-[12px] flex items-center gap-1.5">
                {isForwarded ? (
                  <Globe size={12} className="text-[#73c991] shrink-0" />
                ) : (
                  <GlobeLock size={12} className="text-text-muted shrink-0" />
                )}
                {p.port}
              </span>

              {/* Address */}
              <span className="flex-1 text-[12px] truncate min-w-0">
                {isForwarded ? (
                  <span
                    className="text-[#4fc1ff] hover:underline cursor-pointer"
                    onClick={() => handleOpen(p.port)}
                    title={getProxyUrl(p.port)}
                  >
                    {getProxyUrl(p.port)}
                  </span>
                ) : (
                  <span className="text-text-muted">
                    {p.process || `localhost:${p.port}`}
                  </span>
                )}
              </span>

              {/* Actions */}
              <span className="w-[50px] shrink-0 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100">
                {isForwarded ? (
                  <>
                    <button
                      onClick={() => handleCopyUrl(p.port)}
                      className="p-0.5 rounded hover:bg-[#3c3c3c]"
                      title="Copy URL"
                    >
                      {copiedPort === p.port ? (
                        <Check size={13} className="text-[#73c991]" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpen(p.port)}
                      className="p-0.5 rounded hover:bg-[#3c3c3c]"
                      title="Open in Browser"
                    >
                      <ExternalLink size={13} />
                    </button>
                    <button
                      onClick={() => handleToggleForward(p.port)}
                      className="p-0.5 rounded hover:bg-[#3c3c3c] text-[#c74e39]"
                      title="Stop Forwarding"
                    >
                      <Square size={13} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleToggleForward(p.port)}
                    className="p-0.5 rounded hover:bg-[#3c3c3c] text-[#73c991]"
                    title="Forward Port"
                  >
                    <Play size={13} />
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {forwardedPorts.size > 0 && (
        <div className="px-3 py-1.5 border-t border-border text-[11px] text-text-muted">
          {forwardedPorts.size} port{forwardedPorts.size > 1 ? "s" : ""} forwarded via relay
        </div>
      )}
    </div>
  );
}
