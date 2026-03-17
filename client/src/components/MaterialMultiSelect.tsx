import { useState, useMemo } from "react";
import { Plus, Minus, Search, Layers, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { formatDisplayNumber } from "@/lib/formatters";

export interface Material {
  id: number;
  code: string;
  name: string;
  spec: string;
  unit: string;
  price: number;
  category?: string;
  stock?: number;
  minStock?: number;
}

export interface SelectedMaterial extends Material {
  quantity: number;
  amount?: number;
}

interface MaterialMultiSelectProps {
  materials: Material[];
  selectedMaterials: SelectedMaterial[];
  onSelectionChange: (materials: SelectedMaterial[]) => void;
  title?: string;
  showPrice?: boolean;
  showStock?: boolean;
  maxSelection?: number;
}

// 示例物料数据
export const sampleMaterials: Material[] = [
  { id: 1, code: "MAT-001", name: "医用级PP塑料", spec: "注塑级", unit: "kg", price: 25.00, category: "原材料", stock: 5000, minStock: 1000 },
  { id: 2, code: "MAT-002", name: "医用级PE塑料", spec: "吹塑级", unit: "kg", price: 22.00, category: "原材料", stock: 3000, minStock: 800 },
  { id: 3, code: "MAT-003", name: "无纺布", spec: "25g/m²", unit: "m", price: 8.65, category: "原材料", stock: 15000, minStock: 3000 },
  { id: 4, code: "MAT-004", name: "熔喷布", spec: "25g/m²", unit: "m", price: 35.00, category: "原材料", stock: 8000, minStock: 2000 },
  { id: 5, code: "MAT-005", name: "鼻梁条", spec: "3mm", unit: "m", price: 0.15, category: "组件", stock: 50000, minStock: 10000 },
  { id: 6, code: "MAT-006", name: "耳带", spec: "弹力", unit: "m", price: 0.08, category: "组件", stock: 80000, minStock: 20000 },
  { id: 7, code: "MAT-007", name: "包装盒", spec: "50只装", unit: "个", price: 1.60, category: "包装材料", stock: 20000, minStock: 5000 },
  { id: 8, code: "MAT-008", name: "包装袋", spec: "PE自封袋", unit: "个", price: 0.25, category: "包装材料", stock: 100000, minStock: 20000 },
  { id: 9, code: "MAT-009", name: "注射器针头", spec: "21G", unit: "支", price: 0.35, category: "半成品", stock: 100000, minStock: 30000 },
  { id: 10, code: "MAT-010", name: "注射器推杆", spec: "5ml", unit: "支", price: 0.15, category: "半成品", stock: 80000, minStock: 20000 },
  { id: 11, code: "MAT-011", name: "注射器筒身", spec: "5ml", unit: "支", price: 0.20, category: "半成品", stock: 75000, minStock: 20000 },
  { id: 12, code: "MAT-012", name: "乳胶手套原料", spec: "天然乳胶", unit: "kg", price: 45.00, category: "原材料", stock: 2000, minStock: 500 },
];

export default function MaterialMultiSelect({
  materials = sampleMaterials,
  selectedMaterials,
  onSelectionChange,
  title = "选择物料",
  showPrice = true,
  showStock = false,
  maxSelection,
}: MaterialMultiSelectProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tempSelection, setTempSelection] = useState<Map<number, SelectedMaterial>>(new Map());

  // 初始化临时选择
  const openDialog = () => {
    const map = new Map<number, SelectedMaterial>();
    selectedMaterials.forEach((m) => map.set(m.id, m));
    setTempSelection(map);
    setDialogOpen(true);
  };

  // 过滤物料
  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return materials;
    const term = searchTerm.toLowerCase();
    return materials.filter(
      (m) =>
        m.code.toLowerCase().includes(term) ||
        m.name.toLowerCase().includes(term) ||
        m.spec.toLowerCase().includes(term)
    );
  }, [materials, searchTerm]);

  // 切换选择
  const toggleMaterial = (material: Material) => {
    const newSelection = new Map(tempSelection);
    if (newSelection.has(material.id)) {
      newSelection.delete(material.id);
    } else {
      if (maxSelection && newSelection.size >= maxSelection) return;
      newSelection.set(material.id, { ...material, quantity: 1 });
    }
    setTempSelection(newSelection);
  };

  // 更新数量
  const updateQuantity = (materialId: number, quantity: number) => {
    if (quantity < 1) return;
    const newSelection = new Map(tempSelection);
    const material = newSelection.get(materialId);
    if (material) {
      material.quantity = quantity;
      material.amount = material.quantity * material.price;
      newSelection.set(materialId, material);
      setTempSelection(newSelection);
    }
  };

  // 确认选择
  const confirmSelection = () => {
    const selected = Array.from(tempSelection.values()).map((m) => ({
      ...m,
      amount: m.quantity * m.price,
    }));
    onSelectionChange(selected);
    setDialogOpen(false);
  };

  // 移除已选物料
  const removeMaterial = (materialId: number) => {
    onSelectionChange(selectedMaterials.filter((m) => m.id !== materialId));
  };

  // 直接更新已选物料数量
  const updateSelectedQuantity = (materialId: number, quantity: number) => {
    if (quantity < 1) return;
    onSelectionChange(
      selectedMaterials.map((m) =>
        m.id === materialId
          ? { ...m, quantity, amount: quantity * m.price }
          : m
      )
    );
  };

  // 计算总金额
  const totalAmount = selectedMaterials.reduce(
    (sum, m) => sum + m.quantity * m.price,
    0
  );

  return (
    <div className="space-y-4">
      {/* 已选物料列表 */}
      {selectedMaterials.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px]">物料编码</TableHead>
                <TableHead>物料名称</TableHead>
                <TableHead className="w-[100px]">规格</TableHead>
                <TableHead className="w-[80px]">单位</TableHead>
                {showPrice && <TableHead className="w-[100px] text-right">单价</TableHead>}
                <TableHead className="w-[120px] text-center">数量</TableHead>
                {showPrice && <TableHead className="w-[100px] text-right">金额</TableHead>}
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedMaterials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-mono text-sm">{material.code}</TableCell>
                  <TableCell className="font-medium">{material.name}</TableCell>
                  <TableCell>{material.spec}</TableCell>
                  <TableCell>{material.unit}</TableCell>
                  {showPrice && (
                    <TableCell className="text-right">¥{formatDisplayNumber(material.price)}</TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateSelectedQuantity(material.id, material.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={material.quantity}
                        onChange={(e) =>
                          updateSelectedQuantity(material.id, parseInt(e.target.value) || 1)
                        }
                        className="w-16 h-7 text-center"
                        min={1}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateSelectedQuantity(material.id, material.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  {showPrice && (
                    <TableCell className="text-right font-medium">
                      ¥{formatDisplayNumber(material.quantity * material.price)}
                    </TableCell>
                  )}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeMaterial(material.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {showPrice && (
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={6} className="text-right font-medium">
                    合计：
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    ¥{formatDisplayNumber(totalAmount)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 添加物料按钮 */}
      <Button variant="outline" onClick={openDialog} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        {selectedMaterials.length > 0 ? "添加更多物料" : title}
      </Button>

      {/* 物料选择对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {title}
              {maxSelection && (
                <Badge variant="outline" className="ml-2">
                  最多选择 {maxSelection} 个
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索物料编码、名称、规格..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 已选数量提示 */}
          {tempSelection.size > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-600" />
              已选择 {tempSelection.size} 种物料
            </div>
          )}

          {/* 物料列表 */}
          <ScrollArea className="flex-1 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[100px]">物料编码</TableHead>
                  <TableHead>物料名称</TableHead>
                  <TableHead className="w-[100px]">规格</TableHead>
                  <TableHead className="w-[60px]">单位</TableHead>
                  {showPrice && <TableHead className="w-[100px] text-right">单价</TableHead>}
                  {showStock && <TableHead className="w-[100px] text-right">库存</TableHead>}
                  <TableHead className="w-[120px] text-center">数量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => {
                  const isSelected = tempSelection.has(material.id);
                  const selectedItem = tempSelection.get(material.id);
                  return (
                    <TableRow
                      key={material.id}
                      className={isSelected ? "bg-primary/5" : "hover:bg-muted/50 cursor-pointer"}
                      onClick={() => toggleMaterial(material)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleMaterial(material)}
                          disabled={!isSelected && maxSelection !== undefined && tempSelection.size >= maxSelection}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{material.code}</TableCell>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell>{material.spec}</TableCell>
                      <TableCell>{material.unit}</TableCell>
                      {showPrice && (
                        <TableCell className="text-right">¥{formatDisplayNumber(material.price)}</TableCell>
                      )}
                      {showStock && (
                        <TableCell className="text-right">
                          <span className={material.stock && material.minStock && material.stock < material.minStock ? "text-red-600" : ""}>
                            {material.stock != null ? formatDisplayNumber(material.stock) : "-"}
                          </span>
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
                                updateQuantity(material.id, (selectedItem?.quantity || 1) - 1)
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={selectedItem?.quantity || 1}
                              onChange={(e) =>
                                updateQuantity(material.id, parseInt(e.target.value) || 1)
                              }
                              className="w-16 h-7 text-center"
                              min={1}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateQuantity(material.id, (selectedItem?.quantity || 1) + 1)
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
                {filteredMaterials.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={showPrice && showStock ? 8 : showPrice || showStock ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      未找到匹配的物料
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmSelection}>
              确认选择 ({tempSelection.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
