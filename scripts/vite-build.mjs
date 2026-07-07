import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const target = process.argv[2] ?? "web";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const viteBin = join(root, "node_modules", "vite", "bin", "vite.js");

const result = spawnSync(process.execPath, ["--max-old-space-size=8192", viteBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, BUILD_TARGET: target },
  cwd: root,
});

process.exit(result.status ?? 1);
