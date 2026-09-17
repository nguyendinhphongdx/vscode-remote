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

/** Users only need to give the relay's base URL (CLI `setup`, admin UI, or
 * RELAY_URL env var) — the WS path is an implementation detail of this
 * protocol, not something to memorize/retype. Idempotent: a URL that already
 * ends with the path is left alone, so existing configs keep working. */
function withAgentWsPath(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api/agent-ws') ? trimmed : `${trimmed}/api/agent-ws`;
}

export function resolveRelayUrl(persisted?: string | null): string {
  const url = process.env.RELAY_URL || persisted || BUILD_RELAY_URL;
  return url ? withAgentWsPath(url) : url;
}

export function resolveRelaySecret(persisted?: string | null): string {
  return process.env.RELAY_SECRET || persisted || BUILD_RELAY_SECRET;
}
