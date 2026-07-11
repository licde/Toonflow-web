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

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`[copy-to-app] 源目录不存在: ${src}`);
    process.exit(1);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(distDir)) {
  console.error("[copy-to-app] 请先执行 yarn build:fast:lite");
  process.exit(1);
}

let count = 0;
for (const target of targets) {
  if (fs.existsSync(path.dirname(target))) {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
    copyRecursive(distDir, target);
    count++;
    console.log(`[copy-to-app] ✓ ${distDir} → ${target}`);
  }
}

if (!count) {
  console.error("[copy-to-app] 未找到有效目标目录，请设置 TOONFLOW_APP_WEB_DIR");
  process.exit(1);
}
