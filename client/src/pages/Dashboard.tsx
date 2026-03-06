import { useAuth } from "@/_core/hooks/useAuth";
import shenyunLogo from "@/assets/2ac420a999cddd5f145a62155f78b13e.png";
import ERPLayout from "@/components/ERPLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readRecentVisits, type RecentVisitItem } from "@/constants/recentVisits";
import { parseVisibleAppIds, WORKBENCH_APP_ENTRIES } from "@/constants/workbenchApps";
import { WORKBENCH } from "@/constants/uiStandard";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  AlarmClockPlus,
  Bell,
  CalendarMinus2,
  CheckSquare,
  Plane,
  PlayCircle,
  ReceiptText,
  Search,
  Send,
} from "lucide-react";

const DEPARTMENT_MENU_ACCESS: Record<string, string[]> = {
  管理部: ["admin", "settings", "common"],
  招商部: ["investment", "common"],
  销售部: ["sales", "common"],
  研发部: ["rd", "common"],
  生产部: ["production", "common"],
  质量部: ["quality", "common"],
  采购部: ["purchase", "common"],
  仓库管理: ["warehouse", "common"],
  财务部: ["finance", "common"],
};

const MENU_PATH_PREFIXES: Record<string, string[]> = {
  admin: ["/admin/"],
  common: [],
  investment: ["/investment/"],
  sales: ["/sales/"],
  rd: ["/rd/"],
  production: ["/production/"],
  quality: ["/quality/"],
  purchase: ["/purchase/"],
  warehouse: ["/warehouse/"],
  finance: ["/finance/"],
  settings: ["/settings/"],
};

const quickEntryItems = [
  { key: "reimbursement", label: "报销单", icon: ReceiptText, path: "" },
  { key: "overtime", label: "加班申请", icon: AlarmClockPlus, path: "" },
  { key: "leave", label: "请假单", icon: CalendarMinus2, path: "" },
  { key: "outing", label: "外出申请单", icon: Plane, path: "" },
] as const;

const quickEntryStyles = [
  "border-l-sky-300 bg-[linear-gradient(135deg,_rgba(248,250,252,1)_0%,_rgba(240,249,255,0.9)_100%)]",
  "border-l-emerald-300 bg-[linear-gradient(135deg,_rgba(248,250,252,1)_0%,_rgba(236,253,245,0.9)_100%)]",
  "border-l-amber-300 bg-[linear-gradient(135deg,_rgba(248,250,252,1)_0%,_rgba(255,251,235,0.9)_100%)]",
  "border-l-violet-300 bg-[linear-gradient(135deg,_rgba(248,250,252,1)_0%,_rgba(245,243,255,0.92)_100%)]",
] as const;

function parseDepartments(raw: unknown): string[] {
  const value = String(raw ?? "").trim();
  if (!value) return [];
  return value
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: stats } = trpc.dashboard.stats.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const [recentVisits, setRecentVisits] = useState<RecentVisitItem[]>([]);
  const [appSearch, setAppSearch] = useState("");

  const userRole = String((user as any)?.role ?? "user");
  const userDepartments = useMemo(() => parseDepartments((user as any)?.department), [user]);
  const configuredVisibleAppIds = useMemo(() => parseVisibleAppIds((user as any)?.visibleApps), [user]);

  const allowedMenuIds = useMemo(() => {
    if (userRole === "admin") return new Set(WORKBENCH_APP_ENTRIES.map((item) => item.menuId));
    const ids = new Set<string>();
    for (const dept of userDepartments) {
      const menuIds = DEPARTMENT_MENU_ACCESS[dept] ?? [];
      for (const menuId of menuIds) ids.add(menuId);
    }
    return ids;
  }, [userDepartments, userRole]);

  const visibleApps = useMemo(() => {
    if (configuredVisibleAppIds.length > 0) {
      return WORKBENCH_APP_ENTRIES.filter((item) => configuredVisibleAppIds.includes(item.id));
    }
    return WORKBENCH_APP_ENTRIES.filter((item) => allowedMenuIds.has(item.menuId));
  }, [allowedMenuIds, configuredVisibleAppIds]);

  const allowedRecentPrefixes = useMemo(() => {
    const sourceMenuIds = configuredVisibleAppIds.length > 0
      ? visibleApps.map((item) => item.menuId)
      : userRole === "admin"
        ? Object.keys(MENU_PATH_PREFIXES)
        : Array.from(allowedMenuIds);
    return Array.from(new Set(sourceMenuIds)).flatMap((menuId) => MENU_PATH_PREFIXES[menuId] ?? []);
  }, [allowedMenuIds, configuredVisibleAppIds, userRole, visibleApps]);

  const filteredApps = useMemo(() => {
    const keyword = appSearch.trim().toLowerCase();
    if (!keyword) return visibleApps;
    return visibleApps.filter((item) => item.label.toLowerCase().includes(keyword));
  }, [appSearch, visibleApps]);
  const handleAppClick = (item: (typeof WORKBENCH_APP_ENTRIES)[number]) => {
    if (item.path) {
      navigate(item.path);
      return;
    }
    toast.info(`${item.label}功能开发中`);
  };

  useEffect(() => {
    const syncRecent = () => {
      const userRecentVisits = readRecentVisits(user).filter((item) =>
        allowedRecentPrefixes.some((prefix) => item.path.startsWith(prefix))
      );
      setRecentVisits(userRecentVisits.slice(0, 4));
    };
    syncRecent();
    window.addEventListener("focus", syncRecent);
    return () => window.removeEventListener("focus", syncRecent);
  }, [allowedRecentPrefixes, user]);

  const workflowCounters = {
    myTodo: Number((stats as any)?.workflowCounters?.myTodo ?? 0),
    myCreated: Number((stats as any)?.workflowCounters?.myCreated ?? 0),
    myProcessed: Number((stats as any)?.workflowCounters?.myProcessed ?? 0),
    ccToMe: Number((stats as any)?.workflowCounters?.ccToMe ?? 0),
  };

  const quickActions = [
    { label: "我的待办", icon: Bell, count: workflowCounters.myTodo, path: "/workflow/center?tab=todo" },
    { label: "我发起的", icon: PlayCircle, count: workflowCounters.myCreated, path: "/workflow/center?tab=created" },
    { label: "我处理的", icon: CheckSquare, count: workflowCounters.myProcessed, path: "/workflow/center?tab=processed" },
    { label: "抄送我的", icon: Send, count: workflowCounters.ccToMe, path: "/workflow/center?tab=cc" },
  ];
  const handleQuickEntryClick = (item: (typeof quickEntryItems)[number]) => {
    if (item.path) {
      navigate(item.path);
      return;
    }
    toast.info(`${item.label}功能开发中`);
  };
  const getWorkflowBadgeClass = (count: number) =>
    count > 0
      ? WORKBENCH.badge
      : "rounded-full border border-slate-200 bg-white text-slate-400 min-w-7 justify-center tabular-nums shadow-none";

  return (
    <ERPLayout>
      <div className="relative h-full overflow-auto bg-gradient-to-b from-slate-50 to-slate-100/80 p-4 md:p-6">
        {/* 顶部 Header */}
        <header className="mb-6 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-gradient-to-br from-white to-sky-50 p-2.5 shadow-sm ring-1 ring-slate-200/80">
                <img src={shenyunLogo} alt="SHENYUN" className="h-8 w-auto object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
                  神韵医疗
                  <span className="ml-2 text-base font-medium text-slate-500">公司管理系统</span>
                </h1>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                <Avatar className="h-9 w-9 border border-sky-100">
                  <AvatarFallback className="bg-gradient-to-br from-sky-50 to-cyan-100 text-sky-700 font-semibold text-sm">
                    {String((user as any)?.name ?? "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 leading-tight truncate">
                    {String((user as any)?.name ?? "-")}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {String((user as any)?.email ?? "-")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 主体内容 */}
        <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
          {/* 左侧栏 */}
          <div className="space-y-5">
            {/* 工作事项 */}
            <Card className="rounded-2xl border-slate-200/80 shadow-sm">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">工作事项</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">流程中心</span>
                </div>
                <div className="space-y-1.5">
                  {quickActions.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className="group w-full flex items-center justify-between rounded-xl bg-slate-50/60 px-3 py-2.5 text-left transition-all hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
                          <item.icon className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      </div>
                      {typeof item.count === "number" ? (
                        <Badge className={getWorkflowBadgeClass(item.count)}>
                          {item.count}
                        </Badge>
                      ) : null}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 快捷入口 - 手机端隐藏 */}
            <Card className="rounded-2xl border-slate-200/80 shadow-sm hidden md:block">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-bold text-slate-900">快捷入口</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-1">
                <div className="space-y-2">
                  {quickEntryItems.map((item, index) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleQuickEntryClick(item)}
                      className={`group w-full rounded-xl border border-slate-200/80 border-l-4 px-3 py-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${quickEntryStyles[index % quickEntryStyles.length]}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
                          <item.icon className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧主区域 */}
          <div className="space-y-5">
            {/* 我的应用 */}
            <Card className="rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">我的应用</CardTitle>
                  <p className="mt-0.5 text-sm text-slate-500">部门入口与常用模块集中访问</p>
                </div>
                <div className="relative w-full lg:w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    placeholder="搜索应用..."
                    className="h-9 rounded-xl border-slate-200 bg-slate-50/80 pl-9 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-5">
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {filteredApps.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleAppClick(item)}
                      className="group flex flex-col items-center rounded-2xl px-2 py-3 text-center transition-all hover:bg-slate-50"
                    >
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} shadow-md transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg`}>
                        <item.icon className="h-8 w-8 text-white" />
                      </div>
                      <span className="mt-2 text-[13px] font-medium text-slate-700">{item.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 最近使用 - 手机端隐藏 */}
            <Card className="rounded-2xl border-slate-200/80 shadow-sm hidden md:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-slate-900">最近使用</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {recentVisits.length === 0 ? (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-muted-foreground">
                    暂无最近使用
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {recentVisits.slice(0, 4).map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => navigate(item.path)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {item.parentLabel ? `${item.parentLabel} · ${item.label}` : item.label}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(item.visitedAt).toLocaleString("zh-CN")}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="mt-6 py-2 text-center text-xs text-slate-400">
          2026@苏州神韵医疗器械有限公司版权所有
        </footer>
      </div>
    </ERPLayout>
  );
}
