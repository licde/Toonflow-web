<template>
  <div class="index fc">
    <div class="referenceImage">
      <div class="uploadBtn">
        <div v-if="presetLoading" class="presetBanner">单集预设中，请稍候…</div>
        <div v-else-if="currentTrack?.promptStale || hasOrphanRefs" class="staleBanner">
          参考条带或模式已变更，提示词可能失效。
          <t-button size="small" variant="text" @click="genText">重新生成提示词</t-button>
        </div>
        <imageSelect :mode="modelParmas.mode as VideoMode" v-model="imageList" :storyboard-list="storyboardList" />
        <t-button size="small" variant="text" @click="resetReferenceStrip">重置参考条带</t-button>
      </div>
    </div>
    <div class="modelSelect">
      <modeMenu v-model="modelParmas" :modeOptions="modeOptions" :trackId="currentTrack?.id" :modeList="modeList" @modeChange="modeChange" />
    </div>
    <div class="generate ac">
      <div class="prompt" v-if="currentTrack">
        <t-card :title="'#' + (activeTrackIndex + 1) + $t('workbench.generate.generateText')" header-bordered class="videoPrompt">
          <template #actions>
            <t-button size="small" class="genTextbtn" :loading="currentTrack.state == '生成中'" @click="genText">
              {{ $t("workbench.generate.generateText") }}
            </t-button>
          </template>
          <div class="promptData fc">
            <div v-if="currentTrack.promptHint && !currentTrack.prompt?.includes('@图')" class="promptHint">
              {{ currentTrack.promptHint }}
            </div>
            <div class="promptInput" @focusout="handlePromptBlur">
              <promptEditor v-model="currentTrack.prompt" :references="references" :placeholder="$t('workbench.generate.promptPlaceholder')" />
            </div>
          </div>
        </t-card>
      </div>
      <div class="video">
        <videoCard
          v-if="currentTrack"
          :active-track-index="activeTrackIndex"
          v-model:current-track="currentTrack"
          :generate-disabled="Boolean(currentTrack.promptStale || hasOrphanRefs)"
          @refresh="getGenerateData"
          @generate="generateVideo" />
      </div>
    </div>
    <div class="track">
      <newTrack
        v-model:activeTrackIndex="activeTrackIndex"
        v-model="trackList"
        :image-list="imageList"
        @change="trackChange"
        :modelParmas="modelParmas"
        :clampDuration="clampDuration"
        @getData="getGenerateData" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import newTrack from "./components/track.vue";
import imageSelect from "./components/imageSelect.vue";
import modeMenu from "./components/modeMenu.vue";
import videoCard from "./components/video.vue";
import "@/views/production/components/workbench/type/type";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import promptEditor from "@/components/promptEditor.vue";
import { productionApi } from "@/api";
import {
  sortMediasForRef,
  buildRefSlots,
  refSlotsToReferences,
  resolveMediaSrc,
  inferMediaSource,
  findAllOrphanRefs,
  type RefMediaInput,
} from "@/utils/refSlotUtils";

const { project } = storeToRefs(projectStore());
const episodesId = inject<Ref<number>>("episodesId")!;
const activeTrackIndex = ref(0);
const presetLoading = ref(false);
let presetPollTimer: ReturnType<typeof setInterval> | null = null;
let presetStartedAt = 0;
let presetTriggering = false;

const modeOptions = ref<VideoModel>({
  name: "",
  modelName: "",
  durationResolutionMap: [],
  audio: false,
  type: "video",
  mode: [],
}); // 当前模型配置

const trackList = ref<TrackItem[]>([]); // 轨道列表

const modelParmas = ref<ModelSetting>({
  mode: "",
  model: "",
  resolution: "480p",
  duration: 8,
  audio: false,
});

const storyboardList = ref<StoryboardItem[]>([]); // 分镜列表
const videoWorkbenchMeta = ref<{ presetStatus?: string; defaultRoute?: string; routes?: string[] }>({});

const imageList = computed({
  get(): UploadItem[] {
    const medias = currentTrack.value?.medias;
    if (!medias?.length) return [];
    return sortMediasForRef(medias as RefMediaInput[]) as UploadItem[];
  },
  set(val: UploadItem[]) {
    if (currentTrack.value) {
      currentTrack.value.medias = val as TrackMedia[];
    }
  },
});

const hasOrphanRefs = computed(() => {
  const track = currentTrack.value;
  if (!track?.prompt) return false;
  const slots = track.refSlots?.length ? track.refSlots : buildRefSlots(imageList.value as RefMediaInput[]);
  return findAllOrphanRefs(track.prompt, slots.length, slots as Parameters<typeof findAllOrphanRefs>[2]).length > 0;
});

function resolveRouteKeyForMode(mode: string): string {
  const modeLabelMap: Record<string, string> = {
    singleImage: "单图首帧",
    text: "多参",
    startEndRequired: "首尾帧",
  };
  if (mode === "singleImage") return modeLabelMap.singleImage;
  if (mode === "text") return modeLabelMap.text;
  if (mode === "startEndRequired") return modeLabelMap.startEndRequired;
  return mode;
}

async function modeChange(newVal: string) {
  if (newVal === modelParmas.value.mode) return;
  const trackId = currentTrack.value?.id;
  if (!trackId) {
    modelParmas.value.mode = newVal;
    return;
  }

  const routeKeyGuess = resolveRouteKeyForMode(newVal);
  const presets = currentTrack.value?.promptPresets ?? {};
  const routes = videoWorkbenchMeta.value.routes ?? Object.keys(presets);
  const matchedKey =
    routes.find((k) => k.includes(routeKeyGuess)) ??
    Object.keys(presets).find((k) => k.includes(routeKeyGuess) || k.includes(newVal));
  if (matchedKey && presets[matchedKey]?.ready) {
    try {
      const { data } = await productionApi.switchTrackRoute({ trackId, routeKey: matchedKey });
      if (data?.prompt) currentTrack.value.prompt = data.prompt;
      currentTrack.value.promptStale = false;
      modelParmas.value.mode = newVal;
      return;
    } catch {
      /* fall through */
    }
  }

  if ((imageList.value.length || currentTrack.value?.prompt) && modelParmas.value.mode) {
    const dialog = DialogPlugin.confirm({
      header: $t("workbench.generate.modeChange"),
      body: "该模态暂无缓存提示词，切换后需重新生成。是否继续？",
      confirmBtn: $t("settings.generate.modelChnageSure"),
      cancelBtn: $t("settings.memory.msg.cancel"),
      onConfirm: () => {
        modelParmas.value.mode = newVal;
        dialog.destroy();
      },
    });
  } else {
    modelParmas.value.mode = newVal;
  }
}
const modeList = computed(() => {
  const modeLabelMap: Record<string, string> = {
    singleImage: "单图",
    startEndRequired: "首尾帧",
    endFrameOptional: "尾帧可选",
    startFrameOptional: "首帧可选",
    text: "文本生视频",
    videoReference: "视频",
    imageReference: "图片",
    audioReference: "音频",
    textReference: "文本",
  };
  function parseRefLabel(m: string): string {
    const match = m.match(/^(videoReference|imageReference|audioReference|textReference):(\d+)$/);
    if (match) {
      const base = modeLabelMap[match[1]] || match[1];
      return `${base} ×${match[2]}`;
    }
    return modeLabelMap[m] || m;
  }
  return modeOptions.value.mode
    ? modeOptions.value.mode.map((mode) =>
        Array.isArray(mode)
          ? { value: JSON.stringify(mode), label: mode.map((m) => parseRefLabel(m)).join(" + ") + "参考" }
          : { value: mode, label: modeLabelMap[mode] || mode },
      )
    : [];
});
const currentTrack = computed({
  get() {
    return trackList.value[activeTrackIndex.value];
  },
  set(val) {
    trackList.value[activeTrackIndex.value] = val;
  },
});

/** 将时长限制在模型支持的范围内 */
function clampDuration(trackDuration: number): number {
  const drMap = modeOptions.value?.durationResolutionMap;
  if (Array.isArray(drMap) && drMap.length > 0 && drMap[0].duration?.length) {
    const durations = drMap[0].duration;
    return Math.max(Math.min(...durations), Math.min(trackDuration, Math.max(...durations)));
  }
  return trackDuration;
}
watch(
  () => modelParmas.value.model,
  (val) => {
    if (!val) {
      modeOptions.value = {
        name: "",
        modelName: "",
        durationResolutionMap: [],
        audio: false,
        type: "video",
        mode: [],
      };
      modelParmas.value.mode = "";
      return;
    }
    axios.post("/modelSelect/getModelDetail", { modelId: val }).then(({ data }) => {
      modeOptions.value = data;
      modelParmas.value.audio = data.audio === true || data.audio === "true" || data.audio == "optional";
      const drMap = data.durationResolutionMap;
      if (Array.isArray(drMap) && drMap.length > 0) {
        if (drMap[0].resolution?.length) modelParmas.value.resolution = drMap[0].resolution[0];
        if (drMap[0].duration?.length) modelParmas.value.duration = clampDuration(modelParmas.value.duration);
      }

      const currentParsed = parseMode(modelParmas.value.mode);
      const modeMatched =
        currentParsed !== null &&
        data.mode.some((m: VideoMode) => {
          if (Array.isArray(m) && Array.isArray(currentParsed)) {
            return JSON.stringify(m) === JSON.stringify(currentParsed);
          }
          return m == currentParsed;
        });
      if (!modeMatched) {
        const newMode = Array.isArray(data.mode[0]) ? JSON.stringify(data.mode[0]) : data.mode[0];
        modeChange(newMode);
      }
    });
  },
);
function parseMode(value: string): VideoMode | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as ReferenceType[];
  } catch {
    return value as Exclude<VideoMode, ReferenceType[]>;
  }
  return value as Exclude<VideoMode, ReferenceType[]>;
}
/** uploadBox 作为 promptEditor 的引用预览（与 upload 条带同源 refSlots） */
const references = computed(() => {
  function getFileTypeByExt(src: string | undefined): "image" | "video" | "audio" {
    if (!src) return "image";
    const cleanSrc = src.split("?")[0].split("#")[0];
    const ext = cleanSrc.split(".").pop()?.toLowerCase() ?? "";
    if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
    return "image";
  }

  const slots = currentTrack.value?.refSlots?.length
    ? refSlotsToReferences(currentTrack.value.refSlots as Parameters<typeof refSlotsToReferences>[0])
    : refSlotsToReferences(buildRefSlots(imageList.value as RefMediaInput[]));
  const nonImageRefs = (imageList.value as RefMediaInput[])
    .filter((item) => {
      const src = resolveMediaSrc(item);
      if (!src) return false;
      return getFileTypeByExt(src) !== "image";
    })
    .map((item) => ({
      type: getFileTypeByExt(resolveMediaSrc(item)) as "image" | "video" | "audio" | "text",
      src: resolveMediaSrc(item),
      label: item.name || `分镜${item.index ?? item.id ?? "?"}`,
    }));
  return [...slots, ...nonImageRefs];
});

async function getGenerateData() {
  const { data } = await axios.post("/production/workbench/getGenerateData", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });

  storyboardList.value = (data.storyboardList ?? []) as StoryboardItem[];
  trackList.value = data.trackList ?? [];
  videoWorkbenchMeta.value = data.videoWorkbench ?? {};
  modelParmas.value.duration = clampDuration(data.trackList?.[activeTrackIndex.value]?.duration);

  const wb = data.videoWorkbench;
  if (wb?.presetStatus === "running") {
    presetLoading.value = true;
    startPresetPoll();
  } else {
    presetLoading.value = false;
    stopPresetPoll();
    const tracksReady = (data.trackList ?? []).length > 0 && (data.trackList ?? []).every((t: TrackItem) => Boolean(t.prompt?.trim()));
    if (wb?.presetStatus === "pending" && !tracksReady && project.value?.id && episodesId.value && !presetTriggering) {
      presetTriggering = true;
      presetLoading.value = true;
      presetStartedAt = Date.now();
      productionApi
        .presetEpisodeVideo({ projectId: Number(project.value.id), scriptId: episodesId.value, respectImport: true })
        .finally(() => {
          presetTriggering = false;
          startPresetPoll();
        });
    }
  }
}

function startPresetPoll() {
  if (presetPollTimer) return;
  if (!presetStartedAt) presetStartedAt = Date.now();
  presetPollTimer = setInterval(async () => {
    if (Date.now() - presetStartedAt > 15 * 60 * 1000) {
      presetLoading.value = false;
      stopPresetPoll();
      window.$message.warning("单集预设耗时较长，可先手动生成提示词");
      return;
    }
    const { data } = await axios.post("/production/workbench/getGenerateData", {
      projectId: project.value?.id,
      scriptId: episodesId.value ?? 0,
    });
    videoWorkbenchMeta.value = data.videoWorkbench ?? {};
    if (data.videoWorkbench?.presetStatus !== "running") {
      presetLoading.value = false;
      stopPresetPoll();
      trackList.value = data.trackList ?? [];
      storyboardList.value = (data.storyboardList ?? []) as StoryboardItem[];
    }
  }, 3000);
}

function stopPresetPoll() {
  if (presetPollTimer) {
    clearInterval(presetPollTimer);
    presetPollTimer = null;
  }
  presetStartedAt = 0;
}
async function resetReferenceStrip() {
  const pid = project.value?.id;
  const sid = episodesId.value;
  const trackId = currentTrack.value?.id;
  if (pid == null || sid == null || trackId == null) return;
  const { data } = await axios.post("/production/workbench/getGenerateData", {
    projectId: pid,
    scriptId: sid,
  });
  const serverTrack = data.trackList.find((t: TrackItem) => t.id === trackId);
  if (!serverTrack?.medias?.length) return;
  currentTrack.value.medias = serverTrack.medias as TrackMedia[];
  window.$message.success("已重置参考条带");
}
/** 提示词失焦时保存到后端 */
function handlePromptBlur() {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  if (trackId == null) return;
  axios.post("/production/workbench/updateVideoPrompt", { id: trackId, prompt: currentTrack.value?.prompt });
}

/** 单个轨道生成提示词 */
async function genText() {
  const track = currentTrack.value;
  if (track.id == null || track.state === "生成中") return;
  track.state = "生成中";
  try {
    const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
      projectId: project.value?.id,
      trackId: track.id,
      model: modelParmas.value.model,
      mode: modelParmas.value.mode,
    });
    track.prompt = data;
    track.state = "已完成";
    track.promptStale = false;
  } catch (e) {
    track.state = "生成失败";
    window.$message.error((e as Error)?.message ?? "提示词生成失败");
  }
}
function trackChange(_prevIndex?: number) {
  if (modelParmas.value.mode == "singleImage" && imageList.value.length > 1) {
    imageList.value = imageList.value.slice(0, 1);
  }
  modelParmas.value.duration = clampDuration(trackList.value?.[activeTrackIndex.value]?.duration);
}
/** 监听当前轨道的 medias 变化，实时同步到后端（单一真源） */
let mediasPersistTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => currentTrack.value?.medias,
  (medias) => {
    if (!medias) return;
    const trackId = currentTrack.value?.id;
    if (trackId == null) return;
    if (mediasPersistTimer) clearTimeout(mediasPersistTimer);
    mediasPersistTimer = setTimeout(() => {
      axios
        .post("/production/workbench/updateTrackMedias", {
          trackId,
          medias: (medias as RefMediaInput[]).map((item) => ({
            id: item.id!,
            sources: item.sources ?? inferMediaSource(item),
            src: item.src ?? "",
            fileType: (item.fileType === "video" || item.fileType === "audio" ? item.fileType : "image") as
              | "image"
              | "video"
              | "audio",
          })),
        })
        .catch(() => {});
    }, 800);
  },
  { deep: true },
);

onMounted(() => {
  modelParmas.value.model = project.value?.videoModel || "";
  modelParmas.value.mode = project.value?.mode || "";
  getGenerateData();
  if (hasGenerateVideoIds.value && hasGenerateVideoIds.value.length) {
    startPoll();
  }
});
/** 单个轨道生成视频 */
async function generateVideo() {
  if (currentTrack.value?.promptStale || hasOrphanRefs.value) {
    return window.$message.warning("提示词与参考条带不一致，请先重新生成提示词");
  }
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.generateConfirm"),
    body: $t("workbench.generate.generateConfirmBody"),
    onConfirm: async () => {
      dlg.destroy();
      try {
        const { data } = await axios.post("/production/workbench/generateVideo", {
          projectId: project.value?.id,
          scriptId: episodesId.value ?? 0,
          uploadData: [],
          prompt: currentTrack.value.prompt,
          model: modelParmas.value.model,
          mode: modelParmas.value.mode,
          resolution: modelParmas.value.resolution,
          duration: modelParmas.value.duration,
          audio: modelParmas.value.audio,
          trackId: currentTrack.value.id,
        });
        window.$message.success($t("workbench.generate.generateStarted"));
        currentTrack.value.videoList.push({
          id: data,
          state: "生成中",
          src: "",
        });
      } catch (e) {
        window.$message.error((e as any)?.message ?? "视频发起生成请求失败");
      } finally {
      }
    },
    onCancel: () => dlg.destroy(),
  });
}
let pollTimer: NodeJS.Timeout | null = null;
let promptPollTimer: NodeJS.Timeout | null = null;
function startPoll() {
  if (pollTimer !== null) return;
  pollTimer = setInterval(() => getVideoList(), 3000);
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
const hasGenerateVideoIds = computed(() => {
  return trackList.value
    .map((track) => {
      return track.videoList.filter((i) => i.state == "生成中").map((i) => i.id);
    })
    .flatMap((i) => i);
});
const hasGeneratePromptIds = computed(() => {
  const trackIds = trackList.value.filter((t) => t.state == "生成中").map((t) => t.id);
  return trackIds;
});
/** 查询所有视频列表，并检测生成完成/失败状态 */
async function getVideoList() {
  const { data } = await axios.post("/production/workbench/checkVideoStateList", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
    videoIds: hasGenerateVideoIds.value,
  });
  if (data && data.length) {
    data.forEach((item: { id: number; state: "生成中" | "未生成" | "已完成" | "生成失败"; src?: string; errorReason?: string }) => {
      for (const track of trackList.value) {
        const findData = track.videoList.find((i) => i.id == item.id);
        if (findData) {
          findData.state = item.state;
          findData.src = item?.src ?? "";
          findData.errorReason = item?.errorReason ?? "";
          break;
        }
      }
    });
  }
}
function startPromptPoll() {
  if (promptPollTimer !== null) return;
  promptPollTimer = setInterval(() => getTrackPromptList(), 3000);
}

function stopPromptPoll() {
  if (promptPollTimer) {
    clearInterval(promptPollTimer);
    promptPollTimer = null;
  }
}
/** 查询所有视频列表，并检测生成完成/失败状态 */
async function getTrackPromptList() {
  const { data } = await axios.post("/production/workbench/checkVideoPrompt", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
    trackIds: hasGeneratePromptIds.value,
  });
  if (data && data.length) {
    data.forEach((item: { id: number; state: "生成中" | "未生成" | "已完成" | "生成失败"; prompt?: string; reason?: string }) => {
      const findData = trackList.value.find((t) => t.id == item.id);
      if (findData) {
        findData.state = item.state;
        findData.prompt = item?.prompt ?? "";
        findData.reason = item?.reason ?? "";
        if (item.state === "生成失败") {
          window.$message.error(`提示词生成失败，${item.reason ?? "未知原因"}`);
        }
      }
    });
  }
}
watch(
  () => hasGenerateVideoIds.value,
  (newVal) => {
    if (newVal && newVal.length > 0) {
      startPoll();
    } else {
      stopPoll();
    }
  },
);
watch(
  () => hasGeneratePromptIds.value,
  (newVal) => {
    if (newVal && newVal.length > 0) {
      startPromptPoll();
    } else {
      stopPromptPoll();
    }
  },
);
onUnmounted(() => {
  stopPoll();
  stopPromptPoll();
  stopPresetPoll();
});
</script>

<style lang="scss" scoped>
.index {
  height: calc(100vh - 120px);
  gap: 16px;
  overflow-y: auto;
  .referenceImage {
    .presetBanner,
    .staleBanner {
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .presetBanner {
      background: var(--td-brand-color-light);
      color: var(--td-brand-color);
    }
    .staleBanner {
      background: #fff7e6;
      color: #d46b08;
      border: 1px solid #ffd591;
    }
  }
  .modelSelect {
  }
  .generate {
    flex: 1;
    min-height: 0;
    width: 100%;
    gap: 5px;
    .prompt {
      width: 50%;
      height: 100%;
      min-height: 0;
      .videoPrompt {
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        :deep(.t-card__body) {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .promptData {
          width: 100%;
          flex: 1;
          min-height: 0;
          .promptHint {
            font-size: 12px;
            color: var(--td-text-color-placeholder);
            margin-bottom: 6px;
            line-height: 1.4;
          }
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          .promptInput {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
          }
        }
      }
    }
    .video {
      width: 50%;
      height: 100%;
      min-height: 0;
    }
  }
  .track {
  }
}
</style>
