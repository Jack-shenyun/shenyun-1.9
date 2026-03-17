import { formatDateValue } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { useMemo, useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LucideIcon } from "lucide-react";
import { Calendar, Edit, Eye, FileText, Plus, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type DealerDocumentMode = "authorization" | "agreement";

interface DealerQualificationRecord {
  id: number;
  customerId: number;
  customerName: string;
  authorizationNo?: string | null;
  authorizationExpiry?: string | null;
  territory?: string | null;
  contractNo?: string | null;
  contractExpiry?: string | null;
  status: "pending" | "approved" | "expired" | "terminated";
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface DealerCustomer {
  id: number;
  name: string;
}

interface DealerCustomerDetail {
  id: number;
  code?: string | null;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  status?: string | null;
}

interface DealerDocumentFormData {
  customerId: string;
  documentNo: string;
  expiry: string;
  territory: string;
  status: "pending" | "approved" | "expired" | "terminated";
}

interface DealerDocumentPageProps {
  mode: DealerDocumentMode;
  title: string;
  description: string;
  icon: LucideIcon;
}

const statusMap: Record<DealerQualificationRecord["status"], { label: string; variant: "default" | "outline" | "destructive" | "secondary" }> = {
  pending: { label: "待审核", variant: "outline" },
  approved: { label: "已生效", variant: "default" },
  expired: { label: "已过期", variant: "destructive" },
  terminated: { label: "已终止", variant: "secondary" },
};

const emptyFormData: DealerDocumentFormData = {
  customerId: "",
  documentNo: "",
  expiry: "",
  territory: "",
  status: "pending",
};

const getExpiryDays = (value?: string | null) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const expiry = new Date(value);
  const now = new Date();
  expiry.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const getDocumentPrefix = (mode: DealerDocumentMode) => (mode === "authorization" ? "AUTH" : "AGR");

export default function DealerDocumentPage(props: DealerDocumentPageProps) {
  const { mode, title, description, icon: Icon } = props;
  const { data: recordsData = [], isLoading, refetch } = trpc.dealerQualifications.list.useQuery();
  const createMutation = trpc.dealerQualifications.create.useMutation({
    onSuccess: async () => {
      await refetch();
      setDialogOpen(false);
      toast.success(`${title}已保存`);
    },
  });
  const updateMutation = trpc.dealerQualifications.update.useMutation({
    onSuccess: async () => {
      await refetch();
      setDialogOpen(false);
      toast.success(`${title}已更新`);
    },
  });

  const records = recordsData as DealerQualificationRecord[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [formDialogMaximized, setFormDialogMaximized] = useState(false);
  const [viewDialogMaximized, setViewDialogMaximized] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DealerQualificationRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<DealerQualificationRecord | null>(null);
  const [formData, setFormData] = useState<DealerDocumentFormData>(emptyFormData);
  const selectedDealerId = Number(formData.customerId || 0);
  const viewingDealerId = Number(viewingRecord?.customerId || 0);
  const { data: selectedDealerCustomerData } = trpc.customers.getById.useQuery(
    { id: selectedDealerId },
    { enabled: selectedDealerId > 0 }
  );
  const { data: viewingDealerCustomerData } = trpc.customers.getById.useQuery(
    { id: viewingDealerId },
    { enabled: viewingDealerId > 0 && viewDialogOpen }
  );

  const hasDocumentData = (record: DealerQualificationRecord) =>
    mode === "authorization"
      ? Boolean(record.authorizationNo || record.authorizationExpiry || record.territory)
      : Boolean(record.contractNo || record.contractExpiry);

  const documentRecords = useMemo(
    () => records.filter((record) => hasDocumentData(record)),
    [records, mode]
  );
  const dealerOptions = useMemo(() => {
    const dealerMap = new Map<number, DealerCustomer>();
    records.forEach((record) => {
      if (!record.customerId || !record.customerName) return;
      if (!dealerMap.has(record.customerId)) {
        dealerMap.set(record.customerId, {
          id: record.customerId,
          name: record.customerName,
        });
      }
    });
    return Array.from(dealerMap.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  }, [records]);

  const filteredRecords = documentRecords.filter((record) => {
    const keyword = searchTerm.trim().toLowerCase();
    const documentNo = mode === "authorization" ? record.authorizationNo : record.contractNo;
    const matchesSearch =
      !keyword ||
      [
        String(record.customerName || ""),
        String(documentNo || ""),
        String(record.territory || ""),
      ].some((value) => value.toLowerCase().includes(keyword));
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = documentRecords.length;
  const approvedCount = documentRecords.filter((record) => record.status === "approved").length;
  const pendingCount = documentRecords.filter((record) => record.status === "pending").length;
  const expiringCount = documentRecords.filter((record) => {
    const expiry = mode === "authorization" ? record.authorizationExpiry : record.contractExpiry;
    const days = getExpiryDays(expiry);
    return days >= 0 && days <= 30;
  }).length;

  const selectedCustomer = (selectedDealerCustomerData || null) as DealerCustomerDetail | null;
  const viewingCustomer = (viewingDealerCustomerData || null) as DealerCustomerDetail | null;
  const currentDocumentLabel = mode === "authorization" ? "授权书" : "经销商协议";
  const currentNumberLabel = mode === "authorization" ? "授权书编号" : "协议编号";
  const currentExpiryLabel = mode === "authorization" ? "授权到期" : "协议到期";

  const FieldRow = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );

  const getNextDocumentNo = () => {
    const prefix = getDocumentPrefix(mode);
    const values = records
      .map((record) => (mode === "authorization" ? record.authorizationNo : record.contractNo) || "")
      .filter(Boolean);
    const maxSequence = values.reduce((max, value) => {
      const match = value.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (!match) return max;
      return Math.max(max, Number(match[1] || 0));
    }, 0);
    return `${prefix}-${String(maxSequence + 1).padStart(3, "0")}`;
  };

  const applyRecordToForm = (record: DealerQualificationRecord | null, customerId?: number) => {
    setEditingRecord(record);
    setFormData({
      customerId: String(record?.customerId || customerId || ""),
      documentNo: mode === "authorization" ? record?.authorizationNo || getNextDocumentNo() : record?.contractNo || getNextDocumentNo(),
      expiry: mode === "authorization" ? record?.authorizationExpiry || "" : record?.contractExpiry || "",
      territory: mode === "authorization" ? record?.territory || "" : "",
      status: record?.status || "pending",
    });
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setFormData({
      ...emptyFormData,
      documentNo: getNextDocumentNo(),
    });
    setDialogOpen(true);
  };

  const handleEdit = (record: DealerQualificationRecord) => {
    applyRecordToForm(record);
    setDialogOpen(true);
  };

  const handleView = (record: DealerQualificationRecord) => {
    setViewingRecord(record);
    setViewDialogOpen(true);
  };

  const handleCustomerChange = (value: string) => {
    const customerId = Number(value);
    const existingRecord = records.find((record) => record.customerId === customerId) || null;
    applyRecordToForm(existingRecord, customerId);
  };

  const handleSubmit = () => {
    if (!formData.customerId || !formData.documentNo || !formData.expiry) {
      toast.error("请填写完整信息", { description: "经销商、编号、到期日期为必填项" });
      return;
    }

    const payload =
      mode === "authorization"
        ? {
            authorizationNo: formData.documentNo,
            authorizationExpiry: formData.expiry,
            territory: formData.territory,
            status: formData.status,
          }
        : {
            contractNo: formData.documentNo,
            contractExpiry: formData.expiry,
            status: formData.status,
          };

    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        data: payload,
      });
      return;
    }

    createMutation.mutate({
      customerId: Number(formData.customerId),
      status: formData.status,
      ...(mode === "authorization"
        ? {
            authorizationNo: formData.documentNo,
            authorizationExpiry: formData.expiry,
            territory: formData.territory,
          }
        : {
            contractNo: formData.documentNo,
            contractExpiry: formData.expiry,
          }),
    });
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新增{currentDocumentLabel}
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{currentDocumentLabel}总数</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已生效</p>
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
              <p className="text-sm text-muted-foreground">30天内到期</p>
              <p className="text-2xl font-bold text-red-600">{expiringCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={
                    mode === "authorization"
                      ? `搜索经销商名称、${currentNumberLabel}、授权区域...`
                      : `搜索经销商名称、${currentNumberLabel}...`
                  }
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
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
                  <SelectItem value="approved">已生效</SelectItem>
                  <SelectItem value="expired">已过期</SelectItem>
                  <SelectItem value="terminated">已终止</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">经销商名称</TableHead>
                  <TableHead className="w-[160px] text-center font-bold">{currentNumberLabel}</TableHead>
                  {mode === "authorization" && (
                    <TableHead className="w-[140px] text-center font-bold">授权区域</TableHead>
                  )}
                  <TableHead className="w-[110px] text-center font-bold">{currentExpiryLabel}</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">更新时间</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={mode === "authorization" ? 7 : 6} className="py-10 text-center text-muted-foreground">
                      数据加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-center font-medium">{record.customerName || "-"}</TableCell>
                      <TableCell className="text-center">
                        {mode === "authorization" ? record.authorizationNo || "-" : record.contractNo || "-"}
                      </TableCell>
                      {mode === "authorization" && (
                        <TableCell className="text-center">{record.territory || "-"}</TableCell>
                      )}
                      <TableCell className="text-center">
                        {formatDateValue(mode === "authorization" ? record.authorizationExpiry : record.contractExpiry) || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={statusMap[record.status]?.variant || "outline"}
                          className={getStatusSemanticClass(record.status, statusMap[record.status]?.label)}
                        >
                          {statusMap[record.status]?.label || record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{formatDateValue(record.updatedAt) || "-"}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleView(record)}>
                            <Eye className="h-4 w-4 mr-1" />
                            查看详情
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}>
                            <Edit className="h-4 w-4 mr-1" />
                            编辑
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={mode === "authorization" ? 7 : 6} className="py-10 text-center text-muted-foreground">
                      暂无{currentDocumentLabel}数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <DraggableDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          defaultWidth={900}
          defaultHeight={720}
          isMaximized={formDialogMaximized}
          onMaximizedChange={setFormDialogMaximized}
        >
          <DraggableDialogContent isMaximized={formDialogMaximized}>
            <DialogHeader>
              <DialogTitle>{editingRecord ? `编辑${currentDocumentLabel}` : `新增${currentDocumentLabel}`}</DialogTitle>
              <DialogDescription>
                复用首营档案维护{currentDocumentLabel}信息，不额外新增后台结构
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="text-sm font-medium text-muted-foreground">基础信息</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>经销商 *</Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={handleCustomerChange}
                    disabled={Boolean(editingRecord)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择经销商" />
                    </SelectTrigger>
                    <SelectContent>
                      {dealerOptions.map((customer) => (
                        <SelectItem key={customer.id} value={String(customer.id)}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{currentNumberLabel} *</Label>
                  <Input
                    value={formData.documentNo}
                    disabled
                    placeholder="系统自动生成"
                  />
                </div>
              </div>

              {mode === "authorization" && (
                <div className="space-y-2">
                  <Label>授权区域</Label>
                  <Input
                    value={formData.territory}
                    onChange={(event) => setFormData({ ...formData, territory: event.target.value })}
                    placeholder="请输入授权区域"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{currentExpiryLabel} *</Label>
                  <Input
                    type="date"
                    value={formData.expiry}
                    onChange={(event) => setFormData({ ...formData, expiry: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: DealerQualificationRecord["status"]) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待审核</SelectItem>
                      <SelectItem value="approved">已生效</SelectItem>
                      <SelectItem value="expired">已过期</SelectItem>
                      <SelectItem value="terminated">已终止</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedCustomer && (
                <>
                  <Separator />
                  <div className="text-sm font-medium text-muted-foreground">经销商信息</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="经销商名称">{selectedCustomer.name}</FieldRow>
                      <FieldRow label="联系人">{selectedCustomer.contactPerson || "-"}</FieldRow>
                    </div>
                    <div>
                      <FieldRow label="联系电话">{selectedCustomer.phone || "-"}</FieldRow>
                      <FieldRow label="省份">{selectedCustomer.province || "-"}</FieldRow>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? "保存修改" : "保存"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <DraggableDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          defaultWidth={860}
          defaultHeight={700}
          isMaximized={viewDialogMaximized}
          onMaximizedChange={setViewDialogMaximized}
        >
          {viewingRecord && (
            <div className="px-8 py-6 max-w-3xl mx-auto space-y-5">
              <div className="border-b pb-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">经销商详情</h2>
                  <p className="text-sm text-muted-foreground">
                    {(viewingCustomer?.code || viewingRecord.customerName || "-")} · {viewingCustomer?.name || viewingRecord.customerName || "-"}
                  </p>
                </div>
                <div className="h-20 w-28 shrink-0 rounded-md border border-border/70 bg-muted/10 flex items-center justify-center">
                  <Badge
                    variant={statusMap[viewingRecord.status]?.variant || "outline"}
                    className={getStatusSemanticClass(viewingRecord.status, statusMap[viewingRecord.status]?.label)}
                  >
                    {statusMap[viewingRecord.status]?.label || viewingRecord.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="shadow-none border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground">{currentNumberLabel}</CardTitle>
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="text-base font-bold break-all">
                      {mode === "authorization" ? viewingRecord.authorizationNo || "-" : viewingRecord.contractNo || "-"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-none border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground">{currentExpiryLabel}</CardTitle>
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="text-base font-bold">
                      {formatDateValue(mode === "authorization" ? viewingRecord.authorizationExpiry : viewingRecord.contractExpiry) || "-"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-none border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground">状态</CardTitle>
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="text-base font-bold">{statusMap[viewingRecord.status]?.label || viewingRecord.status}</div>
                  </CardContent>
                </Card>
                <Card className="shadow-none border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground">更新时间</CardTitle>
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="text-base font-bold">{formatDateValue(viewingRecord.updatedAt) || "-"}</div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <FieldRow label="经销商名称">{viewingCustomer?.name || viewingRecord.customerName || "-"}</FieldRow>
                    <FieldRow label="经销商编码">{viewingCustomer?.code || "-"}</FieldRow>
                    <FieldRow label="联系人">{viewingCustomer?.contactPerson || "-"}</FieldRow>
                    <FieldRow label="联系电话">{viewingCustomer?.phone || "-"}</FieldRow>
                  </div>
                  <div>
                    <FieldRow label="电子邮箱">{viewingCustomer?.email || "-"}</FieldRow>
                    <FieldRow label="省份">{viewingCustomer?.province || "-"}</FieldRow>
                    <FieldRow label="城市">{viewingCustomer?.city || "-"}</FieldRow>
                    <FieldRow label="详细地址">{viewingCustomer?.address || "-"}</FieldRow>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">{currentDocumentLabel}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <FieldRow label={currentNumberLabel}>
                      {mode === "authorization" ? viewingRecord.authorizationNo || "-" : viewingRecord.contractNo || "-"}
                    </FieldRow>
                    {mode === "authorization" && (
                      <FieldRow label="授权区域">{viewingRecord.territory || "-"}</FieldRow>
                    )}
                  </div>
                  <div>
                    <FieldRow label={currentExpiryLabel}>
                      {formatDateValue(mode === "authorization" ? viewingRecord.authorizationExpiry : viewingRecord.contractExpiry) || "-"}
                    </FieldRow>
                    <FieldRow label="当前状态">
                      <Badge
                        variant={statusMap[viewingRecord.status]?.variant || "outline"}
                        className={getStatusSemanticClass(viewingRecord.status, statusMap[viewingRecord.status]?.label)}
                      >
                        {statusMap[viewingRecord.status]?.label || viewingRecord.status}
                      </Badge>
                    </FieldRow>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  关闭
                </Button>
                <Button
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleEdit(viewingRecord);
                  }}
                >
                  编辑{currentDocumentLabel}
                </Button>
              </div>
            </div>
          )}
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
