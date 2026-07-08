import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import App from "./App.vue";
import router from "./router";
import { setupI18n } from "./locales";
import { initGlobal } from "@/utils/global";

import "tdesign-vue-next/es/style/index.css";
import { LoadingDirective, LoadingPlugin } from "tdesign-vue-next";

import "./assets/main.scss";

import { imageOptimizer } from "@/utils/imageOptimizer";

async function bootstrap() {
  const i18n = await setupI18n();
  initGlobal(i18n);

  const app = createApp(App);
  const { registerIconPark } = await import("@/utils/registerIconPark");
  registerIconPark(app);
  app.use(imageOptimizer);
  app.use(createPinia().use(piniaPluginPersistedstate));
  app.use(router);
  app.use(i18n);
  app.use(LoadingPlugin);
  app.directive("loading", LoadingDirective);
  app.mount("#app");
}

bootstrap();
