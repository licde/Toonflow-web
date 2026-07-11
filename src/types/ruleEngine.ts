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
