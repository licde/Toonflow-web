/** Shared v5 exit-gate + batch honesty toasts — mirror docs/toonflow-web contracts */

export type ExitGateBody = {
  exitGate?: { ok?: boolean } | null;
  exitReassert?: { ok?: boolean } | null;
  designExitPass?: boolean;
  a11yAnnounce?: string;
  userMessage?: string;
  note?: string;
};

export function designExitStillOpen(body: ExitGateBody | null | undefined): boolean {
  if (!body) return false;
  if (body.designExitPass === false) return true;
  const gate = body.exitGate ?? body.exitReassert;
  if (gate && gate.ok === false) return true;
  return false;
}

export function toastAfterApplyExitGate(
  body: ExitGateBody | null | undefined,
  closedLabel = "已应用并设计闭合",
): boolean {
  if (!body) {
    window.$message?.success?.(closedLabel);
    return true;
  }
  if (designExitStillOpen(body)) {
    window.$message?.warning?.(
      body.a11yAnnounce ||
        body.userMessage ||
        body.note ||
        "已写库但 designExit 未过 — 禁止假绿，请继续 Confirm / 智能设计",
    );
    return false;
  }
  window.$message?.success?.(body.a11yAnnounce || body.userMessage || body.note || closedLabel);
  return true;
}

export type BatchSoftDeferSummary = {
  total?: number;
  burning?: number;
  softDeferred?: number;
  honestPartial?: boolean;
  note?: string;
};

/** Never toast「全部成功」when honestPartial or full defer. */
export function toastBatchSoftDefer(
  summary: BatchSoftDeferSummary | null | undefined,
  allOkLabel = "已开始生成",
): void {
  if (!summary || summary.softDeferred == null) {
    window.$message?.success?.(allOkLabel);
    return;
  }
  const total = summary.total ?? 0;
  const deferred = summary.softDeferred ?? 0;
  if (deferred > 0 && deferred >= total) {
    window.$message?.warning?.(summary.note || "全部 soft_defer — 未入烧，非成功");
    return;
  }
  if (summary.honestPartial) {
    const burning = summary.burning ?? total - deferred;
    window.$message?.warning?.(
      summary.note ||
        `部分入烧 ${burning}/${total}，${deferred} 条 soft_defer — 勿当整批成功`,
    );
    return;
  }
  window.$message?.success?.(summary.note || allOkLabel);
}
