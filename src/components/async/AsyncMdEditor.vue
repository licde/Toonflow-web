<template>
  <component :is="Editor" v-if="Editor" v-bind="$attrs" />
  <div v-else class="async-md-editor-loading">
    <t-loading :loading="true" size="small" />
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";

defineOptions({ inheritAttrs: false });

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const { MdEditor } = await import("md-editor-v3");
  Editor.value = MdEditor;
});
</script>

<style scoped>
.async-md-editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}
</style>
