import { useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { formatDateTime, formatDisplayNumber } from "@/lib/formatters";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Search,
} from "lucide-react";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";

const PAGE_SIZE = 10;

const statusMap = {
  generated: { label: "待处理", variant: "outline" as const, className: "bg-amber-50 text-amber-700 border-amber-200" },
  processed: { label: "已处理", variant: "default" as const, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function getStatusMeta(status: unknown) {
  const key = String(status || "") as keyof typeof statusMap;
  return statusMap[key] || statusMap.generated;
}

function parseJsonArray(raw: unknown) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatQty(value: unknown) {
  const num = Number(String(value ?? "").trim());
  return Number.isFinite(num) ? formatDisplayNumber(num) : String(value ?? "-");
}

function FieldRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid min-h-10 grid-cols-[112px_1fr] border-b border-slate-200 text-sm last:border-0">
      <span className="flex items-center bg-slate-50 px-3 text-slate-500">{label}</span>
      <span className="flex items-center px-3 font-medium text-slate-800">{value || "-"}</span>
    </div>
  );
}

export default function PendingScrapRecordsPage() {
  const { data: records = [], isLoading, refetch } = trpc.productionScrapDisposals.list.useQuery({});
  const processMutation = trpc.productionScrapDisposals.upsert.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("待报废记录已确认处理");
      setViewOpen(false);
    },
    onError: (error) => toast.error("处理失败", { description: error.message }),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const filteredRecords = useMemo(
    () =>
      ((records as any[]) || []).filter((record: any) => {
        const keyword = searchTerm.toLowerCase();
        const matchesSearch =
          !keyword ||
          String(record.disposalNo || "").toLowerCase().includes(keyword) ||
          String(record.batchNo || "").toLowerCase().includes(keyword) ||
          String(record.productName || "").toLowerCase().includes(keyword) ||
          String(record.productionOrderNo || "").toLowerCase().includes(keyword);
        const matchesStatus = statusFilter === "all" || String(record.status || "") === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [records, searchTerm, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pagedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pendingCount = filteredRecords.filter((record: any) => String(record.status || "") === "generated").length;
  const processedCount = filteredRecords.filter((record: any) => String(record.status || "") === "processed").length;

  const handleProcess = (record: any) => {
    processMutation.mutate({
      disposalNo: String(record.disposalNo || ""),
      batchNo: String(record.batchNo || ""),
      productionOrderId: record.productionOrderId == null ? undefined : Number(record.productionOrderId),
      productionOrderNo: String(record.productionOrderNo || ""),
      productId: record.productId == null ? undefined : Number(record.productId),
      productName: String(record.productName || ""),
      totalScrapQty: String(record.totalScrapQty || ""),
      costQty: String(record.costQty || ""),
      unit: String(record.unit || ""),
      detailItems: String(record.detailItems || "[]"),
      status: "processed",
      remark: String(record.remark || ""),
    });
  };

  return (
    <ERPLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 p-3 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">待报废记录</h1>
              <p className="text-sm text-muted-foreground">统一管理已判定报废、仍留在暂存区待处理的批次记录</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> 刷新
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">待处理</p><p className="text-3xl font-bold text-amber-600">{pendingCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已处理</p><p className="text-3xl font-bold text-emerald-600">{processedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">总记录数</p><p className="text-3xl font-bold">{filteredRecords.length}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="搜索处理单号、批号、产品名称、生产指令..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="全部状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="generated">待处理</SelectItem>
                  <SelectItem value="processed">已处理</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-center">处理单号</TableHead>
                    <TableHead className="text-center">产品名称</TableHead>
                    <TableHead className="text-center">批号</TableHead>
                    <TableHead className="text-center">关联指令</TableHead>
                    <TableHead className="text-center">报废总数</TableHead>
                    <TableHead className="text-center">状态</TableHead>
                    <TableHead className="text-center">更新时间</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        {isLoading ? "加载中..." : "暂无待报废记录"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedRecords.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-center font-mono">{record.disposalNo || "-"}</TableCell>
                        <TableCell className="text-center">{record.productName || "-"}</TableCell>
                        <TableCell className="text-center font-mono">{record.batchNo || "-"}</TableCell>
                        <TableCell className="text-center font-mono">{record.productionOrderNo || "-"}</TableCell>
                        <TableCell className="text-center">{record.totalScrapQty != null ? `${formatQty(record.totalScrapQty)} ${record.unit || ""}` : "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getStatusMeta(record.status).variant} className={getStatusMeta(record.status).className}>
                            {getStatusMeta(record.status).label || record.status || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{record.updatedAt ? formatDateTime(record.updatedAt) : "-"}</TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => { setSelected(record); setViewOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4" /> 查看详情
                              </DropdownMenuItem>
                              {String(record.status || "") === "generated" && (
                                <DropdownMenuItem onSelect={() => handleProcess(record)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" /> 确认处理
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <TablePaginationFooter total={filteredRecords.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
          </CardContent>
        </Card>

        <DraggableDialog open={viewOpen} onOpenChange={setViewOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[88vh] overflow-y-auto">
            {selected && (
              <div className="space-y-4">
                {(() => {
                  const scrapPrintData = {
                    disposalNo: selected.disposalNo || "",
                    status: getStatusMeta(selected.status).label || selected.status || "",
                    productName: selected.productName || "",
                    batchNo: selected.batchNo || "",
                    productionOrderNo: selected.productionOrderNo || "",
                    totalScrapQty: formatQty(selected.totalScrapQty),
                    costQty: formatQty(selected.costQty),
                    unit: selected.unit || "",
                    remark: String(selected.remark || ""),
                    detailItems: parseJsonArray(selected.detailItems).map((item: any) => ({
                      processName: item.processName || item.process || "",
                      scrapQty: formatQty(item.scrapQty),
                      actualQty: formatQty(item.actualQty),
                      recordCount: Number(item.recordCount || 0),
                      unit: selected.unit || "",
                    })),
                  };
                  return (
                    <>
                <DialogHeader>
                  <DialogTitle>待报废记录详情</DialogTitle>
                  <DialogDescription>{selected.disposalNo || "-"}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-x-8 border border-slate-200">
                  <FieldRow label="处理单号" value={selected.disposalNo || "-"} />
                  <FieldRow label="状态" value={getStatusMeta(selected.status).label || selected.status || "-"} />
                  <FieldRow label="产品名称" value={selected.productName || "-"} />
                  <FieldRow label="生产批号" value={selected.batchNo || "-"} />
                  <FieldRow label="生产指令" value={selected.productionOrderNo || "-"} />
                  <FieldRow label="报废总数" value={selected.totalScrapQty != null ? `${formatQty(selected.totalScrapQty)} ${selected.unit || ""}` : "-"} />
                  <FieldRow label="成本数量" value={selected.costQty != null ? `${formatQty(selected.costQty)} ${selected.unit || ""}` : "-"} />
                  <FieldRow label="更新时间" value={selected.updatedAt ? formatDateTime(selected.updatedAt) : "-"} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">报废明细</p>
                  <div className="rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-center">工序名称</TableHead>
                          <TableHead className="text-center">报废数量</TableHead>
                          <TableHead className="text-center">合格数量</TableHead>
                          <TableHead className="text-center">记录次数</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parseJsonArray(selected.detailItems).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">暂无报废明细</TableCell>
                          </TableRow>
                        ) : (
                          parseJsonArray(selected.detailItems).map((item: any, index: number) => (
                            <TableRow key={`${selected.id}-${index}`}>
                              <TableCell className="text-center">{item.processName || item.process || "-"}</TableCell>
                              <TableCell className="text-center">{item.scrapQty != null ? `${formatQty(item.scrapQty)} ${selected.unit || ""}` : "-"}</TableCell>
                              <TableCell className="text-center">{item.actualQty != null ? `${formatQty(item.actualQty)} ${selected.unit || ""}` : "-"}</TableCell>
                              <TableCell className="text-center">{item.recordCount ?? "-"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <DialogFooter>
                  <TemplatePrintPreviewButton
                    templateKey="pending_scrap_record"
                    data={scrapPrintData}
                    title={`待报废记录打印预览 - ${selected.disposalNo || ""}`}
                  />
                  {String(selected.status || "") === "generated" && (
                    <Button
                      onClick={() => handleProcess(selected)}
                      disabled={processMutation.isPending}
                    >
                      确认处理
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setViewOpen(false)}>关闭</Button>
                </DialogFooter>
                    </>
                  );
                })()}
              </div>
            )}
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
