import { create } from "zustand";
import type { PortInfo } from "@/lib/ws/protocol";

interface PortState {
  ports: PortInfo[];
  forwardedPorts: Set<number>;
  tunnelUrls: Map<number, string>;

  setPorts: (ports: PortInfo[], forwarded: number[], tunnelUrls: Record<number, string | null>) => void;
  addForwarded: (port: number, tunnelUrl: string) => void;
  removeForwarded: (port: number) => void;
}

export const usePortStore = create<PortState>((set) => ({
  ports: [],
  forwardedPorts: new Set(),
  tunnelUrls: new Map(),

  setPorts: (ports, forwarded, tunnelUrls) => {
    const urlMap = new Map<number, string>();
    for (const [k, v] of Object.entries(tunnelUrls)) {
      if (v) urlMap.set(Number(k), v);
    }
    set({ ports, forwardedPorts: new Set(forwarded), tunnelUrls: urlMap });
  },

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
