# Port Forwarding

## Tổng quan

Port Forwarding cho phép bạn truy cập các dịch vụ chạy trên máy remote từ bên ngoài. Khi bạn forward một port, agent sẽ tạo một **Cloudflare Tunnel** cung cấp URL công khai để truy cập dịch vụ.

## Nguyên lý hoạt động

```
Internet ←→ Cloudflare Tunnel ←→ Agent ←→ localhost:<port>
                                   ↑
                         tiến trình cloudflared
```

1. Bạn nhấn **Forward** trên một port trong panel Ports
2. Agent khởi chạy `cloudflared tunnel --url http://localhost:<port>`
3. Cloudflared tạo một URL công khai dạng `https://xxx.trycloudflare.com`
4. URL được hiển thị trong panel, bạn có thể nhấn để mở hoặc sao chép

## Yêu cầu

### Cloudflared

Agent sử dụng [cloudflared](https://github.com/cloudflare/cloudflared) để tạo tunnel. Agent sẽ **tự động cài đặt** cloudflared nếu chưa có:

- Kiểm tra `cloudflared` trong PATH
- Kiểm tra tại `~/.local/bin/cloudflared`
- Nếu chưa có, tự động tải từ GitHub releases và lưu vào `~/.local/bin/`

> **Lưu ý**: Tự động cài đặt chỉ hỗ trợ Linux (amd64/arm64). Trên macOS hoặc Windows, bạn cần cài đặt thủ công.

### Cài đặt thủ công

**macOS:**
```bash
brew install cloudflared
```

**Windows:**
```powershell
winget install Cloudflare.cloudflared
```

**Linux:**
```bash
# amd64
curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ~/.local/bin/cloudflared
chmod +x ~/.local/bin/cloudflared

# arm64
curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o ~/.local/bin/cloudflared
chmod +x ~/.local/bin/cloudflared
```

## Sử dụng

### Forward một port

1. Mở panel **Ports** trong editor (biểu tượng ở Activity Bar)
2. Agent tự động phát hiện các port đang lắng nghe
3. Nhấn nút **Play** (▶) trên port muốn forward
4. Đợi vài giây để cloudflared tạo tunnel
5. URL sẽ hiển thị màu xanh — nhấn để mở

### Các thao tác

| Thao tác | Mô tả |
|----------|-------|
| ▶ Forward | Tạo tunnel cho port |
| ■ Dừng | Đóng tunnel |
| Sao chép URL | Sao chép URL tunnel vào clipboard |
| Mở | Mở URL trong tab mới |

### Lỗi thường gặp

**"Tunnel failed: Failed to install cloudflared"**
- Kiểm tra kết nối internet
- Thử cài đặt cloudflared thủ công (xem hướng dẫn ở trên)

**"Tunnel creation timed out after 30s"**
- Mạng chậm hoặc tường lửa chặn kết nối tới Cloudflare
- Thử lại sau vài giây

**"cloudflared exited with code 1"**
- Port không có dịch vụ nào đang lắng nghe
- Kiểm tra dịch vụ của bạn đang chạy trên port đó

## Phát hiện Port

Agent phát hiện port tự động bằng các cách tuỳ theo hệ điều hành:

| Hệ điều hành | Lệnh | Thông tin |
|---------------|-------|-----------|
| Linux | `ss -tlnp` | Port, PID, tên tiến trình |
| macOS | `lsof -iTCP -sTCP:LISTEN -nP` | Port, PID, tên tiến trình |
| Windows | `netstat -ano` | Port, PID |
| Dự phòng | TCP connect scan | Chỉ số port |

**Port bị bỏ qua**: 22 (SSH), 53 (DNS), 631 (CUPS), 5353 (mDNS)

**Quét dự phòng**: Quét các dải port phổ biến: 3000-3019, 5000-5019, 8000-8019, 8080-8099, và một số port khác (4200, 4321, 9000, 9090...)
