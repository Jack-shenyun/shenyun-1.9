import ERPLayout from "@/components/ERPLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatDateValue } from "@/lib/formatters";
import { Bell, CheckSquare, PlayCircle, Search, Send, ArrowRight, ClipboardList, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type WorkflowTab = "todo" | "created" | "processed" | "cc";

type WorkflowCenterItem = {
  id: string;
  tab: WorkflowTab;
  sourceType: "sales_order" | "purchase_order" | "expense_reimbursement" | "workflow_approval" | "finance_receipt" | "finance_payable" | "quality_iqc" | "quality_iqc_review" | "quality_oqc" | "material_requisition" | "warehouse_production_in" | "operation_log";
  module: string;
  formType: string;
  title: string;
  documentNo: string;
  targetName: string;
  applicantName: string;
  currentStep: string;
  statusLabel: string;
  amountText: string;
  itemCountText?: string;
  createdAt: string | Date | null;
  routePath: string;
  description: string;
  sourceId?: number | null;
  sourceTable?: string | null;
  runId?: number | null;
  todoMetaId?: string | null;
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
  const [deleteTarget, setDeleteTarget] = useState<WorkflowCenterItem | null>(null);
  const { user } = useAuth();
  const trpcUtils = trpc.useUtils();
  const activeTab = useMemo(() => readTabFromLocation(location), [location]);
  const isAdmin = String((user as any)?.role || "") === "admin" || Boolean((user as any)?.isCompanyAdmin);
  const workflowScopeKey = useMemo(
    () =>
      [
        Number((user as any)?.id || 0),
        Number((user as any)?.companyId || 0),
        Number((user as any)?.homeCompanyId || 0),
        String((user as any)?.role || ""),
      ].join(":"),
    [user]
  );

  const { data, isLoading, error, refetch } = trpc.workflowCenter.list.useQuery(
    {
      tab: activeTab,
      search: searchTerm.trim() || undefined,
      limit: 200,
      scopeKey: workflowScopeKey,
    },
    {
      enabled: Number((user as any)?.id || 0) > 0,
      refetchOnMount: "always",
      refetchOnReconnect: "always",
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  );
  const deleteMutation = trpc.workflowCenter.delete.useMutation({
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success("待办已删除");
      await trpcUtils.workflowCenter.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "删除失败");
    },
  });

  const counters = data?.counters ?? { myTodo: 0, myCreated: 0, myProcessed: 0, ccToMe: 0 };
  const items = (data?.items ?? []) as WorkflowCenterItem[];
  const currentTabCount =
    activeTab === "todo"
      ? items.length
      : Math.max(getCountByTab(counters, activeTab), items.length);

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

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync({
      sourceType: deleteTarget.sourceType,
      sourceId: deleteTarget.sourceId == null ? undefined : Number(deleteTarget.sourceId),
      sourceTable: deleteTarget.sourceTable || undefined,
      runId: deleteTarget.runId == null ? undefined : Number(deleteTarget.runId),
      todoMetaId: deleteTarget.todoMetaId || undefined,
    });
  };

  return (
    <ERPLayout>
      <div className="space-y-3.5">
        <div className="flex flex-col gap-2.5 rounded-3xl border border-slate-200/80 bg-white/95 p-4.5 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.22)] md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 text-white shadow-lg shadow-sky-100">
                <ClipboardList className="h-4.5 w-4.5" />
              </div>
              <div>
                <h1 className="text-[18px] font-bold tracking-tight text-slate-900">待办中心</h1>
                <p className="text-[11px] text-slate-500">统一查看我的待办、我发起的、我处理的和抄送记录</p>
              </div>
            </div>
          </div>

          <div className="relative w-full md:w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索单号、客户、流程..."
              className="h-9 rounded-2xl border-slate-200 bg-slate-50 pl-9 text-[13px]"
            />
          </div>
        </div>

        <Card className="rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.2)]">
          <CardHeader className="gap-2.5 border-b border-slate-100 pb-3.5 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-[17px] font-bold text-slate-900">
                {TAB_CONFIG.find((tab) => tab.value === activeTab)?.label ?? "我的待办"}
              </CardTitle>
              <p className="mt-1 text-[11px] text-slate-500">
                当前共 {currentTabCount} 条，点击记录可直接进入详情
              </p>
            </div>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="h-9 rounded-2xl bg-slate-100/90 p-1">
                {TAB_CONFIG.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="rounded-2xl px-3.5 text-[11px] font-semibold">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex min-h-[220px] items-center justify-center text-[11px] text-slate-500">
                正在加载流程数据...
              </div>
            ) : error ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-amber-200 bg-amber-50/60 px-6 text-center">
                <ClipboardList className="mb-3 h-10 w-10 text-amber-300" />
                <p className="text-[13px] font-semibold text-amber-900">待办加载失败</p>
                <p className="mt-1 text-[11px] text-amber-700">
                  {error.message || "当前待办数据没有成功取回，请重新加载一次。"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-xl border-amber-200 bg-white text-[11px] text-amber-800 hover:bg-amber-50"
                  onClick={() => refetch()}
                >
                  重新加载
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
                <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-[13px] font-semibold text-slate-700">暂无记录</p>
                <p className="mt-1 text-[11px] text-slate-500">当前标签下还没有符合条件的流程</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenItem(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleOpenItem(item);
                      }
                    }}
                    className="group w-full rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-white to-slate-50 px-4 py-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-2.5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-medium">
                            {item.module}
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-medium">
                            {item.formType}
                          </Badge>
                          <Badge className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white">
                            {item.statusLabel}
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="text-[15px] font-semibold text-slate-900">
                            {item.title}
                          </h3>
                          <span className="font-mono text-[11px] text-slate-500">{item.documentNo}</span>
                          {item.amountText ? (
                            <span className="text-[13px] font-semibold text-emerald-600">{item.amountText}</span>
                          ) : null}
                        </div>

                        <div className="mt-1.5 grid gap-2 text-[11px] text-slate-600 md:grid-cols-2 xl:grid-cols-5">
                          <div>对象：{item.targetName || "-"}</div>
                          <div>金额：{item.amountText || "-"}</div>
                          <div>物料：{item.itemCountText || "-"}</div>
                          <div>发起人：{item.applicantName || "-"}</div>
                          <div>当前环节：{item.currentStep || "-"}</div>
                          <div>时间：{formatDateValue(item.createdAt)}</div>
                        </div>

                        <p className="mt-1.5 line-clamp-2 text-[11px] text-slate-500">
                          {item.description || "点击进入详情查看完整流程信息"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeTab === "todo" && isAdmin && item.sourceType !== "operation_log" && item.sourceType !== "quality_iqc_review" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-xl border-red-200 px-2.5 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setDeleteTarget(item);
                            }}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            删除
                          </Button>
                        ) : null}
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                          <span>进入详情</span>
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除待办</AlertDialogTitle>
            <AlertDialogDescription>
              将删除待办「{deleteTarget?.title || "-"}」，并同步删除或取消其对应来源记录。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteItem();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ERPLayout>
  );
}
