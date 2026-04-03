# Plan: Kiến trúc Relay (AnyDesk model)

## Tổng quan

Mỗi máy chạy **Agent** — vừa là server (cho người khác connect vào), vừa là client (connect đến máy khác). Tất cả agent connect ra **Relay Server** trung chuyển.

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Agent A    │         │   Relay Server   │         │   Agent B    │
│              │────WS───│                  │───WS────│              │
│ localhost:9000         │   relay.com      │         │ localhost:9000
│              │         │                  │         │              │
│ Your ID: 123 │         │ Agents online:   │         │ Your ID: 456 │
│ Pass: abc    │         │  123 ● 456 ●     │         │ Pass: xyz    │
│              │         │                  │         │              │
│ Remote: [456]│         │ Dashboard:       │         │              │
│ Pass: [xyz]  │         │  manage agents   │         │              │
│ [Connect]    │         │                  │         │              │
└──────────────┘         └──────────────────┘         └──────────────┘

User mở Agent A (localhost:9000)
  → Gõ Remote ID: 456, Password: xyz
  → Agent A gửi request qua relay đến Agent B
  → Agent B verify password
  → Browser redirect sang relay/editor/456
  → VS Code editor remote vào máy B
```

---

## 2 thành phần

### 1. Agent (chạy trên mỗi máy)

**HTTP Server local (localhost:9000):**
- Serve web UI: hiện Your ID + Password, form connect remote
- Không expose ra ngoài, chỉ truy cập local

**WS Client ra relay:**
- Khi start → connect WS ra relay server
- Đăng ký machineId
- Nhận và xử lý messages từ relay (file, terminal, git, etc.)
- Auto-reconnect nếu mất kết nối

**Xử lý backend:**
- File system, terminal (PTY), git, port forwarding
- Tất cả logic hiện có giữ nguyên, chỉ đổi transport

### 2. Relay Server (deploy trên VPS)

**Dashboard admin UI:**
- Danh sách agents online/offline
- Kick agent, xem thống kê

**Editor UI:**
- VS Code editor interface (Monaco, terminal, file explorer...)
- Route: `/editor/:machineId`
- Chính là phần client/Next.js hiện tại

**Relay hub:**
- Nhận connections từ agents
- Nhận connections từ browsers (editor sessions)
- Trung chuyển messages giữa browser ↔ agent theo machineId
- Forward auth requests

---

## Luồng hoạt động

### 1. Agent khởi động
```
Agent start
  → Đọc config (machineId, password)
  → Start HTTP server localhost:9000 (serve agent UI)
  → Connect WS ra relay: wss://relay.example.com/api/agent-ws
  → Gửi: { type: "agent:register", payload: { machineId, secret } }
  → Relay lưu agent vào pool online
  → Start file watcher
  → Terminal hiện: "Agent ready. Open http://localhost:9000"
```

### 2. User muốn connect đến máy khác
```
User mở http://localhost:9000 (agent UI local)
  → Thấy Your ID: 123-456, Password: abc
  → Gõ Remote ID: 789-012
  → Gõ Password: xyz
  → Bấm Connect
  → Agent gửi auth request qua relay đến agent 789-012
  → Agent 789-012 verify password → trả JWT token
  → Browser redirect sang: https://relay.example.com/editor/789-012?token=xxx
  → VS Code editor remote load lên
```

### 3. Editor session (browser ↔ relay ↔ remote agent)
```
Browser tại relay.example.com/editor/789-012
  → Connect WS: /api/ws?machineId=789-012&token=xxx
  → Relay tìm agent 789-012 trong pool
  → Browser gửi fs:list → relay forward → agent xử lý → relay forward response
  → Agent gửi terminal:output event → relay forward → browser render
```

### 4. Port forwarding
```
Browser GET /port/789-012/3000/index.html
  → Relay gửi WS message đến agent 789-012
  → Agent gọi localhost:3000/index.html
  → Agent trả response qua WS
  → Relay trả HTTP response cho browser
```

---

## Cấu trúc project mới

```
vscode-remote/
├── agent/                    # Chạy trên mỗi máy
│   ├── src/
│   │   ├── index.ts          # Entry: start HTTP local + connect relay
│   │   ├── config.ts         # Config proxy
│   │   ├── protocol.ts       # Message types
│   │   │
│   │   ├── relay/
│   │   │   └── relayClient.ts    # WS client connect ra relay
│   │   │
│   │   ├── handlers/
│   │   │   ├── router.ts         # Route messages
│   │   │   ├── auth.ts           # Login verify (WS-based)
│   │   │   ├── fileSystem.ts     # File CRUD
│   │   │   ├── terminal.ts       # PTY management
│   │   │   ├── git.ts            # Git operations
│   │   │   ├── workspace.ts      # Workspace browse/change
│   │   │   ├── port.ts           # Port list/forward
│   │   │   └── portProxy.ts      # HTTP-over-WS tunneling
│   │   │
│   │   ├── services/
│   │   │   ├── configStore.ts    # Persistent config
│   │   │   ├── fileService.ts    # File operations
│   │   │   ├── ptyService.ts     # Terminal PTY
│   │   │   ├── gitService.ts     # Git CLI wrapper
│   │   │   ├── portService.ts    # Port scanning
│   │   │   ├── watcherService.ts # File watcher
│   │   │   ├── passwordService.ts
│   │   │   └── machineId.ts
│   │   │
│   │   ├── server/
│   │   │   └── local.ts          # HTTP server cho agent UI (localhost only)
│   │   │
│   │   ├── auth/
│   │   │   └── jwt.ts            # JWT sign/verify
│   │   │
│   │   ├── types/
│   │   │   └── config.types.ts
│   │   │
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── pathSecurity.ts
│   │
│   ├── ui/                       # Agent local web UI (simple HTML/CSS/JS)
│   │   └── index.html            # Your ID, Password, Remote connect form
│   │
│   └── package.json
│
├── relay/                    # Deploy trên VPS (tách ra từ client/)
│   ├── src/
│   │   ├── index.ts          # Entry: start relay server
│   │   │
│   │   ├── hub/
│   │   │   ├── agentPool.ts      # Map<machineId, AgentWS>
│   │   │   ├── browserPool.ts    # Map<BrowserWS, { machineId }>
│   │   │   ├── messageRouter.ts  # Forward messages, track pending requests
│   │   │   └── authForwarder.ts  # HTTP login → WS forward đến agent
│   │   │
│   │   ├── server/
│   │   │   └── http.ts           # Express: dashboard + editor routes + port proxy
│   │   │
│   │   └── protocol.ts          # Relay-specific types
│   │
│   ├── dashboard/            # Admin dashboard UI (React/Next.js page)
│   │   └── ...               # Agents list, stats, kick
│   │
│   ├── editor/               # VS Code editor UI (= client/ hiện tại)
│   │   ├── app/
│   │   │   ├── login/page.tsx        # → đổi thành connect form
│   │   │   ├── editor/[id]/page.tsx  # Editor remote theo machineId
│   │   │   └── dashboard/page.tsx    # Admin dashboard
│   │   ├── components/       # Giữ nguyên components hiện tại
│   │   ├── store/            # Giữ nguyên stores
│   │   ├── lib/              # Giữ nguyên hooks + ws client
│   │   └── ...
│   │
│   └── package.json
│
└── README.md
```

---

## Thay đổi cụ thể

### Phase 1: Agent — thêm handlers + relay client

#### 1.1 `agent/src/protocol.ts` — thêm types

```typescript
// Relay registration
MSG.AGENT_REGISTER = 'agent:register'
MSG.AGENT_REGISTERED = 'agent:registered'

// Auth qua WS
MSG.AUTH_LOGIN = 'auth:login'

// Port proxy qua WS
MSG.PORT_PROXY = 'port:proxy'
MSG.PORT_PROXY_RESPONSE = 'port:proxy:response'
```

```typescript
interface AgentRegisterPayload { machineId: string; secret: string }
interface PortProxyPayload { requestId: string; port: number; method: string; path: string; headers: Record<string,string>; body?: string }
interface PortProxyResponse { requestId: string; statusCode: number; headers: Record<string,string>; body: string }
```

#### 1.2 `agent/src/handlers/auth.ts` — tạo mới

Extract login logic từ http.ts cũ:
```typescript
export async function handleAuthMessage(ws, id, type, payload) {
  // type === 'auth:login'
  // verify machineId + password
  // signToken → trả { token, expiresAt }
}
```

#### 1.3 `agent/src/handlers/portProxy.ts` — tạo mới

```typescript
export async function handlePortProxy(ws, id, type, payload) {
  // Nhận: { requestId, port, method, path, headers, body }
  // Gọi http.request() đến localhost:port
  // Trả: { requestId, statusCode, headers, body (base64) }
}
```

#### 1.4 `agent/src/handlers/router.ts` — thêm routing

```typescript
} else if (type.startsWith('auth:')) {
  await handleAuthMessage(ws, id, type, payload);
} else if (type === MSG.PORT_PROXY) {
  await handlePortProxy(ws, id, type, payload);
}
```

#### 1.5 `agent/src/relay/relayClient.ts` — tạo mới (core)

```typescript
export class RelayClient {
  private ws: WebSocket | null
  private machineId: string
  private secret: string
  private relayUrl: string
  private reconnectDelay = 1000

  constructor(relayUrl, machineId, secret)

  connect() {
    // WS connect đến relayUrl
    // onopen → gửi agent:register { machineId, secret }
    // onmessage → routeMessage(this.ws, data)
    // onclose → scheduleReconnect()
  }

  sendEvent(type, payload) {
    // Gửi event qua WS (file watch, terminal output)
  }

  scheduleReconnect() {
    // Exponential backoff 1s → 30s max + jitter
  }

  disconnect() {
    // Graceful close
  }
}
```

#### 1.6 Config updates

`agent/src/types/config.types.ts`:
```typescript
AgentSettings {
  relayUrl: string        // wss://relay.example.com/api/agent-ws
  agentSecret: string     // shared secret
  workspaceRoot: string
  maxTerminals: number
  maxFileSize: number
  jwtSecret: string
  // BỎ: port, maxConnections, allowedOrigins
}
```

#### 1.7 `agent/src/server/local.ts` — tạo mới (thay http.ts cũ)

Minimal HTTP server chỉ serve agent UI local:
```typescript
export function createLocalServer() {
  const app = express()
  // Serve static files từ agent/ui/
  // GET / → agent UI (your ID, password, connect form)
  // GET /api/status → { machineId, relayConnected, password }
  // POST /api/connect → gửi auth request qua relay đến remote agent
  app.listen(9000, '127.0.0.1') // localhost only
}
```

#### 1.8 `agent/ui/index.html` — tạo mới

Simple SPA (no framework, vanilla HTML/CSS/JS):
- Hiện Your ID + Password
- Relay connection status
- Form: Remote ID + Password + Connect button
- Danh sách recent connections

#### 1.9 `agent/src/index.ts` — viết lại

```typescript
async function main() {
  await configStore.initialize()
  startWatcher()
  createLocalServer()  // Serve agent UI tại localhost:9000

  const relay = new RelayClient(config.relayUrl, machineId, config.agentSecret)
  onFileChange((event) => relay.sendEvent(MSG.FS_WATCH_EVENT, event))
  relay.connect()

  // Log machineId + password
}
```

#### 1.10 Xóa files

- `agent/src/server/websocket.ts`
- `agent/src/server/http.ts`
- `agent/src/server/adminRoutes.ts`
- `agent/src/server/adminUi.ts`
- `agent/src/auth/middleware.ts`
- `agent/public/index.html`

### Phase 2: Relay Server — tách từ client/

#### 2.1 Rename `client/` → `relay/`

Relay server = Next.js app hiện tại + relay hub logic.

#### 2.2 `relay/server.ts` — viết lại (core)

```typescript
// State
const agents = new Map<string, WebSocket>()                    // machineId → agent WS
const browsers = new Map<WebSocket, { machineId: string }>()   // browser WS → info
const pendingRequests = new Map<string, WebSocket>()            // msgId → browser WS

// WS paths:
// /api/agent-ws   — agent connect vào, register machineId
// /api/ws         — browser connect vào, machineId trong query

// HTTP:
// POST /api/auth/login  — browser login, forward đến agent qua WS
// GET  /port/:machineId/:port/* — port forwarding qua WS
// GET  /api/agents      — dashboard: list online agents
// /*   — Next.js pages (editor UI, dashboard)
```

#### 2.3 Next.js pages

```
relay/app/
├── page.tsx                    # Home/connect page (gõ machine ID)
├── dashboard/page.tsx          # Admin: danh sách agents
├── editor/[machineId]/page.tsx # VS Code editor remote
└── login/page.tsx              # Redirect → page.tsx
```

- `page.tsx` (home): form nhập Machine ID + Password → connect
- `editor/[machineId]/page.tsx`: Load AppShell editor, machineId từ URL params
- `dashboard/page.tsx`: Bảng agents online/offline, kick, stats

#### 2.4 Browser client changes

- `AuthProvider`: lưu machineId + token, redirect sang `/editor/[machineId]`
- `WebSocketProvider`: WS URL = `/api/ws?machineId=xxx&token=xxx`
- `PortsPanel`: port URL = `/port/${machineId}/${port}/`
- `auth.ts`: thêm `getMachineId()`, `setMachineId()`

#### 2.5 Env vars

```
# Relay
RELAY_SECRET=xxx     # agent phải gửi khi register
PORT=9001

# Agent
RELAY_URL=wss://relay.example.com/api/agent-ws
AGENT_SECRET=xxx     # = RELAY_SECRET
```

---

## Files summary

### Agent — tạo mới
| File | Mô tả |
|------|--------|
| `agent/src/handlers/auth.ts` | WS auth login |
| `agent/src/handlers/portProxy.ts` | HTTP-over-WS port proxy |
| `agent/src/relay/relayClient.ts` | WS client → relay |
| `agent/src/server/local.ts` | Localhost HTTP cho agent UI |
| `agent/ui/index.html` | Agent UI (ID, password, connect form) |

### Agent — xóa
| File | Lý do |
|------|-------|
| `agent/src/server/websocket.ts` | Không còn WS server |
| `agent/src/server/http.ts` | Thay bằng local.ts |
| `agent/src/server/adminRoutes.ts` | Admin chuyển sang relay |
| `agent/src/server/adminUi.ts` | Không cần |
| `agent/src/auth/middleware.ts` | Relay xử lý |
| `agent/public/index.html` | Thay bằng ui/index.html |

### Agent — sửa
| File | Thay đổi |
|------|----------|
| `agent/src/index.ts` | Viết lại: local server + relay client |
| `agent/src/protocol.ts` | Thêm message types |
| `agent/src/handlers/router.ts` | Thêm auth + port proxy routing |
| `agent/src/types/config.types.ts` | relayUrl, agentSecret; bỏ port/origins |
| `agent/src/services/configStore.ts` | Defaults mới |

### Relay — sửa từ client/
| File | Thay đổi |
|------|----------|
| `server.ts` | Viết lại: relay hub |
| `app/page.tsx` | Home/connect page |
| `app/editor/[machineId]/page.tsx` | Editor theo machineId |
| `app/dashboard/page.tsx` | Admin dashboard |
| `lib/auth/auth.ts` | Thêm machineId |
| `lib/ws/protocol.ts` | Sync MSG types |
| `components/providers/AuthProvider.tsx` | machineId context |
| `components/providers/WebSocketProvider.tsx` | machineId URL |
| `components/ports/PortsPanel.tsx` | URL /port/:machineId/:port/ |

---

## Thứ tự implement

```
Phase 1: Agent
 1. agent/src/protocol.ts           — thêm types
 2. agent/src/handlers/auth.ts      — tạo mới
 3. agent/src/handlers/portProxy.ts — tạo mới
 4. agent/src/handlers/router.ts    — thêm routing
 5. agent/src/types/config.types.ts — sửa config
 6. agent/src/services/configStore.ts — defaults
 7. agent/src/relay/relayClient.ts  — tạo mới (core)
 8. agent/src/server/local.ts       — tạo mới
 9. agent/ui/index.html             — tạo mới
10. agent/src/index.ts              — viết lại
11. Xóa files cũ

Phase 2: Relay
12. Rename client/ → relay/
13. relay/server.ts                 — viết lại relay hub
14. relay/app/page.tsx              — connect page
15. relay/app/editor/[machineId]/page.tsx — dynamic editor
16. relay/app/dashboard/page.tsx    — admin dashboard
17. relay/lib/auth/auth.ts          — machineId helpers
18. relay/lib/ws/protocol.ts        — sync types
19. relay/components/providers/AuthProvider.tsx — machineId
20. relay/components/providers/WebSocketProvider.tsx — machineId URL
21. relay/components/ports/PortsPanel.tsx — URL mới

Phase 3: Test
22. Build agent + relay
23. Start relay, start agent, test connect
```
