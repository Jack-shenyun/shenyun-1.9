import { formatDateValue } from "@/lib/formatters";
import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calculator,
  Plus,
  Search,
  Play,
  FileText,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  RefreshCw,
  ShoppingCart,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

// MRP计划类型定义
interface MRPPlan {
  id: number;
  planCode: string;
  planName: string;
  planType: "weekly" | "monthly" | "custom";
  startDate: string;
  endDate: string;
  status: "draft" | "calculating" | "completed" | "approved";
  createdBy: string;
  createdAt: string;
  productionOrders: ProductionOrder[];
  materialRequirements: MaterialRequirement[];
}

interface ProductionOrder {
  id: number;
  orderCode: string;
  productCode: string;
  productName: string;
  quantity: number;
  plannedDate: string;
}

interface MaterialRequirement {
  id: number;
  materialCode: string;
  materialName: string;
  spec: string;
  unit: string;
  requiredQty: number;
  onHandQty: number;
  onOrderQty: number;
  netRequirement: number;
  suggestedAction: "purchase" | "produce" | "none";
  urgency: "high" | "medium" | "low";
  leadTime: number;
  suggestedOrderDate: string;
}

const statusMap: Record<string, any> = {
  draft: { label: "草稿", variant: "outline" as const, color: "text-gray-600" },
  calculating: { label: "计算中", variant: "secondary" as const, color: "text-blue-600" },
  completed: { label: "已完成", variant: "default" as const, color: "text-green-600" },
  approved: { label: "已审批", variant: "default" as const, color: "text-purple-600" },
};

const urgencyMap: Record<string, any> = {
  high: { label: "紧急", color: "text-red-600 bg-red-50" },
  medium: { label: "一般", color: "text-amber-600 bg-amber-50" },
  low: { label: "正常", color: "text-green-600 bg-green-50" },
};

const actionMap: Record<string, any> = {
  purchase: { label: "建议采购", color: "text-blue-600" },
  produce: { label: "建议生产", color: "text-purple-600" },
  none: { label: "无需操作", color: "text-gray-500" },
};

// 示例数据


export default function MRPPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.productionOrders.list.useQuery();
  const createMutation = trpc.productionOrders.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.productionOrders.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.productionOrders.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const data = _dbData as any[];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MRPPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    planName: "",
    planType: "weekly" as "weekly" | "monthly" | "custom",
    startDate: "",
    endDate: "",
  });

  const filteredData = data.filter((plan: any) => {
    const matchesSearch =
      String(plan.planCode ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(plan.planName ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getMaterialRequirements = (plan: any) =>
    Array.isArray(plan?.materialRequirements) ? plan.materialRequirements : [];
  const getProductionOrders = (plan: any) =>
    Array.isArray(plan?.productionOrders) ? plan.productionOrders : [];

  const handleAdd = () => {
    setIsEditing(false);
    setFormData({
      planName: "",
      planType: "weekly",
      startDate: "",
      endDate: "",
    });
    setDialogOpen(true);
  };

  const handleView = (plan: MRPPlan) => {
    setSelectedPlan(plan);
    setViewDialogOpen(true);
  };

  const handleRunMRP = (plan: MRPPlan) => {
    // 模拟MRP计算
    toast.info("MRP计算已启动，正在根据生产计划和BOM清单计算净需求...");
    setTimeout(() => toast.success("MRP计算完成！请查看物料需求清单"), 2000);
  };

  // 一键生成采购申请单（生产部门前置确认）
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingMRPPlan, setPendingMRPPlan] = useState<MRPPlan | null>(null);
  const createMaterialRequestMutation = trpc.materialRequests.create.useMutation({
    onSuccess: () => {
      toast.success("采购申请单已生成，等待生产部门确认");
      setConfirmDialogOpen(false);
    },
    onError: (e) => toast.error("生成失败: " + e.message),
  });

  const handleGeneratePurchaseRequest = (plan: MRPPlan) => {
    setPendingMRPPlan(plan);
    setConfirmDialogOpen(true);
  };

  const handleConfirmAndGenerate = () => {
    if (!pendingMRPPlan) return;
    const today = new Date().toISOString().split("T")[0];
    createMaterialRequestMutation.mutate({
      requestNo: `PR-MRP-${Date.now()}`,
      requestDate: today,
      requiredDate: today,
      department: "生产部",
      status: "pending",
      remark: `由MRP计划 ${pendingMRPPlan.planCode} 自动生成，待生产部门确认`,
    });
  };

  const handleSubmit = () => {
    if (!formData.planName || !formData.startDate || !formData.endDate) {
      toast.error("请填写必填字段");
      return;
    }

    const newPlan: MRPPlan = {
      id: Date.now(),
      planCode: `MRP-${new Date().getFullYear()}-W${String(Math.floor(Math.random() * 52) + 1).padStart(2, "0")}`,
      ...formData,
      status: "draft",
      createdBy: "当前用户",
      createdAt: new Date().toISOString().split("T")[0],
      productionOrders: [],
      materialRequirements: [],
    };
    toast.success("MRP计划已创建");
    setDialogOpen(false);
  };

  // 统计信息
  const stats = {
    total: data.length,
    draft: data.filter((p: any) => p.status === "draft").length,
    completed: data.filter((p: any) => p.status === "completed").length,
    urgentItems: data.reduce(
      (acc, p) => acc + getMaterialRequirements(p).filter((m: any) => m.urgency === "high").length,
      0
    ),
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              MRP物料需求计划
            </h1>
            <p className="text-muted-foreground mt-1">
              根据生产计划自动计算物料需求，生成采购建议
            </p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            新建MRP计划
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">计划总数</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  <div className="text-2xl font-bold text-amber-600">{stats.draft}</div>
                  <div className="text-sm text-muted-foreground">待计算</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                  <div className="text-sm text-muted-foreground">已完成</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.urgentItems}</div>
                  <div className="text-sm text-muted-foreground">紧急物料</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索计划编号、名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="calculating">计算中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="approved">已审批</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* MRP计划列表 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>计划编号</TableHead>
                <TableHead>计划名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>计划周期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建人</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((plan: any) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-mono">{plan.planCode}</TableCell>
                  <TableCell className="font-medium">{plan.planName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {plan.planType === "weekly" ? "周计划" : plan.planType === "monthly" ? "月计划" : "自定义"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDateValue(plan.startDate)} ~ {formatDateValue(plan.endDate)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusMap[plan.status]?.variant || "outline"}
                      className={statusMap[plan.status]?.color || ""}
                    >
                      {statusMap[plan.status]?.label || String(plan.status ?? "-")}
                    </Badge>
                  </TableCell>
                  <TableCell>{plan.createdBy}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleView(plan)}>
                        <FileText className="h-4 w-4 mr-1" />
                        查看
                      </Button>
                      {plan.status === "draft" && (
                        <Button variant="ghost" size="sm" onClick={() => handleRunMRP(plan)}>
                          <Play className="h-4 w-4 mr-1" />
                          运算
                        </Button>
                      )}
                      {plan.status === "calculating" && (
                        <Button variant="ghost" size="sm" disabled>
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          计算中
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isLoading ? "加载中..." : "暂无数据"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* 新建MRP计划对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>新建MRP计划</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>计划名称 *</Label>
                <Input
                  value={formData.planName}
                  onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                  placeholder="如: 2026年第6周物料需求计划"
                />
              </div>
              <div className="space-y-2">
                <Label>计划类型</Label>
                <Select
                  value={formData.planType}
                  onValueChange={(v) => setFormData({ ...formData, planType: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">周计划</SelectItem>
                    <SelectItem value="monthly">月计划</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始日期 *</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束日期 *</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>创建</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看MRP计划详情对话框 */}
        <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                MRP计划详情 - {selectedPlan?.planCode}
              </DialogTitle>
            </DialogHeader>

            {selectedPlan && (
              <Tabs defaultValue="overview" className="w-full">
                {(() => {
                  const selectedOrders = getProductionOrders(selectedPlan);
                  const selectedMaterials = getMaterialRequirements(selectedPlan);
                  return (
                    <>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">计划概览</TabsTrigger>
                  <TabsTrigger value="production">生产订单</TabsTrigger>
                  <TabsTrigger value="materials">物料需求</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">基本信息</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">计划编号</span>
                          <p className="font-medium font-mono">{selectedPlan.planCode}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">计划名称</span>
                          <p className="font-medium">{selectedPlan.planName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">计划类型</span>
                          <p className="font-medium">
                            {selectedPlan.planType === "weekly" ? "周计划" : selectedPlan.planType === "monthly" ? "月计划" : "自定义"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">状态</span>
                          <div className="mt-1">
                            <Badge
                              variant={statusMap[selectedPlan.status]?.variant || "outline"}
                              className={statusMap[selectedPlan.status]?.color || ""}
                            >
                              {statusMap[selectedPlan.status]?.label || String(selectedPlan.status ?? "-")}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">计划周期</span>
                          <p className="font-medium">{formatDateValue(selectedPlan.startDate)} ~ {formatDateValue(selectedPlan.endDate)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">创建人</span>
                          <p className="font-medium">{selectedPlan.createdBy}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">创建时间</span>
                          <p className="font-medium">{formatDateValue(selectedPlan.createdAt)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 统计摘要 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Package className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                        <div className="text-2xl font-bold">{selectedOrders.length}</div>
                        <div className="text-sm text-muted-foreground">生产订单</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <TrendingUp className="h-8 w-8 mx-auto text-green-500 mb-2" />
                        <div className="text-2xl font-bold">{selectedMaterials.length}</div>
                        <div className="text-sm text-muted-foreground">物料项目</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                        <div className="text-2xl font-bold text-red-600">
                          {selectedMaterials.filter((m: any) => m.urgency === "high").length}
                        </div>
                        <div className="text-sm text-muted-foreground">紧急物料</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <CheckCircle className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                        <div className="text-2xl font-bold">
                          {selectedMaterials.filter((m: any) => m.suggestedAction === "purchase").length}
                        </div>
                        <div className="text-sm text-muted-foreground">需采购</div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="production">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">关联生产订单</CardTitle>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        添加订单
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {selectedOrders.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>订单编号</TableHead>
                              <TableHead>产品编码</TableHead>
                              <TableHead>产品名称</TableHead>
                              <TableHead className="text-right">计划数量</TableHead>
                              <TableHead>计划日期</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedOrders.map((order: any) => (
                              <TableRow key={order.id}>
                                <TableCell className="font-mono">{order.orderCode}</TableCell>
                                <TableCell className="font-mono">{order.productCode}</TableCell>
                                <TableCell className="font-medium">{order.productName}</TableCell>
                                <TableCell className="text-right">{order.quantity?.toLocaleString?.() ?? "0"}</TableCell>
                                <TableCell>{formatDateValue(order.plannedDate)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          暂无关联生产订单
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="materials">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">物料需求清单</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          导出Excel
                        </Button>
                        {selectedMaterials.filter((m: any) => m.suggestedAction === "purchase" && m.netRequirement > 0).length > 0 && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleGeneratePurchaseRequest(selectedPlan)}>
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            一键生成采购申请单
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedMaterials.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>物料编码</TableHead>
                                <TableHead>物料名称</TableHead>
                                <TableHead>规格</TableHead>
                                <TableHead className="text-right">需求量</TableHead>
                                <TableHead className="text-right">库存量</TableHead>
                                <TableHead className="text-right">在途量</TableHead>
                                <TableHead className="text-right">净需求</TableHead>
                                <TableHead>紧急程度</TableHead>
                                <TableHead>建议操作</TableHead>
                                <TableHead>建议下单日期</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedMaterials.map((mat: any) => (
                                <TableRow key={mat.id}>
                                  <TableCell className="font-mono">{mat.materialCode}</TableCell>
                                  <TableCell className="font-medium">{mat.materialName}</TableCell>
                                  <TableCell>{mat.spec}</TableCell>
                                  <TableCell className="text-right">{mat.requiredQty?.toLocaleString?.() ?? "0"} {mat.unit}</TableCell>
                                  <TableCell className="text-right">{mat.onHandQty?.toLocaleString?.() ?? "0"}</TableCell>
                                  <TableCell className="text-right">{mat.onOrderQty?.toLocaleString?.() ?? "0"}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {mat.netRequirement > 0 ? (
                                      <span className="text-red-600">{mat.netRequirement?.toLocaleString?.() ?? "0"}</span>
                                    ) : (
                                      <span className="text-green-600">0</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={urgencyMap[mat.urgency]?.color || "text-gray-600"}>
                                      {urgencyMap[mat.urgency]?.label || String(mat.urgency ?? "-")}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <span className={actionMap[mat.suggestedAction]?.color || "text-gray-600"}>
                                      {actionMap[mat.suggestedAction]?.label || String(mat.suggestedAction ?? "-")}
                                    </span>
                                  </TableCell>
                                  <TableCell>{formatDateValue(mat.suggestedOrderDate)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          请先运行MRP计算以生成物料需求
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                    </>
                  );
                })()}
              </Tabs>
            )}
          </DraggableDialogContent>
        </DraggableDialog>
      </div>

      {/* 生产部门前置确认对话框 */}
      <DraggableDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DraggableDialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-amber-500" />
              生产部门确认 — 生成采购申请单
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              系统将根据 MRP 计划 <span className="font-semibold text-foreground">{pendingMRPPlan?.planCode}</span> 中净需求大于零的物料，自动生成采购申请单。
            </p>
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <strong>生产部门确认事项：</strong>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>已核实生产计划数量准确无误</li>
                <li>已确认 BOM 清单中的物料规格和用量</li>
                <li>已核查现有库存和在途量数据</li>
              </ul>
            </div>
            <p className="text-sm">确认后，采购申请单将进入采购部门审核流程。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>取消</Button>
            <Button
              onClick={handleConfirmAndGenerate}
              disabled={createMaterialRequestMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {createMaterialRequestMutation.isPending ? "生成中..." : "确认并生成采购申请单"}
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>
    </ERPLayout>
  );
}
