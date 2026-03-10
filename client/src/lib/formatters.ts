export function toSafeNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function formatNumber(value: unknown): string {
  return toSafeNumber(value).toLocaleString("zh-CN");
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
    // 纯日期字符串直接返回，避免时区导致前后偏移
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) return trimmed.replace(/\//g, "-");
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 格式化为 YYYY-MM-DD HH:mm */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (date == null) return "-";
  if (typeof date === "string") {
    const trimmed = date.trim();
    if (!trimmed) return "-";
    // 已是标准时间文本时保持统一风格
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      return trimmed.replace("T", " ").slice(0, 16);
    }
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${min}`;
}

/** 格式化为 YYYY-MM-DD HH:mm:ss */
export function formatDateTimeFull(date: Date | string | number | null | undefined): string {
  if (date == null) return "-";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${min}:${sec}`;
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
