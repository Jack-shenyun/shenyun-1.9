import { DraggableDialog } from "@/components/DraggableDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatCurrencyValue, formatDate } from "@/lib/formatters";
import { localizeStatusLabel } from "@/lib/statusStyle";
import { normalizePaymentCondition } from "@shared/paymentTerms";
import { useLocation } from "wouter";
import { ShoppingCart, DollarSign, TrendingUp, Calendar } from "lucide-react";

interface Supplier {
  id: number;
  code: string;
  name: string;
  shortName?: string;
  category: string;
  level: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNo?: string;
  bankAccount?: string;
  paymentTerms?: string;
  businessLicense?: string;
  evaluationScore?: string;
  status: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SupplierDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onEdit: (supplier: Supplier) => void;
}

const statusMap: Record<string, { label: string; variant: "outline" | "default" | "destructive" }> = {
  pending: { label: "待审核", variant: "outline" },
  approved: { label: "已认证", variant: "default" },
  suspended: { label: "已暂停", variant: "destructive" },
  blacklist: { label: "黑名单", variant: "destructive" },
};

const levelMap: Record<string, { label: string; color: string }> = {
  A: { label: "A级", color: "bg-green-100 text-green-800" },
  B: { label: "B级", color: "bg-blue-100 text-blue-800" },
  C: { label: "C级", color: "bg-amber-100 text-amber-800" },
  pending: { label: "待评级", color: "bg-gray-100 text-gray-800" },
};

const categoryMap: Record<string, string> = {
  material: "原材料",
  package: "包装材料",
  equipment: "设备",
  service: "服务",
};

const purchaseOrderStatusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  draft: { label: "草稿", variant: "outline" },
  dept_review: { label: "部门审核中", variant: "default" },
  gm_review: { label: "总经理审批中", variant: "default" },
  approved: { label: "已审批", variant: "secondary" },
  issued: { label: "已下达", variant: "secondary" },
  ordered: { label: "已下单", variant: "default" },
  partial_received: { label: "部分收货", variant: "secondary" },
  received: { label: "已收货", variant: "secondary" },
  completed: { label: "已完成", variant: "default" },
  cancelled: { label: "已取消", variant: "destructive" },
};

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );
}

export function SupplierDetailDialog({ open, onOpenChange, supplier, onEdit }: SupplierDetailDialogProps) {
  const [, setLocation] = useLocation();
  const { data: allOrders = [] } = trpc.purchaseOrders.list.useQuery(
    { supplierId: supplier?.id },
    { enabled: !!supplier?.id && open }
  );
  const { data: payables = [] } = trpc.accountsPayable.list.useQuery(
    { supplierId: supplier?.id, limit: 200 },
    { enabled: !!supplier?.id && open }
  );
  const { data: orders = [] } = trpc.purchaseOrders.list.useQuery(
    { supplierId: supplier?.id, limit: 10 },
    { enabled: !!supplier?.id && open }
  );

  if (!supplier) return null;

  const orderList = allOrders as any[];
  const payableList = payables as any[];
  const orderCount = orderList.length;
  const totalAmount = orderList.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0);
  const paidAmount = payableList.reduce((sum: number, item: any) => sum + Number(item.paidAmount || 0), 0);
  const lastTransactionDate = [...orderList.map((order: any) => order.orderDate), ...payableList.map((item: any) => item.paymentDate || item.invoiceDate || item.createdAt)]
    .filter(Boolean)
    .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange} defaultWidth={860} defaultHeight={700}>
      <div className="px-8 py-6 max-w-3xl mx-auto space-y-5">
        <div className="border-b pb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">供应商详情</h2>
            <p className="text-sm text-muted-foreground">{supplier.code} · {supplier.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="shadow-none border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">累计订单</CardTitle>
              <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">{orderCount}</div>
              <p className="text-xs text-muted-foreground">历史订单数量</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">累计交易额</CardTitle>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">{formatCurrencyValue(totalAmount)}</div>
              <p className="text-xs text-muted-foreground">总交易金额</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">累计付款额</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">{formatCurrencyValue(paidAmount)}</div>
              <p className="text-xs text-muted-foreground">累计已付金额</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">最近交易</CardTitle>
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">{lastTransactionDate ? formatDate(lastTransactionDate) : "-"}</div>
              <p className="text-xs text-muted-foreground">最近业务日期</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="供应商编码">{supplier.code}</FieldRow>
              <FieldRow label="供应商名称">{supplier.name}</FieldRow>
              <FieldRow label="供应类别">
                <Badge variant="outline">{categoryMap[supplier.category] || supplier.category}</Badge>
              </FieldRow>
              <FieldRow label="状态">
                <Badge variant={statusMap[supplier.status]?.variant || "outline"}>
                  {localizeStatusLabel(statusMap[supplier.status]?.label || supplier.status)}
                </Badge>
              </FieldRow>
            </div>
            <div>
              <FieldRow label="联系人">{supplier.contactPerson || "-"}</FieldRow>
              <FieldRow label="联系电话">{supplier.phone || "-"}</FieldRow>
              <FieldRow label="电子邮箱">{supplier.email || "-"}</FieldRow>
              <FieldRow label="地址">{supplier.address || "-"}</FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">资质信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="供应商等级">
                <span className={"px-2 py-1 rounded text-xs font-medium " + (levelMap[supplier.level]?.color || "")}>
                  {levelMap[supplier.level]?.label || supplier.level}
                </span>
              </FieldRow>
              <FieldRow label="营业执照号">{supplier.businessLicense || "-"}</FieldRow>
              <FieldRow label="税号">{supplier.taxNo || "-"}</FieldRow>
            </div>
            <div>
              <FieldRow label="付款条件">{normalizePaymentCondition(supplier.paymentTerms) || "-"}</FieldRow>
              <FieldRow label="银行账号">{supplier.bankAccount || "-"}</FieldRow>
              <FieldRow label="备注">{supplier.remarks || "-"}</FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">历史订单</h3>
          {(orders as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">暂无订单记录</p>
          ) : (
            <div className="space-y-1.5">
              {(orders as any[]).map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between px-3 py-2 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    onOpenChange(false);
                    setLocation(`/purchase/orders?id=${order.id}`);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm truncate">{order.orderNo}</span>
                    <Badge variant={purchaseOrderStatusMap[order.status]?.variant || "outline"} className="shrink-0">
                      {localizeStatusLabel(purchaseOrderStatusMap[order.status]?.label || order.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(order.orderDate)}</span>
                  </div>
                  <span className="font-semibold text-sm shrink-0 ml-4">
                    {formatCurrencyValue(order.totalAmount)}
                  </span>
                </div>
              ))}
              {(orders as any[]).length >= 10 && (
                <p className="text-xs text-muted-foreground text-center pt-1">仅显示最近 10 条订单</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
          <Button onClick={() => onEdit(supplier)}>编辑供应商</Button>
        </div>
      </div>
    </DraggableDialog>
  );
}
