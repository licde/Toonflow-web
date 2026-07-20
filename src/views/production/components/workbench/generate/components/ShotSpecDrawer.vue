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
        一键自愈
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
            {{ healResult?.ctaLabel || "更新高质量分镜图" }}
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
          <p v-if="healResult?.nextStep === 'batch_still'" class="warn">
            资产行已就绪；一键自愈不代打厂商生图。请到资产页批量生静照后，再点「生成提示词」。
          </p>
          <t-button size="small" theme="primary" :loading="healing" @click="runHeal">补种 / 自愈关联</t-button>
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
}>();

const visible = ref(false);
const loading = ref(false);
const healing = ref(false);
const hqLoading = ref(false);
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
    (redBlocks.value.length > 0 ||
      (payload.value?.missingAssetImageQueue?.length ?? 0) > 0 ||
      (healResult.value?.nextQueue?.length ?? 0) > 0 ||
      healResult.value?.nextStep === "batch_still"),
);
const specJson = computed(() => JSON.stringify(payload.value?.spec ?? {}, null, 2));
const paramsJson = computed(() => JSON.stringify(payload.value?.params ?? {}, null, 2));
const healResultJson = computed(() => JSON.stringify(healResult.value ?? {}, null, 2));

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

// Auto-load gaps so「一键自愈」可点，无需先开设定对照
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

defineExpose({ refresh, open: () => refresh(true), runHeal });
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
.modeBlock {
  margin-bottom: 10px;
}
.modeBlock strong {
  font-size: 12px;
}
</style>
