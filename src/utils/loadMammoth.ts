type MammothApi = typeof import("mammoth")["default"];

let mammothPromise: Promise<MammothApi> | null = null;

/** mammoth 仅在导入 Word 时使用，动态加载以缩短主构建图 */
export function loadMammoth() {
  if (!mammothPromise) {
    mammothPromise = import("mammoth").then((mod) => mod.default);
  }
  return mammothPromise;
}
