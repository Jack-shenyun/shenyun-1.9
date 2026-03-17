import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import TemplatePrintPreviewButton from "@/components/TemplatePrintPreviewButton";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { SignatureRecord } from "@/components/ElectronicSignature";
import { ClipboardList, FileCheck, Plus, Search, Edit, Trash2, Eye, MoreHorizontal, RefreshCw, ArrowLeft, Save } from "lucide-react";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { formatDateValue } from "@/lib/formatters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InspectionItem {
  name: string;
  standard: string;
  result: string;
  conclusion: "qualified" | "unqualified" | "pending";
}

interface IPQCRecord {
  id: number | string;
  inspectionNo: string;
  productCode: string;
  productName: string;
  batchNo: string;
  process: string;
  inspectionType: "first" | "patrol" | "final";
  inspectionDate: string;
  result: "pending" | "inspecting" | "qualified" | "unqualified";
  inspector: string;
  workstation: string;
  remarks: string;
  inspectionItems: InspectionItem[];
  signatures?: SignatureRecord[];
  sourceType?: "quality" | "production";
}

const statusMap: Record<string, any> = {
  pending: { label: "待检", variant: "outline" as const, color: "text-gray-600" },
  inspecting: { label: "检验中", variant: "default" as const, color: "text-blue-600" },
  qualified: { label: "合格", variant: "secondary" as const, color: "text-green-600" },
  unqualified: { label: "不合格", variant: "destructive" as const, color: "text-red-600" },
  conditional: { label: "条件合格", variant: "outline" as const, color: "text-yellow-600" },
  draft: { label: "草稿", variant: "outline" as const, color: "text-gray-400" },
};

const inspectionTypeMap: Record<string, any> = {
  first: "首检",
  patrol: "巡检",
  final: "末检",
};

const defaultInspectionItems: InspectionItem[] = [
  { name: "外观检查", standard: "", result: "", conclusion: "pending" },
  { name: "尺寸测量", standard: "", result: "", conclusion: "pending" },
  { name: "功能测试", standard: "", result: "", conclusion: "pending" },
];

// 将数据库记录转换为前端显示格式
function dbToDisplay(record: any): IPQCRecord {
  let extra: any = {};
  try {
    if (record.remark && record.remark.startsWith("{")) {
      extra = JSON.parse(record.remark);
    }
  } catch {}
  return {
    id: record.id,
    inspectionNo: record.inspectionNo,
    productCode: extra.productCode || record.relatedDocNo || "",
    productName: record.itemName || "",
    batchNo: record.batchNo || "",
    process: extra.process || "",
    inspectionType: extra.inspectionType || "first",
    inspectionDate: record.inspectionDate ? String(record.inspectionDate).split("T")[0] : "",
    result: (extra.result || record.result || "pending") as IPQCRecord["result"],
    inspector: extra.inspector || "",
    workstation: extra.workstation || "",
    remarks: extra.remarks || "",
    inspectionItems: extra.inspectionItems || [],
    signatures: extra.signatures || [],
    sourceType: extra.sourceType === "production_record" ? "production" : "quality",
  };
}

function getNextSignatureType(
  signatures: SignatureRecord[],
): SignatureRecord["signatureType"] | null {
  const hasInspector = signatures.some((sig) => sig.signatureType === "inspector" && sig.status === "valid");
  if (!hasInspector) return "inspector";
  const hasReviewer = signatures.some((sig) => sig.signatureType === "reviewer" && sig.status === "valid");
  if (!hasReviewer) return "reviewer";
  return null;
}

function mergeSignatureRecords(
  existing: SignatureRecord[],
  nextSignature?: SignatureRecord | null,
) {
  if (!nextSignature) return existing;
  return [...existing, nextSignature];
}

export default function IPQCPage() {
  const formPrintRef = useRef<HTMLDivElement>(null);
  const detailPrintRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { data: _dbData = [], isLoading, refetch } = trpc.qualityInspections.list.useQuery({ type: "IPQC" });
  const createMutation = trpc.qualityInspections.create.useMutation({
    onSuccess: () => { refetch(); toast.success("检验记录已创建"); setFormDialogOpen(false); },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });
  const updateMutation = trpc.qualityInspections.update.useMutation({
    onSuccess: () => { refetch(); toast.success("检验记录已更新"); setFormDialogOpen(false); },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });
  const deleteMutation = trpc.qualityInspections.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("检验记录已删除"); },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });
  const saveDraftMutation = trpc.qualityInspections.saveDraft.useMutation({
    onSuccess: () => { refetch(); toast.success("草稿已保存"); },
    onError: (e) => toast.error("草稿保存失败", { description: e.message }),
  });

  const data: IPQCRecord[] = useMemo(
    () => (_dbData as any[]).map(dbToDisplay),
    [_dbData]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IPQCRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<IPQCRecord | null>(null);
  const [activeTab, setActiveTab] = useState("items");
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signaturePassword, setSignaturePassword] = useState("");
  const { canDelete } = usePermission();
  const verifyPasswordMutation = trpc.auth.verifyPassword.useMutation();

  const [formData, setFormData] = useState({
    productCode: "",
    productName: "",
    batchNo: "",
    process: "",
    inspectionType: "first" as IPQCRecord["inspectionType"],
    inspectionDate: "",
    result: "pending" as IPQCRecord["result"],
    inspector: "",
    workstation: "",
    remarks: "",
    inspectionItems: defaultInspectionItems,
  });

  const filteredData = data.filter((record: IPQCRecord) => {
    const matchesSearch =
      String(record.inspectionNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.batchNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.result === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, data.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedRecord(null);
    setActiveTab("items");
    setFormData({
      productCode: "",
      productName: "",
      batchNo: "",
      process: "",
      inspectionType: "first",
      inspectionDate: new Date().toISOString().split("T")[0],
      result: "pending",
      inspector: "",
      workstation: "",
      remarks: "",
      inspectionItems: [...defaultInspectionItems],
    });
    setSignatures([]);
    setFormDialogOpen(true);
  };

  const handleEdit = (record: IPQCRecord) => {
    if (record.sourceType === "production") {
      toast.error("生产记录带入的首检记录不支持在此编辑");
      return;
    }
    setIsEditing(true);
    setSelectedRecord(record);
    setActiveTab("items");
    setFormData({
      productCode: record.productCode,
      productName: record.productName,
      batchNo: record.batchNo,
      process: record.process,
      inspectionType: record.inspectionType,
      inspectionDate: record.inspectionDate,
      result: record.result,
      inspector: record.inspector,
      workstation: record.workstation,
      remarks: record.remarks,
      inspectionItems: record.inspectionItems.length > 0 ? record.inspectionItems : [...defaultInspectionItems],
    });
    setSignatures(record.signatures || []);
    setFormDialogOpen(true);
  };

  const handleView = (record: IPQCRecord) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: IPQCRecord) => {
    if (record.sourceType === "production") {
      toast.error("生产记录带入的首检记录不支持删除");
      return;
    }
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (recordToDelete) {
      deleteMutation.mutate({ id: recordToDelete.id });
    }
    setDeleteDialogOpen(false);
    setRecordToDelete(null);
  };

  const handleSubmit = (extraSignature?: SignatureRecord | null) => {
    if (!formData.productName || !formData.batchNo || !formData.process) {
      toast.error("请填写必填字段");
      return;
    }

    const mergedSignatures = mergeSignatureRecords(signatures, extraSignature);
    const extraData = {
      productCode: formData.productCode,
      process: formData.process,
      inspectionType: formData.inspectionType,
      result: formData.result,
      inspector: formData.inspector,
      workstation: formData.workstation,
      remarks: formData.remarks,
      inspectionItems: formData.inspectionItems,
      signatures: mergedSignatures,
    };

    if (isEditing && selectedRecord) {
      updateMutation.mutate({
        id: selectedRecord.id,
        data: {
          itemName: formData.productName,
          batchNo: formData.batchNo || undefined,
          relatedDocNo: formData.productCode || undefined,
          result: (["qualified", "unqualified", "conditional"].includes(formData.result)
            ? formData.result
            : undefined) as any,
          inspectionDate: formData.inspectionDate || undefined,
          remark: JSON.stringify(extraData),
        },
      });
    } else {
      const year = new Date().getFullYear();
      const mm = String(new Date().getMonth() + 1).padStart(2, "0");
      const dd = String(new Date().getDate()).padStart(2, "0");
      const inspectionNo = `IPQC-${year}-${mm}${dd}-${String(Date.now()).slice(-4)}`;
      createMutation.mutate({
        inspectionNo,
        type: "IPQC",
        itemName: formData.productName,
        batchNo: formData.batchNo || undefined,
        relatedDocNo: formData.productCode || undefined,
        result: (["qualified", "unqualified", "conditional"].includes(formData.result)
          ? formData.result
          : undefined) as any,
        inspectionDate: formData.inspectionDate || undefined,
        remark: JSON.stringify(extraData),
      });
    }
  };

  function requestSubmitWithSignature() {
    if (!formData.productName || !formData.batchNo || !formData.process) {
      toast.error("请填写必填字段");
      return;
    }
    const nextSignatureType = getNextSignatureType(signatures);
    if (!nextSignatureType) {
      handleSubmit();
      return;
    }
    setSignaturePassword("");
    setSignatureDialogOpen(true);
  }

  async function handleSignatureConfirm() {
    if (!signaturePassword.trim()) {
      toast.error("请输入密码");
      return;
    }
    try {
      await verifyPasswordMutation.mutateAsync({ password: signaturePassword });
      const nextSignatureType = getNextSignatureType(signatures);
      const currentUserName = String((user as any)?.name || formData.inspector || "当前用户");
      const currentUserDepartment = String((user as any)?.department || "质量部");
      const nextSignature = nextSignatureType
        ? {
            id: Date.now(),
            signatureType: nextSignatureType,
            signatureAction: `IPQC检验${nextSignatureType === "inspector" ? "检验员" : "复核员"}签名`,
            signerName: currentUserName,
            signerTitle: nextSignatureType === "inspector" ? "质量检验员" : "质量复核员",
            signerDepartment: currentUserDepartment,
            signedAt: new Date().toISOString(),
            signatureMeaning:
              nextSignatureType === "inspector"
                ? "本人确认已按照过程检验规程进行检验，检验结果真实、准确、完整。"
                : "本人确认已复核过程检验记录，数据真实可靠，检验方法符合规定。",
            status: "valid" as const,
          }
        : null;
      setSignatureDialogOpen(false);
      setSignaturePassword("");
      if (nextSignature) {
        setSignatures((prev) => mergeSignatureRecords(prev, nextSignature));
      }
      handleSubmit(nextSignature);
    } catch (error: any) {
      toast.error(error?.message || "密码校验失败");
    }
  }

  const updateInspectionItem = (index: number, field: keyof InspectionItem, value: string) => {
    const newItems = [...formData.inspectionItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, inspectionItems: newItems });
  };

  const addInspectionItem = () => {
    setFormData({
      ...formData,
      inspectionItems: [
        ...formData.inspectionItems,
        { name: "", standard: "", result: "", conclusion: "pending" },
      ],
    });
  };

  const removeInspectionItem = (index: number) => {
    const newItems = formData.inspectionItems.filter((_, i) => i !== index);
    setFormData({ ...formData, inspectionItems: newItems });
  };

  // 统计信息（排除草稿）
  const statsData = data.filter((r) => (r.result as string) !== "draft");
  const stats = {
    total: statsData.length,
    pending: statsData.filter((r) => r.result === "pending").length,
    qualified: statsData.filter((r) => r.result === "qualified").length,
    unqualified: statsData.filter((r) => r.result === "unqualified").length,
  };

  const handleSaveDraft = () => {
    if (!formData.productName) {
      toast.error("请填写产品名称");
      return;
    }
    const extraData = {
      productCode: formData.productCode,
      process: formData.process,
      inspectionType: formData.inspectionType,
      result: formData.result,
      inspector: formData.inspector,
      workstation: formData.workstation,
      remarks: formData.remarks,
      inspectionItems: formData.inspectionItems,
      signatures: [],
    };
    const year = new Date().getFullYear();
    const mm = String(new Date().getMonth() + 1).padStart(2, "0");
    const dd = String(new Date().getDate()).padStart(2, "0");
    saveDraftMutation.mutate({
      id: isEditing && selectedRecord ? Number(selectedRecord.id) : undefined,
      inspectionNo: isEditing && selectedRecord ? selectedRecord.inspectionNo : `IPQC-${year}-${mm}${dd}-${String(Date.now()).slice(-4)}`,
      type: "IPQC",
      itemName: formData.productName,
      batchNo: formData.batchNo || undefined,
      relatedDocNo: formData.productCode || undefined,
      inspectionDate: formData.inspectionDate || undefined,
      remark: JSON.stringify(extraData),
    });
  };
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );
  const goBack = () => {
    setFormDialogOpen(false);
    setViewDialogOpen(false);
  };

  if (viewDialogOpen && selectedRecord) {
    const signCount = selectedRecord.signatures?.filter((s: any) => s.status === "valid").length || 0;
    return (
      <ERPLayout>
        <div className="flex flex-col h-full">
          <div className="border-b bg-background px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" />过程检验
                </Button>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold">{selectedRecord.inspectionNo}</span>
              </div>
              <div className="flex items-center gap-2">
                <TemplatePrintPreviewButton
                  templateKey="ipqc_inspection"
                  data={{
                    inspectionNo: selectedRecord.inspectionNo,
                    productName: selectedRecord.productName || "",
                    productCode: selectedRecord.productCode || "",
                    batchNo: selectedRecord.batchNo || "",
                    process: selectedRecord.process || "",
                    inspectionType: inspectionTypeMap[selectedRecord.inspectionType] || selectedRecord.inspectionType || "",
                    inspectionDate: selectedRecord.inspectionDate || "",
                    inspector: selectedRecord.inspector || "",
                    workstation: selectedRecord.workstation || "",
                    result: statusMap[selectedRecord.result]?.label || selectedRecord.result || "",
                    resultPassed: selectedRecord.result === "qualified",
                    remarks: selectedRecord.remarks || "",
                    hasItems: (selectedRecord.inspectionItems || []).length > 0,
                    inspectionItems: (selectedRecord.inspectionItems || []).map((it: InspectionItem) => ({
                      itemName: it.name || "",
                      standard: it.standard || "",
                      measuredValue: it.result || "",
                      conclusion: it.conclusion === "qualified" ? "合格" : it.conclusion === "unqualified" ? "不合格" : "待判定",
                      passed: it.conclusion === "qualified",
                    })),
                  }}
                  title={`过程检验详情 - ${selectedRecord.inspectionNo}`}
                />
                {selectedRecord.sourceType !== "production" ? (
                  <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); handleEdit(selectedRecord); }}>
                    <Edit className="h-3.5 w-3.5 mr-1.5" />编辑
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div ref={detailPrintRef} className="max-w-6xl mx-auto px-6 py-6 space-y-6">
              <Card>
                <CardContent className="p-5 md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedRecord.inspectionNo}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">过程检验详情与结果汇总</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{inspectionTypeMap[selectedRecord.inspectionType] || selectedRecord.inspectionType}</Badge>
                      <Badge
                        variant={statusMap[selectedRecord.result]?.variant || "outline"}
                        className={statusMap[selectedRecord.result]?.color || ""}
                      >
                        {statusMap[selectedRecord.result]?.label || selectedRecord.result}
                      </Badge>
                      {selectedRecord.sourceType === "production" ? (
                        <Badge variant="outline" className="text-muted-foreground">生产带入</Badge>
                      ) : signCount >= 2 ? (
                        <Badge className="bg-green-100 text-green-800">
                          <FileCheck className="h-3 w-3 mr-1" />
                          已完成
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 text-sm font-medium">基础信息</div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <FieldRow label="产品名称">{selectedRecord.productName}</FieldRow>
                      <FieldRow label="产品编码">{selectedRecord.productCode || "-"}</FieldRow>
                      <FieldRow label="批次号">{selectedRecord.batchNo}</FieldRow>
                      <FieldRow label="工序">{selectedRecord.process}</FieldRow>
                      <FieldRow label="检验类型">{inspectionTypeMap[selectedRecord.inspectionType] || selectedRecord.inspectionType}</FieldRow>
                      <FieldRow label="检验日期">{formatDateValue(selectedRecord.inspectionDate)}</FieldRow>
                      <FieldRow label="检验员">{selectedRecord.inspector || "-"}</FieldRow>
                      <FieldRow label="工位">{selectedRecord.workstation || "-"}</FieldRow>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 md:p-6">
                  <Tabs defaultValue="items" className="w-full">
                    <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto">
                      <TabsTrigger value="items" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                        检验项目
                      </TabsTrigger>
                      <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                        备注
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="items" className="mt-5">
                      {selectedRecord.inspectionItems.length > 0 ? (
                        <div className="overflow-hidden rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>检验项目</TableHead>
                                <TableHead>检验标准</TableHead>
                                <TableHead>检验结果</TableHead>
                                <TableHead className="w-[140px]">结论</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedRecord.inspectionItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                  <TableCell className="font-medium">{item.name}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{item.standard || "-"}</TableCell>
                                  <TableCell>{item.result || "-"}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={item.conclusion === "qualified" ? "text-green-600" : item.conclusion === "unqualified" ? "text-red-600" : "text-gray-600"}
                                    >
                                      {item.conclusion === "qualified" ? "合格" : item.conclusion === "unqualified" ? "不合格" : "待定"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                          暂无检验项目
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="notes" className="mt-5">
                      <div className="rounded-lg border bg-muted/10 p-4 text-sm whitespace-pre-wrap">
                        {selectedRecord.remarks || "暂无备注"}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ERPLayout>
    );
  }

  if (formDialogOpen) {
    return (
      <ERPLayout>
        <div className="flex flex-col h-full">
          <div className="border-b bg-background px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" />过程检验
                </Button>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold">{isEditing && selectedRecord ? selectedRecord.inspectionNo : "新建"}</span>
              </div>
              <div className="flex items-center gap-2">
                <TemplatePrintPreviewButton
                  templateKey="ipqc_inspection"
                  data={{
                    inspectionNo: isEditing && selectedRecord ? selectedRecord.inspectionNo : "",
                    productName: formData.productName || "",
                    productCode: formData.productCode || "",
                    batchNo: formData.batchNo || "",
                    process: formData.process || "",
                    inspectionType: inspectionTypeMap[formData.inspectionType] || formData.inspectionType || "",
                    inspectionDate: formData.inspectionDate || "",
                    inspector: formData.inspector || "",
                    workstation: formData.workstation || "",
                    result: statusMap[formData.result]?.label || formData.result || "",
                    resultPassed: formData.result === "qualified",
                    remarks: formData.remarks || "",
                    hasItems: formData.inspectionItems.length > 0,
                    inspectionItems: formData.inspectionItems.map((it: InspectionItem) => ({
                      itemName: it.name || "",
                      standard: it.standard || "",
                      measuredValue: it.result || "",
                      conclusion: it.conclusion === "qualified" ? "合格" : it.conclusion === "unqualified" ? "不合格" : "待判定",
                      passed: it.conclusion === "qualified",
                    })),
                  }}
                  title={isEditing && selectedRecord ? `过程检验表单 - ${selectedRecord.inspectionNo}` : "新建过程检验"}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveDraft}
                  disabled={saveDraftMutation.isPending}
                >
                  {saveDraftMutation.isPending ? "保存中..." : "保存草稿"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={requestSubmitWithSignature}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div ref={formPrintRef} className="max-w-6xl mx-auto px-6 py-6 space-y-6">
              <Card>
                <CardContent className="p-5 md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{isEditing && selectedRecord ? selectedRecord.inspectionNo : "新建过程检验"}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">统一录入过程检验基础信息、检验项目与检验结论</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{inspectionTypeMap[formData.inspectionType] || formData.inspectionType}</Badge>
                      <Badge variant={statusMap[formData.result]?.variant || "outline"} className={statusMap[formData.result]?.color || ""}>
                        {statusMap[formData.result]?.label || formData.result}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 text-sm font-medium">基础信息</div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-2">
                        <Label>产品编码</Label>
                        <Input
                          value={formData.productCode}
                          onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                          placeholder="如: MD-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>产品名称 *</Label>
                        <Input
                          value={formData.productName}
                          onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                          placeholder="输入产品名称"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>批次号 *</Label>
                        <Input
                          value={formData.batchNo}
                          onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                          placeholder="输入批次号"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>工序 *</Label>
                        <Input
                          value={formData.process}
                          onChange={(e) => setFormData({ ...formData, process: e.target.value })}
                          placeholder="如: 注塑成型、组装、包装"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验类型</Label>
                        <Select
                          value={formData.inspectionType}
                          onValueChange={(v) => setFormData({ ...formData, inspectionType: v as IPQCRecord["inspectionType"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="first">首检</SelectItem>
                            <SelectItem value="patrol">巡检</SelectItem>
                            <SelectItem value="final">末检</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>工位</Label>
                        <Input
                          value={formData.workstation}
                          onChange={(e) => setFormData({ ...formData, workstation: e.target.value })}
                          placeholder="如: 注塑车间-1号机"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验日期</Label>
                        <Input
                          type="date"
                          value={formData.inspectionDate}
                          onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验员</Label>
                        <Input
                          value={formData.inspector}
                          onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                          placeholder="输入检验员姓名"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验结果</Label>
                        <Select
                          value={formData.result}
                          onValueChange={(v) => setFormData({ ...formData, result: v as IPQCRecord["result"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">待检验</SelectItem>
                            <SelectItem value="inspecting">检验中</SelectItem>
                            <SelectItem value="qualified">合格</SelectItem>
                            <SelectItem value="unqualified">不合格</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 md:p-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto">
                      <TabsTrigger value="items" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                        检验项目 {formData.inspectionItems.length > 0 && `(${formData.inspectionItems.length})`}
                      </TabsTrigger>
                      <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                        备注
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="items" className="mt-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">统一录入过程检验项目、标准、结果与结论</div>
                        <Button variant="outline" size="sm" onClick={addInspectionItem}>
                          <Plus className="h-4 w-4 mr-1" />
                          添加项目
                        </Button>
                      </div>

                      {formData.inspectionItems.length === 0 ? (
                        <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                          暂无检验项目，点击“添加项目”开始录入
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>检验项目</TableHead>
                                <TableHead>检验标准</TableHead>
                                <TableHead>检验结果</TableHead>
                                <TableHead className="w-[140px]">结论</TableHead>
                                <TableHead className="w-12" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {formData.inspectionItems.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                  <TableCell>
                                    <Input
                                      value={item.name}
                                      onChange={(e) => updateInspectionItem(index, "name", e.target.value)}
                                      placeholder="项目名称"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={item.standard}
                                      onChange={(e) => updateInspectionItem(index, "standard", e.target.value)}
                                      placeholder="标准要求"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={item.result}
                                      onChange={(e) => updateInspectionItem(index, "result", e.target.value)}
                                      placeholder="实测值"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={item.conclusion}
                                      onValueChange={(v) => updateInspectionItem(index, "conclusion", v)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">待定</SelectItem>
                                        <SelectItem value="qualified">合格</SelectItem>
                                        <SelectItem value="unqualified">不合格</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive"
                                      onClick={() => removeInspectionItem(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="notes" className="mt-5">
                      <Textarea
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        placeholder="输入备注信息"
                        rows={6}
                        className="resize-none"
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">过程检验(IPQC)</h1>
              <p className="text-sm text-muted-foreground">
                生产过程中的质量检验，支持首检、巡检、末检
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              刷新
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              新建检验
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">检验总数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">待检验</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.qualified}</div>
              <div className="text-sm text-muted-foreground">合格</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.unqualified}</div>
              <div className="text-sm text-muted-foreground">不合格</div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索检验单号、产品名称、批次号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待检验</SelectItem>
              <SelectItem value="inspecting">检验中</SelectItem>
              <SelectItem value="qualified">合格</SelectItem>
              <SelectItem value="unqualified">不合格</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 数据表格 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="text-center font-bold">检验单号</TableHead>
                <TableHead className="text-center font-bold">产品名称</TableHead>
                <TableHead className="text-center font-bold">批次号</TableHead>
                <TableHead className="text-center font-bold">工序</TableHead>
                <TableHead className="text-center font-bold">检验类型</TableHead>
                <TableHead className="text-center font-bold">检验结果</TableHead>
                <TableHead className="text-center font-bold">签名状态</TableHead>
                <TableHead className="text-center font-bold">检验日期</TableHead>
                <TableHead className="text-center font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((record) => {
                const signCount = record.signatures?.filter((s: any) => s.status === "valid").length || 0;
                return (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-mono">{record.inspectionNo}</TableCell>
                    <TableCell className="text-center font-medium">{record.productName}</TableCell>
                    <TableCell className="text-center font-mono">{record.batchNo}</TableCell>
                    <TableCell className="text-center">{record.process}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{inspectionTypeMap[record.inspectionType] || record.inspectionType}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={statusMap[record.result]?.variant || "outline"}
                        className={statusMap[record.result]?.color || ""}
                      >
                        {statusMap[record.result]?.label || record.result}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {record.sourceType === "production" ? (
                        <Badge variant="outline" className="text-muted-foreground">生产带入</Badge>
                      ) : signCount >= 2 ? (
                        <Badge className="bg-green-100 text-green-800">
                          <FileCheck className="h-3 w-3 mr-1" />
                          已完成
                        </Badge>
                      ) : signCount > 0 ? (
                        <Badge variant="outline" className="text-amber-600">
                          {signCount}/2
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          待签名
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{formatDateValue(record.inspectionDate)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(record)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          {record.sourceType !== "production" && (
                            <DropdownMenuItem onClick={() => handleEdit(record)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                          )}
                          {canDelete && record.sourceType !== "production" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(record)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {isLoading ? "加载中..." : "暂无数据"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {filteredData.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <div className="text-sm text-muted-foreground">
              显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredData.length)} 条，
              共 {filteredData.length} 条，第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
                上一页
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
                下一页
              </Button>
            </div>
          </div>
        )}

        {/* 新建/编辑表单对话框 */}
        <DraggableDialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto p-0">
            <div className="space-y-6">
              <div className="border-b bg-background px-6 py-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{isEditing && selectedRecord ? selectedRecord.inspectionNo : "新建过程检验"}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">统一录入过程检验基础信息、检验项目与检验结论</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{inspectionTypeMap[formData.inspectionType] || formData.inspectionType}</Badge>
                    <Badge variant={statusMap[formData.result]?.variant || "outline"} className={statusMap[formData.result]?.color || ""}>
                      {statusMap[formData.result]?.label || formData.result}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 space-y-6">
                <Card>
                  <CardContent className="p-5 md:p-6">
                    <div className="mb-3 text-sm font-medium">基础信息</div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-2">
                        <Label>产品编码</Label>
                        <Input
                          value={formData.productCode}
                          onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                          placeholder="如: MD-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>产品名称 *</Label>
                        <Input
                          value={formData.productName}
                          onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                          placeholder="输入产品名称"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>批次号 *</Label>
                        <Input
                          value={formData.batchNo}
                          onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                          placeholder="输入批次号"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>工序 *</Label>
                        <Input
                          value={formData.process}
                          onChange={(e) => setFormData({ ...formData, process: e.target.value })}
                          placeholder="如: 注塑成型、组装、包装"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验类型</Label>
                        <Select
                          value={formData.inspectionType}
                          onValueChange={(v) => setFormData({ ...formData, inspectionType: v as IPQCRecord["inspectionType"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="first">首检</SelectItem>
                            <SelectItem value="patrol">巡检</SelectItem>
                            <SelectItem value="final">末检</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>工位</Label>
                        <Input
                          value={formData.workstation}
                          onChange={(e) => setFormData({ ...formData, workstation: e.target.value })}
                          placeholder="如: 注塑车间-1号机"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验日期</Label>
                        <Input
                          type="date"
                          value={formData.inspectionDate}
                          onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验员</Label>
                        <Input
                          value={formData.inspector}
                          onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                          placeholder="输入检验员姓名"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验结果</Label>
                        <Select
                          value={formData.result}
                          onValueChange={(v) => setFormData({ ...formData, result: v as IPQCRecord["result"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">待检验</SelectItem>
                            <SelectItem value="inspecting">检验中</SelectItem>
                            <SelectItem value="qualified">合格</SelectItem>
                            <SelectItem value="unqualified">不合格</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 md:p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto">
                        <TabsTrigger value="items" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                          检验项目 {formData.inspectionItems.length > 0 && `(${formData.inspectionItems.length})`}
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                          备注
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="items" className="mt-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">统一录入过程检验项目、标准、结果与结论</div>
                          <Button variant="outline" size="sm" onClick={addInspectionItem}>
                            <Plus className="h-4 w-4 mr-1" />
                            添加项目
                          </Button>
                        </div>

                        {formData.inspectionItems.length === 0 ? (
                          <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                            暂无检验项目，点击“添加项目”开始录入
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-lg border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">#</TableHead>
                                  <TableHead>检验项目</TableHead>
                                  <TableHead>检验标准</TableHead>
                                  <TableHead>检验结果</TableHead>
                                  <TableHead className="w-[140px]">结论</TableHead>
                                  <TableHead className="w-12" />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {formData.inspectionItems.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell>
                                      <Input
                                        value={item.name}
                                        onChange={(e) => updateInspectionItem(index, "name", e.target.value)}
                                        placeholder="项目名称"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={item.standard}
                                        onChange={(e) => updateInspectionItem(index, "standard", e.target.value)}
                                        placeholder="标准要求"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={item.result}
                                        onChange={(e) => updateInspectionItem(index, "result", e.target.value)}
                                        placeholder="实测值"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={item.conclusion}
                                        onValueChange={(v) => updateInspectionItem(index, "conclusion", v)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">待定</SelectItem>
                                          <SelectItem value="qualified">合格</SelectItem>
                                          <SelectItem value="unqualified">不合格</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        onClick={() => removeInspectionItem(index)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="notes" className="mt-5">
                        <Textarea
                          value={formData.remarks}
                          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                          placeholder="输入备注信息"
                          rows={6}
                          className="resize-none"
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
                    取消
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleSaveDraft}
                    disabled={saveDraftMutation.isPending}
                  >
                    {saveDraftMutation.isPending ? "保存中..." : "保存草稿"}
                  </Button>
                  <Button
                    onClick={requestSubmitWithSignature}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {isEditing ? "保存" : "创建"}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情与电子签名对话框 */}
{selectedRecord && (
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
    <div className="border-b pb-3">
      <h2 className="text-lg font-semibold">过程检验详情</h2>
      <p className="text-sm text-muted-foreground">
        {selectedRecord.inspectionNo}
        {selectedRecord.result && (
          <> · <Badge variant={statusMap[selectedRecord.result]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(selectedRecord.result, statusMap[selectedRecord.result]?.label)}`}>
            {statusMap[selectedRecord.result]?.label || String(selectedRecord.result ?? "-")}
          </Badge></>
        )}
      </p>
    </div>

    <div className="space-y-6 py-4">
      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <FieldRow label="产品名称">{selectedRecord.productName}</FieldRow>
            <FieldRow label="产品编码">{selectedRecord.productCode || "-"}</FieldRow>
            <FieldRow label="批次号">{selectedRecord.batchNo}</FieldRow>
            <FieldRow label="工序">{selectedRecord.process}</FieldRow>
          </div>
          <div>
            <FieldRow label="检验类型">
              <Badge variant="outline">{inspectionTypeMap[selectedRecord.inspectionType] || selectedRecord.inspectionType}</Badge>
            </FieldRow>
            <FieldRow label="检验日期">{formatDateValue(selectedRecord.inspectionDate)}</FieldRow>
            <FieldRow label="检验员">{selectedRecord.inspector || "-"}</FieldRow>
            <FieldRow label="工位">{selectedRecord.workstation || "-"}</FieldRow>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">检验项目</h3>
        <div className="space-y-2">
          {selectedRecord.inspectionItems.length > 0 ? (
            selectedRecord.inspectionItems.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                <div className="flex-1">
                  <span className="font-medium">{item.name}</span>
                  {item.standard && <span className="text-muted-foreground ml-2">({item.standard})</span>}
                </div>
                <div className="flex items-center gap-2 w-40 justify-end">
                  <span className="flex-1 text-right break-all">{item.result}</span>
                  <Badge
                    variant="outline"
                    className={`w-16 justify-center ${item.conclusion === "qualified" ? "text-green-600" : item.conclusion === "unqualified" ? "text-red-600" : "text-gray-600"}`}>
                    {item.conclusion === "qualified" ? "合格" : item.conclusion === "unqualified" ? "不合格" : "待定"}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">暂无检验项目</p>
          )}
        </div>
      </div>

      {selectedRecord.remarks && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
          <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{selectedRecord.remarks}</p>
        </div>
      )}

    </div>

    <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
      <div className="flex gap-2 flex-wrap"></div>
      <div className="flex gap-2 flex-wrap justify-end">
        <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
        {selectedRecord.sourceType !== "production" && (
          <Button variant="outline" size="sm" onClick={() => handleEdit(selectedRecord)}>编辑</Button>
        )}
      </div>
    </div>
  </DraggableDialogContent>
</DraggableDialog>
)}
        <DraggableDialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
          <DraggableDialogContent title="电子签名验证" className="max-w-xs">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  请输入登录密码完成签名
                </div>
                <Input
                  type="password"
                  value={signaturePassword}
                  onChange={(e) => setSignaturePassword(e.target.value)}
                  placeholder="请输入当前用户密码"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSignatureConfirm();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSignatureDialogOpen(false);
                    setSignaturePassword("");
                  }}
                >
                  取消
                </Button>
                <Button onClick={handleSignatureConfirm} disabled={verifyPasswordMutation.isPending}>
                  {verifyPasswordMutation.isPending ? "验证中..." : "确认并保存"}
                </Button>
              </div>
            </div>
          </DraggableDialogContent>
        </DraggableDialog>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确认删除检验单 {recordToDelete?.inspectionNo || ""} 吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRecordToDelete(null)}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ERPLayout>
  );
}
