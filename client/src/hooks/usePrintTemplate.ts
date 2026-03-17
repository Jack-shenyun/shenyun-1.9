/**
 * usePrintTemplate Hook
 *
 * 统一打印链：
 * 模板渲染 -> 后端生成 PDF -> 弹窗预览 / 保存文件共用同一份 PDF
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  openPendingPdfPreviewWindow,
  renderPdfPreviewWindow,
  renderPreviewWindowError,
} from "@/lib/printPreview";

const api = trpc as any;

function base64ToUint8Array(base64: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function buildPdfBlobUrl(pdfBase64: string) {
  const bytes = base64ToUint8Array(pdfBase64);
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

function triggerBrowserDownload(pdfBase64: string, fileName: string) {
  const url = buildPdfBlobUrl(pdfBase64);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function usePrintTemplate() {
  const renderPdfMutation = api.printTemplates.renderPdf.useMutation();

  const renderPdf = useCallback(
    async (templateKey: string, data: Record<string, any>, title?: string) => {
      if (!templateKey || !data) {
        throw new Error("打印模板参数不完整");
      }
      return await renderPdfMutation.mutateAsync({
        templateKey,
        data,
        title,
      });
    },
    [renderPdfMutation],
  );

  const preview = useCallback(
    async (
      templateKey: string,
      data: Record<string, any>,
      title?: string,
      options?: { autoPrint?: boolean },
    ) => {
      const previewWindow = openPendingPdfPreviewWindow({ title });
      try {
        const rendered = await renderPdf(templateKey, data, title);
        const pdfUrl = buildPdfBlobUrl(String(rendered.pdfBase64 || ""));
        if (previewWindow) {
          renderPdfPreviewWindow(previewWindow, {
            title: rendered.title || title,
            pdfUrl,
            downloadName: rendered.fileName,
            autoPrint: options?.autoPrint,
          });
        } else {
          window.open(pdfUrl, "_blank", "noopener,noreferrer");
        }
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 5 * 60 * 1000);
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "PDF 生成失败，请稍后重试";
        if (previewWindow) {
          renderPreviewWindowError(previewWindow, {
            title,
            message,
          });
        }
        toast.error(message);
        return false;
      }
    },
    [renderPdf],
  );

  const print = useCallback(
    async (templateKey: string, data: Record<string, any>, title?: string) => {
      return await preview(templateKey, data, title, { autoPrint: true });
    },
    [preview],
  );

  const download = useCallback(
    async (templateKey: string, data: Record<string, any>, title?: string) => {
      try {
        const rendered = await renderPdf(templateKey, data, title);
        triggerBrowserDownload(String(rendered.pdfBase64 || ""), String(rendered.fileName || "打印文件.pdf"));
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "PDF 保存失败");
        return false;
      }
    },
    [renderPdf],
  );

  return {
    print,
    preview,
    download,
    isRendering: renderPdfMutation.isPending,
  };
}
