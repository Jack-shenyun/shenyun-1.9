import React, { useRef } from 'react';
import { formatDate, formatDateTime } from "@/lib/formatters";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, X } from 'lucide-react';

interface PrintTemplateProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showPrintButton?: boolean;
}

export function PrintTemplate({
  open,
  onClose,
  title,
  children,
  showPrintButton = true,
}: PrintTemplateProps) {
  const printRef = useRef<HTMLDivElement>(null);

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
          <title>${title}</title>
          <style>
            ${styles}
            
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none !important; }
              .print-container { max-width: 100%; margin: 0 auto; }
              .print-section { page-break-inside: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
            
            @media screen {
              body { background: #f5f5f5; padding: 20px; }
              .print-container {
                background: white;
                padding: 40px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                max-width: 210mm;
                margin: 0 auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent.innerHTML}
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b no-print">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            {showPrintButton && (
              <Button onClick={handlePrint} size="sm" className="gap-2">
                <Printer className="h-4 w-4" />
                打印
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div ref={printRef} className="print-content py-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
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
