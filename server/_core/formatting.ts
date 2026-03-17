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
  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
}

export function toRoundedString(value: unknown, digits = 2): string {
  return String(roundToDigits(value, digits));
}

export function formatDisplayNumber(
  value: unknown,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    locale?: string;
  },
): string {
  return new Intl.NumberFormat(options?.locale || "zh-CN", {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(toSafeNumber(value));
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

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(`${trimmed}T00:00:00`);
    }
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: unknown): string {
  const date = toDate(value);
  if (!date) return "-";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return "-";
  return `${formatDate(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatDateTimeFull(value: unknown): string {
  const date = toDate(value);
  if (!date) return "-";
  return `${formatDate(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
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

export function formatBytesText(
  bytes: number,
  locale = "zh-CN",
): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${formatDisplayNumber(bytes / 1024, { maximumFractionDigits: 1, locale })} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${formatDisplayNumber(bytes / 1024 / 1024, { maximumFractionDigits: 1, locale })} MB`;
  }
  return `${formatDisplayNumber(bytes / 1024 / 1024 / 1024, { maximumFractionDigits: 1, locale })} GB`;
}
