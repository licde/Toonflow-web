import { defineComponent, h, reactive, ref } from "vue";

export function generateId(prefix = "stub-") {
  return `${prefix}${Date.now()}`;
}

export function normalizeTime(value: number) {
  return value;
}

export async function extractVideoThumbnails(_sourceUrl: string, _options?: unknown) {
  return { thumbnails: [] as string[], duration: 0 };
}

export async function extractAudioWaveform(_sourceUrl: string, _options?: unknown) {
  return { waveformData: [] as number[], duration: 0 };
}

export async function extractVideoAudioWaveform(_sourceUrl: string, _options?: unknown) {
  return { waveformData: [] as number[], duration: 0 };
}

export const usePlaybackStore = () =>
  reactive({
    currentTime: 0,
  });

export const useTracksStore = () =>
  reactive({
    tracks: [] as unknown[],
    selectedClipIds: new Set<string>(),
    getClip: (_id: string) => undefined as unknown,
    addClip: (_trackId: string, _clip: unknown) => undefined,
    clearSelection: () => undefined,
  });

export const useHistoryStore = () =>
  reactive({
    undo: () => undefined,
    redo: () => undefined,
    pushSnapshot: (_label?: string) => undefined,
  });

export const VideoTrack = defineComponent({
  name: "VideoTrackStub",
  setup(_, { slots }) {
    return () => h("div", { class: "video-track-stub" }, slots.default?.());
  },
});

export type Clip = Record<string, unknown>;
export type MediaClip = Record<string, unknown>;
export type SubtitleClip = Record<string, unknown>;
export type TextClip = Record<string, unknown>;
export type TransitionClip = Record<string, unknown>;
export type Track = Record<string, unknown>;
export type FilterClip = Record<string, unknown>;
export type EffectClip = Record<string, unknown>;
export type OperationButton = Record<string, unknown>;
export type ScaleConfigButton = string;
export type TrackTypeConfig = Record<string, unknown>;
