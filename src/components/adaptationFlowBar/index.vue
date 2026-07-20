<template>
  <t-alert theme="info" :close="false" class="adaptationFlowBar">
    <template #message>
      <div class="barInner f ac jb">
        <span class="hint">{{ hintText }}</span>
        <t-space size="small">
          <t-button v-if="showAdapt" size="small" theme="primary" @click="goAdaptation">
            {{ $t("workbench.adaptationFlow.startAdapt") }}
          </t-button>
          <t-button v-if="showOriginal" size="small" variant="outline" @click="goOriginal">
            {{ $t("workbench.adaptationFlow.originalScript") }}
          </t-button>
          <t-button size="small" variant="outline" @click="goExternalRevision">
            {{ $t("workbench.adaptationFlow.externalRevision") }}
          </t-button>
        </t-space>
      </div>
    </template>
  </t-alert>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAdaptationNav } from "@/composables/useAdaptationNav";
import projectStore from "@/stores/project";

const props = withDefaults(
  defineProps<{
    variant?: "novel" | "script" | "auto";
  }>(),
  { variant: "auto" },
);

const { project } = storeToRefs(projectStore());
const { goAdaptation, goOriginal, goExternalRevision } = useAdaptationNav();

const isNovel = computed(() => project.value?.projectType === "novel");

const showAdapt = computed(() => {
  if (props.variant === "script") return false;
  if (props.variant === "novel") return true;
  return isNovel.value;
});

const showOriginal = computed(() => true);

const hintText = computed(() => {
  if (props.variant === "script" || (!isNovel.value && props.variant === "auto")) {
    return $t("workbench.adaptationFlow.hintScript");
  }
  return $t("workbench.adaptationFlow.hintNovel");
});
</script>

<style scoped lang="scss">
.adaptationFlowBar {
  margin-bottom: 10px;
  .barInner {
    width: 100%;
    gap: 12px;
    flex-wrap: wrap;
  }
  .hint {
    font-size: 13px;
    color: var(--td-text-color-secondary);
  }
}
</style>
