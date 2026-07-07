import { http } from "./client";

export function getProjects() {
  return http.post("/project/getProject");
}

export function getProjectById(id: number) {
  return http.post("/project/getSingleProject", { id });
}

export function addProject(data: Record<string, unknown>) {
  return http.post("/project/addProject", data);
}

export function editProject(data: Record<string, unknown>) {
  return http.post("/project/editProject", data);
}

export function deleteProject(id: string | undefined) {
  return http.post("/project/delProject", { id });
}

export function getModelDetail(modelId: string) {
  return http.post("/modelSelect/getModelDetail", { modelId });
}
