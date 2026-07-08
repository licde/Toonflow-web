<template>
  <component :is="MonacoEditor" v-if="MonacoEditor" v-bind="$attrs" />
  <div v-else class="async-monaco-loading">
    <t-loading :loading="true" size="small" />
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";

defineOptions({ inheritAttrs: false });

const MonacoEditor = shallowRef<Component | null>(null);

onMounted(async () => {
  const mod = await import("monaco-editor-vue3");
  MonacoEditor.value = mod.default;
});
</script>

<style scoped>
.async-monaco-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
</style>
