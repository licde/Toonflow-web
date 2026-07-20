<template>
  <div class="rulePanel" v-if="visible">
    <div class="rulePanelHeader f ac">
      <span class="title">{{ $t("workbench.production.rulePanel.title") }}</span>
      <t-tag v-if="summary" :theme="summary.blocked ? 'danger' : 'success'" size="small">
        {{ summary.blocked ? `BLOCK ${summary.blocks}` : "PASS" }}
      </t-tag>
      <t-button size="small" variant="text" :loading="loading" @click="runValidate">{{ $t("workbench.production.rulePanel.refresh") }}</t-button>
    </div>
    <div v-if="displayIssues.length" class="issues">
      <div
        v-for="(issue, idx) in displayIssues"
        :key="idx"
        class="issue f ac"
        :class="issue.severity.toLowerCase()"
        @click="emit('jump', issue.fieldPath || '')">
        <t-tag :theme="issue.severity === 'BLOCK' ? 'danger' : 'warning'" size="small">{{ issue.ruleId }}</t-tag>
        <span class="msg">{{ issue.message }}</span>
        <t-button v-if="issue.autoFix" size="small" variant="text" @click.stop="emit('autofix', issue)">{{ $t("workbench.production.rulePanel.autofix") }}</t-button>
        <t-button v-if="issue.suggestedPrompt" size="small" variant="outline" @click.stop="emit('retry', issue)">重试</t-button>
      </div>
    </div>
    <t-empty v-else-if="!loading" size="small" :description="$t('workbench.production.rulePanel.empty')" />
    <div v-if="preflight?.rePushPlan?.length" class="repush">
      <div v-for="(p, i) in preflight.rePushPlan" :key="i" class="issue f ac">
        <span class="msg">{{ p.trigger }} → {{ p.reverseTarget }}</span>
        <t-button size="small" variant="outline" @click="emit('rePush', p)">回推</t-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ValidationIssue, ValidationReport } from "@/types/ruleEngine";
import { validateEpisode, preflightProduction } from "@/utils/ruleEngine";

const props = defineProps<{
  projectId: number;
  scriptId?: number;
  script?: string;
  scriptPlan?: string;
  storyboardTable?: string;
  storyboard?: unknown[];
  visible?: boolean;
}>();

const emit = defineEmits<{
  jump: [fieldPath: string];
  autofix: [issue: ValidationIssue];
  report: [report: ValidationReport];
  retry: [issue: ValidationIssue & { suggestedPrompt?: string }];
  preflight: [result: Awaited<ReturnType<typeof preflightProduction>>];
  rePush: [item: import("@/types/closure").RePushPlanItem];
}>();

const report = ref<ValidationReport | null>(null);
const preflight = ref<Awaited<ReturnType<typeof preflightProduction>> | null>(null);
const loading = ref(false);

const summary = computed(() => {
  if (preflight.value) {
    return { blocked: preflight.value.blocked || preflight.value.blockGenerate, blocks: preflight.value.gapSummary?.blocks ?? 0 };
  }
  if (report.value) return { blocked: !report.value.passed, blocks: report.value.blockCount };
  return null;
});

const displayIssues = computed(() => {
  const fromPreflight =
    preflight.value?.detectionResults
      ?.filter((r) => !r.passed && r.severity !== "INFO")
      .map((r) => ({
        ruleId: r.id,
        severity: r.severity as ValidationIssue["severity"],
        message: r.message || r.description,
        fieldPath: r.fieldPaths?.[0] ?? "",
        autoFix: false,
        suggestedPrompt: undefined as string | undefined,
      })) ?? [];
  const fromValidate = report.value?.issues.filter((i) => i.severity !== "INFO") ?? [];
  return [...fromPreflight, ...fromValidate];
});

async function runValidate() {
  if (!props.scriptId) return;
  loading.value = true;
  try {
    const [v, p] = await Promise.all([
      validateEpisode({
        projectId: props.projectId,
        scriptId: props.scriptId,
        script: props.script,
        scriptPlan: props.scriptPlan,
        storyboardTable: props.storyboardTable,
        storyboard: props.storyboard,
      }),
      preflightProduction({ projectId: props.projectId, scriptId: props.scriptId, tier: "T3" }).catch(() => null),
    ]);
    report.value = v;
    preflight.value = p;
    if (report.value) emit("report", report.value);
    if (preflight.value) emit("preflight", preflight.value);
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.scriptId, props.storyboardTable],
  () => {
    if (props.visible && props.scriptId) runValidate();
  },
  { immediate: true },
);

defineExpose({ runValidate, report, preflight });
</script>

<style scoped lang="scss">
.rulePanel {
  margin-top: 8px;
  padding: 8px;
  border: 1px solid var(--td-component-border);
  border-radius: var(--td-radius-default);
  max-height: 280px;
  overflow-y: auto;
}
.rulePanelHeader {
  gap: 8px;
  margin-bottom: 6px;
  .title {
    font-weight: 600;
    font-size: 12px;
  }
}
.issue {
  gap: 6px;
  padding: 4px 0;
  cursor: pointer;
  font-size: 12px;
  .msg {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
