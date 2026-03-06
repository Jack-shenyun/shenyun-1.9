import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { Warehouse, Plus, Search, Edit, Trash2, MoreHorizontal, Building2 } from "lucide-react";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

interface WarehouseRecord {
  id: number;
  code: string;
  name: string;
  type: "raw_material" | "semi_finished" | "finished" | "quarantine";
  address: string | null;
  manager: string | null;
  phone: string | null;
  status: "active" | "inactive";
  createdAt?: string;
}

const warehouseTypeMap: Record<string, { label: string; color: string }> = {
  raw_material: { label: "原材料仓", color: "text-blue-600" },
  semi_finished: { label: "半成品仓", color: "text-amber-600" },
  finished: { label: "成品仓", color: "text-green-600" },
  quarantine: { label: "待检仓", color: "text-purple-600" },
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "启用", variant: "default" },
  inactive: { label: "停用", variant: "secondary" },
};

export default function WarehousesPage() {
  const { canDelete } = usePermission();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WarehouseRecord | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "raw_material" as WarehouseRecord["type"],
    address: "",
    manager: "",
    phone: "",
    status: "active" as WarehouseRecord["status"],
  });

  // 获取所有仓库（不过滤状态）
  const { data: warehouseList = [], isLoading, refetch } = trpc.warehouses.list.useQuery({});

  const createMutation = trpc.warehouses.create.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("仓库已创建");
      setFormDialogOpen(false);
    },
    onError: (e) => toast.error("创建失败", { description: e.message }),
  });

  const updateMutation = trpc.warehouses.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("仓库信息已更新");
      setFormDialogOpen(false);
    },
    onError: (e) => toast.error("更新失败", { description: e.message }),
  });

  const deleteMutation = trpc.warehouses.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("仓库已删除");
    },
    onError: (e) => toast.error("删除失败", { description: e.message }),
  });

  const filteredList = (warehouseList as WarehouseRecord[]).filter((w) => {
    const matchesSearch =
      !searchTerm ||
      String(w.code ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(w.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.manager || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || w.type === typeFilter;
    const matchesStatus = statusFilter === "all" || w.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleAdd = () => {
    setIsEditing(false);
    setEditingRecord(null);
    setFormData({
      code: "",
      name: "",
      type: "raw_material",
      address: "",
      manager: "",
      phone: "",
      status: "active",
    });
    setFormDialogOpen(true);
  };

  const handleEdit = (record: WarehouseRecord) => {
    setIsEditing(true);
    setEditingRecord(record);
    setFormData({
      code: record.code,
      name: record.name,
      type: record.type,
      address: record.address || "",
      manager: record.manager || "",
      phone: record.phone || "",
      status: record.status,
    });
    setFormDialogOpen(true);
  };

  const handleDelete = (record: WarehouseRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    deleteMutation.mutate({ id: record.id });
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name) {
      toast.error("请填写仓库编码和名称");
      return;
    }

    if (isEditing && editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        data: {
          name: formData.name,
          type: formData.type,
          address: formData.address || undefined,
          manager: formData.manager || undefined,
          phone: formData.phone || undefined,
          status: formData.status,
        },
      });
    } else {
      createMutation.mutate({
        code: formData.code,
        name: formData.name,
        type: formData.type,
        address: formData.address || undefined,
        manager: formData.manager || undefined,
        phone: formData.phone || undefined,
        status: formData.status,
      });
    }
  };

  // 统计
  const stats = {
    total: (warehouseList as WarehouseRecord[]).length,
    active: (warehouseList as WarehouseRecord[]).filter((w) => w.status === "active").length,
    rawMaterial: (warehouseList as WarehouseRecord[]).filter((w) => w.type === "raw_material").length,
    finished: (warehouseList as WarehouseRecord[]).filter((w) => w.type === "finished").length,
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">仓库管理</h1>
              <p className="text-sm text-muted-foreground">
                管理仓库基础信息，包括原材料仓、半成品仓、成品仓和待检仓
              </p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            新增仓库
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">仓库总数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-muted-foreground">启用中</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.rawMaterial}</div>
              <div className="text-sm text-muted-foreground">原材料仓</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">{stats.finished}</div>
              <div className="text-sm text-muted-foreground">成品仓</div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索仓库编码、名称、负责人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="仓库类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="raw_material">原材料仓</SelectItem>
              <SelectItem value="semi_finished">半成品仓</SelectItem>
              <SelectItem value="finished">成品仓</SelectItem>
              <SelectItem value="quarantine">待检仓</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">启用</SelectItem>
              <SelectItem value="inactive">停用</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 仓库列表表格 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="text-center font-bold">仓库编码</TableHead>
                <TableHead className="text-center font-bold">仓库名称</TableHead>
                <TableHead className="text-center font-bold">仓库类型</TableHead>
                <TableHead className="text-center font-bold">负责人</TableHead>
                <TableHead className="text-center font-bold">联系电话</TableHead>
                <TableHead className="text-center font-bold">仓库地址</TableHead>
                <TableHead className="text-center font-bold">状态</TableHead>
                <TableHead className="text-center font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-center font-mono">{record.code}</TableCell>
                  <TableCell className="text-center font-medium">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-muted-foreground" />
                      {record.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-sm font-medium ${warehouseTypeMap[record.type]?.color || ""}`}>
                      {warehouseTypeMap[record.type]?.label || record.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{record.manager || "-"}</TableCell>
                  <TableCell className="text-center">{record.phone || "-"}</TableCell>
                  <TableCell className="text-center max-w-[200px] truncate">{record.address || "-"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={statusMap[record.status]?.variant || "outline"} className={getStatusSemanticClass(record.status, statusMap[record.status]?.label)}>
                      {statusMap[record.status]?.label || record.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
              ))}
              {filteredList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isLoading ? "加载中..." : "暂无仓库数据，点击「新增仓库」添加"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* 新增/编辑仓库对话框 */}
        <DraggableDialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "编辑仓库" : "新增仓库"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>仓库编码 *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="如: WH-001"
                    disabled={isEditing}
                  />
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">仓库编码创建后不可修改</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>仓库名称 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="如: 原材料仓库A区"
                  />
                </div>
                <div className="space-y-2">
                  <Label>仓库类型 *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as WarehouseRecord["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw_material">原材料仓</SelectItem>
                      <SelectItem value="semi_finished">半成品仓</SelectItem>
                      <SelectItem value="finished">成品仓</SelectItem>
                      <SelectItem value="quarantine">待检仓</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as WarehouseRecord["status"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="inactive">停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>负责人</Label>
                  <Input
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    placeholder="输入负责人姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>联系电话</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="输入联系电话"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>仓库地址</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="输入仓库详细地址"
                  rows={2}
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
      </div>
    </ERPLayout>
  );
}
