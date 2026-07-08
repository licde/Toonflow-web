<template>
  <component :is="Preview" v-if="Preview" v-bind="$attrs" />
  <div v-else class="async-md-preview-loading">
    <t-loading :loading="true" size="small" />
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";

defineOptions({ inheritAttrs: false });

const Preview = shallowRef<Component | null>(null);

onMounted(async () => {
  const { MdPreview } = await import("md-editor-v3");
  Preview.value = MdPreview;
});
</script>

<style scoped>
.async-md-preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}
</style>
