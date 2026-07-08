import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseBuildArgs, viteModeFlag } from "./build-env.mjs";

const parsed = parseBuildArgs();
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const vueTscBin = join(root, "node_modules", "vue-tsc", "bin", "vue-tsc.js");
const viteBuildScript = join(root, "scripts", "vite-build.mjs");
const modeFlag = viteModeFlag(parsed);

function runNode(scriptArgs, label, heapMb = 8192) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    console.log(`[build-full] ${label} started`);
    const child = spawn(process.execPath, [`--max-old-space-size=${heapMb}`, ...scriptArgs], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production" },
    });
    child.on("close", (code) => {
      const sec = Math.round((Date.now() - started) / 1000);
      if (code === 0) {
        console.log(`[build-full] ${label} ok (${sec}s)`);
        resolve(undefined);
      } else {
        reject(new Error(`${label} failed (exit ${code ?? 1}, ${sec}s)`));
      }
    });
  });
}

async function main() {
  const started = Date.now();
  // 实测 Windows 上 --build 增量快于 --noEmit（~3min vs ~4.4min）
  const typeCheckArgs = [vueTscBin, "--build", "--pretty", "false"];
  const viteArgs = [viteBuildScript, parsed.target, modeFlag];

  if (parsed.serial) {
    await runNode(typeCheckArgs, "type-check", 6144);
    await runNode(viteArgs, "vite");
  } else {
    console.log(`[build-full] parallel: type-check ∥ vite (${parsed.mode})`);
    await Promise.all([runNode(typeCheckArgs, "type-check", 6144), runNode(viteArgs, "vite")]);
  }

  console.log(`[build-full] total ${Math.round((Date.now() - started) / 1000)}s mode=${parsed.mode}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
