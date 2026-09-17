# Deploy relay lên GCP VM qua GitHub Actions

Thay thế Railway (đã hết trial) — relay chạy trực tiếp bằng Node + systemd trên 1 VM GCP, đứng sau
Caddy (tự xin TLS Let's Encrypt), CI/CD qua GitHub Actions SSH vào VM để build + restart.

## 1. Bootstrap VM (làm 1 lần, VM đang trống)

```bash
gcloud compute scp deploy/bootstrap-vm.sh <instance>:~ --zone <zone>
gcloud compute ssh <instance> --zone <zone> \
  --command "GHA_DEPLOY_PUBKEY='<dán nội dung gha_deploy_key.pub>' bash bootstrap-vm.sh"
```

Script cài Node 20, pnpm, Caddy, tạo user `deploy` (không phải root), thêm public key deploy vào
`~deploy/.ssh/authorized_keys`, clone repo vào `/opt/vscode-remote-relay`, và in ra các bước thủ
công còn lại (tạo `.env`, copy `Caddyfile`/`*.service`, build lần đầu, mở firewall).

## 2. DNS (Route 53)

Thêm A record: `vscode-relay.tutorial-aws.com` (hoặc subdomain bạn chọn) → IP tĩnh của VM.

## 3. Mở firewall GCP (chạy từ máy có gcloud CLI, KHÔNG phải trên VM)

```bash
gcloud compute firewall-rules create allow-http-https \
  --allow=tcp:80,tcp:443 --target-tags=http-server,https-server
gcloud compute instances add-tags <instance-name> --zone <zone> \
  --tags=http-server,https-server
```

## 4. GitHub Actions secrets (repo Settings → Secrets and variables → Actions)

| Secret | Giá trị |
|---|---|
| `VM_SSH_KEY` | Nội dung PRIVATE key `gha_deploy_key` (toàn bộ, kể cả dòng BEGIN/END) |
| `VM_HOST` | IP tĩnh (hoặc domain) của VM |
| `VM_USER` | `deploy` |

Workflow [`deploy-relay.yml`](../.github/workflows/deploy-relay.yml) chạy mỗi khi push lên `main`
đụng tới `relay/`, `shared/`, hoặc `deploy/` — SSH vào VM bằng user `deploy`, `git reset --hard
origin/main`, `pnpm run build:relay:full` (script gốc ở root `package.json`, tự build `shared`
trước rồi `relay`), rồi `sudo systemctl restart vscode-remote-relay` (user `deploy` chỉ có đúng
quyền sudo cho lệnh restart/status service này, không có full sudo).

## 5. Cập nhật agent + voxta trỏ về relay mới

- Agent (máy chạy `opencode start`): đặt `RELAY_URL=wss://vscode-relay.tutorial-aws.com/api/agent-ws`
  và `RELAY_SECRET` khớp với giá trị trong `/opt/vscode-remote-relay/.env` trên VM.
- Settings voxta (backend "Terminal Remote (relay)"): Relay URL = `https://vscode-relay.tutorial-aws.com`.

## Rollback nhanh

```bash
ssh deploy@<vm-host>
cd /opt/vscode-remote-relay && git log --oneline -5   # tìm commit cũ muốn quay lại
git reset --hard <commit-cũ> && corepack pnpm install --frozen-lockfile \
  && pnpm run build:relay:full
sudo systemctl restart vscode-remote-relay
```
