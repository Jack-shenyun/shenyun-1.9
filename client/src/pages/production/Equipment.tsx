import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
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
  Wrench,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { formatDateValue } from "@/lib/formatters";

interface Equipment {
  id: number;
  code: string;
  name: string;
  model: string;
  manufacturer: string;
  serialNo: string;
  purchaseDate: string;
  warrantyDate: string;
  location: string;
  department: string;
  responsible: string;
  status: "normal" | "maintenance" | "repair" | "scrapped";
  lastMaintenance: string;
  nextMaintenance: string;
  maintenanceCycle: number;
  assetValue: number;
  remarks: string;
}

const statusMap: Record<string, any> = {
  normal: { label: "正常", variant: "default" as const },
  maintenance: { label: "保养中", variant: "secondary" as const },
  repair: { label: "维修中", variant: "outline" as const },
  scrapped: { label: "已报废", variant: "destructive" as const },
};



const departmentOptions = ["生产部", "质量部", "研发部", "仓储部", "设备部"];
const locationOptions = ["生产车间A区", "生产车间B区", "灭菌车间", "包装车间", "检验室", "仓库"];

export default function EquipmentPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.equipment.list.useQuery();
  const createMutation = trpc.equipment.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.equipment.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.equipment.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const equipments = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [viewingEquipment, setViewingEquipment] = useState<Equipment | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    model: "",
    manufacturer: "",
    serialNo: "",
    purchaseDate: "",
    warrantyDate: "",
    location: "",
    department: "",
    responsible: "",
    status: "normal",
    lastMaintenance: "",
    nextMaintenance: "",
    maintenanceCycle: 30,
    assetValue: 0,
    remarks: "",
  });

  const filteredEquipments = equipments.filter((e: any) => {
    const matchesSearch =
      String(e.code ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.model ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setEditingEquipment(null);
    const nextNo = equipments.length + 1;
    setFormData({
      code: `EQ-${String(nextNo).padStart(3, "0")}`,
      name: "",
      model: "",
      manufacturer: "",
      serialNo: "",
      purchaseDate: "",
      warrantyDate: "",
      location: "",
      department: "",
      responsible: "",
      status: "normal",
      lastMaintenance: "",
      nextMaintenance: "",
      maintenanceCycle: 30,
      assetValue: 0,
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setFormData({
      code: equipment.code,
      name: equipment.name,
      model: equipment.model,
      manufacturer: equipment.manufacturer,
      serialNo: equipment.serialNo,
      purchaseDate: equipment.purchaseDate,
      warrantyDate: equipment.warrantyDate,
      location: equipment.location,
      department: equipment.department,
      responsible: equipment.responsible,
      status: equipment.status,
      lastMaintenance: equipment.lastMaintenance,
      nextMaintenance: equipment.nextMaintenance,
      maintenanceCycle: equipment.maintenanceCycle,
      assetValue: equipment.assetValue,
      remarks: equipment.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (equipment: Equipment) => {
    setViewingEquipment(equipment);
    setViewDialogOpen(true);
  };

  const handleDelete = (equipment: Equipment) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除设备" });
      return;
    }
    deleteMutation.mutate({ id: equipment.id });
    toast.success("设备已删除");
  };

  const handleMaintenance = (equipment: Equipment) => {
    const today = new Date().toISOString().split("T")[0];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + equipment.maintenanceCycle);
    
    toast.success("保养完成", { description: `下次保养日期：${nextDate.toISOString().split("T")[0]}` });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.code) {
      toast.error("请填写必填项", { description: "设备编号和设备名称为必填" });
      return;
    }

    if (editingEquipment) {
      toast.success("设备信息已更新");
    } else {
      const newEquipment: Equipment = {
        id: Math.max(...equipments.map((e: any) => e.id)) + 1,
        ...formData,
        status: formData.status as Equipment["status"],
      };
      toast.success("设备添加成功");
    }
    setDialogOpen(false);
  };

  const normalCount = equipments.filter((e: any) => e.status === "normal").length;
  const maintenanceCount = equipments.filter((e: any) => e.status === "maintenance").length;
  const needMaintenanceCount = equipments.filter((e: any) => {
    const nextDate = new Date(e.nextMaintenance);
    const today = new Date();
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && e.status === "normal";
  }).length;

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">设备管理</h2>
              <p className="text-sm text-muted-foreground">建立全面的设备和工装模具档案，实现全生命周期电子化管理</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新增设备
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">设备总数</p>
              <p className="text-2xl font-bold">{equipments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">正常运行</p>
              <p className="text-2xl font-bold text-green-600">{normalCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">保养中</p>
              <p className="text-2xl font-bold text-amber-600">{maintenanceCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待保养</p>
              <p className="text-2xl font-bold text-blue-600">{needMaintenanceCount}</p>
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
                  placeholder="搜索设备编号、名称、型号..."
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
                  <SelectItem value="normal">正常</SelectItem>
                  <SelectItem value="maintenance">保养中</SelectItem>
                  <SelectItem value="repair">维修中</SelectItem>
                  <SelectItem value="scrapped">已报废</SelectItem>
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
                  <TableHead className="w-[90px] text-center font-bold">设备编号</TableHead>
                  <TableHead className="text-center font-bold">设备名称</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">型号规格</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">安装位置</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">使用部门</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">下次保养</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipments.map((equipment: any) => {
                  const nextDate = new Date(equipment.nextMaintenance);
                  const today = new Date();
                  const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isNearMaintenance = diffDays <= 7 && equipment.status === "normal";
                  
                  return (
                    <TableRow key={equipment.id}>
                      <TableCell className="text-center font-medium">{equipment.code}</TableCell>
                      <TableCell className="text-center">{equipment.name}</TableCell>
                      <TableCell className="text-center">{equipment.model}</TableCell>
                      <TableCell className="text-center">{equipment.location}</TableCell>
                      <TableCell className="text-center">{equipment.department}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusMap[equipment.status]?.variant || "outline"} className={getStatusSemanticClass(equipment.status, statusMap[equipment.status]?.label)}>
                          {statusMap[equipment.status]?.label || String(equipment.status ?? "-")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-1">
                          {equipment.nextMaintenance}
                          {isNearMaintenance && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(equipment)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(equipment)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            {equipment.status !== "scrapped" && (
                              <DropdownMenuItem onClick={() => handleMaintenance(equipment)}>
                                <Settings className="h-4 w-4 mr-2" />
                                完成保养
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(equipment)}
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
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 新建/编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{editingEquipment ? "编辑设备" : "新增设备"}</DialogTitle>
              <DialogDescription>
                {editingEquipment ? "修改设备信息" : "添加新的设备到系统"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>设备编号 *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="设备编号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>设备名称 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="设备名称"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>型号规格</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="型号规格"
                  />
                </div>
                <div className="space-y-2">
                  <Label>制造商</Label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="制造商"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>出厂编号</Label>
                  <Input
                    value={formData.serialNo}
                    onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                    placeholder="出厂编号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>资产价值 (元)</Label>
                  <Input
                    type="number"
                    value={formData.assetValue}
                    onChange={(e) => setFormData({ ...formData, assetValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>购置日期</Label>
                  <Input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>保修截止</Label>
                  <Input
                    type="date"
                    value={formData.warrantyDate}
                    onChange={(e) => setFormData({ ...formData, warrantyDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>安装位置</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择位置" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((l: any) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>使用部门</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择部门" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((d: any) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>责任人</Label>
                  <Input
                    value={formData.responsible}
                    onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                    placeholder="设备责任人"
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
                      <SelectItem value="normal">正常</SelectItem>
                      <SelectItem value="maintenance">保养中</SelectItem>
                      <SelectItem value="repair">维修中</SelectItem>
                      <SelectItem value="scrapped">已报废</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>上次保养</Label>
                  <Input
                    type="date"
                    value={formData.lastMaintenance}
                    onChange={(e) => setFormData({ ...formData, lastMaintenance: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>下次保养</Label>
                  <Input
                    type="date"
                    value={formData.nextMaintenance}
                    onChange={(e) => setFormData({ ...formData, nextMaintenance: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>保养周期 (天)</Label>
                  <Input
                    type="number"
                    value={formData.maintenanceCycle}
                    onChange={(e) => setFormData({ ...formData, maintenanceCycle: parseInt(e.target.value) || 30 })}
                  />
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
                {editingEquipment ? "保存修改" : "添加设备"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        '''
{/* 查看详情对话框 */}
{viewingEquipment && (
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    <div className="border-b pb-3">
      <h2 className="text-lg font-semibold">设备详情</h2>
      <p className="text-sm text-muted-foreground">
        {viewingEquipment.code}
        {viewingEquipment.status && (
          <> · <Badge variant={statusMap[viewingEquipment.status]?.variant || "outline"} className={`ml-1 ${getStatusSemanticClass(viewingEquipment.status, statusMap[viewingEquipment.status]?.label)}`}>
            {statusMap[viewingEquipment.status]?.label || String(viewingEquipment.status ?? "-")}
          </Badge></>
        )}
      </p>
    </div>

    <div className="space-y-6 py-4">
      {(() => {
        return (
          <>
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="设备名称">{viewingEquipment.name}</FieldRow>
                  <FieldRow label="型号规格">{viewingEquipment.model}</FieldRow>
                  <FieldRow label="制造商">{viewingEquipment.manufacturer}</FieldRow>
                </div>
                <div>
                  <FieldRow label="出厂编号">{viewingEquipment.serialNo}</FieldRow>
                  <FieldRow label="资产价值">¥{viewingEquipment.assetValue?.toLocaleString?.() ?? "0"}</FieldRow>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">位置与责任</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="安装位置">{viewingEquipment.location}</FieldRow>
                  <FieldRow label="使用部门">{viewingEquipment.department}</FieldRow>
                </div>
                <div>
                  <FieldRow label="责任人">{viewingEquipment.responsible}</FieldRow>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">日期信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="购置日期">{formatDateValue(viewingEquipment.purchaseDate)}</FieldRow>
                </div>
                <div>
                  <FieldRow label="保修截止">{formatDateValue(viewingEquipment.warrantyDate)}</FieldRow>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">保养信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <FieldRow label="上次保养">{formatDateValue(viewingEquipment.lastMaintenance)}</FieldRow>
                  <FieldRow label="保养周期">{viewingEquipment.maintenanceCycle} 天</FieldRow>
                </div>
                <div>
                  <FieldRow label="下次保养">{formatDateValue(viewingEquipment.nextMaintenance)}</FieldRow>
                </div>
              </div>
            </div>

            {viewingEquipment.remarks && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingEquipment.remarks}</p>
              </div>
            )}
          </>
        );
      })()}
    </div>

    <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
      <div className="flex gap-2 flex-wrap"></div>
      <div className="flex gap-2 flex-wrap justify-end">
        <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
        <Button variant="outline" size="sm" onClick={() => {
          setViewDialogOpen(false);
          if (viewingEquipment) handleEdit(viewingEquipment);
        }}>编辑</Button>
      </div>
    </div>
  </DraggableDialogContent>
</DraggableDialog>
)}
'''))oxiawt-erp-/client/src/pages/production/Equipment.tsx", has_view_dialog = True, notes = "The FieldRow component is defined inline to avoid polluting the component
      </div>
    </ERPLayout>
  );
}
