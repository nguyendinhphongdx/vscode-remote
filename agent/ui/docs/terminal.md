# Terminal

## Tổng quan

VS Code Remote cung cấp terminal từ xa thông qua **node-pty** và **xterm.js**. Bạn có thể tạo nhiều terminal sessions đồng thời và sử dụng như terminal local.

## Nguyên lý hoạt động

```
xterm.js (Browser) ←→ WebSocket ←→ node-pty (Agent)
```

1. Browser gửi `terminal:create` để tạo terminal mới
2. Agent spawn một PTY process (bash/zsh/powershell)
3. User gõ phím → `terminal:input` → ghi vào PTY
4. PTY output → `terminal:output` event → hiển thị trên xterm.js
5. Resize cửa sổ → `terminal:resize` → PTY resize

## Các thao tác

| Message | Mô tả |
|---------|-------|
| `terminal:create` | Tạo terminal mới, trả về `terminalId` |
| `terminal:input` | Gửi keystroke/data vào terminal |
| `terminal:output` | Nhận output từ terminal (event) |
| `terminal:resize` | Thay đổi kích thước terminal (cols, rows) |
| `terminal:close` | Đóng terminal |
| `terminal:exit:event` | Terminal process thoát (event) |

## Giới hạn

- Số terminal tối đa: cấu hình trong `maxTerminals` (mặc định: 5)
- Mỗi terminal là một PTY process riêng biệt
- Terminal session không persist khi reload trang — các process tiếp tục chạy nhưng mất kết nối

## Shell mặc định

Agent sử dụng shell mặc định của hệ thống:
- **Linux/macOS**: `$SHELL` hoặc `/bin/bash`
- **Windows**: `powershell.exe`

## Mẹo sử dụng

- Sử dụng **Ctrl+C** để huỷ lệnh như bình thường
- **Ctrl+D** để đóng terminal
- Terminal tự động resize khi bạn thay đổi kích thước panel
- Có thể mở nhiều tab terminal cùng lúc
