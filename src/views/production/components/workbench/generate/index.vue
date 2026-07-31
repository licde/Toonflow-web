<template>
  <div class="index fc">
    <div class="referenceImage">
      <div class="uploadBtn">
        <imageSelect :mode="modelParmas.mode as VideoMode" v-model="imageList" :storyboard-list="storyboardList" />
      </div>
    </div>
    <div class="modelSelect">
      <t-alert v-if="agnesWarning" theme="warning" :message="agnesWarning" close />
      <modeMenu v-model="modelParmas" :modeOptions="modeOptions" :trackId="currentTrack?.id" :modeList="modeList" @modeChange="modeChange" />
    </div>
    <div class="generate ac">
      <div class="prompt" v-if="currentTrack">
        <t-card :title="'#' + (activeTrackIndex + 1) + $t('workbench.generate.generateText')" header-bordered class="videoPrompt">
          <template #actions>
            <t-button size="small" class="genTextbtn" :loading="currentTrack.state == '生成中'" @click="genText">
              {{ $t("workbench.generate.generateText") }}
            </t-button>
            <t-tag v-if="currentTrack.state === '需完善'" size="small" theme="warning" variant="light" class="ml-5">需完善·不可烧</t-tag>
          </template>
          <IdentitySlotChips :slots="identitySlots" />
          <ShotSpecDrawer
            ref="shotSpecDrawerRef"
            :project-id="project?.id"
            :script-id="episodesId"
            :storyboard-id="primaryStoryboardId"
            :prompt="currentTrack?.prompt"
            :mode="modelParmas.mode"
            :duration="modelParmas.duration"
            :audio="modelParmas.audio"
            :resolution="modelParmas.resolution"
            @identity="(slots) => (identitySlots = slots)"
            @recompile-prompt="genText"
          />
          <VideoIntentDebtBar
            v-if="burnVideoDebt"
            :ok="burnVideoDebt.ok"
            :primary-action="burnVideoDebt.primaryAction"
            :primary-next-step="burnVideoDebt.primaryNextStep"
            :missing-slots="burnVideoDebt.missingSlots"
            :cta-label="burnVideoDebt.ctaLabel"
            :findings="burnVideoDebt.findings"
            :explain="burnVideoDebt.userMessage"
            :diagnosing="burnVideoIrdLoading"
            :applying="burnVideoIrdApplying"
            :recompiling="currentTrack?.state == '生成中'"
            @diagnose="diagnoseBurnVideoIrd"
            @confirm-apply="applyBurnVideoIrd"
            @hand-edit-vd="diagnoseBurnVideoIrd"
            @recompile-prompt="genText"
            @human-rejudge-video="applyVideoHumanRejudge"
            @regen-prop-still="regenPropStillFromBurn"
          />
          <div v-if="lastRePushPlan.length" class="repushBar">
            <div v-for="(p, i) in lastRePushPlan" :key="i" class="repushItem">
              <span>{{ p.trigger }} → {{ p.reverseTarget }}</span>
              <t-button size="small" variant="outline" @click="onRePushJump(p)">回推设计</t-button>
            </div>
          </div>
          <div class="promptData fc">
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
import imageListCacheStore from "@/stores/imageListCache";
import productionAgentStore from "@/stores/productionAgent";
import { preflightProduction, preflightTouch } from "@/utils/ruleEngine";
import IdentitySlotChips from "./components/IdentitySlotChips.vue";
import ShotSpecDrawer from "./components/ShotSpecDrawer.vue";
import VideoIntentDebtBar from "@/components/video/VideoIntentDebtBar.vue";
import type { VideoIrdDiagnoseResponse } from "@/types/videoIntentOps";
import { isVideoIrdDebtMeta, videoIrdCtaLabel } from "@/types/videoIntentOps";
import { useAdaptationNav } from "@/composables/useAdaptationNav";
import { toastAfterApplyExitGate, designExitStillOpen } from "@/utils/v5OpsHelpers";

const { goDesignStage } = useAdaptationNav();
const { project } = storeToRefs(projectStore());
const { flowData } = storeToRefs(productionAgentStore());
const episodesId = inject<Ref<number>>("episodesId")!;
const activeTrackIndex = ref(0);
const shotSpecDrawerRef = ref<{
  openVideoIntentOps?: () => Promise<void>;
  clearVideoIrd?: () => void;
} | null>(null);
const burnVideoDebt = ref<VideoIrdDiagnoseResponse | null>(null);
const burnVideoIrdLoading = ref(false);
const burnVideoIrdApplying = ref(false);
const cacheStore = imageListCacheStore();
const { getCache, setCache, removeCache, initCacheFromTrackList, warmUpUrls, resolveUrls, resolveUrlSync } = cacheStore;
const { urlMap } = storeToRefs(cacheStore);

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
/** trackId → mode → prompt 本地矩阵；切模式零接口；键 = trackId::slotFingerprint */
const promptByMode = ref<Record<string, Record<string, string>>>({});
const identitySlots = ref<{ kind: string; code: string }[]>([]);
const lastRePushPlan = ref<{ trigger: string; reverseTarget: string; forwardRerun?: string[] }[]>([]);

function captureBurnVideoDebt(details: Record<string, unknown> | null | undefined) {
  if (!details) return;
  const code = String(details.code ?? details.blockCode ?? "");
  const trigger = String(details.reverseTrigger ?? "");
  const step = String(details.primaryNextStep ?? details.nextStep ?? "");
  const msg = String(details.userMessage ?? details.message ?? "");
  const cta = String(details.ctaLabel ?? "");
  const stale = /VIDEO-PROMPT-STALE|video_prompt_stale/i.test(`${code} ${trigger} ${msg} ${cta}`);
  const looksVid =
    stale ||
    /DEX-VID|DUR-PAD|VP-THIN|vid_|PROMPT-FIDELITY/i.test(code) ||
    /vid_|video_prompt|cam_mediate|prompt_fidelity/i.test(trigger) ||
    (step === "chat_repair" && /视频|运镜|伪台词|口型|beatDuration|DEX-VID|重编译|过期/i.test(`${msg}${cta}`)) ||
    step === "human_review";
  if (!looksVid) return;
  burnVideoDebt.value = {
    ok: false,
    findings: Array.isArray(details.findings)
      ? (details.findings as VideoIrdDiagnoseResponse["findings"])
      : [
          {
            id: code || (stale ? "VIDEO-PROMPT-STALE" : "DEX-VID"),
            severity: "BLOCK",
            message: msg || cta || (stale ? "设计/对白已变，须重编译视频提示词" : "视频设计债"),
          },
        ],
    primaryAction:
      (details.primaryAction as VideoIrdDiagnoseResponse["primaryAction"]) ||
      (stale ? "none" : /cam|mediate/i.test(trigger + code) ? "confirm_cam_mediate" : "confirm_enhance"),
    confirmRequired: !stale,
    missingSlots: Array.isArray(details.missingSlots) ? (details.missingSlots as string[]) : [],
    ctaLabel:
      cta ||
      videoIrdCtaLabel({
        primaryNextStep: step,
        primaryAction: stale ? "none" : "confirm_enhance",
        reverseTrigger: trigger,
        code,
      }),
    primaryNextStep: (step as VideoIrdDiagnoseResponse["primaryNextStep"]) || "chat_repair",
    userMessage: msg || undefined,
  };
}

async function diagnoseBurnVideoIrd() {
  const pid = project.value?.id;
  if (pid == null) {
    window.$message?.warning?.("缺少项目 ID");
    return;
  }
  burnVideoIrdLoading.value = true;
  try {
    const { data } = await axios.post("/scriptAgent/videoIntentOps", {
      projectId: pid,
      action: "diagnose",
    });
    const body = (data?.data ?? data) as VideoIrdDiagnoseResponse;
    burnVideoDebt.value = isVideoIrdDebtMeta(body) || body.ok === false ? body : null;
    if (body?.ok) window.$message?.success?.(body.userMessage || "视频设计契约已过");
    else window.$message?.info?.(body?.ctaLabel || "视频设计债须 Confirm");
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.message || e?.message || "videoIntentOps 失败");
  } finally {
    burnVideoIrdLoading.value = false;
  }
}

async function applyBurnVideoIrd() {
  const pid = project.value?.id;
  if (pid == null) {
    window.$message?.warning?.("缺少项目 ID");
    return;
  }
  burnVideoIrdApplying.value = true;
  try {
    const data = await axios.post("/scriptAgent/videoIntentOps", {
      projectId: pid,
      action: "apply",
      forceApply: true,
    });
    const body = (data?.data ?? data) as Record<string, unknown>;
    const again = (body.after ?? body) as VideoIrdDiagnoseResponse | null;
    burnVideoDebt.value = isVideoIrdDebtMeta(again ?? {}) || again?.ok === false ? again : null;
    toastAfterApplyExitGate(body, again?.userMessage || "视频设计债已清");
    if (designExitStillOpen(body)) {
      await diagnoseBurnVideoIrd();
    } else if (again?.ok) {
      burnVideoDebt.value = null;
    }
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.message || e?.message || "videoIntentOps apply 失败");
  } finally {
    burnVideoIrdApplying.value = false;
  }
}

async function applyVideoHumanRejudge() {
  const sid = primaryStoryboardId.value;
  const track = currentTrack.value;
  if (!sid || !track?.id) {
    window.$message?.warning?.("须绑定分镜轨道后再人审");
    return;
  }
  const latestVideo = track.videoList?.[track.videoList.length - 1];
  try {
    const data = await axios.post("/production/storyboard/humanRejudgeFidelity", {
      storyboardId: sid,
      modality: "video",
      trackId: track.id,
      videoId: latestVideo?.id,
      items: [{ id: "svq_unmeasured", pass: true, evidence: "operator_video_rejudge" }],
    });
    const body = data?.data ?? data;
    if (body?.videoPass === false) {
      window.$message?.warning?.(body?.userMessage || "成片人审未全过");
      return;
    }
    window.$message?.success?.(body?.userMessage || "成片人审通过（未测·可交付）");
    burnVideoDebt.value = null;
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.message || e?.message || "成片人审失败");
  }
}

async function regenPropStillFromBurn() {
  const sid = primaryStoryboardId.value;
  if (!sid) {
    window.$message?.warning?.("须绑定分镜");
    return;
  }
  try {
    await productionAgentStore().batchGenerateStoryboard([sid], true);
    window.$message.info("已排队重出带道具静照");
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.data?.userMessage || e?.message || "重出静照失败");
  }
}

const primaryStoryboardId = computed(() => {
  const sb = imageList.value.find((i) => i.sources === "storyboard" && typeof i.id === "number");
  return sb?.id ?? null;
});

const agnesWarning = computed(() => {
  if (modelParmas.value.mode !== "singleImage") return "";
  const hasFrame = imageList.value.some((i) => i.src && i.sources === "storyboard");
  if (!hasFrame) return $t("workbench.production.rulePanel.preflightBlock") + " (Agnes: 需要首位帧)";
  return "";
});

async function runPreflight(): Promise<boolean> {
  const pid = project.value?.id;
  const sid = episodesId.value;
  if (pid == null || sid == null) return true;
  try {
    const selectedSbId =
      primaryStoryboardId.value ??
      (currentTrack.value?.medias?.find((m) => m.sources === "storyboard" && typeof m.id === "number")?.id as
        | number
        | undefined) ??
      null;
    const isSingle = modelParmas.value.mode === "singleImage";
    // singleImage: only gate the active track storyboard (never full episode scan)
    const storyboardIds = isSingle ? (selectedSbId != null ? [selectedSbId] : []) : undefined;
    const [touch, prod] = await Promise.all([
      preflightTouch({
        projectId: pid,
        scriptId: sid,
        script: flowData.value.script,
        scriptPlan: flowData.value.scriptPlan,
        storyboardTable: flowData.value.storyboardTable,
        storyboard: flowData.value.storyboard,
        mode: modelParmas.value.mode,
        storyboardIds,
      }),
      preflightProduction({
        projectId: pid,
        scriptId: sid,
        tier: "T3",
        modality: "VID",
        storyboardIds: isSingle ? storyboardIds : undefined,
      }),
    ]);
    if (prod?.rePushPlan?.length) {
      lastRePushPlan.value = prod.rePushPlan;
    }
    if (!touch.allowed || prod?.blocked || prod?.blockGenerate) {
      const detectionRows = [
        ...(prod?.detectionResults ?? []),
        ...(prod?.failedChecks ?? []),
        ...(prod?.closureReport as { detectionResults?: { severity?: string; passed?: boolean; message?: string; id?: string }[] } | undefined)
          ?.detectionResults ?? [],
      ];
      const firstBlock =
        detectionRows.find((c) => c && c.passed === false && (c.severity === "BLOCK" || !c.severity))?.message ||
        touch.report?.issues?.find((i: { severity?: string }) => i.severity === "BLOCK")?.message ||
        "";
      const blockId =
        detectionRows.find((c) => c && c.passed === false && (c.severity === "BLOCK" || !c.severity))?.id || "";
      const gs = prod?.gapSummary;
      const gapHint = gs?.blocks ? ` BLOCK×${gs.blocks}` : "";
      const planMsg = prod?.rePushPlan?.[0]
        ? ` → ${prod.rePushPlan[0].trigger}→${prod.rePushPlan[0].reverseTarget}`
        : "";
      const detail = firstBlock
        ? `: ${blockId ? `${blockId} ` : ""}${firstBlock}`
        : gapHint
          ? `:${gapHint}`
          : "";
      const prefix = $t("workbench.production.rulePanel.preflightBlock");
      const label =
        !prefix || prefix === "workbench.production.rulePanel.preflightBlock"
          ? "触达前预检未通过，请先修复 BLOCK 项"
          : prefix;
      window.$message.error(label + detail + planMsg);
      return false;
    }
    return true;
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
      (e as Error)?.message ||
      "preflight error";
    window.$message.error($t("workbench.production.rulePanel.preflightBlock") + `: ${msg}`);
    return false;
  }
}

/** 排序优先级：assets有图=0，storyboard有图=1，无图=2 */
function getImageItemPriority(item: UploadItem): number {
  if (item.src) return item.sources === "assets" ? 0 : 1;
  return 2;
}

const imageList = computed({
  get(): UploadItem[] {
    // 触发对 urlMap 的依赖追踪，当 warmUpUrls 更新 urlMap 后自动重新计算
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    urlMap.value;
    const trackId = currentTrack.value?.id;
    const pid = project.value?.id;
    const sid = episodesId.value;
    // 优先从缓存读取
    if (pid != null && sid != null && trackId != null) {
      const cached = getCache(pid, sid, trackId);

      if (cached?.length) {
        return [...cached].sort((a, b) => getImageItemPriority(a) - getImageItemPriority(b));
      }
    }
    const medias = currentTrack.value?.medias;
    if (!medias?.length) return [];
    return [...(medias as UploadItem[])].sort((a, b) => getImageItemPriority(a) - getImageItemPriority(b));
  },
  set(val: UploadItem[]) {
    if (currentTrack.value) {
      currentTrack.value.medias = val as any;
      // 同步写入缓存
      const pid = project.value?.id;
      const sid = episodesId.value;
      const trackId = currentTrack.value.id;
      if (pid != null && sid != null && trackId != null) {
        setCache(pid, sid, trackId, val);
      }
    }
  },
});

/** 分镜槽位指纹：参考图变更时切缓存 */
function slotFingerprint(medias?: UploadItem[]): string {
  const list = medias ?? imageList.value;
  if (!list?.length) return "empty";
  return list
    .map((i) => `${i.sources ?? ""}:${i.id ?? ""}:${(i as { role?: string }).role ?? ""}`)
    .join("|");
}

function promptMatrixKey(trackId: number | string, medias?: UploadItem[]): string {
  return `${trackId}::${slotFingerprint(medias)}`;
}

async function modeChange(newVal: string) {
  if (newVal == modelParmas.value.mode) return;
  // Local matrix switch — zero API / no confirm dialog
  const track = currentTrack.value;
  if (track?.id != null) {
    const key = promptMatrixKey(track.id, track.medias as UploadItem[] | undefined);
    if (!promptByMode.value[key]) promptByMode.value[key] = {};
    // Persist current mode prompt into matrix before switch
    if (modelParmas.value.mode && track.prompt) {
      promptByMode.value[key][modelParmas.value.mode] = track.prompt;
    }
    const cached = promptByMode.value[key][newVal];
    if (cached) track.prompt = cached;
  }
  modelParmas.value.mode = newVal;
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
      const dialogueShot = imageList.value.some((i) => i.sources === "storyboard" && (i as { audioPrompt?: string }).audioPrompt);
      const sbHasAudio = storyboardList.value.some((s: any) => {
        const mid = imageList.value.find((i) => i.sources === "storyboard" && i.id === s.id);
        return mid && (s.audioPrompt || (s as any).hasDialogue);
      });
      const forceAudio = Boolean(dialogueShot || sbHasAudio || flowData.value.storyboard?.some((s) => s.audioPrompt));
      modelParmas.value.audio = forceAudio || data.audio === true || data.audio === "true" || data.audio == "optional";
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
/** uploadBox 作为 promptEditor 的引用预览 */
const references = computed(() => {
  function getFileTypeByExt(src: string | undefined): "image" | "video" | "audio" {
    if (!src) return "image";
    // 去掉 query 和 hash 部分
    const cleanSrc = src.split("?")[0].split("#")[0];
    const ext = cleanSrc.split(".").pop()?.toLowerCase() ?? "";

    if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
    return "image";
  }

  return imageList.value
    .filter((item) => item.src)
    .map((item) => ({
      type: getFileTypeByExt(item.src) as "image" | "video" | "audio" | "text",
      src: item.src ?? "",
    }));
});

async function getGenerateData() {
  const { data } = await axios.post("/production/workbench/getGenerateData", {
    projectId: project.value?.id,
    scriptId: episodesId.value ?? 0,
  });

  storyboardList.value = data.storyboardList;
  // 优先使用本地缓存，没有缓存则用后端数据并写入缓存
  const pid = project.value?.id;
  const sid = episodesId.value;
  if (pid != null && sid != null) {
    // 先将没有缓存的轨道写入缓存（保留已有本地编辑）
    initCacheFromTrackList(pid, sid, data.trackList);
    // 批量向后端请求文件路径对应的完整 URL（含分镜选择器）
    await warmUpUrls(pid, sid);
    const sbItems = (data.storyboardList ?? []).map((s: StoryboardItem) => ({
      id: s.id,
      sources: "storyboard" as const,
    }));
    await resolveUrls(sbItems);
    storyboardList.value = (data.storyboardList ?? []).map((s: StoryboardItem) => ({
      ...s,
      src: resolveUrlSync(s.id, "storyboard", s.src),
    }));
    // 将本地缓存回写到 trackList，确保优先使用缓存数据（src 已解析为完整 URL）
    data.trackList.forEach((track: TrackItem) => {
      if (track.id == null) return;
      const cached = getCache(pid, sid, track.id);
      if (cached?.length) {
        track.medias = cached as unknown as TrackMedia[];
      }
    });
    // 整体赋值触发响应式
    trackList.value = [...data.trackList];
  }

  modelParmas.value.duration = clampDuration(data.trackList?.[activeTrackIndex.value]?.duration);
}
/** 提示词失焦时保存到后端 — honor re-decide state (≠ keep prior 已完成) */
async function handlePromptBlur() {
  const trackId = trackList.value[activeTrackIndex.value]?.id;
  if (trackId == null) return;
  try {
    const res = await axios.post("/production/workbench/updateVideoPrompt", {
      id: trackId,
      prompt: currentTrack.value?.prompt,
    });
    const body = (res as { data?: Record<string, unknown> })?.data ?? (res as Record<string, unknown>);
    const track = currentTrack.value;
    if (track && body && typeof body === "object") {
      if (typeof body.state === "string" && body.state) {
        track.state = body.state as TrackItem["state"];
      }
      if (typeof body.burnAllowed === "boolean") {
        track.burnAllowed = body.burnAllowed;
      }
      if (body.state === "需完善" || body.burnAllowed === false) {
        window.$message?.warning?.(
          String(body.userMessage || "手改提示词未达烧片标准（需完善），请完善后重编译"),
        );
      }
    }
  } catch (e: any) {
    window.$message?.error?.(e?.message || "保存提示词失败");
  }
}

/** 单个轨道生成提示词 — 一次填满 promptByMode 矩阵 */
async function genText() {
  const track = currentTrack.value;
  if (track.id == null || track.state === "生成中") return;
  let info: { id: number; sources: string; role?: string }[] = [];
  const currentTrackId = track.id;
  const rawMedias = (track.medias ?? []) as UploadItem[];
  const frameMode = ["startEndRequired", "endFrameOptional", "startFrameOptional"];
  if (modelParmas.value.mode == "text") {
    info = rawMedias.map(({ id, sources }) => ({ id: id!, sources }));
  } else {
    const preSliced = frameMode.includes(modelParmas.value.mode)
      ? rawMedias.slice(0, 2)
      : modelParmas.value.mode === "singleImage"
        ? rawMedias.slice(0, 1)
        : rawMedias;
    const filtered = preSliced.filter((item) => typeof item.id === "number" && !isNaN(item.id)).map(({ id, sources }, idx) => ({
      id: id!,
      sources,
      role: frameMode.includes(modelParmas.value.mode) ? (idx === 0 ? "start" : "end") : undefined,
    }));
    if (frameMode.includes(modelParmas.value.mode)) info = filtered.slice(0, 2);
    else if (modelParmas.value.mode === "singleImage") info = filtered.slice(0, 1);
    else info = filtered;
  }
  track.state = "生成中";
  try {
    const modes = (modeOptions.value.mode ?? []).map((m: VideoMode) => (Array.isArray(m) ? JSON.stringify(m) : String(m)));
    const fillModes = modes.length ? modes : [modelParmas.value.mode].filter(Boolean);
    const { data: matrixData } = await axios.post("/production/workbench/fillModeMatrix", {
      projectId: project.value?.id,
      scriptId: episodesId.value,
      storyboardId: primaryStoryboardId.value ?? undefined,
      modes: fillModes,
      seedPrompt: track.prompt ?? "",
      model: modelParmas.value.model,
      info,
    });
    const matrixPayload = matrixData?.data ?? matrixData;
    const byMode = matrixPayload?.promptByMode ?? {};
    const trackKey = promptMatrixKey(currentTrackId, rawMedias);
    promptByMode.value[trackKey] = {};
    for (const [mode, entry] of Object.entries(byMode) as [string, { prompt?: string } | string][]) {
      const p = typeof entry === "string" ? entry : entry?.prompt ?? "";
      if (p) promptByMode.value[trackKey][mode] = p;
    }

    // Also generate current mode via generate path for DB persistence
    const { data } = await axios.post("/production/workbench/generateVideoPrompt", {
      projectId: project.value?.id,
      trackId: currentTrackId,
      info: info,
      model: modelParmas.value.model,
      mode: modelParmas.value.mode,
    });
    const payload = data?.data ?? data;
    const promptText =
      typeof payload === "string"
        ? payload
        : typeof payload?.prompt === "string"
          ? payload.prompt
          : typeof data === "string"
            ? data
            : "";
    track.prompt = promptText;
    // M7: recompile cleared VIDEO-PROMPT-STALE debt when new prompt landed
    if (
      promptText &&
      burnVideoDebt.value?.findings?.some((f) => /VIDEO-PROMPT-STALE/i.test(String(f.id ?? "")))
    ) {
      burnVideoDebt.value = null;
    }
    shotSpecDrawerRef.value?.clearVideoIrd?.();
    if (Array.isArray(payload?.identity)) {
      identitySlots.value = payload.identity;
    } else {
      identitySlots.value = parseIdentitySlots(track.prompt);
    }
    if (Array.isArray(payload?.autoHealed) && payload.autoHealed.length && payload?.burnAllowed !== false) {
      window.$message.success(
        `已自动修复：${payload.autoHealed.join("、")}${payload.duration != null ? `（时长 ${payload.duration}s）` : ""}`,
      );
    }
    if (payload?.redLights?.length) {
      const blocks = payload.redLights.filter((r: { level: string }) => r.level === "BLOCK");
      if (blocks.length || payload?.burnAllowed === false) {
        // Only copy repair list when still blocked after silent heal
        const crt = typeof payload.chatRepairText === "string" ? payload.chatRepairText : "";
        const um =
          payload?.qualityDecision?.userMessage ||
          payload?.userMessage ||
          blocks.map((b: { message: string }) => b.message).join("；") ||
          payload.qualityDecision?.reasons?.join("; ") ||
          "挡烧";
        const suggested = payload?.qualityDecision?.suggestedValue ?? payload?.suggestedValue;
        const cta = payload?.qualityDecision?.ctaLabel || payload?.ctaLabel;
        if (crt.trim()) {
          try {
            await navigator.clipboard?.writeText(crt);
          } catch {
            /* ignore */
          }
          window.$message.error(
            `提示词未达烧片标准 — ${um}${suggested != null ? `（建议 ${suggested}）` : ""}${cta ? ` · ${cta}` : ""} — 已复制修复清单`,
          );
        } else {
          window.$message.error(um);
        }
      }
    }
    if (modelParmas.value.mode) {
      promptByMode.value[trackKey][modelParmas.value.mode] = promptText;
    }
    // Prefer matrix entry for current mode if richer
    const matrixCur = promptByMode.value[trackKey][modelParmas.value.mode];
    if (matrixCur && (!promptText || matrixCur.length > promptText.length)) {
      track.prompt = matrixCur;
    }
    if (!payload?.identity) identitySlots.value = parseIdentitySlots(track.prompt);
    // BE may persist prompt with burnAllowed=false + state=需完善 — never forge 已完成
    if (payload?.burnAllowed === false) {
      track.state = "需完善";
    } else if (typeof payload?.state === "string" && payload.state) {
      track.state = payload.state as TrackItem["state"];
    } else {
      track.state = "已完成";
    }
  } catch (e: any) {
    track.state = "生成失败";
    const details = e?.response?.data?.data ?? e?.data ?? e;
    captureBurnVideoDebt({
      ...(typeof details === "object" && details ? details : {}),
      code: details?.code,
      reverseTrigger: details?.reverseTrigger,
      primaryNextStep: details?.primaryNextStep ?? details?.nextStep,
      ctaLabel: details?.ctaLabel,
      userMessage: details?.userMessage || details?.message,
      findings: details?.findings,
      missingSlots: details?.missingSlots,
      primaryAction: details?.primaryAction,
    });
    const plan = details?.rePushPlan ?? e?.response?.data?.data?.rePushPlan ?? e?.data?.rePushPlan ?? e?.rePushPlan;
    if (Array.isArray(plan) && plan.length) {
      lastRePushPlan.value = plan;
      window.$message.error(`提示词失败 · ${plan[0].trigger}→${plan[0].reverseTarget}`);
    } else {
      window.$message.error((e as Error)?.message ?? "提示词生成失败");
    }
  }
}

function parseIdentitySlots(prompt: string): { kind: string; code: string }[] {
  if (!prompt) return [];
  const out: { kind: string; code: string }[] = [];
  const block = prompt.match(/identity\[([^\]]+)\]/i);
  if (block) {
    for (const part of block[1].split("|")) {
      const m = part.trim().match(/^(CHAR|SCENE|PROP)\s*:\s*([A-Z0-9-]+)/i);
      if (m) out.push({ kind: m[1].toUpperCase(), code: m[2].toUpperCase() });
    }
  }
  for (const m of prompt.matchAll(/--cref\s+([A-Z0-9,\s-]+)/gi)) {
    for (const c of m[1].split(/[,\s]+/)) {
      if (/^CHAR-/i.test(c)) out.push({ kind: "CHAR", code: c.toUpperCase() });
    }
  }
  for (const m of prompt.matchAll(/--sref\s+([A-Z0-9,\s-]+)/gi)) {
    for (const c of m[1].split(/[,\s]+/)) {
      if (/^(SCENE|PROP)-/i.test(c)) out.push({ kind: c.toUpperCase().startsWith("PROP") ? "PROP" : "SCENE", code: c.toUpperCase() });
    }
  }
  const seen = new Set<string>();
  return out.filter((s) => {
    if (seen.has(s.code)) return false;
    seen.add(s.code);
    return true;
  });
}

function onRePushJump(item: { reverseTarget: string; trigger: string }) {
  goDesignStage(item.reverseTarget, item.trigger);
}
function trackChange(prevIndex?: number) {
  // 切换前：将旧轨道的 imageList 保存到缓存
  if (prevIndex != null) {
    const prevTrack = trackList.value[prevIndex];
    const pid = project.value?.id;
    const sid = episodesId.value;
    if (pid != null && sid != null && prevTrack?.id != null) {
      setCache(pid, sid, prevTrack.id, prevTrack.medias as unknown as UploadItem[]);
    }
  }
  // 切换后：从缓存恢复当前轨道的 imageList
  const pid = project.value?.id;
  const sid = episodesId.value;
  const curTrack = trackList.value[activeTrackIndex.value];
  if (pid != null && sid != null && curTrack?.id != null) {
    const cached = getCache(pid, sid, curTrack.id);
    if (cached) {
      curTrack.medias = cached as unknown as TrackMedia[];
    }
  }
  // imageList 是基于 currentTrack.medias 的计算属性，切换轨道后自动切换数据
  if (modelParmas.value.mode == "singleImage" && imageList.value.length > 1) {
    imageList.value = imageList.value.slice(0, 1);
  }
  modelParmas.value.duration = clampDuration(trackList.value?.[activeTrackIndex.value]?.duration);
}
/** 监听当前轨道的 medias 变化，实时同步到缓存 */
watch(
  () => currentTrack.value?.medias,
  (medias) => {
    if (!medias) return;
    const pid = project.value?.id;
    const sid = episodesId.value;
    const trackId = currentTrack.value?.id;
    if (pid != null && sid != null && trackId != null) {
      setCache(pid, sid, trackId, medias as unknown as UploadItem[]);
    }
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
  if (!(await runPreflight())) return;
  if (currentTrack.value?.state === "需完善" || currentTrack.value?.burnAllowed === false) {
    window.$message.warning("提示词未达烧片标准（需完善），请先重编译或按清单修复后再烧");
    return;
  }
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.generateConfirm"),
    body: $t("workbench.generate.generateConfirmBody"),
    onConfirm: async () => {
      dlg.destroy();
      try {
        const { data } = await axios.post("/production/workbench/generateVideo", {
          projectId: project.value?.id,
          scriptId: episodesId.value,
          uploadData:
            modelParmas.value.mode === "text"
              ? []
              : (() => {
                  const frameMode = ["startEndRequired", "endFrameOptional", "startFrameOptional"];
                  const preSliced = frameMode.includes(modelParmas.value.mode)
                    ? imageList.value.slice(0, 2)
                    : modelParmas.value.mode === "singleImage"
                      ? imageList.value.slice(0, 1)
                      : imageList.value;
                  const filtered = preSliced
                    .filter((item) => Boolean(item.src) && typeof item.id === "number" && !isNaN(item.id))
                    .map(({ id, sources }) => ({ id, sources }));
                  if (frameMode.includes(modelParmas.value.mode)) return filtered.slice(0, 2);
                  if (modelParmas.value.mode === "singleImage") return filtered.slice(0, 1);
                  return filtered;
                })(),
          prompt: currentTrack.value.prompt,
          model: modelParmas.value.model,
          mode: modelParmas.value.mode,
          resolution: modelParmas.value.resolution,
          duration: modelParmas.value.duration,
          audio: modelParmas.value.audio,
          trackId: currentTrack.value.id,
        });
        window.$message.success($t("workbench.generate.generateStarted"));
        burnVideoDebt.value = null;
        currentTrack.value.videoList.push({
          id: data,
          state: "生成中",
          src: "",
        });
      } catch (e: any) {
        const details = e?.response?.data?.data ?? e?.data ?? e;
        const plan = details?.rePushPlan;
        const qd = details?.qualityDecision;
        const um = details?.userMessage || qd?.userMessage || details?.message;
        const suggested = details?.suggestedValue ?? qd?.suggestedValue;
        const cta = details?.ctaLabel || qd?.ctaLabel;
        const crt =
          typeof details?.chatRepairText === "string"
            ? details.chatRepairText
            : typeof details?.exportGate?.chatRepairText === "string"
              ? details.exportGate.chatRepairText
              : "";
        captureBurnVideoDebt({
          ...(typeof details === "object" && details ? details : {}),
          code: details?.code ?? qd?.code,
          reverseTrigger: details?.reverseTrigger ?? qd?.reverseTrigger,
          primaryNextStep: details?.primaryNextStep ?? details?.nextStep ?? qd?.nextStep,
          ctaLabel: cta,
          userMessage: um,
          findings: details?.findings,
          missingSlots: details?.missingSlots,
          primaryAction: details?.primaryAction,
        });
        // Prefer actionable CTA over blank soft_patch copy
        if (um && (suggested != null || cta)) {
          if (crt.trim()) {
            try {
              await navigator.clipboard?.writeText(crt);
            } catch {
              /* ignore */
            }
          }
          window.$message.error(
            `${um}${suggested != null ? `（建议 ${suggested}）` : ""}${cta ? ` · ${cta}` : ""}${crt.trim() ? " — 已复制修复清单" : ""}`,
          );
        } else if (crt.trim()) {
          try {
            await navigator.clipboard?.writeText(crt);
            window.$message.error("质量决策挡烧 — 已复制闭环修复清单，请回推 Chat");
          } catch {
            window.$message.error(details?.message || e?.message || "质量决策挡烧");
          }
        } else if (Array.isArray(plan) && plan.length) {
          lastRePushPlan.value = plan;
          window.$message.error(`生成失败 · ${plan[0].trigger}→${plan[0].reverseTarget}`);
        } else {
          window.$message.error(details?.message || (e as any)?.message || "视频发起生成请求失败");
        }
      } finally {
      }
    },
    onCancel: () => dlg.destroy(),
  });
}
let pollTimer: NodeJS.Timeout | null = null;
let promptPollTimer: NodeJS.Timeout | null = null;
let videoPollFails = 0;
let promptPollFails = 0;
const POLL_FAIL_MAX = 5;

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
  try {
    const { data } = await axios.post("/production/workbench/checkVideoStateList", {
      projectId: project.value?.id,
      scriptId: episodesId.value ?? 0,
      videoIds: hasGenerateVideoIds.value,
    });
    videoPollFails = 0;
    if (data && data.length) {
      data.forEach(
        (item: {
          id: number;
          state: "生成中" | "未生成" | "已完成" | "生成失败";
          src?: string;
          errorReason?: string;
          primaryNextStep?: string;
          userMessage?: string;
          ctaLabel?: string;
          message?: string;
          code?: string;
          findings?: unknown;
          missingSlots?: string[];
          primaryAction?: string;
          unknownDims?: string[];
          notify?: boolean;
        }) => {
          for (const track of trackList.value) {
            const findData = track.videoList.find((i) => i.id == item.id);
            if (findData) {
              const prev = findData.state;
              findData.state = item.state;
              findData.src = item?.src ?? "";
              findData.errorReason = item?.errorReason ?? "";
              if (item.state === "生成失败" && prev !== "生成失败") {
                if (item.primaryNextStep || item.userMessage || item.code || item.ctaLabel) {
                  captureBurnVideoDebt({
                    code: item.code,
                    primaryNextStep: item.primaryNextStep,
                    userMessage: item.userMessage || item.message,
                    ctaLabel: item.ctaLabel,
                    findings: item.findings,
                    missingSlots: item.missingSlots,
                    primaryAction: item.primaryAction,
                    unknownDims: item.unknownDims,
                  });
                } else {
                  ingestVideoErrorReason(item.errorReason);
                }
              }
              if (item.state === "已完成") burnVideoDebt.value = null;
              break;
            }
          }
        },
      );
    }
  } catch {
    videoPollFails++;
    if (videoPollFails >= POLL_FAIL_MAX) {
      stopPoll();
      window.$message?.warning?.($t("workbench.generate.pollingFailed"));
    }
  }
}

/** Parse o_video.errorReason JSON → VIRD / human_review bar when applicable. */
function ingestVideoErrorReason(raw?: string | null) {
  if (!raw) return;
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = typeof raw === "string" && raw.trim().startsWith("{") ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }
  if (parsed) {
    const pb = (parsed.postBurn as Record<string, unknown> | undefined) ?? undefined;
    const flat = {
      ...parsed,
      ...(pb ?? {}),
      code: parsed.code ?? pb?.code,
      reverseTrigger: parsed.reverseTrigger,
      primaryNextStep: parsed.primaryNextStep ?? pb?.primaryNextStep ?? parsed.nextStep,
      ctaLabel: parsed.ctaLabel,
      userMessage: parsed.userMessage || pb?.userMessage || parsed.message,
      findings: parsed.findings || pb?.findings,
      missingSlots: parsed.missingSlots,
      primaryAction: parsed.primaryAction,
      unknownDims: parsed.unknownDims || pb?.unknownDims,
    };
    captureBurnVideoDebt(flat);
    const um = String(flat.userMessage || "");
    const cta = String(flat.ctaLabel || "");
    if (um || cta) {
      window.$message?.error?.(`${um}${cta ? ` · ${cta}` : ""}`);
    }
  } else if (/DEX-VID|视频设计|伪台词|运镜|human_review|SVQ|VIDEO-PROMPT-STALE|重编译|提示词.*过期/i.test(raw)) {
    const stale = /VIDEO-PROMPT-STALE|video_prompt_stale|重编译|提示词.*过期/i.test(raw);
    captureBurnVideoDebt({
      code: stale ? "VIDEO-PROMPT-STALE" : "DEX-VID",
      reverseTrigger: stale ? "video_prompt_stale" : undefined,
      primaryNextStep: /human_review|SVQ/i.test(raw) ? "human_review" : "chat_repair",
      userMessage: raw,
      ctaLabel: /human_review|SVQ/i.test(raw)
        ? "SVQ 未测维 · 人审"
        : stale
          ? "重编译视频提示词"
          : "诊断视频 IRD",
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
/** 查询提示词生成状态 */
async function getTrackPromptList() {
  try {
    const { data } = await axios.post("/production/workbench/checkVideoPrompt", {
      projectId: project.value?.id,
      scriptId: episodesId.value ?? 0,
      trackIds: hasGeneratePromptIds.value,
    });
    promptPollFails = 0;
    if (data && data.length) {
      data.forEach((item: {
        id: number;
        state: "生成中" | "未生成" | "已完成" | "生成失败" | "需完善";
        prompt?: string;
        reason?: string;
        burnAllowed?: boolean;
      }) => {
        const findData = trackList.value.find((t) => t.id == item.id);
        if (findData) {
          findData.state = item.state;
          findData.prompt = item?.prompt ?? "";
          findData.reason = item?.reason ?? "";
          if (item.state === "生成失败") {
            ingestVideoErrorReason(item.reason);
            window.$message.error(`提示词生成失败，${item.reason ?? "未知原因"}`);
          } else if (item.state === "需完善" || item.burnAllowed === false) {
            window.$message.warning("提示词已落库但不可烧片（需完善），请按清单修复后重编译");
          }
        }
      });
    }
  } catch {
    promptPollFails++;
    if (promptPollFails >= POLL_FAIL_MAX) {
      stopPromptPoll();
      window.$message?.warning?.($t("workbench.generate.pollingFailed"));
    }
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
});
</script>

<style lang="scss" scoped>
.index {
  height: calc(100vh - 120px);
  gap: 16px;
  overflow-y: auto;
  .referenceImage {
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
