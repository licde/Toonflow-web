import { defineComponent, h } from "vue";

const Box = defineComponent({
  name: "ChatStub",
  setup(_, { slots }) {
    return () => h("div", { class: "chat-stub" }, slots.default?.());
  },
});

export const ChatList = Box;
export const ChatMessage = Box;
export const ChatSender = Box;

export type ChatMessageStatus = string;
export type ChatMessagesData = Record<string, unknown>;
export type AIMessage = Record<string, unknown>;
export type UserMessage = Record<string, unknown>;
export type AIMessageContent = Record<string, unknown>;
