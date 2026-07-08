import { createI18n, type I18n } from "vue-i18n";
import { useLocalStorage } from "@vueuse/core";

const languageList = [
  { label: "简体中文", tips: "Chinese (Simplified)", value: "zh-CN" },
  { label: "繁體中文", tips: "Chinese (Traditional)", value: "zh-TW" },
  { label: "English", tips: "English", value: "en" },
  { label: "ไทย", tips: "Thai", value: "th-TH" },
  { label: "Tiếng Việt", tips: "Vietnamese", value: "vi-VN" },
  { label: "日本語", tips: "Japanese", value: "ja-JP" },
  { label: "Русский", tips: "Russian", value: "ru-RU" },
];

const INITIAL_LOCALES = ["zh-CN", "en"] as const;

const localeLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  "zh-CN": () => import("./language/zh-CN.json"),
  "zh-TW": () => import("./language/zh-TW.json"),
  en: () => import("./language/en.json"),
  "th-TH": () => import("./language/th_TH.json"),
  "vi-VN": () => import("./language/vi-VN.json"),
  "ja-JP": () => import("./language/ja_JP.json"),
  "ru-RU": () => import("./language/ru_RU.json"),
};

const cachedLocale = useLocalStorage("locale", "zh-CN");

let i18n: I18n | null = null;

async function loadLocaleMessages(locale: string) {
  const loader = localeLoaders[locale];
  if (!loader) {
    throw new Error(`Unsupported locale: ${locale}`);
  }
  const mod = await loader();
  return mod.default;
}

export async function setupI18n() {
  const messages: Record<string, Record<string, unknown>> = {};

  for (const locale of INITIAL_LOCALES) {
    messages[locale] = await loadLocaleMessages(locale);
  }

  const targetLocale = cachedLocale.value;
  if (!INITIAL_LOCALES.includes(targetLocale as (typeof INITIAL_LOCALES)[number])) {
    messages[targetLocale] = await loadLocaleMessages(targetLocale);
  }

  i18n = createI18n({
    legacy: false,
    locale: targetLocale,
    fallbackLocale: "en",
    messages,
  });

  return i18n;
}

export async function switchLocale(locale: string) {
  if (!i18n) {
    throw new Error("i18n is not initialized");
  }

  if (!i18n.global.availableLocales.includes(locale)) {
    const messages = await loadLocaleMessages(locale);
    i18n.global.setLocaleMessage(locale, messages);
  }

  i18n.global.locale.value = locale;
  cachedLocale.value = locale;
}

export { languageList, cachedLocale };
