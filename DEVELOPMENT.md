# Development Guide

Technical documentation for contributors working on VS Code Remote.

## Getting Started

### Prerequisites

- Node.js >= 20
- npm (comes with Node.js)

### Setup

```bash
git clone <repo-url>
cd vscode-remote
npm install                    # Install all workspaces (shared, agent, relay)
cp .env.example .env           # Copy env template, fill in values
npm run build:shared           # Build shared package first
```

### Running locally

```bash
# Terminal 1: Agent
npm run dev:agent

# Terminal 2: Relay
npm run dev:relay
```

Agent runs at `http://localhost:9000`, relay at `http://localhost:9001`.

### Required `.env` variables

```env
RELAY_SECRET=your-shared-secret    # Must match on both agent and relay
RELAY_URL=ws://localhost:9001/api/agent-ws
WORKSPACE_ROOT=/path/to/your/project
```

See [Environment Variables](#environment-variables) for full list.

## Monorepo Structure

```
vscode-remote/                  npm workspaces monorepo
├── shared/                     @vscode-remote/shared — protocol types & MSG constants
├── agent/                      @hanoilab/opencode — npm package, runs on host machine
├── relay/                      Next.js + Express relay server
├── package.json                Root workspace config
├── .env                        Shared env vars (git-ignored)
└── .env.example                Template for env vars
```

### Shared Package (`@vscode-remote/shared`)

Single source of truth for all protocol types and MSG constants. Both agent and relay import from here.

```bash
npm run build:shared            # Build with tsc (must run before agent/relay)
```

### Agent Build (tsup)

Agent uses **tsup** to bundle for npm publish. `@vscode-remote/shared` is inlined into the bundle so the published package has no workspace dependency.

Build-time env injection via `tsup.config.ts`:
- `RELAY_URL` from `.env` → baked as `__BUILD_RELAY_URL__` fallback

```bash
npm run build:agent             # tsup build
npm run publish:agent           # Build shared + publish agent to npm
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Relay Server                               │
│  ┌──────────────┐  ┌──────────────────────────────────────────────┐ │
│  │  Next.js App │  │  Express + Custom server.ts                  │ │
│  │  (UI pages)  │  │  ├── WS hub (agent ↔ browser routing)      │ │
│  │              │  │  ├── /api/auth/* (rate limited)              │ │
│  │  /           │  │  ├── /api/admin/* (timing-safe auth)        │ │
│  │  /editor/:id │  │  ├── /api/agents (admin protected)          │ │
│  │  /dashboard  │  │  └── First-message WS auth (no token in URL)│ │
│  └──────────────┘  └──────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ WebSocket
                                 │ (agent connects outbound)
┌────────────────────────────────▼────────────────────────────────────┐
│                             Agent                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  ┌───────────────┐ │
│  │ Handlers │  │ Services │  │ Relay Client   │  │ Local Server  │ │
│  │ fs       │  │ file     │  │ (outbound WS)  │  │ (localhost    │ │
│  │ terminal │  │ pty      │  │                │  │  admin UI)    │ │
│  │ git      │  │ git      │  │ Registers with │  │               │ │
│  │ port     │  │ port     │  │ relay, routes  │  │ /api/status   │ │
│  │ workspace│  │ tunnel   │  │ messages       │  │ /api/settings │ │
│  │ auth     │  │ watcher  │  └───────────────┘  │ /api/password  │ │
│  └──────────┘  │ config   │                      └───────────────┘ │
│                │ password  │                                        │
│                │ machineId │                                        │
│                └──────────┘                                        │
└────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Connection Lifecycle

1. Agent starts → connects outbound WS to relay (`/api/agent-ws`)
2. Agent sends `agent:register` with `machineId` + `RELAY_SECRET`
3. Relay stores agent WS in `agents` Map
4. Browser opens `/editor/:machineId` → relay upgrades to WS (`/api/ws?machineId=xxx`)
5. Browser sends first message: `auth:authenticate` with JWT token
6. Relay forwards `auth:verify` to agent, marks browser as authenticated
7. All browser messages are forwarded to agent via relay, responses routed back
8. On browser disconnect → `browser:disconnected` → agent stops watcher if no browsers left

### Message Routing (relay server/)

```
Browser WS message → relay checks `agents.get(machineId)` → forwards to agent WS
Agent WS response  → relay checks `browsers` Map → forwards to correct browser WS
```

### Authentication Flow

```
Browser                   Relay                      Agent
  │                         │                          │
  ├─POST /api/auth/login───►│                          │
  │  {machineId, password}  ├─WS auth:login───────────►│
  │                         │                          ├─verify password (bcrypt)
  │                         │◄─────────────{token}─────┤  sign JWT (24h)
  │◄────────────{token}─────┤                          │
  │                         │                          │
  │  (store in sessionStorage)                         │
  │                         │                          │
  ├─WS upgrade─────────────►│                          │
  │  ?machineId=xxx         │ (pending auth, 10s timeout)
  │                         │                          │
  ├─WS auth:authenticate───►│                          │
  │  {token}                ├─WS auth:verify──────────►│
  │                         │◄──────────{success}──────┤
  │◄─────WS connected───────┤                          │
```

**Key change**: Token is sent via first WebSocket message, never in URL query params.

### Token Expiry

- JWT has 24h lifetime, `expiresAt` stored in sessionStorage
- Editor page sets `setTimeout(redirect, timeLeft)` on mount/reload
- On expiry → clear session → redirect to login
- WS client detects `auth_expired` → stops reconnecting

## Environment Variables

All in root `.env` (shared by agent and relay via monorepo):

| Variable | Used by | Description |
|----------|---------|-------------|
| `RELAY_SECRET` | Agent + Relay | Shared secret for agent↔relay auth (must match) |
| `RELAY_URL` | Agent | WebSocket URL of relay (build-time bake + runtime override) |
| `WORKSPACE_ROOT` | Agent | Default workspace path |
| `LOCAL_PORT` | Agent | Admin UI port (default: 9000) |
| `ADMIN_PASSWORD` | Relay | Admin dashboard password (blocked if not set) |
| `ALLOWED_ORIGINS` | Relay | CORS whitelist, comma-separated (dev: allow all) |
| `PORT` | Relay | Relay server port (default: 9001) |
| `NODE_ENV` | Relay | `production` or `development` |

## Project Structure

### Shared (`shared/`)

```
src/
├── index.ts                    Re-export all from protocol
└── protocol.ts                 All WS message types, interfaces, MSG constants
```

### Agent (`agent/`)

```
src/
├── index.ts                    Entry point (start local server + relay client)
├── cli.ts                      CLI commands (start, stop, status, password, install, etc.)
├── config.ts                   dotenv loader + config proxy (re-exports configStore)
├── constants.ts                (minimal — most config via env vars now)
│
├── auth/
│   └── jwt.ts                  signToken(), verifyToken() — 24h expiry
│
├── handlers/
│   ├── router.ts               routeMessage() — dispatch by type prefix
│   ├── auth.ts                 auth:login, auth:verify
│   ├── fileSystem.ts           fs:* handlers
│   ├── terminal.ts             terminal:shells, terminal:* handlers
│   ├── git.ts                  git:* handlers
│   ├── port.ts                 port:* handlers
│   └── workspace.ts            workspace:* handlers
│
├── services/
│   ├── configStore.ts          JSON config persistence (~/.opencode/config.json, chmod 600)
│   ├── fileService.ts          readFile, writeFile, listDir, stat, delete, rename
│   ├── ptyService.ts           node-pty sessions + shell detection (Win/Unix)
│   ├── gitService.ts           Git CLI wrapper (status, stage, commit, diff)
│   ├── portService.ts          Port scanning (ss/lsof/netstat per platform)
│   ├── tunnelService.ts        Cloudflare Tunnel (auto-install cloudflared)
│   ├── watcherService.ts       chokidar with subscriber counting (lazy start/stop)
│   ├── passwordService.ts      bcrypt hash + verify
│   └── machineId.ts            9-digit random ID generator
│
├── relay/
│   └── relayClient.ts          Outbound WS to relay, auto-reconnect, message routing
│
├── server/
│   └── local.ts                Express server for agent admin UI + API
│
├── types/
│   └── config.types.ts         TypeScript interfaces for config
│
└── utils/
    ├── pathSecurity.ts          resolveSafePath() — prevents path traversal
    └── logger.ts                Structured logger with levels

tsup.config.ts                  Build config — inlines shared, bakes RELAY_URL
```

### Relay (`relay/`)

```
app/
├── page.tsx                    Landing page (hero + connect form)
├── layout.tsx                  Root layout (fonts, SEO metadata, PWA)
├── globals.css                 Theme variables (VS Code dark colors)
├── manifest.ts                 PWA manifest
├── editor/
│   ├── layout.tsx              AuthProvider + WebSocketProvider wrapper
│   └── [machineId]/page.tsx    Editor page (token check, auto-logout timer)
└── dashboard/page.tsx          Admin dashboard (admin login, agents list, recent)

components/
├── layout/
│   ├── AppShell.tsx            Main 3-panel layout (sidebar, editor, terminal)
│   ├── TitleBar.tsx            Menu bar, workspace name, sign out
│   ├── StatusBar.tsx           Git branch, connection status, logout
│   ├── ResizeHandle.tsx        Draggable resize with RAF throttling
│   └── WorkspacePicker.tsx     Directory browser (supports / and \ paths)
├── editor/
│   ├── MonacoEditor.tsx        Monaco wrapper with Ctrl+S, Ctrl+Click
│   ├── EditorTabs.tsx          Tab bar (preview italic, dirty indicator)
│   └── WelcomeTab.tsx          Empty state with Open Folder button
├── file-explorer/
│   ├── FileExplorer.tsx        Tree root with loading state
│   ├── FileTreeNode.tsx        Recursive node with git badges
│   ├── FileContextMenu.tsx     Right-click actions
│   └── NewFileDialog.tsx       Inline create file/folder input
├── terminal/
│   ├── Terminal.tsx            xterm.js instance
│   ├── TerminalTabs.tsx        Session tabs + shell dropdown + position toggle
│   └── VoiceMicButton.tsx      Press-and-hold voice input (Web Speech API)
├── source-control/
│   └── SourceControl.tsx       Git panel (staged, changes, commit)
├── ports/
│   ├── PortsPanel.tsx          Port list with forward/preview/copy actions
│   └── PortPreview.tsx         Iframe split panel with URL bar
├── ui/
│   └── ConfirmDialog.tsx       Custom confirm dialog (replaces native)
└── providers/
    ├── AuthProvider.tsx         Auth context (login, logout, token state)
    └── WebSocketProvider.tsx    WS connection + auto-reconnect

lib/
├── ws/
│   └── client.ts               WebSocketClient class (first-message auth, reconnect)
├── hooks/
│   ├── useFileSystem.ts        listDirectory, readFile, writeFile, etc.
│   ├── useEditor.ts            openFile, saveFile, closeTab, auto-reload on external change
│   ├── useTerminal.ts          fetchShells, createTerminal, sendInput, resize, close
│   ├── useGit.ts               refreshStatus, stageFile, commitChanges, getDiff
│   └── usePorts.ts             refreshPorts, forwardPort, unforwardPort
├── auth/
│   └── auth.ts                 get/set/clear token + machineId (sessionStorage)
└── utils/
    ├── language.ts              File extension → Monaco language ID
    └── fileIcons.tsx            File icon resolver (Material Icon Theme)

server/                          Decomposed relay server modules
├── state.ts                    Shared state (agents, browsers, pending Maps)
├── adminAuth.ts                Admin auth factory (signToken, verifyToken, middleware)
├── agentHandler.ts             handleAgentConnection(ws, relaySecret)
├── browserHandler.ts           handleBrowserConnection — first-message auth flow
├── agentBridge.ts              forwardLoginToAgent, verifyTokenViaAgent
├── routes/
│   ├── admin.ts                Express Router: /api/admin/* (rate limited, timing-safe)
│   ├── auth.ts                 Express Router: /api/auth/* (rate limited)
│   └── agents.ts               Express Router: /api/agents (admin protected)
└── upgrade.ts                  WebSocket upgrade handler

store/                           Zustand stores
├── editorStore.ts              Tabs (open, close, preview, pin, dirty, externalUpdate)
├── fileStore.ts                File tree children Map, active file
├── gitStore.ts                 Branch, entries, change count
├── terminalStore.ts            Sessions array, active session
├── workspaceStore.ts           workspaceRoot, folderName (nullable)
└── portStore.ts                ports[], forwardedPorts Set, tunnelUrls Map

server.ts                        Entry point (~90 lines)
                                 - Express app with CORS, logging middleware
                                 - Mounts route routers
                                 - Falls back to Next.js handler
                                 - HTTP server + WSS noServer
```

## WebSocket Protocol

All messages use a JSON envelope from `@vscode-remote/shared`:

```typescript
// Request (Browser → Agent, via Relay)
{ id: "uuid", type: "fs:list", payload: { path: "src" } }

// Response (Agent → Browser, via Relay)
{ id: "uuid", type: "fs:list", success: true, payload: { entries: [...] } }

// Event (Agent → Browser, unsolicited)
{ id: "uuid", type: "fs:watch:event", payload: { event: "change", path: "src/index.ts" } }
```

### Message Types

| Category | Type | Direction | Payload |
|----------|------|-----------|---------|
| **Auth** | `auth:login` | B→A | `{machineId, password}` → `{token, expiresAt}` |
| | `auth:verify` | R→A | `{token}` → `{machineId}` |
| | `auth:authenticate` | B→R | `{token}` (first WS message) |
| **FS** | `fs:list` | B→A | `{path}` → `{entries[]}` |
| | `fs:read` | B→A | `{path}` → `{path, content}` |
| | `fs:write` | B→A | `{path, content}` |
| | `fs:create` | B→A | `{path, type}` |
| | `fs:delete` | B→A | `{path}` |
| | `fs:rename` | B→A | `{oldPath, newPath}` |
| | `fs:stat` | B→A | `{path}` → `{exists, type, size}` |
| | `fs:watch:event` | A→B | `{event, path}` |
| **Terminal** | `terminal:shells` | B→A | → `{shells[], default}` |
| | `terminal:create` | B→A | `{cols, rows, shell?}` → `{terminalId}` |
| | `terminal:input` | B→A | `{terminalId, data}` |
| | `terminal:output` | A→B | `{terminalId, data}` |
| | `terminal:resize` | B→A | `{terminalId, cols, rows}` |
| | `terminal:close` | B→A | `{terminalId}` |
| | `terminal:exit:event` | A→B | `{terminalId, exitCode}` |
| **Git** | `git:status` | B→A | → `{branch, entries[]}` |
| | `git:stage` | B→A | `{path}` |
| | `git:stage:all` | B→A | |
| | `git:unstage` | B→A | `{path}` |
| | `git:unstage:all` | B→A | |
| | `git:discard` | B→A | `{path}` |
| | `git:commit` | B→A | `{message}` → `{hash, summary}` |
| | `git:diff` | B→A | `{path, staged}` → `{diff}` |
| **Ports** | `port:list` | B→A | → `{ports[], forwarded[], tunnelUrls{}}` |
| | `port:forward` | B→A | `{port}` → `{port, tunnelUrl}` |
| | `port:unforward` | B→A | `{port}` |
| **Workspace** | `workspace:info` | B→A | → `{workspaceRoot, folderName}` |
| | `workspace:browse` | B→A | `{path}` → `{path, entries[]}` |
| | `workspace:change` | B→A | `{path}` → `{workspaceRoot, folderName}` |
| **Relay** | `agent:register` | A→R | `{machineId, secret}` |
| | `agent:registered` | R→A | `{ok}` |
| | `browser:connected` | R→A | (starts file watcher) |
| | `browser:disconnected` | R→A | (stops watcher if last) |

Direction: B = Browser, A = Agent, R = Relay

## Security

### Implemented Protections

- **First-message auth**: JWT token sent via WS message, never in URL
- **RELAY_SECRET**: Env var only, no hardcoded defaults
- **Rate limiting**: 5/min admin login, 10/min auth login (per IP)
- **Timing-safe comparison**: `crypto.timingSafeEqual` for admin password
- **CORS whitelist**: `ALLOWED_ORIGINS` env var, dev mode allows localhost
- **File permissions**: `~/.opencode/config.json` chmod 0600
- **Admin blocked by default**: No `ADMIN_PASSWORD` = dashboard returns 503
- **bcrypt hashing**: Cost factor 10 for machine passwords
- **Path traversal prevention**: `pathSecurity.ts` blocks `../` access

### Two Auth Systems

- **Machine auth**: JWT signed by agent's secret, for browser → agent sessions (24h)
- **Admin auth**: HMAC-signed HttpOnly cookie, for relay dashboard access (separate `ADMIN_PASSWORD`)

## Key Design Decisions

### Monorepo with Shared Package

Protocol types defined once in `@vscode-remote/shared`, consumed by both agent and relay. Agent uses **tsup** to inline shared into the npm bundle — no workspace dependency at runtime.

### Lazy File Watcher

The chokidar watcher uses a subscriber counting model. `addSubscriber()` starts the watcher on first browser connect, `removeSubscriber()` stops it when the last browser disconnects. This prevents ENOSPC errors on large repos with no active users.

### Auto-reload Open Files

When a file open in the editor is modified externally (terminal, git, another process), the `fs:watch:event` triggers a re-read. Clean files update immediately; dirty files only update their baseline (`originalContent`) to keep the dirty state accurate.

### Shell Selection

Agent detects available shells on the host (PowerShell, cmd, Git Bash on Windows; bash, zsh, sh on Unix). The terminal UI shows a dropdown to choose shell type when creating a new terminal.

### Voice Input

The terminal header includes a mic button (Web Speech API) for mobile users. Press-and-hold to speak, release to paste transcript into terminal. Hidden on unsupported browsers.

### Nullable Workspace Root

`config.workspaceRoot` is `string | null`. When null, the editor shows an empty window with "Open Folder" button. All file/git operations are guarded by `pathSecurity.ts` which throws if no workspace is set.

### Session-scoped Auth

Tokens are stored in `sessionStorage` (not localStorage) so each browser tab has its own session. Closing the tab clears the token.

### Relay Architecture

The agent connects **outbound** to the relay server. This means no ports need to be opened on the remote machine. The relay acts as a WS hub, routing messages between browsers and agents by `machineId`.

## Development Scripts

### Root (monorepo)

```bash
npm run build:shared            # Build shared package (must run first)
npm run build:agent             # Build agent with tsup
npm run build:relay             # Next.js production build
npm run build                   # Build all (shared → agent → relay)
npm run build:relay:full        # Build shared + relay (for deploy)
npm run dev:agent               # Agent watch mode
npm run dev:relay               # Relay dev mode (Turbopack)
npm run publish:agent           # Build shared + publish agent to npm
```

### Agent

```bash
npm run dev                     # Watch mode with tsx
npm run build                   # tsup build
npm start                       # Run compiled output
npm run dev:cli                 # Test CLI commands
```

### Relay

```bash
npm run dev                     # Custom server with tsx (Turbopack)
npm run build                   # Next.js production build
npm start                       # Production server
npm run lint                    # ESLint
```

## Deployment

### Render (Relay Server)

Use the [`render.yaml`](./render.yaml) blueprint at the repo root. Render picks it up automatically when you create a Blueprint service.

1. **Root directory**: `/` (monorepo root)
2. **Build command**: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @vscode-remote/shared build && pnpm --filter client build`
3. **Start command**: `pnpm --filter client start`
4. **Environment variables**:
   - `RELAY_SECRET` — must match agent's RELAY_SECRET
   - `ADMIN_PASSWORD` — admin dashboard password
   - `NODE_ENV=production`
   - `PORT` — Render sets this automatically

### Agent (npm publish)

```bash
npm run publish:agent
```

Users install with: `npm install -g @hanoilab/opencode`

## Adding a New Feature

### New WS Message Type

1. Add types + MSG constant in `shared/src/protocol.ts`
2. Run `npm run build:shared`
3. Add handler in `agent/src/handlers/` (or extend existing)
4. Router dispatches automatically by type prefix (`agent/src/handlers/router.ts`)
5. Add hook in `relay/lib/hooks/` if needed
6. Add store in `relay/store/` if state needs to persist across components

### New Sidebar Panel

1. Create component in `relay/components/`
2. Add to `activeSidebar` type in `AppShell.tsx`
3. Add activity bar button with icon
4. Add panel render in sidebar section
