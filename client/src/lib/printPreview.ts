import { translateHtmlContentToEnglish, translateTextToEnglish } from "@/lib/runtimePageTranslator";

function getPreviewTitle(title?: string, element?: HTMLElement | null) {
  const normalized = String(title || "").trim();
  if (normalized) return normalized;
  const lang = document.documentElement.lang || "zh-CN";
  if (!element) return /^en/i.test(lang) ? "Print Preview" : "打印预览";
  const heading = element.querySelector("h1, h2, h3, [data-print-title]");
  const headingText = String(heading?.textContent || "").trim();
  return headingText || (/^en/i.test(lang) ? "Print Preview" : "打印预览");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function collectStyleText() {
  return Array.from(document.styleSheets)
    .map((styleSheet) => {
      try {
        return Array.from(styleSheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");
}

export function buildPrintableHtmlFromElement(element: HTMLElement) {
  const cloned = element.cloneNode(true) as HTMLElement;
  const originalInputs = Array.from(element.querySelectorAll("input"));
  const clonedInputs = Array.from(cloned.querySelectorAll("input"));
  originalInputs.forEach((input, index) => {
    const clonedInput = clonedInputs[index];
    if (!clonedInput) return;
    clonedInput.value = input.value;
    clonedInput.setAttribute("value", input.value);
    if (input.checked) {
      clonedInput.setAttribute("checked", "checked");
    } else {
      clonedInput.removeAttribute("checked");
    }
  });

  const originalTextareas = Array.from(element.querySelectorAll("textarea"));
  const clonedTextareas = Array.from(cloned.querySelectorAll("textarea"));
  originalTextareas.forEach((textarea, index) => {
    const clonedTextarea = clonedTextareas[index];
    if (!clonedTextarea) return;
    clonedTextarea.value = textarea.value;
    clonedTextarea.textContent = textarea.value;
  });

  const originalSelects = Array.from(element.querySelectorAll("select"));
  const clonedSelects = Array.from(cloned.querySelectorAll("select"));
  originalSelects.forEach((select, index) => {
    const clonedSelect = clonedSelects[index];
    if (!clonedSelect) return;
    clonedSelect.value = select.value;
    Array.from(clonedSelect.options).forEach((option) => {
      if (option.value === select.value) {
        option.setAttribute("selected", "selected");
      } else {
        option.removeAttribute("selected");
      }
    });
  });

  const originalCanvases = Array.from(element.querySelectorAll("canvas"));
  const clonedCanvases = Array.from(cloned.querySelectorAll("canvas"));
  originalCanvases.forEach((canvas, index) => {
    const clonedCanvas = clonedCanvases[index];
    if (!clonedCanvas) return;
    try {
      const image = document.createElement("img");
      image.src = canvas.toDataURL("image/png");
      image.width = canvas.width;
      image.height = canvas.height;
      image.style.width = canvas.style.width || `${canvas.width}px`;
      image.style.height = canvas.style.height || `${canvas.height}px`;
      image.style.display = getComputedStyle(canvas).display;
      image.style.maxWidth = "100%";
      clonedCanvas.replaceWith(image);
    } catch {
      // 忽略跨域或空画布异常，保留原节点
    }
  });

  return cloned.innerHTML;
}

export function openPrintPreviewWindow(options: {
  title?: string;
  element?: HTMLElement | null;
  html?: string;
  landscape?: boolean;
  language?: string;
  closeLabel?: string;
  printLabel?: string;
}) {
  const sourceHtml = options.element ? buildPrintableHtmlFromElement(options.element) : (options.html || "");
  if (!sourceHtml) return false;

  const title = getPreviewTitle(options.title, options.element);
  const styles = collectStyleText();
  const landscape = Boolean(options.landscape);
  const language = String(options.language || document.documentElement.lang || "zh-CN");
  const closeLabel = options.closeLabel || (/^en/i.test(language) ? "Close" : "关闭");
  const printLabel = options.printLabel || (/^en/i.test(language) ? "Print" : "打印");
  const previewWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!previewWindow) return false;

  previewWindow.document.write(`
    <!DOCTYPE html>
    <html lang="${escapeHtml(language)}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          ${styles}

          :root {
            --print-sheet-width: ${landscape ? "297mm" : "210mm"};
            --print-sheet-min-height: ${landscape ? "210mm" : "297mm"};
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            background: #eef2f7;
            color: #0f172a;
          }

          .no-print,
          [data-print-ignore="true"] {
            display: none !important;
          }

          .preview-toolbar {
            position: sticky;
            top: 0;
            z-index: 20;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 20px;
            background: rgba(15, 23, 42, 0.9);
            color: #fff;
            backdrop-filter: blur(10px);
          }

          .preview-toolbar-title {
            font-size: 15px;
            font-weight: 600;
            letter-spacing: 0.02em;
          }

          .preview-toolbar-actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .preview-toolbar button {
            appearance: none;
            border: 0;
            border-radius: 8px;
            padding: 8px 14px;
            font-size: 13px;
            cursor: pointer;
            background: #fff;
            color: #0f172a;
          }

          .preview-toolbar button.primary {
            background: #0f766e;
            color: #fff;
          }

          .print-preview-shell {
            display: flex;
            justify-content: center;
            padding: 24px 0 40px;
          }

          .print-sheet {
            width: var(--print-sheet-width);
            min-height: var(--print-sheet-min-height);
            background: #fff;
            padding: 12mm 14mm;
            box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12);
            border: 1px solid rgba(148, 163, 184, 0.2);
            font-size: 12.5px;
            line-height: 1.5;
          }

          @page {
            size: A4 ${landscape ? "landscape" : "portrait"};
            margin: 10mm 12mm;
          }

          @media print {
            body {
              background: #fff;
            }

            .preview-toolbar,
            .no-print,
            [data-print-ignore="true"] {
              display: none !important;
            }

            .print-preview-shell {
              display: block;
              padding: 0;
            }

            .print-sheet {
              width: auto;
              min-height: auto;
              padding: 0;
              border: none !important;
              box-shadow: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="preview-toolbar no-print">
          <div class="preview-toolbar-title">${escapeHtml(title)}</div>
          <div class="preview-toolbar-actions">
            <button type="button" onclick="window.close()">${escapeHtml(closeLabel)}</button>
            <button type="button" class="primary" onclick="window.print()">${escapeHtml(printLabel)}</button>
          </div>
        </div>
        <div class="print-preview-shell">
          <div class="print-sheet">
            ${sourceHtml}
          </div>
        </div>
      </body>
    </html>
  `);

  previewWindow.document.close();
  previewWindow.focus();
  return true;
}

export function openPendingPdfPreviewWindow(options: { title?: string }) {
  const title = getPreviewTitle(options.title);
  const previewWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!previewWindow) return null;

  previewWindow.document.write(`
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          body {
            margin: 0;
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            background: #f8fafc;
            color: #0f172a;
          }
          .shell {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 18px;
            background: #0f172a;
            color: #fff;
          }
          .title {
            font-size: 15px;
            font-weight: 600;
          }
          .content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 32px;
          }
          .card {
            width: min(460px, 100%);
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
            padding: 24px;
            text-align: center;
          }
          .spinner {
            width: 36px;
            height: 36px;
            margin: 0 auto 14px;
            border: 3px solid #cbd5e1;
            border-top-color: #0f766e;
            border-radius: 999px;
            animation: spin 0.8s linear infinite;
          }
          .desc {
            color: #475569;
            font-size: 13px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="shell">
          <div class="toolbar">
            <div class="title">${escapeHtml(title)}</div>
          </div>
          <div class="content">
            <div class="card">
              <div class="spinner"></div>
              <div>正在生成 PDF 预览...</div>
              <div class="desc">预览和保存会共用同一份 PDF 文件。</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
  previewWindow.document.close();
  previewWindow.focus();
  return previewWindow;
}

export function renderPdfPreviewWindow(
  previewWindow: Window,
  options: {
    title?: string;
    pdfUrl: string;
    downloadName?: string;
    autoPrint?: boolean;
  },
) {
  const title = getPreviewTitle(options.title);
  const downloadName = String(options.downloadName || `${title}.pdf`);
  const autoPrint = Boolean(options.autoPrint);

  previewWindow.document.open();
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; height: 100%; }
          body {
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            background: #e2e8f0;
            color: #0f172a;
          }
          .shell {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 18px;
            background: rgba(15, 23, 42, 0.96);
            color: #fff;
          }
          .title {
            font-size: 15px;
            font-weight: 600;
          }
          .actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          button, a {
            appearance: none;
            border: none;
            border-radius: 8px;
            padding: 8px 14px;
            cursor: pointer;
            font-size: 13px;
            text-decoration: none;
          }
          .ghost {
            background: #fff;
            color: #0f172a;
          }
          .primary {
            background: #0f766e;
            color: #fff;
          }
          .viewer {
            flex: 1;
            padding: 16px;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 20px 48px rgba(15, 23, 42, 0.12);
          }
        </style>
      </head>
      <body>
        <div class="shell">
          <div class="toolbar">
            <div class="title">${escapeHtml(title)}</div>
            <div class="actions">
              <a class="ghost" href="${escapeHtml(options.pdfUrl)}" download="${escapeHtml(downloadName)}">保存文件</a>
              <button type="button" class="ghost" id="open-native">打开原始 PDF</button>
              <button type="button" class="primary" id="print-btn">打印</button>
              <button type="button" class="ghost" onclick="window.close()">关闭</button>
            </div>
          </div>
          <div class="viewer">
            <iframe id="pdf-frame" src="${escapeHtml(options.pdfUrl)}#view=FitH"></iframe>
          </div>
        </div>
        <script>
          const pdfUrl = ${JSON.stringify(options.pdfUrl)};
          const shouldAutoPrint = ${autoPrint ? "true" : "false"};
          const frame = document.getElementById("pdf-frame");
          document.getElementById("open-native")?.addEventListener("click", () => {
            window.open(pdfUrl, "_blank", "noopener,noreferrer");
          });
          document.getElementById("print-btn")?.addEventListener("click", () => {
            try {
              frame?.contentWindow?.focus();
              frame?.contentWindow?.print();
            } catch {
              window.open(pdfUrl, "_blank", "noopener,noreferrer");
            }
          });
          if (shouldAutoPrint && frame) {
            frame.addEventListener("load", () => {
              setTimeout(() => {
                try {
                  frame.contentWindow?.focus();
                  frame.contentWindow?.print();
                } catch {
                  window.open(pdfUrl, "_blank", "noopener,noreferrer");
                }
              }, 400);
            }, { once: true });
          }
        </script>
      </body>
    </html>
  `);
  previewWindow.document.close();
  previewWindow.focus();
}

export function renderPreviewWindowError(
  previewWindow: Window,
  options: { title?: string; message: string },
) {
  const title = getPreviewTitle(options.title);
  previewWindow.document.open();
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #f8fafc;
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            color: #0f172a;
          }
          .card {
            width: min(440px, 100%);
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
            padding: 24px;
          }
          .title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 10px;
          }
          .desc {
            font-size: 13px;
            color: #475569;
            margin-bottom: 16px;
          }
          button {
            appearance: none;
            border: none;
            border-radius: 8px;
            padding: 8px 14px;
            background: #0f172a;
            color: #fff;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="title">${escapeHtml(title)}</div>
          <div class="desc">${escapeHtml(options.message)}</div>
          <button type="button" onclick="window.close()">关闭</button>
        </div>
      </body>
    </html>
  `);
  previewWindow.document.close();
  previewWindow.focus();
}

export async function openEnglishPrintPreviewWindow(options: {
  title?: string;
  element?: HTMLElement | null;
  html?: string;
  landscape?: boolean;
  aiTranslate?: (text: string) => Promise<string>;
}) {
  const sourceHtml = options.element
    ? buildPrintableHtmlFromElement(options.element)
    : String(options.html || "");

  if (!sourceHtml) return false;

  const translatedHtml = await translateHtmlContentToEnglish(sourceHtml, {
    aiTranslate: options.aiTranslate,
  });
  const translatedTitle = options.title
    ? await translateTextToEnglish(options.title, {
        aiTranslate: options.aiTranslate,
      })
    : "English Print Preview";

  return openPrintPreviewWindow({
    title: translatedTitle,
    html: translatedHtml,
    landscape: options.landscape,
    language: "en-US",
    closeLabel: "Close",
    printLabel: "Print",
  });
}
