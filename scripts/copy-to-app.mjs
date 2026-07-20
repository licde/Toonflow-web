import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const distDir = path.resolve(__dirname, "../dist");
const targets = [
  process.env.TOONFLOW_APP_WEB_DIR,
  path.resolve(__dirname, "../../new/Toonflow-app/data/web"),
  path.resolve(__dirname, "../../Toonflow-app/data/web"),
  path.resolve(__dirname, "../../new/Toonflow-app/scripts/web"),
].filter(Boolean);

function canWriteDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.copy-probe-${Date.now()}`);
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

/** In-place sync: never delete the destination root (avoids Windows EPERM locks). */
function syncRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const keep = new Set();
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    keep.add(entry.name);
    if (entry.isDirectory()) syncRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
  for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {
    if (keep.has(entry.name)) continue;
    const d = path.join(dest, entry.name);
    try {
      fs.rmSync(d, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {
      /* stale locked file — ignore */
    }
  }
}

function resolveTarget(preferred) {
  if (canWriteDir(preferred)) return preferred;
  const fallback = preferred.endsWith(`${path.sep}web`) || preferred.endsWith("/web") || preferred.endsWith("\\web")
    ? `${preferred}_new`.replace(/web_new_new$/, "web_new")
    : `${preferred}_new`;
  // Prefer sibling web_new when web is locked
  const sibling = path.join(path.dirname(preferred), "web_new");
  if (canWriteDir(sibling)) {
    console.warn(`[copy-to-app] ${preferred} 不可写，回退 → ${sibling}`);
    return sibling;
  }
  if (canWriteDir(fallback)) {
    console.warn(`[copy-to-app] ${preferred} 不可写，回退 → ${fallback}`);
    return fallback;
  }
  return null;
}

if (!fs.existsSync(distDir)) {
  console.error("[copy-to-app] 请先执行 yarn build:fast:lite");
  process.exit(1);
}

let count = 0;
for (const preferred of targets) {
  if (!fs.existsSync(path.dirname(preferred))) continue;
  const target = resolveTarget(preferred);
  if (!target) {
    console.error(`[copy-to-app] ✗ 无法写入: ${preferred}`);
    continue;
  }
  try {
    syncRecursive(distDir, target);
    count++;
    console.log(`[copy-to-app] ✓ ${distDir} → ${target}`);
  } catch (e) {
    console.error(`[copy-to-app] ✗ ${target}:`, e?.message || e);
  }
}

if (!count) {
  console.error("[copy-to-app] 未找到有效目标目录，请设置 TOONFLOW_APP_WEB_DIR 或关闭占用 data/web 的进程后重试");
  process.exit(1);
}
