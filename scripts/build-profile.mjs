import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const viteBin = join(root, "node_modules", "vite", "bin", "vite.js");
const target = process.argv[2] ?? "web";

const startedAt = Date.now();
const result = spawnSync(process.execPath, ["--max-old-space-size=8192", viteBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, BUILD_TARGET: target },
  cwd: root,
});

const elapsedMs = Date.now() - startedAt;
const report = {
  target,
  elapsedMs,
  elapsedSec: Math.round(elapsedMs / 1000),
  exitCode: result.status ?? 1,
  timestamp: new Date().toISOString(),
};

writeFileSync(join(root, "build-profile.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\n[build-profile] ${report.elapsedSec}s (exit ${report.exitCode})`);
process.exit(report.exitCode);
