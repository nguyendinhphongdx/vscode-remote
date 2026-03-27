"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setToken, setMachineId } from "@/lib/auth/auth";
import {
  Monitor,
  Clock,
  Terminal,
  Trash2,
  ArrowRight,
  Zap,
  Code2,
  Settings,
  LayoutDashboard,
  Users,
  ChevronDown,
} from "lucide-react";

interface AgentInfo {
  machineId: string;
  connectedAt: string;
  browserCount: number;
}

interface RecentConnection {
  machineId: string;
  lastConnected: string;
}

const RECENT_KEY = "vsremote_recent";
const MAX_RECENT = 20;

function getRecent(): RecentConnection[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecent(machineId: string): void {
  const recent = getRecent().filter((r) => r.machineId !== machineId);
  recent.unshift({ machineId, lastConnected: new Date().toISOString() });
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function removeRecent(machineId: string): void {
  const recent = getRecent().filter((r) => r.machineId !== machineId);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
}

function formatMachineId(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 3) {
    parts.push(digits.slice(i, i + 3));
  }
  return parts.join("-");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function HomePage() {
  const [machineId, setMid] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [recent, setRecent] = useState<RecentConnection[]>([]);
  const router = useRouter();

  useEffect(() => {
    setRecent(getRecent());
  }, []);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        setAgents(data.agents || []);
      } catch {
        // ignore
      }
    };
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawMid = machineId.replace(/-/g, "");
    setError("");

    if (rawMid.length !== 9) {
      setError("Please enter a valid 9-digit Machine ID");
      return;
    }
    if (!password) {
      setError("Please enter the password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineId: rawMid, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Connection failed");
      }

      const { token } = await res.json();
      setToken(token);
      setMachineId(rawMid);
      addRecent(rawMid);
      setRecent(getRecent());
      router.push(`/editor/${rawMid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickConnect = (mid: string) => {
    setMid(formatMachineId(mid));
    document.getElementById("password-input")?.focus();
  };

  const handleRemoveRecent = (mid: string) => {
    removeRecent(mid);
    setRecent(getRecent());
  };

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const totalSessions = agents.reduce((sum, a) => sum + a.browserCount, 0);

  return (
    <div className="h-full flex" style={{ background: "#f0f2f5", color: "#23233b", fontFamily: "var(--font-inter), sans-serif" }}>
      {/* ===== Sidebar ===== */}
      <aside
        className="w-[200px] shrink-0 flex flex-col border-r h-full"
        style={{ background: "#fff", borderColor: "#eaedf3" }}
      >
        {/* Logo */}
        <div className="px-4 h-16 flex items-center gap-2.5 border-b" style={{ borderColor: "#eaedf3" }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #4f6ef7, #7c5bf6)" }}
          >
            <Code2 size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: "#23233b" }}>VS Code</div>
            <div className="text-[10px]" style={{ color: "#9ca3af" }}>Remote</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <a
            href="#"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: "#eef1fb", color: "#4f6ef7" }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </a>
          <a
            href="#"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm"
            style={{ color: "#6b7280" }}
          >
            <Monitor size={16} />
            Devices
          </a>
          <a
            href="#"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm"
            style={{ color: "#6b7280" }}
          >
            <Settings size={16} />
            Settings
          </a>
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t" style={{ borderColor: "#eaedf3" }}>
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "#4f6ef7" }}
            >
              A
            </div>
            <span className="text-xs" style={{ color: "#6b7280" }}>Admin</span>
          </div>
        </div>
      </aside>

      {/* ===== Main ===== */}
      <main className="flex-1 h-full overflow-y-auto">
        {/* Top bar */}
        <header
          className="sticky top-0 z-10 h-16 flex items-center justify-between px-8 border-b"
          style={{ background: "rgba(255,255,255,0.85)", borderColor: "#e5e7eb", backdropFilter: "blur(8px)" }}
        >
          <div />
          <div className="flex items-center gap-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "#4f6ef7" }}
            >
              A
            </div>
            <span className="text-sm font-medium" style={{ color: "#23233b" }}>Admin</span>
          </div>
        </header>

        <div className="px-8 py-6">
          {/* ===== Hero Banner ===== */}
          <div
            className="rounded-2xl p-8 mb-8 flex items-center justify-between"
            style={{ background: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {/* Left: greeting + connect */}
            <div>
              <p className="text-sm mb-0.5" style={{ color: "#9ca3af" }}>
                {dateStr} &nbsp; <strong style={{ color: "#23233b" }}>{timeStr}</strong>
              </p>
              <h1 className="text-2xl font-bold mb-1" style={{ color: "#23233b" }}>
                {greeting}
              </h1>
              <p className="text-sm mb-5" style={{ color: "#9ca3af" }}>
                What would you like to do today?
              </p>

              {/* Quick connect inline */}
              <form onSubmit={handleConnect} className="flex items-center gap-2">
                <input
                  type="text"
                  value={machineId}
                  onChange={(e) => setMid(formatMachineId(e.target.value))}
                  placeholder="Enter machine ID"
                  className="px-4 py-2.5 rounded-lg text-sm outline-none w-[200px] font-mono tracking-wider"
                  style={{ background: "#fff", border: "1px solid #e0e3eb", color: "#23233b" }}
                  onFocus={(e) => (e.target.style.borderColor = "#4f6ef7")}
                  onBlur={(e) => (e.target.style.borderColor = "#e0e3eb")}
                />
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="px-4 py-2.5 rounded-lg text-sm outline-none w-[160px]"
                  style={{ background: "#fff", border: "1px solid #e0e3eb", color: "#23233b" }}
                  onFocus={(e) => (e.target.style.borderColor = "#4f6ef7")}
                  onBlur={(e) => (e.target.style.borderColor = "#e0e3eb")}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
                  style={{ background: "#4f6ef7" }}
                >
                  {loading ? "Connecting..." : "Connect"}
                  {!loading && <ArrowRight size={14} />}
                </button>
              </form>
              {error && (
                <p className="text-xs mt-2" style={{ color: "#ef4444" }}>{error}</p>
              )}
            </div>

            {/* Right: stat cards */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-2xl px-5 py-4 text-center"
                style={{ border: "1px solid #e5e7eb", background: "#fff" }}
              >
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold mb-1.5" style={{ color: "#ef4444" }}>
                  <Zap size={12} />
                  Live
                </div>
                <div className="text-3xl font-bold" style={{ color: "#4f6ef7" }}>
                  {agents.length}
                </div>
              </div>
              <div
                className="rounded-2xl px-5 py-4 text-center"
                style={{ border: "1px solid #e5e7eb", background: "#fff" }}
              >
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold mb-1.5" style={{ color: "#6b7280" }}>
                  <Users size={12} />
                  Total
                </div>
                <div className="text-3xl font-bold" style={{ color: "#23233b" }}>
                  {recent.length}
                </div>
              </div>
              <div
                className="rounded-2xl px-5 py-4 text-center"
                style={{ border: "1px solid #e5e7eb", background: "#fff" }}
              >
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold mb-1.5" style={{ color: "#10b981" }}>
                  <Clock size={12} />
                  Uptime
                </div>
                <div className="text-3xl font-bold" style={{ color: "#23233b" }}>
                  --
                </div>
              </div>
              <div
                className="rounded-2xl px-5 py-4 text-center"
                style={{ border: "1px solid #e5e7eb", background: "#fff" }}
              >
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold mb-1.5" style={{ color: "#f59e0b" }}>
                  <Terminal size={12} />
                  Sessions
                </div>
                <div className="text-3xl font-bold" style={{ color: "#23233b" }}>
                  {totalSessions}
                </div>
              </div>
            </div>
          </div>

          {/* ===== Bottom panels ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Online Devices (left, wider) */}
            <div
              className="lg:col-span-2 rounded-2xl border"
              style={{ background: "#fff", borderColor: "#eaedf3" }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#eaedf3" }}>
                <h2 className=" font-bold" style={{ color: "#23233b" }}>
                  Online Devices
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: "#ecfdf5", color: "#059669" }}
                >
                  {agents.length} online
                </span>
              </div>

              <div className="p-4">
                {agents.length === 0 ? (
                  <div className="text-center py-12">
                    <Monitor size={36} className="mx-auto mb-3" style={{ color: "#d1d5db" }} />
                    <p className="text-sm" style={{ color: "#9ca3af" }}>No devices online</p>
                    <p className="text-xs mt-1" style={{ color: "#d1d5db" }}>
                      Start an agent to see it here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agents.map((agent) => (
                      <button
                        key={agent.machineId}
                        onClick={() => handleQuickConnect(agent.machineId)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "#eef1fb" }}
                        >
                          <Monitor size={16} style={{ color: "#4f6ef7" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm font-semibold" style={{ color: "#23233b" }}>
                            {formatMachineId(agent.machineId)}
                          </div>
                          <div className="text-xs flex items-center gap-2" style={{ color: "#9ca3af" }}>
                            <Clock size={10} />
                            Connected
                            {agent.browserCount > 0 && (
                              <span style={{ color: "#f59e0b" }}>
                                · {agent.browserCount} session{agent.browserCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#10b981" }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Connections (right, table style) */}
            <div
              className="lg:col-span-3 rounded-2xl border"
              style={{ background: "#fff", borderColor: "#eaedf3" }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#eaedf3" }}>
                <h2 className="font-bold" style={{ color: "#23233b" }}>
                  Recent Connections
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: "#eef1fb", color: "#4f6ef7" }}
                >
                  {recent.length} Total
                </span>
              </div>

              {recent.length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={36} className="mx-auto mb-3" style={{ color: "#d1d5db" }} />
                  <p className="text-sm" style={{ color: "#9ca3af" }}>No recent connections</p>
                  <p className="text-xs mt-1" style={{ color: "#d1d5db" }}>
                    Your connection history will appear here
                  </p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div
                    className="grid px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "#9ca3af", gridTemplateColumns: "1fr 100px 120px 50px" }}
                  >
                    <span>Device</span>
                    <span>Status</span>
                    <span>Date</span>
                    <span />
                  </div>

                  {/* Table rows */}
                  <div className="max-h-[320px] overflow-y-auto">
                    {recent.map((r) => {
                      const isOnline = agents.some((a) => a.machineId === r.machineId);
                      return (
                        <div
                          key={r.machineId}
                          className="group grid items-center px-6 py-3 border-t transition-colors cursor-pointer"
                          style={{
                            borderColor: "#f3f4f6",
                            gridTemplateColumns: "1fr 100px 120px 50px",
                          }}
                          onClick={() => handleQuickConnect(r.machineId)}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {/* Device */}
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: isOnline ? "#ecfdf5" : "#f3f4f6" }}
                            >
                              <Monitor
                                size={14}
                                style={{ color: isOnline ? "#10b981" : "#9ca3af" }}
                              />
                            </div>
                            <span className="font-mono text-sm font-medium" style={{ color: "#23233b" }}>
                              {formatMachineId(r.machineId)}
                            </span>
                          </div>

                          {/* Status */}
                          <div>
                            {isOnline ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                                style={{ background: "#ecfdf5", color: "#059669" }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981" }} />
                                Online
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                                style={{ background: "#f3f4f6", color: "#9ca3af" }}
                              >
                                Offline
                              </span>
                            )}
                          </div>

                          {/* Date */}
                          <span className="text-xs" style={{ color: "#9ca3af" }}>
                            {formatDate(r.lastConnected)}
                          </span>

                          {/* Actions */}
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveRecent(r.machineId);
                              }}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ color: "#9ca3af" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              title="Remove"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
