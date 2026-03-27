# Xác thực

## Tổng quan

VS Code Remote sử dụng mô hình xác thực tương tự AnyDesk: mỗi máy có một **Machine ID** cố định và **passwords** để xác thực kết nối.

## Machine ID

- Mã định danh 9 chữ số duy nhất cho mỗi máy (vd: `123-456-789`)
- **Derive từ hardware**: Sử dụng SHA-256 hash của hostname + MAC address + CPU info
- **Cố định**: Không thay đổi khi restart, chỉ thay đổi khi thay đổi hardware
- **Lưu trữ**: Trong `agent/data/config.json`

### Cách hoạt động

```
hostname + MAC + CPU → SHA-256 → lấy 9 digits → Machine ID
```

Machine ID được hiển thị trên Admin UI và dùng để kết nối từ xa.

## Passwords

Agent hỗ trợ 2 loại password:

### Random Password
- Tự động sinh khi agent khởi tạo lần đầu
- Hiển thị trên Admin UI (localhost)
- Có thể **Regenerate** bất kỳ lúc nào
- Thích hợp cho truy cập tạm thời

### Fixed Password
- Người dùng tự set qua Admin UI
- Không hiển thị trên UI (chỉ người set mới biết)
- Không thay đổi cho đến khi người dùng thay đổi
- Thích hợp cho truy cập thường xuyên

### Lưu trữ Password

- Passwords được hash bằng **bcrypt** trước khi lưu
- Random password lưu thêm `displayValue` (plaintext) để hiển thị trên Admin UI
- Fixed password chỉ lưu hash, không có `displayValue`
- File config: `agent/data/config.json`

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
  2. Agent verify password (random hoặc fixed)
  3. Trả về JWT token
  4. Browser lưu token, dùng cho các request tiếp theo
```

### JWT Token

- Payload: `{ machineId, iat, exp }`
- Hết hạn: 24 giờ
- Dùng để xác thực các WebSocket message sau khi login

## Bảo mật

- Passwords lưu dưới dạng bcrypt hash (cost factor 10)
- JWT secret tự động sinh, lưu trong config
- Admin UI chỉ serve trên `127.0.0.1` (localhost) — không truy cập từ bên ngoài
- Token chỉ có hiệu lực 24h
- Relay server chỉ forward messages, không lưu password
