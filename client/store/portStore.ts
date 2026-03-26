import { create } from "zustand";
import type { PortInfo } from "@/lib/ws/protocol";

interface PortState {
  ports: PortInfo[];
  forwardedPorts: Set<number>;
  tunnelUrls: Map<number, string | null>;

  setPorts: (ports: PortInfo[], forwarded: number[], tunnelUrls: Record<number, string | null>) => void;
  addForwarded: (port: number, tunnelUrl: string | null) => void;
  removeForwarded: (port: number) => void;
}

export const usePortStore = create<PortState>((set) => ({
  ports: [],
  forwardedPorts: new Set(),
  tunnelUrls: new Map(),

  setPorts: (ports, forwarded, tunnelUrls) =>
    set({
      ports,
      forwardedPorts: new Set(forwarded),
      tunnelUrls: new Map(Object.entries(tunnelUrls).map(([k, v]) => [Number(k), v])),
    }),

  addForwarded: (port, tunnelUrl) =>
    set((state) => {
      const newSet = new Set(state.forwardedPorts);
      newSet.add(port);
      const newUrls = new Map(state.tunnelUrls);
      newUrls.set(port, tunnelUrl);
      return { forwardedPorts: newSet, tunnelUrls: newUrls };
    }),

  removeForwarded: (port) =>
    set((state) => {
      const newSet = new Set(state.forwardedPorts);
      newSet.delete(port);
      const newUrls = new Map(state.tunnelUrls);
      newUrls.delete(port);
      return { forwardedPorts: newSet, tunnelUrls: newUrls };
    }),
}));
