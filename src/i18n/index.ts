import { tr } from "./tr";
import { en } from "./en";
import type { I18nKey } from "./tr";

export type Locale = "tr" | "en";
export type { I18nKey };

const STORAGE_KEY = "napkin-plan:locale:v1";

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "tr" || saved === "en") return saved;
  } catch {}
  const nav = navigator.language.toLowerCase();
  return nav.startsWith("tr") ? "tr" : "en";
}

let current: Locale = detectLocale();

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale) {
  current = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {}
}

export function t(): I18nKey {
  return current === "tr" ? tr : en;
}

export function toggleLocale() {
  setLocale(current === "tr" ? "en" : "tr");
}
