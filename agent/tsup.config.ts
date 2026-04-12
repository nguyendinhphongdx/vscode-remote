import { defineConfig } from "tsup";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Log baked values at build time (masked for security)
const relayUrl = process.env.RELAY_URL || "";
const relaySecret = process.env.RELAY_SECRET || "";
console.log("[tsup] Build-time env bake:");
console.log(`  RELAY_URL    = ${relayUrl ? relayUrl : "(empty!)"}`);
console.log(`  RELAY_SECRET = ${relaySecret ? relaySecret.slice(0, 4) + "****" : "(empty!)"}`);

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: "esm",
  dts: true,
  noExternal: ["@vscode-remote/shared"],
  define: {
    __BUILD_RELAY_URL__: JSON.stringify(process.env.RELAY_URL || ""),
    __BUILD_RELAY_SECRET__: JSON.stringify(process.env.RELAY_SECRET || ""),
  },
});
