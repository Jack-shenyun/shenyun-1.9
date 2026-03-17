import { useState } from "react";
import { formatDate } from "@/lib/formatters";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  FileText,
  Download,
  Calendar,
  ArrowRight,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Report {
  name: string;
  description: string;
  type: string;
}

interface ReportCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  reports: Report[];
}

const reportCategories: ReportCategory[] = [
  {
    title: "销售报表",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
    reports: [
      { name: "销售日报", description: "每日销售数据汇总", type: "sales_daily" },
      { name: "销售月报", description: "月度销售分析报告", type: "sales_monthly" },
      { name: "客户销售排名", description: "客户销售额排行榜", type: "customer_ranking" },
      { name: "产品销售分析", description: "各产品销售情况分析", type: "product_sales" },
    ],
  },
  {
    title: "采购报表",
    icon: BarChart3,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    reports: [
      { name: "采购月报", description: "月度采购数据汇总", type: "purchase_monthly" },
      { name: "供应商采购分析", description: "各供应商采购情况", type: "supplier_analysis" },
      { name: "采购价格趋势", description: "主要物料价格变化", type: "price_trend" },
      { name: "采购执行率", description: "采购计划完成情况", type: "purchase_execution" },
    ],
  },
  {
    title: "库存报表",
    icon: PieChart,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    reports: [
      { name: "库存台账", description: "当前库存明细清单", type: "inventory_ledger" },
      { name: "库存周转分析", description: "库存周转率分析", type: "inventory_turnover" },
      { name: "库龄分析", description: "库存账龄分布情况", type: "inventory_age" },
      { name: "安全库存预警", description: "低于安全库存的物料", type: "safety_stock" },
    ],
  },
  {
    title: "财务报表",
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    reports: [
      { name: "资产负债表", description: "企业财务状况报表", type: "balance_sheet" },
      { name: "利润表", description: "经营成果分析报表", type: "income_statement" },
      { name: "现金流量表", description: "现金流入流出分析", type: "cash_flow" },
      { name: "应收账龄分析", description: "应收款账龄分布", type: "receivable_age" },
    ],
  },
];

export default function ReportsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  
  const [reportParams, setReportParams] = useState({
    startDate: "",
    endDate: "",
    format: "excel",
  });

  const [globalPeriod, setGlobalPeriod] = useState({
    startDate: new Date().toISOString().slice(0, 7) + "-01",
    endDate: new Date().toISOString().split("T")[0],
  });

  const handleReportClick = (report: Report) => {
    setSelectedReport(report);
    setReportParams({
      startDate: globalPeriod.startDate,
      endDate: globalPeriod.endDate,
      format: "excel",
    });
    setDialogOpen(true);
  };

  const handleGenerateReport = async () => {
    if (!reportParams.startDate || !reportParams.endDate) {
      toast.error("请选择报表期间");
      return;
    }

    setGenerating(true);
    
    // 模拟报表生成
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setGenerating(false);
    setDialogOpen(false);
    
    toast.success(`${selectedReport?.name}已生成`, {
      description: `报表期间: ${reportParams.startDate} 至 ${reportParams.endDate}`,
      action: {
        label: "下载",
        onClick: () => {
          toast.info("报表下载中...");
        },
      },
    });
  };

  const handleBatchExport = () => {
    toast.success("批量导出任务已创建", {
      description: "系统将在后台生成所有报表，完成后会通知您",
    });
  };

  const handleSavePeriod = () => {
    setPeriodDialogOpen(false);
    toast.success("报表期间已更新");
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">报表中心</h2>
              <p className="text-sm text-muted-foreground">
                生成和查看各类业务分析报表
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPeriodDialogOpen(true)}>
              <Calendar className="h-4 w-4 mr-1" />
              选择期间
            </Button>
            <Button size="sm" onClick={handleBatchExport}>
              <Download className="h-4 w-4 mr-1" />
              批量导出
            </Button>
          </div>
        </div>

        {/* 当前期间显示 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">当前报表期间:</span>
                <span className="font-medium">{formatDate(globalPeriod.startDate)} 至 {formatDate(globalPeriod.endDate)}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPeriodDialogOpen(true)}>
                修改
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 报表分类 */}
        <div className="grid gap-6 md:grid-cols-2">
          {reportCategories.map((category, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.bgColor}`}>
                    <category.icon className={`h-5 w-5 ${category.color}`} />
                  </div>
                  <CardTitle className="text-base">{category.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.reports.map((report, reportIndex) => (
                    <div
                      key={reportIndex}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => handleReportClick(report)}
                    >
                      <div>
                        <p className="font-medium text-sm">{report.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 快速统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">本月数据概览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <div className="p-4 rounded-lg bg-green-50">
                <p className="text-sm text-muted-foreground">销售收入</p>
                <p className="text-2xl font-bold text-green-600">¥1.23M</p>
                <p className="text-xs text-green-600">↑ 12.5% vs 上月</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50">
                <p className="text-sm text-muted-foreground">采购支出</p>
                <p className="text-2xl font-bold text-blue-600">¥580K</p>
                <p className="text-xs text-blue-600">↓ 5.2% vs 上月</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50">
                <p className="text-sm text-muted-foreground">库存金额</p>
                <p className="text-2xl font-bold text-amber-600">¥2.1M</p>
                <p className="text-xs text-amber-600">周转率 4.2</p>
              </div>
              <div className="p-4 rounded-lg bg-purple-50">
                <p className="text-sm text-muted-foreground">毛利率</p>
                <p className="text-2xl font-bold text-purple-600">38.5%</p>
                <p className="text-xs text-purple-600">↑ 2.1% vs 上月</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 报表生成对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>生成报表</DialogTitle>
              <DialogDescription>
                {selectedReport?.name} - {selectedReport?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始日期</Label>
                  <Input
                    type="date"
                    value={reportParams.startDate}
                    onChange={(e) => setReportParams({ ...reportParams, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束日期</Label>
                  <Input
                    type="date"
                    value={reportParams.endDate}
                    onChange={(e) => setReportParams({ ...reportParams, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>导出格式</Label>
                <Select
                  value={reportParams.format}
                  onValueChange={(value) => setReportParams({ ...reportParams, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel (.xlsx)
                      </div>
                    </SelectItem>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF (.pdf)
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        CSV (.csv)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  报表将根据选定的期间和格式生成，生成完成后可直接下载。
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleGenerateReport} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    生成报表
                  </>
                )}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 期间选择对话框 */}
        <DraggableDialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>选择报表期间</DialogTitle>
              <DialogDescription>
                设置默认的报表查询期间
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开始日期</Label>
                  <Input
                    type="date"
                    value={globalPeriod.startDate}
                    onChange={(e) => setGlobalPeriod({ ...globalPeriod, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>结束日期</Label>
                  <Input
                    type="date"
                    value={globalPeriod.endDate}
                    onChange={(e) => setGlobalPeriod({ ...globalPeriod, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    setGlobalPeriod({
                      startDate: start.toISOString().split("T")[0],
                      endDate: now.toISOString().split("T")[0],
                    });
                  }}
                >
                  本月
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const end = new Date(now.getFullYear(), now.getMonth(), 0);
                    setGlobalPeriod({
                      startDate: start.toISOString().split("T")[0],
                      endDate: end.toISOString().split("T")[0],
                    });
                  }}
                >
                  上月
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), 0, 1);
                    setGlobalPeriod({
                      startDate: start.toISOString().split("T")[0],
                      endDate: now.toISOString().split("T")[0],
                    });
                  }}
                >
                  本年
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear() - 1, 0, 1);
                    const end = new Date(now.getFullYear() - 1, 11, 31);
                    setGlobalPeriod({
                      startDate: start.toISOString().split("T")[0],
                      endDate: end.toISOString().split("T")[0],
                    });
                  }}
                >
                  上年
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPeriodDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSavePeriod}>
                确定
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
