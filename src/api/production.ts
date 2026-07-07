import { http } from "./client";

export function saveFlowData(projectId: string, episodesId: number | undefined, data: unknown) {
  return http.post("/production/saveFlowData", { projectId, data, episodesId });
}

export function getFlowData(projectId: string, episodesId: number | undefined) {
  return http.post("/production/getFlowData", { projectId, episodesId });
}

export function batchGenerateStoryboard(payload: Record<string, unknown>) {
  return http.post("/production/storyboard/batchGenerateImage", payload);
}

export function batchGenerateAssets(payload: Record<string, unknown>) {
  return http.post("/production/assets/batchGenerateAssetsImage", payload);
}

export function pollAssetsImages(ids: number[]) {
  return http.post("/production/assets/pollingImage", { ids });
}

export function pollStoryboardImages(ids: number[]) {
  return http.post("/production/storyboard/pollingImage", { ids });
}

export function batchAddStoryboardInfo(payload: Record<string, unknown>) {
  return http.post("/production/storyboard/batchAddStoryboardInfo", payload);
}

export function getWorkbenchFileUrl(payload: Record<string, unknown>) {
  return http.post("/production/workbench/getFileUrl", payload);
}
