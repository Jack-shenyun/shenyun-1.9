import { formatCurrencyValue, formatDate, formatDateTime } from "@/lib/formatters";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { DraggableDialog } from "./DraggableDialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TrendingUp, Calendar, DollarSign, ShoppingCart } from "lucide-react";
import { useLocation } from "wouter";
import { normalizePaymentCondition } from "@shared/paymentTerms";
import { localizeStatusLabel } from "@/lib/statusStyle";

interface Customer {
  id: number;
  code: string;
  name: string;
  type: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  country?: string;
  province?: string;
  city?: string;
  address?: string;
  status: string;
  paymentTerms?: string;
  currency?: string;
  needInvoice?: boolean;
  taxNo?: string;
  taxRate?: string | number;
  bankAccount?: string;
  bankName?: string;
  salesPersonId?: number;
  salesPersonName?: string;
  source?: string;
  logoUrl?: string | null;
}

interface CustomerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onEdit: (customer: Customer) => void;
}

const statusMap = {
  active: { label: "正常", variant: "default" as const },
  inactive: { label: "停用", variant: "outline" as const },
  blacklist: { label: "黑名单", variant: "destructive" as const },
};

const typeMap: Record<string, string> = {
  overseas: "海外客户",
  domestic: "国内客户",
  dealer: "经销商",
  hospital: "医院",
};

const orderStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "待审核", variant: "outline" },
  approved: { label: "已审核", variant: "secondary" },
  processing: { label: "处理中", variant: "default" },
  shipped: { label: "已发货", variant: "default" },
  completed: { label: "已完成", variant: "default" },
  cancelled: { label: "已取消", variant: "destructive" },
};

function extractPaymentDaysFromSource(source: unknown): string {
  const text = String(source ?? "");
  const match = text.match(/__PAYMENT_DAYS__:(\d{1,3})/);
  return match?.[1] ?? "";
}

/** 单个字段行：label 固定宽度，value 自适应 */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );
}

export function CustomerDetailDialog({ open, onOpenChange, customer, onEdit }: CustomerDetailDialogProps) {
  const [, setLocation] = useLocation();
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [customer?.id, customer?.logoUrl]);

  const { data: stats } = trpc.customers.getStats.useQuery(
    { customerId: customer?.id || 0 },
    { enabled: !!customer?.id && open }
  );

  const { data: orders = [] } = trpc.customers.getOrders.useQuery(
    { customerId: customer?.id || 0 },
    { enabled: !!customer?.id && open }
  );

  if (!customer) return null;


  const getCurrencySymbol = (currency?: string) => {
    switch (String(currency || "CNY").toUpperCase()) {
      case "USD": return "$";
      case "EUR": return "€";
      case "GBP": return "£";
      case "JPY": return "¥";
      case "HKD": return "HK$";
      case "CNY":
      default:
        return "¥";
    }
  };

  const formatAmount = (amount: string | number | null, currency?: string) => {
    const symbol = getCurrencySymbol(currency);
    return formatCurrencyValue(amount, symbol);
  };

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange} defaultWidth={860} defaultHeight={700}>
      <div className="px-8 py-6 max-w-3xl mx-auto space-y-5">
        {/* 头部 */}
        <div className="border-b pb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">客户详情</h2>
            <p className="text-sm text-muted-foreground">{customer.code} · {customer.name}</p>
          </div>
          <div className="h-20 w-28 shrink-0 rounded-md border border-border/70 bg-muted/10 overflow-hidden flex items-center justify-center">
            {customer.logoUrl && !logoLoadFailed ? (
              <img
                src={customer.logoUrl}
                alt={`${customer.name} 商标`}
                className="h-full w-full object-contain"
                loading="lazy"
                onError={() => setLogoLoadFailed(true)}
              />
            ) : null}
          </div>
        </div>

        {/* 交易统计卡片 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">累计订单</CardTitle>
                <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-xl font-bold">{stats.orderCount}</div>
                <p className="text-xs text-muted-foreground">历史订单数量</p>
              </CardContent>
            </Card>
            <Card className="shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">累计交易额</CardTitle>
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-xl font-bold">{formatAmount(stats.totalAmount, customer.currency)}</div>
                <p className="text-xs text-muted-foreground">总交易金额</p>
              </CardContent>
            </Card>
            <Card className="shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">累积付款额</CardTitle>
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-xl font-bold">
                  {formatAmount((stats as { paidAmount?: string | number | null }).paidAmount ?? 0, customer.currency)}
                </div>
                <p className="text-xs text-muted-foreground">累计已收金额</p>
              </CardContent>
            </Card>
            <Card className="shadow-none border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">最近交易</CardTitle>
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-xl font-bold">
                  {stats.lastOrderDate ? formatDate(stats.lastOrderDate) : "-"}
                </div>
                <p className="text-xs text-muted-foreground">最后订单日期</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 基本信息：两列网格 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            {/* 左列 */}
            <div>
              <FieldRow label="客户编码">{customer.code}</FieldRow>
              <FieldRow label="客户名称">{customer.name}</FieldRow>
              <FieldRow label="客户类型">
                <Badge variant="outline">{typeMap[customer.type] || customer.type}</Badge>
              </FieldRow>
              <FieldRow label="状态">
                <Badge variant={statusMap[customer.status as keyof typeof statusMap]?.variant || "outline"}>
                  {localizeStatusLabel(statusMap[customer.status as keyof typeof statusMap]?.label || customer.status)}
                </Badge>
              </FieldRow>
              <FieldRow label="销售负责人">{customer.salesPersonName || "-"}</FieldRow>
            </div>
            {/* 右列 */}
            <div>
              <FieldRow label="联系人">{customer.contactPerson || "-"}</FieldRow>
              <FieldRow label="联系电话">{customer.phone || "-"}</FieldRow>
              <FieldRow label="电子邮箱">{customer.email || "-"}</FieldRow>
              <FieldRow label={customer.type === "overseas" ? "国家" : "省份"}>
                {customer.type === "overseas" ? customer.country || "-" : customer.province || "-"}
              </FieldRow>
              {customer.type !== "overseas" && (
                <FieldRow label="城市">{customer.city || "-"}</FieldRow>
              )}
            </div>
          </div>
        </div>

        {/* 财务信息：两列网格 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">财务信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="详细地址">{customer.address || "-"}</FieldRow>
              <FieldRow label="付款条件">
                {(() => {
                  const normalized = normalizePaymentCondition(customer.paymentTerms);
                  const days = extractPaymentDaysFromSource(customer.source);
                  if (normalized === "账期支付" && days) {
                    return `${normalized}（${days}天）`;
                  }
                  return normalized || "-";
                })()}
              </FieldRow>
              <FieldRow label="是否开票">{customer.needInvoice ? "开票" : "不开票"}</FieldRow>
            </div>
            <div>
              {customer.needInvoice && (
                <>
                  <FieldRow label="税率">{customer.taxRate ? `${customer.taxRate}%` : "13%"}</FieldRow>
                  <FieldRow label="税号">{customer.taxNo || "-"}</FieldRow>
                  <FieldRow label="开户银行">{customer.bankName || "-"}</FieldRow>
                  <FieldRow label="银行账号">{customer.bankAccount || "-"}</FieldRow>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 历史订单 */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">历史订单</h3>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">暂无订单记录</p>
          ) : (
            <div className="space-y-1.5">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between px-3 py-2 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    onOpenChange(false);
                    setLocation(`/sales/orders?id=${order.id}`);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm truncate">{order.orderNo}</span>
                    <Badge variant={orderStatusMap[order.status]?.variant || "outline"} className="shrink-0">
                      {localizeStatusLabel(orderStatusMap[order.status]?.label || order.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(order.orderDate)}</span>
                  </div>
                  <span className="font-semibold text-sm shrink-0 ml-4">{formatAmount(order.totalAmount, (order as any).currency || customer.currency)}</span>
                </div>
              ))}
              {orders.length >= 10 && (
                <p className="text-xs text-muted-foreground text-center pt-1">仅显示最近 10 条订单</p>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
          <Button onClick={() => onEdit(customer)}>编辑客户</Button>
        </div>
      </div>
    </DraggableDialog>
  );
}
