import { formatDateValue } from "@/lib/formatters";
import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import ERPLayout from "@/components/ERPLayout";
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
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== 类型定义 ====================

interface TreeNode {
  id: number;
  materialCode: string;
  materialName: string;
  specification: string | null;
  quantity: string;
  unit: string | null;
  unitPrice: string;
  level: number;
  parentId: number | null;
  status: string;
  remark: string | null;
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
  productId?: number;
}

const levelConfig: Record<number, { icon: any; label: string; color: string }> = {
  1: { icon: Package, label: "成品", color: "text-blue-600 bg-blue-50 border-blue-200" },
  2: { icon: Component, label: "半成品/组件", color: "text-orange-600 bg-orange-50 border-orange-200" },
  3: { icon: Box, label: "原材料", color: "text-green-600 bg-green-50 border-green-200" },
};

const productCategoryLabels: Record<string, string> = {
  finished: "成品",
  semi_finished: "半成品",
  raw_material: "原材料",
  auxiliary: "辅料",
  other: "其他",
};

// ==================== 工具函数 ====================

function calcSubtotal(quantity: string, unitPrice: string): number {
  const q = parseFloat(quantity) || 0;
  const p = parseFloat(unitPrice) || 0;
  return q * p;
}

function formatMoney(value: number): string {
  return value.toFixed(4);
}

let _tempIdCounter = 0;
function genTempId(): string {
  return `temp_${Date.now()}_${++_tempIdCounter}`;
}

// ==================== 三级树形结构组件（详情查看） ====================

function BOMTreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const config = levelConfig[node.level] || levelConfig[3];
  const LevelIcon = config.icon;
  const subtotal = calcSubtotal(node.quantity, node.unitPrice);

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      <div
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded border mb-0.5 ${
          depth === 0 ? "bg-primary/5 border-primary/20" : "bg-background border-muted hover:bg-muted/30"
        }`}
      >
        {hasChildren ? (
          <Button variant="ghost" size="icon" className="h-4 w-4 shrink-0" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        ) : (
          <div className="w-4 shrink-0" />
        )}
        <LevelIcon className={`h-3 w-3 shrink-0 ${config.color.split(" ")[0]}`} />
        <Badge variant="outline" className={`text-[10px] px-1 py-0 shrink-0 leading-4 ${config.color}`}>{config.label}</Badge>
        <span className="font-mono text-xs text-muted-foreground shrink-0">{node.materialCode}</span>
        <span className="text-xs font-medium truncate">{node.materialName}</span>
        {node.specification && (
          <span className="text-xs text-muted-foreground truncate hidden md:inline">{node.specification}</span>
        )}
        <div className="ml-auto flex items-center gap-2 shrink-0 text-xs">
          <span>{node.quantity} {node.unit || ""}</span>
          {node.level !== 1 && (
            <>
              <span className="text-muted-foreground">@{parseFloat(node.unitPrice || "0").toFixed(2)}</span>
              <span className="font-medium text-primary">¥{subtotal.toFixed(2)}</span>
            </>
          )}
        </div>
      </div>
      {hasChildren && isOpen && (
        <div className="border-l-2 border-muted/60 ml-2">
          {node.children.map((child) => (
            <BOMTreeItem key={child.id} node={child} depth={depth + 1} />
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
  const productId = bomRecord?.productId;
  const { data: rawItems = [], isLoading } = trpc.bom.list.useQuery(
    { productId: productId! },
    { enabled: !!productId && open }
  );
  const items = rawItems as any[];

  const treeData = useMemo(() => {
    if (!items.length || !bomRecord) return [];
    const productNode: TreeNode = {
      id: 0,
      materialCode: bomRecord.productCode || "",
      materialName: bomRecord.productName || "未知产品",
      specification: bomRecord.productSpec || null,
      quantity: "1",
      unit: "套",
      unitPrice: "0",
      level: 1,
      parentId: null,
      status: "active",
      remark: null,
      children: [],
    };
    const level2Items = items.filter((i: any) => i.level === 2 || !i.parentId);
    const level3Items = items.filter((i: any) => i.level === 3 && i.parentId);
    level2Items.forEach((item: any) => {
      const children = level3Items.filter((c: any) => c.parentId === item.id);
      const node: TreeNode = {
        id: item.id,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice || "0",
        level: 2,
        parentId: null,
        status: item.status,
        remark: item.remark,
        children: children.map((c: any) => ({
          id: c.id,
          materialCode: c.materialCode,
          materialName: c.materialName,
          specification: c.specification,
          quantity: c.quantity,
          unit: c.unit,
          unitPrice: c.unitPrice || "0",
          level: 3,
          parentId: c.parentId,
          status: c.status,
          remark: c.remark,
          children: [],
        })),
      };
      productNode.children.push(node);
    });
    return [productNode];
  }, [items, bomRecord]);

  // 计算总成本
  const totalCost = useMemo(() => {
    return items.reduce((sum: number, item: any) => {
      return sum + calcSubtotal(item.quantity, item.unitPrice || "0");
    }, 0);
  }, [items]);

  const level2Count = items.filter((i: any) => i.level === 2 || !i.parentId).length;
  const level3Count = items.filter((i: any) => i.level === 3 && i.parentId).length;

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                    <span className="text-muted-foreground">物料总数</span>
                    <p className="font-medium">{bomRecord.itemCount}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">二级组件</span>
                    <p className="font-medium text-orange-600">{level2Count} 项</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">三级原材料</span>
                    <p className="font-medium text-green-600">{level3Count} 项</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">材料总成本</span>
                    <p className="font-medium text-red-600">¥{totalCost.toFixed(2)}</p>
                  </div>
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
                    <span>二级：半成品/组件</span>
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
                      <BOMTreeItem key={node.id} node={node} />
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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  level2Item: BomLevel2Item | null;
  onSave: (level2TempId: string, children: BomLevel3Item[]) => void;
}) {
  const { data: rawProducts = [] } = trpc.products.list.useQuery({});
  const allProducts = rawProducts as any[];
  // 筛选原材料产品
  const rawMaterialProducts = allProducts.filter((p: any) => p.productCategory === "raw_material");

  const [children, setChildren] = useState<BomLevel3Item[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // 当弹窗打开时，初始化已有的子物料
  useMemo(() => {
    if (open && level2Item) {
      setChildren([...level2Item.children]);
      setProductSearch("");
    }
  }, [open, level2Item]);

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
      <DraggableDialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                      <TableHead className="text-center font-bold">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
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
                <div className="flex items-center gap-1 text-sm">
                  <Calculator className="h-4 w-4 text-red-600" />
                  <span className="text-muted-foreground">原材料成本：</span>
                  <span className="font-bold text-red-600">¥{childrenCost.toFixed(2)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {children.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  请从上方列表选择原材料
                </div>
              ) : (
                <div className="space-y-2">
                  {children.map((child) => {
                    const subtotal = calcSubtotal(child.quantity, child.unitPrice);
                    return (
                      <div key={child.tempId} className="flex items-center gap-2 p-2 border rounded-lg bg-green-50/30">
                        <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 text-xs shrink-0">原材料</Badge>
                        <span className="font-mono text-xs shrink-0 w-28 truncate">{child.materialCode}</span>
                        <span className="text-sm shrink-0 w-20 truncate">{child.materialName}</span>
                        <Input
                          className="h-7 w-20 text-xs"
                          placeholder="用量"
                          value={child.quantity}
                          onChange={(e) => updateChild(child.tempId, "quantity", e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground shrink-0">{child.unit}</span>
                        <Input
                          className="h-7 w-24 text-xs"
                          placeholder="单价"
                          value={child.unitPrice}
                          onChange={(e) => updateChild(child.tempId, "unitPrice", e.target.value)}
                        />
                        <span className="text-xs font-medium text-red-600 shrink-0 w-20 text-right">¥{subtotal.toFixed(2)}</span>
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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
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

  // 成品产品列表
  const finishedProducts = allProducts.filter((p: any) => p.productCategory === "finished");
  // 半成品/组件产品列表
  const semiFinishedProducts = allProducts.filter((p: any) =>
    p.productCategory === "semi_finished" || p.productCategory === "auxiliary"
  );

  // 状态
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productPickerSearch, setProductPickerSearch] = useState("");
  const [version, setVersion] = useState("V1.0");
  const [bomCode, setBomCode] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");

  // 自动生成 BOM 编号
  const generateBomCode = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    return `BOM-${y}${m}${d}-${rand}`;
  };
  const [level2Items, setLevel2Items] = useState<BomLevel2Item[]>([]);
  const [level3DialogOpen, setLevel3DialogOpen] = useState(false);
  const [editingLevel2, setEditingLevel2] = useState<BomLevel2Item | null>(null);
  const [semiSearch, setSemiSearch] = useState("");

  // 选中的产品信息
  const selectedProduct = allProducts.find((p: any) => String(p.id) === selectedProductId);

  // 重置表单
  useMemo(() => {
    if (open) {
      setSelectedProductId("");
      setVersion("V1.0");
      setBomCode(generateBomCode());
      setEffectiveDate("");
      setLevel2Items([]);
      setEditingLevel2(null);
      setSemiSearch("");
    }
  }, [open]);

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
        productId: product.id,
        children: [],
      },
    ]);
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
    if (level2Items.length === 0) {
      toast.error("请至少添加一项二级物料");
      return;
    }

    batchCreate.mutate({
      productId: Number(selectedProductId),
      version: version.trim(),
      bomCode: bomCode.trim() || undefined,
      effectiveDate: effectiveDate || undefined,
      items: level2Items.map((item) => ({
        level: 2,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification || undefined,
        quantity: item.quantity,
        unit: item.unit || undefined,
        unitPrice: item.unitPrice || undefined,
        remark: item.remark || undefined,
        children: item.children.map((child) => ({
          level: 3,
          materialCode: child.materialCode,
          materialName: child.materialName,
          specification: child.specification || undefined,
          quantity: child.quantity,
          unit: child.unit || undefined,
          unitPrice: child.unitPrice || undefined,
          remark: child.remark || undefined,
        })),
      })),
    });
  };

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            新建 BOM 物料清单
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
              {/* 第一行：4个字段 */}
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
                      const p = finishedProducts.find((p: any) => String(p.id) === selectedProductId);
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
                    searchPlaceholder="搜索产品编码、名称、规格型号..."
                    columns={[
                      { key: "code", title: "产品编码", render: (p) => <span className="font-mono font-medium">{p.code}</span> },
                      { key: "name", title: "产品名称", render: (p) => <span className="font-medium">{p.name}</span> },
                      { key: "specification", title: "规格型号", render: (p) => <span className="text-muted-foreground">{p.specification || "-"}</span> },
                      { key: "unit", title: "单位" },
                      { key: "productCategory", title: "产品分类", render: (p) => <Badge variant="outline" className="text-xs">{productCategoryLabels[p.productCategory] || p.productCategory || "成品"}</Badge> },
                    ]}
                    rows={finishedProducts}
                    selectedId={selectedProductId}
                    filterFn={(p, q) => {
                      const lower = q.toLowerCase();
                      return p.code?.toLowerCase().includes(lower) || p.name?.toLowerCase().includes(lower) || p.specification?.toLowerCase().includes(lower);
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
                  <Input type="date" className="mt-1" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
                </div>
              </div>

              {/* 产品信息带出 */}
              {selectedProduct && (
                <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">产品编码</span>
                      <p className="font-medium font-mono">{selectedProduct.code}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">产品名称</span>
                      <p className="font-medium">{selectedProduct.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">规格型号</span>
                      <p className="font-medium">{selectedProduct.specification || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">单位</span>
                      <p className="font-medium">{selectedProduct.unit || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">产品分类</span>
                      <p className="font-medium">{productCategoryLabels[selectedProduct.productCategory] || selectedProduct.productCategory || "-"}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== Step 2: 添加二级物料 ===== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Component className="h-4 w-4 text-orange-600" />
                第二步：选择二级物料（半成品/组件）
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 搜索半成品 */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索半成品/组件编码、名称、规格..."
                  value={semiSearch}
                  onChange={(e) => setSemiSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md mb-4">
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
                    {filteredSemiProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">
                          暂无半成品/组件产品
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSemiProducts.slice(0, 30).map((p: any) => (
                        <TableRow key={p.id} className="hover:bg-muted/30">
                          <TableCell className="text-center text-xs font-mono">{p.code}</TableCell>
                          <TableCell className="text-center text-xs">{p.name}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{p.specification || "-"}</TableCell>
                          <TableCell className="text-center text-xs">{p.unit || "-"}</TableCell>
                          <TableCell className="text-center text-xs">
                            <Badge variant="outline" className="text-xs">{productCategoryLabels[p.productCategory] || "-"}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => addLevel2(p)}
                              disabled={level2Items.some((item) => item.materialCode === p.code)}
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

              {/* 已选二级物料列表 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>已选二级物料（{level2Items.length} 项）</span>
                </div>
                {level2Items.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg">
                    请从上方列表选择半成品/组件
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/60 bg-muted/30">
                          <TableHead className="text-center font-bold">物料编码</TableHead>
                          <TableHead className="text-center font-bold">物料名称</TableHead>
                          <TableHead className="text-center font-bold">规格</TableHead>
                          <TableHead className="w-20 text-center font-bold">用量</TableHead>
                          <TableHead className="w-16 text-center font-bold">单位</TableHead>
                          <TableHead className="w-24 text-center font-bold">单价(元)</TableHead>
                          <TableHead className="w-20 text-center font-bold">小计</TableHead>
                          <TableHead className="w-16 text-center font-bold">三级</TableHead>
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
                              <TableCell className="text-center text-xs font-mono">{item.materialCode}</TableCell>
                              <TableCell className="text-center text-xs font-medium">{item.materialName}</TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground">{item.specification || "-"}</TableCell>
                              <TableCell className="text-center">
                                <Input
                                  className="h-7 text-xs"
                                  value={item.quantity}
                                  onChange={(e) => updateLevel2(item.tempId, "quantity", e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="text-center text-xs">{item.unit}</TableCell>
                              <TableCell className="text-center">
                                <Input
                                  className="h-7 text-xs"
                                  value={item.unitPrice}
                                  onChange={(e) => updateLevel2(item.tempId, "unitPrice", e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="text-xs text-center font-medium text-red-600">¥{subtotal.toFixed(2)}</TableCell>
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
          {level2Items.length > 0 && (
            <Card className="border-red-200 bg-red-50/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-5 w-5 text-red-600" />
                  <span className="font-bold text-base">材料成本核算</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">二级物料成本</span>
                    <p className="text-lg font-bold text-orange-600">¥{costSummary.level2Cost.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">三级原材料成本</span>
                    <p className="text-lg font-bold text-green-600">¥{costSummary.level3Cost.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">产品总材料成本</span>
                    <p className="text-2xl font-bold text-red-600">¥{costSummary.totalCost.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={batchCreate.isPending}>
            {batchCreate.isPending ? "提交中..." : "确认创建 BOM"}
          </Button>
        </DialogFooter>

        {/* 三级物料配置弹窗 */}
        <Level3MaterialDialog
          open={level3DialogOpen}
          onOpenChange={setLevel3DialogOpen}
          level2Item={editingLevel2}
          onSave={handleLevel3Save}
        />
      </DraggableDialogContent>
    </DraggableDialog>
  );
}

// ==================== BOM 列表主页面 ====================

export default function BOMPage() {
  const { data: rawData = [], isLoading, refetch } = trpc.bom.list.useQuery();
  const deleteMutation = trpc.bom.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("删除成功");
    },
  });

  const data = rawData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { canDelete } = usePermission();

  const filteredData = data.filter((record: any) => {
    const matchesSearch =
      String(record.productCode ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.productSpec ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: data.length,
    totalItems: data.reduce((sum: number, r: any) => sum + (Number(r.itemCount) || 0), 0),
    totalCost: data.reduce((sum: number, r: any) => sum + (Number(r.totalCost) || 0), 0),
  };

  const handleView = (record: any) => {
    setSelectedBom(record);
    setDetailOpen(true);
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">BOM总数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.totalItems}</div>
              <div className="text-sm text-muted-foreground">物料总项数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">¥{stats.totalCost.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">材料总成本</div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索产品编码、产品名称、产品规格..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                  <TableHead className="text-center font-bold">BOM版本</TableHead>
                  <TableHead className="text-center font-bold">物料数量</TableHead>
                  <TableHead className="text-center font-bold">材料成本</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">更新时间</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((record: any) => {
                    const allActive = record.statuses === "active";
                    const cost = Number(record.totalCost) || 0;
                    return (
                      <TableRow key={`${record.productId}-${record.version}`} className="hover:bg-muted/30">
                        <TableCell className="text-center font-mono text-sm">{record.productCode || "-"}</TableCell>
                        <TableCell className="text-center font-medium">{record.productName || "未知产品"}</TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">{record.productSpec || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{record.version || "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{record.itemCount} 项</Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium text-red-600">
                          {cost > 0 ? `¥${cost.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={allActive ? "default" : "outline"} className={allActive ? "text-green-600" : ""}>
                            {allActive ? "生效" : "部分生效"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">{formatDateValue(record.updatedAt)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleView(record)} title="查看BOM结构">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* BOM 详情弹窗 */}
        <BOMDetailDialog open={detailOpen} onOpenChange={setDetailOpen} bomRecord={selectedBom} />

        {/* 新建 BOM 弹窗 */}
        <CreateBOMDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={refetch} />
      </div>
    </ERPLayout>
  );
}
