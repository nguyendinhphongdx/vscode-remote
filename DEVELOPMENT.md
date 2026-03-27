# Development Guide

Technical documentation for contributors working on VS Code Remote.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Relay Server                               │
│  ┌──────────────┐  ┌──────────────────────────────────────────────┐ │
│  │  Next.js App │  │  Custom server.ts                           │ │
│  │  (UI pages)  │  │  ├── WS hub (agent ↔ browser routing)      │ │
│  │              │  │  ├── HTTP: /api/auth/login, /api/agents     │ │
│  │  /           │  │  ├── Admin auth (HMAC cookie)               │ │
│  │  /login      │  │  └── Token verification (forward to agent)  │ │
│  │  /editor/:id │  │                                              │ │
│  │  /dashboard  │  └──────────────────────────────────────────────┘ │
│  └──────────────┘                                                   │
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
│  │ port     │  │ port     │  │ relay, routes  │  │ /api/admin/*  │ │
│  │ workspace│  │ tunnel   │  │ messages       │  │               │ │
│  │ auth     │  │ watcher  │  └───────────────┘  └───────────────┘ │
│  └──────────┘  │ config   │                                        │
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
4. Browser opens `/editor/:machineId` → relay upgrades to WS (`/api/browser-ws/:machineId`)
5. Relay verifies browser token via `auth:verify` forwarded to agent
6. Relay sends `browser:connected` to agent (starts file watcher)
7. All browser messages are forwarded to agent via relay, responses routed back
8. On browser disconnect → `browser:disconnected` → agent stops watcher if no browsers left

### Message Routing (relay server.ts)

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
  ├─WS upgrade──────────────►│                          │
  │  ?token=xxx&machineId   ├─WS auth:verify──────────►│
  │                         │◄──────────{success}──────┤
  │◄─────WS connected───────┤                          │
```

### Token Expiry

- JWT has 24h lifetime, `expiresAt` stored in sessionStorage
- Editor page sets `setTimeout(redirect, timeLeft)` on mount/reload
- On expiry → clear session → redirect to `/login?expired=1`
- Login page shows "Session expired" message

## Project Structure

### Agent (`agent/`)

```
src/
├── index.ts                  Entry point (start local server + relay client)
├── cli.ts                    CLI commands (start, stop, status, password, etc.)
├── config.ts                 Config proxy (re-exports from configStore)
├── constants.ts              Default values (ports, limits, relay URL)
├── protocol.ts               All WS message types + MSG constants
│
├── auth/
│   └── jwt.ts                signToken(), verifyToken() — 24h expiry
│
├── handlers/
│   ├── router.ts             routeMessage() — dispatch by type prefix
│   ├── auth.ts               auth:login, auth:verify
│   ├── fileSystem.ts         fs:* handlers
│   ├── terminal.ts           terminal:* handlers
│   ├── git.ts                git:* handlers
│   ├── port.ts               port:* handlers
│   └── workspace.ts          workspace:* handlers
│
├── services/
│   ├── configStore.ts        JSON config persistence (~/.opencode/config.json)
│   ├── fileService.ts        readFile, writeFile, listDir, stat, delete, rename
│   ├── ptyService.ts         node-pty sessions (create, input, resize, close)
│   ├── gitService.ts         Git CLI wrapper (status, stage, commit, diff)
│   ├── portService.ts        Port scanning (ss/lsof/netstat per platform)
│   ├── tunnelService.ts      Cloudflare Tunnel (auto-install cloudflared)
│   ├── watcherService.ts     chokidar with subscriber counting (lazy start/stop)
│   ├── passwordService.ts    bcrypt hash + verify
│   └── machineId.ts          9-digit random ID generator
│
├── relay/
│   └── relayClient.ts        Outbound WS to relay, auto-reconnect, message routing
│
├── server/
│   └── local.ts              Express server for agent admin UI
│
├── types/
│   └── config.types.ts       TypeScript interfaces for config
│
└── utils/
    ├── pathSecurity.ts       resolveSafePath() — prevents path traversal
    └── logger.ts             Structured logger with levels
```

### Relay (`relay/`)

```
app/
├── page.tsx                  Landing page (hero + connect form)
├── layout.tsx                Root layout (fonts, SEO metadata, PWA)
├── globals.css               Theme variables (VS Code dark colors)
├── manifest.ts               PWA manifest
├── login/page.tsx            Login form (Machine ID + Password)
├── editor/
│   ├── layout.tsx            AuthProvider + WebSocketProvider wrapper
│   └── [machineId]/page.tsx  Editor page (token check, auto-logout timer)
└── dashboard/page.tsx        Admin dashboard (agents list, recent connections)

components/
├── layout/
│   ├── AppShell.tsx          Main 3-panel layout (sidebar, editor, terminal)
│   ├── TitleBar.tsx          Menu bar, workspace name, window controls
│   ├── StatusBar.tsx         Git branch, connection status, logout
│   ├── ResizeHandle.tsx      Draggable resize with RAF throttling
│   └── WorkspacePicker.tsx   Directory browser (supports / and \ paths)
├── editor/
│   ├── MonacoEditor.tsx      Monaco wrapper with Ctrl+S, Ctrl+Click
│   ├── EditorTabs.tsx        Tab bar (preview italic, dirty indicator)
│   └── WelcomeTab.tsx        Empty state with Open Folder button
├── file-explorer/
│   ├── FileExplorer.tsx      Tree root with loading state
│   ├── FileTreeNode.tsx      Recursive node with git badges
│   ├── FileContextMenu.tsx   Right-click actions
│   └── NewFileDialog.tsx     Inline create file/folder input
├── terminal/
│   ├── Terminal.tsx           xterm.js instance
│   └── TerminalTabs.tsx       Session tabs + position toggle (bottom/right)
├── source-control/
│   └── SourceControl.tsx     Git panel (staged, changes, commit)
├── ports/
│   ├── PortsPanel.tsx        Port list with forward/preview/copy actions
│   └── PortPreview.tsx       Iframe split panel with URL bar
├── ui/
│   └── ConfirmDialog.tsx     Custom confirm dialog (replaces native)
└── providers/
    ├── AuthProvider.tsx       Auth context (login, logout, token state)
    └── WebSocketProvider.tsx  WS connection + auto-reconnect

lib/
├── ws/
│   ├── client.ts             WebSocketClient class (reconnect, send/receive)
│   └── protocol.ts           Message types mirror of agent protocol
├── hooks/
│   ├── useFileSystem.ts      listDirectory, readFile, writeFile, etc.
│   ├── useEditor.ts          openFile, saveFile, closeTab, resolveFilePath
│   ├── useTerminal.ts        createTerminal, sendInput, resize, close
│   ├── useGit.ts             refreshStatus, stageFile, commitChanges, getDiff
│   └── usePorts.ts           refreshPorts, forwardPort, unforwardPort
├── auth/
│   └── auth.ts               get/set/clear token + machineId (sessionStorage)
└── utils/
    ├── language.ts            File extension → Monaco language ID
    └── fileIcons.tsx          File icon resolver (Material Icon Theme)

store/                         Zustand stores
├── editorStore.ts             Tabs (open, close, preview, pin, dirty state)
├── fileStore.ts               File tree children Map, active file
├── gitStore.ts                Branch, entries, change count
├── terminalStore.ts           Sessions array, active session
├── workspaceStore.ts          workspaceRoot, folderName (nullable)
└── portStore.ts               ports[], forwardedPorts Set, tunnelUrls Map

server.ts                      Custom HTTP + WS server
                               - WS hub: routes browser ↔ agent messages
                               - HTTP: /api/auth/login, /api/agents, /api/admin/*
                               - Admin auth: HMAC-signed token in HttpOnly cookie
                               - Token verification: forwards auth:verify to agent
```

## WebSocket Protocol

All messages use a JSON envelope:

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
| **FS** | `fs:list` | B→A | `{path}` → `{entries[]}` |
| | `fs:read` | B→A | `{path}` → `{path, content}` |
| | `fs:write` | B→A | `{path, content}` |
| | `fs:create` | B→A | `{path, type}` |
| | `fs:delete` | B→A | `{path}` |
| | `fs:rename` | B→A | `{oldPath, newPath}` |
| | `fs:stat` | B→A | `{path}` → `{exists, type, size}` |
| | `fs:watch:event` | A→B | `{event, path}` |
| **Terminal** | `terminal:create` | B→A | `{cols, rows}` → `{terminalId}` |
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

## Key Design Decisions

### Lazy File Watcher
The chokidar watcher uses a subscriber counting model. `addSubscriber()` starts the watcher on first browser connect, `removeSubscriber()` stops it when the last browser disconnects. This prevents ENOSPC errors on large repos with no active users.

### Nullable Workspace Root
`config.workspaceRoot` is `string | null`. When null, the editor shows an empty window with "Open Folder" button. All file/git operations are guarded by `pathSecurity.ts` which throws if no workspace is set.

### Session-scoped Auth
Tokens are stored in `sessionStorage` (not localStorage) so each browser tab has its own session. Closing the tab clears the token. The editor page uses `setTimeout` to auto-redirect on token expiry.

### Relay Architecture
The agent connects **outbound** to the relay server. This means no ports need to be opened on the remote machine. The relay acts as a WS hub, routing messages between browsers and agents by `machineId`.

### Port Forwarding via Cloudflare Tunnel
Port forwarding creates a Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:<port>`). The tunnel URL is a public HTTPS endpoint. The in-editor preview embeds this URL in an iframe split panel.

### Admin vs Machine Auth
Two separate auth systems:
- **Machine auth**: JWT signed by agent's secret, for browser → agent sessions
- **Admin auth**: HMAC-signed cookie, for relay dashboard access. Separate password (`ADMIN_PASSWORD` env var)

## Config File

Agent stores config at `~/.opencode/config.json`:

```json
{
  "machineId": "940195819",
  "passwords": {
    "random": { "hash": "$2b$...", "displayValue": "aB3xK9mQ" },
    "fixed": null
  },
  "settings": {
    "relayUrl": "ws://localhost:9001/api/agent-ws",
    "localPort": 9000,
    "workspaceRoot": null,
    "maxTerminals": 5,
    "maxFileSize": 10485760,
    "jwtSecret": "..."
  }
}
```

## Development Scripts

### Agent

```bash
npm run dev          # Watch mode with tsx
npm run build        # Compile TypeScript
npm start            # Run compiled output
npm run dev:cli      # Test CLI commands
```

### Relay

```bash
npm run dev          # Custom server with tsx (Turbopack)
npm run build        # Next.js production build
npm start            # Production server
npm run lint         # ESLint
```

## Adding a New Feature

### New WS Message Type

1. Add types + MSG constant in `agent/src/protocol.ts`
2. Add handler in `agent/src/handlers/` (or extend existing)
3. Register in `agent/src/handlers/router.ts`
4. Mirror types in `relay/lib/ws/protocol.ts`
5. Add hook in `relay/lib/hooks/` if needed
6. Add store in `relay/store/` if state needs to persist across components

### New Sidebar Panel

1. Create component in `relay/components/`
2. Add to `activeSidebar` type in `AppShell.tsx`
3. Add activity bar button with icon
4. Add panel render in sidebar section
