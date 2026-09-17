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

### `opencode setup` (khuyến nghị)

Package `@hanoilab/opencode` là **public trên npm**, không bake sẵn relay URL/secret của ai cả —
mỗi người tự host relay riêng, nên **bắt buộc** phải tự cấu hình trước khi `opencode start` chạy
được:

```bash
opencode setup --url wss://relay-của-bạn.example.com --secret bí-mật-của-bạn
# hoặc kiểu vị trí (không cần flag):
opencode setup wss://relay-của-bạn.example.com bí-mật-của-bạn
```

Chỉ cần nhập **base URL** — `/api/agent-ws` được tự thêm vào, khỏi phải nhớ/gõ đúng path.

Chưa biết URL/secret của relay nào để dùng? Nếu người quản trị relay đó có bật `CONTACT_EMAIL`/
`CONTACT_URL`, mở Admin UI (`http://localhost:9000`) → Settings → sẽ thấy 2 nút "Request via
email" / "Open landing page" cạnh ô Relay Secret.

Xem/đổi lại sau này:
- CLI: chạy `opencode setup` không kèm gì để xem URL/secret hiện tại (secret hiện dạng `xxxx****`).
- Admin UI: mở Settings → sửa trực tiếp ô **Relay URL**/**Relay Secret** → Save (tự reconnect
  ngay, không cần restart).

### Biến môi trường (`.env`) — tuỳ chọn, ghi đè `opencode setup`

Tạo file `.env` tại thư mục chạy agent (hoặc `~/.opencode/.env`) nếu muốn set qua env thay vì
CLI/UI — **lưu ý: env var luôn ưu tiên cao hơn config đã lưu**, nên nếu để sót file `.env` cũ
chứa `RELAY_SECRET` lỗi thời, nó sẽ âm thầm đè lên secret mới bạn vừa `opencode setup`, gây lỗi
`Invalid secret` khó hiểu — xoá file này đi nếu không còn dùng:

| Biến | Mô tả |
|------|-------|
| `RELAY_SECRET` | Shared secret giữa agent và relay (ghi đè config đã lưu) |
| `RELAY_URL` | WebSocket URL của relay (ghi đè config đã lưu) |
| `WORKSPACE_ROOT` | Thư mục workspace mặc định |
| `LOCAL_PORT` | Port Admin UI (mặc định: 9000) |
| `CONTACT_EMAIL` | Tuỳ chọn — hiện nút "Request via email" trong Admin UI (Settings) |
| `CONTACT_URL` | Tuỳ chọn — hiện nút "Open landing page" trong Admin UI (Settings) |

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
| `opencode setup --url <url> --secret <secret>` | Cấu hình relay URL + secret (không kèm gì để xem config hiện tại) |
| `opencode run` | Chạy foreground (phát triển) |
| `opencode start` | Khởi động agent (background) |
| `opencode stop` | Dừng agent |
| `opencode restart` | Khởi động lại |
| `opencode status` | Xem trạng thái |
| `opencode id` | Hiện Machine ID |
| `opencode password` | Hiện hoặc đặt lại password |
| `opencode config` | Mở Admin UI trong browser |
| `opencode logs [-f]` | Xem log (`-f` để theo dõi realtime, tự poll mỗi 5s — không cần `tail`) |
| `opencode install` | Đăng ký system service |
| `opencode uninstall` | Gỡ system service |
| `opencode upgrade [version]` | Cập nhật agent lên bản mới nhất (hoặc bản chỉ định) |
| `opencode purge --yes` | Gỡ hoàn toàn agent khỏi máy |
