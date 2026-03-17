import { formatDateValue } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
import { Separator } from "@/components/ui/separator";
import {
  Hospital,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

interface HospitalRecord {
  id: number;
  hospitalName: string;
  hospitalCode: string;
  level: string;
  type: string;
  province: string;
  city: string;
  address: string;
  contactDept: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  products: string;
  productCount: number;
  status: "applying" | "reviewing" | "approved" | "rejected";
  applyDate: string;
  approveDate: string;
  remarks: string;
}

const statusMap: Record<string, any> = {
  applying: { label: "申请中", variant: "outline" as const },
  reviewing: { label: "评审中", variant: "secondary" as const },
  approved: { label: "已入院", variant: "default" as const },
  rejected: { label: "已拒绝", variant: "destructive" as const },
};



const levelOptions = ["三甲", "三乙", "二甲", "二乙", "一甲", "一乙", "社区医院"];
const typeOptions = ["综合医院", "专科医院", "中医医院", "妇幼保健院", "康复医院", "社区卫生服务中心"];
const provinceOptions = [
  "北京市", "上海市", "天津市", "重庆市",
  "广东省", "江苏省", "浙江省", "山东省", "河南省", "四川省",
  "湖北省", "湖南省", "福建省", "安徽省", "河北省", "陕西省"
];

export default function HospitalPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.investmentHospitals.list.useQuery();
  const createMutation = trpc.investmentHospitals.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.investmentHospitals.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.investmentHospitals.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const hospitals = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [formDialogMaximized, setFormDialogMaximized] = useState(false);
  const [viewDialogMaximized, setViewDialogMaximized] = useState(false);
  const [editingHospital, setEditingHospital] = useState<HospitalRecord | null>(null);
  const [viewingHospital, setViewingHospital] = useState<HospitalRecord | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    hospitalName: "",
    hospitalCode: "",
    level: "",
    type: "",
    province: "",
    city: "",
    address: "",
    contactDept: "",
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
    products: "",
    productCount: 0,
    status: "applying",
    applyDate: "",
    approveDate: "",
    remarks: "",
  });

  const filteredHospitals = hospitals.filter((h: any) => {
    const matchesSearch =
      String(h.hospitalName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(h.province ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(h.contactPerson ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || h.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setEditingHospital(null);
    const nextNo = hospitals.length + 1;
    setFormData({
      hospitalName: "",
      hospitalCode: `H-${String(nextNo).padStart(3, "0")}`,
      level: "",
      type: "",
      province: "",
      city: "",
      address: "",
      contactDept: "",
      contactPerson: "",
      contactPhone: "",
      contactEmail: "",
      products: "",
      productCount: 0,
      status: "applying",
      applyDate: new Date().toISOString().split("T")[0],
      approveDate: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (hospital: HospitalRecord) => {
    setEditingHospital(hospital);
    setFormData({
      hospitalName: hospital.hospitalName,
      hospitalCode: hospital.hospitalCode,
      level: hospital.level,
      type: hospital.type,
      province: hospital.province,
      city: hospital.city,
      address: hospital.address,
      contactDept: hospital.contactDept,
      contactPerson: hospital.contactPerson,
      contactPhone: hospital.contactPhone,
      contactEmail: hospital.contactEmail,
      products: hospital.products,
      productCount: hospital.productCount,
      status: hospital.status,
      applyDate: hospital.applyDate,
      approveDate: hospital.approveDate,
      remarks: hospital.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (hospital: HospitalRecord) => {
    setViewingHospital(hospital);
    setViewDialogOpen(true);
  };

  const handleDelete = (hospital: HospitalRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除入院记录" });
      return;
    }
    deleteMutation.mutate({ id: hospital.id });
    toast.success("入院记录已删除");
  };

  const handleApprove = (hospital: HospitalRecord) => {
    updateMutation.mutate({
      id: hospital.id,
      data: {
        status: "approved",
        approveDate: new Date().toISOString().split("T")[0],
      },
    });
    toast.success("入院申请已通过");
  };

  const handleSubmit = () => {
    if (!formData.hospitalName || !formData.level || !formData.province) {
      toast.error("请填写必填项", { description: "医院名称、等级、省份为必填" });
      return;
    }

    if (editingHospital) {
      updateMutation.mutate({
        id: editingHospital.id,
        data: {
          ...formData,
          productCount: Number(formData.productCount || 0),
        },
      });
      toast.success("入院信息已更新");
    } else {
      createMutation.mutate({
        ...formData,
        productCount: Number(formData.productCount || 0),
      });
      toast.success("入院申请创建成功");
    }
    setDialogOpen(false);
  };

  const approvedCount = hospitals.filter((h: any) => h.status === "approved").length;
  const reviewingCount = hospitals.filter((h: any) => h.status === "reviewing").length;

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
              <Hospital className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">入院管理</h2>
              <p className="text-sm text-muted-foreground">专门管理产品进入医院的流程</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新增入院申请
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">目标医院</p>
              <p className="text-2xl font-bold">{hospitals.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已入院</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">评审中</p>
              <p className="text-2xl font-bold text-amber-600">{reviewingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">入院产品总数</p>
              <p className="text-2xl font-bold text-blue-600">
                {hospitals.reduce((sum: any, h: any) => sum + h.productCount, 0)}
              </p>
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
                  placeholder="搜索医院名称、省份、联系人..."
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
                  <SelectItem value="applying">申请中</SelectItem>
                  <SelectItem value="reviewing">评审中</SelectItem>
                  <SelectItem value="approved">已入院</SelectItem>
                  <SelectItem value="rejected">已拒绝</SelectItem>
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
                  <TableHead className="text-center font-bold">医院名称</TableHead>
                  <TableHead className="w-[70px] text-center font-bold">等级</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">省份</TableHead>
                  <TableHead className="w-[130px] text-center font-bold">联系人</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">入院产品</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">申请日期</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHospitals.map((hospital: any) => (
                  <TableRow key={hospital.id}>
                    <TableCell className="text-center font-medium">{hospital.hospitalName}</TableCell>
                    <TableCell className="text-center">{hospital.level}</TableCell>
                    <TableCell className="text-center">{hospital.province}</TableCell>
                    <TableCell className="text-center">{hospital.contactDept}-{hospital.contactPerson}</TableCell>
                    <TableCell className="text-center">{hospital.productCount}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[hospital.status]?.variant || "outline"} className={getStatusSemanticClass(hospital.status, statusMap[hospital.status]?.label)}>
                        {statusMap[hospital.status]?.label || String(hospital.status ?? "-")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{formatDateValue(hospital.applyDate)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(hospital)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(hospital)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          {hospital.status === "reviewing" && (
                            <DropdownMenuItem onClick={() => handleApprove(hospital)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              通过审批
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(hospital)}
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

        {/* 新建/编辑对话框 */}
        <DraggableDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          defaultWidth={960}
          defaultHeight={760}
          isMaximized={formDialogMaximized}
          onMaximizedChange={setFormDialogMaximized}
        >
          <DraggableDialogContent isMaximized={formDialogMaximized}>
            <DialogHeader>
              <DialogTitle>{editingHospital ? "编辑入院信息" : "新增入院申请"}</DialogTitle>
              <DialogDescription>
                {editingHospital ? "修改医院入院信息" : "录入新的医院入院申请"}
              </DialogDescription>
              {!editingHospital && formData.hospitalCode && (
                <p className="text-sm text-muted-foreground">医院编号：{formData.hospitalCode}</p>
              )}
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>医院编号</Label>
                  <Input value={formData.hospitalCode} disabled />
                </div>
                <div className="space-y-2">
                  <Label>医院名称 *</Label>
                  <Input
                    value={formData.hospitalName}
                    onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                    placeholder="请输入医院全称"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>医院等级 *</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => setFormData({ ...formData, level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择等级" />
                    </SelectTrigger>
                    <SelectContent>
                      {levelOptions.map((l: any) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>医院类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((t: any) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>省份 *</Label>
                  <Select
                    value={formData.province}
                    onValueChange={(value) => setFormData({ ...formData, province: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择省份" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinceOptions.map((p: any) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>城市</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="城市"
                  />
                </div>
                <div className="space-y-2">
                  <Label>详细地址</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="详细地址"
                  />
                </div>
              </div>

              <Separator />

              <div className="text-sm font-medium text-muted-foreground">联系信息</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>联系部门</Label>
                  <Input
                    value={formData.contactDept}
                    onChange={(e) => setFormData({ ...formData, contactDept: e.target.value })}
                    placeholder="如：设备科、采购部"
                  />
                </div>
                <div className="space-y-2">
                  <Label>联系人</Label>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="联系人姓名"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>联系电话</Label>
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="联系电话"
                  />
                </div>
                <div className="space-y-2">
                  <Label>电子邮箱</Label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="电子邮箱"
                  />
                </div>
              </div>

              <Separator />

              <div className="text-sm font-medium text-muted-foreground">入院信息</div>
              <div className="space-y-2">
                <Label>入院产品</Label>
                <Textarea
                  value={formData.products}
                  onChange={(e) => setFormData({ ...formData, products: e.target.value })}
                  placeholder="申请入院的产品，多个产品用逗号分隔"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>入院产品数</Label>
                  <Input
                    type="number"
                    value={formData.productCount}
                    onChange={(e) => setFormData({ ...formData, productCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>申请日期</Label>
                  <Input
                    type="date"
                    value={formData.applyDate}
                    onChange={(e) => setFormData({ ...formData, applyDate: e.target.value })}
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
                      <SelectItem value="applying">申请中</SelectItem>
                      <SelectItem value="reviewing">评审中</SelectItem>
                      <SelectItem value="approved">已入院</SelectItem>
                      <SelectItem value="rejected">已拒绝</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

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
                {editingHospital ? "保存修改" : "提交申请"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {
  /* 查看详情对话框 */
}
<DraggableDialog
  open={viewDialogOpen}
  onOpenChange={setViewDialogOpen}
  defaultWidth={920}
  defaultHeight={760}
  isMaximized={viewDialogMaximized}
  onMaximizedChange={setViewDialogMaximized}
>
  <DraggableDialogContent isMaximized={viewDialogMaximized}>
    {viewingHospital && (
      <div className="space-y-6">
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">入院详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingHospital.hospitalCode}
            {viewingHospital.status && (
              <>
                {" "}
                ·
                <Badge
                  variant={statusMap[viewingHospital.status]?.variant || "outline"}
                  className={`ml-1 ${getStatusSemanticClass(
                    viewingHospital.status,
                    statusMap[viewingHospital.status]?.label
                  )}`}
                >
                  {statusMap[viewingHospital.status]?.label ||
                    String(viewingHospital.status ?? "-")}
                </Badge>
              </>
            )}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              基本信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="医院名称">{viewingHospital.hospitalName}</FieldRow>
                <FieldRow label="医院等级">{viewingHospital.level}</FieldRow>
                <FieldRow label="医院类型">{viewingHospital.type}</FieldRow>
              </div>
              <div>
                <FieldRow label="省份">{viewingHospital.province}</FieldRow>
                <FieldRow label="城市">{viewingHospital.city || "-"}</FieldRow>
                <FieldRow label="详细地址">{viewingHospital.address || "-"}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              联系信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="联系部门">{viewingHospital.contactDept || "-"}</FieldRow>
                <FieldRow label="联系人">{viewingHospital.contactPerson || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="联系电话">{viewingHospital.contactPhone || "-"}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              入院信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="入院产品数">{viewingHospital.productCount}</FieldRow>
                <FieldRow label="申请日期">{formatDateValue(viewingHospital.applyDate)}</FieldRow>
              </div>
              <div>
                <FieldRow label="通过日期">{formatDateValue(viewingHospital.approveDate)}</FieldRow>
              </div>
            </div>
            <div className="mt-1.5">
              <FieldRow label="入院产品">{viewingHospital.products || "-"}</FieldRow>
            </div>
          </div>

          {viewingHospital.remarks && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                备注
              </h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
                {viewingHospital.remarks}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>
              关闭
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewDialogOpen(false);
                if (viewingHospital) handleEdit(viewingHospital);
              }}
            >
              编辑
            </Button>
          </div>
        </div>
      </div>
    )}
  </DraggableDialogContent>
</DraggableDialog>;
      </div>
    </ERPLayout>
  );
}
