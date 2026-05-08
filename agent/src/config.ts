import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// Load .env in priority order (first found wins per key):
// 1. CWD/.env (explicit override)
// 2. ~/.opencode/.env (user config — recommended for global install)
// 3. monorepo root/.env (dev mode)
dotenv.config();
dotenv.config({ path: path.join(os.homedir(), '.opencode', '.env') });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import * as configStore from './services/configStore.js';
import type { AgentSettings } from './types/config.types.js';

export { configStore };

declare const __BUILD_RELAY_URL__: string;
declare const __BUILD_RELAY_SECRET__: string;

// Runtime env > build-time bake > persisted config
const DEFAULT_RELAY_URL = 'wss://vscode-remote.onrender.com/api/agent-ws';

const ENV_OVERRIDES: Record<string, () => string | undefined> = {
  relayUrl: () => process.env.RELAY_URL || (typeof __BUILD_RELAY_URL__ !== 'undefined' && __BUILD_RELAY_URL__ ? __BUILD_RELAY_URL__ : DEFAULT_RELAY_URL),
  relaySecret: () => process.env.RELAY_SECRET || (typeof __BUILD_RELAY_SECRET__ !== 'undefined' ? __BUILD_RELAY_SECRET__ : undefined),
};

// Backward-compatible config object that reads from the store
// Must call configStore.initialize() before accessing
export const config: AgentSettings & { machineId: string } = new Proxy(
  {} as AgentSettings & { machineId: string },
  {
    get(_target, prop: string) {
      const store = configStore.get();
      if (prop === 'machineId') return store.machineId;
      // Persisted config takes priority if user has changed it
      const persisted = (store.settings as unknown as Record<string, unknown>)[prop];
      if (persisted !== undefined && persisted !== null && persisted !== '') return persisted;
      // Fallback to env/build-time values
      const envOverride = ENV_OVERRIDES[prop]?.();
      if (envOverride) return envOverride;
      return persisted;
    },
  }
);
