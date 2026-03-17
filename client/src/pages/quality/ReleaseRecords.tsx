import { useEffect, useMemo, useState } from "react";
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
import { formatDateTime, formatDateValue } from "@/lib/formatters";
import { Eye, FileCheck, MoreHorizontal, Search } from "lucide-react";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";

type ReleaseDecision = "approve" | "supplement" | "reject";

interface ReleaseReviewItem {
  itemName: string;
  reviewStandard: string;
  decision: "qualified" | "unqualified";
}

interface ReleaseForm {
  releaseQty: string;
  reviewItems: ReleaseReviewItem[];
  decision: ReleaseDecision;
  remark: string;
}

interface ReleaseRow {
  id: number;
  inspectionNo: string;
  releaseNo: string;
  productName: string;
  batchNo: string;
  sterilizationBatchNo?: string;
  inspector: string;
  inspectionDate?: string;
  releaseForm: ReleaseForm;
  updatedAt?: string;
}

const PAGE_SIZE = 10;

const releaseDecisionMap: Record<ReleaseDecision, { label: string; variant: "outline" | "default" | "secondary"; className: string }> = {
  approve: { label: "同意放行", variant: "default", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  supplement: { label: "补充资料后放行", variant: "secondary", className: "bg-amber-50 text-amber-700 border-amber-200" },
  reject: { label: "不同意放行", variant: "outline", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

function parseJsonObject(raw: unknown) {
  if (!raw) return {};
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

function getReleaseNo(inspectionNo: string) {
  if (!inspectionNo) return "自动生成";
  return inspectionNo.replace(/^OQC-/, "FX-");
}

function normalizeReleaseForm(raw: unknown): ReleaseForm | null {
  const form = parseJsonObject(raw);
  if (Object.keys(form).length === 0) return null;
  return {
    releaseQty: String(form.releaseQty || ""),
    reviewItems: Array.isArray(form.reviewItems) ? form.reviewItems : [],
    decision: String(form.decision || "approve") as ReleaseDecision,
    remark: String(form.remark || ""),
  };
}

function FieldRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid min-h-10 grid-cols-[112px_1fr] border-b border-slate-200 text-sm last:border-0">
      <span className="flex items-center bg-slate-50 px-3 text-slate-500">{label}</span>
      <span className="flex items-center px-3 font-medium text-slate-800">{value || "-"}</span>
    </div>
  );
}

export default function ReleaseRecordsPage() {
  const { data: inspectionsRaw = [], isLoading } = trpc.qualityInspections.list.useQuery({ type: "OQC" });

  const rows = useMemo<ReleaseRow[]>(
    () =>
      ((inspectionsRaw as any[]) || [])
        .map((record: any) => {
          const extra = parseJsonObject(record.remark);
          const releaseForm = normalizeReleaseForm(extra.releaseForm);
          if (!releaseForm) return null;
          return {
            id: Number(record.id),
            inspectionNo: String(record.inspectionNo || ""),
            releaseNo: getReleaseNo(String(record.inspectionNo || "")),
            productName: String(record.productName || ""),
            batchNo: String(record.batchNo || ""),
            sterilizationBatchNo: String(record.sterilizationBatchNo || ""),
            inspector: String(record.inspector || ""),
            inspectionDate: String(record.inspectionDate || ""),
            updatedAt: String(record.updatedAt || record.createdAt || ""),
            releaseForm,
          };
        })
        .filter(Boolean) as ReleaseRow[],
    [inspectionsRaw],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<ReleaseRow | null>(null);

  const filteredRows = rows.filter((row) => {
    const keyword = searchTerm.toLowerCase();
    const matchesSearch =
      String(row.releaseNo || "").toLowerCase().includes(keyword) ||
      String(row.inspectionNo || "").toLowerCase().includes(keyword) ||
      String(row.productName || "").toLowerCase().includes(keyword) ||
      String(row.batchNo || "").toLowerCase().includes(keyword) ||
      String(row.sterilizationBatchNo || "").toLowerCase().includes(keyword);
    const matchesDecision = decisionFilter === "all" || row.releaseForm.decision === decisionFilter;
    return matchesSearch && matchesDecision;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, decisionFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const approvedCount = rows.filter((row) => row.releaseForm.decision === "approve").length;
  const supplementCount = rows.filter((row) => row.releaseForm.decision === "supplement").length;

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">放行记录</h1>
            <p className="text-sm text-muted-foreground">按成品检验放行单生成批次级放行清单，统一查看放行结论和复核项</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">同意放行</p><p className="text-3xl font-bold text-emerald-600">{approvedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">附条件放行</p><p className="text-3xl font-bold text-amber-600">{supplementCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">总记录数</p><p className="text-3xl font-bold">{filteredRows.length}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="搜索放行单号、检验单号、产品名称、批号..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Select value={decisionFilter} onValueChange={setDecisionFilter}>
                <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="全部决定" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部决定</SelectItem>
                  <SelectItem value="approve">同意放行</SelectItem>
                  <SelectItem value="supplement">附条件放行</SelectItem>
                  <SelectItem value="reject">不同意放行</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-center">放行单号</TableHead>
                    <TableHead className="text-center">产品名称</TableHead>
                    <TableHead className="text-center">批号</TableHead>
                    <TableHead className="text-center">灭菌批号</TableHead>
                    <TableHead className="text-center">放行数量</TableHead>
                    <TableHead className="text-center">放行决定</TableHead>
                    <TableHead className="text-center">更新时间</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        {isLoading ? "加载中..." : "暂无放行记录"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-center font-mono text-xs">{row.releaseNo}</TableCell>
                        <TableCell className="text-center">{row.productName || "-"}</TableCell>
                        <TableCell className="text-center font-mono">{row.batchNo || "-"}</TableCell>
                        <TableCell className="text-center font-mono">{row.sterilizationBatchNo || "-"}</TableCell>
                        <TableCell className="text-center">{row.releaseForm.releaseQty || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={releaseDecisionMap[row.releaseForm.decision]?.variant || "outline"} className={releaseDecisionMap[row.releaseForm.decision]?.className || ""}>
                            {releaseDecisionMap[row.releaseForm.decision]?.label || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{formatDateValue(row.updatedAt, true)}</TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => { setSelected(row); setViewOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4" /> 查看详情
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePaginationFooter total={filteredRows.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
          </CardContent>
        </Card>

        <DraggableDialog open={viewOpen} onOpenChange={setViewOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[88vh] overflow-y-auto">
            {selected && (
              <div className="space-y-4">
                {(() => {
                  const releasePrintData = {
                    releaseNo: selected.releaseNo || "",
                    inspectionNo: selected.inspectionNo || "",
                    productName: selected.productName || "",
                    batchNo: selected.batchNo || "",
                    sterilizationBatchNo: selected.sterilizationBatchNo || "",
                    inspector: selected.inspector || "",
                    inspectionDate: selected.inspectionDate || "",
                    decision: releaseDecisionMap[selected.releaseForm.decision]?.label || "",
                    releaseQty: selected.releaseForm.releaseQty || "",
                    remark: selected.releaseForm.remark || "",
                    reviewItems: (selected.releaseForm.reviewItems || []).map((item) => ({
                      itemName: item.itemName || "",
                      reviewStandard: item.reviewStandard || "",
                      decision: item.decision === "qualified" ? "符合" : "不符合",
                    })),
                  };
                  return (
                    <>
                <DialogHeader>
                  <DialogTitle>放行记录详情</DialogTitle>
                  <DialogDescription>{selected.releaseNo}</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-x-8 border border-slate-200">
                  <FieldRow label="放行单号" value={selected.releaseNo} />
                  <FieldRow label="检验单号" value={selected.inspectionNo} />
                  <FieldRow label="产品名称" value={selected.productName} />
                  <FieldRow label="批号" value={selected.batchNo} />
                  <FieldRow label="灭菌批号" value={selected.sterilizationBatchNo || "-"} />
                  <FieldRow label="检验员" value={selected.inspector || "-"} />
                  <FieldRow label="检验日期" value={formatDateValue(selected.inspectionDate)} />
                  <FieldRow label="放行决定" value={releaseDecisionMap[selected.releaseForm.decision]?.label || "-"} />
                  <FieldRow label="放行数量" value={selected.releaseForm.releaseQty || "-"} />
                  <FieldRow label="更新时间" value={formatDateTime(selected.updatedAt)} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">复核项目</p>
                  <div className="rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-center">项目</TableHead>
                          <TableHead className="text-center">复核标准</TableHead>
                          <TableHead className="text-center">结论</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selected.releaseForm.reviewItems || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">暂无复核项目</TableCell>
                          </TableRow>
                        ) : (
                          (selected.releaseForm.reviewItems || []).map((item, index) => (
                            <TableRow key={`${selected.id}-${index}`}>
                              <TableCell className="text-center">{item.itemName || "-"}</TableCell>
                              <TableCell className="text-center text-slate-600">{item.reviewStandard || "-"}</TableCell>
                              <TableCell className="text-center">{item.decision === "qualified" ? "符合" : "不符合"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">放行备注</p>
                  <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">{selected.releaseForm.remark || "-"}</div>
                </div>

                <DialogFooter>
                  <TemplatePrintPreviewButton
                    templateKey="release_record"
                    data={releasePrintData}
                    title={`放行记录打印预览 - ${selected.releaseNo}`}
                  />
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
