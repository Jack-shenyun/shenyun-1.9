import { DraggableDialog } from "@/components/DraggableDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatCurrencyValue, formatDate } from "@/lib/formatters";
import { localizeStatusLabel } from "@/lib/statusStyle";
import { useLocation } from "wouter";
import { PRODUCT_CATEGORY_LABELS } from "@shared/productCategories";

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any | null;
  onEdit: (product: any) => void;
}

const statusMap: Record<
  string,
  { label: string; variant: "outline" | "default" | "destructive" }
> = {
  draft: { label: "草稿", variant: "outline" },
  active: { label: "已上市", variant: "default" },
  discontinued: { label: "已停产", variant: "destructive" },
};

const categoryMap: Record<string, string> = {
  nmpa: "NMPA注册",
  fda: "FDA注册",
  ce: "CE注册",
  oem: "OEM代工",
  other: "其他",
};

const productCategoryMap: Record<string, { label: string; color: string }> = {
  finished: {
    label: PRODUCT_CATEGORY_LABELS.finished,
    color: "bg-blue-100 text-blue-800",
  },
  semi_finished: {
    label: PRODUCT_CATEGORY_LABELS.semi_finished,
    color: "bg-purple-100 text-purple-800",
  },
  raw_material: {
    label: PRODUCT_CATEGORY_LABELS.raw_material,
    color: "bg-amber-100 text-amber-800",
  },
  component: {
    label: PRODUCT_CATEGORY_LABELS.component,
    color: "bg-emerald-100 text-emerald-800",
  },
  equipment: {
    label: PRODUCT_CATEGORY_LABELS.equipment,
    color: "bg-cyan-100 text-cyan-800",
  },
  consumable: {
    label: PRODUCT_CATEGORY_LABELS.consumable,
    color: "bg-pink-100 text-pink-800",
  },
  packaging_material: {
    label: PRODUCT_CATEGORY_LABELS.packaging_material,
    color: "bg-lime-100 text-lime-800",
  },
  other: {
    label: PRODUCT_CATEGORY_LABELS.other,
    color: "bg-gray-100 text-gray-800",
  },
};

const riskLevelMap: Record<string, { label: string; color: string }> = {
  I: { label: "I类", color: "bg-green-100 text-green-800" },
  II: { label: "II类", color: "bg-amber-100 text-amber-800" },
  III: { label: "III类", color: "bg-red-100 text-red-800" },
};

const purchaseOrderStatusMap: Record<
  string,
  {
    label: string;
    variant: "outline" | "default" | "secondary" | "destructive";
  }
> = {
  draft: { label: "草稿", variant: "outline" },
  approved: { label: "已审批", variant: "secondary" },
  ordered: { label: "已下单", variant: "default" },
  partial_received: { label: "部分收货", variant: "secondary" },
  received: { label: "已收货", variant: "secondary" },
  completed: { label: "已完成", variant: "default" },
  cancelled: { label: "已取消", variant: "destructive" },
};

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );
}

export function ProductDetailDialog({
  open,
  onOpenChange,
  product,
  onEdit,
}: ProductDetailDialogProps) {
  const [, setLocation] = useLocation();
  const { data: bomItems = [] } = trpc.bom.getByProductId.useQuery(
    { productId: product?.id || 0 },
    {
      enabled:
        !!product?.id &&
        open &&
        (product as any)?.salePermission === "saleable" &&
        (product as any)?.procurePermission === "production_only",
    }
  );
  const { data: purchaseOrders = [] } =
    trpc.purchaseOrders.getByProductId.useQuery(
      { productId: product?.id || 0, limit: 10 },
      {
        enabled:
          !!product?.id &&
          open &&
          (product as any)?.salePermission === "saleable" &&
          (product as any)?.procurePermission === "purchasable",
      }
    );

  if (!product) return null;

  const categoryCfg = productCategoryMap[product.productCategory || ""];
  const riskCfg = riskLevelMap[product.riskLevel || ""];
  const isSaleable = (product as any).salePermission === "saleable";
  const isProduction = (product as any).procurePermission === "production_only";
  const isPurchasable = (product as any).procurePermission === "purchasable";

  return (
    <DraggableDialog
      open={open}
      onOpenChange={onOpenChange}
      defaultWidth={860}
      defaultHeight={700}
    >
      <div className="px-8 py-6 max-w-3xl mx-auto space-y-5">
        <div className="border-b pb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">产品详情</h2>
            <p className="text-sm text-muted-foreground">
              {product.code} · {product.name}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            基本信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="产品编码">{product.code}</FieldRow>
              <FieldRow label="产品名称">{product.name}</FieldRow>
              <FieldRow label="规格型号">
                {product.specification || "-"}
              </FieldRow>
              <FieldRow label="产品类型">
                <Badge
                  variant={product.isMedicalDevice ? "default" : "secondary"}
                >
                  {product.isMedicalDevice ? "医疗器械" : "非医疗器械"}
                </Badge>
              </FieldRow>
              <FieldRow label="是否灭菌">
                <Badge variant={product.isSterilized ? "default" : "secondary"}>
                  {product.isSterilized ? "是" : "否"}
                </Badge>
              </FieldRow>
              <FieldRow label="产品分类">
                {categoryCfg ? (
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${categoryCfg.color}`}
                  >
                    {categoryCfg.label}
                  </span>
                ) : (
                  "-"
                )}
              </FieldRow>
              <FieldRow label="产品属性">
                <Badge variant="outline">
                  {categoryMap[product.category || ""] ||
                    product.category ||
                    "-"}
                </Badge>
              </FieldRow>
            </div>
            <div>
              <FieldRow label="状态">
                <Badge
                  variant={statusMap[product.status]?.variant || "outline"}
                >
                  {localizeStatusLabel(
                    statusMap[product.status]?.label || product.status
                  )}
                </Badge>
              </FieldRow>
              <FieldRow label="生产企业">
                {product.manufacturer || "-"}
              </FieldRow>
              <FieldRow label="计量单位">{product.unit || "-"}</FieldRow>
              <FieldRow label="保质期">
                {product.shelfLife ? `${product.shelfLife}个月` : "-"}
              </FieldRow>
              <FieldRow label="销售权限">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${(product as any).salePermission === "saleable" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                >
                  {(product as any).salePermission === "saleable"
                    ? "销售"
                    : "不销售"}
                </span>
              </FieldRow>
              <FieldRow label="获取权限">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${isPurchasable ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                >
                  {isPurchasable ? "采购" : "生产"}
                </span>
              </FieldRow>
              <FieldRow label="默认供应商">
                {product.defaultSupplierName || "-"}
              </FieldRow>
            </div>
          </div>
        </div>

        {product.isMedicalDevice && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              注册信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="风险等级">
                  {riskCfg ? (
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${riskCfg.color}`}
                    >
                      {riskCfg.label}
                    </span>
                  ) : (
                    "-"
                  )}
                </FieldRow>
                <FieldRow label="注册证号">
                  {product.registrationNo || "-"}
                </FieldRow>
              </div>
              <div>
                <FieldRow label="注册证有效期">
                  {product.registrationExpiry || "-"}
                </FieldRow>
                <FieldRow label="UDI编码">{product.udiDi || "-"}</FieldRow>
              </div>
            </div>
            <div className="mt-2">
              <FieldRow label="医保C码">
                {product.medicalInsuranceCode || "-"}
              </FieldRow>
            </div>
            <div className="mt-2">
              <FieldRow label="储存条件">
                {product.storageCondition || "-"}
              </FieldRow>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            产品描述
          </h3>
          <div className="text-sm border rounded-lg px-3 py-2 min-h-16">
            {product.description || "-"}
          </div>
        </div>

        {isSaleable && isProduction && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              BOM关联
            </h3>
            {(bomItems as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                暂无BOM记录
              </p>
            ) : (
              <div className="space-y-1.5">
                {(bomItems as any[]).map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      onOpenChange(false);
                      setLocation("/production/bom");
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {item.materialName}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {item.materialCode}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.specification || "-"}
                      </p>
                    </div>
                    <span className="text-sm shrink-0 ml-4">
                      {item.quantity} {item.unit || ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isSaleable && isPurchasable && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              采购历史记录
            </h3>
            {(purchaseOrders as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                暂无采购记录
              </p>
            ) : (
              <div className="space-y-1.5">
                {(purchaseOrders as any[]).map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between px-3 py-2 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      onOpenChange(false);
                      setLocation(`/purchase/orders?id=${order.id}`);
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">
                        {order.orderNo}
                      </span>
                      <Badge
                        variant={
                          purchaseOrderStatusMap[order.status]?.variant ||
                          "outline"
                        }
                        className="shrink-0"
                      >
                        {localizeStatusLabel(
                          purchaseOrderStatusMap[order.status]?.label ||
                            order.status
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(order.orderDate)}
                      </span>
                    </div>
                    <span className="font-semibold text-sm shrink-0 ml-4">
                      ¥
                      {formatCurrencyValue(order.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button onClick={() => onEdit(product)}>编辑产品</Button>
        </div>
      </div>
    </DraggableDialog>
  );
}
