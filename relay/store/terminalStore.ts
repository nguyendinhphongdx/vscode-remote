import { create } from "zustand";

export interface TerminalSession {
  id: string;
  title: string;
}

interface TerminalState {
  sessions: TerminalSession[];
  activeSessionId: string | null;

  addSession: (session: TerminalSession) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: session.id,
    })),

  removeSession: (id) =>
    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== id);
      let newActiveId = state.activeSessionId;
      if (state.activeSessionId === id) {
        newActiveId = newSessions[newSessions.length - 1]?.id || null;
      }
      return { sessions: newSessions, activeSessionId: newActiveId };
    }),

  setActiveSession: (id) => set({ activeSessionId: id }),
}));
