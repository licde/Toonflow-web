<template>
  <div v-if="loading" class="app-loading">
    <t-loading :loading="true" size="large" text="加载中..." />
  </div>
  <template v-else>
    <titleBar v-if="isElectron" />
    <t-config-provider :global-config="globalConfig">
      <router-view></router-view>
    </t-config-provider>
  </template>
</template>

<script setup lang="ts">
import settingStore from "@/stores/setting";
import zhConfig from "tdesign-vue-next/lib/locale/zh_CN";
import enConfig from "tdesign-vue-next/lib/locale/en_US";
import { cachedLocale, languageList, switchLocale } from "@/locales";
import { initTheme } from "@/utils/theme";
import { type GlobalConfigProvider } from "tdesign-vue-next";

const { baseUrl, isElectron } = storeToRefs(settingStore());

const loading = ref(true);

watch(
  () => isElectron.value,
  (newVal) => {
    if (newVal) {
      document.body.classList.add("is-electron");
    } else {
      document.body.classList.remove("is-electron");
    }
  },
  { immediate: true },
);

onBeforeMount(() => {
  if (import.meta.env.DEV) {
    document.addEventListener("keydown", function (event) {
      if (event.key === "F8") {
        event.preventDefault();
        debugger;
      }
    });
  }
});

onMounted(async () => {
  getPort();
});

async function handleLinkClick(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();

  const target = event.currentTarget as HTMLAnchorElement | null;
  const url = target?.getAttribute("data-link") || target?.getAttribute("href");
  if (!url) return false;

  if (isElectron.value) {
    await fetch(`toonflow://openurlwithbrowser?url=${encodeURIComponent(url)}`);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return false;
}

async function getPort() {
  await nextTick();
  await nextTick();
  await nextTick();
  await nextTick();
  // toonflow:// 仅 Electron 注册；普通浏览器 fetch 会刷 "URL scheme is not supported"
  const likelyElectron = /Electron/i.test(navigator.userAgent);
  if (likelyElectron) {
    try {
      const res = await fetch("toonflow://getAppUrl");
      const data = await res.json();
      if (data?.url) {
        baseUrl.value = data.url;
        isElectron.value = true;
      }
    } catch (error) {}
  }

  const { setupMdEditor } = await import("@/utils/mdEditorSetup");
  void setupMdEditor(handleLinkClick);

  loading.value = false;

  try {
    const language = navigator.language;
    if (language && languageList.some((item) => item.value === language)) {
      await switchLocale(language);
    }
  } catch (e) {
    console.error("获取语言失败", e);
  }
}

const tdesignLocaleMap: Record<string, GlobalConfigProvider> = {
  "zh-CN": zhConfig,
  en: enConfig,
};

const customConfig: GlobalConfigProvider = {
  calendar: {},
  table: {},
  pagination: {},
};

const globalConfig = computed<GlobalConfigProvider>(() => {
  const localeConfig = tdesignLocaleMap[cachedLocale.value] || zhConfig;
  return {
    ...localeConfig,
    calendar: { ...localeConfig.calendar, ...customConfig.calendar },
    table: { ...localeConfig.table, ...customConfig.table },
    pagination: { ...localeConfig.pagination, ...customConfig.pagination },
  };
});

onBeforeMount(() => {
  initTheme();
});
</script>

<style lang="scss">
.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background: var(--td-bg-color-page, #f5f5f5);
}
</style>
