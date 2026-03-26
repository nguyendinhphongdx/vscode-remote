import 'dotenv/config';
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
