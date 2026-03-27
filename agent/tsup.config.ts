import { defineConfig } from "tsup";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

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
