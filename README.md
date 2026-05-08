<p align="center">
  <img src="https://img.shields.io/badge/Open-Code-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white" alt="OpenCode" />
</p>

<h1 align="center">OpenCode Remote</h1>

<p align="center">
  <strong>Access your dev environment from anywhere.</strong><br/>
  Full VS Code experience in the browser — terminal, file explorer, git, port forwarding & more.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@hanoilab/opencode">npm</a> &bull;
  <a href="https://vscode-remote.onrender.com">Live Demo</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#self-hosting">Self-Hosting</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@hanoilab/opencode"><img src="https://img.shields.io/npm/v/@hanoilab/opencode?style=flat-square&color=cb3837&label=npm" alt="npm" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-339933?style=flat-square&logo=node.js&logoColor=white" alt="node" />
  <img src="https://img.shields.io/badge/next.js-16-000000?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/PWA-ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="license" />
</p>

---

## What is this?

OpenCode Remote lets you code on any machine from any device. Install the **agent** on your dev machine, connect through the **relay server** from a browser or PWA — even from your phone.

No port forwarding. No VPN. Just a 9-digit Machine ID and a password.

```
Phone / Tablet / Laptop            Relay Server (VPS)               Your Dev Machine
┌──────────────────┐           ┌────────────────────┐           ┌──────────────────┐
│  Browser / PWA   │ ◄─HTTPS─► │  Next.js UI        │ ◄──WSS──► │  Agent           │
│  Monaco + xterm  │           │  WebSocket Hub     │           │  node-pty + fs   │
└──────────────────┘           └────────────────────┘           └──────────────────┘
                                        ▲
                               Agent connects outbound
                              (no port opening needed)
```

## Quick Start

### 1. Install the agent

```bash
npm i -g @hanoilab/opencode
```

### 2. Run it

```bash
opencode start
```

```
Starting agent...
Agent started (PID: 12345)
  Machine ID : 321-529-789
  Password   : *** (saved at first run)
  Admin UI   : http://localhost:9000
```

### 3. Connect from anywhere

Open **[vscode-remote.onrender.com](https://vscode-remote.onrender.com)**, enter the Machine ID and password, and start coding.

## Features

### Code Editor
- Monaco Editor with syntax highlighting for 40+ languages
- Multi-tab editing with unsaved indicators
- Ctrl+Click on import paths to navigate between files
- Minimap, bracket matching, word wrap

### Integrated Terminal
- Full PTY via xterm.js + node-pty — run anything
- Multiple sessions with tab management
- Bottom or right panel position, maximize, resize
- Mobile toolbar with D-pad arrows, Ctrl shortcuts, text input
- Voice input — dictate commands using speech recognition

### File Explorer
- Tree view with lazy-loaded directories
- Context menu: New File, New Folder, Rename, Delete
- Git status indicators (M/A/D/U badges)
- Real-time sync via chokidar file watcher

### Source Control
- Stage / Unstage / Discard per file or all at once
- Inline diff viewer (staged vs unstaged)
- Commit, push, pull from the sidebar

### Port Forwarding
- Auto-detect listening ports on the remote machine
- HTTP-over-WebSocket tunneling for remote service access
- In-editor preview via split iframe panel

### Workspace Management
- Open Folder picker — browse remote directories
- Start with empty window, just like VS Code

### Security
- JWT authentication with 24h session expiry
- Bcrypt password hashing (random + fixed passwords)
- **TOTP 2FA** — optional two-factor auth with QR code + backup codes
- Path traversal prevention (sandboxed to workspace root)
- Rate limiting on login attempts
- Relay secret for agent registration

### Mobile & PWA
- Installable as PWA on Chrome, Edge, Safari, mobile
- Standalone display with dark theme
- Responsive layout optimized for tablets and phones

## CLI

```bash
opencode start             # Start agent in background
opencode stop              # Stop agent
opencode restart           # Restart the agent
opencode status            # Show agent status
opencode id                # Show Machine ID
opencode password          # Show or reset password
opencode config            # Open Admin UI in browser
opencode logs              # Show last 50 log lines
opencode logs -f           # Follow log output
opencode run               # Run in foreground (debug)
opencode install           # Register as system service (auto-start)
opencode uninstall         # Remove system service
opencode upgrade           # Upgrade to latest version
opencode upgrade 0.4.0     # Upgrade to specific version
opencode purge --yes       # Completely remove agent from machine
opencode help              # Show help
```

## Architecture

Monorepo with 3 packages:

```
vscode-remote/
├── shared/          # TypeScript types & WebSocket protocol
├── agent/           # Node.js agent (runs on your dev machine)
│   ├── handlers/        # Message handlers (fs, terminal, git, port, auth)
│   ├── services/        # Core services (pty, file system, TOTP, watcher)
│   ├── relay/           # Outbound WebSocket client to relay
│   └── ui/              # Agent dashboard (static HTML)
└── relay/           # Next.js relay server (deployed on VPS)
    ├── app/             # Pages (landing, editor, dashboard)
    ├── components/      # Monaco, xterm, file explorer, git UI
    └── server/          # WebSocket hub, agent routing, port proxy
```

### WebSocket Protocol

Typed JSON messages with request/response correlation:

```typescript
// Request
{ id: "uuid", type: "fs:read", payload: { path: "src/index.ts" } }

// Response
{ id: "uuid", type: "fs:read", success: true, payload: { content: "..." } }
```

Message types: `auth:*`, `fs:*`, `terminal:*`, `git:*`, `port:*`, `workspace:*`

## Self-Hosting

```bash
git clone https://github.com/nguyendinhphongdx/vscode-remote.git
cd vscode-remote
pnpm install

# Set environment
echo "RELAY_SECRET=your-secret-here" > .env

# Build & run relay
pnpm build
pnpm start
```

Point agents to your relay:

```bash
RELAY_URL=wss://your-server.com/api/agent-ws opencode start
```

### Environment Variables

**Agent**

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9000` | Local dashboard port |
| `WORKSPACE_ROOT` | _(none)_ | Default workspace folder |
| `VSR_DATA_DIR` | `~/.opencode` | Config & data directory |

**Relay**

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9001` | Server port |
| `RELAY_SECRET` | `dev-secret` | Shared secret for agent auth |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current file |
| `` Ctrl+` `` | Toggle terminal |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Shift+G` | Toggle Source Control |
| `Ctrl+Enter` | Commit (in Source Control) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Editor | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |
| Terminal | [xterm.js](https://xtermjs.org/) + [node-pty](https://github.com/microsoft/node-pty) |
| Frontend | [Next.js 16](https://nextjs.org/) + [Tailwind CSS](https://tailwindcss.com/) + [Zustand](https://zustand.docs.pmnd.rs/) |
| Agent | [Express](https://expressjs.com/) + [ws](https://github.com/websockets/ws) |
| Auth | [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js) + [otpauth](https://github.com/nicolo-ribaudo/otpauth) |
| File Watch | [chokidar](https://github.com/paulmillr/chokidar) |
| Build | [tsup](https://tsup.egoist.dev/) + [Turbopack](https://turbo.build/pack) |

## License

MIT &copy; [HanoiLab](mailto:opencode@hanoilab.vn)
