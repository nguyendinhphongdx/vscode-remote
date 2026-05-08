// Single source for relay URL/secret resolution.
//
// Resolution priority (highest first):
//   1. process.env.RELAY_URL / RELAY_SECRET — runtime override
//   2. Persisted user setting in ~/.opencode/config.json (set via `opencode setup`)
//   3. CI-baked constants in buildConstants.generated.ts (written from GitHub Secrets)
//
// In dev (no generated file), the constants module exports empty strings
// via the .gitignored fallback below.

import { BUILD_RELAY_URL, BUILD_RELAY_SECRET } from './buildConstants.generated.js';

export function resolveRelayUrl(persisted?: string | null): string {
  return process.env.RELAY_URL || persisted || BUILD_RELAY_URL;
}

export function resolveRelaySecret(persisted?: string | null): string {
  return process.env.RELAY_SECRET || persisted || BUILD_RELAY_SECRET;
}
