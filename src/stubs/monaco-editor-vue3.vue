<template>
  <textarea class="monaco-stub" :value="value" @input="onInput" />
</template>

<script setup lang="ts">
defineProps<{ value?: string }>();
const emit = defineEmits<{ (e: "update:value", value: string): void }>();

function onInput(event: Event) {
  emit("update:value", (event.target as HTMLTextAreaElement).value);
}
</script>
