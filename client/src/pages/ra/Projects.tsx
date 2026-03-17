import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import RaLayout from "@/components/RaLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck, Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  Globe, FileText, CheckCircle2, Clock, Send, Archive,
  Lightbulb, ArrowRight, ChevronLeft, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  MARKET_LABELS, STATUS_LABELS, STATUS_COLORS,
  type RaMarket, type RaProjectStatus,
} from "@/data/ra/types";
import { MDR_STATS } from "@/data/ra/mdrTemplates";
import { formatDateValue } from "@/lib/formatters";

const MARKET_BADGE_COLORS: Record<RaMarket, string> = {
  EU_MDR: "bg-blue-100 text-blue-700",
  US_FDA: "bg-red-100 text-red-700",
  CN_NMPA: "bg-green-100 text-green-700",
};

const STATUS_ICONS: Record<RaProjectStatus, React.ReactNode> = {
  planning: <Clock className="w-3 h-3" />,
  in_progress: <FileText className="w-3 h-3" />,
  submitted: <Send className="w-3 h-3" />,
  approved: <CheckCircle2 className="w-3 h-3" />,
  archived: <Archive className="w-3 h-3" />,
};

export default function RaProjectsPage() {
  const [, navigate] = useLocation();
  const { data: projects = [], isLoading, refetch } = trpc.ra.projects.list.useQuery();
  const createMutation = trpc.ra.projects.create.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success("法规项目已创建");
      setDialogOpen(false);
      // 跳转到项目工作台
      navigate(`/ra/workspace/${data.id}`);
    },
  });
  const updateMutation = trpc.ra.projects.update.useMutation({
    onSuccess: () => { refetch(); toast.success("更新成功"); setDialogOpen(false); },
  });
  const deleteMutation = trpc.ra.projects.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("已删除"); },
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    market: "EU_MDR" as RaMarket,
  });
  // 引导模式
  const [guideStep, setGuideStep] = useState<number>(0); // 0=未开始, 1~N=引导步骤, -1=跳过/完成
  const [guideAnswers, setGuideAnswers] = useState<Record<string, string>>({});

  const GUIDE_STEPS = [
    {
      id: "product_name",
      question: "您的产品名称是什么？",
      hint: "例如：一次性腹腔镜套管针、引流管、骨科植入物等",
      placeholder: "请输入产品名称",
    },
    {
      id: "product_purpose",
      question: "该产品的预期用途是什么？",
      hint: "描述产品用于什么临床场景、解决什么问题",
      placeholder: "例如：用于腹腔镜手术中建立操作通道，供外科器械进出腹腔",
    },
    {
      id: "product_material",
      question: "产品的主要材料或成分是什么？",
      hint: "例如：医用级不锈钢、聚丙烯、硅胶、钛合金等",
      placeholder: "请输入主要材料",
    },
    {
      id: "target_market",
      question: "您计划申报哪个市场？",
      hint: "选择目标法规体系，将影响技术文件框架的生成",
      placeholder: "",
      isMarketSelect: true,
    },
  ];

  const handleGuideNext = () => {
    if (guideStep < GUIDE_STEPS.length) {
      setGuideStep(guideStep + 1);
    } else {
      // 引导完成，将引导信息填入项目名称
      const productName = guideAnswers["product_name"] || "";
      const market = (guideAnswers["target_market"] as RaMarket) || "EU_MDR";
      setFormData({
        name: productName ? `${productName} ${MARKET_LABELS[market] || ""} 认证` : "",
        market,
      });
      setGuideStep(-1);
    }
  };

  const handleGuideSkip = () => {
    setGuideStep(-1);
  };

  const allProjects = (projects as any[]);
  const filtered = allProjects.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMarket = marketFilter === "all" || p.market === marketFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchMarket && matchStatus;
  });

  const countByStatus = (s: string) => allProjects.filter((p) => p.status === s).length;

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ name: "", market: "EU_MDR" });
    setGuideStep(0); // 重置到引导起始页
    setGuideAnswers({});
    setDialogOpen(true);
  };

  const handleEdit2 = (p: any) => {
    setEditingId(p.id);
    setFormData({ name: p.name, market: p.market });
    setGuideStep(-1); // 编辑时跳过引导
    setDialogOpen(true);
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setFormData({ name: p.name, market: p.market });
    setGuideStep(-1); // 编辑时跳过引导
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("请填写项目名称");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (p: any) => {
    if (!confirm(`确认删除项目「${p.name}」？此操作不可恢复。`)) return;
    deleteMutation.mutate({ id: p.id });
  };

  const getStepLabel = (step: number) => {
    if (step === 1) return "分类引导";
    if (step === 2) return "产品信息";
    return "文件工作台";
  };

  return (
    <RaLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">法规申报项目</h2>
              <p className="text-sm text-muted-foreground">
                管理 EU MDR / US FDA / CN NMPA 法规申报项目，每个项目包含 {MDR_STATS.documents} 份技术文件、{MDR_STATS.totalSections} 个章节
              </p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新建申报项目
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">项目总数</p>
              <p className="text-2xl font-bold">{allProjects.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">规划中</p>
              <p className="text-2xl font-bold text-gray-600">{countByStatus("planning")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">进行中</p>
              <p className="text-2xl font-bold text-blue-600">{countByStatus("in_progress")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已提交</p>
              <p className="text-2xl font-bold text-amber-600">{countByStatus("submitted")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已获批</p>
              <p className="text-2xl font-bold text-green-600">{countByStatus("approved")}</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索项目名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={marketFilter} onValueChange={setMarketFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="法规体系" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部体系</SelectItem>
                  <SelectItem value="EU_MDR">欧盟 MDR</SelectItem>
                  <SelectItem value="US_FDA">美国 FDA</SelectItem>
                  <SelectItem value="CN_NMPA">中国 NMPA</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="planning">规划中</SelectItem>
                  <SelectItem value="in_progress">进行中</SelectItem>
                  <SelectItem value="submitted">已提交</SelectItem>
                  <SelectItem value="approved">已获批</SelectItem>
                  <SelectItem value="archived">已归档</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 数据表格 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目名称</TableHead>
                  <TableHead>法规体系</TableHead>
                  <TableHead>当前阶段</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShieldCheck className="h-10 w-10 opacity-20" />
                        <p className="text-sm">暂无法规申报项目</p>
                        <Button variant="outline" size="sm" onClick={handleAdd}>
                          <Plus className="h-3 w-3 mr-1" />
                          新建第一个项目
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p: any) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/ra/workspace/${p.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${MARKET_BADGE_COLORS[p.market as RaMarket] || ""}`}
                        >
                          <Globe className="w-3 h-3 mr-1" />
                          {MARKET_LABELS[p.market as RaMarket] || p.market}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          Step {p.currentStep}：{getStepLabel(p.currentStep)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs flex items-center gap-1 w-fit ${STATUS_COLORS[p.status as RaProjectStatus] || ""}`}
                        >
                          {STATUS_ICONS[p.status as RaProjectStatus]}
                          {STATUS_LABELS[p.status as RaProjectStatus] || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateValue(p.updatedAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/ra/workspace/${p.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              进入工作台
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(p)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑信息
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(p)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除项目
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 新建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑法规项目" : "新建法规申报项目"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "修改项目基本信息"
                : guideStep === 0
                ? "创建一个新的法规申报项目，系统将自动生成对应的技术文件框架"
                : guideStep > 0
                ? `引导步骤 ${guideStep} / ${GUIDE_STEPS.length}`
                : "填写项目基本信息"}
            </DialogDescription>
          </DialogHeader>

          {/* ===== 引导入口页（guideStep === 0，仅新建时显示）===== */}
          {!editingId && guideStep === 0 && (
            <div className="py-2 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">建议使用引导模式</p>
                  <p className="text-amber-700">如果您还没有详细的产品信息，推荐使用引导模式，系统将逐步收集关键信息，帮助您快速创建规范的法规申报项目。</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleGuideSkip}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-colors text-center"
                >
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">直接填写</p>
                    <p className="text-xs text-muted-foreground mt-0.5">我已有完整的产品信息</p>
                  </div>
                </button>
                <button
                  onClick={() => setGuideStep(1)}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-primary/40 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center bg-primary/5"
                >
                  <Sparkles className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">使用引导模式</p>
                    <p className="text-xs text-muted-foreground mt-0.5">逐步填写，系统自动整理</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ===== 引导步骤页（guideStep 1~N）===== */}
          {!editingId && guideStep > 0 && guideStep <= GUIDE_STEPS.length && (() => {
            const step = GUIDE_STEPS[guideStep - 1];
            return (
              <div className="py-2 space-y-4">
                {/* 进度条 */}
                <div className="flex gap-1">
                  {GUIDE_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < guideStep ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">{step.question}</Label>
                  <p className="text-xs text-muted-foreground">{step.hint}</p>
                  {step.isMarketSelect ? (
                    <Select
                      value={guideAnswers[step.id] || "EU_MDR"}
                      onValueChange={(v) => setGuideAnswers({ ...guideAnswers, [step.id]: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EU_MDR">🇪🇺 欧盟 MDR (EU) 2017/745</SelectItem>
                        <SelectItem value="US_FDA">🇺🇸 美国 FDA 510(k) / PMA</SelectItem>
                        <SelectItem value="CN_NMPA">🇨🇳 中国 NMPA 医疗器械注册</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={step.placeholder}
                      value={guideAnswers[step.id] || ""}
                      onChange={(e) => setGuideAnswers({ ...guideAnswers, [step.id]: e.target.value })}
                      autoFocus
                    />
                  )}
                </div>
              </div>
            );
          })()}

          {/* ===== 正式表单（guideStep === -1 或编辑模式）===== */}
          {(editingId || guideStep === -1) && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>项目名称 <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="例如：SY-CE02 引流管 首次MDR认证"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>目标法规体系 <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.market}
                  onValueChange={(v) => setFormData({ ...formData, market: v as RaMarket })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EU_MDR">🇪🇺 欧盟 MDR (EU) 2017/745</SelectItem>
                    <SelectItem value="US_FDA">🇺🇸 美国 FDA 510(k) / PMA</SelectItem>
                    <SelectItem value="CN_NMPA">🇨🇳 中国 NMPA 医疗器械注册</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editingId && formData.market === "EU_MDR" && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <p className="font-medium mb-1">将自动生成 MDR 技术文件框架：</p>
                  <p>8大类 · {MDR_STATS.documents} 份文件 · {MDR_STATS.totalSections} 个章节</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {/* 引导入口页：只显示取消 */}
            {!editingId && guideStep === 0 && (
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            )}

            {/* 引导步骤页：上一步 + 下一步/完成 */}
            {!editingId && guideStep > 0 && guideStep <= GUIDE_STEPS.length && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setGuideStep(guideStep - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一步
                </Button>
                <Button onClick={handleGuideNext}>
                  {guideStep < GUIDE_STEPS.length ? (
                    <><ArrowRight className="w-4 h-4 mr-1" />下一步</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-1" />完成引导</>  
                  )}
                </Button>
              </>
            )}

            {/* 正式表单页：取消 + 创建/保存 */}
            {(editingId || guideStep === -1) && (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingId ? "保存修改" : "创建并进入工作台"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RaLayout>
  );
}
