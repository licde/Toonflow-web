import { copyFileSync, existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function ensureTdesignCssMjs(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (!statSync(fullPath).isDirectory()) continue;
    const styleDir = join(fullPath, "style");
    if (existsSync(styleDir)) {
      const cssMjs = join(styleDir, "css.mjs");
      const indexCss = join(styleDir, "index.css");
      if (existsSync(indexCss) && !existsSync(cssMjs)) {
        writeFileSync(cssMjs, "import './index.css';\n");
      }
    }
    ensureTdesignCssMjs(fullPath);
  }
}

function syncLocaleMjs() {
  const esLocale = join(root, "node_modules", "tdesign-vue-next", "es", "locale");
  const libLocale = join(root, "node_modules", "tdesign-vue-next", "lib", "locale");
  if (!existsSync(esLocale) || !existsSync(libLocale)) return;
  for (const entry of readdirSync(libLocale)) {
    if (!entry.endsWith(".js") || entry.endsWith(".js.map")) continue;
    const mjsPath = join(esLocale, entry.replace(/\.js$/, ".mjs"));
    if (!existsSync(mjsPath)) {
      copyFileSync(join(libLocale, entry), mjsPath);
    }
  }
}

const tdesignEs = join(root, "node_modules", "tdesign-vue-next", "es");
if (existsSync(tdesignEs)) {
  ensureTdesignCssMjs(tdesignEs);
}
syncLocaleMjs();
