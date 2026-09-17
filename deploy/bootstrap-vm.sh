#!/usr/bin/env bash
set -euo pipefail

# Chạy 1 LẦN DUY NHẤT trên VM GCP trống (Debian/Ubuntu) để chuẩn bị host relay server.
# Cách chạy (từ máy có gcloud CLI đã auth sẵn):
#   gcloud compute scp deploy/bootstrap-vm.sh <instance>:~ --zone <zone>
#   gcloud compute ssh <instance> --zone <zone> --command "GHA_DEPLOY_PUBKEY='<nội dung .pub>' bash bootstrap-vm.sh"
#
# GHA_DEPLOY_PUBKEY = public key của deploy key riêng cho GitHub Actions (không phải key cá nhân
# của bạn) — dán y hệt 1 dòng "ssh-ed25519 AAAA... github-actions-deploy@vscode-remote".

DEPLOY_USER="deploy"
APP_DIR="/opt/vscode-remote-relay"
REPO_URL="https://github.com/nguyendinhphongdx/vscode-remote.git"
NODE_MAJOR=20

if [ -z "${GHA_DEPLOY_PUBKEY:-}" ]; then
  echo "FATAL: thiếu biến GHA_DEPLOY_PUBKEY (public key deploy của GitHub Actions)." >&2
  exit 1
fi

echo "==> apt update/upgrade"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Cài Node.js ${NODE_MAJOR}.x"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
sudo apt-get install -y nodejs git

echo "==> Bật corepack/pnpm"
sudo corepack enable
sudo corepack prepare pnpm@10 --activate

echo "==> Cài Caddy (reverse proxy, tự xin TLS Let's Encrypt)"
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update -y
sudo apt-get install -y caddy

echo "==> Thêm 1GB swap (build Next.js cần nhiều RAM hơn RAM của VM nhỏ, vd e2-micro/e2-small)"
if [ ! -f /swapfile ]; then
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> Tạo user ${DEPLOY_USER} + thư mục app"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  sudo useradd -m -s /bin/bash "$DEPLOY_USER"
fi
sudo mkdir -p "$APP_DIR"
sudo chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

echo "==> Thêm deploy key của GitHub Actions vào authorized_keys của ${DEPLOY_USER}"
sudo -u "$DEPLOY_USER" mkdir -p "/home/$DEPLOY_USER/.ssh"
echo "$GHA_DEPLOY_PUBKEY" | sudo -u "$DEPLOY_USER" tee -a "/home/$DEPLOY_USER/.ssh/authorized_keys" >/dev/null
sudo chmod 700 "/home/$DEPLOY_USER/.ssh"
sudo chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"

echo "==> Cho phép ${DEPLOY_USER} restart đúng 1 service này mà không cần mật khẩu (không full sudo)"
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart vscode-remote-relay, /bin/systemctl status vscode-remote-relay" \
  | sudo tee "/etc/sudoers.d/${DEPLOY_USER}-relay" >/dev/null
sudo chmod 440 "/etc/sudoers.d/${DEPLOY_USER}-relay"

echo "==> Clone repo (nếu chưa có)"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$DEPLOY_USER" git clone "$REPO_URL" "$APP_DIR"
fi

cat <<'EOF'

==> Xong phần cài đặt. Các bước còn lại (thủ công, làm 1 lần):

1. Tạo file env cho service:
   sudo -u deploy tee /opt/vscode-remote-relay/.env <<'ENV'
   NODE_ENV=production
   PORT=9001
   RELAY_SECRET=<sinh ngẫu nhiên, vd: openssl rand -hex 32 — PHẢI khớp giá trị đặt trên agent>
   ADMIN_PASSWORD=<mật khẩu trang admin>
   ALLOWED_ORIGINS=<origin của voxta, vd: https://voxta.yourdomain.com>
   ENV

2. Copy 2 file cấu hình từ repo đã clone vào đúng chỗ hệ thống:
   sudo cp /opt/vscode-remote-relay/deploy/vscode-remote-relay.service /etc/systemd/system/
   sudo cp /opt/vscode-remote-relay/deploy/Caddyfile /etc/caddy/Caddyfile
   # Sửa domain thật trong /etc/caddy/Caddyfile trước khi reload.

3. Build lần đầu + khởi động service (relay's `prebuild` script tự build `shared` trước):
   cd /opt/vscode-remote-relay
   sudo -u deploy corepack pnpm install --frozen-lockfile
   sudo -u deploy pnpm --filter client build
   sudo systemctl daemon-reload
   sudo systemctl enable --now vscode-remote-relay
   sudo systemctl reload caddy

4. Mở firewall GCP cho 80/443 — chạy TỪ MÁY CÓ gcloud CLI (không phải trên VM):
   gcloud compute firewall-rules create allow-http-https \
     --allow=tcp:80,tcp:443 --target-tags=http-server,https-server
   gcloud compute instances add-tags <instance-name> --zone <zone> \
     --tags=http-server,https-server
EOF
