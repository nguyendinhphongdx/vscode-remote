"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setToken, setMachineId } from "@/lib/auth/auth";
import {
  ArrowRight,
  Terminal,
  FolderTree,
  GitBranch,
  Globe,
  Shield,
  Smartphone,
  Monitor,
  Zap,
  Code2,
  Eye,
  EyeOff,
  Download,
  X,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function formatMachineId(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 3) {
    parts.push(digits.slice(i, i + 3));
  }
  return parts.join("-");
}

const RECENT_KEY = "vsremote_recent";
const MAX_RECENT = 20;

function addRecent(machineId: string): void {
  try {
    const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").filter(
      (r: { machineId: string }) => r.machineId !== machineId
    );
    recent.unshift({ machineId, lastConnected: new Date().toISOString() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

const features = [
  {
    icon: Terminal,
    title: "Integrated Terminal",
    description: "Full terminal access with split panes, right from your browser.",
  },
  {
    icon: FolderTree,
    title: "File Explorer",
    description: "Browse, create, rename and delete files with real-time sync.",
  },
  {
    icon: GitBranch,
    title: "Git Integration",
    description: "Stage, commit, diff and manage your repositories seamlessly.",
  },
  {
    icon: Globe,
    title: "Port Forwarding",
    description: "Access remote services through secure HTTP-over-WebSocket tunneling.",
  },
  {
    icon: Shield,
    title: "Secure Sessions",
    description: "JWT authentication with automatic session expiry and token verification.",
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    description: "Responsive design optimized for tablets and phones. Install as PWA.",
  },
];

/* ── Guide Steps data ── */
const guideSteps = [
  {
    num: "01",
    icon: Monitor,
    title: "Agent Admin",
    desc: "Manage your agent from the admin panel — view credentials, check relay status, configure settings.",
    color: "#4ade80",
  },
  {
    num: "02",
    icon: FolderTree,
    title: "Pick Workspace",
    desc: "Connect with your credentials. Browse your remote filesystem and open any folder as workspace.",
    color: "#60a5fa",
  },
  {
    num: "03",
    icon: Code2,
    title: "Code + AI",
    desc: "Full editor with Claude Code AI in split terminal. Write, debug, and refactor — all in your browser.",
    color: "#c084fc",
  },
  {
    num: "04",
    icon: Globe,
    title: "Forward Ports",
    desc: "Auto-detect services, create Cloudflare tunnels, preview or share public URLs.",
    color: "#f472b6",
  },
  {
    num: "05",
    icon: Smartphone,
    title: "Mobile & PWA",
    desc: "Responsive on any device. Install as PWA for native-like offline experience.",
    color: "#fbbf24",
  },
];

function GuideSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((p) => (p + 1) % guideSteps.length), 4000);
    return () => clearInterval(t);
  }, [paused]);

  const step = guideSteps[active];

  return (
    <section className="relative border-t overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">How to Use</h2>
          <p className="text-sm max-w-md mx-auto" style={{ color: "#71717a" }}>
            From install to coding — in under a minute.
          </p>
        </div>

        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Step indicators — horizontal pills */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-10 flex-wrap">
            {guideSteps.map((s, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="group flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300"
                style={{
                  background: active === i ? `${s.color}12` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active === i ? `${s.color}40` : "rgba(255,255,255,0.06)"}`,
                  color: active === i ? s.color : "#52525b",
                  transform: active === i ? "scale(1.05)" : "scale(1)",
                }}
              >
                <s.icon size={14} />
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{s.num}</span>
              </button>
            ))}
          </div>

          {/* Main content area */}
          <div
            key={active}
            className="relative"
            style={{ animation: "guideSlideUp 0.4s cubic-bezier(0.4,0,0.2,1)" }}
          >
            {/* Glow behind card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none opacity-[0.06] transition-all duration-500" style={{ background: `radial-gradient(ellipse at center, ${step.color} 0%, transparent 70%)` }} />

            {/* The card */}
            <div className="relative rounded-2xl overflow-hidden" style={{ border: `1px solid ${step.color}20`, boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${step.color}08` }}>
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#131316", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f87171" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#facc15" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4ade80" }} />
                </div>
                <div className="flex-1 flex justify-center">
                  <span className="text-[11px] font-mono px-3 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.04)", color: "#52525b" }}>
                    {active === 0 && "Agent Admin — localhost:9000"}
                    {active === 1 && "VS Code Remote — Workspace"}
                    {active === 2 && "VS Code Remote — Editor + Claude Code"}
                    {active === 3 && "VS Code Remote — Ports"}
                    {active === 4 && "Mobile — PWA"}
                  </span>
                </div>
              </div>

              {/* Content area — each step has unique mockup */}
              <div style={{ background: "#09090b", minHeight: 320 }}>
                {active === 0 && (
                  <div className="flex" style={{ height: 320 }}>
                    {/* Sidebar */}
                    <div className="w-48 shrink-0 hidden sm:block p-4" style={{ background: "#0c0c0f", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
                          <Code2 size={12} className="text-white" />
                        </div>
                        <span className="text-[11px] font-bold" style={{ color: "#60a5fa" }}>VS Code Remote</span>
                      </div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#3f3f46" }}>General</div>
                      <div className="space-y-0.5 text-[11px] mb-4">
                        <div className="px-2.5 py-1.5 rounded-lg flex items-center gap-2" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>
                          <Monitor size={12} /> Home
                        </div>
                      </div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#3f3f46" }}>Documentation</div>
                      <div className="space-y-0.5 text-[11px]">
                        {["Getting Started", "Architecture", "Authentication", "File System", "Port Forwarding", "Terminal"].map((item) => (
                          <div key={item} className="px-2.5 py-1 rounded-lg flex items-center gap-2" style={{ color: "#52525b" }}>
                            <span className="w-3 text-center" style={{ fontSize: 8 }}>📄</span> {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Main content */}
                    <div className="flex-1 p-5 sm:p-6 overflow-hidden">
                      {/* Device card */}
                      <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#52525b" }}>This Device</div>
                        <div className="space-y-2.5 text-[12px]">
                          <div className="flex items-center justify-between">
                            <span style={{ color: "#71717a" }}>Machine ID</span>
                            <span className="font-mono font-bold tracking-wider" style={{ color: "#60a5fa" }}>165-143-086</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span style={{ color: "#71717a" }}>Password</span>
                            <span className="font-mono font-semibold" style={{ color: "#fbbf24" }}>yJc9A9rA</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span style={{ color: "#71717a" }}>Relay</span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4ade80" }} />
                              <span className="font-medium" style={{ color: "#4ade80" }}>Connected</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Connect form */}
                      <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#52525b" }}>Connect to Remote</div>
                        <div className="space-y-2">
                          <div className="h-8 rounded-lg px-3 flex items-center text-[11px] font-mono" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#3f3f46" }}>000-000-000</div>
                          <div className="h-8 rounded-lg px-3 flex items-center text-[11px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#3f3f46" }}>Enter password</div>
                          <div className="h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>Connect</div>
                        </div>
                      </div>
                      {/* Settings */}
                      <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#52525b" }}>Settings</span>
                        <ArrowRight size={12} style={{ color: "#3f3f46" }} />
                      </div>
                    </div>
                  </div>
                )}

                {active === 1 && (
                  <div className="p-6 sm:p-8" style={{ height: 320 }}>
                    <div className="max-w-md mx-auto">
                      <div className="text-center mb-5">
                        <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
                          <Code2 size={18} className="text-white" />
                        </div>
                        <div className="text-sm font-semibold mb-1">Open Workspace</div>
                        <div className="text-xs" style={{ color: "#52525b" }}>Navigate to a folder on your remote machine</div>
                      </div>
                      <div className="rounded-xl p-3 mb-3 font-mono text-xs" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", color: "#a1a1aa" }}>/home/user/projects</div>
                        <div className="space-y-0.5">
                          {[
                            { name: "my-app/", active: true },
                            { name: "api-server/", active: false },
                            { name: "landing-page/", active: false },
                            { name: "mobile-app/", active: false },
                          ].map((f, i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: f.active ? "rgba(59,130,246,0.1)" : "transparent", color: f.active ? "#60a5fa" : "#71717a" }}>
                              <FolderTree size={11} /> {f.name}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 h-8 rounded-lg text-[11px] flex items-center justify-center" style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#52525b" }}>Cancel</div>
                        <div className="flex-1 h-8 rounded-lg text-[11px] flex items-center justify-center font-semibold text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>Open Folder</div>
                      </div>
                    </div>
                  </div>
                )}

                {active === 2 && (
                  <div className="flex flex-col" style={{ height: 320 }}>
                    <div className="flex flex-1 min-h-0">
                      {/* Activity bar */}
                      <div className="w-10 shrink-0 hidden sm:flex flex-col items-center gap-4 pt-3" style={{ background: "#0c0c0f", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                        {[FolderTree, Terminal, GitBranch, Globe].map((Icon, idx) => (
                          <Icon key={idx} size={16} style={{ color: idx === 0 ? "#e4e4e7" : "#3f3f46" }} />
                        ))}
                      </div>
                      {/* Sidebar */}
                      <div className="w-36 shrink-0 hidden sm:block" style={{ background: "#0c0c0f", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="px-3 py-2 text-[10px] font-semibold uppercase" style={{ color: "#52525b" }}>Explorer — my-app</div>
                        <div className="text-[11px] font-mono">
                          {[
                            { name: "src/", color: "#60a5fa", indent: 0 },
                            { name: "App.tsx", color: "#4ade80", indent: 1, active: true },
                            { name: "index.ts", color: "#a1a1aa", indent: 1 },
                            { name: "utils.ts", color: "#a1a1aa", indent: 1 },
                            { name: "public/", color: "#60a5fa", indent: 0 },
                            { name: "package.json", color: "#fbbf24", indent: 0 },
                          ].map((f, i) => (
                            <div key={i} className="px-3 py-0.5" style={{ paddingLeft: 12 + f.indent * 12, color: f.color, background: f.active ? "rgba(59,130,246,0.08)" : "transparent" }}>{f.name}</div>
                          ))}
                        </div>
                      </div>
                      {/* Editor + Claude split */}
                      <div className="flex-1 flex flex-col min-w-0">
                        {/* Tabs */}
                        <div className="flex" style={{ background: "#0c0c0f", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="px-4 py-1.5 text-[11px] font-mono" style={{ color: "#e4e4e7", borderBottom: "2px solid #3b82f6" }}>App.tsx</div>
                          <div className="px-4 py-1.5 text-[11px] font-mono" style={{ color: "#3f3f46" }}>index.ts</div>
                        </div>
                        {/* Code area */}
                        <div className="flex-1 flex overflow-hidden">
                          <div className="py-2 pl-2 pr-1.5 text-right font-mono text-[10px] leading-5 select-none" style={{ color: "#3f3f46" }}>
                            {Array.from({ length: 8 }, (_, i) => <div key={i}>{i + 1}</div>)}
                          </div>
                          <div className="flex-1 py-2 pl-2 font-mono text-[10px] leading-5 overflow-hidden" style={{ color: "#a1a1aa" }}>
                            <div><span style={{ color: "#c084fc" }}>import</span> {"{"} <span style={{ color: "#fbbf24" }}>useState</span> {"}"} <span style={{ color: "#c084fc" }}>from</span> <span style={{ color: "#86efac" }}>&apos;react&apos;</span></div>
                            <div style={{ color: "#3f3f46" }} />
                            <div><span style={{ color: "#c084fc" }}>export default function</span> <span style={{ color: "#fbbf24" }}>App</span>() {"{"}</div>
                            <div>  <span style={{ color: "#c084fc" }}>const</span> [<span style={{ color: "#60a5fa" }}>count</span>, <span style={{ color: "#60a5fa" }}>setCount</span>] = <span style={{ color: "#fbbf24" }}>useState</span>(<span style={{ color: "#f472b6" }}>0</span>)</div>
                            <div>  <span style={{ color: "#c084fc" }}>return</span> (</div>
                            <div>    &lt;<span style={{ color: "#60a5fa" }}>div</span>&gt;&lt;<span style={{ color: "#60a5fa" }}>h1</span>&gt;{"{"}count{"}"}&lt;/<span style={{ color: "#60a5fa" }}>h1</span>&gt;</div>
                            <div>    &lt;<span style={{ color: "#60a5fa" }}>button</span> <span style={{ color: "#86efac" }}>onClick</span>={"{"}() =&gt; setCount(c =&gt; c+1){"}"}/&gt;</div>
                            <div>  &lt;/<span style={{ color: "#60a5fa" }}>div</span>&gt;) {"}"}</div>
                          </div>
                        </div>
                        {/* Claude Code Terminal — split bottom */}
                        <div className="font-mono text-[10px]" style={{ background: "#0c0010", borderTop: "1px solid rgba(168,85,247,0.2)", height: 140 }}>
                          {/* Terminal tabs */}
                          <div className="flex items-center px-2 py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <span className="px-2 py-0.5 text-[9px] rounded" style={{ color: "#52525b" }}>Terminal</span>
                            <span className="px-2 py-0.5 text-[9px] rounded" style={{ background: "rgba(168,85,247,0.1)", color: "#a855f6" }}>Claude Code</span>
                          </div>
                          {/* Claude banner */}
                          <div className="px-3 py-1.5 flex items-center gap-2">
                            <div className="shrink-0" style={{ lineHeight: "5px", fontSize: 4 }}>
                              <div style={{ color: "#d97706" }}>{" "}▄▄▄▄</div>
                              <div><span style={{ color: "#f59e0b" }}>█</span><span style={{ color: "#1c1917" }}>●</span><span style={{ color: "#f59e0b" }}>██</span><span style={{ color: "#1c1917" }}>●</span><span style={{ color: "#f59e0b" }}>█</span></div>
                              <div style={{ color: "#dc2626" }}>▀████▀</div>
                            </div>
                            <div>
                              <span className="font-bold text-[10px]" style={{ color: "#e4e4e7" }}>Claude Code</span>
                              <span className="text-[9px] ml-1" style={{ color: "#52525b" }}>v2.1.87</span>
                              <div className="text-[9px]" style={{ color: "#52525b" }}>Opus 4.6 · /home/user/my-app</div>
                            </div>
                          </div>
                          {/* Prompt + response */}
                          <div className="px-3 py-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold" style={{ color: "#a855f6" }}>❯</span>
                              <span className="flex-1" style={{ color: "#e4e4e7" }}>add dark mode toggle to App.tsx</span>
                              <span title="Voice input" className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="22" x2="12" y2="17"/></svg>
                              </span>
                            </div>
                          </div>
                          <div className="px-3">
                            <div className="rounded px-2.5 py-1.5 text-[9px] leading-4" style={{ background: "rgba(168,85,247,0.05)", borderLeft: "2px solid #a855f6" }}>
                              <div style={{ color: "#d4d4d8" }}><span style={{ color: "#4ade80" }}>✓</span> Read App.tsx</div>
                              <div style={{ color: "#d4d4d8" }}><span style={{ color: "#4ade80" }}>✓</span> Added <span style={{ color: "#fbbf24" }}>useDarkMode</span> hook</div>
                              <div style={{ color: "#d4d4d8" }}><span style={{ color: "#fbbf24" }}>⟳</span> Writing toggle component...</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-3 py-0.5 text-[10px] text-white" style={{ background: "#1d4ed8" }}>
                      <div className="flex items-center gap-3"><span>main</span><span>0 errors</span></div>
                      <div className="flex items-center gap-3"><span>TypeScript</span><span>UTF-8</span></div>
                    </div>
                  </div>
                )}

                {active === 3 && (
                  <div className="flex" style={{ height: 320 }}>
                    {/* Port panel */}
                    <div className="flex-1 p-5" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-xs font-semibold mb-4" style={{ color: "#e4e4e7" }}>Forwarded Ports</div>
                      <div className="space-y-2">
                        {[
                          { port: 3000, label: "React Dev Server", status: "forwarded", url: "abc123.trycloudflare.com" },
                          { port: 5432, label: "PostgreSQL", status: "detected", url: null },
                          { port: 8080, label: "REST API", status: "forwarded", url: "xyz789.trycloudflare.com" },
                        ].map((p) => (
                          <div key={p.port} className="rounded-lg p-3 transition-all" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${p.status === "forwarded" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)"}` }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-2 h-2 rounded-full" style={{ background: p.status === "forwarded" ? "#4ade80" : "#fbbf24" }} />
                              <span className="text-xs font-mono font-semibold" style={{ color: "#e4e4e7" }}>:{p.port}</span>
                              <span className="text-[10px]" style={{ color: "#52525b" }}>{p.label}</span>
                              <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ background: p.status === "forwarded" ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.1)", color: p.status === "forwarded" ? "#4ade80" : "#fbbf24" }}>{p.status}</span>
                            </div>
                            {p.url && <div className="text-[10px] font-mono ml-4" style={{ color: "#71717a" }}>{p.url}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Browser preview */}
                    <div className="w-2/5 hidden sm:flex flex-col">
                      <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#0c0c0f", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <Globe size={11} style={{ color: "#4ade80" }} />
                        <div className="flex-1 text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#71717a" }}>abc123.trycloudflare.com</div>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center p-4" style={{ background: "#fafafa" }}>
                        <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
                          <Code2 size={16} className="text-white" />
                        </div>
                        <div className="text-sm font-bold mb-1" style={{ color: "#09090b" }}>My App</div>
                        <div className="text-[10px]" style={{ color: "#71717a" }}>Count: 42</div>
                        <div className="mt-2 px-4 py-1.5 rounded-lg text-[10px] font-medium text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>Click me</div>
                      </div>
                    </div>
                  </div>
                )}

                {active === 4 && (
                  <div className="flex items-center justify-center gap-10 px-6 sm:px-10" style={{ height: 380 }}>
                    {/* Phone — Editor view */}
                    <div className="relative shrink-0">
                      {/* Phone glow */}
                      <div className="absolute -inset-4 rounded-[40px] opacity-20 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, #fbbf24 0%, transparent 70%)" }} />
                      <div className="relative w-52 h-[350px] rounded-[32px] overflow-hidden flex flex-col" style={{ border: "3px solid rgba(255,255,255,0.15)", background: "#09090b", boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                        {/* Dynamic Island */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full flex items-center justify-center" style={{ background: "#000" }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: "#1a1a2e" }} />
                        </div>
                        {/* Status bar */}
                        <div className="flex items-center justify-between px-5 pt-2 pb-0.5 text-[9px] font-medium" style={{ color: "#a1a1aa" }}>
                          <span>9:41</span>
                          <div className="flex items-center gap-1">
                            <svg width="12" height="9" viewBox="0 0 16 12" fill="currentColor"><rect x="0" y="5" width="3" height="7" rx="0.5"/><rect x="4.5" y="3" width="3" height="9" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13.5" y="0" width="2.5" height="12" rx="0.5" opacity="0.3"/></svg>
                            <svg width="14" height="10" viewBox="0 0 24 16" fill="currentColor"><path d="M2 7c3.5-3.5 6-5 10-5s6.5 1.5 10 5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M6 11c2-2 3.5-3 6-3s4 1 6 3" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="14" r="1.5"/></svg>
                            <svg width="18" height="10" viewBox="0 0 28 14" fill="currentColor"><rect x="0" y="1" width="22" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="3" width="16" height="8" rx="1.5" fill="#4ade80"/><rect x="23" y="4.5" width="3" height="5" rx="1" /></svg>
                          </div>
                        </div>
                        {/* App nav */}
                        <div className="flex items-center gap-2 px-3 py-2 mt-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
                            <Code2 size={10} className="text-white" />
                          </div>
                          <span className="text-[10px] font-semibold" style={{ color: "#e4e4e7" }}>my-app</span>
                          <div className="ml-auto flex gap-1.5">
                            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                              <Terminal size={10} style={{ color: "#71717a" }} />
                            </div>
                            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                              <GitBranch size={10} style={{ color: "#71717a" }} />
                            </div>
                          </div>
                        </div>
                        {/* File explorer */}
                        <div className="flex-1 overflow-hidden">
                          <div className="px-3 py-1.5 text-[8px] font-semibold uppercase" style={{ color: "#52525b" }}>Explorer</div>
                          <div className="px-2 space-y-px text-[10px] font-mono">
                            {[
                              { name: "src/", c: "#60a5fa", indent: 0, icon: "📁" },
                              { name: "App.tsx", c: "#4ade80", indent: 1, icon: "⚛", active: true },
                              { name: "index.ts", c: "#a1a1aa", indent: 1, icon: "📄" },
                              { name: "hooks.ts", c: "#a1a1aa", indent: 1, icon: "📄" },
                              { name: "api.ts", c: "#a1a1aa", indent: 1, icon: "📄" },
                              { name: "public/", c: "#60a5fa", indent: 0, icon: "📁" },
                              { name: "package.json", c: "#fbbf24", indent: 0, icon: "📦" },
                              { name: ".env", c: "#71717a", indent: 0, icon: "🔒" },
                            ].map((f, i) => (
                              <div key={i} className="flex items-center gap-1.5 px-2 py-[3px] rounded-md" style={{ paddingLeft: 8 + f.indent * 10, color: f.c, background: f.active ? "rgba(59,130,246,0.1)" : "transparent" }}>
                                <span style={{ fontSize: 8 }}>{f.icon}</span> {f.name}
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Terminal */}
                        <div className="px-3 py-2 font-mono text-[9px]" style={{ background: "#0c0c0f", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <div><span style={{ color: "#4ade80" }}>$</span> <span style={{ color: "#a1a1aa" }}>npm run dev</span></div>
                          <div style={{ color: "#71717a" }}>ready on <span style={{ color: "#60a5fa" }}>:3000</span></div>
                          <div className="flex items-center"><span style={{ color: "#4ade80" }}>$</span> <span className="ml-1 w-1.5 h-3 animate-pulse" style={{ background: "#4ade80" }} /></div>
                        </div>
                        {/* Home indicator */}
                        <div className="flex justify-center py-2">
                          <div className="w-12 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
                        </div>
                      </div>
                    </div>

                    {/* Right side — feature cards */}
                    <div className="hidden sm:flex flex-col gap-3 max-w-[240px]">
                      {[
                        { icon: Smartphone, title: "Progressive Web App", desc: "Install from browser for a native app experience with home screen icon.", color: "#fbbf24" },
                        { icon: Globe, title: "Works Everywhere", desc: "Any phone, tablet or device with a modern browser. No app store needed.", color: "#60a5fa" },
                        { icon: Terminal, title: "Full Terminal", desc: "Run commands on your remote machine right from your phone.", color: "#4ade80" },
                        { icon: Zap, title: "Instant Sync", desc: "Real-time file sync and low-latency WebSocket connection.", color: "#c084fc" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 px-3.5 py-2.5 rounded-xl transition-all" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                            <item.icon size={13} style={{ color: item.color }} />
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold" style={{ color: "#e4e4e7" }}>{item.title}</div>
                            <div className="text-[10px] leading-relaxed mt-0.5" style={{ color: "#52525b" }}>{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step description below card */}
          <div className="flex items-center gap-3 mt-6">
            <span className="text-lg font-mono font-bold" style={{ color: step.color }}>{step.num}</span>
            <div>
              <div className="text-sm font-semibold" style={{ color: "#e4e4e7" }}>{step.title}</div>
              <p className="text-xs" style={{ color: "#71717a" }}>{step.desc}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1 mt-4">
            {guideSteps.map((s, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="flex-1 h-1 rounded-full transition-all duration-500 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: active === i ? "100%" : active > i ? "100%" : "0%",
                    background: active >= i ? s.color : "transparent",
                    opacity: active === i ? 1 : 0.3,
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes guideSlideUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </section>
  );
}

const PKG_CMDS = {
  npm:  { prefix: "npm i -g",        pkg: "opencode-remote@latest" },
  pnpm: { prefix: "pnpm add -g",     pkg: "opencode-remote@latest" },
  yarn: { prefix: "yarn global add", pkg: "opencode-remote" },
} as const;

export default function LandingPage() {
  const [machineId, setMid] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpSession, setOtpSession] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pkgTab, setPkgTab] = useState<keyof typeof PKG_CMDS>("npm");
  const [osTab, setOsTab] = useState("Linux");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const router = useRouter();

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBtn(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    // Hide if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallBtn(false);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
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

      const data = await res.json();

      // Check if 2FA is required
      if (data.requireOtp) {
        setOtpRequired(true);
        setOtpSession(data.otpSession);
        setOtpCode("");
        return;
      }

      setToken(data.token);
      setMachineId(rawMid);
      addRecent(rawMid);
      router.push(`/editor/${rawMid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawMid = machineId.replace(/-/g, "");
    setError("");

    if (!otpCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineId: rawMid, otpSession, code: otpCode.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Verification failed");
      }

      const data = await res.json();
      setToken(data.token);
      setMachineId(rawMid);
      addRecent(rawMid);
      setOtpRequired(false);
      router.push(`/editor/${rawMid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Starfield
  useEffect(() => {
    const canvas = document.getElementById("starfield") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = document.body.scrollHeight || window.innerHeight * 3;
    };
    resize();

    // Generate stars
    const stars: { x: number; y: number; r: number; o: number; speed: number }[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.3,
        o: Math.random() * 0.6 + 0.2,
        speed: Math.random() * 0.005 + 0.002,
      });
    }

    let frame: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now();
      for (const s of stars) {
        const flicker = Math.sin(t * s.speed) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.o * flicker})`;
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="relative h-full overflow-y-auto" style={{ background: "radial-gradient(ellipse at 50% 0%, #0f1118 0%, #0a0b10 40%, #07080c 100%)", color: "#fafafa", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {/* Starfield canvas */}
      <canvas id="starfield" className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />
      {/* Content */}
      <div className="relative" style={{ zIndex: 1 }}>
      {/* ===== Nav ===== */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: "rgba(10,11,16,0.8)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
              <Code2 size={16} className="text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">VS Code Remote</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm hidden sm:block" style={{ color: "#a1a1aa" }}>Features</a>
            <a href="#connect" className="text-sm hidden sm:block" style={{ color: "#a1a1aa" }}>Connect</a>
            <a
              href="/dashboard"
              className="text-sm px-4 py-1.5 rounded-lg border"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "#a1a1aa" }}
            >
              Dashboard
            </a>
          </div>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-[-200px] left-1/4 w-[600px] h-[500px] opacity-15 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, #3b82f6 0%, transparent 70%)" }} />
        <div className="absolute top-[-100px] right-[10%] w-[400px] h-[400px] opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, #8b5cf6 0%, transparent 70%)" }} />

        <div className="relative max-w-6xl mx-auto px-6 py-16 sm:py-20">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: content + form */}
            <div className="flex-1 lg:max-w-[480px]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" }}>
                <Zap size={12} />
                Secure remote development from anywhere
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
                Vibecode{" "}
                <span style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  everywhere
                </span>
              </h1>

              <p className="text-sm sm:text-base mb-8" style={{ color: "#a1a1aa", lineHeight: 1.7 }}>
                Connect to your remote machine with a 9-digit code. Full VS Code experience with terminal, file explorer, git, and port forwarding.
              </p>

              {/* Connect Form */}
              <div id="connect">
                {!otpRequired ? (
                  <form onSubmit={handleConnect} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={machineId}
                        onChange={(e) => setMid(formatMachineId(e.target.value))}
                        placeholder="000-000-000"
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none font-mono tracking-widest text-center sm:text-left"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fafafa" }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(59,130,246,0.5)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                      />
                      <div className="relative flex-1">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full px-4 py-2.5 pr-11 rounded-xl text-sm outline-none"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fafafa" }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(59,130,246,0.5)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity"
                          style={{ color: "#a1a1aa", opacity: 0.9 }}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                      style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          Connect
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleOtpVerify} className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield size={16} style={{ color: "#a78bfa" }} />
                      <span className="text-sm font-medium" style={{ color: "#e4e4e7" }}>Two-Factor Authentication</span>
                    </div>
                    <p className="text-xs mb-2" style={{ color: "#a1a1aa" }}>
                      Enter the 6-digit code from your authenticator app, or a backup code.
                    </p>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9a-fA-F-]/g, "").slice(0, 9))}
                      placeholder="000000"
                      className="w-full px-4 py-3 rounded-xl text-lg outline-none font-mono tracking-[0.3em] text-center"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.3)", color: "#fafafa" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(167,139,250,0.6)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(167,139,250,0.3)")}
                      autoFocus
                      autoComplete="one-time-code"
                      inputMode="numeric"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setOtpRequired(false); setOtpCode(""); setError(""); }}
                      className="w-full py-2 rounded-xl text-xs transition-colors"
                      style={{ color: "#a1a1aa" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#e4e4e7")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#a1a1aa")}
                    >
                      Back to login
                    </button>
                  </form>
                )}
                {error && (
                  <p className="text-xs mt-3" style={{ color: "#f87171" }}>{error}</p>
                )}
              </div>
            </div>

            {/* Right: Code mockup — split editor + browser preview */}
            <div className="flex-1 w-full lg:max-w-[580px]">
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}>
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#18181b" }}>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f87171" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#facc15" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4ade80" }} />
                  </div>
                  <span className="flex-1 text-center text-[11px]" style={{ color: "#52525b" }}>VS Code Remote — remote-dev.local</span>
                </div>
                {/* Main area: editor + preview split */}
                <div className="flex" style={{ background: "#09090b", height: 260 }}>
                  {/* Activity bar */}
                  <div className="w-8 shrink-0 hidden sm:flex flex-col items-center gap-3 pt-3" style={{ background: "#0c0c0f", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></svg>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </div>
                  {/* File sidebar */}
                  <div className="w-28 shrink-0 border-r py-2 hidden sm:block" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0c0c0f" }}>
                    <div className="px-2 mb-1 text-[8px] font-semibold uppercase tracking-wider" style={{ color: "#52525b" }}>Explorer</div>
                    {[
                      { name: "src/", indent: false, color: "#60a5fa" },
                      { name: "App.tsx", indent: true, color: "#4ade80", active: true },
                      { name: "api.ts", indent: true, color: "#a1a1aa" },
                      { name: "styles.css", indent: true, color: "#a1a1aa" },
                      { name: "public/", indent: false, color: "#60a5fa" },
                      { name: "package.json", indent: false, color: "#fbbf24" },
                    ].map((f, i) => (
                      <div key={i} className="px-2.5 py-px text-[10px] font-mono" style={{ color: f.color, paddingLeft: f.indent ? 20 : 10, background: f.active ? "rgba(59,130,246,0.1)" : "transparent", borderLeft: f.active ? "2px solid #3b82f6" : "2px solid transparent" }}>
                        {f.name}
                      </div>
                    ))}
                  </div>
                  {/* Split: code + browser preview */}
                  <div className="flex-1 flex min-w-0">
                    {/* Code editor pane */}
                    <div className="flex-1 flex flex-col min-w-0 border-r" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      {/* Tab bar */}
                      <div className="flex items-center" style={{ background: "#0c0c0f", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="px-3 py-1 text-[10px] font-mono" style={{ color: "#e4e4e7", background: "#09090b", borderBottom: "1px solid #3b82f6" }}>App.tsx</div>
                        <div className="px-3 py-1 text-[10px] font-mono" style={{ color: "#52525b" }}>api.ts</div>
                      </div>
                      {/* Code with line numbers */}
                      <div className="flex-1 flex overflow-hidden">
                        <div className="pt-2 pb-2 pl-1.5 pr-1 text-right font-mono text-[10px] leading-[18px] select-none" style={{ color: "#3f3f46" }}>
                          {Array.from({ length: 9 }, (_, i) => (<div key={i}>{i + 1}</div>))}
                        </div>
                        <div className="flex-1 pt-2 pl-2 font-mono text-[10px] leading-[18px] overflow-hidden" style={{ color: "#a1a1aa" }}>
                          <div><span style={{ color: "#c084fc" }}>export default</span> <span style={{ color: "#c084fc" }}>function</span> <span style={{ color: "#fbbf24" }}>App</span>() {"{"}</div>
                          <div>  <span style={{ color: "#c084fc" }}>return</span> (</div>
                          <div>    &lt;<span style={{ color: "#60a5fa" }}>div</span> <span style={{ color: "#86efac" }}>className</span>=<span style={{ color: "#86efac" }}>&quot;app&quot;</span>&gt;</div>
                          <div>      &lt;<span style={{ color: "#60a5fa" }}>h1</span>&gt;<span style={{ color: "#e4e4e7" }}>Welcome</span>&lt;/<span style={{ color: "#60a5fa" }}>h1</span>&gt;</div>
                          <div>      &lt;<span style={{ color: "#60a5fa" }}>p</span>&gt;<span style={{ color: "#e4e4e7" }}>Your app is</span></div>
                          <div>        <span style={{ color: "#e4e4e7" }}>running!</span>&lt;/<span style={{ color: "#60a5fa" }}>p</span>&gt;</div>
                          <div>    &lt;/<span style={{ color: "#60a5fa" }}>div</span>&gt;</div>
                          <div>  )</div>
                          <div>{"}"}</div>
                        </div>
                      </div>
                    </div>
                    {/* Browser preview pane */}
                    <div className="hidden sm:flex flex-col" style={{ width: "45%", background: "#111114" }}>
                      {/* Preview header */}
                      <div className="flex items-center gap-1.5 px-2 py-1" style={{ background: "#0c0c0f", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <Globe size={8} style={{ color: "#4ade80" }} />
                        <div className="flex-1 px-1.5 py-0.5 rounded text-[8px] font-mono truncate" style={{ background: "rgba(255,255,255,0.05)", color: "#71717a" }}>
                          localhost:3000
                        </div>
                      </div>
                      {/* Browser content */}
                      <div className="flex-1 flex flex-col items-center justify-center p-4" style={{ background: "#fafafa" }}>
                        <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
                          <Code2 size={14} className="text-white" />
                        </div>
                        <div className="text-sm font-bold" style={{ color: "#09090b" }}>Welcome</div>
                        <div className="text-[10px] mt-1" style={{ color: "#71717a" }}>Your app is running!</div>
                        <div className="mt-3 px-3 py-1 rounded-md text-[10px] font-medium text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
                          Get Started
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Terminal + Status bar */}
                <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="px-3 py-1.5 font-mono text-[10px]" style={{ background: "#0c0c0f" }}>
                    <div style={{ color: "#4ade80" }}>$ npm run dev</div>
                    <div style={{ color: "#a1a1aa" }}>
                      Ready on <span style={{ color: "#60a5fa" }}>http://localhost:3000</span>
                    </div>
                    <div className="flex items-center gap-1" style={{ color: "#4ade80" }}>$ <span className="w-1.5 h-3 inline-block animate-pulse" style={{ background: "#4ade80" }} /></div>
                  </div>
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-3 py-0.5 text-[9px]" style={{ background: "#1d4ed8" }}>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                        main
                      </span>
                      <span>0 errors</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Port 3000 → forwarded</span>
                      <span>UTF-8</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Quick Start ===== */}
      <section className="relative border-t overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-[0.07] pointer-events-none" style={{ background: "radial-gradient(ellipse at center, #3b82f6 0%, transparent 70%)" }} />

        <div className="relative max-w-6xl mx-auto px-6 py-14 sm:py-20">
          <div className="flex items-start gap-2 mb-8">
            <span className="text-lg" style={{ color: "#3b82f6" }}>&#x203A;</span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Quick Start</h2>
          </div>

          <div className="max-w-3xl mx-auto">
            {/* Terminal card */}
            <div className="rounded-2xl overflow-hidden quickstart-card" style={{ border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 60px rgba(0,0,0,0.4), 0 0 40px rgba(59,130,246,0.03)" }}>
              {/* Header with tabs and platform */}
              <div className="flex items-center justify-between px-4 py-2" style={{ background: "#131316", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f87171" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#facc15" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4ade80" }} />
                  </div>
                  <div className="flex gap-1 ml-2">
                    {(["npm", "pnpm", "yarn"] as const).map((tab) => (
                      <button key={tab} onClick={() => setPkgTab(tab)} className="text-[11px] px-3 py-1 rounded-lg transition-colors" style={{ background: tab === pkgTab ? "rgba(59,130,246,0.15)" : "transparent", color: tab === pkgTab ? "#60a5fa" : "#52525b", border: tab === pkgTab ? "1px solid rgba(59,130,246,0.25)" : "1px solid transparent" }}>
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  {["macOS", "Linux", "Windows"].map((os) => (
                    <button key={os} onClick={() => setOsTab(os)} className="text-[10px] px-2.5 py-0.5 rounded-md transition-colors" style={{ background: os === osTab ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", color: os === osTab ? "#d4d4d8" : "#52525b", border: os === osTab ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)" }}>
                      {os}
                    </button>
                  ))}
                </div>
              </div>

              {/* Terminal body */}
              <div className="relative px-5 py-5 font-mono text-[13px] leading-8" style={{ background: "#09090b" }}>
                {/* Step 1: Install */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>1</span>
                  <span style={{ color: "#52525b", fontStyle: "italic" }}># Install globally</span>
                </div>
                <div className="flex items-center gap-2 group/cmd pl-8">
                  <span style={{ color: "#4ade80" }}>$</span>
                  <span className="font-semibold" style={{ color: "#e4e4e7" }}>{PKG_CMDS[pkgTab].prefix}</span>
                  <span style={{ color: "#60a5fa" }}>{PKG_CMDS[pkgTab].pkg}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${PKG_CMDS[pkgTab].prefix} ${PKG_CMDS[pkgTab].pkg}`)}
                    className="ml-auto p-1.5 rounded-lg opacity-0 group-hover/cmd:opacity-100 transition-all hover:scale-110"
                    style={{ color: "#52525b", background: "rgba(255,255,255,0.05)" }}
                    title="Copy"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                </div>

                {/* Divider */}
                <div className="my-3 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }} />

                {/* Step 2: Start */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold" style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}>2</span>
                  <span style={{ color: "#52525b", fontStyle: "italic" }}># Start the agent</span>
                </div>
                <div className="flex items-center gap-2 group/cmd2 pl-8">
                  <span style={{ color: "#4ade80" }}>$</span>
                  <span className="font-semibold" style={{ color: "#e4e4e7" }}>opencode start</span>
                  <button
                    onClick={() => navigator.clipboard.writeText("opencode start")}
                    className="ml-auto p-1.5 rounded-lg opacity-0 group-hover/cmd2:opacity-100 transition-all hover:scale-110"
                    style={{ color: "#52525b", background: "rgba(255,255,255,0.05)" }}
                    title="Copy"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                </div>

                {/* Divider */}
                <div className="my-3 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }} />

                {/* Output */}
                <div className="pl-8 space-y-1">
                  <div className="flex items-center gap-3">
                    <span style={{ color: "#52525b" }}>Machine ID</span>
                    <span style={{ color: "#3f3f46" }}>:</span>
                    <span className="font-semibold tracking-wider" style={{ color: "#60a5fa" }}>940-195-819</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ color: "#52525b" }}>Password&nbsp;&nbsp;</span>
                    <span style={{ color: "#3f3f46" }}>:</span>
                    <span className="font-semibold" style={{ color: "#fbbf24" }}>aB3xK9mQ</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ color: "#52525b" }}>Admin UI&nbsp;&nbsp;</span>
                    <span style={{ color: "#3f3f46" }}>:</span>
                    <span style={{ color: "#a1a1aa" }}>http://localhost:9000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform note */}
            <p className="text-center text-xs mt-5 flex items-center justify-center gap-2" style={{ color: "#52525b" }}>
              <span className="inline-block w-1 h-1 rounded-full" style={{ background: "#4ade80" }} />
              Works on macOS, Windows &amp; Linux. The one-liner installs Node.js and everything else for you.
            </p>
          </div>
        </div>
      </section>

      {/* ===== How to Use — Horizontal Slider ===== */}
      <GuideSection />

      {/* ===== Features ===== */}
      <section id="features" className="relative border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              Everything you need to code remotely
            </h2>
            <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: "#71717a" }}>
              A complete remote development environment with the tools you already know and love.
            </p>
          </div>

          <style>{`
            .feature-card {
              position: relative;
              border-radius: 1rem;
              padding: 2rem;
              border: 1px solid rgba(255,255,255,0.06);
              background: rgba(255,255,255,0.02);
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              overflow: hidden;
            }
            .feature-card::before {
              content: '';
              position: absolute;
              inset: 0;
              border-radius: 1rem;
              opacity: 0;
              transition: opacity 0.4s ease;
              background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(59,130,246,0.06), transparent 40%);
              pointer-events: none;
            }
            .feature-card:hover {
              border-color: rgba(59,130,246,0.3);
              background: rgba(59,130,246,0.04);
              transform: translateY(-4px);
              box-shadow: 0 8px 32px rgba(59,130,246,0.08), 0 0 0 1px rgba(59,130,246,0.1);
            }
            .feature-card:hover::before {
              opacity: 1;
            }
            .feature-card:hover .feature-icon {
              transform: scale(1.1);
              box-shadow: 0 0 20px rgba(59,130,246,0.3);
            }
            .feature-card:hover .feature-title {
              color: #e4e4e7;
            }
            .feature-card:hover .feature-desc {
              color: #a1a1aa;
            }
            .feature-icon {
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
          `}</style>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="feature-card"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
                }}
              >
                <div className="feature-icon w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <feature.icon size={22} style={{ color: "#60a5fa" }} />
                </div>
                <h3 className="feature-title text-[15px] font-semibold mb-2 transition-colors duration-300" style={{ color: "#d4d4d8" }}>{feature.title}</h3>
                <p className="feature-desc text-sm leading-relaxed transition-colors duration-300" style={{ color: "#71717a" }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              Get started in seconds
            </h2>
            <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: "#71717a" }}>
              Three simple steps to access your remote workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: "01", icon: Monitor, title: "Run the agent", desc: "Start the agent on your remote machine to get a 9-digit Machine ID." },
              { step: "02", icon: Globe, title: "Open browser", desc: "Visit this page from any device and enter your Machine ID and password." },
              { step: "03", icon: Code2, title: "Start coding", desc: "Get a full VS Code experience with terminal, files, git and more." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-xs font-mono font-bold mb-4" style={{ color: "#3b82f6" }}>{item.step}</div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <item.icon size={22} style={{ color: "#a1a1aa" }} />
                </div>
                <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#71717a" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
              <Code2 size={12} className="text-white" />
            </div>
            <span className="text-xs font-medium" style={{ color: "#52525b" }}>VS Code Remote</span>
          </div>
          <p className="text-xs" style={{ color: "#3f3f46" }}>
            Secure remote development environment
          </p>
        </div>
      </footer>
      </div>{/* end content wrapper */}

      {/* PWA Install floating button */}
      {showInstallBtn && !installDismissed && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <button
            onClick={async () => {
              if (!installPrompt) return;
              await installPrompt.prompt();
              const { outcome } = await installPrompt.userChoice;
              if (outcome === "accepted") {
                setShowInstallBtn(false);
              }
              setInstallPrompt(null);
            }}
            className="flex items-center gap-2.5 px-5 py-3 rounded-full text-white text-sm font-medium shadow-lg shadow-blue-500/25 transition-transform hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            <Download size={18} />
            Install App
          </button>
          <button
            onClick={() => setInstallDismissed(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 backdrop-blur text-white/60 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
