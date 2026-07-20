<template>
  <div v-if="slots.length" class="identitySlotChips f ac">
    <t-tag v-for="s in slots" :key="s.code" size="small" :theme="themeOf(s.kind)" variant="light">
      {{ s.kind }} {{ s.code }}
    </t-tag>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  slots: { kind: string; code: string }[];
}>();

function themeOf(kind: string): "primary" | "success" | "warning" | "default" {
  if (kind === "CHAR") return "primary";
  if (kind === "SCENE") return "success";
  if (kind === "PROP") return "warning";
  return "default";
}
</script>

<style scoped lang="scss">
.identitySlotChips {
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
</style>
