import { existsSync } from "node:fs";
import { createServer } from "vite";

const files = ["src/types/auto-imports.d.ts", "src/types/components.d.ts"];
if (files.every((file) => existsSync(file))) {
  process.exit(0);
}

const server = await createServer({
  configFile: "vite.config.ts",
  logLevel: "error",
});
await server.close();
