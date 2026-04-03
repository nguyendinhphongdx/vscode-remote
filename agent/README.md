# @hanoilab/opencode

Access your dev environment from anywhere. Full VS Code experience in the browser — terminal, file explorer, git, and port forwarding.

## Quick Start

```bash
# Install globally
npm i -g @hanoilab/opencode

# Start the agent
opencode start
```

That's it. You'll see:

```
Machine ID : 940-195-819
Password   : aB3xK9mQ
Admin UI   : http://localhost:9000
Relay      : Connected
```

Open the relay website, enter your Machine ID and password, and start coding.

## Features

- **Browser-based editor** — Syntax highlighting, multi-tab editing, file explorer
- **Integrated terminal** — Full PTY terminal with split panes
- **Git integration** — Stage, commit, diff, and manage branches
- **Port forwarding** — Auto-detect services, create Cloudflare tunnels, preview inline
- **Mobile ready** — Responsive design, installable as PWA
- **Secure** — JWT authentication, encrypted WebSocket connections

## CLI Commands

```bash
opencode start       # Start the agent (background)
opencode stop        # Stop the agent
opencode status      # Check if agent is running
opencode logs        # View agent logs
opencode upgrade     # Upgrade to latest version
opencode purge       # Remove all data and config
```

## Admin Panel

After starting, open `http://localhost:9000` to access the admin panel where you can:

- View your Machine ID and password
- Check relay connection status
- Configure relay server URL
- Browse documentation

## How It Works

```
Your Machine          Relay Server           Browser
+-----------+        +------------+        +---------+
|  opencode | <----> |   relay    | <----> | editor  |
|  (agent)  |  WSS   |  (server)  |  WSS   | (web)   |
+-----------+        +------------+        +---------+
```

The agent runs on your machine and connects to a relay server via WebSocket. You open the relay website from any browser, authenticate with your Machine ID and password, and get a full development environment.

## Requirements

- Node.js 20+
- macOS, Linux, or Windows

## Configuration

Config is stored at `~/.@hanoilab/opencode/config.json`. You can change the relay server URL from the admin panel or by editing the config file directly.

## License

MIT
