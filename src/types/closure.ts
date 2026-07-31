/** Matches POST /api/ruleEngine/inspectBundle response */

export type ClosureTier = "T1" | "T2" | "T3";

export interface ClosureCheck {
  id: string;
  passed: boolean;
  message?: string;
  severity?: "BLOCK" | "WARN" | "INFO" | "OPTIMIZE";
}

export interface ReverseHint {
  dimension: string;
  chainId: string;
  symptom: string;
  reverseTarget: string;
  preserveFields?: string[];
  ruleId?: string;
}

export interface RepairHint {
  id: string;
  chatTemplate?: string;
  ruleId?: string;
  qpId?: string;
}

export interface RePushPlanItem {
  id?: string;
  trigger: string;
  reverseTarget: string;
  preserveFields?: string[];
  presentationFork?: "fork-A" | "fork-B" | null;
  reason?: string;
  status?: "pending" | "applied" | "in_progress" | "completed" | "exhausted";
}

/** W93 / IC-02 smart proposal — Confirm then apply via smartProposalOps */
export interface SmartDesignProposal {
  id?: string;
  ruleId: string;
  trigger: string;
  proposal: string;
  targetStage: string;
  status: "pending_user_confirm" | "confirmed" | "rejected" | "applied";
  shotIndex?: number;
  confidence?: number;
  presentationFork?: { fork: string; label: string }[];
}

export function forkLabel(fork: RePushPlanItem["presentationFork"] | string | null | undefined): string {
  if (fork === "fork-A") return "改 W3 △ 叙事描述";
  if (fork === "fork-B") return "改 SB spatialRelation 镜级";
  return "";
}

export interface ClosureReport {
  missing?: string[];
  optimize?: string[];
  chains?: string[];
}

export interface ChatPromptGap {
  id: string;
  shotIndex?: number;
  severity: "BLOCK" | "WARN";
  message: string;
  field?: string;
}

export interface MergeReport {
  action: "create" | "update" | "match";
  scriptId: number;
  storyboardReplaced: boolean;
  storyboardCount: number;
  blueprintMerged: boolean;
  assetsSeeded?: number;
  importMode?: string;
  mergeStrategy?: string;
  mediaPreservedCount?: number;
  assetDiagnostics?: {
    seeded?: number;
    linked?: number;
    pruned?: number;
    speakerSeeded?: number;
    duplicateSuspects?: string[];
  };
}

export interface QualityGateIssue {
  id: string;
  severity: "BLOCK" | "WARN" | "INFO";
  message: string;
  shotIndex?: number;
}

export interface InspectBundleResult {
  tier: ClosureTier;
  blocked: boolean;
  rulePackVersion: string;
  closureChecks: {
    dc: ClosureCheck[];
    pc: ClosureCheck[];
    gc: ClosureCheck[];
    ic: ClosureCheck[];
    blocked: boolean;
  };
  forwardTrace?: { version?: string; traces?: unknown[] };
  reverseHints?: ReverseHint[];
  repairHints?: RepairHint[];
  rePushPlan?: RePushPlanItem[];
  warnings?: string[];
  chatPromptGaps?: ChatPromptGap[];
  closureReport?: ClosureReport;
  modalityGaps?: unknown[];
  adaptationGaps?: unknown[];
  retentionGaps?: unknown[];
  narrativeDriveGaps?: unknown[];
  packagingGaps?: unknown[];
  generationApplyGaps?: unknown[];
  designSpecGaps?: unknown[];
  scriptViralGaps?: unknown[];
  qualityGate?: {
    blocked: boolean;
    blocks: QualityGateIssue[];
    warns: QualityGateIssue[];
    issues: QualityGateIssue[];
  };
  /** One-copy repair brief from exportGate / inspect */
  chatRepairText?: string;
  /** W93 smart proposals (also pass as RulePanel prop) */
  smartDesignProposals?: SmartDesignProposal[];
}

export type ClosureDimension = "dc" | "pc" | "gc" | "ic";

export const CLOSURE_DIMENSION_LABELS: Record<ClosureDimension, string> = {
  dc: "设计闭环 DC",
  pc: "制作闭环 PC",
  gc: "生成闭环 GC",
  ic: "智能修复 IC",
};
