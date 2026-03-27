#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(os.homedir(), '.opencode');
const PID_FILE = path.join(DATA_DIR, 'agent.pid');
const LOG_FILE = path.join(DATA_DIR, 'agent.log');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const AGENT_ENTRY = path.join(__dirname, 'index.js');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const command = process.argv[2];
const args = process.argv.slice(3);

interface CommandInfo {
  description: string;
  handler: () => void;
}

const commands: Record<string, CommandInfo> = {
  start:     { description: 'Start the agent in background',      handler: cmdStart },
  stop:      { description: 'Stop the running agent',             handler: cmdStop },
  restart:   { description: 'Restart the agent',                  handler: cmdRestart },
  status:    { description: 'Show agent status',                  handler: cmdStatus },
  id:        { description: 'Show Machine ID',                    handler: cmdId },
  password:  { description: 'Show or reset password',             handler: cmdPassword },
  config:    { description: 'Open Admin UI in browser',           handler: cmdConfig },
  logs:      { description: 'Show agent logs',                    handler: cmdLogs },
  install:   { description: 'Register as system service (auto-start)', handler: cmdInstall },
  uninstall: { description: 'Remove system service',              handler: cmdUninstall },
  run:       { description: 'Run agent in foreground',            handler: cmdRun },
  help:      { description: 'Show this help message',             handler: cmdHelp },
};

// Dispatch
if (command === '--version' || command === '-v') {
  const pkgPath = path.resolve(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  console.log(pkg.version);
} else if (!command || command === 'help' || command === '--help' || command === '-h') {
  cmdHelp();
} else if (commands[command]) {
  commands[command].handler();
} else {
  console.error(`Unknown command: ${command}`);
  console.error(`Run "opencode help" for available commands.`);
  process.exit(1);
}

// ===== Commands =====

function cmdStart() {
  if (isRunning()) {
    console.log('Agent is already running (PID: ' + readPid() + ')');
    return;
  }

  console.log('Starting agent...');

  const logStream = fs.openSync(LOG_FILE, 'a');
  const child = spawn(process.execPath, [AGENT_ENTRY], {
    detached: true,
    stdio: ['ignore', logStream, logStream],
    env: {
      ...process.env,
      VSR_DATA_DIR: DATA_DIR,
    },
  });

  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));

  console.log(`Agent started (PID: ${child.pid})`);

  // Wait a moment then show info
  setTimeout(() => {
    showAgentInfo();
  }, 1500);
}

function cmdStop() {
  const pid = readPid();
  if (!pid || !isRunning()) {
    console.log('Agent is not running.');
    cleanPid();
    return;
  }

  console.log(`Stopping agent (PID: ${pid})...`);
  try {
    process.kill(pid, 'SIGTERM');
    console.log('Agent stopped.');
  } catch {
    console.log('Agent process not found, cleaning up.');
  }
  cleanPid();
}

function cmdRestart() {
  cmdStop();
  setTimeout(() => cmdStart(), 500);
}

function cmdStatus() {
  if (isRunning()) {
    const pid = readPid();
    console.log(`Agent is running (PID: ${pid})`);
    showAgentInfo();
  } else {
    console.log('Agent is not running.');
    cleanPid();
  }
}

function cmdId() {
  const config = readConfig();
  if (!config?.machineId) {
    console.log('Agent has not been initialized yet. Run "opencode start" first.');
    return;
  }
  const mid = config.machineId;
  const formatted = `${mid.slice(0, 3)}-${mid.slice(3, 6)}-${mid.slice(6)}`;
  console.log(formatted);
}

function cmdPassword() {
  const sub = args[0];
  const config = readConfig();

  if (!config) {
    console.log('Agent has not been initialized yet. Run "opencode start" first.');
    return;
  }

  if (sub === 'reset') {
    console.log('To reset password, use the Admin UI:');
    const port = config.settings?.localPort || 9000;
    console.log(`  http://localhost:${port}`);
    return;
  }

  // Show current password
  if (config.passwords?.random?.displayValue) {
    console.log(`Random password: ${config.passwords.random.displayValue}`);
  }
  if (config.passwords?.fixed) {
    console.log('Fixed password:  (set)');
  }
}

function cmdConfig() {
  const config = readConfig();
  const port = config?.settings?.localPort || 9000;
  const url = `http://localhost:${port}`;

  console.log(`Opening Admin UI: ${url}`);
  openBrowser(url);
}

function cmdLogs() {
  const lines = args[0] || '50';

  if (!fs.existsSync(LOG_FILE)) {
    console.log('No log file found.');
    return;
  }

  // Follow mode
  if (args.includes('-f') || args.includes('--follow')) {
    const tail = spawn('tail', ['-f', LOG_FILE], { stdio: 'inherit' });
    tail.on('error', () => {
      // Fallback: read last lines
      const content = fs.readFileSync(LOG_FILE, 'utf-8');
      const lastLines = content.split('\n').slice(-parseInt(lines)).join('\n');
      console.log(lastLines);
    });
    return;
  }

  const content = fs.readFileSync(LOG_FILE, 'utf-8');
  const lastLines = content.split('\n').slice(-parseInt(lines)).join('\n');
  console.log(lastLines);
}

function cmdRun() {
  // Run in foreground (for development/debugging)
  console.log('Running agent in foreground (Ctrl+C to stop)...');
  const child = spawn(process.execPath, [AGENT_ENTRY], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VSR_DATA_DIR: DATA_DIR,
    },
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

function cmdInstall() {
  const platform = process.platform;
  const nodePath = process.execPath;
  const cliPath = path.resolve(AGENT_ENTRY, '../cli.js');

  if (platform === 'linux') {
    // systemd user service
    const serviceDir = path.join(os.homedir(), '.config/systemd/user');
    const servicePath = path.join(serviceDir, 'opencode-agent.service');
    const unit = `[Unit]
Description=OpenCode Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${nodePath} ${cliPath} run
Restart=on-failure
RestartSec=5
Environment=VSR_DATA_DIR=${DATA_DIR}

[Install]
WantedBy=default.target
`;
    fs.mkdirSync(serviceDir, { recursive: true });
    fs.writeFileSync(servicePath, unit);

    try {
      execSync('systemctl --user daemon-reload');
      execSync('systemctl --user enable opencode-agent.service');
      execSync('systemctl --user start opencode-agent.service');
      execSync(`loginctl enable-linger ${os.userInfo().username}`);
      console.log('Service installed and started.');
      console.log('  systemctl --user status opencode-agent');
      console.log('  systemctl --user stop opencode-agent');
      console.log('  journalctl --user -u opencode-agent -f');
    } catch (err) {
      console.error('Failed to enable service:', (err as Error).message);
      console.log(`Service file written to: ${servicePath}`);
      console.log('Try manually: systemctl --user enable --now opencode-agent.service');
    }
  } else if (platform === 'darwin') {
    // macOS LaunchAgent
    const plistDir = path.join(os.homedir(), 'Library/LaunchAgents');
    const plistPath = path.join(plistDir, 'com.opencode.agent.plist');
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.opencode.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${cliPath}</string>
    <string>run</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>VSR_DATA_DIR</key>
    <string>${DATA_DIR}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_FILE}</string>
  <key>StandardErrorPath</key>
  <string>${LOG_FILE}</string>
</dict>
</plist>
`;
    fs.mkdirSync(plistDir, { recursive: true });
    fs.writeFileSync(plistPath, plist);

    try {
      execSync(`launchctl load -w "${plistPath}"`);
      console.log('LaunchAgent installed and started.');
      console.log(`  launchctl list | grep opencode`);
      console.log(`  launchctl unload "${plistPath}"`);
    } catch (err) {
      console.error('Failed to load LaunchAgent:', (err as Error).message);
      console.log(`Plist written to: ${plistPath}`);
    }
  } else if (platform === 'win32') {
    // Windows Task Scheduler
    const taskName = 'OpenCodeAgent';
    const cmd = `schtasks /Create /F /SC ONLOGON /TN "${taskName}" /TR "\\"${nodePath}\\" \\"${cliPath}\\" run" /RL HIGHEST`;
    try {
      execSync(cmd);
      execSync(`schtasks /Run /TN "${taskName}"`);
      console.log('Scheduled task created and started.');
      console.log(`  schtasks /Query /TN "${taskName}"`);
      console.log(`  schtasks /End /TN "${taskName}"`);
    } catch (err) {
      console.error('Failed to create scheduled task:', (err as Error).message);
      console.log('Try running this command as Administrator.');
    }
  } else {
    console.error(`Unsupported platform: ${platform}`);
  }
}

function cmdUninstall() {
  const platform = process.platform;

  if (platform === 'linux') {
    try {
      execSync('systemctl --user stop opencode-agent.service 2>/dev/null');
      execSync('systemctl --user disable opencode-agent.service 2>/dev/null');
    } catch { /* ignore */ }
    const servicePath = path.join(os.homedir(), '.config/systemd/user/opencode-agent.service');
    try { fs.unlinkSync(servicePath); } catch { /* ignore */ }
    try { execSync('systemctl --user daemon-reload'); } catch { /* ignore */ }
    console.log('Service removed.');
  } else if (platform === 'darwin') {
    const plistPath = path.join(os.homedir(), 'Library/LaunchAgents/com.opencode.agent.plist');
    try { execSync(`launchctl unload -w "${plistPath}" 2>/dev/null`); } catch { /* ignore */ }
    try { fs.unlinkSync(plistPath); } catch { /* ignore */ }
    console.log('LaunchAgent removed.');
  } else if (platform === 'win32') {
    const taskName = 'OpenCodeAgent';
    try {
      execSync(`schtasks /End /TN "${taskName}" 2>nul`);
      execSync(`schtasks /Delete /F /TN "${taskName}"`);
    } catch { /* ignore */ }
    console.log('Scheduled task removed.');
  } else {
    console.error(`Unsupported platform: ${platform}`);
  }
}

function cmdHelp() {
  console.log('');
  console.log('  OpenCode Agent');
  console.log('');
  console.log('  Usage: opencode <command> [options]');
  console.log('');
  console.log('  Commands:');
  const maxLen = Math.max(...Object.keys(commands).map((k) => k.length));
  for (const [name, info] of Object.entries(commands)) {
    console.log(`    ${name.padEnd(maxLen + 2)} ${info.description}`);
  }
  console.log('');
  console.log('  Examples:');
  console.log('    opencode start          Start agent in background');
  console.log('    opencode status         Check if agent is running');
  console.log('    opencode id             Show Machine ID');
  console.log('    opencode logs -f        Follow log output');
  console.log('    opencode run            Run in foreground (debug)');
  console.log('');
}

// ===== Helpers =====

function readPid(): number | null {
  try {
    return parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
  } catch {
    return null;
  }
}

function cleanPid() {
  try { fs.unlinkSync(PID_FILE); } catch { /* ignore */ }
}

function isRunning(): boolean {
  const pid = readPid();
  if (!pid) return false;
  try {
    process.kill(pid, 0); // Signal 0 = check if process exists
    return true;
  } catch {
    return false;
  }
}

function readConfig(): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function showAgentInfo() {
  const config = readConfig();
  if (!config) return;

  const mid = config.machineId;
  if (mid) {
    const formatted = `${mid.slice(0, 3)}-${mid.slice(3, 6)}-${mid.slice(6)}`;
    console.log(`  Machine ID : ${formatted}`);
  }
  if (config.passwords?.random?.displayValue) {
    console.log(`  Password   : ${config.passwords.random.displayValue}`);
  }
  const port = config.settings?.localPort || 9000;
  console.log(`  Admin UI   : http://localhost:${port}`);
}

function openBrowser(url: string) {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      execSync(`open "${url}"`);
    } else if (platform === 'win32') {
      execSync(`start "" "${url}"`);
    } else {
      execSync(`xdg-open "${url}"`);
    }
  } catch {
    console.log(`Could not open browser. Visit: ${url}`);
  }
}
