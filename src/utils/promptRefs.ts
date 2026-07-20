/**
 * Strip/parse Chat/rule-engine vendor tokens (--cref/--sref/--ar).
 * Mirrors Toonflow-app assetCodeContract — digit + slug dual accept.
 */

export interface ParsedPromptRefs {
  crefs: string[];
  srefs: string[];
  aspectRatio?: string;
}

const DIGIT_RE = /^(CHAR|SCENE|PROP|INF|P)[\s\-_]*0*(\d+)$/i;
const SLUG_RE = /^(CHAR|SCENE|PROP)[-_]([A-Za-z][A-Za-z0-9]*)$/i;
const KIND_PAD: Record<string, number> = { CHAR: 3, SCENE: 3, PROP: 3, INF: 2, P: 3 };

function splitCodeTokens(raw: string): string[] {
  return raw
    .split(/[,，、;/|]+/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("--"));
}

export function normalizeAssetCode(raw: string): string | null {
  const token = raw.trim();
  const dig = token.match(DIGIT_RE);
  if (dig) {
    const kind = dig[1].toUpperCase();
    const n = Number(dig[2]);
    if (!Number.isFinite(n) || n < 0) return null;
    return `${kind}-${String(n).padStart(KIND_PAD[kind] ?? 3, "0")}`;
  }
  const slug = token.match(SLUG_RE);
  if (slug) return `${slug[1].toUpperCase()}-${slug[2].toUpperCase()}`;
  return null;
}

function normalizeAssetCodeLoose(raw: string): string {
  return normalizeAssetCode(raw) ?? raw.replace(/[,，].*$/, "").trim();
}

const CREF_BLOCK_RE = /--cref\s+((?:(?!--sref|--ar)\S+\s*)+)/gi;
const SREF_BLOCK_RE = /--sref\s+((?:(?!--cref|--ar)\S+\s*)+)/gi;
const CREF_RE = /--cref\s+([^\n]+?)(?=\s+--(?:sref|ar)\b|$)/gi;
const SREF_RE = /--sref\s+([^\n]+?)(?=\s+--(?:cref|ar)\b|$)/gi;
const AR_RE = /--ar\s+(\d+\s*:\s*\d+)/i;

function extractCodesFromBlock(block: string): string[] {
  const found: string[] = [];
  const embedded =
    /(CHAR|SCENE|PROP|INF|P)[\s\-_]*0*\d+|(CHAR|SCENE|PROP)[-_][A-Za-z][A-Za-z0-9]*/gi;
  for (const m of block.matchAll(embedded)) found.push(m[0]);
  for (const tok of block.trim().split(/[\s,，、;/|]+/)) {
    if (tok && !tok.startsWith("--")) found.push(tok);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of found) {
    const n = normalizeAssetCode(p) ?? normalizeAssetCodeLoose(p);
    if (!n || seen.has(n) || n === "CHAR" || n === "SCENE" || n === "PROP") continue;
    if (!n.includes("-")) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export function parsePromptRefs(prompt: string): ParsedPromptRefs {
  const crefs: string[] = [];
  const srefs: string[] = [];
  for (const m of prompt.matchAll(CREF_BLOCK_RE)) crefs.push(...extractCodesFromBlock(m[1]));
  if (!crefs.length) {
    for (const m of prompt.matchAll(CREF_RE)) crefs.push(...extractCodesFromBlock(m[1]));
  }
  for (const m of prompt.matchAll(SREF_BLOCK_RE)) srefs.push(...extractCodesFromBlock(m[1]));
  if (!srefs.length) {
    for (const m of prompt.matchAll(SREF_RE)) srefs.push(...extractCodesFromBlock(m[1]));
  }
  const arMatch = prompt.match(AR_RE);
  const aspectRatio = arMatch ? arMatch[1].replace(/\s/g, "") : undefined;
  return { crefs: [...new Set(crefs)], srefs: [...new Set(srefs)], aspectRatio };
}

export { normalizeAssetCodeLoose, splitCodeTokens };
