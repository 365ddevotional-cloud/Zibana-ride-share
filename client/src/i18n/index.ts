import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createElement } from "react";

import en from "./translations/en.json";
import fr from "./translations/fr.json";
import ar from "./translations/ar.json";
import ha from "./translations/ha.json";
import ig from "./translations/ig.json";
import yo from "./translations/yo.json";
import sw from "./translations/sw.json";
import zu from "./translations/zu.json";
import xh from "./translations/xh.json";
import af from "./translations/af.json";
import pt from "./translations/pt.json";
import es from "./translations/es.json";

type TranslationData = Record<string, Record<string, string>>;

const translations: Record<string, TranslationData> = {
  en, fr, ar, ha, ig, yo, sw, zu, xh, af, pt, es,
};

export const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", group: "global" },
  { code: "fr", name: "French", nativeName: "Français", group: "global" },
  { code: "ar", name: "Arabic", nativeName: "العربية", group: "global" },
  { code: "es", name: "Spanish", nativeName: "Español", group: "global" },
  { code: "pt", name: "Portuguese", nativeName: "Português", group: "global" },
  { code: "ha", name: "Hausa", nativeName: "Hausa", group: "nigeria" },
  { code: "ig", name: "Igbo", nativeName: "Igbo", group: "nigeria" },
  { code: "yo", name: "Yoruba", nativeName: "Yorùbá", group: "nigeria" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", group: "southernEastern" },
  { code: "zu", name: "Zulu", nativeName: "isiZulu", group: "southernEastern" },
  { code: "xh", name: "Xhosa", nativeName: "isiXhosa", group: "southernEastern" },
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans", group: "optional" },
] as const;

export type LanguageCode = typeof LANGUAGES[number]["code"];

const STORAGE_KEY = "ziba-language";
const RTL_LANGUAGES: string[] = ["ar"];

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

interface TranslationContextValue {
  t: (key: string) => string;
  language: string;
  setLanguage: (code: string) => void;
  isRTL: boolean;
}

const TranslationContext = createContext<TranslationContextValue>({
  t: (key: string) => key,
  language: "en",
  setLanguage: () => {},
  isRTL: false,
});

function applyDocumentDirection(code: string) {
  const isRTL = RTL_LANGUAGES.includes(code);
  document.documentElement.setAttribute("dir", isRTL ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", code);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    applyDocumentDirection(language);
  }, [language]);

  useEffect(() => {
    fetch("/api/user/language", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.language && translations[data.language]) {
          setLanguageState(data.language);
          try {
            localStorage.setItem(STORAGE_KEY, data.language);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback((code: string) => {
    if (!translations[code]) return;
    setLanguageState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
    fetch("/api/user/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ language: code }),
    }).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string): string => {
      const currentTranslations = translations[language];
      if (currentTranslations) {
        const value = getNestedValue(currentTranslations, key);
        if (value !== undefined) return value;
      }
      if (language !== "en") {
        const fallback = getNestedValue(translations.en, key);
        if (fallback !== undefined) return fallback;
      }
      return key;
    },
    [language],
  );

  const isRTL = RTL_LANGUAGES.includes(language);

  return createElement(
    TranslationContext.Provider,
    { value: { t, language, setLanguage, isRTL } },
    children,
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
