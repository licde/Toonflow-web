export interface ValidationIssue {
  ruleId: string;
  tier: 0 | 1 | 2 | 3;
  severity: "BLOCK" | "WARN" | "INFO";
  shotId?: string;
  fieldPath: string;
  message: string;
  rollbackLayer: string;
  autoFix?: { patch: Record<string, unknown>; confidence: number };
}

export interface ValidationReport {
  scriptId: number;
  projectId: number;
  passed: boolean;
  blockCount: number;
  warnCount: number;
  issues: ValidationIssue[];
  stageStatus: Record<string, string>;
  ruleCoverage: { total: number; hit: number; tier0Hit: number };
  rulePackVersion: string;
}

export interface EpisodeShot {
  id: string;
  storyboardId?: number;
  index: number;
  narrative: Record<string, unknown>;
  generation: {
    compiled?: { image: string; video: string; audio: string; hash: string };
    manualOverride?: { image?: boolean; video?: boolean };
  };
}

export interface EpisodePackage {
  version: number;
  scriptId: number;
  projectId: number;
  shots: EpisodeShot[];
  rulePackVersion: string;
  updatedAt: number;
}

export interface DryRunImportSummary {
  willCreateScript: boolean;
  willOverwriteLayers: string[];
  storyboardCount: number;
  mergeStrategy: string;
  warnings: string[];
  tier?: "T1" | "T2" | "T3";
  shapeSalvageLog?: { ruleId: string; path: string; action: string }[];
  preImport?: import("./closure").InspectBundleResult;
  exportGate?: {
    exportAllowed: boolean;
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
    chatRepairText?: string;
    blocks?: { id: string; message?: string; field?: string }[];
    warns?: { id: string; message?: string }[];
    repairHints?: { id: string; chatTemplate?: string; ruleId?: string }[];
    missingFieldSummary?: string;
    shapeSalvageLog?: { ruleId: string; path: string; action: string }[];
  };
  chatRepairText?: string;
}
