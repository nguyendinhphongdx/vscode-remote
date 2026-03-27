# File System

## Tổng quan

Agent cung cấp truy cập file system của máy host thông qua WebSocket messages. Browser Editor có thể duyệt, đọc, ghi, tạo, xoá, và rename files.

## Các thao tác

| Message | Payload | Mô tả |
|---------|---------|-------|
| `fs:list` | `{ path }` | Liệt kê files/folders trong directory |
| `fs:read` | `{ path }` | Đọc nội dung file |
| `fs:write` | `{ path, content }` | Ghi nội dung vào file |
| `fs:create` | `{ path, type }` | Tạo file hoặc folder mới |
| `fs:delete` | `{ path }` | Xoá file hoặc folder |
| `fs:rename` | `{ oldPath, newPath }` | Đổi tên/di chuyển file |
| `fs:stat` | `{ path }` | Lấy thông tin file (size, type, modified) |

## File Watching

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

Browser tự động cập nhật File Explorer khi nhận các events này.

## Workspace Root

- Cấu hình trong `settings.workspaceRoot`
- Mặc định: home directory của user chạy agent
- Có thể thay đổi qua Admin UI hoặc khi chọn workspace trong editor

## Giới hạn

- **Max file size**: Cấu hình trong `maxFileSize` (mặc định: 10MB)
- File nhị phân (binary) không được hỗ trợ đọc/ghi qua editor
- Symbolic links được follow
- Hidden files (bắt đầu bằng `.`) được hiển thị trong File Explorer

## Bảo mật

- Agent chỉ cho phép truy cập trong workspace root và subdirectories
- Path traversal (`../`) được chặn
- File system operations chạy với quyền của user chạy agent process
