import ERPLayout from "@/components/ERPLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatDateValue } from "@/lib/formatters";
import { Bell, CheckSquare, PlayCircle, Search, Send, ArrowRight, ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type WorkflowTab = "todo" | "created" | "processed" | "cc";

type WorkflowCenterItem = {
  id: string;
  tab: WorkflowTab;
  sourceType: "sales_order" | "finance_receipt" | "operation_log";
  module: string;
  formType: string;
  title: string;
  documentNo: string;
  targetName: string;
  applicantName: string;
  currentStep: string;
  statusLabel: string;
  amountText: string;
  createdAt: string | Date | null;
  routePath: string;
  description: string;
};

const TAB_CONFIG: Array<{
  value: WorkflowTab;
  label: string;
  icon: typeof Bell;
  tone: string;
}> = [
  { value: "todo", label: "我的待办", icon: Bell, tone: "text-rose-600" },
  { value: "created", label: "我发起的", icon: PlayCircle, tone: "text-sky-600" },
  { value: "processed", label: "我处理的", icon: CheckSquare, tone: "text-emerald-600" },
  { value: "cc", label: "抄送我的", icon: Send, tone: "text-violet-600" },
];

function readTabFromLocation(location: string): WorkflowTab {
  const query = location.includes("?") ? location.slice(location.indexOf("?")) : "";
  const raw = new URLSearchParams(query).get("tab");
  return raw === "created" || raw === "processed" || raw === "cc" ? raw : "todo";
}

function getCountByTab(counters: any, tab: WorkflowTab) {
  if (tab === "todo") return Number(counters?.myTodo ?? 0);
  if (tab === "created") return Number(counters?.myCreated ?? 0);
  if (tab === "processed") return Number(counters?.myProcessed ?? 0);
  return Number(counters?.ccToMe ?? 0);
}

export default function WorkflowCenterPage() {
  const [location, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const activeTab = useMemo(() => readTabFromLocation(location), [location]);

  const { data, isLoading } = trpc.workflowCenter.list.useQuery(
    {
      tab: activeTab,
      search: searchTerm.trim() || undefined,
      limit: 200,
    },
    { refetchOnWindowFocus: false },
  );

  const counters = data?.counters ?? { myTodo: 0, myCreated: 0, myProcessed: 0, ccToMe: 0 };
  const items = (data?.items ?? []) as WorkflowCenterItem[];

  const handleTabChange = (tab: string) => {
    const nextTab = tab as WorkflowTab;
    navigate(`/workflow/center?tab=${nextTab}`);
  };

  const handleOpenItem = (item: WorkflowCenterItem) => {
    if (!item.routePath) {
      toast.info("该记录暂无详情入口");
      return;
    }
    navigate(item.routePath);
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.22)] md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 text-white shadow-lg shadow-sky-100">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">待办中心</h1>
                <p className="text-sm text-slate-500">统一查看我的待办、我发起的、我处理的和抄送记录</p>
              </div>
            </div>
          </div>

          <div className="relative w-full md:w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索单号、客户、流程..."
              className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-9"
            />
          </div>
        </div>

        <Card className="rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.2)]">
          <CardHeader className="gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">
                {TAB_CONFIG.find((tab) => tab.value === activeTab)?.label ?? "我的待办"}
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                当前共 {getCountByTab(counters, activeTab)} 条，点击记录可直接进入详情
              </p>
            </div>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="h-11 rounded-2xl bg-slate-100/90 p-1">
                {TAB_CONFIG.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="rounded-2xl px-4 text-sm font-semibold">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">
                正在加载流程数据...
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
                <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-base font-semibold text-slate-700">暂无记录</p>
                <p className="mt-1 text-sm text-slate-500">当前标签下还没有符合条件的流程</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpenItem(item)}
                    className="group w-full rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-white to-slate-50 px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs font-medium">
                            {item.module}
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs font-medium">
                            {item.formType}
                          </Badge>
                          <Badge className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
                            {item.statusLabel}
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {item.title}
                          </h3>
                          <span className="font-mono text-sm text-slate-500">{item.documentNo}</span>
                          {item.amountText ? (
                            <span className="text-sm font-semibold text-emerald-600">{item.amountText}</span>
                          ) : null}
                        </div>

                        <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                          <div>对象：{item.targetName || "-"}</div>
                          <div>发起人：{item.applicantName || "-"}</div>
                          <div>当前环节：{item.currentStep || "-"}</div>
                          <div>时间：{formatDateValue(item.createdAt)}</div>
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                          {item.description || "点击进入详情查看完整流程信息"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <span>进入详情</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}
