import axios from "@/utils/axios";
import type { EpisodePackage, ValidationReport } from "@/types/ruleEngine";

/**
 * Axios interceptor returns the API envelope `{ code, data, message }` (not AxiosResponse).
 * Always take `.data` once — never `envelope.data.data`.
 */
type ApiEnvelope<T> = { code?: number; data: T; message?: string };

async function postData<T>(url: string, body?: unknown): Promise<T> {
  const envelope = (await axios.post(url, body)) as ApiEnvelope<T>;
  return envelope.data;
}

export async function validateEpisode(body: {
  projectId: number;
  scriptId: number;
  script?: string;
  scriptPlan?: string;
  storyboardTable?: string;
  storyboard?: unknown[];
}) {
  return postData<ValidationReport>("/ruleEngine/validate", body);
}

export async function compileDryRun(body: {
  projectId: number;
  scriptId: number;
  script?: string;
  scriptPlan?: string;
  storyboardTable?: string;
  storyboard?: unknown[];
}) {
  return postData<{ shots: unknown[]; report: ValidationReport }>("/ruleEngine/compileDryRun", body);
}

export async function preflightTouch(body: {
  projectId: number;
  scriptId: number;
  script?: string;
  scriptPlan?: string;
  storyboardTable?: string;
  storyboard?: unknown[];
  mode?: string;
  /** When set (e.g. singleImage), shot-level gates only run on these ids. */
  storyboardIds?: number[];
}) {
  return postData<{ allowed: boolean; report: ValidationReport }>("/ruleEngine/preflightTouch", body);
}

export async function getEpisodePackage(projectId: number, scriptId: number) {
  return postData<EpisodePackage>("/ruleEngine/getEpisodePackage", { projectId, scriptId });
}

export async function syncEpisodePackage(body: {
  projectId: number;
  scriptId: number;
  script?: string;
  scriptPlan?: string;
  storyboardTable?: string;
  storyboard?: unknown[];
}) {
  return postData<EpisodePackage>("/ruleEngine/saveEpisodePackage", body);
}

export async function saveEpisodePackageRaw(body: {
  projectId: number;
  scriptId: number;
  package: EpisodePackage;
}) {
  return postData<EpisodePackage>("/ruleEngine/saveEpisodePackage", body);
}

export async function getRuleReport(projectId: number, scriptId: number, script?: string) {
  return postData<{ report: ValidationReport; coverage: unknown; stageStatus: unknown }>("/ruleEngine/getReport", {
    projectId,
    scriptId,
    script,
  });
}

export async function importScriptBundle(body: {
  projectId: number;
  bundle: unknown;
  targetScriptId?: number;
  importMode?: "create" | "update" | "upsert";
  mergeStrategy?: "replaceAll" | "mergeLayers" | "preserveMedia";
  autoDesign?: boolean;
  blockOnQualityGate?: boolean;
}) {
  return postData<{
    scriptId: number;
    autoDesignJobId?: string;
    mergeReport?: {
      mediaPreservedCount?: number;
      mergeStrategy?: string;
      storyboardCount?: number;
      assetDiagnostics?: {
        seeded?: number;
        linked?: number;
        pruned?: number;
        speakerSeeded?: number;
        duplicateSuspects?: string[];
      };
    };
  }>("/ruleEngine/importScript", body);
}

export async function dryRunImport(body: {
  projectId: number;
  bundle: unknown;
  targetScriptId?: number;
  mergeStrategy?: "replaceAll" | "mergeLayers" | "preserveMedia";
}) {
  return postData<import("@/types/ruleEngine").DryRunImportSummary>("/ruleEngine/dryRunImport", body);
}

export async function getAdaptationSteps(projectId: number) {
  return postData<{
    projectType: "novel" | "script";
    novelChapterCount: number;
    w3Unlocked: boolean;
    steps: {
      id: string;
      label: string;
      done: boolean;
      locked: boolean;
      lockReason?: string;
      status: string;
    }[];
  }>("/scriptAgent/getAdaptationSteps", { projectId });
}

export async function enterProduction(body: { projectId: number; scriptId: number; autoDesign?: boolean }) {
  return postData<{ scriptId: number; href?: string }>("/scriptAgent/enterProduction", body);
}

export interface DetectionResultRow {
  id: string;
  level?: string;
  domain?: string;
  chainId?: string;
  description?: string;
  severity: "BLOCK" | "WARN" | "INFO";
  passed: boolean;
  message?: string;
  fieldPaths?: string[];
  repairHintId?: string;
}

export async function preflightProduction(body: {
  projectId: number;
  scriptId: number;
  storyboardIds?: number[];
  modality?: "IMG" | "VID" | "AUD" | "FX";
  tier?: "T1" | "T2" | "T3";
}) {
  return postData<{
    blocked: boolean;
    blockGenerate: boolean;
    detectionResults: DetectionResultRow[];
    gapSummary: { total: number; blocks: number; warns: number };
    closureReport?: unknown;
    failedChecks?: DetectionResultRow[];
    rePushPlan?: import("@/types/closure").RePushPlanItem[];
  }>("/ruleEngine/preflightProduction", body);
}

export async function inspectBundle(body: { bundle: unknown; tier?: "T1" | "T2" | "T3" }) {
  return postData<import("@/types/closure").InspectBundleResult>("/ruleEngine/inspectBundle", body);
}

export async function exportGate(body: { bundle: unknown; tier?: "T1" | "T2" | "T3" }) {
  return postData<{
    exportAllowed: boolean;
    tier: "T1" | "T2" | "T3";
    closureSnapshot?: {
      tier: "T1" | "T2" | "T3";
      blocked: boolean;
      blockIds: string[];
      warnIds: string[];
      checkedAt: string;
      rulePackVersion: string;
    };
    coverage?: {
      matrixTotal: number;
      blocks: number;
      warns: number;
      softPatchEligible: number;
    };
    repairHints?: import("@/types/closure").RepairHint[];
    chatRepairText?: string;
    inspected?: import("@/types/closure").InspectBundleResult;
    designFindings?: { id: string; severity: "BLOCK" | "WARN"; message: string; field?: string }[];
    fieldWalkGaps?: { id: string; severity: "BLOCK" | "WARN"; message: string; field?: string; shotIndex?: number }[];
  }>("/ruleEngine/exportGate", body);
}

export async function selfHeal(body: {
  projectId: number;
  scriptId: number;
  shotId?: number;
  errorText?: string;
  category?: string;
  jobKind?: string;
  round?: number;
  dryRun?: boolean;
  apply?: boolean;
  identityGaps?: { code: string; reason: string; kind?: string }[];
  issues?: { ruleId?: string; message?: string; autoFix?: { confidence?: number; patch?: Record<string, unknown> } }[];
}) {
  return postData<{
    ok: boolean;
    exhausted: boolean;
    healRound: number;
    patchesApplied: string[];
    triggers: string[];
    rePushPlan?: unknown;
    stillQueue?: { code: string; action: string; kind?: string }[];
    stillRunner?: { queued: number; assetIds: number[]; message: string };
    skipped?: { kind: string; reason: string }[];
    autoApplicable: boolean;
    mode: string;
    message: string;
    retrySuggested?: boolean;
    appliedToDb?: boolean;
  }>("/ruleEngine/selfHeal", body);
}

/** Import-preview / declaration soft_patch (LANG/CAM/FX-F0) — returns mutated bundle when apply. */
export async function precheckLoop(body: {
  projectId?: number;
  scriptId?: number;
  bundle?: unknown;
  checks?: string[];
  apply?: boolean;
  maxRounds?: number;
  storyboardIds?: number[];
}) {
  return postData<{
    ok: boolean;
    exhausted: boolean;
    decision: { mode: string; reason?: string };
    patches?: unknown[];
    applied?: string[];
    repairHint?: { chatTemplate?: string };
    bundle?: unknown;
    appliedToDb?: boolean;
    shapeSalvageLog?: { ruleId: string; path: string; action: string }[];
  }>("/ruleEngine/precheckLoop", body);
}

/** Unified heal: Salvage → Normalize → PrecheckLoop → ExportGate */
export async function importHeal(body: {
  bundle: unknown;
  checks?: string[];
  apply?: boolean;
  maxRounds?: number;
  projectId?: number;
  scriptId?: number;
}) {
  return postData<{
    bundle: unknown;
    shapeSalvageLog: { ruleId: string; path: string; action: string }[];
    precheckLoop: {
      ok: boolean;
      applied?: string[];
      decision?: { mode: string; reason?: string };
      repairHint?: { chatTemplate?: string };
    };
    exportGate: {
      exportAllowed: boolean;
      chatRepairText?: string;
      coverage?: { blocks: number; warns: number };
      blocks?: { id: string; message: string }[];
      warns?: { id: string; message: string }[];
    };
    inspected: import("@/types/closure").InspectBundleResult;
    serverFixedIds: string[];
    chatMustFixIds: string[];
    healLog?: { at: string; ruleId: string; action: string; detail?: string }[];
    primary?: {
      primaryNextStep: string;
      userMessage: string;
      ctaLabel: string;
      userMessageKey?: string;
      suggestedValue?: number | string;
    };
    splitPlans?: unknown[];
  }>("/ruleEngine/importHeal", body);
}
