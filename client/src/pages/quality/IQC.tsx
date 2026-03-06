import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { SignatureStatusCard, SignatureRecord } from "@/components/ElectronicSignature";
import { PackageSearch, FileCheck, Plus, Search, Edit, Trash2, Eye, MoreHorizontal } from "lucide-react";
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

interface InspectionItem {
  name: string;
  standard: string;
  result: string;
  conclusion: "qualified" | "unqualified" | "pending";
}

interface IQCRecord {
  id: number;
  inspectionNo: string;
  materialCode: string;
  materialName: string;
  supplier: string;
  batchNo: string;
  quantity: string;
  unit: string;
  receiveDate: string;
  inspectionDate: string;
  result: "pending" | "inspecting" | "qualified" | "unqualified" | "conditional";
  inspector: string;
  remarks: string;
  inspectionItems: InspectionItem[];
  signatures?: SignatureRecord[];
}

const statusMap: Record<string, any> = {
  pending: { label: "待检", variant: "outline" as const, color: "text-gray-600" },
  inspecting: { label: "检验中", variant: "default" as const, color: "text-blue-600" },
  qualified: { label: "合格", variant: "secondary" as const, color: "text-green-600" },
  unqualified: { label: "不合格", variant: "destructive" as const, color: "text-red-600" },
  conditional: { label: "让步接收", variant: "outline" as const, color: "text-amber-600" },
};

const defaultInspectionItems: InspectionItem[] = [
  { name: "外观检查", standard: "", result: "", conclusion: "pending" },
  { name: "尺寸测量", standard: "", result: "", conclusion: "pending" },
  { name: "理化性能", standard: "", result: "", conclusion: "pending" },
];

// 将数据库记录转换为前端显示格式
function dbToDisplay(record: any): IQCRecord {
  let extra: any = {};
  try {
    // 从 remark 字段解析额外信息（JSON格式存储）
    if (record.remark && record.remark.startsWith("{")) {
      const parsed = JSON.parse(record.remark);
      extra = parsed;
    }
  } catch {}
  return {
    id: record.id,
    inspectionNo: record.inspectionNo,
    materialCode: extra.materialCode || record.relatedDocNo || "",
    materialName: record.itemName || "",
    supplier: extra.supplier || "",
    batchNo: record.batchNo || "",
    quantity: String(record.inspectedQty || extra.quantity || ""),
    unit: extra.unit || "",
    receiveDate: extra.receiveDate || "",
    inspectionDate: record.inspectionDate ? String(record.inspectionDate).split("T")[0] : "",
    result: (extra.result || record.result || "pending") as IQCRecord["result"],
    inspector: extra.inspector || "",
    remarks: extra.remarks || "",
    inspectionItems: extra.inspectionItems || [],
    signatures: extra.signatures || [],
  };
}

export default function IQCPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.qualityInspections.list.useQuery({ type: "IQC" });
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

  const data: IQCRecord[] = (_dbData as any[]).map(dbToDisplay);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IQCRecord | null>(null);
  const focusHandledRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    materialCode: "",
    materialName: "",
    supplier: "",
    batchNo: "",
    quantity: "",
    unit: "kg",
    receiveDate: "",
    inspectionDate: "",
    result: "pending" as IQCRecord["result"],
    inspector: "",
    remarks: "",
    inspectionItems: defaultInspectionItems,
  });

  const filteredData = data.filter((record: IQCRecord) => {
    const matchesSearch =
      String(record.inspectionNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.materialName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.supplier ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.result === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData({
      materialCode: "",
      materialName: "",
      supplier: "",
      batchNo: "",
      quantity: "",
      unit: "kg",
      receiveDate: new Date().toISOString().split("T")[0],
      inspectionDate: "",
      result: "pending",
      inspector: "",
      remarks: "",
      inspectionItems: [...defaultInspectionItems],
    });
    setFormDialogOpen(true);
  };

  const handleEdit = (record: IQCRecord) => {
    setIsEditing(true);
    setSelectedRecord(record);
    setFormData({
      materialCode: record.materialCode,
      materialName: record.materialName,
      supplier: record.supplier,
      batchNo: record.batchNo,
      quantity: record.quantity,
      unit: record.unit,
      receiveDate: record.receiveDate,
      inspectionDate: record.inspectionDate,
      result: record.result,
      inspector: record.inspector,
      remarks: record.remarks,
      inspectionItems: record.inspectionItems.length > 0 ? record.inspectionItems : [...defaultInspectionItems],
    });
    setFormDialogOpen(true);
  };

  const handleView = (record: IQCRecord) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: IQCRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    deleteMutation.mutate({ id: record.id });
  };

  useEffect(() => {
    if (focusHandledRef.current) return;
    const raw = new URLSearchParams(window.location.search).get("focusId");
    const focusId = Number(raw);
    if (!Number.isFinite(focusId) || focusId <= 0) return;
    const record = data.find((item) => item.id === focusId);
    if (!record) return;
    focusHandledRef.current = true;
    handleView(record);
    const next = new URL(window.location.href);
    next.searchParams.delete("focusId");
    window.history.replaceState({}, "", `${next.pathname}${next.search}`);
  }, [data]);

  const handleSubmit = () => {
    if (!formData.materialName || !formData.supplier || !formData.batchNo) {
      toast.error("请填写必填字段");
      return;
    }

    // 将额外字段存入 remark（JSON格式）
    const extraData = {
      materialCode: formData.materialCode,
      supplier: formData.supplier,
      quantity: formData.quantity,
      unit: formData.unit,
      receiveDate: formData.receiveDate,
      result: formData.result,
      inspector: formData.inspector,
      remarks: formData.remarks,
      inspectionItems: formData.inspectionItems,
      signatures: isEditing && selectedRecord ? (selectedRecord.signatures || []) : [],
    };

    if (isEditing && selectedRecord) {
      updateMutation.mutate({
        id: selectedRecord.id,
        data: {
          itemName: formData.materialName,
          batchNo: formData.batchNo || undefined,
          relatedDocNo: formData.materialCode || undefined,
          inspectedQty: formData.quantity || undefined,
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
      const inspectionNo = `IQC-${year}-${mm}${dd}-${String(Date.now()).slice(-4)}`;
      createMutation.mutate({
        inspectionNo,
        type: "IQC",
        itemName: formData.materialName,
        batchNo: formData.batchNo || undefined,
        relatedDocNo: formData.materialCode || undefined,
        inspectedQty: formData.quantity || undefined,
        result: (["qualified", "unqualified", "conditional"].includes(formData.result)
          ? formData.result
          : undefined) as any,
        inspectionDate: formData.inspectionDate || undefined,
        remark: JSON.stringify(extraData),
      });
    }
  };

  const handleSignComplete = (signature: SignatureRecord) => {
    if (!selectedRecord) return;
    setSelectedRecord((prev) =>
      prev
        ? {
            ...prev,
            signatures: [...(prev.signatures || []), signature],
          }
        : null
    );
  };

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

  // 统计信息
  const stats = {
    total: data.length,
    pending: data.filter((r) => r.result === "pending").length,
    qualified: data.filter((r) => r.result === "qualified").length,
    unqualified: data.filter((r) => r.result === "unqualified").length,
  };

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (

    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">

      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>

      <span className="flex-1 text-sm text-right break-all">{children}</span>

    </div>

  );


  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PackageSearch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">来料检验(IQC)</h1>
              <p className="text-sm text-muted-foreground">
                原材料入库前的质量检验，支持电子签名确认
              </p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            新建检验
          </Button>
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
              placeholder="搜索检验单号、物料名称、供应商..."
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
              <SelectItem value="conditional">让步接收</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 数据表格 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="text-center font-bold">检验单号</TableHead>
                <TableHead className="text-center font-bold">物料名称</TableHead>
                <TableHead className="text-center font-bold">供应商</TableHead>
                <TableHead className="text-center font-bold">批次号</TableHead>
                <TableHead className="text-center font-bold">数量</TableHead>
                <TableHead className="text-center font-bold">检验结果</TableHead>
                <TableHead className="text-center font-bold">签名状态</TableHead>
                <TableHead className="text-center font-bold">检验日期</TableHead>
                <TableHead className="text-center font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((record) => {
                const signCount = record.signatures?.filter((s: any) => s.status === "valid").length || 0;
                return (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-mono">{record.inspectionNo}</TableCell>
                    <TableCell className="text-center font-medium">{record.materialName}</TableCell>
                    <TableCell className="text-center">{record.supplier}</TableCell>
                    <TableCell className="text-center font-mono">{record.batchNo}</TableCell>
                    <TableCell className="text-center">{record.quantity} {record.unit}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={statusMap[record.result]?.variant || "outline"}
                        className={statusMap[record.result]?.color || ""}
                      >
                        {statusMap[record.result]?.label || record.result}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {signCount === 3 ? (
                        <Badge className="bg-green-100 text-green-800">
                          <FileCheck className="h-3 w-3 mr-1" />
                          已完成
                        </Badge>
                      ) : signCount > 0 ? (
                        <Badge variant="outline" className="text-amber-600">
                          {signCount}/3
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
                          <DropdownMenuItem onClick={() => handleEdit(record)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          {canDelete && (
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
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {isLoading ? "加载中..." : "暂无数据"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* 新建/编辑表单对话框 */}
        <DraggableDialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "编辑检验记录" : "新建来料检验"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 基本信息 */}
              <div>
                <h3 className="text-sm font-medium mb-3">基本信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>物料编码</Label>
                    <Input
                      value={formData.materialCode}
                      onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                      placeholder="如: MAT-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>物料名称 *</Label>
                    <Input
                      value={formData.materialName}
                      onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                      placeholder="输入物料名称"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>供应商 *</Label>
                    <Input
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="输入供应商名称"
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
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>数量</Label>
                      <Input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="数量"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>单位</Label>
                      <Select
                        value={formData.unit}
                        onValueChange={(v) => setFormData({ ...formData, unit: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="个">个</SelectItem>
                          <SelectItem value="套">套</SelectItem>
                          <SelectItem value="卷">卷</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>到货日期</Label>
                    <Input
                      type="date"
                      value={formData.receiveDate}
                      onChange={(e) => setFormData({ ...formData, receiveDate: e.target.value })}
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
                      onValueChange={(v) => setFormData({ ...formData, result: v as IQCRecord["result"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">待检验</SelectItem>
                        <SelectItem value="inspecting">检验中</SelectItem>
                        <SelectItem value="qualified">合格</SelectItem>
                        <SelectItem value="unqualified">不合格</SelectItem>
                        <SelectItem value="conditional">让步接收</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 检验项目 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">检验项目</h3>
                  <Button variant="outline" size="sm" onClick={addInspectionItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    添加项目
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.inspectionItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3">
                        <Label className="text-xs">检验项目</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateInspectionItem(index, "name", e.target.value)}
                          placeholder="项目名称"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">检验标准</Label>
                        <Input
                          value={item.standard}
                          onChange={(e) => updateInspectionItem(index, "standard", e.target.value)}
                          placeholder="标准要求"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">检验结果</Label>
                        <Input
                          value={item.result}
                          onChange={(e) => updateInspectionItem(index, "result", e.target.value)}
                          placeholder="实测值"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">结论</Label>
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
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeInspectionItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 备注 */}
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="输入备注信息"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEditing ? "保存" : "创建"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情与电子签名对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {selectedRecord && (
      <div className="space-y-6">
        {/* 标准头部 */}
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">来料检验详情</h2>
          <p className="text-sm text-muted-foreground">
            {selectedRecord.inspectionNo}
            {selectedRecord.result && (
              <>
                {" "}
                ·
                <Badge
                  variant={statusMap[selectedRecord.result]?.variant || "outline"}
                  className={`ml-1 ${getStatusSemanticClass(selectedRecord.result, statusMap[selectedRecord.result]?.label)}`}
                >
                  {statusMap[selectedRecord.result]?.label || String(selectedRecord.result ?? "-")}
                </Badge>
              </>
            )}
          </p>
        </div>

        {/* 统一字段行展示组件 */}
        {/* 检验信息 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">检验信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="物料编码">{selectedRecord.materialCode || "-"}</FieldRow>
              <FieldRow label="物料名称">{selectedRecord.materialName || "-"}</FieldRow>
              <FieldRow label="供应商">{selectedRecord.supplier || "-"}</FieldRow>
              <FieldRow label="批次号">{selectedRecord.batchNo || "-"}</FieldRow>
              <FieldRow label="数量">{selectedRecord.quantity ? `${selectedRecord.quantity} ${selectedRecord.unit}` : "-"}</FieldRow>
            </div>
            <div>
              <FieldRow label="到货日期">{formatDateValue(selectedRecord.receiveDate)}</FieldRow>
              <FieldRow label="检验日期">{formatDateValue(selectedRecord.inspectionDate)}</FieldRow>
              <FieldRow label="检验员">{selectedRecord.inspector || "-"}</FieldRow>
            </div>
          </div>
        </div>

        {/* 检验项目 */}
        {selectedRecord.inspectionItems && selectedRecord.inspectionItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">检验项目</h3>
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>检验项目</TableHead>
                  <TableHead>检验标准</TableHead>
                  <TableHead>检验结果</TableHead>
                  <TableHead className="text-right">结论</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedRecord.inspectionItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.standard}</TableCell>
                    <TableCell>{item.result}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={item.conclusion === "qualified" ? "secondary" : item.conclusion === "unqualified" ? "destructive" : "outline"}
                      >
                        {item.conclusion === "qualified" ? "合格" : item.conclusion === "unqualified" ? "不合格" : "待定"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 备注 */}
        {selectedRecord.remarks && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{selectedRecord.remarks}</p>
          </div>
        )}

        {/* 电子签名 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">电子签名</h3>
          <SignatureStatusCard
            signatures={selectedRecord.signatures || []}
            onSignComplete={handleSignComplete}
            updateMutation={updateMutation}
            recordId={selectedRecord.id}
            prepareSignData={() => {
              const extraData = {
                materialCode: selectedRecord.materialCode,
                supplier: selectedRecord.supplier,
                quantity: selectedRecord.quantity,
                unit: selectedRecord.unit,
                receiveDate: selectedRecord.receiveDate,
                result: selectedRecord.result,
                inspector: selectedRecord.inspector,
                remarks: selectedRecord.remarks,
                inspectionItems: selectedRecord.inspectionItems,
                signatures: selectedRecord.signatures || [],
              };
              return { remark: JSON.stringify(extraData) };
            }}
          />
        </div>

        {/* 标准操作按钮 */}
        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap">{/* 左侧功能按钮 */}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => {
              setViewDialogOpen(false);
              handleEdit(selectedRecord);
            }}>编辑</Button>
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
