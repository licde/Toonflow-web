import { http } from "./client";

export function getScriptByProjectId(projectId: number) {
  return http.post("/script/getScrptApi", { projectId });
}

export function saveScriptAgentPlan(projectId: string | number, data: unknown) {
  return http.post("/scriptAgent/setPlanData", { projectId, agentType: "scriptAgent", data });
}
