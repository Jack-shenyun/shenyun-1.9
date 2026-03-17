import {
  formatDateBySettings,
  formatTimeBySettings,
  getIntlLocale,
  loadLanguageSettingsFromStorage,
} from "./languageSettings";

function formatPlainDateText(value: string) {
  const normalized = value.replace(/\//g, "-");
  const [year, month, day] = normalized.split("-");
  return `${year}-${month}-${day}`;
}

function getUnifiedDateSettings() {
  const settings = loadLanguageSettingsFromStorage();
  return {
    ...settings,
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h" as const,
  };
}

export function toSafeNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function roundToDigits(value: unknown, digits = 2): number {
  const number = toSafeNumber(value);
  if (!Number.isFinite(number)) return 0;
  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
}

export function toRoundedString(value: unknown, digits = 2): string {
  return String(roundToDigits(value, digits));
}

export function formatNumber(value: unknown): string {
  return formatDisplayNumber(value);
}

export function formatDisplayNumber(
  value: unknown,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    locale?: string;
  },
): string {
  const number = toSafeNumber(value);
  const settings = loadLanguageSettingsFromStorage();
  const formatter = new Intl.NumberFormat(options?.locale || getIntlLocale(settings), {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });
  return formatter.format(number);
}

export function formatCurrencyValue(
  value: unknown,
  currencySymbol = "¥",
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    locale?: string;
  },
): string {
  return `${currencySymbol}${formatDisplayNumber(value, options)}`;
}

export function formatPercentValue(
  value: unknown,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    locale?: string;
  },
): string {
  return `${formatDisplayNumber(value, options)}%`;
}

export function splitRoundedValue(
  value: unknown,
  digits = 2,
): {
  integerPart: string;
  fractionPart: string;
} {
  const number = roundToDigits(value, digits);
  const factor = 10 ** digits;
  const rounded = Math.abs(Math.round(number * factor));
  const integerPart = Math.floor(rounded / factor).toString();
  const fractionPart = String(rounded % factor).padStart(digits, "0");
  return {
    integerPart: number < 0 ? `-${integerPart}` : integerPart,
    fractionPart,
  };
}

export function safeLower(value: unknown): string {
  return String(value ?? "").toLowerCase();
}

/** 格式化为 YYYY-MM-DD */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (date == null) return "-";
  if (typeof date === "string") {
    const trimmed = date.trim();
    if (!trimmed) return "-";
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return formatPlainDateText(trimmed);
    }
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
      return formatPlainDateText(trimmed);
    }
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return formatDateBySettings(d, getUnifiedDateSettings());
}

/** 格式化为 YYYY-MM-DD HH:mm */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (date == null) return "-";
  if (typeof date === "string") {
    const trimmed = date.trim();
    if (!trimmed) return "-";
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const parsed = new Date(trimmed.replace(" ", "T"));
      if (!Number.isNaN(parsed.getTime())) {
        const settings = getUnifiedDateSettings();
        return `${formatDateBySettings(parsed, settings)} ${formatTimeBySettings(parsed, settings)}`;
      }
    }
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  const settings = getUnifiedDateSettings();
  return `${formatDateBySettings(d, settings)} ${formatTimeBySettings(d, settings)}`;
}

/** 格式化为 YYYY-MM-DD HH:mm:ss */
export function formatDateTimeFull(date: Date | string | number | null | undefined): string {
  if (date == null) return "-";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  const settings = getUnifiedDateSettings();
  return `${formatDateBySettings(d, settings)} ${formatTimeBySettings(d, settings, true)}`;
}

/**
 * 将日期值格式化为 YYYY-MM-DD 或 YYYY-MM-DD HH:mm 格式
 * @param value  日期值（Date | string | number | null | undefined）
 * @param includeTime  是否包含时间，默认 false
 */
export function formatDateValue(value: unknown, includeTime = false): string {
  if (value == null || value === "") return "-";
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else {
    return String(value);
  }
  if (Number.isNaN(date.getTime())) return "-";
  return includeTime ? formatDateTime(date) : formatDate(date);
}
