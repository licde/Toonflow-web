import { createI18n, type I18n } from "vue-i18n";
import { useLocalStorage } from "@vueuse/core";

const localeLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  "zh-CN": () => import("./language/zh-CN.json"),
  "zh-TW": () => import("./language/zh-TW.json"),
  en: () => import("./language/en.json"),
  "th-TH": () => import("./language/th_TH.json"),
  "vi-VN": () => import("./language/vi-VN.json"),
  "ja-JP": () => import("./language/ja_JP.json"),
  "ru-RU": () => import("./language/ru_RU.json"),
};

export const languageList = [
  { label: "简体中文", tips: "Chinese (Simplified)", value: "zh-CN" },
  { label: "繁體中文", tips: "Chinese (Traditional)", value: "zh-TW" },
  { label: "English", tips: "English", value: "en" },
  { label: "ไทย", tips: "Thai", value: "th-TH" },
  { label: "Tiếng Việt", tips: "Vietnamese", value: "vi-VN" },
  { label: "日本語", tips: "Japanese", value: "ja-JP" },
  { label: "Русский", tips: "Russian", value: "ru-RU" },
];

export const cachedLocale = useLocalStorage("locale", "zh-CN");

export let i18n: I18n;

export async function loadLocale(locale: string) {
  if (!i18n) return;
  if (Object.keys(i18n.global.getLocaleMessage(locale)).length > 0) return;
  const loader = localeLoaders[locale];
  if (!loader) return;
  const mod = await loader();
  i18n.global.setLocaleMessage(locale, mod.default);
}

export async function setupI18n() {
  const locale = cachedLocale.value;
  const [current, fallback] = await Promise.all([
    localeLoaders[locale](),
    locale !== "en" ? localeLoaders.en() : Promise.resolve(null),
  ]);
  const messages: Record<string, Record<string, unknown>> = { [locale]: current.default };
  if (fallback) messages.en = fallback.default;

  i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: "en",
    messages,
  });
  return i18n;
}

export async function switchLocale(locale: string) {
  await loadLocale(locale);
  i18n.global.locale.value = locale as typeof i18n.global.locale.value;
  cachedLocale.value = locale;
}

export default i18n;
