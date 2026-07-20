/**
 * FE mirror smoke for promptRefs (T8). Run: node --experimental-strip-types or tsx if available.
 * yarn-less: npx tsx from Toonflow-web if configured; also runnable from app via duplicated asserts in asset-code-contract.
 */
import { parsePromptRefs, normalizeAssetCode } from "../src/utils/promptRefs";

let failed = 0;
function assert(c: boolean, m: string) {
  if (!c) {
    failed++;
    console.error("FAIL", m);
  } else console.log("OK", m);
}

assert(normalizeAssetCode("CHAR005") === "CHAR-005", "normalize CHAR005");
const refs = parsePromptRefs("--cref CHAR-001,CHAR-005 --ar 9:16");
assert(refs.crefs.includes("CHAR-001") && refs.crefs.includes("CHAR-005"), "comma cref");

if (failed) process.exit(1);
console.log("fe-prompt-refs-smoke OK");
