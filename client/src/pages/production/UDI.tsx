import { formatDateValue } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DateTextInput from "@/components/DateTextInput";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tags,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Printer,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

interface UDIRecord {
  id: number;
  udiDi: string;
  productName: string;
  productCode: string;
  specification: string;
  batchNo: string;
  udiPi: string;
  serialNo: string;
  productionDate: string;
  expiryDate: string;
  printQty: number;
  printedQty: number;
  status: "pending" | "printing" | "printed" | "used";
  labelType: string;
  createDate: string;
  printDate: string;
  remarks: string;
}

const statusMap: Record<string, any> = {
  pending: { label: "待打印", variant: "outline" as const },
  printing: { label: "打印中", variant: "default" as const },
  printed: { label: "已打印", variant: "secondary" as const },
  used: { label: "已使用", variant: "secondary" as const },
};



const labelTypeOptions = ["GS1-128", "DataMatrix", "QR Code", "RFID"];

export default function UDIPage() {
  const PAGE_SIZE = 10;
  const [, navigate] = useLocation();
  const { data: _dbData = [], isLoading, refetch } = trpc.productionOrders.list.useQuery();
  const createMutation = trpc.productionOrders.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.productionOrders.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.productionOrders.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const records = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<UDIRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<UDIRecord | null>(null);
  const { canDelete } = usePermission();
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    udiDi: "",
    productName: "",
    productCode: "",
    specification: "",
    batchNo: "",
    udiPi: "",
    serialNo: "",
    productionDate: "",
    expiryDate: "",
    printQty: 0,
    printedQty: 0,
    status: "pending",
    labelType: "GS1-128",
    createDate: "",
    printDate: "",
    remarks: "",
  });

  const filteredRecords = records.filter((r: any) => {
    const matchesSearch =
      String(r.udiDi ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.batchNo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pagedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleAdd = () => {
    setEditingRecord(null);
    const timestamp = Date.now().toString().slice(-10);
    setFormData({
      udiDi: `069012345${timestamp.slice(0, 5)}`,
      productName: "",
      productCode: "",
      specification: "",
      batchNo: "",
      udiPi: timestamp,
      serialNo: "",
      productionDate: "",
      expiryDate: "",
      printQty: 0,
      printedQty: 0,
      status: "pending",
      labelType: "GS1-128",
      createDate: new Date().toISOString().split("T")[0],
      printDate: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (record: UDIRecord) => {
    setEditingRecord(record);
    setFormData({
      udiDi: record.udiDi,
      productName: record.productName,
      productCode: record.productCode,
      specification: record.specification,
      batchNo: record.batchNo,
      udiPi: record.udiPi,
      serialNo: record.serialNo,
      productionDate: record.productionDate,
      expiryDate: record.expiryDate,
      printQty: record.printQty,
      printedQty: record.printedQty,
      status: record.status,
      labelType: record.labelType,
      createDate: record.createDate,
      printDate: record.printDate,
      remarks: record.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (record: UDIRecord) => {
    setViewingRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = (record: UDIRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除UDI记录" });
      return;
    }
    deleteMutation.mutate({ id: record.id });
    toast.success("UDI记录已删除");
  };

  const handlePrint = (record: UDIRecord) => {
    toast.success("UDI标签打印完成", { description: `已打印 ${record.printQty} 个标签` });
  };

  const handleSubmit = () => {
    if (!formData.productName || !formData.batchNo || !formData.udiDi) {
      toast.error("请填写必填项", { description: "产品名称、批次号、UDI-DI为必填" });
      return;
    }

    if (editingRecord) {
      toast.success("UDI信息已更新");
    } else {
      const newRecord: UDIRecord = {
        id: Math.max(...records.map((r: any) => r.id)) + 1,
        ...formData,
        status: formData.status as UDIRecord["status"],
      };
      toast.success("UDI记录创建成功");
    }
    setDialogOpen(false);
  };

  const pendingCount = records.filter((r: any) => r.status === "pending").length;
  const printedCount = records.filter((r: any) => r.status === "printed").length;
  const usedCount = records.filter((r: any) => r.status === "used").length;
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
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Tags className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">UDI标签管理</h2>
              <p className="text-sm text-muted-foreground">建立符合全球法规的UDI管理系统，支持标签设计和打印</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/production/udi/designer")}>
              <QrCode className="h-4 w-4 mr-1" />
              标签设计器
            </Button>
            <Button variant="outline" onClick={() => navigate("/production/udi/print")}>
              <Printer className="h-4 w-4 mr-1" />
              打印中心
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              生成UDI
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">UDI总数</p>
              <p className="text-2xl font-bold">{records.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待打印</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已打印</p>
              <p className="text-2xl font-bold text-blue-600">{printedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已使用</p>
              <p className="text-2xl font-bold text-green-600">{usedCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索UDI-DI、产品名称、批次号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待打印</SelectItem>
                  <SelectItem value="printing">打印中</SelectItem>
                  <SelectItem value="printed">已打印</SelectItem>
                  <SelectItem value="used">已使用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 数据表格 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-[140px] text-center font-bold">UDI-DI</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">批次号</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">UDI-PI</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">打印数量</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">创建日期</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRecords.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-center font-mono text-xs">{record.udiDi}</TableCell>
                    <TableCell className="text-center">{record.productName}</TableCell>
                    <TableCell className="text-center">{record.batchNo}</TableCell>
                    <TableCell className="text-center font-mono text-xs">{record.udiPi}</TableCell>
                    <TableCell className="text-center">{record.printQty?.toLocaleString?.() ?? "0"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[record.status]?.variant || "outline"} className={getStatusSemanticClass(record.status, statusMap[record.status]?.label)}>
                        {statusMap[record.status]?.label || String(record.status ?? "-")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{formatDateValue(record.createDate)}</TableCell>
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
                          {record.status === "pending" && (
                            <DropdownMenuItem onClick={() => handlePrint(record)}>
                              <Printer className="h-4 w-4 mr-2" />
                              打印标签
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => toast.info("生成条码预览", { description: record.udiDi })}>
                            <QrCode className="h-4 w-4 mr-2" />
                            预览条码
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(record)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
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
        <TablePaginationFooter total={filteredRecords.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecord ? "编辑UDI信息" : "生成UDI"}</DialogTitle>
              <DialogDescription>
                {editingRecord ? "修改UDI标签信息" : "为产品生成UDI标识"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>UDI-DI (设备标识) *</Label>
                  <Input
                    value={formData.udiDi}
                    onChange={(e) => setFormData({ ...formData, udiDi: e.target.value })}
                    placeholder="设备标识码"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UDI-PI (生产标识)</Label>
                  <Input
                    value={formData.udiPi}
                    onChange={(e) => setFormData({ ...formData, udiPi: e.target.value })}
                    placeholder="生产标识码"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>产品名称 *</Label>
                  <Input
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="产品名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>产品编码</Label>
                  <Input
                    value={formData.productCode}
                    onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                    placeholder="产品编码"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>规格型号</Label>
                  <Input
                    value={formData.specification}
                    onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                    placeholder="规格型号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>批次号 *</Label>
                  <Input
                    value={formData.batchNo}
                    onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                    placeholder="生产批次号"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>序列号</Label>
                  <Input
                    value={formData.serialNo}
                    onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                    placeholder="产品序列号（如适用）"
                  />
                </div>
                <div className="space-y-2">
                  <Label>标签类型</Label>
                  <Select
                    value={formData.labelType}
                    onValueChange={(value) => setFormData({ ...formData, labelType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {labelTypeOptions.map((t: any) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>生产日期</Label>
                  <DateTextInput
                    value={formData.productionDate}
                    onChange={(value) => setFormData({ ...formData, productionDate: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>有效期至</Label>
                  <DateTextInput
                    value={formData.expiryDate}
                    onChange={(value) => setFormData({ ...formData, expiryDate: value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>打印数量</Label>
                  <Input
                    type="number"
                    value={formData.printQty}
                    onChange={(e) => setFormData({ ...formData, printQty: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>已打印数量</Label>
                  <Input
                    type="number"
                    value={formData.printedQty}
                    onChange={(e) => setFormData({ ...formData, printedQty: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待打印</SelectItem>
                      <SelectItem value="printing">打印中</SelectItem>
                      <SelectItem value="printed">已打印</SelectItem>
                      <SelectItem value="used">已使用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="其他备注信息"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingRecord ? "保存修改" : "生成UDI"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

{/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
    {viewingRecord && (
      <div className="space-y-4">
        {/* 标准头部 */}
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">UDI详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingRecord.udiDi}
            {viewingRecord.status && (
              <> · <Badge variant={statusMap[viewingRecord.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingRecord.status, statusMap[viewingRecord.status]?.label)}`}>
                {statusMap[viewingRecord.status]?.label || String(viewingRecord.status ?? "-")}
              </Badge></>
            )}
          </p>
        </div>

        <div className="space-y-6">
          {/* UDI信息 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">UDI信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="UDI-DI">{viewingRecord.udiDi}</FieldRow>
                <FieldRow label="标签类型">{viewingRecord.labelType}</FieldRow>
              </div>
              <div>
                <FieldRow label="UDI-PI">{viewingRecord.udiPi}</FieldRow>
              </div>
            </div>
          </div>

          {/* 产品信息 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">产品信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="产品名称">{viewingRecord.productName}</FieldRow>
                <FieldRow label="规格型号">{viewingRecord.specification || "-"}</FieldRow>
                <FieldRow label="序列号">{viewingRecord.serialNo || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="产品编码">{viewingRecord.productCode || "-"}</FieldRow>
                <FieldRow label="批次号">{viewingRecord.batchNo}</FieldRow>
              </div>
            </div>
          </div>

          {/* 日期信息 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">日期信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="生产日期">{formatDateValue(viewingRecord.productionDate)}</FieldRow>
                <FieldRow label="创建日期">{formatDateValue(viewingRecord.createDate)}</FieldRow>
              </div>
              <div>
                <FieldRow label="有效期至">{formatDateValue(viewingRecord.expiryDate)}</FieldRow>
              </div>
            </div>
          </div>

          {/* 打印信息 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">打印信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="计划打印">{viewingRecord.printQty?.toLocaleString?.() ?? "0"}</FieldRow>
                <FieldRow label="打印日期">{formatDateValue(viewingRecord.printDate)}</FieldRow>
              </div>
              <div>
                <FieldRow label="已打印">{viewingRecord.printedQty?.toLocaleString?.() ?? "0"}</FieldRow>
              </div>
            </div>
          </div>

          {/* 备注 */}
          {viewingRecord.remarks && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingRecord.remarks}</p>
            </div>
          )}
        </div>

        {/* 标准操作按钮 */}
        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => {
              setViewDialogOpen(false);
              if (viewingRecord) handleEdit(viewingRecord);
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
