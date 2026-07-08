import { defineComponent, h } from "vue";

export type ToolbarNames = string;

export const MdEditor = defineComponent({
  name: "MdEditorStub",
  props: { modelValue: String },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h("textarea", {
        value: props.modelValue,
        onInput: (e: Event) => emit("update:modelValue", (e.target as HTMLTextAreaElement).value),
      });
  },
});

export const MdPreview = defineComponent({
  name: "MdPreviewStub",
  props: { modelValue: String },
  setup(props) {
    return () => h("div", { class: "md-editor-stub" }, props.modelValue ?? "");
  },
});

export function config(_options: unknown) {}

export default { MdEditor, MdPreview, config };
