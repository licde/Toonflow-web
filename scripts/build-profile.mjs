import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseBuildArgs } from "./build-env.mjs";

const parsed = parseBuildArgs();
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const viteBuildScript = join(root, "scripts", "vite-build.mjs");

const modeFlag =
  parsed.releaseFast ? "--release-fast" : parsed.release ? "--release" : parsed.ultra ? "--ultra" : "--lite";

const startedAt = Date.now();
const result = spawnSync(process.execPath, [viteBuildScript, parsed.target, modeFlag], {
  stdio: "inherit",
  cwd: root,
});

const elapsedMs = Date.now() - startedAt;
const report = {
  target: parsed.target,
  mode: parsed.mode,
  elapsedMs,
  elapsedSec: Math.round(elapsedMs / 1000),
  exitCode: result.status ?? 1,
  timestamp: new Date().toISOString(),
};

writeFileSync(join(root, "build-profile.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\n[build-profile] ${report.elapsedSec}s mode=${report.mode} (exit ${report.exitCode})`);
process.exit(report.exitCode);
