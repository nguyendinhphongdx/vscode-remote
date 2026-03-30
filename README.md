# VS Code Remote — Vibecode Everywhere

**Full VS Code experience from any browser. On desktop, tablet, or mobile. Even as a native PWA app on your iPhone home screen.**

Born from the need for true VS Code on mobile (where Claude Code dispatch was almost perfect, but lacked real terminal access and browser preview), this project brings the power of AnyDesk and TeamViewer to development.

Code anywhere. Use Claude CLI with voice from your device's terminal. Deploy with Cloudflare Tunnel in minutes.

![Landing](https://img.shields.io/badge/status-beta-blue) ![Node](https://img.shields.io/badge/node-%3E%3D20-green) ![License](https://img.shields.io/badge/license-MIT-blue)

```
Browser (anywhere)             Relay Server (VPS)              Agent (your machine)
┌──────────────┐    HTTPS     ┌──────────────────┐    WS      ┌──────────────┐
│  React SPA   │ ◄──────────► │  Next.js + WS    │ ◄────────► │  Express     │
│  Monaco      │              │  Hub (routing)    │            │  node-pty    │
│  xterm.js    │              │  Admin dashboard  │            │  chokidar    │
└──────────────┘              └──────────────────┘            └──────────────┘
                                      ▲
                              Agent connects outbound
                              (no port opening needed)
```

## Features

### Code Editor
- Monaco Editor with syntax highlighting for 40+ languages
- Multi-tab editing with preview/pinned tabs and unsaved indicators
- Ctrl+Click on import paths to navigate between files
- Minimap, word wrap, bracket matching

### File Explorer
- Tree view with lazy-loaded directories
- Context menu: New File, New Folder, Rename, Delete
- Git status indicators on files (M/A/D/U badges, colored filenames)
- Material Icon Theme file icons
- Real-time sync via file watcher (lazy -- only watches when browser is connected)

### Integrated Terminal
- Full PTY emulation via xterm.js + node-pty
- Multiple sessions with tab management
- Split terminal (bottom or right position)
- Resize, maximize, and keyboard toggle (Ctrl+`)

### Source Control
- Branch display with changed file count badge
- Stage / Unstage / Discard per file or all at once
- Inline diff viewer (staged vs unstaged)
- Commit with Ctrl+Enter

### Port Forwarding
- Auto-detect listening ports on the remote machine
- One-click Cloudflare Tunnel for public HTTPS URLs
- In-editor preview via split iframe panel
- Copy URL, open in browser, or stop forwarding

### Workspace Management
- Start with empty window (no folder opened), just like VS Code
- Open Folder picker: browse remote directories, type-ahead filter
- Works on Linux, macOS, and Windows paths

### Security
- JWT authentication (24h session expiry, auto-logout)
- bcrypt password hashing
- Path traversal protection (all paths resolved against workspace root)
- Token verification on WebSocket connections (relay verifies via agent)
- Admin dashboard protected with separate HMAC-signed auth

### Mobile & PWA
- Responsive layout (StatusBar, TitleBar, menus adapt to screen size)
- Installable as PWA on Chrome, Edge, mobile
- Standalone display with dark theme

## Quick Start

### 1. Start the Agent

```bash
cd agent
npm install
npm run dev
```

On first run, the agent generates credentials:

```
╔═══════════════════════════════════════╗
║  Machine ID:  940-195-819            ║
║  Password:    aB3xK9mQ              ║
╚═══════════════════════════════════════╝
```

### 2. Start the Relay

```bash
cd relay
npm install
npm run dev
```

### 3. Connect

Open `http://localhost:9001`, enter the Machine ID and password, and start coding.

## CLI

The agent ships as a CLI tool (`opencode`):

```bash
opencode start       # Start agent in background
opencode stop        # Stop agent
opencode status      # Show status + credentials
opencode password    # Show or reset password
opencode logs        # Tail logs
opencode run         # Run in foreground (dev)
```

## Deployment

### Development (same machine)

```bash
# Terminal 1
cd agent && npm run dev

# Terminal 2
cd relay && npm run dev

# Open http://localhost:9001
```

### Production (relay on VPS)

```bash
# On VPS
cd relay
RELAY_SECRET=your-secret ADMIN_PASSWORD=your-admin-pw npm run build
NODE_ENV=production npm start

# On remote machine
cd agent
# Agent connects outbound to relay -- no port opening needed
npm start
```

### Environment Variables

**Agent**

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9000` | Local HTTP/WS port |
| `WORKSPACE_ROOT` | _none_ | Default workspace (empty = no folder opened) |
| `VSR_DATA_DIR` | `~/.opencode` | Config directory |

**Relay**

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9001` | Server port |
| `RELAY_SECRET` | `dev-secret` | Shared secret for agent registration |
| `ADMIN_PASSWORD` | _empty_ | Admin dashboard password (empty = no auth) |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current file |
| `Ctrl+`` ` | Toggle terminal |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Shift+G` | Toggle Source Control |
| `Ctrl+Click` | Navigate to import path |
| `Ctrl+Enter` | Commit (in Source Control) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Editor | Monaco Editor |
| Terminal | xterm.js + WebGL renderer |
| State | Zustand |
| Icons | Lucide React, Material Icon Theme |
| Agent | Node.js 20+, Express, ws, node-pty |
| File Watch | chokidar (lazy subscriber model) |
| Auth | jsonwebtoken, bcryptjs |
| Tunneling | Cloudflare Tunnel (cloudflared) |
| Build | TypeScript, tsx (dev), tsc (build) |

## License

MIT
