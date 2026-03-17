import React, { useRef } from 'react';
import { formatDate, formatDateTime } from "@/lib/formatters";
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";

interface PrintTemplateProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showPrintButton?: boolean;
  landscape?: boolean;
  paperSize?: string;
  orientation?: "portrait" | "landscape";
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}

function getPaperMetrics(paperSize = "A4", orientation: "portrait" | "landscape" = "portrait") {
  const base = (() => {
    switch (paperSize) {
      case "A5":
        return { widthMm: 148, heightMm: 210 };
      case "Letter":
        return { widthMm: 216, heightMm: 279 };
      case "A4":
      default:
        return { widthMm: 210, heightMm: 297 };
    }
  })();

  return orientation === "landscape"
    ? { widthMm: base.heightMm, heightMm: base.widthMm }
    : base;
}

export function PrintTemplate({
  open,
  onClose,
  title,
  children,
  showPrintButton = true,
  landscape = false,
  paperSize = "A4",
  orientation,
  marginTop = 12,
  marginRight = 14,
  marginBottom = 12,
  marginLeft = 14,
}: PrintTemplateProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const resolvedOrientation = orientation || (landscape ? "landscape" : "portrait");
  const paperMetrics = getPaperMetrics(paperSize, resolvedOrientation);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title></title>
          <style>
            ${styles}

            :root {
              --print-sheet-width: ${paperMetrics.widthMm}mm;
              --print-sheet-min-height: ${paperMetrics.heightMm}mm;
            }

            @page {
              size: ${paperSize} ${resolvedOrientation};
              margin: ${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px;
            }
            
            @media print {
              body { margin: 0; padding: 0; background: #fff; }
              .no-print { display: none !important; }
              .print-preview-shell {
                background: #fff !important;
                padding: 0 !important;
                box-shadow: none !important;
              }
              .print-sheet {
                width: auto;
                min-height: auto;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                box-shadow: none !important;
                border: none !important;
                font-size: 12.5px;
                line-height: 1.5;
              }
              .print-section { page-break-inside: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
            
            @media screen {
              body { background: #eef2f7; padding: 20px; }
              .print-preview-shell {
                display: flex;
                justify-content: center;
                background: #eef2f7;
                padding: 16px 0;
              }
              .print-sheet {
                width: var(--print-sheet-width);
                min-height: var(--print-sheet-min-height);
                box-sizing: border-box;
                background: #fff;
                padding: ${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px;
                box-shadow: 0 12px 36px rgba(15,23,42,0.12);
                border: 1px solid rgba(148,163,184,0.2);
                font-size: 12.5px;
                line-height: 1.5;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-preview-shell">
            <div class="print-sheet">
              ${printContent.innerHTML}
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <DraggableDialog
      open={open}
      onOpenChange={onClose}
      printable={false}
      defaultWidth={resolvedOrientation === "landscape" ? 1260 : 860}
      defaultHeight={900}
      minWidth={resolvedOrientation === "landscape" ? 1080 : 760}
      minHeight={700}
      maxWidth="96vw"
      maxHeight="96vh"
      enableSearch={false}
      className="overflow-hidden p-0"
    >
      <DraggableDialogContent className="flex h-full flex-col p-0">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b px-6 py-4 no-print">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            {showPrintButton && (
              <Button onClick={handlePrint} size="sm" className="gap-2">
                <Printer className="h-4 w-4" />
                打印
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="print-preview-shell flex-1 overflow-y-auto bg-slate-100 px-4 py-6">
          <div
            ref={printRef}
            className="print-sheet mx-auto shrink-0 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.12)]"
            style={{
              width: `${paperMetrics.widthMm}mm`,
              minHeight: `${paperMetrics.heightMm}mm`,
              paddingTop: marginTop,
              paddingRight: marginRight,
              paddingBottom: marginBottom,
              paddingLeft: marginLeft,
              boxSizing: "border-box",
            }}
          >
            {children}
          </div>
        </div>
      </DraggableDialogContent>
    </DraggableDialog>
  );
}

export function PrintHeader({
  companyName = '医疗器械有限公司',
  documentTitle,
  documentNumber,
  date,
}: {
  companyName?: string;
  documentTitle: string;
  documentNumber?: string;
  date?: string;
}) {
  return (
    <div className="print-section mb-8 text-center border-b pb-6">
      <h1 className="text-3xl font-bold mb-2">{companyName}</h1>
      <h2 className="text-2xl font-semibold mb-4">{documentTitle}</h2>
      <div className="flex justify-between text-sm text-gray-600 max-w-2xl mx-auto">
        {documentNumber && (
          <div>
            <span className="font-medium">单据编号：</span>
            <span>{documentNumber}</span>
          </div>
        )}
        {date && (
          <div>
            <span className="font-medium">日期：</span>
            <span>{date}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="print-section mb-6">
      <h3 className="text-lg font-semibold mb-3 pb-2 border-b">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

export function PrintInfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex py-2 border-b border-gray-100">
      <span className="font-medium text-gray-700 w-32 flex-shrink-0">{label}：</span>
      <span className="text-gray-900 flex-1">{value || '-'}</span>
    </div>
  );
}

export function PrintTable({
  columns,
  data,
}: {
  columns: Array<{ key: string; label: string; width?: string; align?: 'left' | 'center' | 'right' }>;
  data: Array<Record<string, any>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="border border-gray-300 px-4 py-2 text-left font-semibold"
                style={{ width: col.width, textAlign: col.align || 'left' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                暂无数据
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="border border-gray-300 px-4 py-2"
                    style={{ textAlign: col.align || 'left' }}
                  >
                    {row[col.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}


export function PrintFooter({
  signatures = ['制单人', '审核人', '批准人'],
  notes,
}: {
  signatures?: string[];
  notes?: string;
}) {
  return (
    <div className="print-section mt-8">
      {notes && (
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <div className="font-medium mb-2">备注：</div>
          <div className="text-gray-700 whitespace-pre-wrap">{notes}</div>
        </div>
      )}
      <div className="flex justify-around pt-6 border-t">
        {signatures.map((sig) => (
          <div key={sig} className="text-center">
            <div className="font-medium mb-2">{sig}：</div>
            <div className="border-b border-gray-400 w-32 h-8"></div>
          </div>
        ))}
      </div>
      <div className="text-center text-xs text-gray-500 mt-8">
        打印时间：{formatDateTime(new Date())}
      </div>
    </div>
  );
}
