/**
 * GS1 UDI 条码生成工具
 * 使用 bwip-js 生成符合 GS1 标准的条码和二维码
 *
 * 支持:
 * - GS1-128 一维条码 (含 FNC1 前缀和 GS 分隔符)
 * - GS1 DataMatrix 二维码 (含 FNC1 前缀和 GS 分隔符)
 * - 标准 Code128, EAN13, ITF14 等
 *
 * GS1 数据格式说明:
 * - 用户输入格式: (01)06975573321040(17)250112(10)2024092401
 * - AI (Application Identifier) 用圆括号括起来
 * - 固定长度 AI: 01(14位), 11(6位), 17(6位), 20(2位)
 * - 可变长度 AI: 10, 21, 240, 250 等 (需要 GS 分隔符, 除非是最后一个)
 */
import bwipjs from "bwip-js";

// 固定长度的 AI 及其数据长度
const FIXED_LENGTH_AIS: Record<string, number> = {
  "00": 18, "01": 14, "02": 14,
  "03": 14, "04": 16,
  "11": 6, "12": 6, "13": 6, "15": 6, "16": 6, "17": 6,
  "20": 2,
  "31": 8, "32": 8, "33": 8, "34": 8, "35": 8, "36": 8,
  "41": 14,
};

/**
 * 判断 AI 是否为固定长度
 */
function isFixedLengthAI(ai: string): boolean {
  if (FIXED_LENGTH_AIS[ai]) return true;
  // 2位AI中31-36开头的都是固定长度
  if (ai.length === 4 && /^3[1-6]/.test(ai)) return true;
  return false;
}

/**
 * 获取固定长度 AI 的数据长度
 */
function getFixedLength(ai: string): number {
  if (FIXED_LENGTH_AIS[ai]) return FIXED_LENGTH_AIS[ai];
  if (ai.length === 4 && /^3[1-6]/.test(ai)) return 6;
  return 0;
}

/**
 * 解析 GS1 数据字符串 (带圆括号的 AI 格式)
 * 输入: "(01)06975573321040(17)250112(10)2024092401"
 * 输出: [{ ai: "01", data: "06975573321040" }, { ai: "17", data: "250112" }, { ai: "10", data: "2024092401" }]
 */
export interface AISegment {
  ai: string;
  data: string;
}

export function parseGS1String(input: string): AISegment[] {
  const segments: AISegment[] = [];
  const regex = /\((\d{2,4})\)([^()]*)/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    segments.push({ ai: match[1], data: match[2] });
  }
  return segments;
}

/**
 * 将 AI 段列表转换为 GS1 编码数据字符串
 * 用于 bwip-js 的 gs1-128 和 gs1datamatrix
 * bwip-js 的 GS1 格式: (01)06975573321040(17)250112(10)2024092401
 * bwip-js 会自动处理 FNC1 和 GS 分隔符
 */
export function buildGS1DataString(segments: AISegment[]): string {
  return segments.map(s => `(${s.ai})${s.data}`).join("");
}

/**
 * 从简单字段数据构建 GS1 数据字符串
 */
export function buildUDIDataString(params: {
  gtin?: string;
  mfgDate?: string;     // YYMMDD
  expDate?: string;     // YYMMDD
  batchNo?: string;
  serialNo?: string;
}): string {
  const parts: string[] = [];
  if (params.gtin) {
    // GTIN 必须是14位
    const gtin14 = params.gtin.padStart(14, "0");
    parts.push(`(01)${gtin14}`);
  }
  if (params.mfgDate) {
    parts.push(`(11)${params.mfgDate}`);
  }
  if (params.expDate) {
    parts.push(`(17)${params.expDate}`);
  }
  if (params.batchNo) {
    parts.push(`(10)${params.batchNo}`);
  }
  if (params.serialNo) {
    parts.push(`(21)${params.serialNo}`);
  }
  return parts.join("");
}

/**
 * 生成 HRI (Human Readable Interpretation) 文本
 * 格式: (01) 06975573321040 (17) 250112 (10) 2024092401
 */
export function formatHRI(gs1Data: string): string {
  const segments = parseGS1String(gs1Data);
  return segments.map(s => `(${s.ai}) ${s.data}`).join(" ");
}

/**
 * 将 HRI 分成多行 (用于标签上显示)
 * 每行一个 AI 段
 */
export function formatHRILines(gs1Data: string): string[] {
  const segments = parseGS1String(gs1Data);
  return segments.map(s => `(${s.ai}) ${s.data}`);
}

/**
 * 验证 GS1 数据字符串格式是否正确
 */
export function validateGS1Data(gs1Data: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const segments = parseGS1String(gs1Data);

  if (segments.length === 0) {
    errors.push("未检测到有效的 AI 标识符，格式应为 (01)数据(17)数据...");
    return { valid: false, errors };
  }

  for (const seg of segments) {
    // 检查 AI 是否为数字
    if (!/^\d{2,4}$/.test(seg.ai)) {
      errors.push(`AI "${seg.ai}" 格式无效，应为2-4位数字`);
    }

    // 检查固定长度 AI 的数据长度
    if (isFixedLengthAI(seg.ai)) {
      const expected = getFixedLength(seg.ai);
      if (seg.data.length !== expected) {
        errors.push(`AI (${seg.ai}) 数据长度应为 ${expected} 位，当前为 ${seg.data.length} 位`);
      }
    }

    // 检查 AI(01) GTIN 格式
    if (seg.ai === "01") {
      if (!/^\d{14}$/.test(seg.data)) {
        errors.push(`GTIN (01) 应为14位纯数字`);
      }
    }

    // 检查日期格式 AI(11), AI(17)
    if (["11", "17"].includes(seg.ai)) {
      if (!/^\d{6}$/.test(seg.data)) {
        errors.push(`日期 AI(${seg.ai}) 应为6位数字 (YYMMDD)`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 日期字符串转 YYMMDD 格式
 * 输入: "2024-09-24" 或 "2024/09/24"
 * 输出: "240924"
 */
export function dateToYYMMDD(dateStr: string): string {
  const cleaned = dateStr.replace(/[-/]/g, "");
  if (cleaned.length === 8) {
    return cleaned.slice(2); // YYYYMMDD -> YYMMDD
  }
  if (cleaned.length === 6) {
    return cleaned; // already YYMMDD
  }
  return cleaned.slice(0, 6);
}

/**
 * 使用 bwip-js 渲染 GS1-128 条码到 canvas
 */
export async function renderGS1_128(
  canvas: HTMLCanvasElement,
  gs1Data: string,
  options?: {
    height?: number;
    scale?: number;
    includetext?: boolean;
  }
): Promise<void> {
  const segments = parseGS1String(gs1Data);
  if (segments.length === 0) {
    throw new Error("无效的 GS1 数据");
  }

  try {
    bwipjs.toCanvas(canvas, {
      bcid: "gs1-128",
      text: gs1Data,
      scale: options?.scale ?? 2,
      height: options?.height ?? 10,
      includetext: options?.includetext ?? true,
      textxalign: "center",
      textsize: 8,
    });
  } catch (e) {
    console.error("GS1-128 渲染失败:", e);
    throw e;
  }
}

/**
 * 使用 bwip-js 渲染 GS1 DataMatrix 到 canvas
 */
export async function renderGS1DataMatrix(
  canvas: HTMLCanvasElement,
  gs1Data: string,
  options?: {
    scale?: number;
    size?: number;
  }
): Promise<void> {
  const segments = parseGS1String(gs1Data);
  if (segments.length === 0) {
    throw new Error("无效的 GS1 数据");
  }

  try {
    bwipjs.toCanvas(canvas, {
      bcid: "gs1datamatrix",
      text: gs1Data,
      scale: options?.scale ?? 3,
      paddingwidth: 2,
      paddingheight: 2,
    });
  } catch (e) {
    console.error("GS1 DataMatrix 渲染失败:", e);
    throw e;
  }
}

/**
 * 使用 bwip-js 渲染通用条码到 canvas
 */
export async function renderBarcode(
  canvas: HTMLCanvasElement,
  data: string,
  format: string,
  options?: {
    height?: number;
    scale?: number;
    includetext?: boolean;
  }
): Promise<void> {
  // 映射格式名到 bwip-js 的 bcid
  const formatMap: Record<string, string> = {
    "CODE128": "code128",
    "CODE39": "code39",
    "EAN13": "ean13",
    "EAN8": "ean8",
    "ITF14": "itf14",
    "UPC": "upca",
    "GS1-128": "gs1-128",
    "GS1-DATAMATRIX": "gs1datamatrix",
    "DATAMATRIX": "datamatrix",
  };

  const bcid = formatMap[format.toUpperCase()] ?? "code128";

  try {
    bwipjs.toCanvas(canvas, {
      bcid,
      text: data,
      scale: options?.scale ?? 2,
      height: options?.height ?? 10,
      includetext: options?.includetext ?? true,
      textxalign: "center",
      textsize: 8,
    });
  } catch (e) {
    console.error(`条码渲染失败 (${format}):`, e);
    throw e;
  }
}

/**
 * 条码格式列表 (用于UI选择)
 */
export const BARCODE_FORMAT_OPTIONS = [
  { value: "GS1-128", label: "GS1-128 (UDI推荐)", description: "符合GS1标准的一维条码，含FNC1前缀", isUDI: true },
  { value: "GS1-DATAMATRIX", label: "GS1 DataMatrix (UDI推荐)", description: "符合GS1标准的二维码，医疗器械首选", isUDI: true },
  { value: "CODE128", label: "Code 128", description: "通用高密度一维条码", isUDI: false },
  { value: "CODE39", label: "Code 39", description: "字母数字一维条码", isUDI: false },
  { value: "EAN13", label: "EAN-13", description: "13位欧洲商品编码", isUDI: false },
  { value: "EAN8", label: "EAN-8", description: "8位短商品编码", isUDI: false },
  { value: "ITF14", label: "ITF-14", description: "14位交叉二五条码", isUDI: false },
  { value: "DATAMATRIX", label: "DataMatrix (普通)", description: "普通DataMatrix二维码", isUDI: false },
];

/**
 * 判断是否为 GS1 格式 (需要 AI 标识符)
 */
export function isGS1Format(format: string): boolean {
  return format.toUpperCase().startsWith("GS1");
}

/**
 * 判断是否为二维码格式
 */
export function is2DFormat(format: string): boolean {
  return ["GS1-DATAMATRIX", "DATAMATRIX"].includes(format.toUpperCase());
}
