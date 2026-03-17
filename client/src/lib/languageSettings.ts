export interface LanguageSettings {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: "24h" | "12h";
  currency: string;
  autoDetect: boolean;
}

export const LANGUAGE_SETTINGS_STORAGE_KEY = "erp-language-settings";

export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = {
  language: "zh-CN",
  timezone: "Asia/Shanghai",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "24h",
  currency: "CNY",
  autoDetect: false,
};

function resolveSupportedLanguage(value?: string | null) {
  const code = String(value || "").trim();
  if (!code) return DEFAULT_LANGUAGE_SETTINGS.language;
  if (/^zh[-_]TW/i.test(code)) return "zh-TW";
  if (/^zh/i.test(code)) return "zh-CN";
  if (/^en/i.test(code)) return "en-US";
  if (/^ja/i.test(code)) return "ja-JP";
  if (/^ko/i.test(code)) return "ko-KR";
  return DEFAULT_LANGUAGE_SETTINGS.language;
}

export function normalizeLanguageSettings(input?: Partial<LanguageSettings> | null): LanguageSettings {
  return {
    language: resolveSupportedLanguage(input?.language),
    timezone: String(input?.timezone || DEFAULT_LANGUAGE_SETTINGS.timezone),
    dateFormat: String(input?.dateFormat || DEFAULT_LANGUAGE_SETTINGS.dateFormat),
    timeFormat: input?.timeFormat === "12h" ? "12h" : "24h",
    currency: String(input?.currency || DEFAULT_LANGUAGE_SETTINGS.currency),
    autoDetect: Boolean(input?.autoDetect),
  };
}

export function parseLanguageSettings(raw?: string | null): LanguageSettings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return normalizeLanguageSettings(parsed);
  } catch {
    return null;
  }
}

export function loadLanguageSettingsFromStorage(): LanguageSettings {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE_SETTINGS;
  const parsed = parseLanguageSettings(window.localStorage.getItem(LANGUAGE_SETTINGS_STORAGE_KEY));
  return parsed || DEFAULT_LANGUAGE_SETTINGS;
}

export function saveLanguageSettingsToStorage(settings: LanguageSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANGUAGE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function resolveEffectiveLanguage(settings: LanguageSettings) {
  if (!settings.autoDetect || typeof window === "undefined") return resolveSupportedLanguage(settings.language);
  return resolveSupportedLanguage(window.navigator.language || settings.language);
}

export function getIntlLocale(settings?: Partial<LanguageSettings> | null) {
  return resolveEffectiveLanguage(normalizeLanguageSettings(settings));
}

export function applyLanguageSettings(settings: LanguageSettings) {
  if (typeof window === "undefined") return;
  const normalized = normalizeLanguageSettings(settings);
  saveLanguageSettingsToStorage(normalized);

  const effectiveLanguage = resolveEffectiveLanguage(normalized);
  document.documentElement.lang = effectiveLanguage;
  document.documentElement.dataset.language = effectiveLanguage;
  document.documentElement.dataset.timezone = normalized.timezone;
  document.documentElement.dataset.dateFormat = normalized.dateFormat;
  document.documentElement.dataset.timeFormat = normalized.timeFormat;
  document.documentElement.dataset.currency = normalized.currency;
}

function getDateParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
}

export function formatDateBySettings(value: Date | string | number, settings?: Partial<LanguageSettings> | null) {
  const normalized = normalizeLanguageSettings(settings);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const parts = getDateParts(date, normalized.timezone);
  if (normalized.dateFormat === "DD/MM/YYYY") return `${parts.day}/${parts.month}/${parts.year}`;
  if (normalized.dateFormat === "MM/DD/YYYY") return `${parts.month}/${parts.day}/${parts.year}`;
  if (normalized.dateFormat === "YYYY年MM月DD日") return `${parts.year}年${parts.month}月${parts.day}日`;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatTimeBySettings(value: Date | string | number, settings?: Partial<LanguageSettings> | null, includeSeconds = false) {
  const normalized = normalizeLanguageSettings(settings);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const locale = getIntlLocale(normalized);
  return new Intl.DateTimeFormat(locale, {
    timeZone: normalized.timezone,
    hour: "numeric",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: normalized.timeFormat === "12h",
  }).format(date);
}

export function formatMoneyBySettings(value: unknown, settings?: Partial<LanguageSettings> | null) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  const normalized = normalizeLanguageSettings(settings);
  return new Intl.NumberFormat(getIntlLocale(normalized), {
    style: "currency",
    currency: normalized.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}
