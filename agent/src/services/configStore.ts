declare const __BUILD_RELAY_URL__: string;

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { PersistedConfig, AgentSettings } from '../types/config.types.js';
import { generateMachineId } from './machineId.js';
import { generateRandomPassword, hashPassword } from './passwordService.js';

import os from 'os';
const DATA_DIR = process.env.VSR_DATA_DIR || path.join(os.homedir(), '.opencode');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

let currentConfig: PersistedConfig | null = null;

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function writeConfig(config: PersistedConfig): Promise<void> {
  config.updatedAt = new Date().toISOString();
  const tmpPath = CONFIG_PATH + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(config, null, 2), 'utf-8');
  await fs.rename(tmpPath, CONFIG_PATH);
  // Restrict file permissions (owner-only read/write) on Unix
  try { await fs.chmod(CONFIG_PATH, 0o600); } catch { /* Windows ignores chmod */ }
  currentConfig = config;
}

async function createDefaultConfig(): Promise<PersistedConfig> {
  const randomPassword = generateRandomPassword();
  const randomHash = await hashPassword(randomPassword);
  const config: PersistedConfig = {
    machineId: generateMachineId(),
    passwords: {
      random: { hash: randomHash, displayValue: randomPassword },
      fixed: null,
    },
    settings: {
      relayUrl: process.env.RELAY_URL || __BUILD_RELAY_URL__ || '',
      localPort: parseInt(process.env.LOCAL_PORT || '9000', 10),
      workspaceRoot: process.env.WORKSPACE_ROOT ? path.resolve(process.env.WORKSPACE_ROOT) : null,
      maxTerminals: 5,
      maxFileSize: 10 * 1024 * 1024,
      jwtSecret: crypto.randomBytes(64).toString('hex'),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return config;
}

export async function initialize(): Promise<void> {
  await ensureDataDir();

  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    currentConfig = JSON.parse(data) as PersistedConfig;
  } catch {
    currentConfig = await createDefaultConfig();
    await writeConfig(currentConfig);
  }
}

export function get(): PersistedConfig {
  if (!currentConfig) throw new Error('Config not initialized. Call initialize() first.');
  return currentConfig;
}

export function getSettings(): AgentSettings {
  return get().settings;
}

export async function updateSettings(partial: Partial<AgentSettings>): Promise<AgentSettings> {
  const config = get();
  config.settings = { ...config.settings, ...partial };
  await writeConfig(config);
  return config.settings;
}

export async function regenerateRandomPassword(): Promise<string> {
  const config = get();
  const plain = generateRandomPassword();
  const hash = await hashPassword(plain);
  config.passwords.random = { hash, displayValue: plain };
  await writeConfig(config);
  return plain;
}

export function getRandomPassword(): string | null {
  return get().passwords.random?.displayValue || null;
}

export async function setFixedPassword(plain: string): Promise<void> {
  const config = get();
  const hash = await hashPassword(plain);
  config.passwords.fixed = { hash };
  await writeConfig(config);
}

export async function clearFixedPassword(): Promise<void> {
  const config = get();
  config.passwords.fixed = null;
  await writeConfig(config);
}
