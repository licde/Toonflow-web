<template>
  <div class="rulePanel" v-if="visible">
    <div class="rulePanelHeader f ac">
      <span class="title">{{ $t("workbench.production.rulePanel.title") }}</span>
      <t-tag v-if="report" :theme="report.passed ? 'success' : 'danger'" size="small">
        {{ report.passed ? "PASS" : `BLOCK ${report.blockCount}` }}
      </t-tag>
      <t-button size="small" variant="text" :loading="loading" @click="runValidate">{{ $t("workbench.production.rulePanel.refresh") }}</t-button>
    </div>
    <div v-if="report" class="issues">
      <div
        v-for="(issue, idx) in displayIssues"
        :key="idx"
        class="issue f ac"
        :class="issue.severity.toLowerCase()"
        @click="emit('jump', issue.fieldPath)">
        <t-tag :theme="issue.severity === 'BLOCK' ? 'danger' : 'warning'" size="small">{{ issue.ruleId }}</t-tag>
        <span class="msg">{{ issue.message }}</span>
        <t-button v-if="issue.autoFix" size="small" variant="text" @click.stop="emit('autofix', issue)">{{ $t("workbench.production.rulePanel.autofix") }}</t-button>
      </div>
      <t-empty v-if="!displayIssues.length" size="small" :description="$t('workbench.production.rulePanel.empty')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ValidationIssue, ValidationReport } from "@/types/ruleEngine";
import { validateEpisode } from "@/utils/ruleEngine";

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
}>();

const report = ref<ValidationReport | null>(null);
const loading = ref(false);

const displayIssues = computed(() => report.value?.issues.filter((i) => i.severity !== "INFO") ?? []);

async function runValidate() {
  if (!props.scriptId) return;
  loading.value = true;
  try {
    report.value = await validateEpisode({
      projectId: props.projectId,
      scriptId: props.scriptId,
      script: props.script,
      scriptPlan: props.scriptPlan,
      storyboardTable: props.storyboardTable,
      storyboard: props.storyboard,
    });
    if (report.value) emit("report", report.value);
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

defineExpose({ runValidate, report });
</script>

<style scoped lang="scss">
.rulePanel {
  margin-top: 8px;
  padding: 8px;
  border: 1px solid var(--td-component-border);
  border-radius: var(--td-radius-default);
  max-height: 200px;
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
