"use client";

import { useState, useEffect } from "react";
import {
  Monitor,
  Clock,
  Terminal,
  Trash2,
  Zap,
  Code2,
  Users,
  Lock,
  LogOut,
  ArrowLeft,
  Copy,
  Check,
  Eye,
  EyeOff,
  KeyRound,
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

function getRecent(): RecentConnection[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
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

// ============ Admin Login Screen ============

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center" style={{ background: "#09090b", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div
          className="rounded-2xl p-8"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="text-center mb-6">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              <Lock size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Admin Login</h1>
            <p className="text-sm mt-1" style={{ color: "#71717a" }}>Enter password to access dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fafafa" }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(59,130,246,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              autoFocus
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============ Agent Setup ============

interface AgentSetupInfo {
  relayUrl: string;
  relaySecret: string;
  setupCommand: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API unavailable (e.g. non-HTTPS context) — nothing sensible to fall back to.
        }
      }}
      className="shrink-0 p-1.5 rounded-lg transition-colors"
      style={{ color: copied ? "#4ade80" : "#71717a", border: "1px solid rgba(255,255,255,0.08)" }}
      title="Copy"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function AgentSetupCard({ adminAuthed, adminRequired }: { adminAuthed: boolean; adminRequired: boolean }) {
  const [setup, setSetup] = useState<AgentSetupInfo | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!adminAuthed && adminRequired) return;
    fetch("/api/admin/agent-setup")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSetup(data))
      .catch(() => setSetup(null));
  }, [adminAuthed, adminRequired]);

  if (!setup) return null;

  const maskedSecret = setup.relaySecret.slice(0, 4) + "•".repeat(Math.max(setup.relaySecret.length - 4, 0));

  return (
    <div className="rounded-2xl mb-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2.5 px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <KeyRound size={14} style={{ color: "#a855f7" }} />
        <h2 className="text-sm font-semibold">Agent Setup</h2>
        <span className="text-xs" style={{ color: "#52525b" }}>— dán vào máy chạy agent mới</span>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#52525b" }}>Relay URL</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono px-3 py-2 rounded-lg truncate" style={{ background: "rgba(255,255,255,0.03)" }}>{setup.relayUrl}</code>
              <CopyButton text={setup.relayUrl} />
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#52525b" }}>Relay Secret</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono px-3 py-2 rounded-lg truncate" style={{ background: "rgba(255,255,255,0.03)" }}>
                {revealed ? setup.relaySecret : maskedSecret}
              </code>
              <button
                onClick={() => setRevealed((v) => !v)}
                className="shrink-0 p-1.5 rounded-lg transition-colors"
                style={{ color: "#71717a", border: "1px solid rgba(255,255,255,0.08)" }}
                title={revealed ? "Hide" : "Show"}
              >
                {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <CopyButton text={setup.relaySecret} />
            </div>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#52525b" }}>Setup command</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono px-3 py-2 rounded-lg overflow-x-auto whitespace-nowrap" style={{ background: "rgba(255,255,255,0.03)" }}>
              {revealed ? setup.setupCommand : setup.setupCommand.replace(setup.relaySecret, maskedSecret)}
            </code>
            <CopyButton text={setup.setupCommand} />
          </div>
          <p className="text-xs mt-2" style={{ color: "#3f3f46" }}>
            Chạy trên máy đích, rồi <code>opencode start</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============ Dashboard ============

export default function DashboardPage() {
  const [adminChecking, setAdminChecking] = useState(true);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminRequired, setAdminRequired] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [recent, setRecent] = useState<RecentConnection[]>([]);

  useEffect(() => {
    fetch("/api/admin/check")
      .then((res) => res.json())
      .then((data) => {
        setAdminRequired(data.required);
        setAdminAuthed(data.authenticated);
      })
      .catch(() => {
        setAdminAuthed(false);
      })
      .finally(() => setAdminChecking(false));
  }, []);

  useEffect(() => {
    if (!adminAuthed && adminRequired) return;
    setRecent(getRecent());
  }, [adminAuthed, adminRequired]);

  useEffect(() => {
    if (!adminAuthed && adminRequired) return;
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents");
        if (!res.ok) return;
        const data = await res.json();
        setAgents(data.agents || []);
      } catch {
        // ignore
      }
    };
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, [adminAuthed, adminRequired]);

  const handleAdminLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAdminAuthed(false);
  };

  if (adminChecking) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: "#09090b" }}>
        <div className="animate-spin w-6 h-6 border-2 border-[#3b82f6] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (adminRequired && !adminAuthed) {
    return <AdminLogin onSuccess={() => setAdminAuthed(true)} />;
  }

  const handleRemoveRecent = (mid: string) => {
    removeRecent(mid);
    setRecent(getRecent());
  };

  const totalSessions = agents.reduce((sum, a) => sum + a.browserCount, 0);

  return (
    <div className="h-full flex flex-col" style={{ background: "#09090b", color: "#fafafa", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {/* Header */}
      <header className="shrink-0 h-16 flex items-center justify-between px-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 text-sm" style={{ color: "#71717a" }}>
            <ArrowLeft size={16} />
            Back
          </a>
          <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
              <Code2 size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold">Dashboard</span>
          </div>
        </div>
        {adminRequired && (
          <button
            onClick={handleAdminLogout}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "#71717a", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <LogOut size={14} />
            Logout
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Online", value: agents.length, icon: Zap, color: "#22c55e" },
              { label: "Sessions", value: totalSessions, icon: Terminal, color: "#f59e0b" },
              { label: "Total Devices", value: recent.length, icon: Users, color: "#3b82f6" },
              { label: "Uptime", value: "--", icon: Clock, color: "#a855f7" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2 text-[11px] font-medium mb-3" style={{ color: "#71717a" }}>
                  <stat.icon size={14} style={{ color: stat.color }} />
                  {stat.label}
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </div>
            ))}
          </div>

          <AgentSetupCard adminAuthed={adminAuthed} adminRequired={adminRequired} />

          {/* Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Online Devices */}
            <div className="lg:col-span-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <h2 className="text-sm font-semibold">Online Devices</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80" }}>
                  {agents.length} online
                </span>
              </div>
              <div className="p-4">
                {agents.length === 0 ? (
                  <div className="text-center py-12">
                    <Monitor size={32} className="mx-auto mb-3" style={{ color: "#27272a" }} />
                    <p className="text-sm" style={{ color: "#52525b" }}>No devices online</p>
                    <p className="text-xs mt-1" style={{ color: "#3f3f46" }}>Start an agent to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {agents.map((agent) => (
                      <div
                        key={agent.machineId}
                        className="flex items-center gap-3 p-3 rounded-xl transition-colors cursor-default"
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(59,130,246,0.1)" }}>
                          <Monitor size={16} style={{ color: "#60a5fa" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm font-medium">{formatMachineId(agent.machineId)}</div>
                          <div className="text-xs" style={{ color: "#52525b" }}>
                            {agent.browserCount > 0 ? `${agent.browserCount} session${agent.browserCount > 1 ? "s" : ""}` : "No sessions"}
                          </div>
                        </div>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#22c55e" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Connections */}
            <div className="lg:col-span-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <h2 className="text-sm font-semibold">Recent Connections</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>
                  {recent.length} total
                </span>
              </div>
              {recent.length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={32} className="mx-auto mb-3" style={{ color: "#27272a" }} />
                  <p className="text-sm" style={{ color: "#52525b" }}>No recent connections</p>
                  <p className="text-xs mt-1" style={{ color: "#3f3f46" }}>Your connection history will appear here</p>
                </div>
              ) : (
                <>
                  <div className="grid px-6 py-2.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#52525b", gridTemplateColumns: "1fr 100px 120px 50px" }}>
                    <span>Device</span>
                    <span>Status</span>
                    <span>Date</span>
                    <span />
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {recent.map((r) => {
                      const isOnline = agents.some((a) => a.machineId === r.machineId);
                      return (
                        <div
                          key={r.machineId}
                          className="group grid items-center px-6 py-3 border-t transition-colors"
                          style={{ borderColor: "rgba(255,255,255,0.04)", gridTemplateColumns: "1fr 100px 120px 50px" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: isOnline ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)" }}>
                              <Monitor size={14} style={{ color: isOnline ? "#4ade80" : "#52525b" }} />
                            </div>
                            <span className="font-mono text-sm">{formatMachineId(r.machineId)}</span>
                          </div>
                          <div>
                            {isOnline ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80" }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: "rgba(255,255,255,0.04)", color: "#52525b" }}>
                                Offline
                              </span>
                            )}
                          </div>
                          <span className="text-xs" style={{ color: "#52525b" }}>{formatDate(r.lastConnected)}</span>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleRemoveRecent(r.machineId)}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ color: "#52525b" }}
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
      </div>
    </div>
  );
}
