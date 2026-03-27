# File System

## Tổng quan

Agent cung cấp truy cập file system của máy host thông qua WebSocket messages. Browser Editor có thể duyệt, đọc, ghi, tạo, xoá, và đổi tên files.

## Các thao tác

| Message | Payload | Mô tả |
|---------|---------|-------|
| `fs:list` | `{ path }` | Liệt kê files/folders trong thư mục |
| `fs:read` | `{ path }` | Đọc nội dung file |
| `fs:write` | `{ path, content }` | Ghi nội dung vào file |
| `fs:create` | `{ path, type }` | Tạo file hoặc folder mới |
| `fs:delete` | `{ path }` | Xoá file hoặc folder |
| `fs:rename` | `{ oldPath, newPath }` | Đổi tên hoặc di chuyển file |
| `fs:stat` | `{ path }` | Lấy thông tin file (kích thước, loại, thời gian sửa đổi) |

## Theo dõi thay đổi file (File Watching)

Agent sử dụng **chokidar** để theo dõi thay đổi file system trong workspace:

```
Agent (chokidar) → fs:watch:event → Relay → Browser
```

Các sự kiện:

- `add` — File mới được tạo
- `change` — File thay đổi nội dung
- `unlink` — File bị xoá
- `addDir` — Folder mới
- `unlinkDir` — Folder bị xoá

### Tự động cập nhật file đang mở

Khi một file đang mở trong editor bị thay đổi từ bên ngoài (terminal, git, tiến trình khác):

- **File chưa chỉnh sửa** (không dirty): Tự động cập nhật nội dung mới ngay lập tức
- **File đang chỉnh sửa** (dirty): Chỉ cập nhật baseline — nội dung người dùng đang sửa được giữ nguyên, trạng thái dirty chính xác

Browser cũng tự động cập nhật File Explorer khi nhận các sự kiện này.

## Workspace Root

- Cấu hình trong `settings.workspaceRoot` hoặc biến môi trường `WORKSPACE_ROOT`
- Mặc định: thư mục home của user chạy agent
- Có thể thay đổi qua Admin UI, CLI, hoặc khi chọn workspace trong editor

## Giới hạn

- **Kích thước file tối đa**: Cấu hình trong `maxFileSize` (mặc định: 10MB)
- File nhị phân (binary) không được hỗ trợ đọc/ghi qua editor
- Symbolic links được theo dõi (follow)
- Hidden files (bắt đầu bằng `.`) được hiển thị trong File Explorer

## Bảo mật

- Agent chỉ cho phép truy cập trong workspace root và các thư mục con
- Path traversal (`../`) được chặn
- Các thao tác file system chạy với quyền của user chạy agent process
