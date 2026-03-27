"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

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

const guideSteps = [
  {
    label: "Step 1",
    title: "Agent Admin Panel",
    desc: "After installing with npm i -g opencode-remote, run opencode start on your machine. The agent will start and display your unique 9-digit Machine ID and a random password. Open http://localhost:9000 in your browser to access the Admin Panel — here you can view your credentials, check relay connection status, configure the relay server URL, browse documentation, and manage your agent settings.",
    img: "/agent.png",
  },
  {
    label: "Step 2",
    title: "Open a Workspace",
    desc: "Head to the relay website and enter your Machine ID and password to connect. Once authenticated, you'll see a workspace picker that lets you navigate your remote file system. Browse through directories, use Tab to enter folders, and press Ctrl+Enter to open a folder as your workspace. The workspace you choose becomes the root of your project in the editor.",
    img: "/workspae.png",
  },
  {
    label: "Step 3",
    title: "Code in Your Browser",
    desc: "Once a workspace is opened, you get a full VS Code-like editing experience right in your browser. The file explorer on the left lets you browse, create, rename, and delete files. The editor supports syntax highlighting for all major languages. Open the integrated terminal with Ctrl+` to run commands directly on your remote machine. Use the source control panel to stage, commit, and diff changes with git — all without leaving the browser.",
    img: "/editor.png",
  },
  {
    label: "Step 4",
    title: "Forward Ports",
    desc: "When you run a dev server or any service on your remote machine, the Ports panel automatically detects all listening ports. Click the play button next to any port to create a Cloudflare Tunnel — this gives you a public HTTPS URL that you can share or open anywhere. You can preview the forwarded service directly inside the editor with a split view, copy the URL to clipboard, or open it in a new browser tab.",
    img: "/forward-port.png",
  },
  {
    label: "Mobile",
    title: "Works on Mobile",
    desc: "The entire editor is fully responsive and optimized for phones and tablets. You can code, browse files, use the terminal, and forward ports from any mobile device. Install it as a PWA (Progressive Web App) from your browser for a native app-like experience with an icon on your home screen, full-screen mode, and offline caching. Perfect for quick edits and monitoring on the go.",
    img: "/mobile.jpg",
    mobile: true,
  },
];

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

function GuideSlider() {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1); // 1 = forward, -1 = back
  const step = guideSteps[active];

  const go = useCallback((index: number) => {
    setDir(index > active ? 1 : -1);
    setActive(index);
  }, [active]);

  const prev = () => go(active > 0 ? active - 1 : guideSteps.length - 1);
  const next = () => go(active < guideSteps.length - 1 ? active + 1 : 0);

  // Auto-play: advance every 5s, pause on hover
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setDir(1);
      setActive((prev) => (prev < guideSteps.length - 1 ? prev + 1 : 0));
    }, 5000);
    return () => clearInterval(timer);
  }, [paused]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="max-w-5xl mx-auto px-6 py-14 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">How to Use</h2>
          <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: "#71717a" }}>
            A step-by-step guide to set up and use your remote workspace.
          </p>
        </div>

        {/* Step tabs */}
        <div className="flex justify-center gap-1.5 sm:gap-2 mb-8 flex-wrap">
          {guideSteps.map((s, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: active === i ? "rgba(59,130,246,0.15)" : "transparent",
                color: active === i ? "#60a5fa" : "#52525b",
                border: `1px solid ${active === i ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {/* Prev / Next arrows */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-6 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#a1a1aa" }}><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-6 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#a1a1aa" }}><path d="m9 18 6-6-6-6"/></svg>
          </button>

          {/* Animated card */}
          <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid rgba(59,130,246,0.15)", background: "rgba(255,255,255,0.02)" }}>
            <div
              key={active}
              className="animate-slideIn"
              style={{ animation: `slideIn${dir > 0 ? "Right" : "Left"} 0.3s ease-out` }}
            >
              {/* Image */}
              <div className="flex justify-center overflow-hidden" style={{ background: "#0c0c0f" }}>
                <img
                  src={step.img}
                  alt={step.title}
                  className={step.mobile ? "h-[560px] w-auto object-contain py-6" : "w-full object-cover"}
                  style={step.mobile ? {} : { maxHeight: 440 }}
                  draggable={false}
                />
              </div>
              {/* Caption */}
              <div className="px-6 py-5 sm:px-8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}>{step.label}</span>
                  <h3 className="text-base font-semibold">{step.title}</h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#71717a" }}>{step.desc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          {guideSteps.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: active === i ? 24 : 6,
                height: 6,
                background: active === i ? "#3b82f6" : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </div>

        {/* Slide animation keyframes */}
        <style>{`
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(40px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-40px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [machineId, setMid] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      router.push(`/editor/${rawMid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#09090b", color: "#fafafa", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {/* ===== Nav ===== */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: "rgba(9,9,11,0.8)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
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
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fafafa" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(59,130,246,0.5)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
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
                {error && (
                  <p className="text-xs mt-3" style={{ color: "#f87171" }}>{error}</p>
                )}
              </div>
            </div>

            {/* Right: Code mockup */}
            <div className="flex-1 w-full lg:max-w-[560px]">
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}>
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#18181b" }}>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f87171" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#facc15" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4ade80" }} />
                  </div>
                  <span className="flex-1 text-center text-[11px]" style={{ color: "#52525b" }}>VS Code Remote — 192.168.1.42</span>
                </div>
                {/* Editor mockup */}
                <div className="flex" style={{ background: "#09090b", height: 240 }}>
                  {/* Sidebar */}
                  <div className="w-40 shrink-0 border-r py-2.5 hidden sm:block" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0c0c0f" }}>
                    <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#52525b" }}>Explorer</div>
                    {["src/", "  index.ts", "  server.ts", "  config.ts", "package.json", "tsconfig.json", ".env"].map((f, i) => (
                      <div key={i} className="px-3 py-px text-[11px] font-mono" style={{ color: f.startsWith("  ") ? "#a1a1aa" : "#60a5fa" }}>
                        {f}
                      </div>
                    ))}
                  </div>
                  {/* Code area */}
                  <div className="flex-1 p-3 font-mono text-[11px] leading-5 overflow-hidden" style={{ color: "#a1a1aa" }}>
                    <div><span style={{ color: "#c084fc" }}>import</span> <span style={{ color: "#fbbf24" }}>express</span> <span style={{ color: "#c084fc" }}>from</span> <span style={{ color: "#86efac" }}>&apos;express&apos;</span></div>
                    <div><span style={{ color: "#c084fc" }}>import</span> {"{"} <span style={{ color: "#fbbf24" }}>createServer</span> {"}"} <span style={{ color: "#c084fc" }}>from</span> <span style={{ color: "#86efac" }}>&apos;http&apos;</span></div>
                    <div style={{ color: "#52525b" }}></div>
                    <div><span style={{ color: "#c084fc" }}>const</span> <span style={{ color: "#60a5fa" }}>app</span> = <span style={{ color: "#fbbf24" }}>express</span>()</div>
                    <div><span style={{ color: "#c084fc" }}>const</span> <span style={{ color: "#60a5fa" }}>server</span> = <span style={{ color: "#fbbf24" }}>createServer</span>(<span style={{ color: "#60a5fa" }}>app</span>)</div>
                    <div style={{ color: "#52525b" }}></div>
                    <div><span style={{ color: "#60a5fa" }}>server</span>.<span style={{ color: "#fbbf24" }}>listen</span>(<span style={{ color: "#f472b6" }}>3000</span>, () =&gt; {"{"}</div>
                    <div>  <span style={{ color: "#60a5fa" }}>console</span>.<span style={{ color: "#fbbf24" }}>log</span>(<span style={{ color: "#86efac" }}>&apos;Server running&apos;</span>)</div>
                    <div>{"}"})</div>
                  </div>
                </div>
                {/* Terminal */}
                <div className="border-t px-3 py-2 font-mono text-[11px]" style={{ background: "#0c0c0f", borderColor: "rgba(255,255,255,0.06)" }}>
                  <div style={{ color: "#4ade80" }}>$ npm run dev</div>
                  <div style={{ color: "#a1a1aa" }}>Server running on http://localhost:3000</div>
                  <div className="flex items-center gap-1" style={{ color: "#4ade80" }}>$ <span className="w-1.5 h-3 inline-block animate-pulse" style={{ background: "#4ade80" }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Quick Start ===== */}
      <section className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-6 py-10 sm:py-14">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Quick Start
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: "#71717a" }}>
              Install the agent on your machine and start coding remotely in seconds.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            {/* Terminal mockup */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px rgba(0,0,0,0.3)" }}>
              {/* Tab bar */}
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#18181b" }}>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f87171" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#facc15" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4ade80" }} />
                </div>
                <div className="flex-1 flex justify-center gap-4">
                  {["npm", "pnpm"].map((tab) => (
                    <span key={tab} className="text-[11px] px-3 py-0.5 rounded-md cursor-default" style={{ background: tab === "npm" ? "rgba(59,130,246,0.15)" : "transparent", color: tab === "npm" ? "#60a5fa" : "#52525b" }}>
                      {tab}
                    </span>
                  ))}
                </div>
              </div>

              {/* Terminal content */}
              <div className="px-5 py-5 font-mono text-[13px] leading-7 space-y-1" style={{ background: "#09090b" }}>
                <div style={{ color: "#52525b" }}># Install the agent</div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "#52525b" }}>$</span>
                  <span style={{ color: "#4ade80" }}>npm i -g opencode-remote</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("npm i -g opencode-remote");
                    }}
                    className="ml-auto p-1 rounded opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                    style={{ color: "#52525b" }}
                    title="Copy"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                </div>
                <div className="pt-2" style={{ color: "#52525b" }}># Start the agent</div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "#52525b" }}>$</span>
                  <span style={{ color: "#4ade80" }}>opencode start</span>
                </div>
                <div className="pt-2" style={{ color: "#a1a1aa" }}>
                  <span style={{ color: "#52525b" }}>  Machine ID :</span> <span style={{ color: "#60a5fa" }}>940-195-819</span>
                </div>
                <div style={{ color: "#a1a1aa" }}>
                  <span style={{ color: "#52525b" }}>  Password   :</span> <span style={{ color: "#fbbf24" }}>aB3xK9mQ</span>
                </div>
                <div style={{ color: "#a1a1aa" }}>
                  <span style={{ color: "#52525b" }}>  Admin UI   :</span> <span style={{ color: "#a1a1aa" }}>http://localhost:9000</span>
                </div>
              </div>
            </div>

            {/* Platform support */}
            <p className="text-center text-xs mt-4" style={{ color: "#52525b" }}>
              Works on macOS, Windows, and Linux. Requires Node.js 20+.
            </p>
          </div>
        </div>
      </section>

      {/* ===== How to Use — Horizontal Slider ===== */}
      <GuideSlider />

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl p-6 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(59,130,246,0.1)" }}>
                  <feature.icon size={20} style={{ color: "#60a5fa" }} />
                </div>
                <h3 className="text-sm font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#71717a" }}>{feature.description}</p>
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
    </div>
  );
}
