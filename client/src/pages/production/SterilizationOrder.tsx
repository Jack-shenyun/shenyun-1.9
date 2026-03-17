import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatDisplayNumber, roundToDigits } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DateTextInput from "@/components/DateTextInput";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
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
  Flame, Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Send, CheckCircle, XCircle, Bell, Package,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { processMatchesProduct } from "@/lib/productionProcessMatching";
import { loadProductionProcessTemplates } from "@/pages/production/Process";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  pending_sterilization: { label: "待创建",   variant: "outline" },
  draft:       { label: "草稿",       variant: "outline" },
  sent:        { label: "灭菌中",     variant: "default" },
  processing:  { label: "灭菌中",     variant: "default" },
  arrived:     { label: "已到货",     variant: "secondary" },
  returned:    { label: "已回收",     variant: "secondary" },
  qualified:   { label: "合格",       variant: "secondary" },
  unqualified: { label: "不合格",     variant: "destructive" },
};

const emptyForm = {
  orderNo: "",
  routingCardId: "",
  routingCardNo: "",
  productionOrderId: "",
  productionOrderNo: "",
  productName: "",
  batchNo: "",
  sterilizationBatchNo: "",  // 灭菌批号（唯一）
  quantity: "",
  unit: "件",
  sterilizationMethod: "EO环氧乙烷",
  supplierId: "",
  supplierName: "",
  transportSupplierId: "",
  transportSupplierName: "",
  freight: "",
  includesReturnTrip: false,
  boxSizeCm: "",
  grossWeightKg: "",
  netWeightKg: "",
  boxCount: "",
  qtyPerBox: "",
  sendDate: "",
  expectedReturnDate: "",
  actualReturnDate: "",
  remark: "",
};

const parseNumberValue = (value: unknown) => {
  const num = Number(String(value ?? "").trim());
  return Number.isFinite(num) ? num : 0;
};

const buildRecordTime = (recordDate?: unknown, recordTime?: unknown) =>
  new Date(`${String(recordDate || "1970-01-01").slice(0, 10)}T${String(recordTime || "00:00") || "00:00"}`).getTime();

const formatQtyText = (value: unknown) => {
  const num = parseNumberValue(value);
  if (!Number.isFinite(num)) return "0";
  return formatDisplayNumber(num);
};

const normalizeQtyInputValue = (value: unknown) => {
  const num = parseNumberValue(value);
  if (!Number.isFinite(num)) return "";
  return String(roundToDigits(num, 2));
};

const deriveProcessStatus = (totalActualQty: unknown, plannedQty: unknown, hasAbnormal = false) => {
  const actual = parseNumberValue(totalActualQty);
  const planned = parseNumberValue(plannedQty);
  if (planned > 0 && actual >= planned) return "completed";
  if (hasAbnormal) return "abnormal";
  return actual > 0 ? "in_progress" : "pending";
};

const formatDateText = (value: unknown) => {
  if (!value) return "-";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (!text) return "-";
  if (text.includes("T")) return text.slice(0, 10);
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return text.slice(0, 10);
};

const parseBoxSizeParts = (value: unknown) => {
  const parts = String(value || "")
    .split(/[*xX×]/)
    .map((item) => parseNumberValue(item))
    .filter((item) => item > 0);
  return parts.length >= 3 ? parts.slice(0, 3) : [];
};

const calcTotalVolumeCbm = (boxSizeCm: unknown, boxCount: unknown) => {
  const parts = parseBoxSizeParts(boxSizeCm);
  if (parts.length < 3) return 0;
  const [length, width, height] = parts;
  const count = Math.max(parseNumberValue(boxCount), 1);
  return roundToDigits((length * width * height * count) / 1000000, 4);
};

const parseSterilizationRemark = (remark: unknown) => {
  const defaultValue = {
    note: "",
    transportSupplierId: "",
    transportSupplierName: "",
    freight: "",
    includesReturnTrip: false,
    boxSizeCm: "",
    grossWeightKg: "",
    netWeightKg: "",
    boxCount: "",
    qtyPerBox: "",
  };
  if (!remark) return defaultValue;
  const text = String(remark);
  if (!text.trim().startsWith("{")) {
    return { ...defaultValue, note: text };
  }
  try {
    const parsed = JSON.parse(text);
    return {
      note: String(parsed.note || parsed.remarks || ""),
      transportSupplierId: String(parsed.transportSupplierId || ""),
      transportSupplierName: String(parsed.transportSupplierName || ""),
      freight: String(parsed.freight || ""),
      includesReturnTrip: Boolean(parsed.includesReturnTrip),
      boxSizeCm: String(parsed.boxSizeCm || ""),
      grossWeightKg: String(parsed.grossWeightKg || ""),
      netWeightKg: String(parsed.netWeightKg || ""),
      boxCount: String(parsed.boxCount || ""),
      qtyPerBox: String(parsed.qtyPerBox || ""),
    };
  } catch {
    return { ...defaultValue, note: text };
  }
};

const buildSterilizationRemark = (formData: typeof emptyForm) =>
  JSON.stringify({
    note: formData.remark || "",
    transportSupplierId: formData.transportSupplierId || "",
    transportSupplierName: formData.transportSupplierName || "",
    freight: formData.freight || "",
    includesReturnTrip: Boolean(formData.includesReturnTrip),
    boxSizeCm: formData.boxSizeCm || "",
    grossWeightKg: formData.grossWeightKg || "",
    netWeightKg: formData.netWeightKg || "",
    boxCount: formData.boxCount || "",
    qtyPerBox: formData.qtyPerBox || "",
  });

export default function SterilizationOrderPage() {
  const PAGE_SIZE = 10;
  const { canDelete } = usePermission();
  const { data: orders = [], isLoading, refetch } = trpc.sterilizationOrders.list.useQuery({});
  const { data: productionOrders = [] } = trpc.productionOrders.list.useQuery({});
  const { data: products = [] } = trpc.products.list.useQuery({});
  const { data: productionRecords = [] } = trpc.productionRecords.list.useQuery({ limit: 2000 });
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery({});

  const createMutation = trpc.sterilizationOrders.create.useMutation({
    onSuccess: () => { refetch(); toast.success("委外灭菌单已创建"); setDialogOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.sterilizationOrders.update.useMutation({
    onSuccess: () => { refetch(); toast.success("灭菌单已更新"); setDialogOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.sterilizationOrders.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("灭菌单已删除"); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [routingCardPickerOpen, setRoutingCardPickerOpen] = useState(false);
  const [productionOrderPickerOpen, setProductionOrderPickerOpen] = useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [transportSupplierPickerOpen, setTransportSupplierPickerOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const sterilizationPrintData = useMemo(
    () =>
      viewingOrder
        ? {
            orderNo: viewingOrder.orderNo || "",
            supplierName: viewingOrder.supplierName || "",
            sterilizationMethod: viewingOrder.sterilizationMethod || "",
            sendDate: viewingOrder.sendDate || "",
            expectedReturnDate: viewingOrder.expectedReturnDate || "",
            actualReturnDate: viewingOrder.actualReturnDate || "",
            routingCardNo: viewingOrder.routingCardNo || "",
            sterilizationBatchNo: viewingOrder.sterilizationBatchNo || "",
            productName: viewingOrder.productName || "",
            batchNo: viewingOrder.batchNo || "",
            quantity: Number(viewingOrder.quantity || 0),
            unit: viewingOrder.unit || "",
            remark: viewingOrder.remarkText || "",
          }
        : null,
    [viewingOrder],
  );
  const [formData, setFormData] = useState({ ...emptyForm });
  const [currentPage, setCurrentPage] = useState(1);

  const allOrders = orders as any[];
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

  const routingCardOptions = useMemo(() => {
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
        const sortedRows = [...rows].sort((a: any, b: any) => buildRecordTime(a.recordDate, a.recordTime) - buildRecordTime(b.recordDate, b.recordTime));
        const firstRow = sortedRows[0];
        const linkedOrder =
          orderMap.get(Number(firstRow?.productionOrderId || 0)) ||
          (productionOrders as any[]).find((item: any) => String(item.orderNo || "") === String(firstRow?.productionOrderNo || "")) ||
          (productionOrders as any[]).find((item: any) => String(item.batchNo || "") === batchNo) ||
          null;
        const linkedProduct = productMap.get(Number(linkedOrder?.productId || firstRow?.productId || 0)) || null;
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
          const plannedQty = Math.max(parseNumberValue(row.plannedQty), parseNumberValue(linkedOrder?.plannedQty));
          const existing = processMap.get(processName);

          if (!existing) {
            processMap.set(processName, {
              processName,
              actualQty,
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
          existing.plannedQty = Math.max(existing.plannedQty, plannedQty);
          existing.recordCount += 1;
          existing.hasAbnormal = existing.hasAbnormal || String(row.status || "") === "abnormal";
          if (rowTime >= existing._sortTime) {
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
                actualQty: 0,
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
        const batchSterilizationOrders = allOrders.filter(
          (item: any) => String(item.batchNo || "") === batchNo,
        );
        const needsSterilization = Boolean(linkedProduct?.isMedicalDevice) || batchSterilizationOrders.length > 0;
        const inProgressProcess = processList.find((item: any) => ["in_progress", "abnormal"].includes(String(item.status || "")));
        const lastCompletedProcess = [...processList].reverse().find((item: any) => String(item.status || "") === "completed");
        const lastStartedProcess = [...processList].reverse().find((item: any) => Number(item.recordCount || 0) > 0);
        const finalProcess = processList.length > 0 ? processList[processList.length - 1] : lastStartedProcess;
        const completedQty = parseNumberValue(finalProcess?.actualQty);
        const plannedQty = Math.max(parseNumberValue(linkedOrder?.plannedQty), parseNumberValue(firstRow?.plannedQty));
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
          productionOrderId: linkedOrder?.id ? String(linkedOrder.id) : "",
          productionOrderNo: linkedOrder?.orderNo || firstRow?.productionOrderNo || "",
          productName: productName || "-",
          batchNo,
          quantity: formatQtyText(completedQty || plannedQty),
          unit: String(linkedOrder?.unit || linkedProduct?.unit || "件"),
          currentProcess,
          nextProcess,
          needsSterilization,
          status,
        };
      })
      .filter((item) => item.needsSterilization && item.status === "pending_sterilization")
      .sort((a, b) => String(b.cardNo).localeCompare(String(a.cardNo), "zh-CN"));
  }, [allOrders, processTemplateMap, products, productionOrders, productionRecords]);

  const normalizedOrders = useMemo(() => {
    return allOrders.map((order: any) => {
      const extra = parseSterilizationRemark(order.remark);
      return {
        ...order,
        sourceType: "order",
        remarkText: extra.note,
        transportSupplierId: extra.transportSupplierId,
        transportSupplierName: extra.transportSupplierName,
        freight: extra.freight,
        includesReturnTrip: extra.includesReturnTrip,
        boxSizeCm: extra.boxSizeCm,
        grossWeightKg: extra.grossWeightKg,
        netWeightKg: extra.netWeightKg,
        boxCount: extra.boxCount,
        qtyPerBox: extra.qtyPerBox,
        totalVolumeCbm: calcTotalVolumeCbm(extra.boxSizeCm, extra.boxCount),
      };
    });
  }, [allOrders]);

  const pendingRoutingRows = useMemo(() => {
    return routingCardOptions
      .filter((row) => !normalizedOrders.some((item: any) => String(item.batchNo || "") === String(row.batchNo || "")))
      .map((row) => ({
        ...row,
        id: `todo-${row.batchNo}`,
        sourceType: "routing_card",
        orderNo: "",
        sterilizationBatchNo: "",
        sterilizationMethod: "EO环氧乙烷",
        supplierName: "",
        sendDate: "",
        expectedReturnDate: "",
        transportSupplierName: "",
        freight: "",
        includesReturnTrip: false,
        boxSizeCm: "",
        grossWeightKg: "",
        netWeightKg: "",
        boxCount: "",
        qtyPerBox: "",
        totalVolumeCbm: 0,
        remarkText: "",
      }));
  }, [normalizedOrders, routingCardOptions]);

  const combinedOrders = useMemo(
    () => [...pendingRoutingRows, ...normalizedOrders],
    [normalizedOrders, pendingRoutingRows],
  );

  const filteredOrders = combinedOrders.filter((o: any) => {
    const matchSearch = !searchTerm ||
      String(o.orderNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(o.routingCardNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(o.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(o.batchNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(o.supplierName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(o.sterilizationBatchNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pagedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filteredOrders.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const genNo = () => {
    const now = new Date();
    return `SO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-4)}`;
  };

  // 生成灭菌批号（唯一，格式：S+年份后两位+月+日+流水号）
  const genSterilizationBatchNo = () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const seq = String(Date.now()).slice(-4);
    return `S${yy}${mm}${dd}${seq}`;
  };

  const handleAdd = () => {
    setEditingOrder(null);
    setFormData({
      ...emptyForm,
      orderNo: genNo(),
      sterilizationBatchNo: genSterilizationBatchNo(),
      sendDate: new Date().toISOString().split("T")[0],
    });
    setDialogOpen(true);
  };

  const handleAddFromRoutingCard = (row: any) => {
    setEditingOrder(null);
    setFormData({
      ...emptyForm,
      orderNo: genNo(),
      sterilizationBatchNo: genSterilizationBatchNo(),
      routingCardId: String(row.routingCardId || row.id || ""),
      routingCardNo: row.routingCardNo || row.cardNo || "",
      productionOrderId: row.productionOrderId ? String(row.productionOrderId) : "",
      productionOrderNo: row.productionOrderNo || "",
      productName: row.productName || "",
      batchNo: row.batchNo || "",
      quantity: row.quantity || "",
      unit: row.unit || "件",
      sterilizationMethod: "EO环氧乙烷",
      sendDate: new Date().toISOString().split("T")[0],
    });
    setDialogOpen(true);
  };

  const handleEdit = (order: any) => {
    const extra = parseSterilizationRemark(order.remarkText || order.remark);
    setEditingOrder(order);
    setFormData({
      orderNo: order.orderNo,
      routingCardId: order.routingCardId ? String(order.routingCardId) : "",
      routingCardNo: order.routingCardNo || "",
      productionOrderId: order.productionOrderId ? String(order.productionOrderId) : "",
      productionOrderNo: order.productionOrderNo || "",
      productName: order.productName || "",
      batchNo: order.batchNo || "",
      sterilizationBatchNo: order.sterilizationBatchNo || "",
      quantity: order.quantity || "",
      unit: order.unit || "件",
      sterilizationMethod: order.sterilizationMethod || "EO环氧乙烷",
      supplierId: order.supplierId ? String(order.supplierId) : "",
      supplierName: order.supplierName || "",
      transportSupplierId: extra.transportSupplierId || "",
      transportSupplierName: extra.transportSupplierName || "",
      freight: extra.freight || "",
      includesReturnTrip: Boolean(extra.includesReturnTrip),
      boxSizeCm: extra.boxSizeCm || "",
      grossWeightKg: extra.grossWeightKg || "",
      netWeightKg: extra.netWeightKg || "",
      boxCount: extra.boxCount || "",
      qtyPerBox: extra.qtyPerBox || "",
      sendDate: order.sendDate ? String(order.sendDate).split("T")[0] : "",
      expectedReturnDate: order.expectedReturnDate ? String(order.expectedReturnDate).split("T")[0] : "",
      actualReturnDate: order.actualReturnDate ? String(order.actualReturnDate).split("T")[0] : "",
      remark: extra.note || "",
    });
    setDialogOpen(true);
  };

  const handleView = (order: any) => { setViewingOrder(order); setViewDialogOpen(true); };
  const handleDelete = (order: any) => {
    if (!canDelete) { toast.error("您没有删除权限"); return; }
    deleteMutation.mutate({ id: order.id });
  };

  // 校验灭菌批号唯一性
  const checkSterilizationBatchNoUnique = (batchNo: string, excludeId?: number) => {
    return !allOrders.some((o) => o.sterilizationBatchNo === batchNo && o.id !== excludeId);
  };

  const handleRoutingCardChange = (rcId: string) => {
    const rc = routingCardOptions.find((r) => String(r.id) === rcId);
    setFormData((f) => ({
      ...f,
      routingCardId: rcId,
      routingCardNo: rc?.cardNo || "",
      productionOrderId: rc?.productionOrderId ? String(rc.productionOrderId) : f.productionOrderId,
      productionOrderNo: rc?.productionOrderNo || f.productionOrderNo,
      productName: rc?.productName || f.productName,
      batchNo: rc?.batchNo || f.batchNo,
      quantity: rc?.quantity || f.quantity,
      unit: rc?.unit || f.unit,
    }));
  };

  const handleProductionOrderChange = (productionOrderId: string) => {
    const order = (productionOrders as any[]).find((item) => String(item.id) === productionOrderId);
    setFormData((f) => ({
      ...f,
      productionOrderId,
      productionOrderNo: order?.orderNo || "",
      productName: order?.productName || f.productName,
      batchNo: order?.batchNo || f.batchNo,
      quantity: normalizeQtyInputValue(order?.plannedQty) || f.quantity,
      unit: order?.unit || f.unit,
    }));
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = (suppliers as any[]).find((s) => String(s.id) === supplierId);
    setFormData((f) => ({ ...f, supplierId, supplierName: supplier?.name || "" }));
  };

  const handleTransportSupplierChange = (supplierId: string) => {
    const supplier = (suppliers as any[]).find((s) => String(s.id) === supplierId);
    setFormData((f) => ({
      ...f,
      transportSupplierId: supplierId,
      transportSupplierName: supplier?.name || "",
    }));
  };

  const totalVolumeCbm = useMemo(
    () => calcTotalVolumeCbm(formData.boxSizeCm, formData.boxCount),
    [formData.boxCount, formData.boxSizeCm],
  );

  const handleSubmit = () => {
    if (!formData.orderNo) { toast.error("请填写灭菌单号"); return; }
    // 校验灭菌批号唯一性
    if (formData.sterilizationBatchNo) {
      const isUnique = checkSterilizationBatchNoUnique(formData.sterilizationBatchNo, editingOrder?.id);
      if (!isUnique) {
        toast.error("灭菌批号已存在", { description: `灭菌批号 "${formData.sterilizationBatchNo}" 已被其他灭菌单使用，请修改后重试` });
        return;
      }
    }
    const payload = {
      orderNo: formData.orderNo,
      sterilizationBatchNo: formData.sterilizationBatchNo || undefined,
      routingCardId: /^\d+$/.test(String(formData.routingCardId || "")) ? Number(formData.routingCardId) : undefined,
      routingCardNo: formData.routingCardNo || undefined,
      productionOrderId: formData.productionOrderId ? Number(formData.productionOrderId) : undefined,
      productionOrderNo: formData.productionOrderNo || undefined,
      productName: formData.productName || undefined,
      batchNo: formData.batchNo || undefined,
      quantity: formData.quantity || undefined,
      unit: formData.unit || undefined,
      sterilizationMethod: formData.sterilizationMethod || undefined,
      supplierId: formData.supplierId ? Number(formData.supplierId) : undefined,
      supplierName: formData.supplierName || undefined,
      sendDate: formData.sendDate || undefined,
      expectedReturnDate: formData.expectedReturnDate || undefined,
      remark: buildSterilizationRemark(formData),
    };
    if (editingOrder) {
      updateMutation.mutate({
        id: editingOrder.id,
        data: {
          routingCardId: payload.routingCardId,
          routingCardNo: payload.routingCardNo,
          productionOrderId: payload.productionOrderId,
          productionOrderNo: payload.productionOrderNo,
          productName: payload.productName,
          batchNo: payload.batchNo,
          quantity: payload.quantity,
          unit: payload.unit,
          sterilizationBatchNo: payload.sterilizationBatchNo,
          sterilizationMethod: payload.sterilizationMethod,
          supplierId: payload.supplierId,
          supplierName: payload.supplierName,
          sendDate: payload.sendDate,
          expectedReturnDate: payload.expectedReturnDate,
          remark: payload.remark,
        },
      });
    } else {
      createMutation.mutate({ ...payload, status: "processing" });
    }
  };

  // 【到货】按钮：更新状态为 arrived，并模拟通知质量部
  const handleArrived = (order: any) => {
    updateMutation.mutate(
      { id: order.id, data: { status: "arrived", actualReturnDate: new Date().toISOString().split("T")[0] } },
      {
        onSuccess: () => {
          refetch();
          toast.success("已通知质量部", {
            description: `灭菌单 ${order.orderNo}（灭菌批号：${order.sterilizationBatchNo || "-"}）已到货，质量部 OQC 待办已创建`,
            duration: 5000,
          });
        },
      }
    );
  };

  const draftCount = normalizedOrders.filter((o) => o.status === "draft").length + pendingRoutingRows.length;
  const processingCount = normalizedOrders.filter((o) => o.status === "processing" || o.status === "sent").length;
  const arrivedCount = normalizedOrders.filter((o) => o.status === "arrived").length;
  const qualifiedCount = normalizedOrders.filter((o) => o.status === "qualified").length;
  const unqualifiedCount = normalizedOrders.filter((o) => o.status === "unqualified").length;
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
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Flame className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">委外灭菌单</h2>
              <p className="text-sm text-muted-foreground">医疗器械委外灭菌管理，到货后自动通知质量部 OQC 检验</p>
            </div>
          </div>
          <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />新建灭菌单</Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-5">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">待创建/草稿</p><p className="text-2xl font-bold">{draftCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">灭菌中</p><p className="text-2xl font-bold text-amber-600">{processingCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3 text-blue-600" />已到货</p><p className="text-2xl font-bold text-blue-600">{arrivedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">合格</p><p className="text-2xl font-bold text-green-600">{qualifiedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">不合格</p><p className="text-2xl font-bold text-red-600">{unqualifiedCount}</p></CardContent></Card>
        </div>

        {/* 搜索筛选 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索灭菌单号、流转单号、产品名称、生产批号、灭菌批号、供应商..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[140px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending_sterilization">待创建</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="sent">已发出</SelectItem>
                  <SelectItem value="processing">灭菌中</SelectItem>
                  <SelectItem value="arrived">已到货</SelectItem>
                  <SelectItem value="returned">已回收</SelectItem>
                  <SelectItem value="qualified">合格</SelectItem>
                  <SelectItem value="unqualified">不合格</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 列表 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">灭菌单号</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="text-center font-bold">生产批号<span className="text-xs text-muted-foreground ml-1">(唯一追溯)</span></TableHead>
                  <TableHead className="text-center font-bold">灭菌批号</TableHead>
                  <TableHead className="text-center font-bold">数量</TableHead>
                  <TableHead className="text-center font-bold">灭菌方式</TableHead>
                  <TableHead className="text-center font-bold">灭菌供应商</TableHead>
                  <TableHead className="text-center font-bold">发出日期</TableHead>
                  <TableHead className="text-center font-bold">预计回收</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">暂无委外灭菌单</TableCell></TableRow>
                ) : pagedOrders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-center">
                      {order.sourceType === "routing_card" ? (
                        <div className="space-y-0.5">
                          <div className="font-medium text-amber-600">待创建</div>
                          <div className="font-mono text-xs text-muted-foreground">{order.routingCardNo || order.cardNo}</div>
                        </div>
                      ) : (
                        <span className="font-medium font-mono">{order.orderNo}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{order.productName || "-"}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono font-semibold text-primary">{order.batchNo || "-"}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {order.sterilizationBatchNo ? (
                        <span className="font-mono text-orange-600 font-medium">{order.sterilizationBatchNo}</span>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">{formatQtyText(order.quantity)} {order.unit}</TableCell>
                    <TableCell className="text-center">{order.sterilizationMethod || "-"}</TableCell>
                    <TableCell className="text-center">{order.supplierName || "-"}</TableCell>
                    <TableCell className="text-center">{formatDateText(order.sendDate)}</TableCell>
                    <TableCell className="text-center">{formatDateText(order.expectedReturnDate)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[order.status]?.variant || "outline"} className={getStatusSemanticClass(order.status, statusMap[order.status]?.label)}>
                        {statusMap[order.status]?.label || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {order.sourceType === "routing_card" ? (
                            <DropdownMenuItem onClick={() => handleAddFromRoutingCard(order)}>
                              <Plus className="h-4 w-4 mr-2" />新建灭菌单
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => handleView(order)}><Eye className="h-4 w-4 mr-2" />查看详情</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(order)}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
                            </>
                          )}
                          {order.sourceType !== "routing_card" && order.status === "draft" && (
                            <DropdownMenuItem onClick={() => updateMutation.mutate({ id: order.id, data: { status: "processing" } })}>
                              <Send className="h-4 w-4 mr-2" />确认发出
                            </DropdownMenuItem>
                          )}
                          {order.sourceType !== "routing_card" && order.status === "processing" && (
                            <DropdownMenuItem onClick={() => handleArrived(order)} className="text-blue-600 font-medium">
                              <Bell className="h-4 w-4 mr-2" />到货 · 通知质量部
                            </DropdownMenuItem>
                          )}
                          {order.sourceType !== "routing_card" && order.status === "arrived" && (
                            <>
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: order.id, data: { status: "qualified" } })}>
                                <CheckCircle className="h-4 w-4 mr-2" />验收合格
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: order.id, data: { status: "unqualified" } })} className="text-destructive">
                                <XCircle className="h-4 w-4 mr-2" />验收不合格
                              </DropdownMenuItem>
                            </>
                          )}
                          {order.sourceType !== "routing_card" && order.status === "returned" && (
                            <>
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: order.id, data: { status: "qualified" } })}>
                                <CheckCircle className="h-4 w-4 mr-2" />验收合格
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: order.id, data: { status: "unqualified" } })} className="text-destructive">
                                <XCircle className="h-4 w-4 mr-2" />验收不合格
                              </DropdownMenuItem>
                            </>
                          )}
                          {order.sourceType !== "routing_card" && canDelete && (
                            <DropdownMenuItem onClick={() => handleDelete(order)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />删除
                            </DropdownMenuItem>
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
        <TablePaginationFooter total={filteredOrders.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOrder ? "编辑委外灭菌单" : "新建委外灭菌单"}</DialogTitle>
              <DialogDescription>标准医疗器械生产完成后委托外部机构进行灭菌处理</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>灭菌单号 *</Label>
                  <Input value={formData.orderNo} onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })} readOnly={!!editingOrder} className="font-mono" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>灭菌批号 <span className="text-xs text-muted-foreground">（全局唯一）</span></Label>
                  <Input
                    value={formData.sterilizationBatchNo}
                    onChange={(e) => setFormData({ ...formData, sterilizationBatchNo: e.target.value })}
                    placeholder="自动生成，可修改"
                    className="font-mono text-orange-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>关联流转单</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 justify-start font-normal"
                      onClick={() => setRoutingCardPickerOpen(true)}
                    >
                      {formData.routingCardId ? (
                        <span className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          <span className="font-mono text-xs text-muted-foreground">{formData.routingCardNo}</span>
                          <span className="font-medium">{formData.productName || "已关联流转单"}</span>
                          {formData.batchNo ? <span className="text-muted-foreground text-xs">· {formData.batchNo}</span> : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">点击选择流转单（可选）...</span>
                      )}
                    </Button>
                    {formData.routingCardId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFormData((f) => ({
                          ...f,
                          routingCardId: "",
                          routingCardNo: "",
                        }))}
                      >
                        清空
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>关联生产指令</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 justify-start font-normal"
                      onClick={() => setProductionOrderPickerOpen(true)}
                    >
                      {formData.productionOrderId ? (
                        <span className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          <span className="font-mono text-xs text-muted-foreground">{formData.productionOrderNo}</span>
                          <span className="font-medium">{formData.productName || "已关联生产指令"}</span>
                          {formData.batchNo ? <span className="text-muted-foreground text-xs">· {formData.batchNo}</span> : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">点击选择生产指令（可选）...</span>
                      )}
                    </Button>
                    {formData.productionOrderId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFormData((f) => ({
                          ...f,
                          productionOrderId: "",
                          productionOrderNo: "",
                        }))}
                      >
                        清空
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>产品名称</Label>
                  <Input value={formData.productName} readOnly placeholder="产品名称" className="bg-muted/40" />
                </div>
                <div className="space-y-2">
                  <Label>生产批号</Label>
                  <Input value={formData.batchNo} readOnly placeholder="生产批号" className="font-mono bg-muted/40" />
                </div>
                <div className="space-y-2">
                  <Label>数量</Label>
                  <Input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input value={formData.unit} readOnly className="bg-muted/40" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>灭菌方式</Label>
                  <Select value={formData.sterilizationMethod} onValueChange={(v) => setFormData({ ...formData, sterilizationMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EO环氧乙烷">EO环氧乙烷</SelectItem>
                      <SelectItem value="γ射线辐照">γ射线辐照</SelectItem>
                      <SelectItem value="高压蒸汽">高压蒸汽</SelectItem>
                      <SelectItem value="干热灭菌">干热灭菌</SelectItem>
                      <SelectItem value="其他">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-3">
                  <Label>灭菌供应商</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 justify-start font-normal"
                      onClick={() => setSupplierPickerOpen(true)}
                    >
                      {formData.supplierId ? (
                        <span className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          <span className="font-medium">{formData.supplierName}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">点击选择灭菌供应商...</span>
                      )}
                    </Button>
                    {formData.supplierId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFormData((f) => ({
                          ...f,
                          supplierId: "",
                          supplierName: "",
                        }))}
                      >
                        手动输入
                      </Button>
                    ) : null}
                  </div>
                  {!formData.supplierId && (
                    <Input value={formData.supplierName} onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })} placeholder="手动输入供应商名称" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>发出日期</Label>
                  <DateTextInput value={formData.sendDate} onChange={(value) => setFormData({ ...formData, sendDate: value })} />
                </div>
                <div className="space-y-2">
                  <Label>预计回收日期</Label>
                  <DateTextInput value={formData.expectedReturnDate} onChange={(value) => setFormData({ ...formData, expectedReturnDate: value })} />
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="text-sm font-semibold">装箱信息</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>箱子尺寸（cm）</Label>
                    <Input value={formData.boxSizeCm} onChange={(e) => setFormData({ ...formData, boxSizeCm: e.target.value })} placeholder="如 50*40*30" />
                  </div>
                  <div className="space-y-2">
                    <Label>毛重（千克）</Label>
                    <Input type="number" value={formData.grossWeightKg} onChange={(e) => setFormData({ ...formData, grossWeightKg: e.target.value })} placeholder="毛重" />
                  </div>
                  <div className="space-y-2">
                    <Label>净重（千克）</Label>
                    <Input type="number" value={formData.netWeightKg} onChange={(e) => setFormData({ ...formData, netWeightKg: e.target.value })} placeholder="净重" />
                  </div>
                  <div className="space-y-2">
                    <Label>箱数</Label>
                    <Input type="number" value={formData.boxCount} onChange={(e) => setFormData({ ...formData, boxCount: e.target.value })} placeholder="箱数" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>一箱数量</Label>
                    <Input type="number" value={formData.qtyPerBox} onChange={(e) => setFormData({ ...formData, qtyPerBox: e.target.value })} placeholder="一箱数量" />
                  </div>
                  <div className="space-y-2">
                    <Label>总体积（m³）</Label>
                    <Input value={totalVolumeCbm > 0 ? String(totalVolumeCbm) : ""} readOnly placeholder="根据箱子尺寸自动计算" className="bg-muted/40" />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="text-sm font-semibold">运输信息</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>运输供应商</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 justify-start font-normal"
                        onClick={() => setTransportSupplierPickerOpen(true)}
                      >
                        {formData.transportSupplierId ? (
                          <span className="flex items-center gap-2">
                            <span className="text-green-600">✓</span>
                            <span className="font-medium">{formData.transportSupplierName}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">点击选择运输供应商...</span>
                        )}
                      </Button>
                      {formData.transportSupplierId ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setFormData((f) => ({
                            ...f,
                            transportSupplierId: "",
                            transportSupplierName: "",
                          }))}
                        >
                          手动输入
                        </Button>
                      ) : null}
                    </div>
                    {!formData.transportSupplierId && (
                      <Input value={formData.transportSupplierName} onChange={(e) => setFormData({ ...formData, transportSupplierName: e.target.value })} placeholder="手动输入运输供应商名称" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>运费</Label>
                    <Input type="number" value={formData.freight} onChange={(e) => setFormData({ ...formData, freight: e.target.value })} placeholder="运费金额" />
                  </div>
                  <div className="space-y-2">
                    <Label>是否包含回程</Label>
                    <Select value={formData.includesReturnTrip ? "yes" : "no"} onValueChange={(v) => setFormData({ ...formData, includesReturnTrip: v === "yes" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">不包含回程</SelectItem>
                        <SelectItem value="yes">包含回程</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingOrder ? "保存修改" : "创建灭菌单"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <EntityPickerDialog
          open={routingCardPickerOpen}
          onOpenChange={setRoutingCardPickerOpen}
          title="选择流转单"
          searchPlaceholder="搜索流转单号、产品名称、批号..."
          columns={[
            { key: "cardNo", title: "流转单号", className: "w-[160px] whitespace-nowrap", render: (row) => <span className="font-mono">{row.cardNo}</span> },
            { key: "productName", title: "产品名称", className: "min-w-[180px]", render: (row) => <span className="font-medium">{row.productName || "-"}</span> },
            { key: "batchNo", title: "批号", className: "w-[140px] whitespace-nowrap", render: (row) => <span className="font-mono">{row.batchNo || "-"}</span> },
            { key: "currentProcess", title: "当前工序", className: "w-[120px]", render: (row) => row.currentProcess || "-" },
            { key: "nextProcess", title: "下一工序", className: "w-[120px]", render: (row) => row.nextProcess || "-" },
            { key: "quantity", title: "数量", className: "w-[100px] whitespace-nowrap", render: (row) => <span>{row.quantity || "0"} {row.unit || ""}</span> },
          ]}
          rows={routingCardOptions}
          selectedId={formData.routingCardId || ""}
          defaultWidth={980}
          filterFn={(row, query) => {
            const lower = query.toLowerCase();
            return String(row.cardNo || "").toLowerCase().includes(lower) ||
              String(row.productName || "").toLowerCase().includes(lower) ||
              String(row.batchNo || "").toLowerCase().includes(lower);
          }}
          onSelect={(row) => {
            handleRoutingCardChange(String(row.id));
            setRoutingCardPickerOpen(false);
          }}
        />

        <EntityPickerDialog
          open={productionOrderPickerOpen}
          onOpenChange={setProductionOrderPickerOpen}
          title="选择生产指令"
          searchPlaceholder="搜索指令号、产品名称、批号..."
          columns={[
            { key: "orderNo", title: "指令号", className: "w-[160px] whitespace-nowrap", render: (row) => <span className="font-mono">{row.orderNo}</span> },
            { key: "productName", title: "产品名称", className: "min-w-[180px]", render: (row) => <span className="font-medium">{row.productName || "-"}</span> },
            { key: "batchNo", title: "批号", className: "w-[140px] whitespace-nowrap", render: (row) => <span className="font-mono">{row.batchNo || "-"}</span> },
            { key: "plannedQty", title: "计划数量", className: "w-[120px] whitespace-nowrap", render: (row) => <span>{formatQtyText(row.plannedQty)} {row.unit || ""}</span> },
            { key: "status", title: "状态", className: "w-[100px]", render: (row) => row.status || "-" },
          ]}
          rows={productionOrders as any[]}
          selectedId={formData.productionOrderId || ""}
          defaultWidth={920}
          filterFn={(row, query) => {
            const lower = query.toLowerCase();
            return String(row.orderNo || "").toLowerCase().includes(lower) ||
              String(row.productName || "").toLowerCase().includes(lower) ||
              String(row.batchNo || "").toLowerCase().includes(lower);
          }}
          onSelect={(row) => {
            handleProductionOrderChange(String(row.id));
            setProductionOrderPickerOpen(false);
          }}
        />

        <EntityPickerDialog
          open={supplierPickerOpen}
          onOpenChange={setSupplierPickerOpen}
          title="选择灭菌供应商"
          searchPlaceholder="搜索供应商名称、联系人、电话..."
          columns={[
            { key: "code", title: "供应商编码", className: "w-[140px] whitespace-nowrap", render: (row) => <span className="font-mono">{row.code || "-"}</span> },
            { key: "name", title: "供应商名称", className: "min-w-[220px]", render: (row) => <span className="font-medium">{row.name || "-"}</span> },
            { key: "contactPerson", title: "联系人", className: "w-[120px]", render: (row) => row.contactPerson || "-" },
            { key: "phone", title: "联系电话", className: "w-[140px] whitespace-nowrap", render: (row) => row.phone || "-" },
            { key: "category", title: "类别", className: "w-[100px]", render: (row) => row.category || "-" },
          ]}
          rows={suppliers as any[]}
          selectedId={formData.supplierId || ""}
          defaultWidth={900}
          filterFn={(row, query) => {
            const lower = query.toLowerCase();
            return String(row.name || "").toLowerCase().includes(lower) ||
              String(row.code || "").toLowerCase().includes(lower) ||
              String(row.contactPerson || "").toLowerCase().includes(lower) ||
              String(row.phone || "").toLowerCase().includes(lower);
          }}
          onSelect={(row) => {
            handleSupplierChange(String(row.id));
            setSupplierPickerOpen(false);
          }}
        />

        <EntityPickerDialog
          open={transportSupplierPickerOpen}
          onOpenChange={setTransportSupplierPickerOpen}
          title="选择运输供应商"
          searchPlaceholder="搜索运输供应商名称、联系人、电话..."
          columns={[
            { key: "code", title: "供应商编码", className: "w-[140px] whitespace-nowrap", render: (row) => <span className="font-mono">{row.code || "-"}</span> },
            { key: "name", title: "供应商名称", className: "min-w-[220px]", render: (row) => <span className="font-medium">{row.name || "-"}</span> },
            { key: "contactPerson", title: "联系人", className: "w-[120px]", render: (row) => row.contactPerson || "-" },
            { key: "phone", title: "联系电话", className: "w-[140px] whitespace-nowrap", render: (row) => row.phone || "-" },
            { key: "category", title: "类别", className: "w-[100px]", render: (row) => row.category || "-" },
          ]}
          rows={suppliers as any[]}
          selectedId={formData.transportSupplierId || ""}
          defaultWidth={900}
          filterFn={(row, query) => {
            const lower = query.toLowerCase();
            return String(row.name || "").toLowerCase().includes(lower) ||
              String(row.code || "").toLowerCase().includes(lower) ||
              String(row.contactPerson || "").toLowerCase().includes(lower) ||
              String(row.phone || "").toLowerCase().includes(lower);
          }}
          onSelect={(row) => {
            handleTransportSupplierChange(String(row.id));
            setTransportSupplierPickerOpen(false);
          }}
        />

{/* 查看详情 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
    {viewingOrder && (
      <div className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">委外灭菌单详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingOrder.orderNo}
            {viewingOrder.status && (
              <> · <Badge variant={statusMap[viewingOrder.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingOrder.status, statusMap[viewingOrder.status]?.label)}`}>
                {statusMap[viewingOrder.status]?.label || String(viewingOrder.status ?? "-")}
              </Badge></>
            )}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="产品名称">{viewingOrder.productName || "-"}</FieldRow>
                <FieldRow label="生产批号">{viewingOrder.batchNo ? <span className="font-mono">{viewingOrder.batchNo}</span> : "-"}</FieldRow>
                <FieldRow label="灭菌批号">{viewingOrder.sterilizationBatchNo ? <span className="font-mono text-orange-600 font-medium">{viewingOrder.sterilizationBatchNo}</span> : "-"}</FieldRow>
                <FieldRow label="数量">{formatQtyText(viewingOrder.quantity)} {viewingOrder.unit}</FieldRow>
              </div>
              <div>
                <FieldRow label="灭菌方式">{viewingOrder.sterilizationMethod || "-"}</FieldRow>
                <FieldRow label="灭菌供应商">{viewingOrder.supplierName || "-"}</FieldRow>
                <FieldRow label="关联流转单">{viewingOrder.routingCardNo || "-"}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">日期信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="发出日期">{formatDateText(viewingOrder.sendDate)}</FieldRow>
                <FieldRow label="预计回收">{formatDateText(viewingOrder.expectedReturnDate)}</FieldRow>
              </div>
              <div>
                <FieldRow label="实际到货">{formatDateText(viewingOrder.actualReturnDate)}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">装箱与运输</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="箱子尺寸">{viewingOrder.boxSizeCm ? `${viewingOrder.boxSizeCm} cm` : "-"}</FieldRow>
                <FieldRow label="毛重">{viewingOrder.grossWeightKg ? `${viewingOrder.grossWeightKg} kg` : "-"}</FieldRow>
                <FieldRow label="净重">{viewingOrder.netWeightKg ? `${viewingOrder.netWeightKg} kg` : "-"}</FieldRow>
                <FieldRow label="箱数">{viewingOrder.boxCount || "-"}</FieldRow>
                <FieldRow label="一箱数量">{viewingOrder.qtyPerBox || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="总体积">{viewingOrder.totalVolumeCbm ? `${viewingOrder.totalVolumeCbm} m³` : "-"}</FieldRow>
                <FieldRow label="运输供应商">{viewingOrder.transportSupplierName || "-"}</FieldRow>
                <FieldRow label="运费">{viewingOrder.freight || "-"}</FieldRow>
                <FieldRow label="包含回程">{viewingOrder.includesReturnTrip ? "是" : "否"}</FieldRow>
              </div>
            </div>
          </div>

          {viewingOrder.remarkText && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingOrder.remarkText}</p>
            </div>
          )}

          {viewingOrder.status === "arrived" && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-700">
              <Bell className="h-4 w-4 inline mr-1" />已通知质量部进行 OQC 检验，请等待检验结果
            </div>
          )}
        </div>

        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            {sterilizationPrintData ? (
              <TemplatePrintPreviewButton
                templateKey="sterilization_outsource"
                data={sterilizationPrintData}
                title={`委外灭菌单打印预览 - ${viewingOrder.orderNo}`}
              />
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); if (viewingOrder) handleEdit(viewingOrder); }}>编辑</Button>
          </div>
        </div>
      </div>
    )}
  </DraggableDialogContent>
</DraggableDialog>
      </div>
    </ERPLayout>
  );
}
