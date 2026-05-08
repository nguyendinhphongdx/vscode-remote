// Single source for relay URL/secret resolution.
//
// Resolution priority (highest first):
//   1. process.env.RELAY_URL / RELAY_SECRET — runtime override
//   2. Persisted user setting in ~/.opencode/config.json (set via `opencode setup`)
//   3. tsup `define` substitutes the __BUILD_*__ identifiers with CI secret values at publish
//
// If all are empty, the caller (index.ts) shows a friendly error and exits.

declare const __BUILD_RELAY_URL__: string;
declare const __BUILD_RELAY_SECRET__: string;

const buildRelayUrl = typeof __BUILD_RELAY_URL__ !== 'undefined' ? __BUILD_RELAY_URL__ : '';
const buildRelaySecret = typeof __BUILD_RELAY_SECRET__ !== 'undefined' ? __BUILD_RELAY_SECRET__ : '';

export function resolveRelayUrl(persisted?: string | null): string {
  return process.env.RELAY_URL || persisted || buildRelayUrl;
}

export function resolveRelaySecret(persisted?: string | null): string {
  return process.env.RELAY_SECRET || persisted || buildRelaySecret;
}
