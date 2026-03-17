import { formatDateValue, formatDisplayNumber } from "@/lib/formatters";
import { useState, useMemo, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import DateTextInput from "@/components/DateTextInput";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import {
  PRODUCT_CATEGORY_BOM_LEVEL2_VALUES,
  PRODUCT_CATEGORY_BOM_LEVEL3_VALUES,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategory,
} from "@shared/productCategories";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  Layers,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  Eye,
  Package,
  Component,
  Box,
  FileText,
  Calculator,
  X,
  Copy,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/_core/hooks/useAuth";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== 类型定义 ====================

const productAttributeLabels: Record<string, string> = {
  nmpa: "NMPA注册",
  fda: "FDA注册",
  ce: "CE注册",
  oem: "OEM代工",
  other: "其他",
};

function canUserViewBomCost(user: any) {
  const department = String(
    user?.department || user?.departmentName || user?.deptName || ""
  ).trim();
  return (
    user?.role === "admin" ||
    Boolean(user?.isCompanyAdmin) ||
    department.includes("管理")
  );
}

interface TreeNode {
  id: number;
  materialCode: string;
  materialName: string;
  specification: string | null;
  baseProductQty?: string | null;
  baseProductUnit?: string | null;
  quantity: string;
  unit: string | null;
  unitPrice: string;
  level: number;
  parentId: number | null;
  status: string;
  remark: string | null;
  productCategory?: ProductCategory | null;
  children: TreeNode[];
}

// 新建 BOM 时的二级物料项
interface BomLevel2Item {
  tempId: string; // 临时ID
  materialCode: string;
  materialName: string;
  specification: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  remark: string;
  productCategory?: ProductCategory | null;
  bindingProcess?: string;
  productId?: number; // 关联的产品ID（从产品表选择）
  children: BomLevel3Item[];
}

// 新建 BOM 时的三级物料项
interface BomLevel3Item {
  tempId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  remark: string;
  bindingProcess?: string;
  productId?: number;
}

const levelConfig: Record<number, { icon: any; label: string; color: string }> = {
  1: { icon: Package, label: "成品", color: "text-blue-600 bg-blue-50 border-blue-200" },
  2: { icon: Component, label: "半成品/组件", color: "text-orange-600 bg-orange-50 border-orange-200" },
  3: { icon: Box, label: "原材料", color: "text-green-600 bg-green-50 border-green-200" },
};

const productCategoryConfig: Partial<Record<ProductCategory, { icon: any; label: string; color: string }>> = {
  semi_finished: { icon: Component, label: "半成品", color: "text-orange-600 bg-orange-50 border-orange-200" },
  component: { icon: Component, label: "组件", color: "text-orange-600 bg-orange-50 border-orange-200" },
  raw_material: { icon: Box, label: "原材料", color: "text-green-600 bg-green-50 border-green-200" },
  packaging_material: { icon: Box, label: "包装材料", color: "text-amber-700 bg-amber-50 border-amber-200" },
  consumable: { icon: Box, label: "耗材", color: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  other: { icon: Box, label: "其他", color: "text-slate-700 bg-slate-50 border-slate-200" },
};

function getTreeNodeDisplayConfig(node: TreeNode) {
  if (node.level === 1) return levelConfig[1];
  if (node.level === 2 && node.children.length > 0) {
    if (node.productCategory === "semi_finished") {
      return productCategoryConfig.semi_finished || levelConfig[2];
    }
    return productCategoryConfig.component || levelConfig[2];
  }
  if (node.productCategory && productCategoryConfig[node.productCategory]) {
    return productCategoryConfig[node.productCategory]!;
  }
  return levelConfig[node.level] || levelConfig[3];
}

const productCategoryLabels: Record<string, string> = {
  ...PRODUCT_CATEGORY_LABELS,
};

// ==================== 工具函数 ====================

function normalizeBomShortCode(value?: string | null) {
  const letters = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2);
  return letters;
}

function inferBomShortCode(product?: { code?: string | null; name?: string | null; specification?: string | null; bomCode?: string | null }) {
  const codeFromBom = String(product?.bomCode || "").match(/^BOM-([A-Z]{2})-\d{3}$/i)?.[1];
  if (codeFromBom) return normalizeBomShortCode(codeFromBom);

  const candidates = [product?.code, product?.name, product?.specification];
  for (const candidate of candidates) {
    const normalized = normalizeBomShortCode(candidate);
    if (normalized.length >= 2) return normalized;
  }
  return "XX";
}

function generateSequentialBomCode(shortCode: string, existingBomCodes: string[]) {
  const normalized = normalizeBomShortCode(shortCode) || "XX";
  const matcher = new RegExp(`^BOM-${normalized}-(\\d{3})$`, "i");
  let maxSeq = 0;

  for (const code of existingBomCodes) {
    const match = String(code || "").match(matcher);
    if (!match) continue;
    const seq = Number(match[1]);
    if (Number.isFinite(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return `BOM-${normalized}-${String(maxSeq + 1).padStart(3, "0")}`;
}

function calcSubtotal(quantity: string, unitPrice: string): number {
  const q = parseFloat(quantity) || 0;
  const p = parseFloat(unitPrice) || 0;
  return q * p;
}

function formatMoney(value: number): string {
  return formatDisplayNumber(value);
}

let _tempIdCounter = 0;
function genTempId(): string {
  return `temp_${Date.now()}_${++_tempIdCounter}`;
}

const PROCESS_STORAGE_KEY = "production-process-templates-v2";
const BOM_META_PREFIX = "__BOM_META__:";

function parseBomRemarkMeta(raw?: string | null) {
  const remarkText = String(raw || "");
  if (!remarkText.startsWith(BOM_META_PREFIX)) {
    return { remark: remarkText, bindingProcess: "" };
  }
  try {
    const parsed = JSON.parse(remarkText.slice(BOM_META_PREFIX.length));
    return {
      remark: String(parsed?.remark || ""),
      bindingProcess: String(parsed?.bindingProcess || ""),
    };
  } catch {
    return { remark: remarkText, bindingProcess: "" };
  }
}

function buildBomRemarkMeta(remark?: string, bindingProcess?: string) {
  const normalizedRemark = String(remark || "").trim();
  const normalizedProcess = String(bindingProcess || "").trim();
  if (!normalizedProcess) {
    return normalizedRemark || undefined;
  }
  return `${BOM_META_PREFIX}${JSON.stringify({
    remark: normalizedRemark,
    bindingProcess: normalizedProcess,
  })}`;
}

// ==================== 三级树形结构组件（详情查看） ====================

function BOMTreeItem({
  node,
  depth = 0,
  canViewCost = false,
}: {
  node: TreeNode;
  depth?: number;
  canViewCost?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const config = getTreeNodeDisplayConfig(node);
  const LevelIcon = config.icon;
  const subtotal = calcSubtotal(node.quantity, node.unitPrice);

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      <div
        className={`flex items-center gap-1.5 py-1 px-2 rounded border mb-0.5 ${
          depth === 0 ? "bg-primary/5 border-primary/20" : "bg-background border-muted hover:bg-muted/30"
        }`}
      >
        {/* 展开/收起按钮 */}
        {hasChildren ? (
          <Button variant="ghost" size="icon" className="h-4 w-4 shrink-0" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        ) : (
          <div className="w-4 shrink-0" />
        )}
        {/* 图标 + 类型标签 */}
        <LevelIcon className={`h-3 w-3 shrink-0 ${config.color.split(" ")[0]}`} />
        <Badge variant="outline" className={`text-[10px] px-1 py-0 shrink-0 leading-4 ${config.color}`}>{config.label}</Badge>
        {/* 列1：产品名称（含物料编码）——占剩余空间的 35% */}
        <div className="flex items-center gap-1 min-w-0" style={{ width: "35%" }}>
          <span className="font-mono text-[10px] text-muted-foreground shrink-0">{node.materialCode}</span>
          <span className="text-xs font-medium truncate">{node.materialName}</span>
        </div>
        {/* 列2：型号规格——占 25% */}
        <div className="text-xs text-muted-foreground truncate" style={{ width: "25%" }}>
          {node.specification || <span className="text-muted-foreground/40">—</span>}
        </div>
        {/* 列3：用量——占 15%，右对齐 */}
        <div className="text-xs text-right shrink-0" style={{ width: "15%" }}>
          {node.quantity} {node.unit || ""}
        </div>
        {/* 列4：单价 + 小计——占 20%，右对齐 */}
        <div className="text-xs text-right shrink-0 flex items-center justify-end gap-1.5" style={{ width: "20%" }}>
          {node.level !== 1 && canViewCost ? (
            <>
              <span className="text-muted-foreground">¥{formatDisplayNumber(node.unitPrice)}</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-medium text-primary">¥{formatDisplayNumber(subtotal)}</span>
            </>
          ) : (
            <span className="text-muted-foreground text-[10px]">{node.quantity} {node.unit || ""}</span>
          )}
        </div>
      </div>
      {hasChildren && isOpen && (
        <div className="border-l-2 border-muted/60 ml-2">
          {node.children.map((child) => (
            <BOMTreeItem key={child.id} node={child} depth={depth + 1} canViewCost={canViewCost} />
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== BOM 详情弹窗 ====================

function BOMDetailDialog({
  open,
  onOpenChange,
  bomRecord,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bomRecord: any;
}) {
  const { user } = useAuth();
  const canViewCost = canUserViewBomCost(user);
  const productId = bomRecord?.productId;
  const { data: rawItems = [], isLoading } = trpc.bom.list.useQuery(
    { productId: productId! },
    { enabled: !!productId && open }
  );
  const { data: rawProducts = [] } = trpc.products.list.useQuery(
    {},
    { enabled: open }
  );
  const items = rawItems as any[];
  const allProducts = rawProducts as any[];
  const productMapByCode = useMemo(
    () => new Map(allProducts.map((product: any) => [String(product.code || ""), product])),
    [allProducts]
  );

  const treeData = useMemo(() => {
    if (!items.length || !bomRecord) return [];
    const productNode: TreeNode = {
      id: 0,
      materialCode: bomRecord.productCode || "",
      materialName: bomRecord.productName || "未知产品",
      specification: bomRecord.productSpec || null,
      baseProductQty: String(bomRecord.baseProductQty || "1"),
      baseProductUnit: bomRecord.baseProductUnit || bomRecord.productUnit || "套",
      quantity: String(bomRecord.baseProductQty || "1"),
      unit: bomRecord.baseProductUnit || bomRecord.productUnit || "套",
      unitPrice: "0",
      level: 1,
      parentId: null,
      status: "active",
      remark: null,
      productCategory: "finished",
      children: [],
    };
    const level2Items = items.filter((i: any) => i.level === 2 || !i.parentId);
    const level3Items = items.filter((i: any) => i.level === 3 && i.parentId);
    level2Items.forEach((item: any) => {
      const children = level3Items.filter((c: any) => c.parentId === item.id);
      const matchedProduct = productMapByCode.get(String(item.materialCode || ""));
      const node: TreeNode = {
        id: item.id,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification,
        quantity: item.quantity,
        unit: item.unit,
        baseProductQty: item.baseProductQty,
        baseProductUnit: item.baseProductUnit,
        unitPrice: item.unitPrice || "0",
        level: 2,
        parentId: null,
        status: item.status,
        remark: item.remark,
        productCategory: (matchedProduct?.productCategory || null) as ProductCategory | null,
        children: children.map((c: any) => {
          const childProduct = productMapByCode.get(String(c.materialCode || ""));
          return {
            id: c.id,
            materialCode: c.materialCode,
            materialName: c.materialName,
            specification: c.specification,
            quantity: c.quantity,
            unit: c.unit,
            baseProductQty: c.baseProductQty,
            baseProductUnit: c.baseProductUnit,
            unitPrice: c.unitPrice || "0",
            level: 3,
            parentId: c.parentId,
            status: c.status,
            remark: c.remark,
            productCategory: (childProduct?.productCategory || null) as ProductCategory | null,
            children: [],
          };
        }),
      };
      productNode.children.push(node);
    });
    return [productNode];
  }, [items, bomRecord, productMapByCode]);

  // 计算总成本
  const totalCost = useMemo(() => {
    return items.reduce((sum: number, item: any) => {
      return sum + calcSubtotal(item.quantity, item.unitPrice || "0");
    }, 0);
  }, [items]);

  const level2Nodes = treeData[0]?.children || [];
  const level2Count = level2Nodes.length;
  const componentCount = level2Nodes.filter((node) =>
    node.children.length > 0 ||
    node.productCategory === "semi_finished" ||
    node.productCategory === "component"
  ).length;
  const directMaterialCount = level2Nodes.filter((node) =>
    node.children.length === 0 &&
    node.productCategory !== "semi_finished" &&
    node.productCategory !== "component"
  ).length;
  const level3Count = items.filter((i: any) => i.level === 3 && i.parentId).length;

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            BOM 结构详情
          </DialogTitle>
        </DialogHeader>
        {bomRecord && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">产品编码</span>
                    <p className="font-medium font-mono">{bomRecord.productCode || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">产品名称</span>
                    <p className="font-medium">{bomRecord.productName || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">产品规格</span>
                    <p className="font-medium">{bomRecord.productSpec || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">BOM版本</span>
                    <p className="font-medium">{bomRecord.version || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">基准产出</span>
                    <p className="font-medium">
                      {bomRecord.baseProductQty || "1"} {bomRecord.baseProductUnit || bomRecord.productUnit || "-"}
                    </p>
                  </div>
                  {bomRecord.productDescription && (
                    <div className="col-span-2 md:col-span-4">
                      <span className="text-muted-foreground">产品描述</span>
                      <p className="font-medium text-muted-foreground/80 leading-relaxed">{bomRecord.productDescription}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">物料总数</span>
                    <p className="font-medium">{bomRecord.itemCount}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">二级结构项</span>
                    <p className="font-medium text-orange-600">{level2Count} 项</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">二级组件</span>
                    <p className="font-medium text-orange-600">{componentCount} 项</p>
                  </div>
                  {directMaterialCount > 0 && (
                    <div>
                      <span className="text-muted-foreground">直采物料</span>
                      <p className="font-medium text-green-600">{directMaterialCount} 项</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">三级原材料</span>
                    <p className="font-medium text-green-600">{level3Count} 项</p>
                  </div>
                  {canViewCost && (
                    <div>
                      <span className="text-muted-foreground">材料总成本</span>
                      <p className="font-medium text-red-600">¥{formatDisplayNumber(totalCost)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  三级物料结构
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pb-4 border-b flex-wrap">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span>一级：成品</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Component className="h-4 w-4 text-orange-600" />
                    <span>二级：半成品/组件/直采物料</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Box className="h-4 w-4 text-green-600" />
                    <span>三级：原材料</span>
                  </div>
                </div>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : treeData.length > 0 ? (
                  <div className="space-y-1">
                    {treeData.map((node) => (
                      <BOMTreeItem key={node.id} node={node} canViewCost={canViewCost} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>暂未配置物料结构</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DraggableDialogContent>
    </DraggableDialog>
  );
}

// ==================== 三级物料选择弹窗（为某个二级物料添加三级原材料） ====================

function Level3MaterialDialog({
  open,
  onOpenChange,
  level2Item,
  onSave,
  processOptions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  level2Item: BomLevel2Item | null;
  onSave: (level2TempId: string, children: BomLevel3Item[]) => void;
  processOptions: string[];
}) {
  const { user } = useAuth();
  const canViewCost = canUserViewBomCost(user);
  const { data: rawProducts = [] } = trpc.products.list.useQuery({});
  const allProducts = rawProducts as any[];
  // 筛选原材料产品
  const rawMaterialProducts = allProducts.filter((p: any) =>
    PRODUCT_CATEGORY_BOM_LEVEL3_VALUES.includes((p.productCategory || "other") as ProductCategory),
  );
  const productMapByCode = useMemo(
    () => new Map(allProducts.map((product: any) => [String(product.code || ""), product])),
    [allProducts],
  );

  const [children, setChildren] = useState<BomLevel3Item[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const recentPriceProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          children
            .map((child) => child.productId || productMapByCode.get(String(child.materialCode || ""))?.id)
            .filter((id): id is number => Number.isFinite(Number(id)) && Number(id) > 0),
        ),
      ),
    [children, productMapByCode],
  );
  const { data: recentPurchasePrices = [] } = trpc.purchaseOrders.getRecentPrices.useQuery(
    { productIds: recentPriceProductIds, days: 30 },
    { enabled: canViewCost && open && recentPriceProductIds.length > 0 },
  );
  const recentPurchasePriceMap = useMemo(
    () => new Map(recentPurchasePrices.map((row: any) => [Number(row.productId), String(row.unitPrice || "0")])),
    [recentPurchasePrices],
  );

  // 当弹窗打开时，初始化已有的子物料
  useMemo(() => {
    if (open && level2Item) {
      setChildren([...level2Item.children]);
      setProductSearch("");
    }
  }, [open, level2Item]);

  useEffect(() => {
    if (!open || recentPurchasePriceMap.size === 0) return;
    setChildren((prev) => {
      let changed = false;
      const next = prev.map((child) => {
        const productId = child.productId || productMapByCode.get(String(child.materialCode || ""))?.id;
        const latestPrice = productId ? recentPurchasePriceMap.get(Number(productId)) : undefined;
        if (!latestPrice || String(child.unitPrice || "") === String(latestPrice)) {
          return child;
        }
        changed = true;
        return { ...child, unitPrice: latestPrice, productId: productId || child.productId };
      });
      return changed ? next : prev;
    });
  }, [open, recentPurchasePriceMap, productMapByCode]);

  const filteredProducts = rawMaterialProducts.filter((p: any) => {
    const search = productSearch.toLowerCase();
    return (
      p.code?.toLowerCase().includes(search) ||
      p.name?.toLowerCase().includes(search) ||
      p.specification?.toLowerCase().includes(search)
    );
  });

  const addMaterial = (product: any) => {
    // 检查是否已添加
    if (children.some((c) => c.materialCode === product.code)) {
      toast.error("该原材料已添加");
      return;
    }
    setChildren([
      ...children,
      {
        tempId: genTempId(),
        materialCode: product.code,
        materialName: product.name,
        specification: product.specification || "",
        quantity: "1",
        unit: product.unit || "",
        unitPrice: "0",
        remark: "",
        bindingProcess: "",
        productId: product.id,
      },
    ]);
  };

  const updateChild = (tempId: string, field: keyof BomLevel3Item, value: string) => {
    setChildren(children.map((c) => (c.tempId === tempId ? { ...c, [field]: value } : c)));
  };

  const removeChild = (tempId: string) => {
    setChildren(children.filter((c) => c.tempId !== tempId));
  };

  const childrenCost = children.reduce((sum, c) => sum + calcSubtotal(c.quantity, c.unitPrice), 0);

  const handleSave = () => {
    if (level2Item) {
      onSave(level2Item.tempId, children);
      onOpenChange(false);
    }
  };

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-green-600" />
            配置三级原材料 — {level2Item?.materialName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 二级物料信息 */}
          {level2Item && (
            <Card className="bg-orange-50/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">半成品/组件</Badge>
                  <span className="font-mono">{level2Item.materialCode}</span>
                  <span className="font-medium">{level2Item.materialName}</span>
                  <span className="text-muted-foreground">{level2Item.specification}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 从产品表选择原材料 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">选择原材料（从产品档案中选择）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索原材料编码、名称、规格..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="text-center font-bold">编码</TableHead>
                      <TableHead className="text-center font-bold">名称</TableHead>
                      <TableHead className="text-center font-bold">规格</TableHead>
                      <TableHead className="text-center font-bold">单位</TableHead>
                      <TableHead className="text-center font-bold">分类</TableHead>
                      <TableHead className="text-center font-bold">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">
                          暂无原材料产品
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.slice(0, 20).map((p: any) => (
                        <TableRow key={p.id} className="hover:bg-muted/30">
                          <TableCell className="text-center text-xs font-mono">{p.code}</TableCell>
                          <TableCell className="text-center text-xs">{p.name}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{p.specification || "-"}</TableCell>
                          <TableCell className="text-center text-xs">{p.unit || "-"}</TableCell>
                          <TableCell className="text-center text-xs">
                            <Badge variant="outline" className="text-[10px]">
                              {productCategoryLabels[p.productCategory] || p.productCategory || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => addMaterial(p)}
                              disabled={children.some((c) => c.materialCode === p.code)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              添加
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 已选三级原材料列表 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">已选原材料（{children.length} 项）</CardTitle>
                {canViewCost && (
                  <div className="flex items-center gap-1 text-sm">
                    <Calculator className="h-4 w-4 text-red-600" />
                    <span className="text-muted-foreground">原材料成本：</span>
                    <span className="font-bold text-red-600">¥{formatDisplayNumber(childrenCost)}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {children.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  请从上方列表选择原材料
                </div>
              ) : (
                <div className="space-y-2 overflow-x-auto">
                  {children.map((child) => {
                    const subtotal = calcSubtotal(child.quantity, child.unitPrice);
                    return (
                      <div key={child.tempId} className="flex min-w-[860px] items-center gap-3 p-2 border rounded-lg bg-green-50/30">
                        <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 text-xs shrink-0">原材料</Badge>
                        <span className="font-mono text-xs shrink-0 w-32 truncate">{child.materialCode}</span>
                        <span className="text-sm shrink-0 w-28 truncate">{child.materialName}</span>
                        <Select
                          value={child.bindingProcess || "__none__"}
                          onValueChange={(value) => updateChild(child.tempId, "bindingProcess", value === "__none__" ? "" : value)}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue placeholder="绑定工序" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">未绑定</SelectItem>
                            {processOptions.map((processName) => (
                              <SelectItem key={processName} value={processName}>
                                {processName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="h-8 w-24 text-xs text-right"
                          placeholder="用量"
                          value={child.quantity}
                          onChange={(e) => updateChild(child.tempId, "quantity", e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground shrink-0">{child.unit}</span>
                        {canViewCost && (
                          <>
                            <Input
                              className="h-8 w-28 text-xs text-right"
                              placeholder="单价"
                              value={child.unitPrice}
                              onChange={(e) => updateChild(child.tempId, "unitPrice", e.target.value)}
                            />
                            <span className="text-xs font-medium text-red-600 shrink-0 w-20 text-right">¥{formatDisplayNumber(subtotal)}</span>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => removeChild(child.tempId)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave}>确定保存</Button>
        </DialogFooter>
      </DraggableDialogContent>
    </DraggableDialog>
  );
}

// ==================== 新建 BOM 弹窗 ====================

function CreateBOMDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  mode = "create",
  existingProductIds = [],
  existingBomCodes = [],
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
  initialData?: any; // { record: BOM列表行, items: BOM明细数组 }
  mode?: "create" | "edit" | "copy";
  existingProductIds?: number[]; // 已有BOM的产品ID列表，用于重复校验
  existingBomCodes?: string[];
}) {
  const { user } = useAuth();
  const canViewCost = canUserViewBomCost(user);
  const { data: rawProducts = [] } = trpc.products.list.useQuery({});
  const allProducts = rawProducts as any[];
  const batchCreate = trpc.bom.batchCreate.useMutation({
    onSuccess: () => {
      toast.success("BOM 创建成功");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("创建失败: " + err.message);
    },
  });
  const replaceByProductId = trpc.bom.replaceByProductId.useMutation({
    onSuccess: () => {
      toast.success("BOM 保存成功");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("保存失败: " + err.message);
    },
  });

  // 只有“成品 + 获取权限=生产”的产品，才能作为 BOM 主产品
  const finishedProducts = allProducts.filter((p: any) =>
    p.productCategory === "finished" && (p.procurePermission || "purchasable") === "production_only",
  );
  // 所有可作为物料的产品（排除成品和设备）
  const semiFinishedProducts = allProducts.filter((p: any) =>
    PRODUCT_CATEGORY_BOM_LEVEL2_VALUES.includes((p.productCategory || "other") as ProductCategory),
  );

  // 状态
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productPickerFilterField, setProductPickerFilterField] = useState<"name" | "code" | "specification" | "description" | "all">("name");
  const [productPickerSearch, setProductPickerSearch] = useState("");
  const [version, setVersion] = useState("V1.0");
  const [bomCode, setBomCode] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [baseProductQty, setBaseProductQty] = useState("1");
  const [baseProductUnit, setBaseProductUnit] = useState("");

  // 自动生成 BOM 编号
  const generateBomCode = () => {
    return generateSequentialBomCode(currentBomShortCode, existingBomCodes);
  };
  const [level2Items, setLevel2Items] = useState<BomLevel2Item[]>([]);
  const [level3DialogOpen, setLevel3DialogOpen] = useState(false);
  const [editingLevel2, setEditingLevel2] = useState<BomLevel2Item | null>(null);
  const [semiSearch, setSemiSearch] = useState("");
  // 多选弹窗状态
  const [semiPickerOpen, setSemiPickerOpen] = useState(false);
  const [semiPickerSearch, setSemiPickerSearch] = useState("");
  const [semiPickerSelected, setSemiPickerSelected] = useState<Set<string>>(new Set());
  const [processOptions, setProcessOptions] = useState<string[]>([]);
  const [tubeCalc, setTubeCalc] = useState({
    specText: "",
    innerDiameter: "",
    outerDiameter: "",
    length: "",
    density: "1.25",
  });

  // 选中的产品信息
  const selectedProduct = allProducts.find((p: any) => String(p.id) === selectedProductId);
  const productMapByCode = useMemo(
    () => new Map(allProducts.map((product: any) => [String(product.code || ""), product])),
    [allProducts],
  );
  const currentBomShortCode = useMemo(
    () => inferBomShortCode(selectedProduct || initialData?.record),
    [selectedProduct, initialData],
  );
  const recentPriceProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          level2Items.flatMap((item) => {
            const ownId = item.productId || productMapByCode.get(String(item.materialCode || ""))?.id;
            const childIds = item.children
              .map((child) => child.productId || productMapByCode.get(String(child.materialCode || ""))?.id)
              .filter((id): id is number => Number.isFinite(Number(id)) && Number(id) > 0);
            return [
              ...(ownId && Number(ownId) > 0 ? [Number(ownId)] : []),
              ...childIds,
            ];
          }),
        ),
      ),
    [level2Items, productMapByCode],
  );
  const { data: recentPurchasePrices = [] } = trpc.purchaseOrders.getRecentPrices.useQuery(
    { productIds: recentPriceProductIds, days: 30 },
    { enabled: open && recentPriceProductIds.length > 0 },
  );
  const recentPurchasePriceMap = useMemo(
    () => new Map(recentPurchasePrices.map((row: any) => [Number(row.productId), String(row.unitPrice || "0")])),
    [recentPurchasePrices],
  );

  // 重置表单 / 带入初始数据
  useMemo(() => {
    if (open) {
      if (initialData && (mode === "edit" || mode === "copy")) {
        const { record, items } = initialData;
        setSelectedProductId(String(record.productId));
        setVersion(mode === "copy" ? "V1.0" : (record.version || "V1.0"));
        const nextShortCode = inferBomShortCode(record);
        setBomCode(mode === "copy" ? generateSequentialBomCode(nextShortCode, existingBomCodes) : (record.bomCode || generateSequentialBomCode(nextShortCode, existingBomCodes)));
        setEffectiveDate(record.effectiveDate ? record.effectiveDate.split("T")[0] : "");
        setBaseProductQty(String(record.baseProductQty || items?.[0]?.baseProductQty || "1"));
        setBaseProductUnit(record.baseProductUnit || items?.[0]?.baseProductUnit || record.productUnit || "");
        // 构建 level2Items：二级物料（level=2）带上其子级（level=3）
        const level2Raw = (items || []).filter((i: any) => !i.parentId || i.level === 2);
        const level3Raw = (items || []).filter((i: any) => i.parentId && i.level === 3);
        const built: BomLevel2Item[] = level2Raw.map((item: any) => {
          const matchedProduct = item.productId
            ? allProducts.find((product: any) => Number(product.id) === Number(item.productId))
            : productMapByCode.get(String(item.materialCode || ""));
          const meta = parseBomRemarkMeta(item.remark);
          return {
            tempId: genTempId(),
            bomId: item.id,
            materialCode: item.materialCode,
            materialName: item.materialName,
            specification: item.specification || "",
            quantity: String(item.quantity),
            unit: item.unit || "",
            unitPrice: String(item.unitPrice || "0"),
            remark: meta.remark,
            productCategory: (matchedProduct?.productCategory || null) as ProductCategory | null,
            bindingProcess: meta.bindingProcess,
            productId: item.productId,
            children: level3Raw
              .filter((c: any) => c.parentId === item.id)
              .map((c: any) => {
                const childMeta = parseBomRemarkMeta(c.remark);
                return {
                  tempId: genTempId(),
                  bomId: c.id,
                  materialCode: c.materialCode,
                  materialName: c.materialName,
                  specification: c.specification || "",
                  quantity: String(c.quantity),
                  unit: c.unit || "",
                  unitPrice: String(c.unitPrice || "0"),
                  remark: childMeta.remark,
                  bindingProcess: childMeta.bindingProcess,
                };
              }),
          };
        });
        setLevel2Items(built);
        setEditingLevel2(null);
        setSemiSearch("");
      } else {
        setSelectedProductId("");
        setVersion("V1.0");
        setBomCode("");
        setEffectiveDate("");
        setBaseProductQty("1");
        setBaseProductUnit("");
        setLevel2Items([]);
        setEditingLevel2(null);
        setSemiSearch("");
      }
      setTubeCalc({
        specText: "",
        innerDiameter: "",
        outerDiameter: "",
        length: "",
        density: "1.25",
      });
    }
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PROCESS_STORAGE_KEY);
      if (!raw) {
        setProcessOptions([]);
        return;
      }
      const parsed = JSON.parse(raw);
      const names = Array.isArray(parsed)
        ? Array.from(new Set(parsed.map((item: any) => String(item?.processName || "").trim()).filter(Boolean)))
        : [];
      setProcessOptions(names);
    } catch {
      setProcessOptions([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !selectedProduct) return;
    if (mode === "edit" && initialData) return;
    setBaseProductUnit(selectedProduct.unit || "");
  }, [open, selectedProductId, selectedProduct, mode, initialData]);

  useEffect(() => {
    if (!open || !selectedProduct) return;
    if (mode === "edit" && initialData) return;

    setBomCode(generateSequentialBomCode(currentBomShortCode, existingBomCodes));
  }, [open, selectedProductId, selectedProduct, mode, initialData, existingBomCodes, currentBomShortCode]);

  useEffect(() => {
    if (!open || !selectedProduct) return;
    const nextSpec = String(selectedProduct.specification || "").trim();
    if (!nextSpec) {
      setTubeCalc((prev) => ({
        ...prev,
        specText: "",
        innerDiameter: "",
        outerDiameter: "",
        length: "",
      }));
      return;
    }
    parseTubeSpec(nextSpec);
  }, [open, selectedProductId, selectedProduct?.specification]);

  useEffect(() => {
    if (!open || recentPurchasePriceMap.size === 0) return;
    setLevel2Items((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const itemProductId = item.productId || productMapByCode.get(String(item.materialCode || ""))?.id;
        const latestItemPrice = itemProductId ? recentPurchasePriceMap.get(Number(itemProductId)) : undefined;
        const nextChildren = item.children.map((child) => {
          const childProductId = child.productId || productMapByCode.get(String(child.materialCode || ""))?.id;
          const latestChildPrice = childProductId ? recentPurchasePriceMap.get(Number(childProductId)) : undefined;
          if (!latestChildPrice || String(child.unitPrice || "") === String(latestChildPrice)) {
            return child;
          }
          changed = true;
          return { ...child, unitPrice: latestChildPrice, productId: childProductId || child.productId };
        });

        if (!latestItemPrice || String(item.unitPrice || "") === String(latestItemPrice)) {
          if (nextChildren !== item.children) {
            return { ...item, children: nextChildren };
          }
          return item;
        }

        changed = true;
        return {
          ...item,
          unitPrice: latestItemPrice,
          productId: itemProductId || item.productId,
          children: nextChildren,
        };
      });
      return changed ? next : prev;
    });
  }, [open, recentPurchasePriceMap, productMapByCode]);

  // 添加二级物料
  const addLevel2 = (product: any) => {
    if (level2Items.some((item) => item.materialCode === product.code)) {
      toast.error("该物料已添加");
      return;
    }
    setLevel2Items([
      ...level2Items,
      {
        tempId: genTempId(),
        materialCode: product.code,
        materialName: product.name,
        specification: product.specification || "",
        quantity: "1",
        unit: product.unit || "",
        unitPrice: "0",
        remark: "",
        productCategory: (product.productCategory || null) as ProductCategory | null,
        bindingProcess: "",
        productId: product.id,
        children: [],
      },
    ]);
  };

  // 批量添加二级物料（多选弹窗确认）
  const confirmSemiPicker = () => {
    const toAdd = semiFinishedProducts.filter((p: any) =>
      semiPickerSelected.has(p.code) && !level2Items.some((item) => item.materialCode === p.code)
    );
    if (toAdd.length > 0) {
      setLevel2Items([
        ...level2Items,
        ...toAdd.map((product: any) => ({
          tempId: genTempId(),
          materialCode: product.code,
          materialName: product.name,
          specification: product.specification || "",
          quantity: "1",
          unit: product.unit || "",
          unitPrice: "0",
          remark: "",
          productCategory: (product.productCategory || null) as ProductCategory | null,
          bindingProcess: "",
          productId: product.id,
          children: [],
        })),
      ]);
    }
    setSemiPickerOpen(false);
    setSemiPickerSelected(new Set());
    setSemiPickerSearch("");
  };

  // 更新二级物料字段
  const updateLevel2 = (tempId: string, field: keyof BomLevel2Item, value: any) => {
    setLevel2Items(level2Items.map((item) => (item.tempId === tempId ? { ...item, [field]: value } : item)));
  };

  // 删除二级物料
  const removeLevel2 = (tempId: string) => {
    setLevel2Items(level2Items.filter((item) => item.tempId !== tempId));
  };

  // 打开三级物料配置弹窗
  const openLevel3Dialog = (item: BomLevel2Item) => {
    setEditingLevel2(item);
    setLevel3DialogOpen(true);
  };

  // 保存三级物料
  const handleLevel3Save = (level2TempId: string, children: BomLevel3Item[]) => {
    setLevel2Items(level2Items.map((item) =>
      item.tempId === level2TempId ? { ...item, children } : item
    ));
  };

  // 过滤半成品
  const filteredSemiProducts = semiFinishedProducts.filter((p: any) => {
    const search = semiSearch.toLowerCase();
    return (
      p.code?.toLowerCase().includes(search) ||
      p.name?.toLowerCase().includes(search) ||
      p.specification?.toLowerCase().includes(search)
    );
  });

  // 弹窗多选过滤
  const filteredSemiPickerProducts = semiFinishedProducts.filter((p: any) => {
    const search = semiPickerSearch.toLowerCase();
    return (
      p.code?.toLowerCase().includes(search) ||
      p.name?.toLowerCase().includes(search) ||
      p.specification?.toLowerCase().includes(search)
    );
  });

  // 计算成本
  const costSummary = useMemo(() => {
    let level2Cost = 0;
    let level3Cost = 0;
    level2Items.forEach((item) => {
      level2Cost += calcSubtotal(item.quantity, item.unitPrice);
      item.children.forEach((child) => {
        level3Cost += calcSubtotal(child.quantity, child.unitPrice);
      });
    });
    return { level2Cost, level3Cost, totalCost: level2Cost + level3Cost };
  }, [level2Items]);

  const tubeCalcResult = useMemo(() => {
    const innerDiameter = parseFloat(tubeCalc.innerDiameter) || 0;
    const outerDiameter = parseFloat(tubeCalc.outerDiameter) || 0;
    const length = parseFloat(tubeCalc.length) || 0;
    const density = parseFloat(tubeCalc.density) || 0;

    if (!innerDiameter || !outerDiameter || !length || !density || outerDiameter <= innerDiameter) {
      return {
        pieceWeight: 0,
        pieceCountFrom1000g: 0,
        valid: false,
      };
    }

    const volumeMm3 = (Math.PI / 4) * (outerDiameter ** 2 - innerDiameter ** 2) * length;
    const pieceWeight = (volumeMm3 * density) / 1000;
    const pieceCountFrom1000g = pieceWeight > 0 ? 1000 / pieceWeight : 0;

    return {
      pieceWeight,
      pieceCountFrom1000g,
      valid: true,
    };
  }, [tubeCalc]);

  const parseTubeSpec = (value: string) => {
    const normalized = value
      .replace(/[×xX＊]/g, "*")
      .replace(/\s+/g, "")
      .replace(/mm/gi, "");
    const parts = normalized
      .split("*")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      setTubeCalc((prev) => ({
        ...prev,
        specText: value,
        innerDiameter: parts[0] || "",
        outerDiameter: parts[1] || "",
        length: parts[2] || "",
      }));
      return true;
    }
    setTubeCalc((prev) => ({ ...prev, specText: value }));
    return false;
  };

  // 提交
  const handleSubmit = () => {
    if (!selectedProductId) {
      toast.error("请选择产品");
      return;
    }
    if (!version.trim()) {
      toast.error("请填写BOM版本");
      return;
    }
    if (!(Number(baseProductQty) > 0)) {
      toast.error("请填写基准成品数量");
      return;
    }
    if (!baseProductUnit.trim()) {
      toast.error("请填写成品单位");
      return;
    }
    if (level2Items.length === 0) {
      toast.error("请至少添加一项物料");
      return;
    }
    // 重复产品校验（新建模式下才校验）
    if (mode === "create" && existingProductIds.includes(Number(selectedProductId))) {
      toast.error("该产品已存在 BOM，请使用编辑功能修改，或复制后更改产品");
      return;
    }

    const payload = {
      productId: Number(selectedProductId),
      version: version.trim(),
      bomCode: bomCode.trim() || generateSequentialBomCode(currentBomShortCode, existingBomCodes),
      effectiveDate: effectiveDate || undefined,
      baseProductQty: baseProductQty.trim(),
      baseProductUnit: baseProductUnit.trim(),
      items: level2Items.map((item) => ({
        level: 2,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification || undefined,
        quantity: item.quantity,
        unit: item.unit || undefined,
        unitPrice: item.unitPrice || undefined,
        remark: buildBomRemarkMeta(item.remark, item.bindingProcess),
        children: item.children.map((child) => ({
          level: 3,
          materialCode: child.materialCode,
          materialName: child.materialName,
          specification: child.specification || undefined,
          quantity: child.quantity,
          unit: child.unit || undefined,
          unitPrice: child.unitPrice || undefined,
          remark: buildBomRemarkMeta(child.remark, child.bindingProcess),
        })),
      })),
    };
    if (mode === "edit") {
      replaceByProductId.mutate(payload);
    } else {
      batchCreate.mutate(payload);
    }
  };

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent className="w-full max-w-none max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "edit" ? <Edit className="h-5 w-5" /> : mode === "copy" ? <Copy className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {mode === "edit" ? "编辑 BOM 物料清单" : mode === "copy" ? "复制 BOM 物料清单" : "新建 BOM 物料清单"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* ===== Step 1: 选择产品 ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                第一步：选择产品
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 选择成品产品 */}
                <div>
                  <Label>产品名称 *</Label>
                  <Button
                    variant="outline"
                    className="mt-1 w-full justify-start font-normal truncate"
                    onClick={() => setProductPickerOpen(true)}
                  >
                    {selectedProductId ? (() => {
                      const p = allProducts.find((p: any) => String(p.id) === selectedProductId);
                      return p ? (
                        <span className="flex items-center gap-1 truncate">
                          <Check className="h-3 w-3 text-green-600 shrink-0" />
                          <span className="font-mono text-xs shrink-0">{p.code}</span>
                          <span className="truncate">{p.name}</span>
                        </span>
                      ) : "请选择产品...";
                    })() : <span className="text-muted-foreground">点击选择产品...</span>}
                  </Button>
                  {/* 使用公共弹窗选择器 */}
                  <EntityPickerDialog
                    open={productPickerOpen}
                    onOpenChange={setProductPickerOpen}
                    title="选择产品"
                    emptyText="暂无符合条件的产品，仅支持“成品 + 获取权限为生产”的产品"
                    searchPlaceholder={
                      productPickerFilterField === "name"
                        ? "按产品名称搜索..."
                        : productPickerFilterField === "code"
                          ? "按产品编码搜索..."
                          : productPickerFilterField === "specification"
                            ? "按规格型号搜索..."
                            : productPickerFilterField === "description"
                              ? "按产品描述搜索..."
                              : "搜索产品编码、名称、规格型号、描述..."
                    }
                    toolbarContent={
                      <div className="w-[148px]">
                        <Select
                          value={productPickerFilterField}
                          onValueChange={(value: "name" | "code" | "specification" | "description" | "all") =>
                            setProductPickerFilterField(value)
                          }
                        >
                          <SelectTrigger className="h-11 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name">产品名称</SelectItem>
                            <SelectItem value="code">产品编码</SelectItem>
                            <SelectItem value="specification">规格型号</SelectItem>
                            <SelectItem value="description">产品描述</SelectItem>
                            <SelectItem value="all">全部字段</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    }
                    columns={[
                      { key: "code", title: "产品编码", render: (p) => <span className="font-mono font-medium">{p.code}</span> },
                      { key: "name", title: "产品名称", render: (p) => <span className="font-medium">{p.name}</span> },
                      { key: "specification", title: "规格型号", render: (p) => <span className="text-muted-foreground">{p.specification || "-"}</span> },
                      { key: "description", title: "产品描述", render: (p) => <span className="block max-w-[260px] truncate text-muted-foreground">{p.description || "-"}</span> },
                      { key: "unit", title: "产品单位" },
                      { key: "productCategory", title: "产品分类", render: (p) => <Badge variant="outline" className="text-xs">{productCategoryLabels[p.productCategory] || p.productCategory || "成品"}</Badge> },
                    ]}
                    rows={finishedProducts}
                    selectedId={selectedProductId}
                    filterFn={(p, q) => {
                      const lower = q.toLowerCase();
                      const byField = {
                        name: () => p.name?.toLowerCase().includes(lower),
                        code: () => p.code?.toLowerCase().includes(lower),
                        specification: () => p.specification?.toLowerCase().includes(lower),
                        description: () => p.description?.toLowerCase().includes(lower),
                        all: () =>
                          p.code?.toLowerCase().includes(lower)
                          || p.name?.toLowerCase().includes(lower)
                          || p.specification?.toLowerCase().includes(lower)
                          || p.description?.toLowerCase().includes(lower),
                      };
                      return Boolean(byField[productPickerFilterField]());
                    }}
                    onSelect={(p) => {
                      setSelectedProductId(String(p.id));
                      setProductPickerOpen(false);
                    }}
                  />
                </div>
                {/* BOM 版本 */}
                <div>
                  <Label>BOM 版本 *</Label>
                  <Input className="mt-1" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="如 V1.0" />
                </div>
                {/* BOM 编号 */}
                <div>
                  <Label>BOM 编号</Label>
                  <div className="flex gap-1 mt-1">
                    <Input value={bomCode} onChange={(e) => setBomCode(e.target.value)} placeholder="自动生成" className="font-mono" />
                    <Button type="button" variant="outline" size="icon" title="重新生成" onClick={() => setBomCode(generateBomCode())}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                    </Button>
                  </div>
                </div>
                {/* 生效日期 */}
                <div>
                  <Label>生效日期</Label>
                  <DateTextInput className="mt-1" value={effectiveDate} onChange={setEffectiveDate} />
                </div>
              </div>

              {selectedProduct && (
                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1.1fr_2.2fr_0.8fr_0.8fr]">
                    <div className="min-w-0">
                      <span className="text-muted-foreground">产品编码</span>
                      <p className="font-medium font-mono">{selectedProduct.code}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">产品名称</span>
                      <p className="font-medium">{selectedProduct.name}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">规格型号</span>
                      <p className="font-medium">{selectedProduct.specification || "-"}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">产品描述</span>
                      <p className="font-medium break-words">{selectedProduct.description || "-"}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">产品单位</span>
                      <p className="font-medium">{selectedProduct.unit || "-"}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground">产品分类</span>
                      <p className="font-medium">{productCategoryLabels[selectedProduct.productCategory] || selectedProduct.productCategory || "-"}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-semibold">BOM 基准产出</span>
                    <span className="text-xs text-muted-foreground">用于表达“多少成品，对应用多少物料”</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>基准成品数量 *</Label>
                      <Input
                        className="mt-1"
                        type="number"
                        min="0"
                        step="0.0001"
                        value={baseProductQty}
                        onChange={(e) => setBaseProductQty(e.target.value)}
                        placeholder="如：100"
                      />
                    </div>
                    <div>
                      <Label>成品单位 *</Label>
                      <Input
                        className="mt-1"
                        value={baseProductUnit}
                        onChange={(e) => setBaseProductUnit(e.target.value)}
                        placeholder="按BOM产出口径填写，如：个/支/套"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    例如：`100 个胃管 = 1 千克硅橡胶`，这里填写的就是左边这部分“100 个”。
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold">换算工具</span>
                    <span className="text-xs text-muted-foreground">默认单位 mm，默认密度 1.25</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div>
                      <Label>换算输入</Label>
                      <Input
                        className="mt-1"
                        value={tubeCalc.specText}
                        onChange={(e) => parseTubeSpec(e.target.value)}
                        placeholder="例如 6*12*1000"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        可直接在下面手动输入内径、外径、长度。
                      </p>
                    </div>
                    <div className="rounded-md border bg-background px-4 py-3">
                      <div className="text-xs text-muted-foreground">1000g 可产出</div>
                      <div className="mt-1 text-2xl font-semibold text-emerald-700">
                        {tubeCalcResult.valid ? `${formatDisplayNumber(tubeCalcResult.pieceCountFrom1000g)} 个` : "-"}
                      </div>
                    </div>
                    <div>
                      <Label>内径</Label>
                      <Input
                        className="mt-1"
                        value={tubeCalc.innerDiameter}
                        onChange={(e) =>
                          setTubeCalc((prev) => ({ ...prev, innerDiameter: e.target.value }))
                        }
                        placeholder="例如 8.0"
                      />
                    </div>
                    <div>
                      <Label>外径</Label>
                      <Input
                        className="mt-1"
                        value={tubeCalc.outerDiameter}
                        onChange={(e) => setTubeCalc((prev) => ({ ...prev, outerDiameter: e.target.value }))}
                        placeholder="例如 12.4"
                      />
                    </div>
                    <div>
                      <Label>长度</Label>
                      <Input
                        className="mt-1"
                        value={tubeCalc.length}
                        onChange={(e) => setTubeCalc((prev) => ({ ...prev, length: e.target.value }))}
                        placeholder="例如 745"
                      />
                    </div>
                    <div>
                      <Label>密度</Label>
                      <Input
                        className="mt-1"
                        value={tubeCalc.density}
                        onChange={(e) => setTubeCalc((prev) => ({ ...prev, density: e.target.value }))}
                      />
                    </div>
                  </div>
                  {!tubeCalcResult.valid && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      可直接输入 `6*12*1000`，也可以手动输入参数；外径必须大于内径。
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ===== Step 2: 添加二级物料 ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Component className="h-4 w-4 text-orange-600" />
                  第二步：选择二级物料（半成品/组件）
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setSemiPickerOpen(true); setSemiPickerSearch(""); }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  选择物料
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 已选二级物料列表 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>已选二级物料（{level2Items.length} 项）</span>
                </div>
                {level2Items.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg">
                    点击右上角「选择物料」按钮添加半成品/组件
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto" style={{WebkitOverflowScrolling:"touch"}}>
                    <Table className="min-w-[1320px] table-fixed">
                      <TableHeader>
                        <TableRow className="bg-muted/60 bg-muted/30">
                          <TableHead className="w-36 text-center font-bold">物料编码</TableHead>
                          <TableHead className="w-44 text-center font-bold">物料名称</TableHead>
                          <TableHead className="w-28 text-center font-bold">产品分类</TableHead>
                          <TableHead className="w-44 text-center font-bold">规格</TableHead>
                          <TableHead className="w-24 text-center font-bold">用量</TableHead>
                          <TableHead className="w-44 text-center font-bold">绑定工序</TableHead>
                          <TableHead className="w-20 text-center font-bold">单位</TableHead>
                          {canViewCost && (
                            <TableHead className="w-28 text-center font-bold">单价(近30天)</TableHead>
                          )}
                          {canViewCost && (
                            <TableHead className="w-24 text-center font-bold">小计</TableHead>
                          )}
                          <TableHead className="w-20 text-center font-bold">三级</TableHead>
                          <TableHead className="w-16 text-center font-bold">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {level2Items.map((item) => {
                          const subtotal = calcSubtotal(item.quantity, item.unitPrice);
                          const childCount = item.children.length;
                          const childCost = item.children.reduce((s, c) => s + calcSubtotal(c.quantity, c.unitPrice), 0);
                          return (
                            <TableRow key={item.tempId} className="hover:bg-muted/20">
                              <TableCell className="text-center text-xs font-mono whitespace-nowrap">{item.materialCode}</TableCell>
                              <TableCell className="text-center text-xs font-medium whitespace-nowrap">{item.materialName}</TableCell>
                              <TableCell className="text-center text-xs">
                                <Badge variant="outline" className="text-[10px]">
                                  {productCategoryLabels[(item.productCategory || "other") as ProductCategory] || "-"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground whitespace-nowrap">{item.specification || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Input
                                  className="h-8 w-20 min-w-[80px] mx-auto text-xs text-right"
                                  value={item.quantity}
                                  onChange={(e) => updateLevel2(item.tempId, "quantity", e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Select
                                  value={item.bindingProcess || "__none__"}
                                  onValueChange={(value) => updateLevel2(item.tempId, "bindingProcess", value === "__none__" ? "" : value)}
                                >
                                  <SelectTrigger className="h-8 w-32 min-w-[128px] mx-auto text-xs">
                                    <SelectValue placeholder="选择工序" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">未绑定</SelectItem>
                                    {processOptions.map((processName) => (
                                      <SelectItem key={processName} value={processName}>
                                        {processName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-center text-xs whitespace-nowrap">{item.unit}</TableCell>
                              {canViewCost && (
                                <TableCell className="text-center">
                                  <Input
                                    className="h-8 w-24 min-w-[96px] mx-auto text-xs text-right"
                                    value={item.unitPrice}
                                    onChange={(e) => updateLevel2(item.tempId, "unitPrice", e.target.value)}
                                  />
                                </TableCell>
                              )}
                              {canViewCost && (
                                <TableCell className="text-xs text-center font-medium text-red-600 whitespace-nowrap">¥{formatDisplayNumber(subtotal)}</TableCell>
                              )}
                              <TableCell className="text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => openLevel3Dialog(item)}
                                >
                                  {childCount > 0 ? (
                                    <span className="text-green-600">{childCount} 项</span>
                                  ) : (
                                    <span>配置</span>
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => removeLevel2(item.tempId)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ===== 成本汇总 ===== */}
          {canViewCost && level2Items.length > 0 && (
            <Card className="border-red-200 bg-red-50/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-5 w-5 text-red-600" />
                  <span className="font-bold text-base">材料成本核算</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">二级物料成本</span>
                    <p className="text-lg font-bold text-orange-600">¥{formatDisplayNumber(costSummary.level2Cost)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">三级原材料成本</span>
                    <p className="text-lg font-bold text-green-600">¥{formatDisplayNumber(costSummary.level3Cost)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">产品总材料成本</span>
                    <p className="text-2xl font-bold text-red-600">¥{formatDisplayNumber(costSummary.totalCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={batchCreate.isPending || replaceByProductId.isPending}>
            {(batchCreate.isPending || replaceByProductId.isPending) ? "提交中..." : mode === "edit" ? "保存修改" : mode === "copy" ? "确认复制" : "确认创建 BOM"}
          </Button>
        </DialogFooter>

        {/* 二级物料多选弹窗 */}
        <DraggableDialog open={semiPickerOpen} onOpenChange={(v) => { setSemiPickerOpen(v); if (!v) { setSemiPickerSelected(new Set()); setSemiPickerSearch(""); } }}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>选择二级物料（半成品/组件）</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索编码、名称、规格..."
                  value={semiPickerSearch}
                  onChange={(e) => setSemiPickerSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-80 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="w-10 text-center">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          checked={filteredSemiPickerProducts.length > 0 && filteredSemiPickerProducts.every((p: any) => semiPickerSelected.has(p.code))}
                          onChange={(e) => {
                            const next = new Set(semiPickerSelected);
                            filteredSemiPickerProducts.forEach((p: any) => {
                              if (e.target.checked) next.add(p.code); else next.delete(p.code);
                            });
                            setSemiPickerSelected(next);
                          }}
                        />
                      </TableHead>
                      <TableHead className="font-bold">编码</TableHead>
                      <TableHead className="font-bold">名称</TableHead>
                      <TableHead className="font-bold">规格</TableHead>
                      <TableHead className="font-bold">单位</TableHead>
                      <TableHead className="font-bold">分类</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSemiPickerProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">暂无半成品/组件</TableCell>
                      </TableRow>
                    ) : (
                      filteredSemiPickerProducts.map((p: any) => {
                        const alreadyAdded = level2Items.some((item) => item.materialCode === p.code);
                        const isChecked = semiPickerSelected.has(p.code);
                        return (
                          <TableRow
                            key={p.id}
                            className={cn(
                              "cursor-pointer hover:bg-muted/30",
                              isChecked && "bg-blue-50",
                              alreadyAdded && "opacity-40"
                            )}
                            onClick={() => {
                              if (alreadyAdded) return;
                              const next = new Set(semiPickerSelected);
                              if (isChecked) next.delete(p.code); else next.add(p.code);
                              setSemiPickerSelected(next);
                            }}
                          >
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5"
                                checked={isChecked}
                                disabled={alreadyAdded}
                                onChange={() => {}}
                              />
                            </TableCell>
                            <TableCell className="text-xs font-mono">{p.code}</TableCell>
                            <TableCell className="text-xs font-medium">{p.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{p.specification || "-"}</TableCell>
                            <TableCell className="text-xs">{p.unit || "-"}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-[10px]">{productCategoryLabels[p.productCategory] || "-"}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-muted-foreground">已勾选 {semiPickerSelected.size} 项</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setSemiPickerOpen(false); setSemiPickerSelected(new Set()); setSemiPickerSearch(""); }}>取消</Button>
                  <Button size="sm" disabled={semiPickerSelected.size === 0} onClick={confirmSemiPicker}>确认添加（{semiPickerSelected.size}）</Button>
                </div>
              </div>
            </div>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 三级物料配置弹窗 */}
        <Level3MaterialDialog
          open={level3DialogOpen}
          onOpenChange={setLevel3DialogOpen}
          level2Item={editingLevel2}
          onSave={handleLevel3Save}
          processOptions={processOptions}
        />
      </DraggableDialogContent>
    </DraggableDialog>
  );
}

// ==================== BOM 列表主页面 ====================

export default function BOMPage() {
  const PAGE_SIZE = 10;
  const { data: rawData = [], isLoading, refetch } = trpc.bom.list.useQuery();
  const trpcUtils = trpc.useUtils();
  const deleteByProductId = trpc.bom.deleteByProductId.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("删除成功");
    },
    onError: (err) => {
      toast.error("删除失败: " + err.message);
    },
  });

  const data = rawData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [productAttributeFilter, setProductAttributeFilter] = useState("all");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editMode, setEditMode] = useState<"edit" | "copy">("edit");
  const [editInitialData, setEditInitialData] = useState<any>(null);
  const { canDelete } = usePermission();
  const { user } = useAuth();

  // 已有 BOM 的产品 ID 列表，用于新建时重复校验
  const existingProductIds = useMemo(() => data.map((r: any) => Number(r.productId)), [data]);
  const existingBomCodes = useMemo(
    () => data.map((r: any) => String(r.bomCode || "")).filter(Boolean),
    [data]
  );

  const filteredData = data.filter((record: any) => {
    const matchesSearch =
      String(record.productCode ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.productSpec ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProductAttribute =
      productAttributeFilter === "all" ||
      String(record.productCategory || "").trim() === productAttributeFilter;
    const matchesProductCategory =
      productCategoryFilter === "all" ||
      String(record.productType || "").trim() === productCategoryFilter;
    return matchesSearch && matchesProductAttribute && matchesProductCategory;
  });
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const pagedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const canViewCost = canUserViewBomCost(user);
  const stats = {
    total: data.length,
    totalItems: data.reduce((sum: number, r: any) => sum + (Number(r.itemCount) || 0), 0),
    withLevel3: data.filter((r: any) => Number(r.level3Count || 0) > 0).length,
    level2Only: data.filter((r: any) => Number(r.level3Count || 0) <= 0).length,
    totalCost: data.reduce((sum: number, r: any) => sum + (Number(r.totalCost) || 0), 0),
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, productAttributeFilter, productCategoryFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleView = (record: any) => {
    setSelectedBom(record);
    setDetailOpen(true);
  };

  const handleEditOrCopy = async (record: any, mode: "edit" | "copy") => {
    try {
      // 获取该产品的完整 BOM 明细
      const items = await trpcUtils.bom.list.fetch({ productId: record.productId });
      setEditInitialData({ record, items });
      setEditMode(mode);
      setEditOpen(true);
    } catch (e) {
      toast.error("获取 BOM 明细失败");
    }
  };

  const handleDelete = (record: any) => {
    if (!confirm(`确认删除产品「${record.productName}」的全部 BOM 数据？此操作不可恢复。`)) return;
    deleteByProductId.mutate({ productId: Number(record.productId) });
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6" />
              BOM物料清单
            </h1>
            <p className="text-muted-foreground mt-1">
              管理产品的三级物料清单结构（成品 → 半成品/组件 → 原材料）
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建 BOM
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className={`grid grid-cols-2 gap-4 ${canViewCost ? "xl:grid-cols-5 md:grid-cols-3" : "md:grid-cols-4"}`}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">结构总数</div>
                  <div className="mt-2 text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">BOM总数</div>
                </div>
                <Layers className="h-5 w-5 text-muted-foreground/60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">复杂结构</div>
                  <div className="mt-2 text-2xl font-bold text-blue-600">{stats.withLevel3}</div>
                  <div className="text-sm text-muted-foreground">含三级BOM</div>
                </div>
                <Component className="h-5 w-5 text-blue-500/60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">标准结构</div>
                  <div className="mt-2 text-2xl font-bold text-emerald-600">{stats.level2Only}</div>
                  <div className="text-sm text-muted-foreground">仅二级BOM</div>
                </div>
                <Box className="h-5 w-5 text-emerald-500/60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">物料规模</div>
                  <div className="mt-2 text-2xl font-bold text-violet-600">{stats.totalItems}</div>
                  <div className="text-sm text-muted-foreground">物料总项数</div>
                </div>
                <FileText className="h-5 w-5 text-violet-500/60" />
              </div>
            </CardContent>
          </Card>
          {canViewCost && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">管理员视图</div>
                    <div className="mt-2 text-2xl font-bold text-red-600">¥{formatDisplayNumber(stats.totalCost)}</div>
                    <div className="text-sm text-muted-foreground">材料总成本</div>
                  </div>
                  <Calculator className="h-5 w-5 text-red-500/60" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 搜索 */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索产品编码、产品名称、产品规格..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row xl:flex-none">
            <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="产品分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {Object.entries(PRODUCT_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={productAttributeFilter} onValueChange={setProductAttributeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="产品属性" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部属性</SelectItem>
                {Object.entries(productAttributeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* BOM 列表 */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">产品编码</TableHead>
                  <TableHead className="text-center font-bold">产品名称</TableHead>
                  <TableHead className="text-center font-bold">产品规格</TableHead>
                  <TableHead className="text-center font-bold">BOM编号</TableHead>
                  <TableHead className="text-center font-bold">BOM版本</TableHead>
                  <TableHead className="text-center font-bold">基准产出</TableHead>
                  <TableHead className="text-center font-bold">物料数量</TableHead>
                  {canViewCost && (
                    <TableHead className="text-center font-bold">材料成本</TableHead>
                  )}
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">更新时间</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={canViewCost ? 11 : 10} className="text-center py-8 text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canViewCost ? 11 : 10} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedData.map((record: any) => {
                    const allActive = record.statuses === "active";
                    const cost = Number(record.totalCost) || 0;
                    return (
                      <TableRow key={`${record.productId}-${record.version}`} className="hover:bg-muted/30">
                        <TableCell className="text-center font-mono text-sm">{record.productCode || "-"}</TableCell>
                        <TableCell className="text-center font-medium">{record.productName || "未知产品"}</TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">{record.productSpec || "-"}</TableCell>
                        <TableCell className="text-center font-mono text-sm">{record.bomCode || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{record.version || "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">
                          {(record.baseProductQty || "1")} {record.baseProductUnit || record.productUnit || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{record.itemCount} 项</Badge>
                        </TableCell>
                        {canViewCost && (
                          <TableCell className="text-center font-medium text-red-600">
                            {cost > 0 ? `¥${formatDisplayNumber(cost)}` : "-"}
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <Badge variant={allActive ? "default" : "outline"} className={allActive ? "text-green-600" : ""}>
                            {allActive ? "生效" : "部分生效"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">{formatDateValue(record.updatedAt)}</TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(record)}>
                                <Eye className="h-4 w-4 mr-2" />查看
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditOrCopy(record, "edit")}>
                                <Edit className="h-4 w-4 mr-2" />编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditOrCopy(record, "copy")}>
                                <Copy className="h-4 w-4 mr-2" />复制
                              </DropdownMenuItem>
                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => handleDelete(record)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />删除
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePaginationFooter
              total={filteredData.length}
              page={currentPage}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        </Card>

        {/* BOM 详情弹窗 */}
        <BOMDetailDialog open={detailOpen} onOpenChange={setDetailOpen} bomRecord={selectedBom} />

        {/* 新建 BOM 弹窗 */}
        <CreateBOMDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={refetch}
          existingProductIds={existingProductIds}
          existingBomCodes={existingBomCodes}
        />

        {/* 编辑/复制 BOM 弹窗 */}
        <CreateBOMDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={refetch}
          initialData={editInitialData}
          mode={editMode}
          existingProductIds={existingProductIds}
          existingBomCodes={existingBomCodes}
        />
      </div>
    </ERPLayout>
  );
}
