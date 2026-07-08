let mammothPromise: Promise<typeof import("mammoth")> | null = null;

export function loadMammoth() {
  if (!mammothPromise) {
    mammothPromise = import("mammoth");
  }
  return mammothPromise;
}
