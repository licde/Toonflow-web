<template>
  <div class="pipelineGateBar f ac" v-if="stages.length">
    <div v-for="s in stages" :key="s.key" class="stage" :class="s.status">
      <span class="label">{{ s.label }}</span>
      <t-icon :name="iconMap[s.status]" size="14px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ValidationReport } from "@/types/ruleEngine";

const props = defineProps<{ report?: ValidationReport | null }>();

const STAGE_LABELS: Record<string, string> = {
  P0: "剧本",
  G: "规范",
  BP: "资产",
  GB: "节拍",
  SB: "分镜",
  EN: "编译",
  MD: "触达",
  P2: "后期",
};

const iconMap: Record<string, string> = {
  pass: "check-circle",
  warn: "error-circle",
  block: "close-circle",
  skip: "minus-circle",
};

const stages = computed(() => {
  if (!props.report?.stageStatus) return [];
  return Object.entries(props.report.stageStatus)
    .filter(([k]) => STAGE_LABELS[k])
    .map(([key, status]) => ({ key, label: STAGE_LABELS[key], status }));
});
</script>

<style scoped lang="scss">
.pipelineGateBar {
  gap: 8px;
  flex-wrap: wrap;
  padding: 6px 0;
  font-size: 11px;
}
.stage {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--td-bg-color-secondarycontainer);
  &.block {
    color: var(--td-error-color);
  }
  &.warn {
    color: var(--td-warning-color);
  }
  &.pass {
    color: var(--td-success-color);
  }
}
</style>
