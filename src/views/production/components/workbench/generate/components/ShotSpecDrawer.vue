<template>
  <div class="shotSpecDrawer">
    <div class="bar ac">
      <t-button size="small" variant="outline" :loading="loading" @click="refresh(true)">设定对照</t-button>
      <t-button
        size="small"
        theme="warning"
        variant="outline"
        :loading="healing"
        :disabled="!canHeal"
        @click="runHeal"
      >
        智能修复
      </t-button>
      <div v-if="redBlocks.length" class="lights">
        <t-tag v-for="(r, i) in redBlocks" :key="i" theme="danger" variant="light" size="small">{{ r.message }}</t-tag>
      </div>
      <div v-else-if="loaded" class="ok">SPEC OK</div>
      <div v-if="healMsg" class="healMsg">{{ healMsg }}</div>
    </div>
    <t-drawer v-model:visible="visible" size="520px" :footer="false" header="Shot Spec · Prompt · Params">
      <div v-if="payload" class="body fc">
        <section>
          <h4>Spec（Package）</h4>
          <pre>{{ specJson }}</pre>
        </section>
        <section>
          <h4>Prompt</h4>
          <p class="muted">injected: {{ (payload.prompt?.injectedFields || []).join(", ") || "—" }}</p>
          <pre class="prompt">{{ payload.prompt?.vendorPreview || "—" }}</pre>
        </section>
        <section>
          <h4>Params（Vendor API）</h4>
          <pre>{{ paramsJson }}</pre>
          <p class="muted">text_only: {{ (payload.bridging?.textOnly || []).join(", ") }}</p>
          <p v-if="payload.textHardening?.length" class="warn">hardening: {{ payload.textHardening.join(" · ") }}</p>
        </section>
        <section v-if="payload.modeMatrix">
          <h4>四模式并排</h4>
          <div v-for="(p, mode) in payload.modeMatrix" :key="mode" class="modeBlock">
            <strong>{{ mode }}</strong>
            <pre>{{ trunc(p) }}</pre>
          </div>
        </section>
        <section v-if="payload.missingAssetImageQueue?.length || healResult?.nextQueue?.length">
          <h4>缺图队列（禁假绿）</h4>
          <ul>
            <li v-for="(q, i) in (healResult?.nextQueue?.length ? healResult.nextQueue : payload.missingAssetImageQueue)" :key="i">
              {{ q.kind }} {{ q.code }} → {{ q.action }}
            </li>
          </ul>
          <p v-if="healResult?.nextStep === 'regen_storyboard_hq' || healResult?.primaryNextStep === 'regen_storyboard_hq'" class="warn">
            {{ healResult?.userMessage || "分镜图构图不够好，视频会糊" }}
          </p>
          <t-button
            v-if="healResult?.nextStep === 'regen_storyboard_hq' || healResult?.primaryNextStep === 'regen_storyboard_hq'"
            size="small"
            theme="primary"
            :loading="hqLoading"
            @click="regenStoryboardHq"
          >
            {{ hqRegenCtaLabel }}
          </t-button>
          <div
            v-if="healResult?.nextStep === 'chat_repair' || healResult?.primaryNextStep === 'chat_repair' || (healResult?.missingSlots?.length)"
            class="warn"
          >
            <p>{{ healResult?.userMessage || "须手改描写，禁止只 regen" }}</p>
            <div v-if="healResult?.missingSlots?.length" class="slotChips">
              <t-tag v-for="s in healResult.missingSlots" :key="s" size="small" theme="warning" variant="light">{{ s }}</t-tag>
            </div>
            <p class="muted">{{ healResult?.ctaLabel || "手改VD" }} → 回分镜改 visualDescription 后重出</p>
            <div class="slotChips" style="margin-top: 6px">
              <t-button
                v-if="showEnhanceCta"
                size="small"
                theme="primary"
                :loading="enhanceLoading"
                @click="applyLitEnhance"
              >
                {{ enhanceCtaLabel }}
              </t-button>
              <t-button size="small" theme="default" variant="outline" @click="openStillIntentOps">诊断 IRD</t-button>
            </div>
          </div>
          <p v-if="healResult?.nextStep === 'split_shot' || healResult?.primaryNextStep === 'split_shot'" class="warn">
            {{ healResult?.userMessage || "须智能拆镜；请 Confirm / stillIntentOps" }}
          </p>
          <t-button
            v-if="healResult?.nextStep === 'split_shot' || healResult?.primaryNextStep === 'split_shot'"
            size="small"
            theme="warning"
            @click="openStillIntentOps"
          >
            {{ healResult?.ctaLabel || "确认智能拆镜" }}
          </t-button>
          <p v-if="healResult?.nextStep === 'raise_duration' || healResult?.primaryNextStep === 'raise_duration'" class="warn">
            {{
              healResult?.userMessage ||
              (healResult?.suggestedValue != null
                ? `台词/情绪需要更长镜头，建议时长 ${healResult.suggestedValue}s`
                : "台词/情绪需要更长镜头")
            }}
          </p>
          <t-button
            v-if="
              (healResult?.nextStep === 'raise_duration' || healResult?.primaryNextStep === 'raise_duration') &&
              healResult?.suggestedValue != null
            "
            size="small"
            theme="primary"
            :loading="healing"
            @click="runHeal"
          >
            {{ healResult?.ctaLabel || "一键加长" }}（{{ healResult.suggestedValue }}s）
          </t-button>
          <p v-if="healResult?.nextStep === 'human_review' || healResult?.primaryNextStep === 'human_review'" class="warn">
            {{ healResult?.userMessage || "SVQ 未测维须人审（skip≠pass），禁止当 videoPass" }}
          </p>
          <p
            v-if="healResult?.nextStep === 'human_review' || healResult?.primaryNextStep === 'human_review'"
            class="muted"
          >
            {{ healResult?.ctaLabel || "SVQ 未测维 · 人审" }}
          </p>
          <p v-if="healResult?.nextStep === 'batch_still'" class="warn">
            资产行已就绪；一键自愈不代打厂商生图。请到资产页批量生静照后，再点「生成提示词」。
          </p>
          <t-button size="small" theme="primary" :loading="healing" @click="runHeal">补种 / 自愈关联</t-button>
          <VideoIntentDebtBar
            :ok="videoIrd?.ok"
            :primary-action="videoIrd?.primaryAction"
            :primary-next-step="videoIrd?.primaryNextStep || healResult?.primaryNextStep"
            :missing-slots="videoIrd?.missingSlots"
            :cta-label="videoIrd?.ctaLabel || healResult?.ctaLabel"
            :findings="videoIrd?.findings || healStaleFindings"
            :explain="videoIrd?.userMessage || healResult?.userMessage"
            :diagnosing="videoIrdLoading"
            :applying="videoIrdApplying"
            @diagnose="openVideoIntentOps"
            @confirm-apply="applyVideoIntentOps"
            @hand-edit-vd="openVideoIntentOps"
            @recompile-prompt="emit('recompile-prompt')"
            @human-rejudge-video="applyVideoHumanRejudge"
            @regen-prop-still="regenPropStillFromDrawer"
          />
          <t-button size="small" theme="default" variant="outline" :loading="videoIrdLoading" @click="openVideoIntentOps">
            诊断视频 IRD
          </t-button>
        </section>
        <section class="healScope">
          <h4>自愈范围</h4>
          <p class="muted">可点修：场景码、主 CHAR/SCENE 种子与脚本关联、digit↔slug、静照队列准备</p>
          <p class="muted">仅告知 / 需人工：批量生静照（计费）、无 L6 衍生、导入 audioGap、双 cref不全</p>
        </section>
        <section v-if="healResult">
          <h4>自愈结果</h4>
          <pre>{{ healResultJson }}</pre>
        </section>
      </div>
    </t-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import axios from "@/utils/axios";
import { selfHeal } from "@/utils/ruleEngine";
import projectStore from "@/stores/project";
import { storeToRefs } from "pinia";
import VideoIntentDebtBar from "@/components/video/VideoIntentDebtBar.vue";
import type { VideoIrdDiagnoseResponse } from "@/types/videoIntentOps";
import { videoIrdCtaLabel } from "@/types/videoIntentOps";
import { resolveStillRepairCtaLabel, shouldBlockSilentStillRegen, type StillMeta } from "@/types/stillQuality";
import { toastAfterApplyExitGate, designExitStillOpen } from "@/utils/v5OpsHelpers";

const { project } = storeToRefs(projectStore());

const props = defineProps<{
  projectId?: number | null;
  scriptId?: number | null;
  storyboardId?: number | null;
  prompt?: string;
  mode?: string;
  duration?: number;
  audio?: boolean;
  resolution?: string;
}>();

const emit = defineEmits<{
  identity: [slots: { kind: string; code: string }[]];
  "recompile-prompt": [];
}>();

const visible = ref(false);
const loading = ref(false);
const healing = ref(false);
const hqLoading = ref(false);
const enhanceLoading = ref(false);
const videoIrdLoading = ref(false);
const videoIrdApplying = ref(false);
const videoIrd = ref<VideoIrdDiagnoseResponse | null>(null);
const loaded = ref(false);
const payload = ref<any>(null);
const healResult = ref<any>(null);
const healMsg = ref("");

const redBlocks = computed(() => (payload.value?.redLights ?? []).filter((r: any) => r.level === "BLOCK"));
const canHeal = computed(
  () =>
    props.projectId != null &&
    props.scriptId != null &&
    !healing.value &&
    (loaded.value ||
      redBlocks.value.length > 0 ||
      (payload.value?.missingAssetImageQueue?.length ?? 0) > 0 ||
      (healResult.value?.nextQueue?.length ?? 0) > 0 ||
      healResult.value?.nextStep === "batch_still" ||
      healResult.value?.nextStep === "soft_patch" ||
      healResult.value?.primaryNextStep === "soft_patch" ||
      healResult.value?.primaryNextStep === "split_shot" ||
      Boolean(videoIrd.value && videoIrd.value.ok === false)),
);
const specJson = computed(() => JSON.stringify(payload.value?.spec ?? {}, null, 2));
const paramsJson = computed(() => JSON.stringify(payload.value?.params ?? {}, null, 2));
const healResultJson = computed(() => JSON.stringify(healResult.value ?? {}, null, 2));

/** SheetLeak →「禁拼版重抽」; else BE cta / generic HQ (homology with BE I5). */
const hqRegenCtaLabel = computed(() =>
  resolveStillRepairCtaLabel({
    sheetLeak: Boolean(healResult.value?.sheetLeak),
    ctaLabel: healResult.value?.ctaLabel,
    userMessage: healResult.value?.userMessage,
    primaryNextStep: healResult.value?.primaryNextStep || healResult.value?.nextStep,
    fidelityStopReason: healResult.value?.fidelityStopReason,
  }),
);

/** Surface VIDEO-PROMPT-STALE from heal envelope onto VIRD bar when diagnose empty. */
const healStaleFindings = computed(() => {
  const code = String(healResult.value?.code ?? healResult.value?.blockCode ?? "");
  const trigger = String(healResult.value?.reverseTrigger ?? "");
  const msg = String(healResult.value?.userMessage ?? healResult.value?.message ?? "");
  if (!/VIDEO-PROMPT-STALE|video_prompt_stale/i.test(`${code} ${trigger} ${msg}`)) return undefined;
  return [
    {
      id: code || "VIDEO-PROMPT-STALE",
      severity: "BLOCK" as const,
      message: msg || "设计/对白已变，须重编译视频提示词",
    },
  ];
});

const showEnhanceCta = computed(() => {
  const act = healResult.value?.primaryAction || healResult.value?.irdPrimaryAction;
  const slots = healResult.value?.missingSlots ?? [];
  return (
    act === "confirm_enhance" ||
    act === "apply_auto_enhance" ||
    slots.some((s: string) => /contact|grip|xor|wound|propReadable/i.test(String(s)))
  );
});
const enhanceCtaLabel = computed(() => {
  const act = healResult.value?.primaryAction || healResult.value?.irdPrimaryAction;
  const slots = (healResult.value?.missingSlots ?? []).slice(0, 3);
  if (act === "apply_auto_enhance") return slots.length ? `自动增强补${slots.join("/")}` : "自动增强";
  return slots.length ? `批准增强补${slots.join("/")}` : "批准增强";
});

function trunc(s: string) {
  return (s || "").length > 420 ? `${s.slice(0, 420)}…` : s || "";
}

/** @param openDrawer when true opens the contrast drawer (设定对照) */
async function refresh(openDrawer = true) {
  if (props.projectId == null || props.scriptId == null) return;
  loading.value = true;
  try {
    const { data } = await axios.post("/production/workbench/getShotSpecDiff", {
      projectId: props.projectId,
      scriptId: props.scriptId,
      storyboardId: props.storyboardId ?? undefined,
      prompt: props.prompt ?? "",
      mode: props.mode ?? "text",
      duration: props.duration,
      audio: props.audio,
      resolution: props.resolution,
      includeModeMatrix: true,
    });
    payload.value = data?.data ?? data;
    loaded.value = true;
    const spec = payload.value?.spec;
    const fromPrompt = payload.value?.prompt?.identity;
    if (Array.isArray(fromPrompt) && fromPrompt.length) {
      emit("identity", fromPrompt);
    } else if (spec) {
      const slots: { kind: string; code: string }[] = [];
      for (const c of spec.charCodes ?? []) slots.push({ kind: "CHAR", code: c });
      if (spec.sceneCode) slots.push({ kind: "SCENE", code: spec.sceneCode });
      for (const c of spec.propCodes ?? []) slots.push({ kind: "PROP", code: c });
      if (slots.length) emit("identity", slots);
    }
    if (openDrawer) visible.value = true;
  } catch (e: any) {
    window.$message?.error?.(e?.message ?? "getShotSpecDiff failed");
  } finally {
    loading.value = false;
  }
}

async function regenStoryboardHq() {
  if (props.projectId == null || props.storyboardId == null) {
    window.$message?.warning?.("缺少分镜 ID");
    return;
  }
  const model = project.value?.imageModel;
  const quality = project.value?.imageQuality || "2K";
  const ratio = project.value?.videoRatio || "9:16";
  if (!model) {
    window.$message?.error?.("请先配置图片模型");
    return;
  }
  const regenMeta: StillMeta = {
    primaryNextStep: healResult.value?.primaryNextStep ?? healResult.value?.nextStep,
    irdPrimaryAction: healResult.value?.primaryAction,
    missingSlots: healResult.value?.missingSlots,
    // Shootable-first: only missing_identity bricks Generate (resolver ignores literary latch)
    blockSilentRegen: healResult.value?.blockSilentRegen,
    debtKind: healResult.value?.debtKind,
    propPlateGrade: healResult.value?.propPlateGrade,
    keyOptional: healResult.value?.keyOptional,
    pixelDimStatus: healResult.value?.pixelDimStatus,
    requireFixBeforeBurn: healResult.value?.requireFixBeforeBurn,
  };
  // Shootable-first: shouldBlockSilentStillRegen always false — never brick; identity soft-warn only
  if (String(regenMeta.debtKind ?? "") === "missing_identity") {
    window.$message.info(
      healResult.value?.userMessage ||
        healResult.value?.ctaLabel ||
        "缺定妆 — 将入队补资产并继续生成（不挡试拍）",
    );
  }
  hqLoading.value = true;
  try {
    const strengthen =
      healResult.value?.strengthen ||
      healResult.value?.actions?.[0]?.strengthen ||
      undefined;
    const { data } = await axios.post("/production/editImage/generateFlowImage", {
      model,
      quality,
      ratio,
      prompt: props.prompt || "",
      projectId: props.projectId,
      storyboardId: props.storyboardId,
      qualityMode: "hq_update",
      persistToStoryboard: true,
      mode: "multiReference",
      ...(strengthen ? { strengthen } : {}),
    });
    const body = data?.data ?? data;
    window.$message?.success?.(body?.userMessage || "已更新高质量分镜图");
    healMsg.value = body?.userMessage || "hq_ok";
  } catch (e: any) {
    const payload = e?.response?.data?.data ?? {};
    window.$message?.error?.(payload.userMessage || e?.message || "高质量分镜更新失败");
  } finally {
    hqLoading.value = false;
  }
}

async function runHeal() {
  if (props.projectId == null || props.scriptId == null) return;
  if (!payload.value) await refresh(false);
  healing.value = true;
  healMsg.value = "";
  try {
    const gaps = (payload.value?.identityGate?.gaps ?? payload.value?.missingAssetImageQueue ?? []).map((g: any) => ({
      code: g.code,
      reason: g.reason ?? (g.action === "generate_still" ? "no_image" : "no_asset"),
      kind: g.kind,
    }));
    if (!gaps.length && payload.value?.spec && !payload.value.spec.sceneCode) {
      gaps.push({ code: "SCENE-?", reason: "missing_scene", kind: "SCENE" });
    }
    const result = await selfHeal({
      projectId: props.projectId,
      scriptId: props.scriptId,
      shotId: props.storyboardId ?? undefined,
      dryRun: false,
      apply: true,
      identityGaps: gaps,
      jobKind: "video",
    });
    if (!result || typeof result.healRound !== "number") {
      throw new Error("selfHeal 响应无效（检查 FE 解包）");
    }
    healResult.value = result;
    const skipHint =
      Array.isArray(result.skipped) && result.skipped.length
        ? `；跳过: ${result.skipped.map((s: { kind: string; reason: string }) => `${s.kind}=${s.reason}`).join(", ")}`
        : "";
    healMsg.value = `heal#${result.healRound} ${result.mode}: ${result.message}${skipHint}`;
    if (result.nextStep === "batch_still" || result.stillRunner?.queued) {
      window.$message?.success?.(
        `已建/关联 ${result.stillRunner?.queued ?? 0} 个资产。下一步请到「资产」批量生成静照，再点生成提示词`,
      );
    } else if (result.autoApplicable) {
      window.$message?.success?.(result.message);
    } else {
      window.$message?.warning?.(result.message);
    }
    await refresh(false);
  } catch (e: any) {
    window.$message?.error?.(e?.message ?? "selfHeal failed");
  } finally {
    healing.value = false;
  }
}

// Auto-load gaps so「智能修复」可点，无需先开设定对照
watch(
  () => [props.projectId, props.scriptId, props.storyboardId],
  () => {
    if (props.projectId != null && props.scriptId != null) refresh(false);
  },
  { immediate: true },
);

watch(
  () => [props.mode],
  () => {
    if (loaded.value) refresh(false);
  },
);

async function openStillIntentOps() {
  if (props.projectId == null) {
    window.$message?.warning?.("缺少项目 ID");
    return;
  }
  try {
    const { data } = await axios.post("/scriptAgent/stillIntentOps", {
      projectId: props.projectId,
      action: "diagnose",
    });
    const body = data?.data ?? data;
    const slots = body?.missingSlots ?? [];
    const msg =
      body?.ctaLabel ||
      body?.a11yAnnounce ||
      (slots.length ? `须手改描写，缺槽：${slots.join("、")}` : "已诊断；请 Confirm 拆镜或手改 VD");
    window.$message?.info?.(msg);
    healResult.value = {
      ...(healResult.value ?? {}),
      ...body,
      nextStep: body?.primaryAction === "confirm_split" ? "split_shot" : healResult.value?.nextStep,
      primaryNextStep:
        body?.primaryAction === "hand_edit_vd" ||
        body?.primaryAction === "confirm_enhance" ||
        body?.primaryAction === "apply_auto_enhance"
          ? "chat_repair"
          : body?.primaryAction === "confirm_split"
            ? "split_shot"
            : healResult.value?.primaryNextStep,
      missingSlots: slots,
      ctaLabel: body?.ctaLabel,
      userMessage: body?.a11yAnnounce || healResult.value?.userMessage,
    };
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.message || e?.message || "stillIntentOps 失败");
  }
}

async function applyLitEnhance() {
  if (props.projectId == null) {
    window.$message?.warning?.("缺少项目 ID");
    return;
  }
  enhanceLoading.value = true;
  try {
    const { data } = await axios.post("/scriptAgent/stillIntentOps", {
      projectId: props.projectId,
      action: "applyEnhance",
      forceApply: true,
      intentVisualEnhance: true,
      literaryDetailLlmFill: true,
    });
    const body = data?.data ?? data;
    if (body?.ok) {
      toastAfterApplyExitGate(body, body.a11yAnnounce || "已应用文学增强");
      healResult.value = {
        ...(healResult.value ?? {}),
        ...body,
        missingSlots: [],
        userMessage: body.a11yAnnounce,
      };
    } else {
      window.$message?.warning?.(
        (body?.refused || []).join("; ") || body?.a11yAnnounce || "增强未全部通过，请手改 VD",
      );
      await openStillIntentOps();
    }
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.message || e?.message || "applyEnhance 失败");
  } finally {
    enhanceLoading.value = false;
  }
}

async function openVideoIntentOps() {
  if (props.projectId == null) {
    window.$message?.warning?.("缺少项目 ID");
    return;
  }
  videoIrdLoading.value = true;
  try {
    const { data } = await axios.post("/scriptAgent/videoIntentOps", {
      projectId: props.projectId,
      action: "diagnose",
    });
    const body = (data?.data ?? data) as VideoIrdDiagnoseResponse;
    videoIrd.value = body;
    const msg =
      body?.ctaLabel ||
      videoIrdCtaLabel({
        primaryAction: body?.primaryAction,
        missingSlots: body?.missingSlots,
        primaryNextStep: body?.primaryNextStep,
      }) ||
      "视频设计已诊断";
    if (body?.ok) window.$message?.success?.(body.userMessage || "视频设计契约已过");
    else window.$message?.info?.(msg);
    healResult.value = {
      ...(healResult.value ?? {}),
      primaryNextStep: body?.ok ? healResult.value?.primaryNextStep : "chat_repair",
      nextStep: body?.ok ? healResult.value?.nextStep : "chat_repair",
      missingSlots: body?.missingSlots ?? healResult.value?.missingSlots,
      ctaLabel: body?.ctaLabel || healResult.value?.ctaLabel,
      userMessage: body?.userMessage || healResult.value?.userMessage,
    };
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.message || e?.message || "videoIntentOps 失败");
  } finally {
    videoIrdLoading.value = false;
  }
}

async function applyVideoIntentOps() {
  if (props.projectId == null) {
    window.$message?.warning?.("缺少项目 ID");
    return;
  }
  videoIrdApplying.value = true;
  try {
    const { data } = await axios.post("/scriptAgent/videoIntentOps", {
      projectId: props.projectId,
      action: "apply",
      forceApply: true,
    });
    const body = data?.data ?? data;
    const again = body?.after ?? body;
    videoIrd.value = again;
    toastAfterApplyExitGate(body, again?.userMessage || "视频设计债已清");
    if (!designExitStillOpen(body) && again?.ok) {
      videoIrd.value = null;
    } else {
      await openVideoIntentOps();
    }
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.message || e?.message || "videoIntentOps apply 失败");
  } finally {
    videoIrdApplying.value = false;
  }
}

async function applyVideoHumanRejudge() {
  if (!props.storyboardId) {
    window.$message?.warning?.("须绑定分镜");
    return;
  }
  try {
    const data = await axios.post("/production/storyboard/humanRejudgeFidelity", {
      storyboardId: props.storyboardId,
      modality: "video",
      items: [{ id: "svq_unmeasured", pass: true, evidence: "operator_video_rejudge" }],
    });
    const body = data?.data ?? data;
    if (body?.videoPass === false) {
      window.$message?.warning?.(body?.userMessage || "成片人审未全过");
      return;
    }
    window.$message?.success?.(body?.userMessage || "成片人审通过（未测·可交付）");
    videoIrd.value = null;
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.message || e?.message || "成片人审失败");
  }
}

async function regenPropStillFromDrawer() {
  if (!props.storyboardId || props.projectId == null) {
    window.$message?.warning?.("须绑定分镜");
    return;
  }
  try {
    await axios.post("/production/storyboard/batchGenerateImage", {
      projectId: props.projectId,
      scriptId: props.scriptId,
      storyboardIds: [props.storyboardId],
      compulsory: true,
      qualityMode: "hq_update",
    });
    window.$message.info("已排队重出带道具静照");
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.data?.userMessage || e?.message || "重出静照失败");
  }
}

defineExpose({
  refresh,
  open: () => refresh(true),
  runHeal,
  openVideoIntentOps,
  clearVideoIrd: () => {
    videoIrd.value = null;
  },
});
</script>

<style scoped>
.shotSpecDrawer {
  margin: 4px 0 8px;
}
.bar {
  gap: 8px;
  flex-wrap: wrap;
}
.lights {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ok {
  font-size: 12px;
  color: #2ba471;
}
.healMsg {
  font-size: 12px;
  color: #e37318;
}
.body {
  gap: 16px;
}
section h4 {
  margin: 0 0 6px;
  font-size: 13px;
}
pre {
  margin: 0;
  max-height: 180px;
  overflow: auto;
  font-size: 11px;
  background: var(--td-bg-color-container, #f5f5f5);
  padding: 8px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
}
.prompt {
  max-height: 220px;
}
.muted {
  font-size: 12px;
  opacity: 0.7;
  margin: 0 0 4px;
}
.warn {
  font-size: 12px;
  color: #e37318;
}
.slotChips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0;
}
.modeBlock {
  margin-bottom: 10px;
}
.modeBlock strong {
  font-size: 12px;
}
</style>
