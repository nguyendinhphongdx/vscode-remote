# Xác thực

## Tổng quan

VS Code Remote sử dụng mô hình xác thực tương tự TeamViewer/AnyDesk: mỗi máy có một **Machine ID** cố định và **passwords** để xác thực kết nối.

## Machine ID

- Mã định danh 9 chữ số duy nhất cho mỗi máy (ví dụ: `948-636-309`)
- **Tạo từ hardware**: SHA-256 hash của hostname + MAC address + CPU info
- **Cố định**: Không thay đổi khi restart, chỉ thay đổi khi phần cứng thay đổi
- **Lưu trữ**: Trong `~/.opencode/config.json`

## Passwords

Agent hỗ trợ 2 loại password:

### Random Password

- Tự động sinh khi agent khởi tạo lần đầu
- **Luôn hiển thị** trên Admin UI (giống TeamViewer)
- Có nút **Regenerate** để tạo mật khẩu mới bất kỳ lúc nào
- Thích hợp cho truy cập tạm thời
- API regenerate: `POST /api/password/regenerate`

### Fixed Password

- Người dùng tự đặt qua CLI: `opencode password`
- Không hiển thị trên UI (chỉ người đặt mới biết)
- Không thay đổi cho đến khi người dùng thay đổi
- Thích hợp cho truy cập thường xuyên

### Lưu trữ Password

- Passwords được hash bằng **bcrypt** (cost factor 10) trước khi lưu
- Random password lưu thêm `displayValue` (plaintext) để hiển thị trên Admin UI
- Fixed password chỉ lưu hash, không có `displayValue`
- File config: `~/.opencode/config.json` (quyền 0600 — chỉ owner đọc/ghi)

```json
{
  "passwords": {
    "random": {
      "hash": "$2b$10$...",
      "displayValue": "aB3xK9mQ"
    },
    "fixed": {
      "hash": "$2b$10$..."
    }
  }
}
```

## Luồng đăng nhập

```
Browser → Relay → Agent
  1. Gửi { machineId, password }
  2. Relay chuyển tiếp tới agent qua WebSocket
  3. Agent xác minh password (random hoặc fixed) bằng bcrypt
  4. Nếu đúng → trả về JWT token
  5. Browser lưu token vào sessionStorage
```

## Xác thực WebSocket (First-message Auth)

Token **không** được truyền qua URL. Thay vào đó:

1. Browser kết nối WebSocket: `ws://relay/api/ws?machineId=xxx` (chỉ machineId, không có token)
2. Relay chấp nhận kết nối, đặt trạng thái "chờ xác thực"
3. Browser gửi message đầu tiên: `{ type: "auth:authenticate", payload: { token } }`
4. Relay chuyển tiếp xác minh token tới agent
5. Nếu hợp lệ → đánh dấu "đã xác thực", bắt đầu chuyển tiếp messages
6. Nếu không hợp lệ → gửi lỗi, đóng kết nối
7. Timeout 10 giây — nếu không xác thực thì đóng kết nối

### JWT Token

- Payload: `{ machineId, iat, exp }`
- Hết hạn: 24 giờ
- Secret: tự động sinh ngẫu nhiên (64 bytes), lưu trong config

## Xác thực Agent ↔ Relay

Agent kết nối tới relay và gửi `RELAY_SECRET` để đăng ký:

```
Agent → Relay
  1. Kết nối WebSocket tới /api/agent-ws
  2. Gửi { type: "agent:register", payload: { machineId, secret } }
  3. Relay xác minh secret khớp với RELAY_SECRET
  4. Nếu đúng → đăng ký agent, sẵn sàng nhận kết nối từ browser
```

## Bảo mật

- Passwords lưu dưới dạng bcrypt hash (cost factor 10)
- JWT secret tự động sinh, lưu trong config (quyền 0600)
- Admin UI chỉ phục vụ trên `127.0.0.1` (localhost) — không truy cập từ bên ngoài
- Token chỉ có hiệu lực 24 giờ
- Relay server chỉ chuyển tiếp messages, không lưu password
- Rate limiting: giới hạn 10 lần đăng nhập/phút/IP
- Token truyền qua WebSocket message, không bao giờ xuất hiện trong URL
