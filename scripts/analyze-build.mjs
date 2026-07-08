import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const target = process.argv[2] ?? "web";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const viteBuildScript = join(root, "scripts", "vite-build.mjs");

console.log("[build:analyze] 构建完成后请打开 dist/stats.html 查看包体积分析\n");

const result = spawnSync(process.execPath, [viteBuildScript, target, "--lite"], {
  stdio: "inherit",
  env: { ...process.env, ANALYZE: "1" },
  cwd: root,
});

process.exit(result.status ?? 1);
