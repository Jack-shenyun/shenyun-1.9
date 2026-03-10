/**
 * 发票识别服务（非 AI）
 * - 不调用任何外部大模型 API
 * - 仅使用本地 PDF 文本提取 + 规则解析
 */

import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

function stripCurrency(value: string): string {
  return value.replace(/[\s,￥¥元]/g, "").trim();
}

function toNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(stripCurrency(value));
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{4})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

function extractInvoiceDataFromText(rawText: string): Record<string, any> {
  const text = rawText.replace(/\r/g, "\n");

  const invoiceNo = text.match(/发票号码[：:\s]*([0-9]{8,20})/)?.[1] ?? null;
  const invoiceCode = text.match(/发票代码[：:\s]*([0-9]{10,12})/)?.[1] ?? null;
  const invoiceDate = normalizeDate(text.match(/开票日期[：:\s]*([0-9]{4}[年\/.\-][0-9]{1,2}[月\/.\-][0-9]{1,2})/)?.[1]);

  let sellerName: string | null = null;
  const salesBlock = text.match(/销售方信息([\s\S]{0,300})/);
  if (salesBlock?.[1]) {
    const sellerMatch = salesBlock[1].match(/名称[：:\s]*([^\n]+)/);
    if (sellerMatch?.[1]) sellerName = sellerMatch[1].trim();
  }

  const isElectronic = /电子发票/.test(text);
  const isSpecial = /专用发票/.test(text);

  const totalAmount = toNumber(
    text.match(/小写[^\d￥¥]*[￥¥]?\s*([0-9][0-9,]*\.?[0-9]*)/)?.[1]
    ?? text.match(/价税合计[^\d￥¥]*[￥¥]?\s*([0-9][0-9,]*\.?[0-9]*)/)?.[1]
  );

  const taxFree = /免税/.test(text);
  let taxRate: number | null = null;
  let taxAmount: number | null = null;
  let amountExTax: number | null = null;

  if (taxFree) {
    taxRate = 0;
    taxAmount = 0;
    amountExTax = totalAmount;
  } else {
    taxRate = toNumber(text.match(/税率[\/、]?征收率[^\d]*([0-9]{1,2})%/)?.[1] ?? null);
    taxAmount = toNumber(text.match(/税额[^\d]*([0-9][0-9,]*\.?[0-9]*)/)?.[1] ?? null);
    amountExTax = toNumber(text.match(/金额[^\d]*([0-9][0-9,]*\.?[0-9]*)/)?.[1] ?? null);

    if (amountExTax !== null && taxAmount !== null && totalAmount === null) {
      // keep null totalAmount in output,前端可手工校对
    }
    if (totalAmount !== null && amountExTax !== null && taxAmount === null) {
      taxAmount = Math.round((totalAmount - amountExTax) * 100) / 100;
    }
    if (totalAmount !== null && taxAmount !== null && amountExTax === null) {
      amountExTax = Math.round((totalAmount - taxAmount) * 100) / 100;
    }
  }

  return {
    invoiceNo,
    invoiceCode,
    invoiceDate,
    sellerName,
    totalAmount,
    taxAmount,
    amountExTax,
    taxRate,
    invoiceType: isElectronic ? "electronic" : (isSpecial ? "vat_special" : "vat_normal"),
    rawText,
  };
}

function isReasonableDate(value: string | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const min = new Date("2024-01-01");
  const max = new Date("2035-12-31");
  return d >= min && d <= max;
}

function hasBasicConfidence(data: Record<string, any>): boolean {
  const hasInvoiceNo = typeof data.invoiceNo === "string" && data.invoiceNo.length >= 8;
  const hasSeller = typeof data.sellerName === "string" && data.sellerName.length >= 4;
  const hasDate = isReasonableDate(data.invoiceDate ?? null);
  const hasAmount = typeof data.totalAmount === "number" && data.totalAmount > 0;

  // 至少满足两项核心字段，才允许自动填充
  const score = [hasInvoiceNo, hasSeller, hasDate, hasAmount].filter(Boolean).length;
  return score >= 2;
}

function extractPdfText(pdfBase64: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "invoice-ocr-"));
  try {
    const base64Data = pdfBase64.replace(/^data:[^;]+;base64,/, "");
    const pdfPath = path.join(tmpDir, "invoice.pdf");
    const txtPath = path.join(tmpDir, "invoice.txt");

    fs.writeFileSync(pdfPath, Buffer.from(base64Data, "base64"));

    try {
      execSync(`pdftotext -layout -f 1 -l 1 "${pdfPath}" "${txtPath}"`, { timeout: 30000 });
    } catch {
      throw new Error("缺少 PDF 文本提取能力：请安装 poppler（brew install poppler）后重试");
    }

    if (!fs.existsSync(txtPath)) {
      throw new Error("PDF 文本提取失败：未生成文本文件");
    }

    return fs.readFileSync(txtPath, "utf8");
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

export interface OcrInput {
  name: string;
  base64: string;
}

export interface OcrResult {
  name: string;
  success: boolean;
  provider?: string;
  data: Record<string, any>;
  error?: string;
}

export async function recognizeInvoices(inputs: OcrInput[]): Promise<OcrResult[]> {
  const results: OcrResult[] = [];

  for (const input of inputs) {
    try {
      const isPdf = input.base64.startsWith("data:application/pdf") || input.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        results.push({
          name: input.name,
          success: false,
          error: "当前仅支持 PDF 发票规则识别（未启用 AI）",
          data: {},
        });
        continue;
      }

      const rawText = extractPdfText(input.base64);
      const data = extractInvoiceDataFromText(rawText);

      if (!hasBasicConfidence(data)) {
        results.push({
          name: input.name,
          success: false,
          error: "识别置信度低，已阻止自动填充。请手动录入或上传更清晰的原始电子发票 PDF。",
          data: {},
        });
        continue;
      }

      results.push({
        name: input.name,
        success: true,
        provider: "规则识别",
        data,
      });
    } catch (err: any) {
      results.push({
        name: input.name,
        success: false,
        error: err?.message || "识别失败",
        data: {},
      });
    }
  }

  return results;
}
