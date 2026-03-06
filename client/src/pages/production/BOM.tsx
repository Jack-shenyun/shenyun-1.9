import { formatDateValue } from "@/lib/formatters";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

// ==================== 三级树形结构组件 ====================

interface TreeNode {
  id: number;
  materialCode: string;
  materialName: string;
  specification: string | null;
  quantity: string;
  unit: string | null;
  level: number;
  parentId: number | null;
  status: string;
  children: TreeNode[];
}

const levelConfig: Record<number, { icon: any; label: string; color: string }> = {
  1: { icon: Package, label: "成品", color: "text-blue-600 bg-blue-50 border-blue-200" },
  2: { icon: Component, label: "半成品/组件", color: "text-orange-600 bg-orange-50 border-orange-200" },
  3: { icon: Box, label: "原材料", color: "text-green-600 bg-green-50 border-green-200" },
};

function BOMTreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const config = levelConfig[node.level] || levelConfig[3];
  const LevelIcon = config.icon;

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      <div
        className={`flex items-center gap-2 py-2.5 px-3 rounded-lg border mb-1 ${
          depth === 0 ? "bg-primary/5 border-primary/20" : "bg-background border-muted hover:bg-muted/30"
        }`}
      >
        {/* 展开/折叠按钮 */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-6 shrink-0" />
        )}

        {/* 层级图标和标签 */}
        <LevelIcon className={`h-4 w-4 shrink-0 ${config.color.split(" ")[0]}`} />
        <Badge variant="outline" className={`text-xs shrink-0 ${config.color}`}>
          {config.label}
        </Badge>

        {/* 物料信息 */}
        <span className="font-mono text-sm text-muted-foreground shrink-0">{node.materialCode}</span>
        <span className="font-medium truncate">{node.materialName}</span>
        {node.specification && (
          <span className="text-sm text-muted-foreground truncate hidden md:inline">{node.specification}</span>
        )}

        {/* 用量 */}
        <span className="ml-auto text-sm font-medium shrink-0">
          {node.quantity} {node.unit || ""}
        </span>
      </div>

      {/* 子节点 - 使用简单的条件渲染替代 Collapsible */}
      {hasChildren && isOpen && (
        <div className="border-l-2 border-muted/60 ml-3">
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

  // 构建三级树形结构
  const treeData = useMemo(() => {
    if (!items.length || !bomRecord) return [];

    // 先构建成品节点（虚拟根节点）
    const productNode: TreeNode = {
      id: 0,
      materialCode: bomRecord.productCode || "",
      materialName: bomRecord.productName || "未知产品",
      specification: bomRecord.productSpec || null,
      quantity: "1",
      unit: "套",
      level: 1,
      parentId: null,
      status: "active",
      children: [],
    };

    // 分离二级和三级物料
    const level2Items = items.filter((i: any) => i.level === 2 || !i.parentId);
    const level3Items = items.filter((i: any) => i.level === 3 && i.parentId);

    // 构建二级节点及其子节点
    level2Items.forEach((item: any) => {
      const node: TreeNode = {
        id: item.id,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification,
        quantity: item.quantity,
        unit: item.unit,
        level: 2,
        parentId: null,
        status: item.status,
        children: [],
      };

      // 找到属于该二级物料的三级子物料
      const children = level3Items.filter((c: any) => c.parentId === item.id);
      node.children = children.map((c: any) => ({
        id: c.id,
        materialCode: c.materialCode,
        materialName: c.materialName,
        specification: c.specification,
        quantity: c.quantity,
        unit: c.unit,
        level: 3,
        parentId: c.parentId,
        status: c.status,
        children: [],
      }));

      productNode.children.push(node);
    });

    return [productNode];
  }, [items, bomRecord]);

  const level2Count = items.filter((i: any) => i.level === 2 || !i.parentId).length;
  const level3Count = items.filter((i: any) => i.level === 3 && i.parentId).length;

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            BOM 结构详情
          </DialogTitle>
        </DialogHeader>

        {bomRecord && (
          <div className="space-y-6">
            {/* 基本信息卡片 */}
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
                    <span className="text-muted-foreground">更新时间</span>
                    <p className="font-medium">{formatDateValue(bomRecord.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 三级 BOM 树形结构 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  三级物料结构
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 图例 */}
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
  const { canDelete } = usePermission();

  // 过滤
  const filteredData = data.filter((record: any) => {
    const matchesSearch =
      String(record.productCode ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.productName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.productSpec ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // 统计
  const stats = {
    total: data.length,
    totalItems: data.reduce((sum: number, r: any) => sum + (Number(r.itemCount) || 0), 0),
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
                <TableRow>
                  <TableHead>产品编码</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>产品规格</TableHead>
                  <TableHead>BOM版本</TableHead>
                  <TableHead>物料数量</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((record: any, idx: number) => {
                    const allActive = record.statuses === "active";
                    return (
                      <TableRow key={`${record.productId}-${record.version}`} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-sm">{record.productCode || "-"}</TableCell>
                        <TableCell className="font-medium">{record.productName || "未知产品"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{record.productSpec || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.version || "-"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{record.itemCount} 项</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={allActive ? "default" : "outline"} className={allActive ? "text-green-600" : ""}>
                            {allActive ? "生效" : "部分生效"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDateValue(record.updatedAt)}</TableCell>
                        <TableCell className="text-right">
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
        <BOMDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          bomRecord={selectedBom}
        />
      </div>
    </ERPLayout>
  );
}
