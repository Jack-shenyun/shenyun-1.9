import { useEffect, useMemo, useState } from "react";
import { formatDateValue as formatDateText, formatDisplayNumber, roundToDigits } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowRightLeft, Plus, Search, MoreHorizontal, Edit, Trash2, Eye, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { processMatchesProduct } from "@/lib/productionProcessMatching";
import { loadProductionProcessTemplates } from "@/pages/production/Process";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  in_process:           { label: "工序中",     variant: "default" },
  pending_sterilization:{ label: "待委外灭菌", variant: "outline" },
  sterilizing:          { label: "灭菌中",     variant: "default" },
  completed:            { label: "已完成",     variant: "secondary" },
};

const formatDateValue = (value: unknown) => formatDateText(value) || "-";

const parseNumberValue = (value: unknown) => {
  const num = Number(String(value ?? "").trim());
  return Number.isFinite(num) ? num : 0;
};

const buildRecordTime = (recordDate?: unknown, recordTime?: unknown) =>
  new Date(`${String(recordDate || "1970-01-01").slice(0, 10)}T${String(recordTime || "00:00") || "00:00"}`).getTime();

const formatQtyText = (value: unknown) => {
  const num = parseNumberValue(value);
  if (!Number.isFinite(num)) return "-";
  return formatDisplayNumber(num);
};

const normalizeQtyInputValue = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const num = Number(text);
  if (!Number.isFinite(num)) return text;
  return formatDisplayNumber(num);
};

const deriveProcessStatus = (totalActualQty: unknown, plannedQty: unknown, hasAbnormal = false) => {
  const actual = parseNumberValue(totalActualQty);
  const planned = parseNumberValue(plannedQty);
  if (planned > 0 && actual >= planned) return "completed";
  if (hasAbnormal) return "abnormal";
  return actual > 0 ? "in_progress" : "pending";
};

const buildScrapDisposalNo = (batchNo: string) => `SD-${String(batchNo || "").replace(/[^A-Za-z0-9]/g, "")}`;

export default function ProductionRoutingCardPage() {
  const PAGE_SIZE = 10;
  const { canDelete } = usePermission();
  const { data: cards = [], isLoading, refetch } = trpc.productionRoutingCards.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});
  const { data: productionRecords = [], isLoading: productionRecordsLoading } = trpc.productionRecords.list.useQuery({ limit: 2000 });
  const { data: sterilizationOrders = [], isLoading: sterilizationLoading } = trpc.sterilizationOrders.list.useQuery({ limit: 1000 });

  const createMutation = trpc.productionRoutingCards.create.useMutation({
    onSuccess: () => { refetch(); toast.success("流转单已创建"); setDialogOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.productionRoutingCards.update.useMutation({
    onSuccess: () => { refetch(); toast.success("流转单已更新"); setDialogOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.productionRoutingCards.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("流转单已删除"); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });
  const scrapDisposalMutation = trpc.productionScrapDisposals.upsert.useMutation({
    onSuccess: () => {
      toast.success("报废处理单已生成");
      refetchScrapDisposal();
    },
    onError: (e) => toast.error("生成报废处理单失败", { description: e.message }),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [viewingCard, setViewingCard] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { data: scrapDisposal, refetch: refetchScrapDisposal } = trpc.productionScrapDisposals.getByBatchNo.useQuery(
    { batchNo: String(viewingCard?.batchNo || "") },
    { enabled: !!viewingCard?.batchNo }
  );

  const processTemplates = useMemo(
    () => loadProductionProcessTemplates().filter((item) => item.status === "active"),
    [],
  );
  const getProcessTemplatesForProduct = (productName: string) =>
    [...processTemplates]
      .filter((item) => processMatchesProduct(item, productName))
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return String(a.processName || "").localeCompare(String(b.processName || ""), "zh-CN");
      });

  const [formData, setFormData] = useState({
    cardNo: "",
    productionOrderId: "",
    productionOrderNo: "",
    productId: "",
    productName: "",
    batchNo: "",
    quantity: "",
    unit: "件",
    currentProcess: "",
    nextProcess: "",
    needsSterilization: false,
    status: "in_process" as "in_process" | "pending_sterilization" | "sterilizing" | "completed",
    remark: "",
  });

  const aggregatedCards = useMemo(() => {
    const orderMap = new Map(
      (productionOrders as any[]).map((item: any) => [Number(item.id), item]),
    );
    const productMap = new Map(
      (products as any[]).map((item: any) => [Number(item.id), item]),
    );
    const grouped = new Map<string, any[]>();

    (productionRecords as any[]).forEach((record: any) => {
      const batchNo = String(record.batchNo || "").trim();
      if (!batchNo) return;
      const list = grouped.get(batchNo) || [];
      list.push(record);
      grouped.set(batchNo, list);
    });

    return Array.from(grouped.entries())
      .map(([batchNo, rows]) => {
        const sortedRows = [...rows].sort((a: any, b: any) => {
          return buildRecordTime(a.recordDate, a.recordTime) - buildRecordTime(b.recordDate, b.recordTime);
        });
        const firstRow = sortedRows[0];
        const linkedOrder =
          orderMap.get(Number(firstRow?.productionOrderId || 0)) ||
          (productionOrders as any[]).find((item: any) => String(item.orderNo || "") === String(firstRow?.productionOrderNo || "")) ||
          (productionOrders as any[]).find((item: any) => String(item.batchNo || "") === batchNo) ||
          null;
        const linkedProduct =
          productMap.get(Number(linkedOrder?.productId || firstRow?.productId || 0)) || null;
        const productName = String(linkedProduct?.name || firstRow?.productName || "");
        const templateList = getProcessTemplatesForProduct(productName);
        const processSortMap = new Map(
          templateList.map((item: any) => [String(item.processName || ""), Number(item.sortOrder || 0)]),
        );
        const processMap = new Map<string, any>();

        sortedRows.forEach((row: any) => {
          const processName = String(row.processName || row.workstationName || "").trim();
          if (!processName) return;
          const rowTime = buildRecordTime(row.recordDate, row.recordTime);
          const actualQty = parseNumberValue(row.actualQty);
          const scrapQty = parseNumberValue(row.scrapQty);
          const plannedQty = Math.max(
            parseNumberValue(row.plannedQty),
            parseNumberValue(linkedOrder?.plannedQty)
          );
          const existing = processMap.get(processName);

          if (!existing) {
            processMap.set(processName, {
              processName,
              processType: row.processType || "",
              workshopName: row.workshopName || "",
              productionTeam: row.productionTeam || "",
              operator: row.operator || "",
              recordNo: row.recordNo || "",
              recordDate: row.recordDate,
              recordTime: row.recordTime || "",
              actualQty,
              scrapQty,
              plannedQty,
              recordCount: 1,
              hasAbnormal: String(row.status || "") === "abnormal",
              _sortOrder: processSortMap.get(processName) ?? 9999,
              _sortTime: rowTime,
              status: "in_progress",
            });
            return;
          }

          existing.actualQty = roundToDigits(existing.actualQty + actualQty, 4);
          existing.scrapQty = roundToDigits(existing.scrapQty + scrapQty, 4);
          existing.plannedQty = Math.max(existing.plannedQty, plannedQty);
          existing.recordCount += 1;
          existing.hasAbnormal = existing.hasAbnormal || String(row.status || "") === "abnormal";
          if (rowTime >= existing._sortTime) {
            existing.processType = row.processType || existing.processType;
            existing.workshopName = row.workshopName || existing.workshopName;
            existing.productionTeam = row.productionTeam || existing.productionTeam;
            existing.operator = row.operator || existing.operator;
            existing.recordNo = row.recordNo || existing.recordNo;
            existing.recordDate = row.recordDate;
            existing.recordTime = row.recordTime || "";
            existing._sortTime = rowTime;
          }
        });

        processMap.forEach((item) => {
          item.status = deriveProcessStatus(item.actualQty, item.plannedQty, item.hasAbnormal);
        });

        const recordedProcessList = Array.from(processMap.values()).sort((a: any, b: any) => {
          if (a._sortOrder !== b._sortOrder) return a._sortOrder - b._sortOrder;
          return a._sortTime - b._sortTime;
        });
        const processList = templateList.length > 0
          ? templateList.map((template: any) => {
              const matched = processMap.get(String(template.processName || ""));
              if (matched) return matched;
              return {
                processName: template.processName || "",
                processType: template.processType || "",
                workshopName: template.workshop || "",
                productionTeam: template.team || "",
                operator: template.operator || "",
                recordNo: "",
                recordDate: "",
                recordTime: "",
                actualQty: 0,
                scrapQty: 0,
                plannedQty: Math.max(parseNumberValue(linkedOrder?.plannedQty), parseNumberValue(firstRow?.plannedQty)),
                recordCount: 0,
                hasAbnormal: false,
                status: "pending",
                _sortOrder: Number(template.sortOrder || 9999),
                _sortTime: Number.MAX_SAFE_INTEGER,
              };
            })
          : recordedProcessList;
        const nextTemplate = processList.find((item: any) => String(item.status || "") === "pending");
        const batchSterilizationOrders = (sterilizationOrders as any[]).filter(
          (item: any) => String(item.batchNo || "") === batchNo,
        );
        const needsSterilization = Boolean(linkedProduct?.isMedicalDevice) || batchSterilizationOrders.length > 0;
        const inProgressProcess = processList.find((item: any) => ["in_progress", "abnormal"].includes(String(item.status || "")));
        const lastCompletedProcess = [...processList].reverse().find((item: any) => String(item.status || "") === "completed");
        const lastStartedProcess = [...processList].reverse().find((item: any) => Number(item.recordCount || 0) > 0);
        const finalProcess = processList.length > 0 ? processList[processList.length - 1] : lastStartedProcess;
        const completedQty = parseNumberValue(finalProcess?.actualQty);
        const plannedQty = Math.max(parseNumberValue(linkedOrder?.plannedQty), parseNumberValue(firstRow?.plannedQty));
        const totalScrapQty = processList.reduce((sum: number, item: any) => sum + parseNumberValue(item.scrapQty), 0);
        const routeCompleted = templateList.length > 0
          ? processList.every((item: any) => String(item.status || "") === "completed")
          : recordedProcessList.length > 0 && recordedProcessList.every((item: any) => String(item.status || "") === "completed");

        let status: "in_process" | "pending_sterilization" | "sterilizing" | "completed" = "in_process";
        if (batchSterilizationOrders.some((item: any) => ["sent", "processing", "arrived"].includes(String(item.status || "")))) {
          status = "sterilizing";
        } else if (batchSterilizationOrders.some((item: any) => ["returned", "qualified"].includes(String(item.status || "")))) {
          status = "completed";
        } else if (needsSterilization && routeCompleted) {
          status = "pending_sterilization";
        } else if (!needsSterilization && routeCompleted) {
          status = "completed";
        }

        const currentProcess =
          status === "sterilizing"
            ? "委外灭菌"
            : String(inProgressProcess?.processName || lastStartedProcess?.processName || lastCompletedProcess?.processName || processList[0]?.processName || "-");
        const nextProcess =
          status === "sterilizing"
            ? "灭菌完成"
            : nextTemplate?.processName
              ? String(nextTemplate.processName)
              : needsSterilization && status !== "completed"
                ? "委外灭菌"
                : "入库";

        return {
          id: `routing-${batchNo}`,
          cardNo: `RC-${batchNo}`,
          productionOrderId: linkedOrder?.id ?? firstRow?.productionOrderId ?? null,
          productionOrderNo: linkedOrder?.orderNo || firstRow?.productionOrderNo || "",
          productId: linkedProduct?.id ?? linkedOrder?.productId ?? firstRow?.productId ?? null,
          productName: productName || "-",
          batchNo,
          plannedQty: formatQtyText(plannedQty),
          completedQty: formatQtyText(completedQty),
          quantity: formatQtyText(completedQty || plannedQty),
          unit: String(linkedOrder?.unit || linkedProduct?.unit || "件"),
          currentProcess,
          nextProcess,
          needsSterilization,
          status,
          totalScrapQty: formatQtyText(totalScrapQty),
          scrapSummary: processList
            .filter((item: any) => parseNumberValue(item.scrapQty) > 0)
            .map((item: any) => ({
              processName: item.processName || "",
              scrapQty: formatQtyText(item.scrapQty),
              actualQty: formatQtyText(item.actualQty),
              recordCount: Number(item.recordCount || 0),
            })),
          remark: processList.map((item: any) => item.processName).join(" -> "),
          processList,
          sterilizationList: batchSterilizationOrders,
          createdAt: linkedOrder?.createdAt || firstRow?.createdAt || null,
        };
      })
      .sort((a: any, b: any) => {
        const aTime = new Date(String(a.createdAt || 0)).getTime();
        const bTime = new Date(String(b.createdAt || 0)).getTime();
        return bTime - aTime;
      });
  }, [processTemplateMap, products, productionOrders, productionRecords, sterilizationOrders]);

  const filteredCards = aggregatedCards.filter((c) => {
    const matchSearch = !searchTerm ||
      String(c.cardNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.batchNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / PAGE_SIZE));
  const pagedCards = filteredCards.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filteredCards.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleAdd = () => {
    setEditingCard(null);
    setFormData({
      cardNo: "",
      productionOrderId: "",
      productionOrderNo: "",
      productId: "",
      productName: "",
      batchNo: "",
      quantity: "",
      unit: "件",
      currentProcess: "",
      nextProcess: "",
      needsSterilization: false,
      status: "in_process",
      remark: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (card: any) => {
    setEditingCard(card);
    setFormData({
      cardNo: card.cardNo,
      productionOrderId: card.productionOrderId ? String(card.productionOrderId) : "",
      productionOrderNo: card.productionOrderNo || "",
      productId: card.productId ? String(card.productId) : "",
      productName: card.productName || "",
      batchNo: card.batchNo || "",
      quantity: card.quantity || "",
      unit: card.unit || "件",
      currentProcess: card.currentProcess || "",
      nextProcess: card.nextProcess || "",
      needsSterilization: card.needsSterilization || false,
      status: card.status || "in_process",
      remark: card.remark || "",
    });
    setDialogOpen(true);
  };

  const handleView = (card: any) => {
    setViewingCard(card);
    setViewDialogOpen(true);
  };

  const handleDelete = (card: any) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: card.id });
  };

  const handleProductionOrderChange = (poId: string) => {
    const po = (productionOrders as any[]).find((p) => String(p.id) === poId);
    setFormData((f) => ({
      ...f,
      productionOrderId: poId,
      productionOrderNo: po?.orderNo || "",
      productId: po?.productId ? String(po.productId) : f.productId,
      batchNo: po?.batchNo || f.batchNo,
      quantity: normalizeQtyInputValue(po?.plannedQty) || f.quantity,
    }));
  };

  const handleProductChange = (productId: string) => {
    const product = (products as any[]).find((p) => String(p.id) === productId);
    setFormData((f) => ({ ...f, productId, productName: product?.name || "" }));
  };

  const handleSubmit = () => {
    const payload = {
      cardNo: formData.cardNo || undefined,
      productionOrderId: formData.productionOrderId ? Number(formData.productionOrderId) : undefined,
      productionOrderNo: formData.productionOrderNo || undefined,
      productId: formData.productId ? Number(formData.productId) : undefined,
      productName: formData.productName || undefined,
      batchNo: formData.batchNo || undefined,
      quantity: formData.quantity || undefined,
      unit: formData.unit || undefined,
      currentProcess: formData.currentProcess || undefined,
      nextProcess: formData.nextProcess || undefined,
      needsSterilization: formData.needsSterilization,
      status: formData.status,
      remark: formData.remark || undefined,
    };
    if (editingCard) {
      updateMutation.mutate({
        id: editingCard.id,
        data: {
          currentProcess: payload.currentProcess,
          nextProcess: payload.nextProcess,
          needsSterilization: payload.needsSterilization,
          status: payload.status,
          remark: payload.remark,
        },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleGenerateScrapDisposal = (card: any) => {
    const scrapSummary = (card.scrapSummary || []).filter((item: any) => parseNumberValue(item.scrapQty) > 0);
    if (scrapSummary.length === 0) {
      toast.warning("当前批号暂无报废数据");
      return;
    }
    scrapDisposalMutation.mutate({
      disposalNo: buildScrapDisposalNo(String(card.batchNo || "")),
      batchNo: String(card.batchNo || ""),
      productionOrderId: Number(card.productionOrderId || 0) || undefined,
      productionOrderNo: String(card.productionOrderNo || ""),
      productId: Number(card.productId || 0) || undefined,
      productName: String(card.productName || ""),
      totalScrapQty: formatQtyText(card.totalScrapQty),
      costQty: formatQtyText(card.totalScrapQty),
      unit: String(card.unit || ""),
      detailItems: JSON.stringify(scrapSummary),
      status: "generated",
      remark: `按生产批号 ${card.batchNo} 自动汇总生成`,
    });
  };
  const routingCardPrintData = useMemo(
    () =>
      viewingCard
        ? {
            cardNo: viewingCard.cardNo || "",
            productionOrderNo: viewingCard.productionOrderNo || "",
            productName: viewingCard.productName || "",
            batchNo: viewingCard.batchNo || "",
            quantity: Number(viewingCard.completedQty || 0),
            unit: viewingCard.unit || "",
            status: statusMap[viewingCard.status]?.label || viewingCard.status || "",
            remark: viewingCard.remark || "",
            processHistory: (viewingCard.processList || []).map((item: any) => ({
              processName: item.processName || "",
              operator: item.operator || "",
              startTime: [formatDateValue(item.recordDate), item.recordTime].filter(Boolean).join(" "),
              endTime: "",
              qualifiedQty: Number(item.actualQty || 0),
              unqualifiedQty: Number(item.scrapQty || 0),
              inspector: item.operator || "",
            })),
          }
        : null,
    [viewingCard],
  );

  const inProcessCount = aggregatedCards.filter((c: any) => c.status === "in_process").length;
  const pendingSterilizationCount = aggregatedCards.filter((c: any) => c.status === "pending_sterilization").length;
  const completedCount = aggregatedCards.filter((c: any) => c.status === "completed").length;
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => {
    const renderValue = (value: React.ReactNode): React.ReactNode => {
      if (value == null || value === "") return "-";
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      if (Array.isArray(value)) {
        const items = value
          .map((item) => item instanceof Date ? item.toISOString().slice(0, 10) : item)
          .filter((item) => item != null && item !== "");
        return items.length > 0 ? items.join(" ") : "-";
      }
      return value;
    };

    return (
      <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
        <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
        <span className="flex-1 text-sm text-right break-all">{renderValue(children)}</span>
      </div>
    );
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">生产流转单</h2>
              <p className="text-sm text-muted-foreground">按生产批号自动汇总批号下所有工序，生成一条流转单数据</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">工序中</p><p className="text-2xl font-bold text-blue-600">{inProcessCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">待委外灭菌</p><p className="text-2xl font-bold text-amber-600">{pendingSterilizationCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已完成</p><p className="text-2xl font-bold text-green-600">{completedCount}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索流转单号、产品名称、批号..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="in_process">工序中</SelectItem>
                  <SelectItem value="pending_sterilization">待委外灭菌</SelectItem>
                  <SelectItem value="sterilizing">灭菌中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">流转单号</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="text-center font-bold">批号</TableHead>
                  <TableHead className="text-center font-bold">数量</TableHead>
                  <TableHead className="text-center font-bold">当前工序</TableHead>
                  <TableHead className="text-center font-bold">下一工序</TableHead>
                  <TableHead className="text-center font-bold">需委外灭菌</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || productionRecordsLoading || sterilizationLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : filteredCards.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无流转单</TableCell></TableRow>
                ) : pagedCards.map((card: any) => (
                  <TableRow key={card.id}>
                    <TableCell className="text-center font-medium">{card.cardNo}</TableCell>
                    <TableCell className="text-center">{card.productName || "-"}</TableCell>
                    <TableCell className="text-center">{card.batchNo || "-"}</TableCell>
                    <TableCell className="text-center">
                      <div>{formatQtyText(card.completedQty)} {card.unit}</div>
                      <div className="text-xs text-muted-foreground">计划 {formatQtyText(card.plannedQty)} {card.unit}</div>
                    </TableCell>
                    <TableCell className="text-center">{card.currentProcess || "-"}</TableCell>
                    <TableCell className="text-center">{card.nextProcess || "-"}</TableCell>
                    <TableCell className="text-center">
                      {card.needsSterilization ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">需灭菌</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">否</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[card.status]?.variant || "outline"} className={getStatusSemanticClass(card.status, statusMap[card.status]?.label)}>
                        {statusMap[card.status]?.label || card.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(card)}><Eye className="h-4 w-4 mr-2" />查看详情</DropdownMenuItem>
                          {parseNumberValue(card.totalScrapQty) > 0 && (
                            <DropdownMenuItem onClick={() => handleGenerateScrapDisposal(card)}>生成报废处理单</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <TablePaginationFooter total={filteredCards.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCard ? "编辑流转单" : "新建生产流转单"}</DialogTitle>
              <DialogDescription>跟踪产品在工序间的流转，标准医疗器械需标记委外灭菌</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>流转单号 *</Label>
                  <Input value={formData.cardNo} onChange={(e) => setFormData({ ...formData, cardNo: e.target.value })} placeholder="保存后系统生成" readOnly />
                </div>
                <div className="space-y-2">
                  <Label>关联生产指令</Label>
                  <Select
                    value={formData.productionOrderId || "__NONE__"}
                    onValueChange={(v) => handleProductionOrderChange(v === "__NONE__" ? "" : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="选择生产指令" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">不关联</SelectItem>
                      {(productionOrders as any[]).map((po: any) => (
                        <SelectItem key={po.id} value={String(po.id)}>{po.orderNo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>产品</Label>
                  <Select value={formData.productId} onValueChange={handleProductChange}>
                    <SelectTrigger><SelectValue placeholder="选择产品" /></SelectTrigger>
                    <SelectContent>
                      {(products as any[]).map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>批号</Label>
                  <Input value={formData.batchNo} onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })} placeholder="生产批号" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>数量</Label>
                  <Input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>当前工序</Label>
                  <Input value={formData.currentProcess} onChange={(e) => setFormData({ ...formData, currentProcess: e.target.value })} placeholder="如：装配、检验" />
                </div>
                <div className="space-y-2">
                  <Label>下一工序</Label>
                  <Input value={formData.nextProcess} onChange={(e) => setFormData({ ...formData, nextProcess: e.target.value })} placeholder="如：灭菌、包装、入库" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-amber-50">
                <input
                  type="checkbox"
                  id="needsSterilization"
                  checked={formData.needsSterilization}
                  onChange={(e) => setFormData({ ...formData, needsSterilization: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="needsSterilization" className="cursor-pointer">
                  <span className="font-medium">需要委外灭菌</span>
                  <span className="text-sm text-muted-foreground ml-2">（标准医疗器械勾选此项，流转完成后将进入委外灭菌流程）</span>
                </Label>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_process">工序中</SelectItem>
                    <SelectItem value="pending_sterilization">待委外灭菌</SelectItem>
                    <SelectItem value="sterilizing">灭菌中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCard ? "保存修改" : "创建流转单"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

{/* 查看详情 */}
{viewingCard && (
  <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
    <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
      <div className="border-b pb-3">
        <h2 className="text-lg font-semibold">生产流转单详情</h2>
        <p className="text-sm text-muted-foreground">
          {viewingCard.cardNo}
          {viewingCard.status && (
            <> · <Badge variant={statusMap[viewingCard.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingCard.status, statusMap[viewingCard.status]?.label)}`}>
              {statusMap[viewingCard.status]?.label || String(viewingCard.status ?? "-")}
            </Badge></>
          )}
        </p>
      </div>

      <div className="py-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="产品名称">{viewingCard.productName || "-"}</FieldRow>
              <FieldRow label="批号">{viewingCard.batchNo || "-"}</FieldRow>
            </div>
            <div>
              <FieldRow label="实际数量">{formatQtyText(viewingCard.completedQty)} {viewingCard.unit}</FieldRow>
              <FieldRow label="计划数量">{formatQtyText(viewingCard.plannedQty)} {viewingCard.unit}</FieldRow>
              <FieldRow label="关联生产指令">{viewingCard.productionOrderNo || "-"}</FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">工序流转</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="当前工序">{viewingCard.currentProcess || "-"}</FieldRow>
            </div>
            <div>
              <FieldRow label="下一工序">{viewingCard.nextProcess || "-"}</FieldRow>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
             <div>
               <FieldRow label="需委外灭菌">{viewingCard.needsSterilization ? "是" : "否"}</FieldRow>
            </div>
            <div></div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">工序明细</h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">工序名称</TableHead>
                  <TableHead className="text-center font-bold">记录次数</TableHead>
                  <TableHead className="text-center font-bold">车间</TableHead>
                  <TableHead className="text-center font-bold">班组</TableHead>
                  <TableHead className="text-center font-bold">合格数量</TableHead>
                  <TableHead className="text-center font-bold">报废数量</TableHead>
                  <TableHead className="text-center font-bold">操作员</TableHead>
                  <TableHead className="text-center font-bold">记录时间</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(viewingCard.processList || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无工序记录</TableCell>
                  </TableRow>
                ) : (
                  (viewingCard.processList || []).map((item: any) => (
                    <TableRow key={`${viewingCard.batchNo}-${item.processName}`}>
                      <TableCell className="text-center">{item.processName || "-"}</TableCell>
                      <TableCell className="text-center">{item.recordCount || 0}</TableCell>
                      <TableCell className="text-center">{item.workshopName || "-"}</TableCell>
                      <TableCell className="text-center">{item.productionTeam || "-"}</TableCell>
                      <TableCell className="text-center">{formatQtyText(item.actualQty)} {viewingCard.unit}</TableCell>
                      <TableCell className="text-center">{formatQtyText(item.scrapQty)} {viewingCard.unit}</TableCell>
                      <TableCell className="text-center">{item.operator || "-"}</TableCell>
                      <TableCell className="text-center">
                        {[formatDateValue(item.recordDate), item.recordTime].filter((value) => value && value !== "-").join(" ") || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={String(item.status || "") === "completed" ? "secondary" : "outline"}
                          className={getStatusSemanticClass(String(item.status || ""), String(item.status || ""))}
                        >
                          {String(item.status || "") === "completed"
                            ? "已完成"
                            : String(item.status || "") === "abnormal"
                              ? "异常"
                              : String(item.status || "") === "pending"
                                ? "待开始"
                                : "进行中"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">报废处理单</h3>
          {parseNumberValue(viewingCard.totalScrapQty) > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="报废总数">{viewingCard.totalScrapQty} {viewingCard.unit}</FieldRow>
                  <FieldRow label="成本数量">{scrapDisposal?.costQty || viewingCard.totalScrapQty} {viewingCard.unit}</FieldRow>
                </div>
                <div>
                  <FieldRow label="处理单号">{scrapDisposal?.disposalNo || buildScrapDisposalNo(String(viewingCard.batchNo || ""))}</FieldRow>
                  <FieldRow label="状态">{scrapDisposal?.status === "processed" ? "已处理" : "已生成"}</FieldRow>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="text-center font-bold">工序名称</TableHead>
                      <TableHead className="text-center font-bold">报废数量</TableHead>
                      <TableHead className="text-center font-bold">合格数量</TableHead>
                      <TableHead className="text-center font-bold">记录次数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewingCard.scrapSummary || []).map((item: any) => (
                      <TableRow key={`${viewingCard.batchNo}-${item.processName}`}>
                        <TableCell className="text-center">{item.processName || "-"}</TableCell>
                        <TableCell className="text-center">{formatQtyText(item.scrapQty)} {viewingCard.unit}</TableCell>
                        <TableCell className="text-center">{formatQtyText(item.actualQty)} {viewingCard.unit}</TableCell>
                        <TableCell className="text-center">{item.recordCount || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateScrapDisposal(viewingCard)}
                  disabled={scrapDisposalMutation.isPending}
                >
                  {scrapDisposal ? "重新生成报废处理单" : "生成报废处理单"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              当前批号暂无报废数据
            </div>
          )}
        </div>

        {viewingCard.sterilizationList?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">委外灭菌</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="灭菌单数量">{viewingCard.sterilizationList.length}</FieldRow>
              </div>
              <div>
                <FieldRow label="当前状态">
                  {viewingCard.sterilizationList.map((item: any) => item.orderNo || item.status).join(" / ")}
                </FieldRow>
              </div>
            </div>
          </div>
        )}

        {viewingCard.remark && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingCard.remark}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
        <div className="flex gap-2 flex-wrap"></div>
        <div className="flex gap-2 flex-wrap justify-end">
          {routingCardPrintData ? (
            <TemplatePrintPreviewButton
              templateKey="production_flow_card"
              data={routingCardPrintData}
              title={`生产流转单打印预览 - ${viewingCard.cardNo}`}
            />
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
        </div>
      </div>
    </DraggableDialogContent>
  </DraggableDialog>
)}
      </div>
    </ERPLayout>
  );
}
