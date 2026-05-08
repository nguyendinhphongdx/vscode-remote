import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import * as configStore from './services/configStore.js';
import { resolveRelayUrl, resolveRelaySecret } from './buildEnv.js';
import type { AgentSettings } from './types/config.types.js';

// Load .env in priority order (first found wins per key):
//   1. CWD/.env (explicit override during local runs)
//   2. ~/.opencode/.env (user config — populated by `opencode setup`)
//   3. monorepo root/.env (dev mode)
dotenv.config();
dotenv.config({ path: path.join(os.homedir(), '.opencode', '.env') });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export { configStore };

// Backward-compatible config accessor. Reads from persisted store, with
// special-case resolution for relayUrl / relaySecret via buildEnv.
// Must call configStore.initialize() before accessing.
export const config: AgentSettings & { machineId: string; relaySecret: string } = new Proxy(
  {} as AgentSettings & { machineId: string; relaySecret: string },
  {
    get(_target, prop: string) {
      if (prop === 'relayUrl') return resolveRelayUrl(configStore.getSettings().relayUrl);
      if (prop === 'relaySecret') return resolveRelaySecret(configStore.getSettings().relaySecret);
      const store = configStore.get();
      if (prop === 'machineId') return store.machineId;
      return (store.settings as unknown as Record<string, unknown>)[prop];
    },
  }
);
