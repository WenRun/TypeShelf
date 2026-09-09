import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import zhCN from "./locales/zh-CN.json";
import en from "./locales/en.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "zh-CN": { translation: zhCN },
      zh: { translation: zhCN },
      en: { translation: en },
      "en-US": { translation: en },
    },
    fallbackLng: "zh-CN",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "typeshelf_language",
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
