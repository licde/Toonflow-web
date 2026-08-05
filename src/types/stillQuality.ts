/**
 * Still quality / burn-ready contract for Toonflow-web FE.
 * Copy alongside STILL_INTENT_OPS_CONTRACT.md — keep/upload must not forge HQ.
 */

/** Persisted on o_storyboard.reason (and API responses) */
export type StillQuality = "missing" | "weak" | "hq_ok" | "stale_inherited";

export interface StillMeta {
  stillQuality?: StillQuality;
  visualPass?: boolean;
  visualPassAt?: string;
  /** Collage / turnaround sheet leak from VLM — burn must treat as weak */
  sheetLeak?: boolean;
  burnReady?: boolean;
  /** Preview / compose-only — never true until L1 visualPass */
  pixelHq?: boolean;
  pendingHumanRejudge?: boolean;
  fidelityStopReason?: string;
  vlmError?: string;
  primaryNextStep?: string;
  ctaLabel?: string;
  userMessage?: string;
  rePushPlan?: unknown[];
  literaryDescHash?: string;
  videoStale?: boolean;
  /** IRD primary when design debt (LIT/PROP) — prefer enhance/hand_edit over batch_still */
  irdPrimaryAction?:
    | "apply_auto"
    | "apply_auto_enhance"
    | "confirm_split"
    | "confirm_enhance"
    | "hand_edit_vd"
    | "batch_still_hq"
    | "none"
    | string;
  /** Structure slots still missing from diagnose/detect — FE chips */
  missingSlots?: string[];
  /** generateFlowImage ops echo — faceCu dropped SCENE refs */
  sceneRefsDropped?: number;
  excludeScene?: boolean;
  keepSoftEnvRef?: boolean;
  bgMode?: "keep_plate" | "soft_env" | "atmosphere_only";
  bgPolicy?: string;
  bgPolicyReason?: string;
  /** Import soft ≠ design exit pass — show in DebtBar */
  importOkNotExit?: boolean;
  settingsDeepLink?: string;
  /** BE hint: FE must not silent re-POST generate */
  blockSilentRegen?: boolean;
  /** After split_shot: reload panels before generating children */
  refreshStoryboardBeforeRegen?: boolean;
  /** Key optional — absent ⇒ unmeasured, not must-configure */
  keyOptional?: boolean;
  /** unmeasured | measured_fail | measured_pass */
  pixelDimStatus?: "unmeasured" | "measured_fail" | "measured_pass" | string;
  promptLintConflicts?: string[];
  promptProvenance?: Array<{ source: string; note?: string }>;
  evidenceTtlMs?: number;
  evidenceHash?: string;
  contractVersion?: string;
  contractHash?: string;
  contactGeomEvidence?: Record<string, unknown>;
  propReadableEvidence?: Record<string, unknown>;
  poseEvidence?: Record<string, unknown>;
  roleScopeEvidence?: Record<string, unknown>;
  sceneDominanceEvidence?: Record<string, unknown>;
  i2vReady?: boolean;
  i2vBlockReason?: string;
  autoRepairStage?: string;
  autoRepairRound?: number;
  autoRepairBudgetLeft?: number;
  handoffReason?: string;
  /** SingleShotClosedCompose — true only when all gates pass */
  closedCompose?: boolean;
  boundShotIndex?: number | null;
  framingMode?: string | null;
  closedAssertReasons?: string[];
  contaminationClass?: string | null;
  flowStaleHint?: boolean;
  /** Event refs echo */
  refsRoles?: string[];
  /** Physical send-order thumbs for @图N chip verify */
  refThumbUrls?: string[];
  vendorPromptUsed?: string | null;
  promptUsed?: string | null;
  oneClickRepairKind?: string | null;
  propPlateMissing?: boolean;
  synthesizedPropPlate?: boolean;
  softEnvMissingHonest?: boolean;
  softEnvBakedIntoIdentity?: boolean;
  softEnvContinuity?: "must" | "optional" | "none" | string;
  propSource?: string;
  vendorCalled?: boolean;
  vendorMs?: number;
  /** Actuator echo (Comfy / Seedream) */
  actuatorId?: string;
  workflowHash?: string;
  actuatorDegraded?: boolean;
  actuatorDegradedReason?: string;
  propPlateGrade?: "asset" | "fe" | "synthetic_geometry" | "missing" | string;
  egressCompressed?: boolean;
  /** Structure form miss vs Key-unmeasured vs actuator degrade — FE must not collapse */
  debtKind?:
    | "prop_form"
    | "prop_plate"
    | "soft_env"
    | "key_unmeasured"
    | "actuator_degraded"
    | "lit_slot"
    | "missing_identity"
    | string;
  /** draft | preview | burn — out ≠ hq_ok */
  deliveryTier?: "draft" | "preview" | "burn" | string;
  /** Design debt must clear before burn — does NOT block generate */
  requireFixBeforeBurn?: boolean;
  /** Shared CTA kind for Chat/Web */
  ctaKind?: string;
}

/** Split structure/form debt vs Key-optional unmeasured vs actuator degrade (三分流). */
export function resolveStillDebtSemantics(meta: StillMeta | null | undefined): {
  kind:
    | "prop_form"
    | "prop_plate"
    | "soft_env"
    | "key_unmeasured"
    | "actuator_degraded"
    | "lit_slot"
    | "none";
  ctaLabel: string;
  explain: string;
} {
  if (!meta) return { kind: "none", ctaLabel: "", explain: "" };
  const slots = meta.missingSlots ?? [];
  const blob = `${meta.userMessage ?? ""} ${meta.ctaLabel ?? ""} ${slots.join(" ")}`;
  // 1) Actuator degrade — honest Comfy→Seedream fallback (not Key, not form debt)
  if (meta.actuatorDegraded || meta.debtKind === "actuator_degraded") {
    return {
      kind: "actuator_degraded",
      ctaLabel: "可控后端降级·可人审",
      explain: `高难镜优选 Comfy 不可用（${meta.actuatorDegradedReason || "degraded"}），已诚实降级 Seedream；非 Key 问题，人审可放行。`,
    };
  }
  // 2) Synthetic geometry — not a real PROP lock
  if (
    meta.propPlateGrade === "synthetic_geometry" ||
    (meta.synthesizedPropPlate && /synthetic|合成/.test(blob + String(meta.propPlateGrade ?? "")))
  ) {
    if (/卷棒|纸卷|prop_form|形态|抵颏|synthetic_geometry/.test(blob + String(meta.propPlateGrade ?? ""))) {
      return {
        kind: "prop_form",
        ctaLabel: "挂真道具板后重出",
        explain: "当前为 synthetic_geometry 几何软板，不冒充形态锁；请挂真 PROP 资产后再出。",
      };
    }
  }
  // 3) Key optional unmeasured — never「必须装 Key」
  if (meta.keyOptional || meta.pixelDimStatus === "unmeasured" || meta.debtKind === "key_unmeasured") {
    if (!slots.some((s) => /prop|contact|form|glyph|softEnv/i.test(s)) && !/卷棒|薄纸|形态|道具板/.test(blob)) {
      return {
        kind: "key_unmeasured",
        ctaLabel: humanRejudgePrimaryCta(meta),
        explain: "像素诊断 Key 未装/未测（可选）。文学与形态约束仍有效；请人审放行，勿当作缺约束。",
      };
    }
  }
  if (meta.propPlateMissing || slots.some((s) => /propSoft|propPlate/i.test(s)) || /道具参考板|PROP soft/i.test(blob)) {
    return {
      kind: "prop_plate",
      ctaLabel: "挂道具板后再生成",
      explain: "接触/道具事件缺道具参考板；请挂 PROP 或允许结构合成软板。",
    };
  }
  if (/卷棒|纸卷|prop_form|形态|抵颏/.test(blob) || slots.some((s) => /prop_form|form/i.test(s))) {
    return {
      kind: "prop_form",
      ctaLabel: "重出形态静照",
      explain: "道具形态未按契约（须展开薄纸片/禁卷棒抵颏）；请重出静照，勿当作 Key 未测。",
    };
  }
  if (
    meta.softEnvMissingHonest ||
    slots.some((s) => /softEnv/i.test(s)) ||
    /SOFT-ENV-BAKE-FAILED|烘焙失败/.test(blob)
  ) {
    return {
      kind: "soft_env",
      ctaLabel: /烘焙失败|BAKE/.test(blob) ? "补场景软板后重试" : "补场景软板",
      explain: /烘焙失败|BAKE/.test(blob)
        ? "软环境为连贯性必须，但 SCENE 烘焙失败；禁止仅文案写禁止灰棚。"
        : "软环境 SCENE 板未挂上；成图易灰棚，建议补场景软板。",
    };
  }
  if (slots.length) {
    return {
      kind: "lit_slot",
      ctaLabel: resolveStillRepairCtaLabel(meta),
      explain: `缺结构槽 ${slots.join("/")}；可增强或手改 VD。`,
    };
  }
  return { kind: "none", ctaLabel: resolveStillRepairCtaLabel(meta), explain: "" };
}

/**
 * FE: storyboard.state「已完成」≠ stillQuality hq_ok.
 * burnReady only when hq_ok && visualPass && !sheetLeak.
 */
export function deriveBurnReady(meta: StillMeta | null | undefined): boolean {
  if (!meta) return false;
  if (meta.sheetLeak) return false;
  if (meta.stillQuality !== "hq_ok") return false;
  if (meta.visualPass !== true) return false;
  return true;
}

export function stillQualityBadgeLabel(meta: StillMeta | null | undefined): string {
  if (!meta) return "缺静照";
  if (meta.sheetLeak) return "拼版弱图";
  if (meta.stillQuality === "hq_ok" && meta.visualPass) return "可燃片";
  if (meta.pixelDimStatus === "unmeasured" || meta.keyOptional) {
    if (meta.stillQuality === "weak" || meta.pendingHumanRejudge) return "未测·弱图";
  }
  if (meta.stillQuality === "weak" || meta.pendingHumanRejudge) return "弱图不可作视频首帧";
  if (meta.stillQuality === "missing") return "缺静照";
  return "待验收";
}

/** BE I5 homology: sheetLeak / single_frame collage → CTA「禁拼版重抽」(≠ generic HQ regen). */
export function isSheetLeakSignal(meta: StillMeta | null | undefined): boolean {
  if (!meta) return false;
  if (meta.sheetLeak === true) return true;
  const blob = `${meta.ctaLabel ?? ""} ${meta.userMessage ?? ""} ${meta.fidelityStopReason ?? ""}`;
  return /sheetLeak|拼版|四视|四宫格|禁拼版/i.test(blob);
}

/** Prefer BE ctaLabel when already「禁拼版*」; else force sheet-leak CTA (never「更新高质量分镜图」alone). */
export function sheetLeakCtaLabel(meta: StillMeta | null | undefined): string {
  const be = String(meta?.ctaLabel ?? "").trim();
  if (/禁拼版/.test(be)) return be;
  return "禁拼版重抽";
}

/** Resolve primary still-repair CTA: sheetLeak wins over generic HQ / batch_still. */
export function resolveStillRepairCtaLabel(meta: StillMeta | null | undefined): string {
  if (meta?.autoRepairStage && meta?.autoRepairStage !== "handoff_human") {
    return "自动修复中";
  }
  if (isSheetLeakSignal(meta)) return sheetLeakCtaLabel(meta);
  const be = String(meta?.ctaLabel ?? "").trim();
  if (be) return be;
  const step = String(meta?.primaryNextStep ?? "");
  if (step === "split_shot") return "确认智能拆镜";
  if (step === "chat_repair") return "复制给 Chat";
  if (step === "batch_still") return "去生成静照";
  return "更新高质量分镜图";
}

/** Key optional: primary CTA when pendingHumanRejudge without VLM Key */
export function humanRejudgePrimaryCta(meta: StillMeta | null | undefined): string {
  if (meta?.pendingHumanRejudge || meta?.pixelDimStatus === "unmeasured" || meta?.keyOptional) {
    return "人审通过（未测·非失败）";
  }
  return "人审通过";
}

/** Show human rejudge entry when Key absent or unmeasured — valid delivery path */
export function shouldOfferHumanRejudge(meta: StillMeta | null | undefined): boolean {
  if (!meta) return false;
  if (meta.pendingHumanRejudge === true) return true;
  if (meta.keyOptional === true) return true;
  if (meta.pixelDimStatus === "unmeasured") return true;
  if (meta.stillQuality === "weak" && Boolean(meta.vlmError)) return true;
  return false;
}

/**
 * Shootable-first: NEVER brick Generate for policy debt.
 * Identity / lit / fidelity → enqueue+heal CTA, buttons stay clickable.
 */
export function shouldBlockSilentStillRegen(_meta: StillMeta | null | undefined): boolean {
  return false;
}

/** Chat/Web CTA SSOT — same labels on DebtBar and agent tools. */
export function resolveStillPrimaryCtaLabel(meta: StillMeta | null | undefined): {
  kind: string;
  label: string;
  blocksGenerate: boolean;
} {
  if (!meta) return { kind: "generate", label: "生成静帧", blocksGenerate: false };
  const ock = String(meta.oneClickRepairKind ?? "");
  if (ock === "design_refine") {
    return { kind: "enhance_and_generate", label: "设计细化·补挂图N资产", blocksGenerate: false };
  }
  if (ock && ock !== "none" && ock !== "confirm_required") {
    return {
      kind: "one_click_heal",
      label:
        ock === "split" || ock === "shotSize_and_split"
          ? "一键智拆并生成"
          : ock === "shotSize"
            ? "一键改景别并生成"
            : ock === "partial_edit"
              ? "局部智能修复"
              : ock === "restore_scene"
                ? "一键智能修复·恢复场景板"
                : ock === "rebind_ordinal"
                  ? "一键智能修复·重绑@图N"
                  : ock === "recompile_keep_ordinal"
                    ? "一键智能修复·重编译保留@图N"
                    : ock === "regen_still_then_burn"
                      ? "一键智能修复·先重出静照"
                      : "一键智能修复",
      blocksGenerate: false,
    };
  }
  if (meta.debtKind === "missing_identity" || meta.propPlateGrade === "identity_missing") {
    return { kind: "enqueue_identity_and_generate", label: "补定妆并继续生成", blocksGenerate: false };
  }
  if (meta.debtKind === "prompt_fidelity") {
    return { kind: "enhance_and_generate", label: "增强锚点并生成", blocksGenerate: false };
  }
  if (meta.stillQuality === "hq_ok" && meta.visualPass === true) {
    return { kind: "burn_ready", label: "可烧视频", blocksGenerate: false };
  }
  // Intent-first: pose realization debt does not block burn CTA
  if (
    meta.realizationDegraded === true ||
    (meta as { realization?: { realizationDegraded?: boolean } }).realization?.realizationDegraded === true
  ) {
    return { kind: "burn_ready", label: "可烧视频（姿态债）", blocksGenerate: false };
  }
  const step = String(meta.primaryNextStep ?? "");
  const ird = String(meta.irdPrimaryAction ?? "");
  if (ird === "confirm_split" || step === "split_shot") {
    return { kind: "split_and_generate", label: "智拆并生成", blocksGenerate: false };
  }
  if (ird === "confirm_enhance" || ird === "apply_auto_enhance" || step === "chat_repair") {
    return { kind: "enhance_and_generate", label: "增强设计并生成", blocksGenerate: false };
  }
  if (
    step === "regen_storyboard_hq" ||
    step === "retry_shot" ||
    step === "batch_still" ||
    meta.pixelDimStatus === "unmeasured" ||
    meta.keyOptional
  ) {
    return { kind: "continue_repair", label: "继续生成修复", blocksGenerate: false };
  }
  return { kind: "generate", label: "生成静帧", blocksGenerate: false };
}

/** After split_shot success: FE must reload panels before generating child shots. */
export function requiresStoryboardRefreshBeforeRegen(meta: StillMeta | null | undefined): boolean {
  if (meta?.refreshStoryboardBeforeRegen === true) return true;
  return (
    String(meta?.primaryNextStep ?? "") === "split_shot" ||
    meta?.irdPrimaryAction === "confirm_split"
  );
}

/** Canvas banner when faceCu dropped SCENE refs (soft_env keeps one env plate) */
export function faceCuRefsEchoLabel(meta: StillMeta | null | undefined): string | null {
  if (!meta?.excludeScene) return null;
  if (meta.keepSoftEnvRef || meta.bgMode === "soft_env") {
    const n = meta.sceneRefsDropped ?? 0;
    return n > 0
      ? `特写已降建立场景抢戏（丢 ${n}），保留软环境板`
      : "特写已降建立场景抢戏，保留软环境板";
  }
  const n = meta.sceneRefsDropped ?? 0;
  if (n > 0) return `特写已丢 ${n} 张场景参考，仅用身份板`;
  return "特写已排除场景参考，仅用身份板";
}

/** Preflight homology: prefer passed over stale failed for same rule id */
export type PreflightDetectionRow = {
  id?: string;
  ruleId?: string;
  severity?: string;
  passed?: boolean;
  message?: string;
};

/**
 * FE runPreflight merge: never toast a BLOCK that a later/passed row cleared.
 * Order: production detectionResults then touch issues; same id → passed wins.
 */
export function mergePreflightBlocksForToast(
  prodRows: PreflightDetectionRow[],
  touchIssues: PreflightDetectionRow[],
): PreflightDetectionRow[] {
  const byId = new Map<string, PreflightDetectionRow>();
  const keyOf = (r: PreflightDetectionRow) => String(r.id || r.ruleId || "");
  for (const r of [...prodRows, ...touchIssues]) {
    const k = keyOf(r);
    if (!k) continue;
    const prev = byId.get(k);
    if (!prev) {
      byId.set(k, r);
      continue;
    }
    const prevFail = prev.passed === false || String(prev.severity).toUpperCase() === "BLOCK";
    const nextPass = r.passed === true || String(r.severity).toUpperCase() !== "BLOCK";
    if (prevFail && nextPass) byId.set(k, r);
    else if (!prevFail && r.passed === false) {
      /* keep cleared */
    } else byId.set(k, r);
  }
  return [...byId.values()].filter(
    (r) => r.passed === false || String(r.severity).toUpperCase() === "BLOCK",
  );
}

/** Homology class: after BE until-clear these must not appear as hard toast */
export const HOMOLOGY_CLEAR_RULE_IDS = new Set([
  "DC-01-EXTRA",
  "DC-01",
  "H3",
  "R2",
  "FX-GRADE-01",
  "DG-FALSE-GREEN-FX",
]);

/** Video track: soft_deliver / qcWeak playable ≠ burn-ready first frame */
export function deriveTrackBurnAllowed(opts: {
  state?: string | null;
  burnAllowed?: boolean | null;
  qcWeak?: boolean | null;
  softDeliver?: boolean | null;
  stillMeta?: StillMeta | null;
}): boolean {
  if (opts.state === "需完善") return false;
  if (opts.burnAllowed === false) return false;
  if (opts.qcWeak === true || opts.softDeliver === true) return false;
  return deriveBurnReady(opts.stillMeta ?? null);
}

/** IMPORT_OK_NOT_EXIT must surface in DebtBar — not treated as design exit pass */
export function showImportOkNotExitBanner(meta: StillMeta | null | undefined): boolean {
  return meta?.importOkNotExit === true;
}

/** Seedream still dialect chips: prefer @图N, also parse @图片N */
export type AtTuEgressChip = {
  ordinal: number;
  token: string;
  label: string;
  thumbUrl: string;
  missingThumb: boolean;
  role?: string;
};

export function resolveAtTuEgressChips(input: {
  egressPrompt?: string | null;
  refsRoles?: string[] | null;
  refThumbUrls?: string[] | null;
  fallbackThumbs?: string[] | null;
}): { chips: AtTuEgressChip[]; dialect: "tu" | "tupian" | "mixed" | "none"; chipCount: number; refCount: number } {
  const p = String(input.egressPrompt ?? "");
  const tu = [...p.matchAll(/@图(\d+)\s*为([^\s@【，,]+)?/g)];
  const tupian = [...p.matchAll(/@图片(\d+)/g)];
  const roles = input.refsRoles ?? [];
  const thumbs = input.refThumbUrls?.length ? input.refThumbUrls : input.fallbackThumbs ?? [];
  const byOrd = new Map<number, AtTuEgressChip>();
  for (const m of tu) {
    const ordinal = Number(m[1]);
    byOrd.set(ordinal, {
      ordinal,
      token: `@图${ordinal}`,
      label: String(m[2] ?? "").trim() || `图${ordinal}`,
      thumbUrl: String(thumbs[ordinal - 1] ?? ""),
      missingThumb: !String(thumbs[ordinal - 1] ?? "").trim(),
      role: roles[ordinal - 1],
    });
  }
  if (!byOrd.size) {
    for (const m of tupian) {
      const ordinal = Number(m[1]);
      byOrd.set(ordinal, {
        ordinal,
        token: `@图片${ordinal}`,
        label: `图${ordinal}`,
        thumbUrl: String(thumbs[ordinal - 1] ?? ""),
        missingThumb: !String(thumbs[ordinal - 1] ?? "").trim(),
        role: roles[ordinal - 1],
      });
    }
  }
  for (let i = 0; i < Math.max(roles.length, thumbs.length); i++) {
    const ordinal = i + 1;
    if (!byOrd.has(ordinal)) {
      byOrd.set(ordinal, {
        ordinal,
        token: `@图${ordinal}`,
        label: String(roles[i] ?? `图${ordinal}`),
        thumbUrl: String(thumbs[i] ?? ""),
        missingThumb: !String(thumbs[i] ?? "").trim(),
        role: roles[i],
      });
    }
  }
  const chips = [...byOrd.values()].sort((a, b) => a.ordinal - b.ordinal);
  const dialect =
    tu.length && tupian.length ? "mixed" : tu.length ? "tu" : tupian.length ? "tupian" : chips.length ? "tu" : "none";
  return { chips, dialect, chipCount: chips.length, refCount: Math.max(roles.length, thumbs.filter(Boolean).length) };
}

/** Canvas egress: prefer vendorPromptUsed ZH @图N */
export function resolveStillCanvasDisplayPrompt(meta: StillMeta | null | undefined): string {
  const v = String(meta?.vendorPromptUsed || meta?.promptUsed || "").trim();
  return v;
}
