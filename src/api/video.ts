import { http } from "./client";

export function getVideos(payload: Record<string, unknown>) {
  return http.post("/video/getVideo", payload);
}

export function getVideoConfigs(scriptId: number) {
  return http.post("/video/getVideoConfigs", { scriptId });
}

export function deleteVideoConfig(id: number) {
  return http.post("/video/deleteVideoConfig", { id });
}

export function generateVideo(payload: Record<string, unknown>) {
  return http.post("/video/generateVideo", payload);
}
