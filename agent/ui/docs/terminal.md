# Terminal

## Tổng quan

VS Code Remote cung cấp terminal từ xa thông qua **node-pty** và **xterm.js**. Bạn có thể tạo nhiều terminal sessions đồng thời và sử dụng như terminal trên máy local.

## Nguyên lý hoạt động

```
xterm.js (Browser) ←→ WebSocket ←→ node-pty (Agent)
```

1. Browser gửi `terminal:create` để tạo terminal mới
2. Agent spawn một PTY process với shell được chọn
3. User gõ phím → `terminal:input` → ghi vào PTY
4. PTY output → `terminal:output` event → hiển thị trên xterm.js
5. Thay đổi kích thước cửa sổ → `terminal:resize` → PTY resize

## Các thao tác

| Message | Mô tả |
|---------|-------|
| `terminal:shells` | Lấy danh sách shells có sẵn trên máy host |
| `terminal:create` | Tạo terminal mới, trả về `terminalId` |
| `terminal:input` | Gửi keystroke/dữ liệu vào terminal |
| `terminal:output` | Nhận output từ terminal (event) |
| `terminal:resize` | Thay đổi kích thước terminal (cols, rows) |
| `terminal:close` | Đóng terminal |
| `terminal:exit:event` | Terminal process thoát (event) |

## Chọn loại Shell

Agent tự động phát hiện các shell có sẵn trên máy host:

### Windows

| Shell | Đường dẫn |
|-------|-----------|
| PowerShell | `powershell.exe` |
| Command Prompt | `cmd.exe` |
| Git Bash | `C:\Program Files\Git\bin\bash.exe` |

### Linux/macOS

| Shell | Đường dẫn |
|-------|-----------|
| Bash | `/bin/bash` |
| Zsh | `/bin/zsh` |
| sh | `/bin/sh` |

Trên giao diện, nút **+** tạo terminal với shell mặc định. Click mũi tên ▾ bên cạnh để chọn loại shell khác. Chỉ hiện các shell thực sự có trên máy.

## Nhập liệu bằng giọng nói

Trên thiết bị di động, sử dụng nút **mic** trên thanh terminal:

- **Nhấn giữ** nút mic để nói
- **Thả ra** để chuyển giọng nói thành văn bản và gửi vào terminal
- Sử dụng Web Speech API (có sẵn trong trình duyệt, không cần cài đặt thêm)
- Nút mic chỉ hiển thị khi trình duyệt hỗ trợ Speech Recognition

## Giới hạn

- Số terminal tối đa: cấu hình trong `maxTerminals` (mặc định: 5)
- Mỗi terminal là một PTY process riêng biệt
- Terminal session không lưu lại khi tải lại trang — các process tiếp tục chạy nhưng mất kết nối hiển thị

## Mẹo sử dụng

- Sử dụng **Ctrl+C** để huỷ lệnh như bình thường
- **Ctrl+D** để đóng terminal
- Terminal tự động thay đổi kích thước khi bạn thay đổi kích thước panel
- Có thể mở nhiều tab terminal cùng lúc
- Phím tắt **Ctrl+`** để mở/ẩn panel terminal
