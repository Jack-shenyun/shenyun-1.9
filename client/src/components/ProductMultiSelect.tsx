import { useState, useMemo, type ReactNode } from "react";
import { Plus, Minus, Search, Package, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { formatDisplayNumber } from "@/lib/formatters";

export interface Product {
  id: number;
  code: string;
  name: string;
  spec: string;
  unit: string;
  price: number;
  category?: string;
  stock?: number;
}

export interface SelectedProduct extends Product {
  quantity: number;
  discount?: number;
  amount?: number;
  currency?: string;  // 结算货币
}

interface ProductMultiSelectProps {
  products?: Product[];          // 若不传则从数据库加载
  useDbProducts?: boolean;       // 是否从数据库加载（默认 true）
  salePermission?: "saleable" | "not_saleable"; // 按销售权限过滤
  procurePermission?: "purchasable" | "production_only"; // 按获取权限过滤
  selectedProducts: SelectedProduct[];
  onSelectionChange: (products: SelectedProduct[]) => void;
  title?: string;
  showPrice?: boolean;
  editablePrice?: boolean;       // 单价是否可编辑（默认 false）
  showStock?: boolean;
  maxSelection?: number;
  currencySymbol?: string;       // 金额符号
  extraAmount?: number;          // 额外金额（如运费）
  extraAmountLabel?: string;     // 额外金额标签
  renderSelectedMeta?: (product: SelectedProduct) => ReactNode;
}

// 示例产品数据（保留向后兼容）
export const sampleProducts: Product[] = [
  { id: 1, code: "MD-001", name: "一次性使用无菌注射器", spec: "5ml", unit: "支", price: 0.85, category: "注射器", stock: 50000 },
  { id: 2, code: "MD-002", name: "一次性使用无菌注射器", spec: "10ml", unit: "支", price: 1.20, category: "注射器", stock: 35000 },
  { id: 3, code: "MD-003", name: "一次性使用无菌注射器", spec: "20ml", unit: "支", price: 1.80, category: "注射器", stock: 20000 },
  { id: 4, code: "MD-004", name: "医用外科口罩", spec: "17.5×9.5cm", unit: "只", price: 0.35, category: "防护用品", stock: 100000 },
  { id: 5, code: "MD-005", name: "医用防护口罩N95", spec: "标准型", unit: "只", price: 3.50, category: "防护用品", stock: 25000 },
  { id: 6, code: "MD-006", name: "一次性使用输液器", spec: "带针", unit: "套", price: 2.50, category: "输液器", stock: 40000 },
  { id: 7, code: "MD-007", name: "一次性使用输液器", spec: "精密过滤", unit: "套", price: 4.80, category: "输液器", stock: 15000 },
  { id: 8, code: "MD-008", name: "无菌手术手套", spec: "7号", unit: "双", price: 5.20, category: "手术用品", stock: 30000 },
  { id: 9, code: "MD-009", name: "无菌手术手套", spec: "7.5号", unit: "双", price: 5.20, category: "手术用品", stock: 28000 },
  { id: 10, code: "MD-010", name: "医用棉签", spec: "15cm", unit: "包", price: 2.00, category: "敷料", stock: 60000 },
  { id: 11, code: "MD-011", name: "医用纱布块", spec: "10×10cm", unit: "包", price: 8.50, category: "敷料", stock: 45000 },
  { id: 12, code: "MD-012", name: "一次性使用采血针", spec: "21G", unit: "支", price: 0.65, category: "采血器材", stock: 80000 },
];

/** 将数据库 Product 转换为组件内部 Product 格式 */
function dbProductToProduct(p: {
  id: number;
  code: string;
  name: string;
  specification?: string | null;
  unit?: string | null;
  priceByPayment?: unknown;
  category?: string | null;
  status?: string;
}): Product {
  // priceByPayment 是 JSON: {"cash": 100, "monthly": 95, ...}，取 cash 或第一个值
  let price = 0;
  if (p.priceByPayment && typeof p.priceByPayment === "object") {
    const priceObj = p.priceByPayment as Record<string, number>;
    price = priceObj["cash"] ?? priceObj["monthly"] ?? Object.values(priceObj)[0] ?? 0;
  }
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    spec: p.specification || "",
    unit: p.unit || "",
    price,
    category: p.category || undefined,
    stock: undefined,
  };
}

export default function ProductMultiSelect({
  products: propProducts,
  useDbProducts = true,
  salePermission,
  procurePermission,
  selectedProducts,
  onSelectionChange,
  title = "选择产品",
  showPrice = true,
  editablePrice = false,
  showStock = false,
  maxSelection,
  currencySymbol = "¥",
  extraAmount = 0,
  extraAmountLabel = "附加费用",
  renderSelectedMeta,
}: ProductMultiSelectProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tempSelection, setTempSelection] = useState<Map<number, SelectedProduct>>(new Map());

  // 从数据库加载产品（支持按权限过滤）
  // 传入权限参数时禁用缓存，确保每次都从服务器获取最新过滤结果
  const { data: dbProductsRaw = [], isLoading: dbLoading } = trpc.products.list.useQuery(
    { limit: 500, salePermission, procurePermission },
    {
      enabled: useDbProducts && !propProducts,
      staleTime: 0,          // 每次都重新请求
      gcTime: 0,             // 不缓存
    }
  );
  const { data: inventoryRows = [] } = trpc.inventory.list.useQuery(
    { status: "qualified", limit: 5000 },
    {
      enabled: showStock && useDbProducts && !propProducts,
      staleTime: 0,
      gcTime: 0,
    }
  );

  const stockMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of inventoryRows as any[]) {
      const productId = Number(row?.productId);
      if (!Number.isFinite(productId) || productId <= 0) continue;
      const quantity = Number(row?.quantity ?? 0);
      map.set(productId, (map.get(productId) || 0) + (Number.isFinite(quantity) ? quantity : 0));
    }
    return map;
  }, [inventoryRows]);

  // 合并产品列表：优先使用 prop 传入的，其次数据库
  // 注意：当有权限过滤时，即使数据库返回0条也不回退到示例数据
  const allProducts: Product[] = useMemo(() => {
    if (propProducts) return propProducts;
    if (useDbProducts) {
      // 有权限过滤时：加载完成后直接返回数据库结果（即使为空）
      if (!dbLoading) {
        return dbProductsRaw.map((row: any) => {
          const product = dbProductToProduct(row);
          return {
            ...product,
            stock: stockMap.get(Number(product.id)) ?? 0,
          };
        });
      }
      // 加载中返回空数组
      return [];
    }
    return sampleProducts;
  }, [propProducts, useDbProducts, dbProductsRaw, dbLoading, stockMap]);

  const isLoading = useDbProducts && !propProducts && dbLoading;

  // 初始化临时选择
  const openDialog = () => {
    const map = new Map<number, SelectedProduct>();
    selectedProducts.forEach((p) => map.set(p.id, p));
    setTempSelection(map);
    setDialogOpen(true);
  };

  // 过滤产品
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return allProducts;
    const term = searchTerm.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.code.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        (p.spec || "").toLowerCase().includes(term)
    );
  }, [allProducts, searchTerm]);

  // 切换选择
  const toggleProduct = (product: Product) => {
    const newSelection = new Map(tempSelection);
    if (newSelection.has(product.id)) {
      newSelection.delete(product.id);
    } else {
      if (maxSelection && newSelection.size >= maxSelection) return;
      newSelection.set(product.id, { ...product, quantity: 1 });
    }
    setTempSelection(newSelection);
  };

  // 更新数量
  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) return;
    const newSelection = new Map(tempSelection);
    const product = newSelection.get(productId);
    if (product) {
      product.quantity = quantity;
      product.amount = product.quantity * product.price * (1 - (product.discount || 0) / 100);
      newSelection.set(productId, product);
      setTempSelection(newSelection);
    }
  };

  // 更新折扣
  const updateDiscount = (productId: number, discount: number) => {
    const newSelection = new Map(tempSelection);
    const product = newSelection.get(productId);
    if (product) {
      product.discount = Math.min(100, Math.max(0, discount));
      product.amount = product.quantity * product.price * (1 - (product.discount || 0) / 100);
      newSelection.set(productId, product);
      setTempSelection(newSelection);
    }
  };

  // 确认选择
  const confirmSelection = () => {
    const selected = Array.from(tempSelection.values()).map((p) => ({
      ...p,
      amount: p.quantity * p.price * (1 - (p.discount || 0) / 100),
    }));
    onSelectionChange(selected);
    setDialogOpen(false);
  };

  // 移除已选产品
  const removeProduct = (productId: number) => {
    onSelectionChange(selectedProducts.filter((p) => p.id !== productId));
  };

  // 直接更新已选产品数量
  const updateSelectedQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) return;
    onSelectionChange(
      selectedProducts.map((p) =>
        p.id === productId
          ? { ...p, quantity, amount: quantity * p.price * (1 - (p.discount || 0) / 100) }
          : p
      )
    );
  };

  // 计算总金额
  const totalAmount = selectedProducts.reduce(
    (sum, p) => sum + p.quantity * p.price * (1 - (p.discount || 0) / 100),
    0
  );
  const normalizedExtraAmount = Number.isFinite(extraAmount) ? extraAmount : 0;
  const finalTotalAmount = totalAmount + normalizedExtraAmount;

  return (
    <div className="space-y-4">
      {/* 已选产品列表 */}
      {selectedProducts.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">产品编码</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead className="w-[100px]">规格</TableHead>
                <TableHead className="w-[80px]">单位</TableHead>
                {showPrice && <TableHead className="w-[100px] text-right">单价</TableHead>}
                <TableHead className="w-[120px] text-center">数量</TableHead>
                {showPrice && <TableHead className="w-[80px] text-right">折扣%</TableHead>}
                {showPrice && <TableHead className="w-[100px] text-right">金额</TableHead>}
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-sm">{product.code}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{product.name}</div>
                      {renderSelectedMeta ? (
                        <div className="text-xs text-muted-foreground">
                          {renderSelectedMeta(product)}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{product.spec}</TableCell>
                  <TableCell>{product.unit}</TableCell>
                  {showPrice && (
                    <TableCell className="text-right">
                      {editablePrice ? (
                        <Input
                          type="number"
                          value={product.price || ""}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            onSelectionChange(
                              selectedProducts.map((p) =>
                                p.id === product.id
                                  ? {
                                      ...p,
                                      price: newPrice,
                                      amount: p.quantity * newPrice * (1 - (p.discount || 0) / 100),
                                    }
                                  : p
                              )
                            );
                          }}
                          className="w-24 h-7 text-right"
                          min={0}
                          step={0.01}
                          placeholder="输入单价"
                        />
                      ) : (
                        <span>{currencySymbol}{formatDisplayNumber(product.price)}</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateSelectedQuantity(product.id, product.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={product.quantity}
                        onChange={(e) =>
                          updateSelectedQuantity(product.id, parseInt(e.target.value) || 1)
                        }
                        className="w-16 h-7 text-center"
                        min={1}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateSelectedQuantity(product.id, product.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  {showPrice && (
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={product.discount || 0}
                        onChange={(e) => {
                          const discount = parseFloat(e.target.value) || 0;
                          onSelectionChange(
                            selectedProducts.map((p) =>
                              p.id === product.id
                                ? {
                                    ...p,
                                    discount,
                                    amount:
                                      p.quantity * p.price * (1 - Math.min(100, Math.max(0, discount)) / 100),
                                  }
                                : p
                            )
                          );
                        }}
                        className="w-16 h-7 text-right"
                        min={0}
                        max={100}
                      />
                    </TableCell>
                  )}
                  {showPrice && (
                    <TableCell className="text-right font-medium">
                      {currencySymbol}{formatDisplayNumber(product.quantity * product.price * (1 - (product.discount || 0) / 100))}
                    </TableCell>
                  )}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeProduct(product.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {showPrice && (
                <>
                {normalizedExtraAmount > 0 && (
                  <TableRow className="bg-muted/20">
                    <TableCell colSpan={7} className="text-right font-medium">
                      {extraAmountLabel}：
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {currencySymbol}{formatDisplayNumber(normalizedExtraAmount)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={7} className="text-right font-medium">
                    合计{normalizedExtraAmount > 0 ? "（含运费）" : ""}：
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {currencySymbol}{formatDisplayNumber(finalTotalAmount)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 添加产品按钮 */}
      <Button variant="outline" onClick={openDialog} className="w-full" disabled={isLoading}>
        {isLoading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />加载产品中...</>
        ) : (
          <><Plus className="h-4 w-4 mr-2" />{selectedProducts.length > 0 ? "添加更多产品" : title}</>
        )}
      </Button>

      {/* 产品选择对话框 */}
      <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultWidth={896} defaultHeight={700}>
        <DraggableDialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {title}
              {maxSelection && (
                <Badge variant="outline" className="ml-2">
                  最多选择 {maxSelection} 个
                </Badge>
              )}
              <Badge variant="secondary" className="ml-auto">
                共 {allProducts.length} 个产品
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索产品编码、名称、规格..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 已选数量提示 */}
          {tempSelection.size > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-600" />
              已选择 {tempSelection.size} 个产品
            </div>
          )}

          {/* 产品列表 */}
          <ScrollArea className="flex-1 border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                加载产品列表...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[100px]">产品编码</TableHead>
                    <TableHead>产品名称</TableHead>
                    <TableHead className="w-[120px]">规格</TableHead>
                    <TableHead className="w-[60px]">单位</TableHead>
                    {showPrice && <TableHead className="w-[100px] text-right">单价</TableHead>}
                    {showStock && <TableHead className="w-[100px] text-right">库存</TableHead>}
                    <TableHead className="w-[120px] text-center">数量</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const isSelected = tempSelection.has(product.id);
                    const selectedItem = tempSelection.get(product.id);
                    return (
                      <TableRow
                        key={product.id}
                        className={isSelected ? "bg-primary/5" : "hover:bg-muted/50 cursor-pointer"}
                        onClick={() => toggleProduct(product)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleProduct(product)}
                            disabled={!isSelected && maxSelection !== undefined && tempSelection.size >= maxSelection}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.code}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.spec}</TableCell>
                        <TableCell>{product.unit}</TableCell>
                        {showPrice && (
                          <TableCell className="text-right">
                            {product.price > 0 ? `${currencySymbol}${formatDisplayNumber(product.price)}` : "-"}
                          </TableCell>
                        )}
                        {showStock && (
                          <TableCell className="text-right">
                            {typeof product.stock === "number" ? formatDisplayNumber(product.stock) : "-"}
                          </TableCell>
                        )}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {isSelected && (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  updateQuantity(product.id, (selectedItem?.quantity || 1) - 1)
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={selectedItem?.quantity || 1}
                                onChange={(e) =>
                                  updateQuantity(product.id, parseInt(e.target.value) || 1)
                                }
                                className="w-16 h-7 text-center"
                                min={1}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  updateQuantity(product.id, (selectedItem?.quantity || 1) + 1)
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={showPrice && showStock ? 8 : showPrice || showStock ? 7 : 6} className="text-center py-8 text-muted-foreground">
                        未找到匹配的产品
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmSelection}>
              确认选择 ({tempSelection.size})
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>
    </div>
  );
}
