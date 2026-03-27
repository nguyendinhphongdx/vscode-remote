import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env: try CWD first, then monorepo root (npm workspaces sets CWD to package dir)
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import * as configStore from './services/configStore.js';
import type { AgentSettings } from './types/config.types.js';

export { configStore };

// Backward-compatible config object that reads from the store
// Must call configStore.initialize() before accessing
export const config: AgentSettings & { machineId: string } = new Proxy(
  {} as AgentSettings & { machineId: string },
  {
    get(_target, prop: string) {
      const store = configStore.get();
      if (prop === 'machineId') return store.machineId;
      return (store.settings as unknown as Record<string, unknown>)[prop];
    },
  }
);
