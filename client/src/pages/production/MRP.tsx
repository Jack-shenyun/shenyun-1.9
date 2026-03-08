import { formatDate, formatDateTime } from "@/lib/formatters";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ERPLayout from "@/components/ERPLayout";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  LayoutGrid, Search, Play, Eye, Trash2, AlertTriangle, CheckCircle,
  Package, Clock, RefreshCw, FileText, AlertCircle, ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

// ────────────────────────────────────────────────────────────
// 工具函数
// ────────────────────────────────────────────────────────────

const planStatusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
  pending:     { label: "待排产", variant: "outline" },
  scheduled:   { label: "已排产", variant: "default" },
  in_progress: { label: "生产中", variant: "default" },
  completed:   { label: "已完成", variant: "secondary" },
  cancelled:   { label: "已取消", variant: "destructive" },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  low:    { label: "低",   color: "text-muted-foreground" },
  normal: { label: "普通", color: "text-green-600" },
  high:   { label: "高",   color: "text-orange-500" },
  urgent: { label: "紧急", color: "text-red-600 font-bold" },
};

const urgencyConfig: Record<string, { label: string; cls: string }> = {
  high:   { label: "紧急", cls: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "一般", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  low:    { label: "正常", cls: "bg-green-100 text-green-700 border-green-200" },
};

// ────────────────────────────────────────────────────────────
// 类型
// ────────────────────────────────────────────────────────────
type MrpResult = {
  planId: number;
  planNo: string;
  productId: number;
  productName: string;
  plannedQty: number;
  unit: string;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  daysToDeadline?: number;
  bomMissing: boolean;
  totalMaterials: number;
  shortfallCount: number;
  items: MrpItem[];
  calculatedAt: string;
};

type MrpItem = {
  bomId: number;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  bomQty: number;
  requiredQty: number;
  onHandQty: number;
  onOrderQty: number;
  netRequirement: number;
  urgency: "high" | "medium" | "low";
  needPurchase: boolean;
};

// ────────────────────────────────────────────────────────────
// 主页面
// ────────────────────────────────────────────────────────────
export default function MRPPage() {
  const { canDelete } = usePermission();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // 计算结果缓存（planId → MrpResult）
  const [resultsMap, setResultsMap] = useState<Record<number, MrpResult>>({});
  // 计算中的 planId 集合
  const [calculatingIds, setCalculatingIds] = useState<Set<number>>(new Set());
  // 详情弹窗
  const [detailPlan, setDetailPlan] = useState<MrpResult | null>(null);

  // 拉取生产计划列表
  const { data: plans = [], isLoading, refetch } = trpc.mrp.listPlans.useQuery(
    { status: statusFilter === "all" ? undefined : statusFilter, search: search || undefined },
    { refetchOnWindowFocus: false }
  );

  const calculateMutation = trpc.mrp.calculate.useMutation({
    onSuccess: (data, variables) => {
      setResultsMap((prev) => ({ ...prev, [variables.productionPlanId]: data as MrpResult }));
      setCalculatingIds((prev) => { const s = new Set(prev); s.delete(variables.productionPlanId); return s; });
      toast.success(`MRP运算完成：${(data as MrpResult).productName}`);
    },
    onError: (err, variables) => {
      setCalculatingIds((prev) => { const s = new Set(prev); s.delete(variables.productionPlanId); return s; });
      toast.error(`运算失败：${err.message}`);
    },
  });

  const handleCalculate = (planId: number) => {
    setCalculatingIds((prev) => new Set(prev).add(planId));
    calculateMutation.mutate({ productionPlanId: planId });
  };

  const handleViewDetail = (planId: number) => {
    const result = resultsMap[planId];
    if (!result) {
      toast.info("请先点击「运算」按钮执行 MRP 计算");
      return;
    }
    setDetailPlan(result);
  };

  const handleRemoveResult = (planId: number) => {
    setResultsMap((prev) => { const m = { ...prev }; delete m[planId]; return m; });
    toast.success("已清除该计划的运算结果");
  };

  // 统计
  const calculatedCount = Object.keys(resultsMap).length;
  const shortfallCount = Object.values(resultsMap).filter((r) => r.shortfallCount > 0).length;
  const pendingCount = plans.filter((p: any) => !resultsMap[p.id]).length;

  return (
    <ERPLayout>
      <div className="p-6 space-y-6">
        {/* 页头 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutGrid className="w-6 h-6" />
              MRP 物料需求计划
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              根据生产计划 × BOM 用量，核实库存与在途量，计算净需求
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{plans.length}</p>
                  <p className="text-xs text-muted-foreground">生产计划总数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">待运算</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{calculatedCount}</p>
                  <p className="text-xs text-muted-foreground">已完成运算</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{shortfallCount}</p>
                  <p className="text-xs text-muted-foreground">存在缺料</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索 + 筛选 */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索计划编号、产品名称..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待排产</SelectItem>
              <SelectItem value="scheduled">已排产</SelectItem>
              <SelectItem value="in_progress">生产中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 列表 */}
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>计划编号</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead className="text-right">计划数量</TableHead>
                <TableHead>交期</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>计划状态</TableHead>
                <TableHead>MRP 结果</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    暂无生产计划数据
                  </TableCell>
                </TableRow>
              ) : (
                (plans as any[]).map((plan: any) => {
                  const result = resultsMap[plan.id];
                  const isCalc = calculatingIds.has(plan.id);
                  const statusInfo = planStatusMap[plan.status] ?? { label: plan.status, variant: "outline" as const };
                  const priorityInfo = priorityMap[plan.priority] ?? priorityMap.normal;

                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-mono text-sm">{plan.planNo || "-"}</TableCell>
                      <TableCell className="font-medium">{plan.productName || "-"}</TableCell>
                      <TableCell className="text-right">
                        {plan.plannedQty ? `${Number(plan.plannedQty).toLocaleString()} ${plan.unit || ""}` : "-"}
                      </TableCell>
                      <TableCell>{formatDate(plan.plannedEndDate)}</TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {result ? (
                          result.bomMissing ? (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                              <AlertCircle className="w-3.5 h-3.5" />
                              无BOM数据
                            </span>
                          ) : result.shortfallCount > 0 ? (
                            <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              缺料 {result.shortfallCount} 种
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="w-3.5 h-3.5" />
                              物料充足
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">未运算</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isCalc}
                            onClick={() => handleCalculate(plan.id)}
                            className="h-7 px-2 text-xs"
                          >
                            {isCalc ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                              <Play className="w-3.5 h-3.5 mr-1" />
                            )}
                            {isCalc ? "运算中" : "运算"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!result}
                            onClick={() => handleViewDetail(plan.id)}
                            className="h-7 px-2 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            详情
                          </Button>
                          {result && canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveResult(plan.id)}
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 详情弹窗 */}
      {detailPlan && (
        <MrpDetailDialog result={detailPlan} onClose={() => setDetailPlan(null)} />
      )}
    </ERPLayout>
  );
}

// ────────────────────────────────────────────────────────────
// 详情弹窗
// ────────────────────────────────────────────────────────────
function MrpDetailDialog({ result, onClose }: { result: MrpResult; onClose: () => void }) {
  const [filter, setFilter] = useState<"all" | "shortage">("all");
  const [urgency, setUrgency] = useState<"normal" | "urgent" | "critical">("normal");
  const [generating, setGenerating] = useState(false);

  const generateMutation = trpc.mrp.generatePurchaseRequest.useMutation({
    onSuccess: (data) => {
      setGenerating(false);
      toast.success(`采购申请单已生成：${data.requestNo}`, {
        description: "已保存为草稿，请前往「物料申请」页面提交审批",
        duration: 5000,
      });
    },
    onError: (err) => {
      setGenerating(false);
      toast.error(`生成失败：${err.message}`);
    },
  });

  const shortageItems = result.items.filter((i) => i.needPurchase);
  const displayItems = filter === "shortage" ? shortageItems : result.items;

  const handleGeneratePurchaseRequest = () => {
    if (shortageItems.length === 0) {
      toast.info("物料充足，无需生成采购申请");
      return;
    }
    setGenerating(true);
    generateMutation.mutate({
      productionPlanId: result.planId,
      planNo: result.planNo,
      productName: result.productName,
      urgency,
      items: shortageItems.map((item) => ({
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification !== "-" ? item.specification : undefined,
        unit: item.unit !== "-" ? item.unit : undefined,
        netRequirement: item.netRequirement,
      })),
    });
  };

  return (
    <DraggableDialog open onOpenChange={(o) => !o && onClose()}>
      <DraggableDialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            MRP 运算详情
          </DialogTitle>
          <DialogDescription>
            {result.planNo} · {result.productName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm border rounded-lg p-4 bg-muted/30">
            <div>
              <p className="text-muted-foreground text-xs">计划编号</p>
              <p className="font-mono font-medium">{result.planNo}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">产品名称</p>
              <p className="font-medium">{result.productName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">计划数量</p>
              <p className="font-medium">{result.plannedQty.toLocaleString()} {result.unit}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">计划交期</p>
              <p className="font-medium">
                {result.plannedEndDate || "-"}
                {result.daysToDeadline !== undefined && result.daysToDeadline < 999 && (
                  <span className={`ml-1 text-xs ${result.daysToDeadline <= 7 ? "text-red-600" : result.daysToDeadline <= 14 ? "text-amber-600" : "text-muted-foreground"}`}>
                    （剩余 {result.daysToDeadline} 天）
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">BOM 物料数</p>
              <p className="font-medium">{result.totalMaterials} 种</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">缺料种数</p>
              <p className={`font-medium ${result.shortfallCount > 0 ? "text-red-600" : "text-green-600"}`}>
                {result.shortfallCount > 0 ? `${result.shortfallCount} 种缺料` : "物料充足"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">运算时间</p>
              <p className="font-medium text-xs">
                {formatDateTime(result.calculatedAt)}
              </p>
            </div>
          </div>

          {/* BOM 缺失提示 */}
          {result.bomMissing && (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">该产品尚未维护 BOM 清单，无法进行物料需求运算。请先在「BOM管理」中维护该产品的物料清单。</p>
            </div>
          )}

          {/* 物料明细 */}
          {!result.bomMissing && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">物料需求明细</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={filter === "all" ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setFilter("all")}
                  >
                    全部 ({result.items.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={filter === "shortage" ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setFilter("shortage")}
                  >
                    仅缺料 ({result.shortfallCount})
                  </Button>
                </div>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">物料编码</TableHead>
                      <TableHead className="text-xs">物料名称</TableHead>
                      <TableHead className="text-xs">规格型号</TableHead>
                      <TableHead className="text-xs text-right">单位用量</TableHead>
                      <TableHead className="text-xs text-right">需求总量</TableHead>
                      <TableHead className="text-xs text-right">合格库存</TableHead>
                      <TableHead className="text-xs text-right">在途量</TableHead>
                      <TableHead className="text-xs text-right font-semibold">净需求</TableHead>
                      <TableHead className="text-xs">紧急程度</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-6 text-muted-foreground text-sm">
                          {filter === "shortage" ? "无缺料物料，库存充足" : "暂无物料数据"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayItems.map((item) => (
                        <TableRow key={item.bomId} className={item.needPurchase ? "bg-red-50/40" : ""}>
                          <TableCell className="font-mono text-xs">{item.materialCode}</TableCell>
                          <TableCell className="text-sm font-medium">{item.materialName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.specification}</TableCell>
                          <TableCell className="text-right text-sm">{item.bomQty} {item.unit}</TableCell>
                          <TableCell className="text-right text-sm">{item.requiredQty.toLocaleString()} {item.unit}</TableCell>
                          <TableCell className="text-right text-sm">{item.onHandQty.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm text-blue-600">{item.onOrderQty.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm font-bold">
                            <span className={item.netRequirement > 0 ? "text-red-600" : "text-green-600"}>
                              {item.netRequirement > 0 ? `▲ ${item.netRequirement.toLocaleString()}` : "✓ 充足"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {item.needPurchase ? (
                              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${urgencyConfig[item.urgency].cls}`}>
                                {urgencyConfig[item.urgency].label}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 一键生成采购申请 */}
              {result.shortfallCount > 0 && (
                <div className="border rounded-lg p-4 bg-orange-50/50 border-orange-200">
                  <div className="flex items-start gap-3">
                    <ShoppingCart className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-orange-800 mb-1">一键生成采购申请单</h4>
                      <p className="text-xs text-orange-700 mb-3">
                        将 {result.shortfallCount} 种缺料（净需求 &gt; 0）自动生成一张采购申请单（草稿），
                        生成后请前往「物料申请」页面提交审批。
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-orange-700 whitespace-nowrap">紧急程度</Label>
                          <Select value={urgency} onValueChange={(v) => setUrgency(v as any)}>
                            <SelectTrigger className="h-7 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">普通</SelectItem>
                              <SelectItem value="urgent">紧急</SelectItem>
                              <SelectItem value="critical">特急</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-orange-600 hover:bg-orange-700"
                          disabled={generating}
                          onClick={handleGeneratePurchaseRequest}
                        >
                          {generating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                          )}
                          {generating ? "生成中..." : `生成采购申请（${result.shortfallCount} 种）`}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DraggableDialogContent>
    </DraggableDialog>
  );
}
