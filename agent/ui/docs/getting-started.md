# Bắt đầu

## Tổng quan

VS Code Remote Agent cho phép bạn truy cập và lập trình trên máy tính từ xa thông qua trình duyệt web. Agent chạy trên máy host, kết nối tới Relay Server, và bạn sử dụng trình duyệt để mở editor.

## Kiến trúc

```
Browser (Editor) ←→ Relay Server ←→ Agent (Máy host)
```

- **Agent**: Chạy trên máy host, xử lý file system, terminal, git, ports
- **Relay Server**: Trung gian kết nối giữa browser và agent
- **Browser Editor**: Giao diện VS Code trên web

## Cài đặt Agent

### 1. Tải và cài đặt

```bash
# Clone repo
git clone <repo-url>
cd vscode-remote/agent

# Cài dependencies
npm install

# Build
npm run build
```

### 2. Cấu hình

Lần đầu chạy, agent sẽ tự động tạo file cấu hình tại `agent/data/config.json` với:
- **Machine ID**: Mã 9 chữ số cố định cho máy (vd: `123-456-789`)
- **Random Password**: Mật khẩu ngẫu nhiên, hiển thị trên Admin UI
- **JWT Secret**: Tự động sinh

### 3. Chạy Agent

```bash
npm start
```

Agent sẽ khởi động và hiển thị:
- Machine ID
- Random Password
- Admin UI URL (mặc định: `http://localhost:9000`)

### 4. Cấu hình Relay

Mở Admin UI tại `http://localhost:9000`, vào **Settings**:
- **Relay URL**: Địa chỉ WebSocket của relay server (vd: `ws://relay.example.com/api/agent-ws`)
- **Agent Secret**: Khoá bí mật để xác thực với relay

## Kết nối từ xa

1. Mở Admin UI trên máy host
2. Nhập **Machine ID** của máy cần kết nối
3. Nhập **Password** (random hoặc fixed)
4. Click **Connect** → Editor sẽ mở trong tab mới
