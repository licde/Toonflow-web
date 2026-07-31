<template>
  <t-dialog
    v-model:visible="visible"
    :header="$t('workbench.production.importScriptBundle.title')"
    :width="760"
    :confirm-btn="$t('workbench.production.importScriptBundle.confirm')"
    :cancel-btn="$t('workbench.production.cancel')"
    :confirm-loading="loading"
    :close-on-overlay-click="true"
    :close-on-esc-keydown="true"
    destroy-on-close
    @confirm="onConfirm"
    @cancel="onCancel"
    @close="onClose">
    <div class="importScriptBundle">
      <p class="hint">{{ $t("workbench.production.importScriptBundle.hint") }}</p>
      <t-textarea
        v-model="jsonText"
        :placeholder="$t('workbench.production.importScriptBundle.placeholder')"
        :autosize="{ minRows: 12, maxRows: 20 }" />
      <div class="actions f ac">
        <t-upload :auto-upload="false" accept=".json,application/json" :show-upload-list="false" @change="onFileChange">
          <t-button size="small" variant="outline">{{ $t("workbench.production.importScriptBundle.upload") }}</t-button>
        </t-upload>
        <t-checkbox v-model="autoDesign">{{ $t("workbench.production.importScriptBundle.autoDesign") }}</t-checkbox>
        <t-radio-group v-model="mergeStrategy" variant="default-filled" size="small">
          <t-radio-button value="preserveMedia">保留已生成图</t-radio-button>
          <t-radio-button value="mergeLayers">分层合并</t-radio-button>
          <t-radio-button value="replaceAll">全量替换</t-radio-button>
        </t-radio-group>
        <t-button size="small" variant="text" :loading="previewLoading" @click="onDryRun">
          预览更新
        </t-button>
        <t-button
          v-if="closurePreview"
          size="small"
          theme="primary"
          variant="outline"
          :loading="healLoading"
          title="仅声明型：空镜 F0 / 孤儿场降 F0 / 口型抬时长 / 投影已有 visualEffect；不编造特效、不改情节、不拆 sceneName"
          @click="onOneClickHeal">
          一键完善（仅声明型）
        </t-button>
      </div>
      <p class="hint subtle">
        一键完善只做声明型：F0 / 孤儿降级 / 口型；结构与叙事须贴「复制闭环修复清单」。启发式自动设计不产生 FX/NAR 完整字段；有 preDesignPack.shots 时会跳过。全量替换会删除本集已生成分镜图。
      </p>
      <t-alert v-if="previewSummary" :theme="exportAllowed ? 'success' : 'warning'" :close="false" class="preview">
        <template #message>
          <div class="preview-row">
            <div>
              <div v-if="exportAllowed != null">{{ exportAllowed ? "可导入" : "阻断 — 请先完善" }}</div>
              <div v-if="blockIdsBanner" class="block-ids">{{ blockIdsBanner }}</div>
              <div v-if="primaryBlockHint" class="primary-hint">{{ primaryBlockHint }}</div>
              <div v-if="salvageBanner">{{ salvageBanner }}</div>
              <div v-if="previewSummary.willCreateScript">{{ $t("workbench.production.importScriptBundle.willCreate") }}</div>
              <div v-if="previewSummary.willOverwriteLayers?.length">
                {{ $t("workbench.production.importScriptBundle.willOverwrite") }}:
                {{ previewSummary.willOverwriteLayers.join(", ") }}
              </div>
              <div>{{ $t("workbench.production.importScriptBundle.storyboardCount") }}: {{ previewSummary.storyboardCount }}</div>
              <div>合并策略: {{ previewSummary.mergeStrategy || mergeStrategy }}</div>
            </div>
            <t-button
              v-if="exportAllowed === false && chatRepairText"
              size="small"
              theme="danger"
              variant="outline"
              @click="onCopyAllChat(chatRepairText)">
              复制闭环修复清单
            </t-button>
          </div>
        </template>
      </t-alert>
      <ClosureRulePanel
        v-if="closurePreview"
        :result="closurePreview"
        :shape-salvage-log="shapeSalvageLog"
        :server-fixed-ids="serverFixedIds"
        :chat-must-fix-ids="chatMustFixIds"
        :export-allowed="exportAllowed ?? undefined"
        :chat-repair-text="chatRepairText"
        :user-message="healPrimary?.userMessage"
        :cta-label="healPrimary?.ctaLabel"
        :primary-next-step="healPrimary?.primaryNextStep"
        :heal-log="healLog"
        :smart-design-proposals="smartDesignProposals"
        class="closurePreview"
        @re-push="onRePush"
        @copy-chat="onCopyChat"
        @copy-all-chat="onCopyAllChat"
        @confirm-smart-proposal="onConfirmSmartProposal"
        @reject-smart-proposal="onRejectSmartProposal"
        @apply-smart-proposals="onApplySmartProposals"
        @presentation-fork="onPresentationFork" />
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { UploadFile } from "tdesign-vue-next";
import productionAgentStore from "@/stores/productionAgent";
import { dryRunImport, importHeal, importScriptBundle } from "@/utils/ruleEngine";
import type { DryRunImportSummary } from "@/types/ruleEngine";
import type { InspectBundleResult, RePushPlanItem, SmartDesignProposal } from "@/types/closure";
import ClosureRulePanel from "@/components/closure/RulePanel.vue";
import { useAdaptationNav } from "@/composables/useAdaptationNav";
import axios from "@/utils/axios";
import { toastAfterApplyExitGate } from "@/utils/v5OpsHelpers";

const { goDesignStage } = useAdaptationNav();

function onRePush(item: RePushPlanItem) {
  window.$message.info("回推仅跳转设计台，未修改当前导入数据");
  goDesignStage(item.reverseTarget, item.trigger);
}
const props = defineProps<{
  projectId: number;
  scriptId?: number;
}>();

const emit = defineEmits<{
  imported: [scriptId: number];
}>();

const visible = defineModel<boolean>("visible", { default: false });
const jsonText = ref("");
const autoDesign = ref(true);
const mergeStrategy = ref<"preserveMedia" | "mergeLayers" | "replaceAll">("preserveMedia");
const loading = ref(false);
const previewLoading = ref(false);
const healLoading = ref(false);
const previewSummary = ref<DryRunImportSummary | null>(null);
const closurePreview = ref<InspectBundleResult | null>(null);
const lastBundle = ref<unknown>(null);
const shapeSalvageLog = ref<{ ruleId: string; path: string; action: string }[]>([]);
const serverFixedIds = ref<string[]>([]);
const chatMustFixIds = ref<string[]>([]);
const exportAllowed = ref<boolean | null>(null);
const chatRepairText = ref("");
const smartDesignProposals = ref<SmartDesignProposal[]>([]);
const smartProposalLoading = ref(false);

const salvageBanner = computed(() => {
  const log = shapeSalvageLog.value;
  if (!log.length) return "";
  const ve = log.filter((e) => e.ruleId === "SH-VISUAL-EFFECT-OBJ").length;
  if (ve) return `已自动修复 ${ve} 处 visualEffect 对象→字符串`;
  return `已自动修复 ${log.length} 处形态问题`;
});

const blockIdsBanner = computed(() => {
  const ids = chatMustFixIds.value.filter(Boolean);
  if (!ids.length) return "";
  const head = ids.slice(0, 10).join(", ");
  return `规则：${head}${ids.length > 10 ? "…" : ""}`;
});

const healPrimary = ref<{ userMessage?: string; ctaLabel?: string; primaryNextStep?: string } | null>(null);
const healLog = ref<{ at: string; ruleId: string; action: string; detail?: string }[]>([]);

const primaryBlockHint = computed(() => {
  if (healPrimary.value?.userMessage) {
    return `${healPrimary.value.userMessage}${healPrimary.value.ctaLabel ? ` → ${healPrimary.value.ctaLabel}` : ""}`;
  }
  const text = chatRepairText.value;
  const m = text.match(/【孤儿场】[^\n]+|【场镜基数】[^\n]+|【幽灵场】[^\n]+/);
  if (m) return `主因：${m[0].slice(0, 120)}`;
  const first = chatMustFixIds.value[0];
  return first ? `主因规则：${first}` : "";
});

function onCopyChat(text: string) {
  void navigator.clipboard?.writeText(text);
  window.$message.success("已复制修复话术");
}

function onCopyAllChat(text: string) {
  void navigator.clipboard?.writeText(text);
  window.$message.success("已复制闭环修复清单");
}

function parseBundle(text: string): unknown {
  const raw = JSON.parse(text) as Record<string, unknown>;
  if (!raw || typeof raw !== "object") throw new Error("invalid json");
  return raw;
}

function onFileChange(files: UploadFile[]) {
  const file = files[0]?.raw;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    jsonText.value = String(reader.result ?? "");
    previewSummary.value = null;
  };
  reader.readAsText(file);
}

function resetState() {
  jsonText.value = "";
  previewSummary.value = null;
  closurePreview.value = null;
  lastBundle.value = null;
  shapeSalvageLog.value = [];
  serverFixedIds.value = [];
  chatMustFixIds.value = [];
  exportAllowed.value = null;
  chatRepairText.value = "";
  smartDesignProposals.value = [];
  autoDesign.value = true;
  mergeStrategy.value = "preserveMedia";
}

function onClose() {
  resetState();
}

function onCancel() {
  visible.value = false;
  resetState();
}

async function onDryRun() {
  if (!jsonText.value.trim()) {
    window.$message.warning($t("workbench.production.importScriptBundle.empty"));
    return;
  }
  previewLoading.value = true;
  try {
    const bundle = parseBundle(jsonText.value);
    lastBundle.value = bundle;
    const summary = await dryRunImport({
      projectId: props.projectId,
      bundle,
      targetScriptId: props.scriptId,
      mergeStrategy: mergeStrategy.value,
    });
    previewSummary.value = summary;
    closurePreview.value = summary.preImport ?? null;
    smartDesignProposals.value =
      summary.preImport?.smartDesignProposals ??
      (summary as { smartDesignProposals?: SmartDesignProposal[] }).smartDesignProposals ??
      [];
    shapeSalvageLog.value = summary.shapeSalvageLog ?? summary.exportGate?.shapeSalvageLog ?? [];
    exportAllowed.value = summary.exportGate?.exportAllowed ?? !(summary.preImport?.blocked);
    chatRepairText.value = summary.exportGate?.chatRepairText ?? "";
    chatMustFixIds.value = summary.exportGate?.closureSnapshot?.blockIds ?? [];
    serverFixedIds.value = [...new Set(shapeSalvageLog.value.map((e) => e.ruleId))];
    if (summary.exportGate) {
      const { blocks = 0, warns = 0 } = summary.exportGate.coverage ?? {};
      const salvageN = shapeSalvageLog.value.length;
      window.$message.info(
        `预览更新完成 · ${summary.tier ?? summary.preImport?.tier ?? "T2"} · ${summary.exportGate.exportAllowed ? "可导入" : "阻断"} · ${
          (summary.exportGate.closureSnapshot?.blockIds ?? []).length
            ? `规则 ${(summary.exportGate.closureSnapshot?.blockIds ?? []).slice(0, 8).join(",")}`
            : `BLOCK ${blocks} / WARN ${warns}`
        }${salvageN ? ` · 已自动修复 ${salvageN}` : ""}`,
      );
    }
  } catch (e) {
    const err = e as Error & { response?: { data?: { data?: Record<string, unknown>; message?: string } }; data?: Record<string, unknown> };
    const details =
      (err.response?.data?.data as Record<string, unknown> | undefined) ??
      (err.data as Record<string, unknown> | undefined);
    const crt = typeof details?.chatRepairText === "string" ? details.chatRepairText : "";
    if (crt) {
      exportAllowed.value = false;
      chatRepairText.value = crt;
      if (Array.isArray(details?.blocks)) {
        chatMustFixIds.value = (details.blocks as { id?: string }[]).map((b) => String(b.id ?? "")).filter(Boolean);
      }
    }
    window.$message.error(err.response?.data?.message || err.message || $t("workbench.production.importScriptBundle.failed"));
  } finally {
    previewLoading.value = false;
  }
}

function syncSmartProposalsFromBody(body: { proposals?: SmartDesignProposal[] } | null | undefined) {
  if (Array.isArray(body?.proposals)) {
    smartDesignProposals.value = body.proposals;
    if (closurePreview.value) {
      closurePreview.value = { ...closurePreview.value, smartDesignProposals: body.proposals };
    }
  }
}

async function callSmartProposalOps(payload: {
  action: "confirm" | "reject" | "apply";
  proposalId?: string;
  fork?: string;
}) {
  smartProposalLoading.value = true;
  try {
    const data = await axios.post("/scriptAgent/smartProposalOps", {
      projectId: props.projectId,
      scriptId: props.scriptId,
      syncStoryboard: true,
      ...payload,
    });
    return (data as { data?: Record<string, unknown> })?.data ?? data;
  } finally {
    smartProposalLoading.value = false;
  }
}

async function onConfirmSmartProposal(payload: { proposalId: string; fork?: string }) {
  try {
    const body = await callSmartProposalOps({ action: "confirm", ...payload });
    syncSmartProposalsFromBody(body as { proposals?: SmartDesignProposal[] });
    window.$message.success("已确认提案路径；可 Apply 写库");
  } catch (e) {
    window.$message.error((e as Error)?.message || "Confirm 失败");
  }
}

async function onRejectSmartProposal(payload: { proposalId: string }) {
  try {
    const body = await callSmartProposalOps({ action: "reject", ...payload });
    syncSmartProposalsFromBody(body as { proposals?: SmartDesignProposal[] });
    window.$message.info("已拒绝提案");
  } catch (e) {
    window.$message.error((e as Error)?.message || "拒绝失败");
  }
}

async function onPresentationFork(payload: { proposalId: string; fork: string }) {
  await onConfirmSmartProposal(payload);
}

async function onApplySmartProposals() {
  try {
    const body = (await callSmartProposalOps({ action: "apply" })) as {
      proposals?: SmartDesignProposal[];
      note?: string;
      a11yAnnounce?: string;
      userMessage?: string;
      exitGate?: { ok?: boolean };
      exitReassert?: { ok?: boolean };
      designExitPass?: boolean;
    };
    syncSmartProposalsFromBody(body);
    toastAfterApplyExitGate(body, "提案已写库");
    if (lastBundle.value) await onDryRun();
  } catch (e) {
    window.$message.error((e as Error)?.message || "Apply 失败");
  }
}

async function onOneClickHeal() {
  if (!lastBundle.value) {
    window.$message.warning("请先预览变更");
    return;
  }
  healLoading.value = true;
  try {
    const healed = await importHeal({
      bundle: lastBundle.value,
      apply: true,
      projectId: props.projectId,
      scriptId: props.scriptId,
    });
    lastBundle.value = healed.bundle;
    jsonText.value = JSON.stringify(healed.bundle, null, 2);
    closurePreview.value = healed.inspected ?? null;
    shapeSalvageLog.value = healed.shapeSalvageLog ?? [];
    serverFixedIds.value = healed.serverFixedIds ?? [];
    chatMustFixIds.value = healed.chatMustFixIds ?? [];
    exportAllowed.value = healed.exportGate?.exportAllowed ?? null;
    chatRepairText.value = healed.exportGate?.chatRepairText ?? "";
    healPrimary.value = healed.primary ?? null;
    healLog.value = healed.healLog ?? [];
    const blocks = healed.exportGate?.coverage?.blocks ?? healed.exportGate?.blocks?.length ?? 0;
    const warns = healed.exportGate?.coverage?.warns ?? healed.exportGate?.warns?.length ?? 0;
    const fixedN = (healed.serverFixedIds ?? []).length;
    const remainIds = (healed.chatMustFixIds ?? []).slice(0, 8).join(",") || `BLOCK ${blocks}`;
    const human = healed.primary?.userMessage;
    if (fixedN > 0 || healed.precheckLoop?.ok) {
      window.$message.success(
        human
          ? `已自动完善 ${fixedN} 项 · ${human}`
          : `一键完善完成 · 服务端修复 ${fixedN} 项；仍剩 ${remainIds}${warns ? ` / WARN ${warns}` : ""}${chatMustFixIds.value.length ? "（结构/叙事请贴清单）" : ""}`,
      );
    } else {
      window.$message.warning(
        human ||
          healed.precheckLoop?.repairHint?.chatTemplate ||
          `无可自动修复；仍剩 ${remainIds}${warns ? ` / WARN ${warns}` : ""}（结构/叙事请贴清单）`,
      );
    }
  } catch (e) {
    window.$message.error((e as Error)?.message || "一键完善失败");
  } finally {
    healLoading.value = false;
  }
}

async function onConfirm() {
  if (!jsonText.value.trim()) {
    window.$message.warning($t("workbench.production.importScriptBundle.empty"));
    return;
  }
  if (mergeStrategy.value === "replaceAll") {
    const ok = window.confirm("全量替换将删除本集已生成分镜图与镜级资产绑定，确认继续？");
    if (!ok) return;
  }

  loading.value = true;
  try {
    const bundle = lastBundle.value ?? parseBundle(jsonText.value);
    const result = await importScriptBundle({
      projectId: props.projectId,
      bundle,
      targetScriptId: props.scriptId,
      autoDesign: autoDesign.value,
      mergeStrategy: mergeStrategy.value,
      importMode: props.scriptId ? "update" : "upsert",
      blockOnQualityGate: true,
    });

    const store = productionAgentStore();
    store.episodesId = result.scriptId;
    await store.getFlowData();

    const preserved = (result as { mergeReport?: { mediaPreservedCount?: number; assetDiagnostics?: { linked?: number; pruned?: number; weakPromptCount?: number; speakerSeeded?: number } } }).mergeReport?.mediaPreservedCount ?? 0;
    const assetDiagnostics = (result as { mergeReport?: { assetDiagnostics?: { linked?: number; pruned?: number; weakPromptCount?: number; speakerSeeded?: number } } }).mergeReport?.assetDiagnostics;
    const weakN = assetDiagnostics?.weakPromptCount ?? 0;
    const speakerN = assetDiagnostics?.speakerSeeded ?? 0;
    const weakHint = weakN || speakerN ? `；弱设定 ${weakN} / stub种子 ${speakerN}（默认跳过批量生图）` : "";
    window.$message.success(
      preserved > 0
        ? `${$t("workbench.production.importScriptBundle.success")}（保留 ${preserved} 张分镜图；资产 +${assetDiagnostics?.linked ?? 0} / 清理 ${assetDiagnostics?.pruned ?? 0}${weakHint}）`
        : `${$t("workbench.production.importScriptBundle.success")}（资产 +${assetDiagnostics?.linked ?? 0} / 清理 ${assetDiagnostics?.pruned ?? 0}${weakHint}）`,
    );
    visible.value = false;
    resetState();
    emit("imported", result.scriptId);
  } catch (e) {
    let message = (e as Error)?.message || $t("workbench.production.importScriptBundle.failed");
    try {
      const parsed = JSON.parse(message) as {
        code?: string;
        chatRepairText?: string;
        details?: { code?: string; hint?: string }[];
        data?: { chatRepairText?: string; code?: string };
      };
      const crt = parsed.chatRepairText ?? parsed.data?.chatRepairText;
      if (crt) {
        exportAllowed.value = false;
        chatRepairText.value = crt;
        void navigator.clipboard?.writeText(crt);
        window.$message.warning("导入被闸门阻断：已复制闭环修复清单到剪贴板");
        return;
      }
      if (parsed.code === "ASSET_CLOSURE_BLOCK" || parsed.data?.code === "ASSET_CLOSURE_BLOCK") {
        message = `资产闭环失败：${(parsed.details ?? []).map((d) => `${d.code} ${d.hint ?? ""}`.trim()).join("；")}`;
      }
    } catch {
      // keep original message
    }
    const err = e as Error & { response?: { data?: { data?: { chatRepairText?: string }; message?: string } } };
    const crt2 = err.response?.data?.data?.chatRepairText;
    if (crt2) {
      exportAllowed.value = false;
      chatRepairText.value = crt2;
      void navigator.clipboard?.writeText(crt2);
      window.$message.warning("导入被闸门阻断：已复制闭环修复清单到剪贴板");
      return;
    }
    window.$message.error(err.response?.data?.message || message);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.importScriptBundle {
  .hint {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--td-text-color-secondary);
  }
  .hint.subtle {
    margin-top: 8px;
    opacity: 0.85;
  }
  .actions {
    gap: 12px;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  .preview {
    margin-top: 12px;
  }
  .preview-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .block-ids {
    margin-top: 4px;
    font-size: 12px;
    color: var(--td-error-color);
    word-break: break-all;
  }
  .primary-hint {
    margin-top: 4px;
    font-size: 12px;
    color: var(--td-warning-color-7, #b54708);
    word-break: break-word;
  }
  .closurePreview {
    margin-top: 12px;
  }
}
</style>
