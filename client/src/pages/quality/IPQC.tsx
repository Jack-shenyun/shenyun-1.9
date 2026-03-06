import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { SignatureStatusCard, SignatureRecord } from "@/components/ElectronicSignature";
import { ClipboardList, FileCheck, Plus, Search, Edit, Trash2, Eye, MoreHorizontal } from "lucide-react";
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

interface IPQCRecord {
  id: number;
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
}

const statusMap: Record<string, any> = {
  pending: { label: "待检", variant: "outline" as const, color: "text-gray-600" },
  inspecting: { label: "检验中", variant: "default" as const, color: "text-blue-600" },
  qualified: { label: "合格", variant: "secondary" as const, color: "text-green-600" },
  unqualified: { label: "不合格", variant: "destructive" as const, color: "text-red-600" },
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
  };
}

export default function IPQCPage() {
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

  const data: IPQCRecord[] = (_dbData as any[]).map(dbToDisplay);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IPQCRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { canDelete } = usePermission();

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

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedRecord(null);
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
    setFormDialogOpen(true);
  };

  const handleEdit = (record: IPQCRecord) => {
    setIsEditing(true);
    setSelectedRecord(record);
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
    setFormDialogOpen(true);
  };

  const handleView = (record: IPQCRecord) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: IPQCRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    deleteMutation.mutate({ id: record.id });
  };

  const handleSubmit = () => {
    if (!formData.productName || !formData.batchNo || !formData.process) {
      toast.error("请填写必填字段");
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
      signatures: isEditing && selectedRecord ? (selectedRecord.signatures || []) : [],
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
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">过程检验(IPQC)</h1>
              <p className="text-sm text-muted-foreground">
                生产过程中的质量检验，支持首检、巡检、末检
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
              {filteredData.map((record) => {
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
              <DialogTitle>{isEditing ? "编辑检验记录" : "新建过程检验"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 基本信息 */}
              <div>
                <h3 className="text-sm font-medium mb-3">基本信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
{selectedRecord && (
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
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

      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">电子签名</h3>
        <SignatureStatusCard
          documentType="IPQC"
          documentNo={selectedRecord.inspectionNo}
          documentId={selectedRecord.id}
          signatures={selectedRecord.signatures || []}
          onSignComplete={handleSignComplete}
        />
      </div>
    </div>

    <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
      <div className="flex gap-2 flex-wrap"></div>
      <div className="flex gap-2 flex-wrap justify-end">
        <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
        <Button variant="outline" size="sm" onClick={() => handleEdit(selectedRecord)}>编辑</Button>
      </div>
    </div>
  </DraggableDialogContent>
</DraggableDialog>
)}
      </div>
    </ERPLayout>
  );
}
