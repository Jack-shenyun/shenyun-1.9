import { Button } from "@/components/ui/button";

interface TablePaginationFooterProps {
  total: number;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export default function TablePaginationFooter({
  total,
  page,
  pageSize = 10,
  onPageChange,
}: TablePaginationFooterProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between rounded-b-lg border-t bg-card px-4 py-3">
      <div className="text-sm text-muted-foreground">
        显示 {start} - {end} 条，共 {total} 条，第 {page} / {totalPages} 页
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
