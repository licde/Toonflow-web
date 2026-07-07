import { MessagePlugin } from "tdesign-vue-next";
import type { I18n } from "vue-i18n";

declare global {
  interface Window {
    $message: typeof MessagePlugin;
    $port: string;
    $t: I18n["global"]["t"];
  }
}

export function initGlobal(i18n: I18n) {
  window.$message = MessagePlugin;
  window.$t = i18n.global.t;
}
