import axios from "@/utils/axios";
import type { EpisodePackage, ValidationReport } from "@/types/ruleEngine";

export async function validateEpisode(body: {
  projectId: number;
  scriptId: number;
  script?: string;
  scriptPlan?: string;
  storyboardTable?: string;
  storyboard?: unknown[];
}) {
  const { data } = await axios.post<{ data: ValidationReport }>("/ruleEngine/validate", body);
  return data.data;
}

export async function compileDryRun(body: {
  projectId: number;
  scriptId: number;
  script?: string;
  scriptPlan?: string;
  storyboardTable?: string;
  storyboard?: unknown[];
}) {
  const { data } = await axios.post<{ data: { shots: unknown[]; report: ValidationReport } }>("/ruleEngine/compileDryRun", body);
  return data.data;
}

export async function preflightTouch(body: {
  projectId: number;
  scriptId: number;
  script?: string;
  scriptPlan?: string;
  storyboardTable?: string;
  storyboard?: unknown[];
}) {
  const { data } = await axios.post<{ data: { allowed: boolean; report: ValidationReport } }>("/ruleEngine/preflightTouch", body);
  return data.data;
}

export async function getEpisodePackage(projectId: number, scriptId: number) {
  const { data } = await axios.post<{ data: EpisodePackage }>("/ruleEngine/getEpisodePackage", { projectId, scriptId });
  return data.data;
}

export async function syncEpisodePackage(body: {
  projectId: number;
  scriptId: number;
  script?: string;
  scriptPlan?: string;
  storyboardTable?: string;
  storyboard?: unknown[];
}) {
  const { data } = await axios.post<{ data: EpisodePackage }>("/ruleEngine/saveEpisodePackage", body);
  return data.data;
}

export async function getRuleReport(projectId: number, scriptId: number, script?: string) {
  const { data } = await axios.post<{ data: { report: ValidationReport; coverage: unknown; stageStatus: unknown } }>("/ruleEngine/getReport", {
    projectId,
    scriptId,
    script,
  });
  return data.data;
}
