/// <reference types="node" />
import { defineConfig } from "tsup";

const relayUrl = process.env.RELAY_URL || "";
const relaySecret = process.env.RELAY_SECRET || "";

console.log("[tsup] Build-time env bake:");
console.log(`  RELAY_URL    length = ${relayUrl.length}`);
console.log(`  RELAY_SECRET length = ${relaySecret.length}`);

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: "esm",
  dts: true,
  noExternal: ["@vscode-remote/shared"],
  define: {
    __BUILD_RELAY_URL__: JSON.stringify(relayUrl),
    __BUILD_RELAY_SECRET__: JSON.stringify(relaySecret),
  },
});
