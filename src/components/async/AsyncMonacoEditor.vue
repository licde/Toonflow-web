<template>
  <component :is="CodeEditor" v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData ?? {}" />
    </template>
  </component>
</template>

<script setup lang="ts">
const CodeEditor = defineAsyncComponent({
  loader: () => import("monaco-editor-vue3").then((m) => m.CodeEditor),
  delay: 120,
  timeout: 60000,
});
</script>
