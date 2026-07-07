import { http } from "./client";

export function getAgentMemory(payload: Record<string, unknown>) {
  return http.post("/agents/getMemory", payload);
}
