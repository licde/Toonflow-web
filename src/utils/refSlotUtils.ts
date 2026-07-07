/** 与后端 refSlotBuilder 对齐：@图N 编号与 resolvedSrc */

export type RefMediaSource = "assets" | "storyboard";

export type RefMediaInput = {
  id?: number;
  sources?: RefMediaSource | string;
  src?: string;
  fallbackAssetSrc?: string;
  resolvedSrc?: string;
  fileType?: "image" | "video" | "audio" | string;
  name?: string;
  type?: string;
  index?: number;
  remark?: string;
  label?: string;
};

export type RefSlot = {
  slot: number;
  source: RefMediaSource;
  id: number;
  lockCode?: string;
  label: string;
  resolvedSrc: string;
  fileType: "image" | "video" | "audio";
};

export function resolveMediaSrc(item: RefMediaInput): string {
  return (item.resolvedSrc || item.src || item.fallbackAssetSrc || "").trim();
}

function mediaPriority(item: RefMediaInput): number {
  const src = resolveMediaSrc(item);
  if (!src) return 2;
  if (item.sources === "assets" || item.type === "role" || item.type === "scene" || item.type === "tool") {
    return item.sources === "assets" ? 0 : 1;
  }
  if (item.sources === "storyboard") return 1;
  return 0;
}

function inferSource(item: RefMediaInput): RefMediaSource {
  if (item.sources === "assets" || item.sources === "storyboard") return item.sources;
  if (item.type === "role" || item.type === "scene" || item.type === "tool") return "assets";
  return "storyboard";
}

function inferLabel(item: RefMediaInput): string {
  if (item.label) return item.label;
  if (item.name) return item.name;
  if (item.sources === "storyboard" || item.index != null) {
    return `分镜${item.index ?? item.id ?? "?"}`;
  }
  return `资产${item.id ?? "?"}`;
}

export function sortMediasForRef(medias: RefMediaInput[]): RefMediaInput[] {
  const seen = new Set<string>();
  const deduped: RefMediaInput[] = [];
  for (const m of medias) {
    if (m.id == null) continue;
    const key = `${inferSource(m)}:${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(m);
  }
  return [...deduped].sort((a, b) => mediaPriority(a) - mediaPriority(b));
}

export function enrichMediasWithResolved(medias: RefMediaInput[]): Array<RefMediaInput & { resolvedSrc: string; label: string; lockCode?: string }> {
  return sortMediasForRef(medias).map((m) => ({
    ...m,
    sources: inferSource(m),
    resolvedSrc: resolveMediaSrc(m),
    label: inferLabel(m),
    lockCode: (m as { lockCode?: string; remark?: string }).lockCode,
  }));
}

export function buildRefSlots(medias: RefMediaInput[]): RefSlot[] {
  const enriched = enrichMediasWithResolved(medias);
  const slots: RefSlot[] = [];
  let slotNum = 0;
  for (const m of enriched) {
    const resolvedSrc = m.resolvedSrc;
    if (!resolvedSrc) continue;
    const fileType = (m.fileType === "video" || m.fileType === "audio" ? m.fileType : "image") as RefSlot["fileType"];
    if (fileType !== "image") continue;
    slotNum++;
    slots.push({
      slot: slotNum,
      source: inferSource(m),
      id: m.id!,
      lockCode: (m as { lockCode?: string }).lockCode,
      label: m.label,
      resolvedSrc,
      fileType,
    });
  }
  return slots;
}

export function refSlotsToUploadInfo(slots: RefSlot[]): Array<{ id: number; sources: RefMediaSource }> {
  return slots.map((s) => ({ id: s.id, sources: s.source }));
}

export function refSlotsToReferences(slots: RefSlot[]): Array<{ type: "image"; src: string; label: string; lockCode?: string }> {
  return slots.map((s) => ({ type: "image" as const, src: s.resolvedSrc, label: s.label, lockCode: s.lockCode }));
}

export function inferMediaSource(item: RefMediaInput): RefMediaSource {
  return inferSource(item);
}

export function buildUploadInfoFromMedias(
  medias: RefMediaInput[],
  mode: string,
): Array<{ id: number; sources: RefMediaSource }> {
  const slots = buildRefSlots(medias);
  let info = refSlotsToUploadInfo(slots);
  const frameMode = ["startEndRequired", "endFrameOptional", "startFrameOptional"];
  if (frameMode.includes(mode)) info = info.slice(0, 2);
  else if (mode === "singleImage") info = info.slice(0, 1);
  return info;
}

export function formatStableRef(lockCode: string): string {
  return `@资产:${lockCode}`;
}

export function findOrphanRefIndices(prompt: string, slotCount: number): number[] {
  const orphans: number[] = [];
  const regex = /@(?:图|图片)(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(prompt)) !== null) {
    const n = Number(match[1]);
    if (n < 1 || n > slotCount) orphans.push(n);
  }
  return [...new Set(orphans)];
}

export function findOrphanStableRefs(prompt: string, slots: RefSlot[]): string[] {
  const known = new Set(slots.filter((s) => s.lockCode).map((s) => s.lockCode!));
  const orphans: string[] = [];
  const regex = /@资产:([A-Za-z0-9_-]+(?::[\u4e00-\u9fa5A-Za-z0-9_-]+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(prompt)) !== null) {
    if (!known.has(match[1])) orphans.push(match[1]);
  }
  return [...new Set(orphans)];
}

export function findAllOrphanRefs(prompt: string, slotCount: number, slots: RefSlot[]): string[] {
  return [
    ...findOrphanRefIndices(prompt, slotCount).map((n) => `@图${n}`),
    ...findOrphanStableRefs(prompt, slots),
  ];
}
