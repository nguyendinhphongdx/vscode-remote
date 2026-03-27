# Kiến trúc

## Tổng quan

VS Code Remote sử dụng kiến trúc **Relay** để kết nối browser với máy remote mà không cần port forwarding hay VPN.

```
┌─────────────┐        ┌──────────────┐        ┌─────────────┐
│   Browser    │◄──────►│ Relay Server │◄──────►│    Agent    │
│  (Editor)    │  WS    │  (Next.js)   │   WS   │  (Node.js)  │
└─────────────┘        └──────────────┘        └─────────────┘
```

## Thành phần

### Agent (Máy host)

Chạy trên máy cần truy cập từ xa. Cung cấp:

| Module | Chức năng |
|--------|-----------|
| **File System** | Đọc/ghi/xoá file, watch thay đổi (chokidar) |
| **Terminal** | Tạo/quản lý terminal sessions (node-pty + xterm) |
| **Git** | Status, stage, commit, diff |
| **Port Detection** | Phát hiện ports đang listen (ss/lsof/netstat) |
| **Port Forwarding** | Tạo Cloudflare Tunnel cho ports |
| **Auth** | Machine ID, quản lý password, JWT |
| **Admin UI** | Web UI để quản lý agent (chỉ localhost) |

Agent kết nối **outbound** tới relay server — không cần mở port trên firewall.

### Relay Server

Trung gian giữa browser và agent:

- **Next.js** app phục vụ Editor UI
- **WebSocket** proxy: forward messages giữa browser và agent
- **Agent registry**: Quản lý danh sách agents đã kết nối
- **Auth proxy**: Forward login requests tới agent để verify

#### Endpoints

| Đường dẫn | Mô tả |
|------------|-------|
| `/api/agent-ws` | WebSocket cho agent kết nối |
| `/api/ws?machineId=xxx` | WebSocket cho browser kết nối |
| `/api/auth/login` | Forward login tới agent |
| `/editor/:machineId` | Editor UI cho máy cụ thể |

### Browser Editor

- **Monaco Editor**: Code editor với syntax highlighting
- **xterm.js**: Terminal emulator
- **File Explorer**: Duyệt và quản lý files
- **Source Control**: Tích hợp Git
- **Ports Panel**: Quản lý port forwarding

## Giao thức (Protocol)

Mọi message truyền qua WebSocket có dạng:

```json
{
  "id": "unique-id",
  "type": "fs:read",
  "payload": { "path": "/home/user/file.ts" }
}
```

Response:

```json
{
  "id": "same-id",
  "type": "fs:read",
  "success": true,
  "payload": { "content": "..." }
}
```

### Các loại Message

| Prefix | Mô tả |
|--------|-------|
| `auth:*` | Xác thực (login) |
| `fs:*` | File system (list, read, write, delete, rename, stat, watch) |
| `terminal:*` | Terminal (create, input, output, resize, close) |
| `git:*` | Git (status, stage, commit, diff, discard) |
| `port:*` | Quản lý port (list, forward, unforward) |
| `workspace:*` | Workspace (info, browse, change) |

## Luồng dữ liệu

### Đọc file

```
Browser               Relay                Agent
  │ fs:read ──────────►│ forward ──────────►│
  │                     │                    │ đọc file từ disk
  │◄────────── payload ─│◄────────── data ───│
```

### Terminal

```
Browser               Relay                Agent
  │ terminal:create ───►│ ─────────────────►│ spawn pty
  │                     │                    │
  │ terminal:input ────►│ ─────────────────►│ ghi vào pty
  │◄── terminal:output ─│◄────── pty data ───│ (event stream)
```

### Port Forwarding

```
Browser               Relay                Agent              Cloudflare
  │ port:forward ──────►│ ─────────────────►│                    │
  │                     │                    │ spawn cloudflared ─►│
  │                     │                    │◄── tunnel URL ──────│
  │◄───── tunnelUrl ────│◄── tunnelUrl ──────│                    │
  │                     │                    │                    │
  │ mở(tunnelUrl) ─────────────────────────────────────────────►│
  │◄──── HTTP response ──────────────────────◄── proxy tới local ─│
```
