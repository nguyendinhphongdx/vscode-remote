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

Chạy trên máy cần truy cập từ xa. Package npm: `@hanoilab/opencode`. Cung cấp:

| Module | Chức năng |
|--------|-----------|
| **File System** | Đọc/ghi/xoá file, theo dõi thay đổi (chokidar) |
| **Terminal** | Tạo/quản lý terminal sessions (node-pty), hỗ trợ nhiều loại shell |
| **Git** | Status, stage, unstage, commit, diff, discard |
| **Phát hiện Port** | Tự động phát hiện ports đang listen (ss/lsof/netstat) |
| **Port Forwarding** | Tạo Cloudflare Tunnel cho ports |
| **Xác thực** | Machine ID, quản lý password (bcrypt), JWT |
| **Admin UI** | Giao diện web quản lý agent (chỉ localhost) |

Agent kết nối **outbound** tới relay server — không cần mở port trên firewall.

### Relay Server

Trung gian giữa browser và agent, xây dựng trên **Express + Next.js**:

- **Next.js** phục vụ Editor UI (React)
- **Express** xử lý API routes với rate limiting
- **WebSocket** proxy: chuyển tiếp messages giữa browser và agent
- **Agent registry**: Quản lý danh sách agents đã kết nối
- **Auth proxy**: Chuyển tiếp yêu cầu đăng nhập tới agent để xác minh
- **Admin dashboard**: Quản lý agents (bảo vệ bằng mật khẩu riêng)

#### Endpoints

| Đường dẫn | Mô tả |
|------------|-------|
| `/api/agent-ws` | WebSocket cho agent kết nối |
| `/api/ws?machineId=xxx` | WebSocket cho browser kết nối |
| `/api/auth/login` | Chuyển tiếp đăng nhập tới agent |
| `/api/admin/*` | API quản trị (login, check, logout) |
| `/api/agents` | Danh sách agents đang kết nối (cần xác thực admin) |
| `/editor/:machineId` | Editor UI cho máy cụ thể |

### Browser Editor

- **Monaco Editor**: Code editor với syntax highlighting
- **xterm.js**: Terminal emulator
- **File Explorer**: Duyệt và quản lý files, tự động cập nhật khi có thay đổi
- **Source Control**: Tích hợp Git (stage, commit, diff, discard)
- **Ports Panel**: Quản lý port forwarding
- **Voice Input**: Nhập liệu bằng giọng nói cho terminal (Web Speech API)

## Giao thức (Protocol)

Tất cả message truyền qua WebSocket sử dụng package chung `@vscode-remote/shared`:

### Request

```json
{
  "id": "unique-uuid",
  "type": "fs:read",
  "payload": { "path": "/home/user/file.ts" }
}
```

### Response

```json
{
  "id": "same-uuid",
  "type": "fs:read",
  "success": true,
  "payload": { "content": "..." }
}
```

### Các loại Message

| Prefix | Mô tả |
|--------|-------|
| `auth:*` | Xác thực (login, verify) |
| `fs:*` | File system (list, read, write, create, delete, rename, stat, watch) |
| `terminal:*` | Terminal (shells, create, input, output, resize, close, exit) |
| `git:*` | Git (status, stage, stage-all, unstage, unstage-all, discard, commit, diff) |
| `port:*` | Quản lý port (list, forward, unforward) |
| `workspace:*` | Workspace (info, browse, change) |

## Bảo mật

- **Xác thực first-message**: JWT token được gửi qua message đầu tiên sau khi kết nối WebSocket, không qua URL
- **RELAY_SECRET**: Shared secret giữa agent và relay, cấu hình qua biến môi trường
- **CORS**: Whitelist origins, cấu hình qua `ALLOWED_ORIGINS`
- **Rate limiting**: Giới hạn số lần đăng nhập (chống brute force)
- **Timing-safe**: So sánh mật khẩu admin dùng `crypto.timingSafeEqual`
- **File permissions**: Config file có quyền 0600 (chỉ owner đọc/ghi)

## Luồng dữ liệu

### Đọc file

```
Browser               Relay                Agent
  │ fs:read ──────────►│ chuyển tiếp ──────►│
  │                     │                    │ đọc file từ disk
  │◄────────── payload ─│◄────────── data ───│
```

### Terminal

```
Browser               Relay                Agent
  │ terminal:create ───►│ ─────────────────►│ spawn pty
  │                     │                    │
  │ terminal:input ────►│ ─────────────────►│ ghi vào pty
  │◄── terminal:output ─│◄────── pty data ──│ (event stream)
```

### Port Forwarding

```
Browser               Relay                Agent              Cloudflare
  │ port:forward ──────►│ ─────────────────►│                    │
  │                     │                    │ spawn cloudflared ─►│
  │                     │                    │◄── tunnel URL ──────│
  │◄───── tunnelUrl ────│◄── tunnelUrl ─────│                    │
```
