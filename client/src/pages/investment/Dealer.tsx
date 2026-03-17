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
import { Separator } from "@/components/ui/separator";
import {
  Store,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { PAYMENT_CONDITION_OPTIONS, normalizePaymentCondition } from "@shared/paymentTerms";

interface Dealer {
  id: number;
  dealerNo: string;
  name: string;
  legalPerson: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  territory: string;
  businessLicense: string;
  licenseExpiry: string;
  medicalLicense: string;
  medicalLicenseExpiry: string;
  status: "pending" | "approved" | "expired" | "terminated";
  authExpiry: string;
  contractNo: string;
  contractStartDate: string;
  contractEndDate: string;
  creditLimit: number;
  paymentTerms: string;
  remarks: string;
}

const statusMap: Record<string, any> = {
  pending: { label: "待审核", variant: "outline" as const },
  approved: { label: "已授权", variant: "default" as const },
  expired: { label: "已过期", variant: "destructive" as const },
  terminated: { label: "已终止", variant: "secondary" as const },
};



const territoryOptions = ["北京市", "上海市", "广东省", "江苏省", "浙江省", "山东省", "四川省", "湖北省", "全国"];
const paymentTermsOptions = PAYMENT_CONDITION_OPTIONS.map((item) => item.value);

export default function DealerPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.dealerQualifications.list.useQuery();
  const createMutation = trpc.dealerQualifications.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.dealerQualifications.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.dealerQualifications.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const dealers = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [formDialogMaximized, setFormDialogMaximized] = useState(false);
  const [viewDialogMaximized, setViewDialogMaximized] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);
  const [viewingDealer, setViewingDealer] = useState<Dealer | null>(null);
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    dealerNo: "",
    name: "",
    legalPerson: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    territory: "",
    businessLicense: "",
    licenseExpiry: "",
    medicalLicense: "",
    medicalLicenseExpiry: "",
    status: "pending",
    authExpiry: "",
    contractNo: "",
    contractStartDate: "",
    contractEndDate: "",
    creditLimit: 0,
    paymentTerms: "",
    remarks: "",
  });

  const filteredDealers = dealers.filter((d: any) => {
    const matchesSearch =
      String(d.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(d.dealerNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(d.contactPerson ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    setEditingDealer(null);
    const nextNo = dealers.length + 1;
    setFormData({
      dealerNo: `DL-${String(nextNo).padStart(3, "0")}`,
      name: "",
      legalPerson: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      territory: "",
      businessLicense: "",
      licenseExpiry: "",
      medicalLicense: "",
      medicalLicenseExpiry: "",
      status: "pending",
      authExpiry: "",
      contractNo: "",
      contractStartDate: "",
      contractEndDate: "",
      creditLimit: 0,
      paymentTerms: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (dealer: Dealer) => {
    setEditingDealer(dealer);
    setFormData({
      dealerNo: dealer.dealerNo,
      name: dealer.name,
      legalPerson: dealer.legalPerson,
      contactPerson: dealer.contactPerson,
      phone: dealer.phone,
      email: dealer.email,
      address: dealer.address,
      territory: dealer.territory,
      businessLicense: dealer.businessLicense,
      licenseExpiry: dealer.licenseExpiry,
      medicalLicense: dealer.medicalLicense,
      medicalLicenseExpiry: dealer.medicalLicenseExpiry,
      status: dealer.status,
      authExpiry: dealer.authExpiry,
      contractNo: dealer.contractNo,
      contractStartDate: dealer.contractStartDate,
      contractEndDate: dealer.contractEndDate,
      creditLimit: dealer.creditLimit,
      paymentTerms: normalizePaymentCondition(dealer.paymentTerms),
      remarks: dealer.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (dealer: Dealer) => {
    setViewingDealer(dealer);
    setViewDialogOpen(true);
  };

  const handleDelete = (dealer: Dealer) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除经销商" });
      return;
    }
    deleteMutation.mutate({ id: dealer.id });
    toast.success("经销商已删除");
  };

  const handleApprove = (dealer: Dealer) => {
    toast.success("经销商已审核通过");
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.contactPerson || !formData.phone) {
      toast.error("请填写必填项", { description: "经销商名称、联系人、联系电话为必填" });
      return;
    }

    if (editingDealer) {
      toast.success("经销商信息已更新");
    } else {
      const newDealer: Dealer = {
        id: Math.max(...dealers.map((d: any) => d.id)) + 1,
        ...formData,
        status: formData.status as Dealer["status"],
      };
      toast.success("经销商创建成功");
    }
    setDialogOpen(false);
  };

  const approvedCount = dealers.filter((d: any) => d.status === "approved").length;
  const pendingCount = dealers.filter((d: any) => d.status === "pending").length;
  const expiredCount = dealers.filter((d: any) => d.status === "expired").length;
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
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">首营管理</h2>
              <p className="text-sm text-muted-foreground">管理经销商首次引入和基础资质，授权书与协议请在对应子页面维护</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新增经销商
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">经销商总数</p>
              <p className="text-2xl font-bold">{dealers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已授权</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待审核</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已过期</p>
              <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
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
                  placeholder="搜索经销商编号、名称、联系人..."
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
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="approved">已授权</SelectItem>
                  <SelectItem value="expired">已过期</SelectItem>
                  <SelectItem value="terminated">已终止</SelectItem>
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
                  <TableHead className="w-[100px] text-center font-bold">编号</TableHead>
                  <TableHead className="text-center font-bold">经销商名称</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">联系人</TableHead>
                  <TableHead className="w-[120px] text-center font-bold">联系电话</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">授权区域</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">授权到期</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDealers.map((dealer: any) => (
                  <TableRow key={dealer.id}>
                    <TableCell className="text-center font-medium">{dealer.dealerNo}</TableCell>
                    <TableCell className="text-center">{dealer.name}</TableCell>
                    <TableCell className="text-center">{dealer.contactPerson}</TableCell>
                    <TableCell className="text-center">{dealer.phone}</TableCell>
                    <TableCell className="text-center">{dealer.territory}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMap[dealer.status]?.variant || "outline"} className={getStatusSemanticClass(dealer.status, statusMap[dealer.status]?.label)}>
                        {statusMap[dealer.status]?.label || String(dealer.status ?? "-")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{dealer.authExpiry || "-"}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(dealer)}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(dealer)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          {dealer.status === "pending" && (
                            <DropdownMenuItem onClick={() => handleApprove(dealer)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              审核通过
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(dealer)}
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
              <DialogTitle>{editingDealer ? "编辑经销商" : "新增经销商"}</DialogTitle>
              <DialogDescription>
                {editingDealer ? "修改经销商信息" : "录入新经销商的基本信息和资质"}
              </DialogDescription>
              {!editingDealer && formData.dealerNo && (
                <p className="text-sm text-muted-foreground">经销商编号：{formData.dealerNo}</p>
              )}
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 基本信息 */}
              <div className="text-sm font-medium text-muted-foreground">基本信息</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>经销商编号</Label>
                  <Input value={formData.dealerNo} disabled />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>经销商名称 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入经销商全称"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>法定代表人</Label>
                  <Input
                    value={formData.legalPerson}
                    onChange={(e) => setFormData({ ...formData, legalPerson: e.target.value })}
                    placeholder="法定代表人姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>联系人 *</Label>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="业务联系人"
                  />
                </div>
                <div className="space-y-2">
                  <Label>联系电话 *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="联系电话"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>电子邮箱</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="电子邮箱"
                  />
                </div>
                <div className="space-y-2">
                  <Label>授权区域</Label>
                  <Select
                    value={formData.territory}
                    onValueChange={(value) => setFormData({ ...formData, territory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择授权区域" />
                    </SelectTrigger>
                    <SelectContent>
                      {territoryOptions.map((t: any) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>公司地址</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="详细地址"
                />
              </div>

              <Separator />

              {/* 资质信息 */}
              <div className="text-sm font-medium text-muted-foreground">资质信息</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>营业执照号</Label>
                  <Input
                    value={formData.businessLicense}
                    onChange={(e) => setFormData({ ...formData, businessLicense: e.target.value })}
                    placeholder="统一社会信用代码"
                  />
                </div>
                <div className="space-y-2">
                  <Label>营业执照有效期</Label>
                  <Input
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>医疗器械经营许可证号</Label>
                  <Input
                    value={formData.medicalLicense}
                    onChange={(e) => setFormData({ ...formData, medicalLicense: e.target.value })}
                    placeholder="经营许可证号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>经营许可证有效期</Label>
                  <Input
                    type="date"
                    value={formData.medicalLicenseExpiry}
                    onChange={(e) => setFormData({ ...formData, medicalLicenseExpiry: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {/* 合同信息 */}
              <div className="text-sm font-medium text-muted-foreground">合同信息</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>合同编号</Label>
                  <Input
                    value={formData.contractNo}
                    onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })}
                    placeholder="合同编号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>合同开始日期</Label>
                  <Input
                    type="date"
                    value={formData.contractStartDate}
                    onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>合同结束日期</Label>
                  <Input
                    type="date"
                    value={formData.contractEndDate}
                    onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>授权到期日</Label>
                  <Input
                    type="date"
                    value={formData.authExpiry}
                    onChange={(e) => setFormData({ ...formData, authExpiry: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>信用额度</Label>
                  <Input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    placeholder="信用额度"
                  />
                </div>
                <div className="space-y-2">
                  <Label>付款条件</Label>
                  <Select
                    value={formData.paymentTerms}
                    onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择付款条件" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTermsOptions.map((p: any) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <SelectItem value="pending">待审核</SelectItem>
                      <SelectItem value="approved">已授权</SelectItem>
                      <SelectItem value="expired">已过期</SelectItem>
                      <SelectItem value="terminated">已终止</SelectItem>
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
                {editingDealer ? "保存修改" : "创建经销商"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

{/* 查看详情对话框 */}
<DraggableDialog
  open={viewDialogOpen}
  onOpenChange={setViewDialogOpen}
  defaultWidth={920}
  defaultHeight={760}
  isMaximized={viewDialogMaximized}
  onMaximizedChange={setViewDialogMaximized}
>
  <DraggableDialogContent isMaximized={viewDialogMaximized}>
    {viewingDealer && (
      <div className="space-y-6">
        {/* 标准头部 */}
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">经销商详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingDealer.dealerNo}
            {viewingDealer.status && (
              <>
                {' '}
                ·
                <Badge
                  variant={statusMap[viewingDealer.status]?.variant || "outline"}
                  className={`ml-1 ${getStatusSemanticClass(viewingDealer.status, statusMap[viewingDealer.status]?.label)}`}
                >
                  {statusMap[viewingDealer.status]?.label || String(viewingDealer.status ?? "-")}
                </Badge>
              </>
            )}
          </p>
        </div>

        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="经销商名称">{viewingDealer.name}</FieldRow>
                <FieldRow label="法定代表人">{viewingDealer.legalPerson}</FieldRow>
                <FieldRow label="联系人">{viewingDealer.contactPerson}</FieldRow>
                <FieldRow label="联系电话">{viewingDealer.phone}</FieldRow>
              </div>
              <div>
                <FieldRow label="电子邮箱">{viewingDealer.email}</FieldRow>
                <FieldRow label="授权区域">{viewingDealer.territory}</FieldRow>
                <FieldRow label="公司地址">{viewingDealer.address}</FieldRow>
              </div>
            </div>
          </div>

          {/* 资质信息 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">资质信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="营业执照号">{viewingDealer.businessLicense}</FieldRow>
                <FieldRow label="医疗器械经营许可证">{viewingDealer.medicalLicense}</FieldRow>
              </div>
              <div>
                <FieldRow label="营业执照有效期">{viewingDealer.licenseExpiry}</FieldRow>
                <FieldRow label="经营许可证有效期">{viewingDealer.medicalLicenseExpiry}</FieldRow>
              </div>
            </div>
          </div>

          {/* 合同信息 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">合同信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="合同编号">{viewingDealer.contractNo}</FieldRow>
                <FieldRow label="合同期限">
                  {viewingDealer.contractStartDate && viewingDealer.contractEndDate
                    ? `${viewingDealer.contractStartDate} 至 ${viewingDealer.contractEndDate}`
                    : "-"}
                </FieldRow>
                <FieldRow label="授权到期日">{viewingDealer.authExpiry}</FieldRow>
              </div>
              <div>
                <FieldRow label="信用额度">
                  {viewingDealer.creditLimit ? `¥${viewingDealer.creditLimit?.toLocaleString?.() ?? "0"}` : "-"}
                </FieldRow>
                <FieldRow label="付款条件">{normalizePaymentCondition(viewingDealer.paymentTerms)}</FieldRow>
              </div>
            </div>
          </div>

          {/* 备注 */}
          {viewingDealer.remarks && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingDealer.remarks}</p>
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
              if (viewingDealer) handleEdit(viewingDealer);
            }}>
              编辑
            </Button>
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
