# VS Code Remote

Web-based remote development environment with a VS Code-like interface. Access your remote machine's file system, terminal, and Git from any browser or as a PWA on mobile/desktop.

```
Browser (anywhere)          Next.js Server (:9001)          Agent (:9000)
┌──────────────┐    HTTP    ┌──────────────────┐    proxy   ┌──────────────┐
│  React SPA   │ ◄────────► │  /api/agent/*    │ ─────────► │  Express     │
│  Monaco      │    WS      │  /api/ws         │ ─────────► │  WebSocket   │
│  xterm.js    │            │  /port/:port/*   │ ─────────► │  Port Proxy  │
└──────────────┘            └──────────────────┘            └──────────────┘
```

## Quick Start

### 1. Install dependencies

```bash
cd agent && npm install
cd ../client && npm install
```

### 2. Start Agent (on the remote machine)

```bash
cd agent
npm run dev
```

On first run, the agent generates a random password and machine ID, printed in the console:

```
╔══════════════════════════════════════════════╗
║  Machine ID:  123-456-789                    ║
║  Password:    abc123xyz                      ║
╚══════════════════════════════════════════════╝
```

### 3. Start Client

```bash
cd client
npm run dev
```

### 4. Open in browser

Navigate to `http://localhost:9001`, enter the Machine ID and Password from step 2.

---

## Features

### Code Editor

- **Monaco Editor** with syntax highlighting for 40+ languages
- **Multi-tab** editing with unsaved change indicators
- **Preview tabs** (italic) — single-click opens a preview, double-click or editing pins the tab
- **Ctrl+S** to save, **Ctrl+Click** on import paths to navigate
- Language auto-detection from file extension

### File Explorer

- Tree view with expand/collapse directories
- Right-click context menu: New File, New Folder, Rename, Delete
- Git status indicators on files (colored filenames + M/A/D/U badges)
- File icons (Material Icon Theme)

### Integrated Terminal

- Full terminal emulation via xterm.js + node-pty
- Multiple terminal sessions with tabs
- Resize, maximize, and hide
- **Ctrl+`** to toggle terminal

### Source Control (Git)

- View current branch and changed files
- Stage / Unstage / Discard changes per file or all at once
- Commit with message (Ctrl+Enter)
- Staged vs Unstaged sections
- Change count badge on activity bar

### Port Forwarding

- Auto-detect listening ports on the remote machine
- Forward/Unforward ports with one click
- Access forwarded ports via `/port/<port>/` in browser
- DevTunnel integration for public URLs

### Workspace Picker

- Click the title bar to open workspace picker
- Browse directories starting from `~/`
- Type-ahead filtering
- Tab to enter subdirectory, Ctrl+Enter to open as workspace

### PWA Support

- Installable as a native app on Chrome, Edge, mobile
- Standalone display (no browser chrome)
- Dark theme optimized

---

## Architecture

### Agent (Backend)

The agent runs on the remote machine and provides all server-side functionality over WebSocket and HTTP.

```
agent/src/
├── handlers/           # WebSocket message handlers
│   ├── fileSystem.ts   # fs:list, fs:read, fs:write, fs:create, fs:delete, fs:rename, fs:stat
│   ├── terminal.ts     # terminal:create, terminal:input, terminal:resize, terminal:close
│   ├── git.ts          # git:status, git:stage, git:unstage, git:commit, git:diff, git:discard
│   ├── port.ts         # port:list, port:forward, port:unforward
│   ├── workspace.ts    # workspace:info, workspace:browse, workspace:change
│   └── router.ts       # Message routing + response helpers
├── services/
│   ├── fileService.ts      # File system CRUD operations
│   ├── ptyService.ts       # node-pty terminal management
│   ├── gitService.ts       # Git CLI wrapper
│   ├── portService.ts      # Port scanning (ss) + HTTP proxy
│   ├── tunnelService.ts    # DevTunnel CLI integration
│   ├── watcherService.ts   # chokidar file watcher
│   ├── configStore.ts      # Persistent JSON config
│   ├── passwordService.ts  # bcrypt password hashing
│   └── machineId.ts        # Random machine ID generator
├── server/
│   ├── http.ts         # Express server (CORS, auth, port proxy, admin)
│   ├── websocket.ts    # WebSocket server (JWT auth, origin check)
│   ├── adminRoutes.ts  # REST API for settings/password/connections
│   └── adminUi.ts      # Admin HTML UI served at agent root
├── auth/
│   ├── jwt.ts          # Token sign/verify (24h expiry)
│   └── middleware.ts   # Express auth middleware
├── utils/
│   ├── pathSecurity.ts # Path traversal prevention
│   └── logger.ts       # Structured logging
├── protocol.ts         # All message type definitions
├── config.ts           # Config proxy (reads from configStore)
└── index.ts            # Entry point
```

### Client (Frontend)

Next.js 16 app with custom server for proxying all traffic through a single port.

```
client/
├── app/
│   ├── login/page.tsx      # Login form (Machine ID + Password)
│   ├── editor/page.tsx     # Main editor workspace
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Redirect to login/editor
│   └── manifest.ts         # PWA manifest
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # Main 3-panel layout
│   │   ├── TitleBar.tsx        # Menu bar + workspace name
│   │   ├── StatusBar.tsx       # Git branch + connection status
│   │   ├── ResizeHandle.tsx    # Draggable panel resize
│   │   └── WorkspacePicker.tsx # Workspace selection dropdown
│   ├── editor/
│   │   ├── MonacoEditor.tsx    # Monaco wrapper
│   │   ├── EditorTabs.tsx      # Tab bar with preview/pinned tabs
│   │   └── WelcomeTab.tsx      # Welcome screen
│   ├── file-explorer/
│   │   ├── FileExplorer.tsx    # File tree root
│   │   ├── FileTreeNode.tsx    # Tree node with git status
│   │   ├── FileContextMenu.tsx # Right-click menu
│   │   └── NewFileDialog.tsx   # Create file/folder dialog
│   ├── terminal/
│   │   ├── Terminal.tsx        # xterm.js terminal instance
│   │   └── TerminalTabs.tsx    # Terminal session tabs + controls
│   ├── source-control/
│   │   └── SourceControl.tsx   # Git staging/commit panel
│   ├── ports/
│   │   └── PortsPanel.tsx      # Port forwarding UI
│   └── providers/
│       ├── AuthProvider.tsx        # Auth context + token management
│       └── WebSocketProvider.tsx   # WS connection + external store
├── lib/
│   ├── ws/
│   │   ├── client.ts       # WebSocket client (reconnect, request/response)
│   │   └── protocol.ts     # Message types + constants
│   ├── hooks/
│   │   ├── useFileSystem.ts # File CRUD operations
│   │   ├── useEditor.ts    # Open/save/close/preview tabs
│   │   ├── useTerminal.ts  # Terminal create/input/resize
│   │   ├── useGit.ts       # Git stage/commit/discard
│   │   └── usePorts.ts     # Port list/forward/unforward
│   ├── auth/auth.ts        # Token helpers (get/set/clear/isValid)
│   └── utils/
│       ├── language.ts     # File extension → Monaco language map
│       └── fileIcons.tsx   # File icon resolver
├── store/
│   ├── editorStore.ts      # Tabs, active tab, preview state
│   ├── fileStore.ts        # File tree, expanded dirs
│   ├── gitStore.ts         # Branch, staged/changed files
│   ├── terminalStore.ts    # Terminal sessions
│   ├── workspaceStore.ts   # Current workspace
│   └── portStore.ts        # Ports + forwarding state
├── server.ts               # Custom Next.js server with proxy
└── package.json
```

---

## WebSocket Protocol

All communication uses a JSON envelope over WebSocket:

```typescript
// Request (Client → Agent)
{ id: "uuid", type: "fs:list", payload: { path: "src" } }

// Response (Agent → Client)
{ id: "uuid", type: "fs:list", success: true, payload: { entries: [...] } }

// Event (Agent → Client, no request ID correlation)
{ id: "uuid", type: "fs:watch:event", payload: { event: "change", path: "src/index.ts" } }
```

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `fs:list` | C → A | List directory contents |
| `fs:read` | C → A | Read file content |
| `fs:write` | C → A | Write file content |
| `fs:create` | C → A | Create file or directory |
| `fs:delete` | C → A | Delete file or directory |
| `fs:rename` | C → A | Rename file or directory |
| `fs:stat` | C → A | Get file metadata |
| `fs:watch:event` | A → C | File system change event |
| `terminal:create` | C → A | Create terminal session |
| `terminal:input` | C → A | Send input to terminal |
| `terminal:output` | A → C | Terminal output stream |
| `terminal:resize` | C → A | Resize terminal |
| `terminal:close` | C → A | Close terminal |
| `terminal:exit:event` | A → C | Terminal exit event |
| `git:status` | C → A | Get git status + branch |
| `git:stage` | C → A | Stage a file |
| `git:stage:all` | C → A | Stage all changes |
| `git:unstage` | C → A | Unstage a file |
| `git:unstage:all` | C → A | Unstage all |
| `git:discard` | C → A | Discard file changes |
| `git:commit` | C → A | Create commit |
| `git:diff` | C → A | Get diff |
| `port:list` | C → A | List listening ports |
| `port:forward` | C → A | Forward a port |
| `port:unforward` | C → A | Stop forwarding |
| `workspace:info` | C → A | Get workspace info |
| `workspace:browse` | C → A | Browse directories |
| `workspace:change` | C → A | Change workspace |

---

## Configuration

### Agent Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9000` | Agent HTTP/WS port |
| `WORKSPACE_ROOT` | `process.cwd()` | Default workspace directory |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated allowed CORS origins |

### Client Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9001` | Client server port |
| `AGENT_URL` | `http://localhost:9000` | Agent URL (server-side only) |

### Persistent Config

The agent stores configuration in `agent/data/config.json` (auto-created on first run):

- Machine ID (9-digit random)
- Passwords (random + optional fixed, bcrypt hashed)
- JWT secret (256-bit random)
- Settings (port, workspace, limits, allowed origins)

---

## Deployment

### Same Machine (Development)

```bash
# Terminal 1
cd agent && npm run dev

# Terminal 2
cd client && npm run dev

# Open http://localhost:9001
```

### Remote Deployment

```bash
# On remote machine (Machine A)
cd agent
WORKSPACE_ROOT=/path/to/projects npm start

# On web server (Machine B) or same machine
cd client
AGENT_URL=http://machine-a:9000 npm start

# Access from any browser at http://machine-b:9001
```

### Behind a Tunnel (ngrok, Cloudflare, etc.)

Only expose the **client port (9001)**. The client proxies everything to the agent internally.

```bash
# On the same machine running both agent + client
ngrok http 9001
# or
cloudflared tunnel --url http://localhost:9001
```

### Admin API

The agent exposes admin endpoints at `/api/admin/*`:

```bash
# Check status
curl http://localhost:9000/api/admin/status

# View current password
curl http://localhost:9000/api/admin/password

# Regenerate password
curl -X POST http://localhost:9000/api/admin/password/regenerate

# Set fixed password
curl -X PUT http://localhost:9000/api/admin/password/fixed \
  -H "Content-Type: application/json" \
  -d '{"password": "mypassword"}'

# Update settings
curl -X PUT http://localhost:9000/api/admin/settings \
  -H "Content-Type: application/json" \
  -d '{"workspaceRoot": "/home/user/projects"}'
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current file |
| `Ctrl+`` ` | Toggle terminal |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Shift+G` | Toggle Source Control |
| `Ctrl+Click` | Navigate to import path |
| `Ctrl+Enter` | Commit (in Source Control) |

---

## Security

- **Path Traversal Protection**: All file paths are resolved against workspace root; paths outside are rejected
- **JWT Authentication**: 24-hour tokens, secret auto-generated (256-bit)
- **Password Hashing**: bcrypt with salt rounds
- **Origin Check**: WebSocket connections validated against allowed origins (bypassed for localhost proxy)
- **Limits**: Max 5 WebSocket connections, 5 terminal sessions, 10 MB file size (all configurable)
- **Single Port Exposure**: Only the client port needs to be exposed; agent is accessed via server-side proxy

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Client Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Code Editor | Monaco Editor |
| Terminal | xterm.js + WebGL |
| State Management | Zustand |
| Icons | Lucide React + Material Icon Theme |
| Agent Runtime | Node.js + TypeScript |
| HTTP Server | Express |
| WebSocket | ws |
| Terminal Backend | node-pty |
| File Watching | chokidar |
| Auth | jsonwebtoken + bcryptjs |
| Build Tool | tsx (dev), tsc (build) |
