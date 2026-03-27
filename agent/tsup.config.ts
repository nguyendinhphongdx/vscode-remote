import { defineConfig } from "tsup";

declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: "esm",
  dts: true,
  define: {
    __BUILD_RELAY_URL__: JSON.stringify(process.env.RELAY_URL || ""),
  },
});
