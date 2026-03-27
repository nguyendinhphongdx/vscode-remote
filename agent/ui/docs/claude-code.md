# Cài đặt Claude Code

## Tổng quan

[Claude Code](https://claude.ai/claude-code) là công cụ CLI của Anthropic, cho phép bạn sử dụng AI trực tiếp trong terminal. Kết hợp với VS Code Remote, bạn có thể dùng Claude Code trên máy remote thông qua terminal từ xa.

## Cài đặt

### macOS / Linux

```bash
# Cài đặt qua npm
npm install -g @anthropic-ai/claude-code

# Hoặc dùng script cài đặt
curl -fsSL https://claude.ai/install.sh | sh
```

### Windows

```powershell
# Cài đặt qua npm
npm install -g @anthropic-ai/claude-code

# Hoặc dùng script PowerShell
irm https://claude.ai/install.ps1 | iex
```

### Xử lý lỗi PATH sau cài đặt

Nếu sau khi cài đặt, lệnh `claude` không được nhận diện:

**Windows (PowerShell):**
```powershell
# Thêm vào PATH tạm thời (phiên hiện tại)
$env:PATH += ";$env:USERPROFILE\.local\bin"

# Thêm vào PATH vĩnh viễn
[Environment]::SetEnvironmentVariable("PATH", [Environment]::GetEnvironmentVariable("PATH", "User") + ";$env:USERPROFILE\.local\bin", "User")
```

Sau khi thêm PATH vĩnh viễn, mở terminal mới để áp dụng.

**Linux/macOS:**
```bash
# Thêm vào ~/.bashrc hoặc ~/.zshrc
export PATH="$HOME/.local/bin:$PATH"

# Áp dụng ngay
source ~/.bashrc  # hoặc source ~/.zshrc
```

## Sử dụng

```bash
# Kiểm tra phiên bản
claude --version

# Bắt đầu hội thoại
claude

# Chạy lệnh trực tiếp
claude "giải thích đoạn code này"

# Xem trợ giúp
claude --help
```

## Sử dụng qua VS Code Remote

1. Mở terminal trong VS Code Remote
2. Chạy `claude` hoặc `claude "câu hỏi của bạn"`
3. Claude Code sẽ có quyền truy cập vào toàn bộ file system của workspace

> **Mẹo**: Bạn có thể cài đặt Claude Code trên máy remote (agent) để sử dụng trực tiếp qua terminal từ xa, thay vì cài trên máy local.
