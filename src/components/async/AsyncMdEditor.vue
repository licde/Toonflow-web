<template>
  <component :is="MdEditor" v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData ?? {}" />
    </template>
  </component>
</template>

<script setup lang="ts">
const MdEditor = defineAsyncComponent({
  loader: () => import("md-editor-v3").then((m) => m.MdEditor),
  delay: 120,
  timeout: 60000,
});
</script>
