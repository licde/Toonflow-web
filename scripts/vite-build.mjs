import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseBuildArgs, viteBuildEnv } from "./build-env.mjs";

const parsed = parseBuildArgs();
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const viteBin = join(root, "node_modules", "vite", "bin", "vite.js");

const startedAt = Date.now();
console.log(`[vite-build] target=${parsed.target} mode=${parsed.mode}`);

const result = spawnSync(process.execPath, ["--max-old-space-size=8192", viteBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, ...viteBuildEnv(parsed) },
  cwd: root,
});

console.log(`[vite-build] finished in ${Math.round((Date.now() - startedAt) / 1000)}s (exit ${result.status ?? 1})`);
process.exit(result.status ?? 1);
