import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  join(root, "src/types/auto-imports.d.ts"),
  join(root, "src/types/components.d.ts"),
];

if (files.every((file) => existsSync(file))) {
  console.log("[generate-dts] dts files exist, skip");
  process.exit(0);
}

console.log("[generate-dts] starting vite server to generate dts...");

const server = await createServer({
  configFile: join(root, "vite.config.ts"),
  root,
  logLevel: "warn",
});

await server.listen();
await server.close();

if (!files.every((file) => existsSync(file))) {
  console.error("[generate-dts] failed to generate dts files");
  process.exit(1);
}

console.log("[generate-dts] done");
