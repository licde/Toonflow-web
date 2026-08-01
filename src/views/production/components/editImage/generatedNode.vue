<template>
  <div class="generatedNode">
    <Handle type="target" :position="Position.Left" />
    <div class="data" @click="selectedFn">
      <div class="title ac">
        <i-pic theme="outline" size="16" fill="#000000" />
        <span class="titleText">{{ $t("workbench.production.editImage.imageGeneration") }}</span>
      </div>
      <div class="image">
        <div v-if="generating" class="imageLoading">
          <div class="loadingSpinner"></div>
          <span class="loadingText">{{ $t("workbench.production.editImage.generating") }}</span>
        </div>
        <div v-else class="imageWrapper">
          <t-image class="image" :src="data.generatedImage" fit="contain" :class="['nodeImage', { selected }]">
            <template #overlayContent>
              <div class="imageToolsWrap">
                <ImageTools :src="data.generatedImage ?? ''" position="br" />
              </div>
            </template>
          </t-image>
        </div>
        <t-dropdown :options="options" @click="clickHandler">
          <div class="upload ac">
            <i-upload theme="outline" size="18" fill="#fff" />
            <span style="margin-left: 5px; color: #fff">{{ $t("workbench.production.editImage.upload") }}</span>
          </div>
        </t-dropdown>
        <t-tooltip theme="primary" :content="$t('workbench.production.editImage.deleteNode')">
          <div class="remove ac" @click="removeNodes(props.id)">
            <i-delete theme="outline" size="18" fill="#fff" />
          </div>
        </t-tooltip>
      </div>
    </div>
    <div v-show="selected" class="parameter" @wheel.stop @mousedown.stop>
      <div class="imageRefs f w">
        <div v-for="(item, index) in data.references" :key="index" class="refThumb">
          <t-image :src="item.image" fit="cover" class="refImg" />
        </div>
      </div>
      <div class="text w">
        <PromptEditor v-model="data.prompt" :references="references" :placeholder="$t('workbench.production.editImage.promptPlaceholder')" />
      </div>
      <div v-if="gateMessage || promptUsedSummary || litDebtSlots.length" class="feedbackBox w">
        <t-alert :theme="stillQuality === 'hq_ok' ? 'success' : 'warning'" :message="gateMessage || '合成提示词已更新'" />
        <p v-if="promptUsedSummary" class="promptSummary">{{ promptUsedSummary }}</p>
        <LitDetailDebtBar
          v-if="stillQuality === 'weak' || sheetLeak || litDebtSlots.length"
          :still-quality="stillQuality"
          :still-meta="stillMetaSnapshot"
          :missing-slots="litDebtSlots"
          :primary-action="irdPrimaryAction || undefined"
          :primary-next-step="primaryNextStep || undefined"
          :cta-label="debtCtaLabel || undefined"
          :explain="gateMessage || undefined"
          :presentation-fork="presentationFork"
          :design-debt-block="litDebtSlots.length > 0 && stillMetaSnapshot?.pendingHumanRejudge !== true"
          :suggest-fill-enabled="true"
          @hand-edit-vd="focusPromptForHandEdit"
          @confirm-enhance="applyLitEnhance"
          @suggest-fill="applyLitEnhance"
          @confirm-split="applyLitSplit"
          @presentation-fork="onPresentationFork"
          @human-rejudge="applyHumanRejudge"
          @batch-still="handleGenerate"
        />
        <t-button
          v-if="composePreview?.ok && composePreview.prompt && composePreview.prompt !== data.prompt"
          size="small"
          theme="primary"
          variant="outline"
          :loading="previewing"
          @click="applyComposePreview"
        >
          应用补全
        </t-button>
        <t-button size="small" theme="default" variant="outline" :loading="previewing" @click="() => loadComposePreview({ mode: 'fidelity', autoApply: true })">
          更贴描述（测试）
        </t-button>
        <t-button v-if="lastFeedback?.suggestedPrompt" size="small" theme="primary" variant="outline" :loading="generating" @click="retryWithSuggestion">
          重试建议提示词
        </t-button>
      </div>
      <div v-else-if="lastFeedback?.suggestedPrompt" class="feedbackBox w">
        <t-alert theme="warning" :message="lastFeedback.suggestedPrompt" />
        <t-button size="small" theme="primary" variant="outline" :loading="generating" @click="retryWithSuggestion">重试建议提示词</t-button>
      </div>
      <div class="operate ac jb">
        <div class="ac">
          <modelSelect v-model="data.model" type="image" size="small" />
          <t-select v-model="data.ratio" class="paramSelect ml-5" size="small" disabled :placeholder="$t('workbench.production.editImage.ratio')">
            <t-option value="16:9" label="16:9" />
            <t-option value="9:16" label="9:16" />
            <t-option value="1:1" label="1:1" />
          </t-select>
          <t-select v-model="data.quality" class="paramSelect ml-5" size="small" :placeholder="$t('workbench.production.editImage.quality')">
            <t-option value="1K" label="1K" />
            <t-option value="2K" label="2K" />
            <t-option value="4K" label="4K" />
          </t-select>
          <t-tag v-if="stillQuality" size="small" class="ml-5" :theme="stillQuality === 'hq_ok' ? 'success' : 'warning'" variant="light">
            {{ stillQuality }}
          </t-tag>
        </div>

        <div class="f" style="gap: 5px; margin-left: 5px">
          <t-popup content="测试：再点补全=refine">
            <t-button theme="default" size="small" variant="outline" :loading="previewing" @click="() => loadComposePreview({ mode: 'refine', autoApply: true, persist: true })">补全(测)</t-button>
          </t-popup>
          <t-popup content="测试：更贴描述=fidelity">
            <t-button theme="default" size="small" variant="outline" :loading="previewing" @click="() => loadComposePreview({ mode: 'fidelity', autoApply: true, persist: true })">贴描述(测)</t-button>
          </t-popup>
          <t-popup :content="$t('workbench.production.editImage.generateBtn')">
            <t-button theme="primary" size="small" class="generateBtn" :disabled="generating" :loading="generating" @click="() => handleGenerate()">
              <template #icon><i-arrow-up /></template>
            </t-button>
          </t-popup>
          <t-popup :content="$t('workbench.production.save')">
            <t-button theme="primary" size="small" class="keepBtn" :disabled="generating" :loading="generating" @click="handleKeep">
              <template #icon><i-save /></template>
            </t-button>
          </t-popup>
        </div>
      </div>
    </div>
    <Handle type="source" :position="Position.Right" style="z-index: 999999" />
  </div>
</template>

<script setup lang="ts">
import { Handle, useVueFlow, Position } from "@vue-flow/core";
import type { Ref } from "vue";
import modelSelect from "@/components/modelSelect.vue";
import PromptEditor from "@/components/promptEditor.vue";
import axios from "@/utils/axios";
import { type GeneratedNodeData } from "../../utils/editImageType";
import type { DropdownOption } from "tdesign-vue-next/es/dropdown";
import type { Storyboard } from "../../utils/flowBuilder";
import openAssetsSelector from "@/utils/assetsCheck";
import { useFileDialog } from "@vueuse/core";
import projectStore from "@/stores/project";
import { resolveGeneratePrompt } from "@/utils/resolveGeneratePrompt";
import LitDetailDebtBar from "@/components/still/LitDetailDebtBar.vue";
import { shouldBlockSilentStillRegen, type StillMeta } from "@/types/stillQuality";
import { toastAfterApplyExitGate } from "@/utils/v5OpsHelpers";
const { project } = storeToRefs(projectStore());
const openStoryboardCheck = inject<() => Promise<Storyboard[]>>("openStoryboardCheck")!;
const { open, onChange, onCancel } = useFileDialog({ multiple: false, reset: true, accept: ".png,.jpg,.jpeg" });

const selected = ref(true);
const generating = ref(false);
const previewing = ref(false);
const stillQuality = ref<string | null>(null);
const sheetLeak = ref(false);
const gateMessage = ref("");
const litDebtSlots = ref<string[]>([]);
const irdPrimaryAction = ref<string | null>(null);
const primaryNextStep = ref<string | null>(null);
const debtCtaLabel = ref<string | null>(null);
const presentationFork = ref<{ fork: string; label: string }[] | null>(null);
const stillMetaSnapshot = ref<StillMeta | null>(null);
const composePreview = ref<{
  ok?: boolean;
  prompt?: string;
  userMessage?: string;
  didSynthesize?: boolean;
  composeMode?: string;
  entityAnchors?: string[];
} | null>(null);
const promptUsedSummary = ref("");
const lastComposeMode = ref<"full" | "refine" | "fidelity">("full");
const episodesId = inject<Ref<number>>("episodesId")!;
const lastFeedback = ref<{ suggestedPrompt?: string; message?: string } | null>(null);
const storyboardId = inject<Ref<number | undefined> | number | undefined>("editStoryboardId", undefined);

function isTokenOnlyPrompt(p: string): boolean {
  const t = String(p ?? "").trim();
  if (!t) return true;
  const body = t
    .replace(/(?:^|\s)--(?:cref|sref)\s+\S+(?:\s+[A-Za-z]+-[A-Za-z0-9]+)*/gi, " ")
    .replace(/(?:^|\s)--ar\s+\S+/gi, " ")
    .replace(/\s+/g, "")
    .trim();
  return body.length < 8;
}

function looksDirtyPrompt(p: string): boolean {
  const t = String(p ?? "");
  if (isTokenOnlyPrompt(t)) return true;
  if (/vertical\s*9:16\s*safe\s*area/i.test(t) && !/[\u4e00-\u9fff]{4,}/.test(t)) return true;
  if ((t.match(/--cref/gi) ?? []).length >= 2) return true;
  if (/\bMS\b/.test(t)) return true;
  return false;
}

const emit = defineEmits(["keep"]);
const { removeNodes } = useVueFlow("editImage");

const options = [
  { content: $t("workbench.production.editImage.uploadImage"), value: 1 },
  { content: $t("workbench.production.editImage.uploadStoryboardImage"), value: 2 },
  { content: $t("workbench.production.generatedNode.localUpload"), value: 3 },
];

const references = computed(() => {
  return props.data.references.map((i) => ({ type: "image" as const, src: i.image })).filter(Boolean);
});

const props = defineProps<{
  id: string;
  data: GeneratedNodeData;
  projectId: number;
}>();

function selectedFn() {
  selected.value = !selected.value;
}
function clickHandler(data: DropdownOption) {
  if (data.value == 1) {
    uploadFn();
  } else if (data.value == 2) {
    getStoryboardImage();
  } else if (data.value == 3) {
    lensImage();
  }
}
async function lensImage() {
  const files = await new Promise<FileList | null>((resolve) => {
    open();
    onChange((f) => resolve(f));
    onCancel(() => resolve(null));
  });

  if (!files?.length) return;

  const file = files[0];
  //转成base64显示
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result as string;
    try {
      const { data } = await axios.post("/production/editImage/uploadImage", {
        base64Data: base64,
        projectId: props.projectId,
        scriptId: episodesId.value,
      });
      props.data.generatedImage = data;
    } catch (e) {
      return window.$message.error((e as any)?.message || $t("workbench.production.editImage.uploadFailed"));
    }
  };
  reader.readAsDataURL(file);
  // mockStoryboard.value.id = -1; // 新上传的图片没有id，使用-1标识，后端根据filePath处理这种情况
}
async function uploadFn() {
  const selectedAssets = await openAssetsSelector({
    multiple: false,
    title: $t("workbench.production.editImage.selectImage"),
  });
  if (selectedAssets.length > 0) {
    const filePath = selectedAssets[0].src!;
    props.data.generatedImage = filePath;
  }
}
async function getStoryboardImage() {
  const rows = await openStoryboardCheck();
  if (rows.length > 0) {
    const filePath = rows[0].src!;
    props.data.generatedImage = filePath;
  }
}
function resolveStoryboardId(): number | undefined {
  const sid = typeof storyboardId === "object" && storyboardId && "value" in storyboardId ? storyboardId.value : storyboardId;
  return sid as number | undefined;
}

function ingestStillGateBody(body: Record<string, unknown> | null | undefined) {
  if (!body) return;
  stillQuality.value = (body.stillQuality as string) ?? null;
  sheetLeak.value = Boolean(body.sheetLeak);
  gateMessage.value = String(body.userMessage || (body.stillQuality === "hq_ok" ? "已标记高质量首帧" : ""));
  litDebtSlots.value = Array.isArray(body.missingSlots) ? body.missingSlots.map(String) : [];
  irdPrimaryAction.value = (body.irdPrimaryAction as string) ?? null;
  primaryNextStep.value = (body.primaryNextStep as string) ?? null;
  debtCtaLabel.value = (body.ctaLabel as string) ?? null;
  presentationFork.value = Array.isArray(body.presentationFork)
    ? (body.presentationFork as { fork: string; label: string }[])
    : null;
  const step = String(body.primaryNextStep ?? "");
  const ird = String(body.irdPrimaryAction ?? "");
  // Shootable-first: never force blockSilentRegen on split — only missing_identity bricks Generate
  stillMetaSnapshot.value = {
    stillQuality: body.stillQuality as StillMeta["stillQuality"],
    visualPass: body.visualPass as boolean | undefined,
    sheetLeak: body.sheetLeak as boolean | undefined,
    pendingHumanRejudge: body.pendingHumanRejudge as boolean | undefined,
    primaryNextStep: body.primaryNextStep as string | undefined,
    irdPrimaryAction: body.irdPrimaryAction as string | undefined,
    missingSlots: litDebtSlots.value,
    blockSilentRegen: Boolean(body.blockSilentRegen) && String(body.debtKind ?? "") === "missing_identity",
    refreshStoryboardBeforeRegen: Boolean(body.refreshStoryboardBeforeRegen) || step === "split_shot" || ird === "confirm_split",
    autoRepairStage: body.autoRepairStage as string | undefined,
    autoRepairRound: body.autoRepairRound as number | undefined,
    keepSoftEnvRef: body.keepSoftEnvRef as boolean | undefined,
    bgMode: body.bgMode as StillMeta["bgMode"],
    vlmError: body.vlmError as string | undefined,
    keyOptional: body.keyOptional as boolean | undefined,
    pixelDimStatus: body.pixelDimStatus as StillMeta["pixelDimStatus"],
    ctaLabel: body.ctaLabel as string | undefined,
    userMessage: body.userMessage as string | undefined,
    i2vReady: body.i2vReady as boolean | undefined,
    debtKind: body.debtKind as string | undefined,
    deliveryTier: body.deliveryTier as StillMeta["deliveryTier"],
    requireFixBeforeBurn: body.requireFixBeforeBurn as boolean | undefined,
    ctaKind: body.ctaKind as string | undefined,
    propPlateGrade: body.propPlateGrade as string | undefined,
  };
}

async function loadComposePreview(opts?: {
  autoApply?: boolean;
  mode?: "full" | "refine" | "fidelity";
  persist?: boolean;
}) {
  previewing.value = true;
  gateMessage.value = "";
  const mode = opts?.mode ?? (looksDirtyPrompt(props.data.prompt ?? "") ? "full" : "refine");
  lastComposeMode.value = mode;
  try {
    const refs = props.data.references.map((i) => i.image).filter(Boolean) as string[];
    const { data } = await axios.post("/production/editImage/composeStillPromptPreview", {
      projectId: props.projectId,
      storyboardId: resolveStoryboardId(),
      prompt: props.data.prompt ?? "",
      qualityMode: "hq_update",
      composeMode: mode,
      persist: Boolean(opts?.persist && resolveStoryboardId()),
      ratio: project.value?.videoRatio ?? props.data.ratio,
      references: refs,
      referenceUrlCount: refs.length,
    });
    const body = data?.data ?? data;
    composePreview.value = body;
    if (!body?.ok) {
      gateMessage.value = body?.userMessage || body?.blockReason || "缺少可拍画面锚点";
    } else if (body.didSynthesize || body.scrubbed) {
      const modeLabel = mode === "fidelity" ? "更贴描述" : mode === "refine" ? "保留改写加强" : "按设计全量合成";
      gateMessage.value = `${modeLabel}完成，可生成高质量首帧`;
      if (opts?.autoApply && body.prompt) {
        props.data.prompt = body.prompt;
        promptUsedSummary.value = String(body.prompt).slice(0, 160) + (String(body.prompt).length > 160 ? "…" : "");
      }
    } else {
      gateMessage.value = "提示词可生成高质量首帧";
      if (opts?.autoApply && body.prompt) {
        props.data.prompt = body.prompt;
      }
    }
  } catch (e: any) {
    gateMessage.value = e?.response?.data?.data?.userMessage || e?.message || "预览失败";
  } finally {
    previewing.value = false;
  }
}

function applyComposePreview() {
  if (composePreview.value?.prompt) {
    props.data.prompt = composePreview.value.prompt;
    gateMessage.value = "已填入设计合成稿，点击生成";
  }
}

// 生成
async function handleGenerate(overridePrompt?: unknown) {
  if (!props.data.model) return window.$message.error($t("workbench.production.editImage.selectModel"));
  if (!props.data.quality) return window.$message.error($t("workbench.production.editImage.selectQuality"));
  props.data.ratio = project.value?.videoRatio ?? props.data.ratio ?? "16:9";
  if (!props.data.ratio) return window.$message.error($t("workbench.production.editImage.selectRatio"));
  let promptText = resolveGeneratePrompt(overridePrompt, props.data.prompt);
  const sid = resolveStoryboardId();
  // Allow empty / token-only when storyboard linked — auto compose then generate
  if (!promptText.trim() && !sid) {
    return window.$message.error($t("workbench.production.editImage.promptPlaceholder"));
  }
  if (sid && (isTokenOnlyPrompt(promptText) || looksDirtyPrompt(promptText))) {
    await loadComposePreview({ autoApply: true, mode: "full", persist: true });
    if (composePreview.value?.ok && composePreview.value.prompt) {
      promptText = composePreview.value.prompt;
    }
  }
  // Shootable-first: never brick Generate; identity soft-info only
  if (String(stillMetaSnapshot.value?.debtKind ?? "") === "missing_identity") {
    window.$message.info(
      gateMessage.value ||
        debtCtaLabel.value ||
        "缺定妆 — 将入队补资产并继续生成（不挡试拍）",
    );
  }
  generating.value = true;
  lastFeedback.value = null;
  gateMessage.value = "";
  promptUsedSummary.value = "";
  try {
    const refs = props.data.references.map((i) => i.image).filter(Boolean) as string[];
    const imageMode = refs.length <= 0 ? "text" : refs.length === 1 ? "singleImage" : "multiReference";
    const { data } = await axios.post("/production/editImage/generateFlowImage", {
      references: refs,
      model: props.data.model,
      quality: props.data.quality,
      ratio: project.value?.videoRatio ?? props.data.ratio,
      prompt: promptText,
      projectId: props.projectId,
      storyboardId: sid,
      mode: imageMode,
      requireParentRef: imageMode === "singleImage" && !sid,
      qualityMode: "hq_update",
      persistToStoryboard: Boolean(sid),
      composeMode: lastComposeMode.value,
    });
    const body = data?.data ?? data;
    props.data.generatedImage = body.url ?? body;
    if (body.promptUsed) {
      props.data.prompt = body.promptUsed;
      promptUsedSummary.value =
        (body.didSynthesize ? "【已智能合成】" : "") +
        String(body.promptUsed).slice(0, 180) +
        (String(body.promptUsed).length > 180 ? "…" : "");
    }
    ingestStillGateBody(body);
    if (body.feedback) lastFeedback.value = body.feedback;
  } catch (e: any) {
    const payload = e?.response?.data?.data ?? e?.data ?? {};
    const fb = payload.feedback;
    if (fb?.suggestedPrompt) lastFeedback.value = fb;
    const code = payload.code ? `[${payload.code}] ` : "";
    const cta = payload.ctaLabel ? ` → ${payload.ctaLabel}` : "";
    gateMessage.value = code + (payload.userMessage || e?.message || $t("workbench.production.editImage.generateFailed")) + cta;
    ingestStillGateBody(payload);
    return window.$message.error(gateMessage.value);
  } finally {
    generating.value = false;
  }
}

function focusPromptForHandEdit() {
  window.$message.info(debtCtaLabel.value || "请在上方描写区手改画面落点后重生成");
  selected.value = true;
}

async function applyLitEnhance() {
  const pid = project.value?.id;
  if (pid == null) {
    window.$message?.warning?.("缺少项目 ID，请先手改描写");
    return focusPromptForHandEdit();
  }
  try {
    const data = await axios.post("/scriptAgent/stillIntentOps", {
      projectId: pid,
      action: "applyEnhance",
      forceApply: true,
      intentVisualEnhance: true,
      literaryDetailLlmFill: true,
      scriptId: episodesId.value,
      shotIndex: typeof props.data?.shotIndex === "number" ? props.data.shotIndex : undefined,
    });
    const body = data?.data ?? data;
    if (body?.ok) {
      toastAfterApplyExitGate(body, body.a11yAnnounce || "已应用文学增强；请重出静照");
      selected.value = true;
    } else {
      window.$message?.warning?.(
        (body?.refused || []).join("; ") || body?.a11yAnnounce || "增强未全部通过，请手改 VD",
      );
      focusPromptForHandEdit();
    }
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.message || e?.message || "applyEnhance 失败");
    focusPromptForHandEdit();
  }
}

async function applyLitSplit() {
  const pid = project.value?.id;
  if (pid == null) {
    window.$message?.warning?.("缺少项目 ID");
    return;
  }
  try {
    const data = await axios.post("/scriptAgent/stillIntentOps", {
      projectId: pid,
      action: "apply",
      forceApply: true,
      scriptId: episodesId.value,
    });
    const body = data?.data ?? data;
    toastAfterApplyExitGate(body, body?.a11yAnnounce || "拆镜补丁已应用");
    if (body?.designExitPass === false || body?.exitGate?.ok === false) {
      primaryNextStep.value = "split_shot";
    }
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.message || e?.message || "stillIntentOps apply 失败");
  }
}

async function onPresentationFork(fork: string) {
  if (fork === "fork-A") {
    focusPromptForHandEdit();
    return;
  }
  await applyLitSplit();
}

async function applyHumanRejudge() {
  const sid = resolveStoryboardId();
  if (!sid) {
    window.$message?.warning?.("须绑定分镜后再人审");
    return;
  }
  try {
    const data = await axios.post("/production/storyboard/humanRejudgeFidelity", {
      storyboardId: sid,
      modality: "still",
      description: props.data.prompt,
      items: [{ id: "human_delivery", pass: true, evidence: "operator_rejudge" }],
    });
    const body = data?.data ?? data;
    if (body?.burnReady === false || body?.designDebtBlock) {
      window.$message?.warning?.(
        body?.userMessage || "设计债未清，人审不可标可燃片；请先 IRD/手改",
      );
      ingestStillGateBody(body);
      return;
    }
    window.$message?.success?.(body?.userMessage || "人审通过（未测·非失败）");
    ingestStillGateBody({ ...body, stillQuality: body?.stillQuality ?? "hq_ok", pendingHumanRejudge: false });
  } catch (e: any) {
    window.$message?.error?.(e?.response?.data?.message || e?.message || "人审失败");
  }
}

async function retryWithSuggestion() {
  if (!lastFeedback.value?.suggestedPrompt) return;
  props.data.prompt = lastFeedback.value.suggestedPrompt;
  await handleGenerate(lastFeedback.value.suggestedPrompt);
}

function handleKeep() {
  if (!props.data.generatedImage) return window.$message.error($t("workbench.production.editImage.generateFirst"));
  emit("keep", props.data.generatedImage);
}
onMounted(() => {
  props.data.model = project.value?.imageModel ?? "";
  props.data.quality = project.value?.imageQuality ?? "";
  props.data.ratio = project.value?.videoRatio ?? "16:9";
  const sid = resolveStoryboardId();
  // 默认文学稿：有分镜则静默 compose 写回并展示（empty/dirty/stale 走 full）
  if (sid) {
    const mode = looksDirtyPrompt(props.data.prompt ?? "") ? "full" : "refine";
    void loadComposePreview({ autoApply: true, mode, persist: true });
  }
});
</script>

<style lang="scss" scoped>
.promptSummary {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: #666;
  word-break: break-all;
  max-height: 72px;
  overflow: auto;
}
.generatedNode {
  position: relative;
  width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;

  .data {
    width: 100%;
    cursor: pointer;

    .title {
      height: 30px;
      padding: 5px;

      .titleText {
        margin-left: 5px;
        color: var(--td-text-color-secondary);
      }
    }

    .image {
      height: 320px;
      width: 100%;
      position: relative;
      .remove {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 9999;
        padding: 5px;
        border-radius: 10px;
        background-color: rgba(220, 50, 50, 0.7);
        cursor: pointer;
        &:hover {
          background-color: rgba(220, 50, 50, 1);
        }
      }
      .upload {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 9999;
        padding: 5px 10px;
        border-radius: 10px;
        background-color: rgba(0, 0, 0, 0.5);
      }
      .imageLoading {
        width: 100%;
        height: 100%;
        background-color: var(--td-bg-color-component);
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;

        .loadingSpinner {
          width: 36px;
          height: 36px;
          border: 3px solid #d0d0d0;
          border-top-color: #5bccb3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loadingText {
          font-size: 14px;
          color: var(--td-text-color-secondary);
        }
      }

      .imageWrapper {
        position: relative;
        width: 100%;
        height: 100%;

        :deep(.nodeImage) {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          border: 3px solid transparent;
          box-sizing: border-box;

          &.selected {
            border-color: var(--td-text-color-primary);
          }
        }
      }
      .imageToolsWrap {
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }

      &:hover {
        .imageToolsWrap {
          opacity: 1;
          pointer-events: auto;
        }
      }
    }
  }

  .parameter {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 10px;
    width: 500px;
    border: 1px solid var(--td-border-level-2-color);
    background-color: var(--td-bg-color-container);
    border-radius: 10px;
    z-index: 9999;

    .feedbackBox {
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .imageRefs {
      overflow: auto;
      padding: 10px;
      .refThumb {
        margin-left: 8px;
        .refImg {
          width: 45px;
          height: 45px;
          border-radius: 10px;
        }
      }
    }

    .text {
      height: 200px;
      min-height: 100px;
      max-height: 500px;
      display: flex;
      position: relative;
      overflow: auto;
      resize: vertical;
    }

    .operate {
      padding: 10px;
      height: 50px;

      .paramSelect {
        min-width: 100px;
        width: 100px;
      }

      .ml-5 {
        margin-left: 5px;
      }

      .generateBtn {
        margin-left: auto;
        --td-brand-color: #5bccb3;
        --td-brand-color-hover: #4ab8a0;
      }
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
