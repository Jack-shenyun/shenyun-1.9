import { useEffect, useMemo, useRef, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DateTextInput from "@/components/DateTextInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatDateValue } from "@/lib/formatters";
import { toast } from "sonner";
import { ClipboardList, Edit, Eye, Plus, Search, Trash2 } from "lucide-react";

type HygieneMode = "cleaning" | "disinfection";

interface HygieneDetailItem {
  itemName: string;
  requirement: string;
  inputValue: string;
  conclusion: string;
  category: string;
}

interface CleaningItemRow {
  id: string;
  code: string;
  appearance: string;
}

interface CleaningRecordMeta {
  needsPreparation: string;
  cleanTypes: string[];
  clothingCount: string;
  shoeCount: string;
  detergent: string;
  disinfectant: string;
  operator: string;
  reviewer: string;
  clothingRows: CleaningItemRow[];
  shoeRows: CleaningItemRow[];
  note: string;
}

interface DisinfectionRecordMeta {
  configDate: string;
  expiryDate: string;
  disinfectant: string;
  stockSolution: string;
  concentration: string;
  purifiedWaterQty: string;
  dosage: string;
  operator: string;
  note: string;
}

interface HygieneRecord {
  id: number;
  recordNo: string;
  moduleType: string;
  roomName: string;
  roomCode: string;
  recordDate: string;
  recordTime: string;
  isNormal: boolean;
  abnormalDesc: string;
  correctionAction: string;
  recorder: string;
  productionOrderNo: string;
  remark: string;
  detailItems: HygieneDetailItem[];
}

const PAGE_SIZE = 10;

const modeConfig = {
  cleaning: {
    title: "洁净服/鞋清洗、消毒记录",
    moduleType: "清洗记录",
    prefix: "QX",
    objectLabel: "清洗类型",
    objectPlaceholder: "如：洁净服、洁净鞋",
    desc: "记录洁净服、洁净鞋清洗与消毒情况",
    detailLabel: "洁净服/鞋清洗、消毒明细",
    template: [
      { itemName: "洁净服清洗消毒", requirement: "记录洁净服编号与外观", inputValue: "", conclusion: "正常", category: "洁净服" },
      { itemName: "洁净鞋清洗消毒", requirement: "记录洁净鞋编号与外观", inputValue: "", conclusion: "正常", category: "洁净鞋" },
    ] as HygieneDetailItem[],
  },
  disinfection: {
    title: "消毒剂配制记录",
    moduleType: "消毒记录",
    prefix: "XD",
    objectLabel: "消毒剂",
    objectPlaceholder: "如：75%酒精、季铵盐",
    desc: "记录消毒剂配制时间、浓度、纯化水用量与操作信息",
    detailLabel: "配制明细",
    template: [
      { itemName: "原溶液", requirement: "填写原溶液名称或编号", inputValue: "", conclusion: "已确认", category: "基础信息" },
      { itemName: "浓度", requirement: "填写本次配制浓度", inputValue: "", conclusion: "符合", category: "配制参数" },
      { itemName: "纯化水用量", requirement: "填写纯化水使用量", inputValue: "", conclusion: "已确认", category: "配制参数" },
      { itemName: "用量", requirement: "填写本次配制总用量", inputValue: "", conclusion: "已确认", category: "配制结果" },
    ] as HygieneDetailItem[],
  },
} as const;

const toDateInputValue = (value?: string | Date | null) => {
  return formatDateValue(value) || "";
};

function createRecordNo(prefix: string, rows: HygieneRecord[]) {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;
  const maxNo = rows.reduce((max, row) => {
    const match = String(row.recordNo || "").match(new RegExp(`^${fullPrefix}(\\d+)$`));
    if (!match) return max;
    return Math.max(max, Number(match[1] || 0));
  }, 0);
  return `${fullPrefix}${String(maxNo + 1).padStart(4, "0")}`;
}

function createTemplateRows(mode: HygieneMode) {
  return modeConfig[mode].template.map((item) => ({ ...item }));
}

function createDetailRow() {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code: "",
    appearance: "",
  };
}

function createCleaningMeta(): CleaningRecordMeta {
  return {
    needsPreparation: "no",
    cleanTypes: ["洁净服", "洁净鞋"],
    clothingCount: "",
    shoeCount: "",
    detergent: "",
    disinfectant: "",
    operator: "",
    reviewer: "",
    clothingRows: [createDetailRow()],
    shoeRows: [createDetailRow()],
    note: "",
  };
}

function createDisinfectionMeta(now = new Date()): DisinfectionRecordMeta {
  const date = now.toISOString().slice(0, 10);
  return {
    configDate: date,
    expiryDate: date,
    disinfectant: "",
    stockSolution: "",
    concentration: "",
    purifiedWaterQty: "",
    dosage: "",
    operator: "",
    note: "",
  };
}

function parseRemarkJson(raw: unknown) {
  if (!raw) return null;
  const text = String(raw);
  if (!text.trim().startsWith("{")) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseCleaningMeta(record: HygieneRecord): CleaningRecordMeta {
  const parsed = parseRemarkJson(record.remark);
  const grouped = record.detailItems.reduce<Record<string, CleaningItemRow[]>>((acc, item, index) => {
    const key = item.category === "洁净鞋" ? "洁净鞋" : "洁净服";
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      id: `row-${record.id}-${index}`,
      code: String(item.itemName || ""),
      appearance: String(item.inputValue || ""),
    });
    return acc;
  }, {});
  return {
    needsPreparation: String(parsed?.needsPreparation || "no"),
    cleanTypes: Array.isArray(parsed?.cleanTypes) && parsed.cleanTypes.length > 0 ? parsed.cleanTypes.map((item: unknown) => String(item)) : ["洁净服", "洁净鞋"],
    clothingCount: String(parsed?.clothingCount || ""),
    shoeCount: String(parsed?.shoeCount || ""),
    detergent: String(parsed?.detergent || ""),
    disinfectant: String(parsed?.disinfectant || ""),
    operator: String(parsed?.operator || record.recorder || ""),
    reviewer: String(parsed?.reviewer || ""),
    clothingRows: grouped["洁净服"]?.length ? grouped["洁净服"] : [createDetailRow()],
    shoeRows: grouped["洁净鞋"]?.length ? grouped["洁净鞋"] : [createDetailRow()],
    note: String(parsed?.note || record.remark || ""),
  };
}

function parseDisinfectionMeta(record: HygieneRecord): DisinfectionRecordMeta {
  const parsed = parseRemarkJson(record.remark);
  return {
    configDate: String(parsed?.configDate || record.recordDate || ""),
    expiryDate: String(parsed?.expiryDate || ""),
    disinfectant: String(parsed?.disinfectant || record.roomName || ""),
    stockSolution: String(parsed?.stockSolution || ""),
    concentration: String(parsed?.concentration || ""),
    purifiedWaterQty: String(parsed?.purifiedWaterQty || ""),
    dosage: String(parsed?.dosage || ""),
    operator: String(parsed?.operator || record.recorder || ""),
    note: String(parsed?.note || record.remark || ""),
  };
}

function buildCleaningDetailItems(meta: CleaningRecordMeta): HygieneDetailItem[] {
  const buildRows = (rows: CleaningItemRow[], category: string) =>
    rows.map((row) => ({
      itemName: row.code,
      requirement: "外观",
      inputValue: row.appearance,
      conclusion: row.appearance && !/异常|破损|污染|不合格/.test(row.appearance) ? "正常" : row.appearance ? "异常" : "待填写",
      category,
    }));

  return [
    ...(meta.cleanTypes.includes("洁净服") ? buildRows(meta.clothingRows, "洁净服") : []),
    ...(meta.cleanTypes.includes("洁净鞋") ? buildRows(meta.shoeRows, "洁净鞋") : []),
  ];
}

function buildDisinfectionDetailItems(meta: DisinfectionRecordMeta): HygieneDetailItem[] {
  return [
    { itemName: "原溶液", requirement: "填写原溶液名称或编号", inputValue: meta.stockSolution, conclusion: meta.stockSolution ? "已确认" : "待填写", category: "基础信息" },
    { itemName: "浓度", requirement: "填写本次配制浓度", inputValue: meta.concentration, conclusion: meta.concentration ? "符合" : "待填写", category: "配制参数" },
    { itemName: "纯化水用量", requirement: "填写纯化水使用量", inputValue: meta.purifiedWaterQty, conclusion: meta.purifiedWaterQty ? "已确认" : "待填写", category: "配制参数" },
    { itemName: "用量", requirement: "填写本次配制总用量", inputValue: meta.dosage, conclusion: meta.dosage ? "已确认" : "待填写", category: "配制结果" },
  ];
}

function evaluateNormal(detailItems: HygieneDetailItem[]) {
  const abnormalWords = ["异常", "不合格", "未完成", "失败", "需处理"];
  return !detailItems.some((item) =>
    abnormalWords.some((word) => String(item.conclusion || "").includes(word))
  );
}

export default function HygieneRecordsBase({ mode }: { mode: HygieneMode }) {
  const config = modeConfig[mode];
  const utils = trpc.useUtils();
  const { data: listData = [], isLoading } = trpc.environmentRecords.list.useQuery({
    limit: 500,
    moduleType: config.moduleType,
  });
  const createMutation = trpc.environmentRecords.create.useMutation({
    onSuccess: () => {
      utils.environmentRecords.list.invalidate();
      setDialogOpen(false);
      toast.success(`${config.title}已保存`);
    },
    onError: (error) => toast.error("保存失败", { description: error.message }),
  });
  const updateMutation = trpc.environmentRecords.update.useMutation({
    onSuccess: () => {
      utils.environmentRecords.list.invalidate();
      setDialogOpen(false);
      toast.success(`${config.title}已更新`);
    },
    onError: (error) => toast.error("更新失败", { description: error.message }),
  });
  const deleteMutation = trpc.environmentRecords.delete.useMutation({
    onSuccess: () => {
      utils.environmentRecords.list.invalidate();
      toast.success(`${config.title}已删除`);
    },
    onError: (error) => toast.error("删除失败", { description: error.message }),
  });

  const records = useMemo<HygieneRecord[]>(
    () =>
      ((listData as any[]) || []).map((record: any) => ({
        id: Number(record.id || 0),
        recordNo: String(record.recordNo || ""),
        moduleType: String(record.moduleType || config.moduleType),
        roomName: String(record.roomName || ""),
        roomCode: String(record.roomCode || ""),
        recordDate: formatDateValue(record.recordDate) || "",
        recordTime: String(record.recordTime || ""),
        isNormal: record.isNormal === true || record.isNormal === 1 || String(record.isNormal) === "1",
        abnormalDesc: String(record.abnormalDesc || ""),
        correctionAction: String(record.correctionAction || ""),
        recorder: String(record.recorder || ""),
        productionOrderNo: String(record.productionOrderNo || ""),
        remark: String(record.remark || ""),
        detailItems: (() => {
          try {
            const parsed = JSON.parse(String(record.detailItems || "[]"));
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
      })).sort((a, b) => {
        const aTime = new Date(`${a.recordDate || "1970-01-01"}T${a.recordTime || "00:00"}`).getTime();
        const bTime = new Date(`${b.recordDate || "1970-01-01"}T${b.recordTime || "00:00"}`).getTime();
        return bTime - aTime;
      }),
    [config.moduleType, listData]
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HygieneRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<HygieneRecord | null>(null);
  const autoCreateHandledRef = useRef(false);
  const [cleaningMeta, setCleaningMeta] = useState<CleaningRecordMeta>(createCleaningMeta());
  const [disinfectionMeta, setDisinfectionMeta] = useState<DisinfectionRecordMeta>(createDisinfectionMeta());
  const [formData, setFormData] = useState<HygieneRecord>({
    id: 0,
    recordNo: "",
    moduleType: config.moduleType,
    roomName: "",
    roomCode: "",
    recordDate: "",
    recordTime: "",
    isNormal: true,
    abnormalDesc: "",
    correctionAction: "",
    recorder: "",
    productionOrderNo: "",
    remark: "",
    detailItems: createTemplateRows(mode),
  });

  const filteredRecords = records.filter((record) =>
    record.recordNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.recorder.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.productionOrderNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pagedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleAdd = () => {
    const now = new Date();
    setEditingRecord(null);
    setFormData({
      id: 0,
      recordNo: createRecordNo(config.prefix, records),
      moduleType: config.moduleType,
      roomName: "",
      roomCode: "",
      recordDate: now.toISOString().slice(0, 10),
      recordTime: now.toTimeString().slice(0, 5),
      isNormal: true,
      abnormalDesc: "",
      correctionAction: "",
      recorder: "",
      productionOrderNo: "",
      remark: "",
      detailItems: createTemplateRows(mode),
    });
    if (mode === "cleaning") {
      setCleaningMeta(createCleaningMeta());
    } else {
      setDisinfectionMeta(createDisinfectionMeta(now));
    }
    setDialogOpen(true);
  };

  useEffect(() => {
    if (autoCreateHandledRef.current || isLoading || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") !== "new") return;
    autoCreateHandledRef.current = true;
    handleAdd();
    window.history.replaceState({}, "", window.location.pathname);
  }, [isLoading, records]);

  const handleEdit = (record: HygieneRecord) => {
    const nextCleaningMeta = mode === "cleaning" ? parseCleaningMeta(record) : null;
    const nextDisinfectionMeta = mode === "disinfection" ? parseDisinfectionMeta(record) : null;
    setEditingRecord(record);
    setFormData({
      ...record,
      recordDate: toDateInputValue(record.recordDate),
      recorder:
        mode === "cleaning"
          ? (nextCleaningMeta?.operator || record.recorder)
          : (nextDisinfectionMeta?.operator || record.recorder),
      remark:
        mode === "cleaning"
          ? (nextCleaningMeta?.note || "")
          : (nextDisinfectionMeta?.note || ""),
      detailItems: record.detailItems.length > 0 ? record.detailItems.map((item) => ({ ...item })) : createTemplateRows(mode),
    });
    if (mode === "cleaning") {
      setCleaningMeta(nextCleaningMeta || createCleaningMeta());
    } else {
      setDisinfectionMeta(nextDisinfectionMeta || createDisinfectionMeta());
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const detailItems =
      mode === "cleaning"
        ? buildCleaningDetailItems(cleaningMeta)
        : buildDisinfectionDetailItems(disinfectionMeta);

    if (mode === "cleaning") {
      if (cleaningMeta.cleanTypes.length === 0 || !formData.recordDate) {
        toast.error("请先选择清洗类型并填写日期");
        return;
      }
    } else if (!disinfectionMeta.configDate || !disinfectionMeta.disinfectant) {
      toast.error("请填写配置时间和消毒剂");
      return;
    }

    const isNormal = evaluateNormal(detailItems);
    const payload = {
      moduleType: config.moduleType,
      roomName:
        mode === "cleaning"
          ? (cleaningMeta.cleanTypes.length > 0 ? cleaningMeta.cleanTypes.join("、") : "洁净服/鞋")
          : (disinfectionMeta.disinfectant || "消毒剂配制"),
      roomCode:
        mode === "cleaning"
          ? (cleaningMeta.cleanTypes.length > 0 ? cleaningMeta.cleanTypes.join("、") : "洁净服/鞋")
          : (disinfectionMeta.disinfectant || "消毒剂配制"),
      recordDate: mode === "cleaning" ? formData.recordDate : disinfectionMeta.configDate,
      recordTime: formData.recordTime,
      isNormal,
      abnormalDesc: !isNormal ? formData.abnormalDesc || "存在异常项，请查看明细" : "",
      correctionAction: !isNormal ? formData.correctionAction : "",
      recorder: mode === "cleaning" ? (cleaningMeta.operator || formData.recorder) : (disinfectionMeta.operator || formData.recorder),
      productionOrderNo: formData.productionOrderNo,
      detailItems: JSON.stringify(detailItems),
      remark: JSON.stringify(
        mode === "cleaning"
          ? { ...cleaningMeta, note: formData.remark || cleaningMeta.note || "" }
          : { ...disinfectionMeta, note: formData.remark || disinfectionMeta.note || "" }
      ),
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate({
        sourceType: "manual",
        recordNo: formData.recordNo,
        ...payload,
      });
    }
  };

  const updateDetailItem = (index: number, field: keyof HygieneDetailItem, value: string) => {
    setFormData((prev) => {
      const nextItems = prev.detailItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      );
      return {
        ...prev,
        detailItems: nextItems,
      };
    });
  };

  const addDetailItem = () => {
    setFormData((prev) => ({
      ...prev,
      detailItems: [
        ...prev.detailItems,
        { itemName: "", requirement: "", inputValue: "", conclusion: "正常", category: config.detailLabel },
      ],
    }));
  };

  const removeDetailItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      detailItems: prev.detailItems.length > 1 ? prev.detailItems.filter((_, i) => i !== index) : createTemplateRows(mode),
    }));
  };

  const totalCount = records.length;
  const normalCount = records.filter((item) => item.isNormal).length;
  const abnormalCount = records.filter((item) => !item.isNormal).length;
  const todayCount = records.filter((item) => item.recordDate === new Date().toISOString().slice(0, 10)).length;

  const updateCleaningRow = (group: "clothingRows" | "shoeRows", rowId: string, field: keyof CleaningItemRow, value: string) => {
    setCleaningMeta((prev) => ({
      ...prev,
      [group]: prev[group].map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }));
  };

  const addCleaningRow = (group: "clothingRows" | "shoeRows") => {
    setCleaningMeta((prev) => ({
      ...prev,
      [group]: [...prev[group], createDetailRow()],
    }));
  };

  const removeCleaningRow = (group: "clothingRows" | "shoeRows", rowId: string) => {
    setCleaningMeta((prev) => ({
      ...prev,
      [group]: prev[group].length > 1 ? prev[group].filter((row) => row.id !== rowId) : [createDetailRow()],
    }));
  };

  const handleQuickFillAppearance = (group: "clothingRows" | "shoeRows") => {
    setCleaningMeta((prev) => ({
      ...prev,
      [group]: prev[group].map((row) => ({
        ...row,
        appearance: row.appearance || "外观正常",
      })),
    }));
  };

  const viewingCleaningMeta = useMemo(
    () => (mode === "cleaning" && viewingRecord ? parseCleaningMeta(viewingRecord) : null),
    [mode, viewingRecord]
  );

  const viewingDisinfectionMeta = useMemo(
    () => (mode === "disinfection" && viewingRecord ? parseDisinfectionMeta(viewingRecord) : null),
    [mode, viewingRecord]
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              {config.title}
            </h1>
            <p className="text-muted-foreground mt-1">{config.desc}</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            新增{config.title}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="text-2xl font-bold">{totalCount}</div><div className="text-sm text-muted-foreground">{config.title}总数</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-green-600">{normalCount}</div><div className="text-sm text-muted-foreground">正常记录</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-red-600">{abnormalCount}</div><div className="text-sm text-muted-foreground">异常记录</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-blue-600">{todayCount}</div><div className="text-sm text-muted-foreground">今日记录</div></CardContent></Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`搜索编号、${config.objectLabel}、记录人...`}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="text-center font-bold">记录编号</TableHead>
                <TableHead className="text-center font-bold">记录类型</TableHead>
                <TableHead className="text-center font-bold">{config.objectLabel}</TableHead>
                <TableHead className="text-center font-bold">记录人</TableHead>
                <TableHead className="text-center font-bold">明细项数</TableHead>
                <TableHead className="text-center font-bold">状态</TableHead>
                <TableHead className="text-center font-bold">记录时间</TableHead>
                <TableHead className="text-center font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-center font-mono text-sm">{record.recordNo}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline">{record.moduleType}</Badge></TableCell>
                  <TableCell className="text-center">{record.roomName || "-"}</TableCell>
                  <TableCell className="text-center">{record.recorder || "-"}</TableCell>
                  <TableCell className="text-center">{record.detailItems.length}</TableCell>
                  <TableCell className="text-center">
                    {record.isNormal ? (
                      <Badge className="bg-green-50 text-green-700 border-green-200">正常</Badge>
                    ) : (
                      <Badge className="bg-red-50 text-red-700 border-red-200">异常</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{formatDateValue(record.recordDate)} {record.recordTime}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setViewingRecord(record); setViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate({ id: record.id })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pagedRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    {isLoading ? "加载中..." : `暂无${config.title}`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
        <TablePaginationFooter total={filteredRecords.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecord ? `编辑${config.title}` : `新增${config.title}`}</DialogTitle>
              <DialogDescription>
                {mode === "cleaning" ? "补充洁净服、洁净鞋清洗消毒信息并填写编号外观" : "填写消毒剂配制时间、浓度、用量和操作信息"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {mode === "cleaning" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>日期时间</Label>
                      <DateTextInput value={formData.recordDate} onChange={(value) => setFormData({ ...formData, recordDate: value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>流水号</Label>
                      <Input value={formData.recordNo} readOnly className="bg-muted/40" />
                    </div>
                    <div className="space-y-2">
                      <Label>是否需要配置</Label>
                      <Select value={cleaningMeta.needsPreparation} onValueChange={(value) => setCleaningMeta((prev) => ({ ...prev, needsPreparation: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">不需要</SelectItem>
                          <SelectItem value="yes">需要</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>清洗类型</Label>
                      <div className="flex items-center gap-4 rounded-md border px-3 py-2 min-h-10">
                        {["洁净服", "洁净鞋"].map((item) => (
                          <label key={item} className="inline-flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={cleaningMeta.cleanTypes.includes(item)}
                              onCheckedChange={(checked) =>
                                setCleaningMeta((prev) => ({
                                  ...prev,
                                  cleanTypes: checked
                                    ? Array.from(new Set([...prev.cleanTypes, item]))
                                    : prev.cleanTypes.filter((value) => value !== item),
                                }))
                              }
                            />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>洁净服数量</Label>
                      <Input value={cleaningMeta.clothingCount} onChange={(event) => setCleaningMeta((prev) => ({ ...prev, clothingCount: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>洁净鞋数量</Label>
                      <Input value={cleaningMeta.shoeCount} onChange={(event) => setCleaningMeta((prev) => ({ ...prev, shoeCount: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>清洗剂</Label>
                      <Input value={cleaningMeta.detergent} onChange={(event) => setCleaningMeta((prev) => ({ ...prev, detergent: event.target.value }))} placeholder="本色朵 / 中性清洗剂" />
                    </div>
                    <div className="space-y-2">
                      <Label>消毒剂</Label>
                      <Input value={cleaningMeta.disinfectant} onChange={(event) => setCleaningMeta((prev) => ({ ...prev, disinfectant: event.target.value }))} placeholder="75%酒精 / 季铵盐" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>操作人</Label>
                      <Input value={cleaningMeta.operator} onChange={(event) => setCleaningMeta((prev) => ({ ...prev, operator: event.target.value }))} placeholder="操作人" />
                    </div>
                    <div className="space-y-2">
                      <Label>复核人</Label>
                      <Input value={cleaningMeta.reviewer} onChange={(event) => setCleaningMeta((prev) => ({ ...prev, reviewer: event.target.value }))} placeholder="复核人" />
                    </div>
                  </div>

                  {cleaningMeta.cleanTypes.includes("洁净服") ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>洁净服清洗消毒记录</Label>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => addCleaningRow("clothingRows")}>
                            <Plus className="h-4 w-4 mr-1" />
                            添加
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => handleQuickFillAppearance("clothingRows")}>
                            快速填报
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[60px] text-center">#</TableHead>
                              <TableHead>编号</TableHead>
                              <TableHead>外观</TableHead>
                              <TableHead className="w-[70px] text-right">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cleaningMeta.clothingRows.map((row, index) => (
                              <TableRow key={row.id}>
                                <TableCell className="text-center">{index + 1}</TableCell>
                                <TableCell><Input value={row.code} onChange={(event) => updateCleaningRow("clothingRows", row.id, "code", event.target.value)} /></TableCell>
                                <TableCell><Input value={row.appearance} onChange={(event) => updateCleaningRow("clothingRows", row.id, "appearance", event.target.value)} placeholder="外观正常/异常说明" /></TableCell>
                                <TableCell className="text-right">
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCleaningRow("clothingRows", row.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : null}

                  {cleaningMeta.cleanTypes.includes("洁净鞋") ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>洁净鞋清洗消毒记录</Label>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => addCleaningRow("shoeRows")}>
                            <Plus className="h-4 w-4 mr-1" />
                            添加
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => handleQuickFillAppearance("shoeRows")}>
                            快速填报
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[60px] text-center">#</TableHead>
                              <TableHead>编号</TableHead>
                              <TableHead>外观</TableHead>
                              <TableHead className="w-[70px] text-right">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cleaningMeta.shoeRows.map((row, index) => (
                              <TableRow key={row.id}>
                                <TableCell className="text-center">{index + 1}</TableCell>
                                <TableCell><Input value={row.code} onChange={(event) => updateCleaningRow("shoeRows", row.id, "code", event.target.value)} /></TableCell>
                                <TableCell><Input value={row.appearance} onChange={(event) => updateCleaningRow("shoeRows", row.id, "appearance", event.target.value)} placeholder="外观正常/异常说明" /></TableCell>
                                <TableCell className="text-right">
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCleaningRow("shoeRows", row.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>流水号</Label>
                      <Input value={formData.recordNo} readOnly className="bg-muted/40" />
                    </div>
                    <div className="space-y-2">
                      <Label>配置时间</Label>
                      <DateTextInput value={disinfectionMeta.configDate} onChange={(value) => setDisinfectionMeta((prev) => ({ ...prev, configDate: value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>失效时间</Label>
                      <DateTextInput value={disinfectionMeta.expiryDate} onChange={(value) => setDisinfectionMeta((prev) => ({ ...prev, expiryDate: value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>消毒剂</Label>
                      <Input value={disinfectionMeta.disinfectant} onChange={(event) => setDisinfectionMeta((prev) => ({ ...prev, disinfectant: event.target.value }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>原溶液</Label>
                      <Input value={disinfectionMeta.stockSolution} onChange={(event) => setDisinfectionMeta((prev) => ({ ...prev, stockSolution: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>浓度</Label>
                      <Input value={disinfectionMeta.concentration} onChange={(event) => setDisinfectionMeta((prev) => ({ ...prev, concentration: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>纯化水用量</Label>
                      <Input value={disinfectionMeta.purifiedWaterQty} onChange={(event) => setDisinfectionMeta((prev) => ({ ...prev, purifiedWaterQty: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>操作人</Label>
                      <Input value={disinfectionMeta.operator} onChange={(event) => setDisinfectionMeta((prev) => ({ ...prev, operator: event.target.value }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>用量</Label>
                      <Input value={disinfectionMeta.dosage} onChange={(event) => setDisinfectionMeta((prev) => ({ ...prev, dosage: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>关联生产指令</Label>
                      <Input value={formData.productionOrderNo} onChange={(event) => setFormData({ ...formData, productionOrderNo: event.target.value })} placeholder="可选" />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>异常描述</Label>
                  <Textarea value={formData.abnormalDesc} onChange={(event) => setFormData({ ...formData, abnormalDesc: event.target.value })} rows={3} placeholder="有异常时填写" />
                </div>
                <div className="space-y-2">
                  <Label>处理措施</Label>
                  <Textarea value={formData.correctionAction} onChange={(event) => setFormData({ ...formData, correctionAction: event.target.value })} rows={3} placeholder="有异常时填写" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea value={formData.remark} onChange={(event) => setFormData({ ...formData, remark: event.target.value })} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? "保存修改" : "保存记录"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {viewingRecord ? (
          <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
              <div className="border-b pb-3">
                <h2 className="text-lg font-semibold">{config.title}详情</h2>
                <p className="text-sm text-muted-foreground">
                  {viewingRecord.recordNo}
                  <Badge variant={viewingRecord.isNormal ? "outline" : "destructive"} className={`ml-2 ${viewingRecord.isNormal ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                    {viewingRecord.isNormal ? "正常" : "异常"}
                  </Badge>
                </p>
              </div>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <div className="flex items-start gap-2 py-1.5 border-b border-border/40"><span className="w-24 shrink-0 text-sm text-muted-foreground">记录类型</span><span className="flex-1 text-sm text-right">{viewingRecord.moduleType}</span></div>
                    <div className="flex items-start gap-2 py-1.5 border-b border-border/40"><span className="w-24 shrink-0 text-sm text-muted-foreground">{config.objectLabel}</span><span className="flex-1 text-sm text-right">{viewingRecord.roomName || "-"}</span></div>
                    <div className="flex items-start gap-2 py-1.5 border-b border-border/40"><span className="w-24 shrink-0 text-sm text-muted-foreground">记录时间</span><span className="flex-1 text-sm text-right">{formatDateValue(viewingRecord.recordDate)} {viewingRecord.recordTime}</span></div>
                  </div>
                  <div>
                    <div className="flex items-start gap-2 py-1.5 border-b border-border/40"><span className="w-24 shrink-0 text-sm text-muted-foreground">记录人</span><span className="flex-1 text-sm text-right">{viewingRecord.recorder || "-"}</span></div>
                    <div className="flex items-start gap-2 py-1.5 border-b border-border/40"><span className="w-24 shrink-0 text-sm text-muted-foreground">关联指令</span><span className="flex-1 text-sm text-right">{viewingRecord.productionOrderNo || "-"}</span></div>
                    <div className="flex items-start gap-2 py-1.5 border-b border-border/40"><span className="w-24 shrink-0 text-sm text-muted-foreground">状态</span><span className="flex-1 text-sm text-right">{viewingRecord.isNormal ? "正常" : "异常"}</span></div>
                  </div>
                </div>

                {mode === "cleaning" && viewingCleaningMeta ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">是否需要配置</div><div className="mt-1 text-sm font-medium">{viewingCleaningMeta.needsPreparation === "yes" ? "需要" : "不需要"}</div></div>
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">清洗类型</div><div className="mt-1 text-sm font-medium">{viewingCleaningMeta.cleanTypes.join("、") || "-"}</div></div>
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">洁净服数量</div><div className="mt-1 text-sm font-medium">{viewingCleaningMeta.clothingCount || "-"}</div></div>
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">洁净鞋数量</div><div className="mt-1 text-sm font-medium">{viewingCleaningMeta.shoeCount || "-"}</div></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">清洗剂</div><div className="mt-1 text-sm font-medium">{viewingCleaningMeta.detergent || "-"}</div></div>
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">消毒剂</div><div className="mt-1 text-sm font-medium">{viewingCleaningMeta.disinfectant || "-"}</div></div>
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">操作人</div><div className="mt-1 text-sm font-medium">{viewingCleaningMeta.operator || "-"}</div></div>
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">复核人</div><div className="mt-1 text-sm font-medium">{viewingCleaningMeta.reviewer || "-"}</div></div>
                    </div>

                    {viewingCleaningMeta.cleanTypes.includes("洁净服") ? (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">洁净服清洗消毒记录</h3>
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[60px] text-center">#</TableHead>
                                <TableHead>编号</TableHead>
                                <TableHead>外观</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {viewingCleaningMeta.clothingRows.map((row, index) => (
                                <TableRow key={row.id}>
                                  <TableCell className="text-center">{index + 1}</TableCell>
                                  <TableCell>{row.code || "-"}</TableCell>
                                  <TableCell>{row.appearance || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : null}

                    {viewingCleaningMeta.cleanTypes.includes("洁净鞋") ? (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">洁净鞋清洗消毒记录</h3>
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[60px] text-center">#</TableHead>
                                <TableHead>编号</TableHead>
                                <TableHead>外观</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {viewingCleaningMeta.shoeRows.map((row, index) => (
                                <TableRow key={row.id}>
                                  <TableCell className="text-center">{index + 1}</TableCell>
                                  <TableCell>{row.code || "-"}</TableCell>
                                  <TableCell>{row.appearance || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : mode === "disinfection" && viewingDisinfectionMeta ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">配置时间</div><div className="mt-1 text-sm font-medium">{formatDateValue(viewingDisinfectionMeta.configDate)}</div></div>
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">失效时间</div><div className="mt-1 text-sm font-medium">{formatDateValue(viewingDisinfectionMeta.expiryDate)}</div></div>
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">消毒剂</div><div className="mt-1 text-sm font-medium">{viewingDisinfectionMeta.disinfectant || "-"}</div></div>
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">操作人</div><div className="mt-1 text-sm font-medium">{viewingDisinfectionMeta.operator || "-"}</div></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">原溶液</div><div className="mt-1 text-sm font-medium">{viewingDisinfectionMeta.stockSolution || "-"}</div></div>
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">浓度</div><div className="mt-1 text-sm font-medium">{viewingDisinfectionMeta.concentration || "-"}</div></div>
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">纯化水用量</div><div className="mt-1 text-sm font-medium">{viewingDisinfectionMeta.purifiedWaterQty || "-"}</div></div>
                      <div className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">用量</div><div className="mt-1 text-sm font-medium">{viewingDisinfectionMeta.dosage || "-"}</div></div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">{config.detailLabel}</h3>
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>分类</TableHead>
                              <TableHead>项目</TableHead>
                              <TableHead>要求</TableHead>
                              <TableHead>录入内容</TableHead>
                              <TableHead>结论</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {viewingRecord.detailItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.category || "-"}</TableCell>
                                <TableCell>{item.itemName || "-"}</TableCell>
                                <TableCell>{item.requirement || "-"}</TableCell>
                                <TableCell>{item.inputValue || "-"}</TableCell>
                                <TableCell>{item.conclusion || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                ) : null}

                {!viewingRecord.isNormal ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">异常描述</h3>
                      <p className="text-sm text-red-600 bg-muted/40 rounded-lg px-4 py-3">{viewingRecord.abnormalDesc || "-"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">处理措施</h3>
                      <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingRecord.correctionAction || "-"}</p>
                    </div>
                  </div>
                ) : null}

                {viewingRecord.remark ? (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
                      {mode === "cleaning" ? (viewingCleaningMeta?.note || "-") : (viewingDisinfectionMeta?.note || "-")}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setViewDialogOpen(false);
                  handleEdit(viewingRecord);
                }}>编辑</Button>
              </div>
            </DraggableDialogContent>
          </DraggableDialog>
        ) : null}
      </div>
    </ERPLayout>
  );
}
