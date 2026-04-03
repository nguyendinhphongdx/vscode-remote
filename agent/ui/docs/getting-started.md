# Bắt đầu

## Tổng quan

VS Code Remote cho phép truy cập môi trường phát triển từ xa thông qua trình duyệt. Hệ thống gồm 3 thành phần:

```
Browser (Editor) ←→ Relay Server ←→ Agent (Máy host)
```

- **Agent** (`@hanoilab/opencode`) — chạy trên máy host, cung cấp file system, terminal, git
- **Relay** — server trung gian, proxy WebSocket giữa browser và agent
- **Browser Editor** — giao diện VS Code chạy trên trình duyệt

## Cài đặt Agent

### Từ npm (khuyến nghị)

```bash
npm install -g @hanoilab/opencode
```

### Từ source

```bash
git clone <repo-url>
cd vscode-remote
npm install
npm run build
```

## Cấu hình

### Biến môi trường (`.env`)

Tạo file `.env` tại thư mục chạy agent:

| Biến | Mô tả |
|------|-------|
| `RELAY_SECRET` | Shared secret giữa agent và relay (bắt buộc) |
| `RELAY_URL` | WebSocket URL của relay (ghi đè giá trị build-time) |
| `WORKSPACE_ROOT` | Thư mục workspace mặc định |
| `LOCAL_PORT` | Port Admin UI (mặc định: 9000) |

### Config tự động

Lần đầu chạy, agent tự tạo config tại `~/.opencode/config.json` gồm:

- **Machine ID** — mã 9 số duy nhất (ví dụ: `948-636-309`)
- **Password** — mật khẩu ngẫu nhiên, hiển thị trên Admin UI và terminal log
- **JWT Secret** — tự sinh, dùng cho token authentication

## Chạy Agent

### Foreground (phát triển/debug)

```bash
opencode run
```

### Background (production)

```bash
opencode start       # Khởi động
opencode stop        # Dừng
opencode restart     # Khởi động lại
opencode status      # Xem trạng thái
```

### Tự khởi động cùng hệ thống

```bash
opencode install     # Đăng ký service
opencode uninstall   # Gỡ service
```

## Kết nối từ xa

1. Mở Admin UI: `http://localhost:9000`
2. Ghi nhớ **Machine ID** và **Password**
3. Trên máy khác, truy cập relay URL và nhập Machine ID + Password
4. Editor mở trong trình duyệt

## Các lệnh CLI

| Lệnh | Mô tả |
|------|-------|
| `opencode run` | Chạy foreground (phát triển) |
| `opencode start` | Khởi động agent (background) |
| `opencode stop` | Dừng agent |
| `opencode restart` | Khởi động lại |
| `opencode status` | Xem trạng thái |
| `opencode id` | Hiện Machine ID |
| `opencode password` | Hiện hoặc đặt lại password |
| `opencode config` | Mở Admin UI trong browser |
| `opencode logs` | Xem log (`-f` để theo dõi realtime) |
| `opencode install` | Đăng ký system service |
| `opencode uninstall` | Gỡ system service |
