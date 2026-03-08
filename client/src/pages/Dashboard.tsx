import { formatDate, formatDateTime } from "@/lib/formatters";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { readRecentVisits, type RecentVisitItem } from "@/constants/recentVisits";
import { parseVisibleAppIds, WORKBENCH_APP_ENTRIES } from "@/constants/workbenchApps";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Bell,
  Search,
  Settings,
  ChevronRight,
  Clock,
  CheckCircle2,
  FileText,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getLoginUrl } from "@/const";
import shenyunLogo from "@/assets/2ac420a999cddd5f145a62155f78b13e.png";

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

function parseDepartments(raw: unknown): string[] {
  const value = String(raw ?? "").trim();
  if (!value) return [];
  return value
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Odoo 风格 SVG 图标 - 每个模块一个精美渐变图标
const APP_ICONS: Record<string, React.FC<{ className?: string }>> = {
  admin: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#admin_bg)"/>
      <defs>
        <linearGradient id="admin_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#667eea"/>
          <stop offset="1" stopColor="#764ba2"/>
        </linearGradient>
      </defs>
      <path d="M32 14C26.477 14 22 18.477 22 24C22 27.512 23.78 30.61 26.5 32.45V36H37.5V32.45C40.22 30.61 42 27.512 42 24C42 18.477 37.523 14 32 14Z" fill="white" fillOpacity="0.9"/>
      <rect x="24" y="38" width="16" height="3" rx="1.5" fill="white" fillOpacity="0.7"/>
      <rect x="26" y="43" width="12" height="3" rx="1.5" fill="white" fillOpacity="0.5"/>
    </svg>
  ),
  investment: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#inv_bg)"/>
      <defs>
        <linearGradient id="inv_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#11998e"/>
          <stop offset="1" stopColor="#38ef7d"/>
        </linearGradient>
      </defs>
      <path d="M20 32C20 32 24 24 32 24C40 24 44 32 44 32C44 32 40 40 32 40C24 40 20 32 20 32Z" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
      <circle cx="32" cy="32" r="5" fill="white" fillOpacity="0.9"/>
      <path d="M26 20L32 16L38 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7"/>
    </svg>
  ),
  sales: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#sales_bg)"/>
      <defs>
        <linearGradient id="sales_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f093fb"/>
          <stop offset="1" stopColor="#f5576c"/>
        </linearGradient>
      </defs>
      <path d="M18 20H22L26 38H42L46 26H26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.9"/>
      <circle cx="28" cy="43" r="3" fill="white" fillOpacity="0.9"/>
      <circle cx="40" cy="43" r="3" fill="white" fillOpacity="0.9"/>
      <path d="M30 30L33 33L38 27" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8"/>
    </svg>
  ),
  rd: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#rd_bg)"/>
      <defs>
        <linearGradient id="rd_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4facfe"/>
          <stop offset="1" stopColor="#00f2fe"/>
        </linearGradient>
      </defs>
      <path d="M28 16V20M36 16V20M24 28H20M24 36H20M44 28H40M44 36H40" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7"/>
      <rect x="24" y="22" width="16" height="20" rx="3" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
      <circle cx="32" cy="32" r="4" fill="white" fillOpacity="0.9"/>
      <path d="M30 32L32 34L35 30" stroke="url(#rd_bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  production: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#prod_bg)"/>
      <defs>
        <linearGradient id="prod_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fa709a"/>
          <stop offset="1" stopColor="#fee140"/>
        </linearGradient>
      </defs>
      <rect x="16" y="30" width="10" height="18" rx="2" fill="white" fillOpacity="0.9"/>
      <rect x="29" y="22" width="10" height="26" rx="2" fill="white" fillOpacity="0.8"/>
      <rect x="42" y="16" width="6" height="32" rx="2" fill="white" fillOpacity="0.7"/>
      <path d="M16 28L22 22L29 26L38 18L48 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
    </svg>
  ),
  "batch-records": ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#batch_bg)"/>
      <defs>
        <linearGradient id="batch_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a18cd1"/>
          <stop offset="1" stopColor="#fbc2eb"/>
        </linearGradient>
      </defs>
      <rect x="20" y="16" width="24" height="32" rx="3" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
      <path d="M26 24H38M26 30H38M26 36H34" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.8"/>
      <circle cx="42" cy="42" r="8" fill="url(#batch_bg)"/>
      <path d="M39 42L41 44L45 40" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  quality: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#quality_bg)"/>
      <defs>
        <linearGradient id="quality_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#43e97b"/>
          <stop offset="1" stopColor="#38f9d7"/>
        </linearGradient>
      </defs>
      <path d="M32 14L36.5 24H48L38.5 30.5L42 42L32 35.5L22 42L25.5 30.5L16 24H27.5L32 14Z" fill="white" fillOpacity="0.9"/>
    </svg>
  ),
  purchase: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#purchase_bg)"/>
      <defs>
        <linearGradient id="purchase_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f77062"/>
          <stop offset="1" stopColor="#fe5196"/>
        </linearGradient>
      </defs>
      <rect x="14" y="28" width="36" height="22" rx="3" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
      <path d="M22 28V24C22 19.582 25.582 16 30 16H34C38.418 16 42 19.582 42 24V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeOpacity="0.8"/>
      <circle cx="32" cy="39" r="4" fill="white" fillOpacity="0.9"/>
    </svg>
  ),
  warehouse: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#wh_bg)"/>
      <defs>
        <linearGradient id="wh_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#30cfd0"/>
          <stop offset="1" stopColor="#330867"/>
        </linearGradient>
      </defs>
      <path d="M14 32L32 18L50 32V48H14V32Z" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
      <rect x="26" y="36" width="12" height="12" rx="1" fill="white" fillOpacity="0.9"/>
      <path d="M22 32H28V38H22V32ZM36 32H42V38H36V32Z" fill="white" fillOpacity="0.6"/>
    </svg>
  ),
  finance: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#finance_bg)"/>
      <defs>
        <linearGradient id="finance_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fddb92"/>
          <stop offset="1" stopColor="#d1fdff"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="16" stroke="#b8860b" strokeWidth="2.5" fill="none" strokeOpacity="0.6"/>
      <path d="M32 20V24M32 40V44M26 26.5C26 26.5 26 24 32 24C38 24 38 28 32 32C26 36 26 40 32 40C38 40 38 37.5 38 37.5" stroke="#b8860b" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.9"/>
    </svg>
  ),
  settings: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#settings_bg)"/>
      <defs>
        <linearGradient id="settings_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#868f96"/>
          <stop offset="1" stopColor="#596164"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="7" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
      <path d="M32 14V18M32 46V50M14 32H18M46 32H50M19.515 19.515L22.343 22.343M41.657 41.657L44.485 44.485M44.485 19.515L41.657 22.343M22.343 41.657L19.515 44.485" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.8"/>
    </svg>
  ),
  "mail-collaboration": ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#mail_bg)"/>
      <defs>
        <linearGradient id="mail_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4481eb"/>
          <stop offset="1" stopColor="#04befe"/>
        </linearGradient>
      </defs>
      <rect x="14" y="22" width="36" height="24" rx="3" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
      <path d="M14 26L32 36L50 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.8"/>
    </svg>
  ),
  "website-management": ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#web_bg)"/>
      <defs>
        <linearGradient id="web_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6a11cb"/>
          <stop offset="1" stopColor="#2575fc"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="16" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
      <path d="M16 32H48M32 16C32 16 26 22 26 32C26 42 32 48 32 48M32 16C32 16 38 22 38 32C38 42 32 48 32 48" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7"/>
    </svg>
  ),
  "lead-marketing": ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#marketing_bg)"/>
      <defs>
        <linearGradient id="marketing_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f953c6"/>
          <stop offset="1" stopColor="#b91d73"/>
        </linearGradient>
      </defs>
      <path d="M18 38V26L44 18V46L18 38Z" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
      <path d="M18 38L14 44" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.8"/>
      <path d="M26 36C26 36 28 42 32 42C36 42 38 36 38 36" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7"/>
    </svg>
  ),
};

// 默认图标
const DefaultIcon: React.FC<{ className?: string; color: string }> = ({ className, color }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="14" fill={color}/>
    <circle cx="32" cy="32" r="12" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
  </svg>
);

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

  const allowedRecentPrefixes = useMemo(() => {
    const sourceMenuIds = configuredVisibleAppIds.length > 0
      ? visibleApps.map((item) => item.menuId)
      : userRole === "admin"
        ? Object.keys(MENU_PATH_PREFIXES)
        : Array.from(allowedMenuIds);
    return Array.from(new Set(sourceMenuIds)).flatMap((menuId) => MENU_PATH_PREFIXES[menuId] ?? []);
  }, [allowedMenuIds, configuredVisibleAppIds, userRole, visibleApps]);

  useEffect(() => {
    const syncRecent = () => {
      const userRecentVisits = readRecentVisits(user).filter((item) =>
        allowedRecentPrefixes.some((prefix) => item.path.startsWith(prefix))
      );
      setRecentVisits(userRecentVisits.slice(0, 8));
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

  const { data: todoData } = trpc.workflowCenter.list.useQuery(
    { tab: "todo", limit: 5 },
    { refetchInterval: 60_000 }
  );
  // workflowCenter.list 返回的是对象，其中包含 items 数组
  const todoItems: any[] = Array.isArray(todoData)
    ? todoData
    : Array.isArray((todoData as any)?.items)
      ? (todoData as any).items
      : [];

  const userName = String((user as any)?.name ?? "U");
  const userEmail = String((user as any)?.email ?? "");
  const userAvatarUrl = String((user as any)?.avatarUrl ?? "");
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "#ffffff",
      }}
    >
      {/* Odoo 风格顶部导航栏 */}
      <header
        className="sticky top-0 z-50 flex h-12 items-center justify-between px-4 md:px-6"
        style={{
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {/* 左侧 Logo */}
        <div className="flex items-center gap-3">
          <img src={shenyunLogo} alt="SHENYUN" className="h-6 w-auto object-contain" />
          <span className="text-sm font-semibold text-slate-700 hidden sm:block">神韵医疗</span>
          <span className="text-xs text-slate-400 hidden md:block">公司管理系统</span>
        </div>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-2">
          {/* 待办铃铛 - Odoo 风格下拉面板 */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/30"
              >
                <Bell className="h-4 w-4 text-slate-600" />
                {workflowCounters.myTodo > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                    {workflowCounters.myTodo > 99 ? "99+" : workflowCounters.myTodo}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-80 rounded-2xl border-0 p-0 shadow-2xl overflow-hidden"
              style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}
            >
              {/* 面板头部 */}
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-white" />
                  <span className="text-sm font-semibold text-white">我的待办</span>
                  {workflowCounters.myTodo > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/30 px-1.5 text-[11px] font-bold text-white">
                      {workflowCounters.myTodo}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/workflow/center?tab=todo")}
                  className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors"
                >
                  查看全部
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* 待办列表 */}
              <div className="bg-white">
                {todoItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <CheckCircle2 className="h-8 w-8 mb-2 text-green-400" />
                    <p className="text-sm font-medium text-slate-500">暂无待办事项</p>
                    <p className="text-xs text-slate-400 mt-0.5">所有事项已处理完毕</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {todoItems.slice(0, 5).map((item: any, idx: number) => (
                      <button
                        key={item.id ?? idx}
                        type="button"
                        onClick={() => navigate("/workflow/center?tab=todo")}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                          <FileText className="h-3.5 w-3.5 text-violet-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {item.title ?? item.orderNo ?? item.docNo ?? "待办事项"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400 truncate">
                            {item.applicantName ?? item.createdByName ?? ""}
                            {item.createdAt ? ` · ${formatDate(item.createdAt)}` : ""}
                          </p>
                        </div>
                        <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 底部快捷统计 */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/80">
                {[
                  { label: "我发起的", count: workflowCounters.myCreated, tab: "created" },
                  { label: "我处理的", count: workflowCounters.myProcessed, tab: "processed" },
                  { label: "抄送我的", count: workflowCounters.ccToMe, tab: "cc" },
                ].map((item) => (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => navigate(`/workflow/center?tab=${item.tab}`)}
                    className="flex flex-col items-center py-2.5 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-base font-bold text-slate-700">{item.count}</span>
                    <span className="text-[11px] text-slate-400">{item.label}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* 用户头像 + 下拉 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 items-center gap-2 rounded-full px-2 transition-colors hover:bg-white/30"
              >
                <span className="hidden sm:block text-xs font-medium text-slate-700">{userName}</span>
                <Avatar className="h-7 w-7 border-2 border-white/60 shadow-sm">
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs font-bold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl border-0 p-1">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-sm font-semibold text-slate-900">{userName}</p>
                <p className="text-xs text-slate-400 truncate">{userEmail}</p>
              </div>
              <DropdownMenuItem
                onClick={() => navigate("/settings/users")}
                className="rounded-lg text-sm cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                系统设置
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { window.location.href = getLoginUrl(); }}
                className="rounded-lg text-sm cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
        {/* 搜索框 */}
        <div className="mb-10 flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              placeholder="搜索应用..."
              className="h-11 rounded-full border-0 bg-white/70 pl-11 pr-4 text-sm shadow-md backdrop-blur-sm focus:bg-white/90 focus:shadow-lg transition-all placeholder:text-slate-400"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
            />
          </div>
        </div>

        {/* 应用网格 */}
        <div className="grid grid-cols-4 gap-6 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7">
          {filteredApps.map((item) => {
            const IconComponent = APP_ICONS[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAppClick(item)}
                className="group flex flex-col items-center gap-2.5 rounded-2xl p-3 transition-all duration-200 hover:bg-white/20 active:scale-95"
              >
                {/* 图标卡片 */}
                <div
                  className="relative overflow-hidden rounded-2xl shadow-md transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl"
                  style={{ width: 72, height: 72 }}
                >
                  {IconComponent ? (
                    <IconComponent className="w-full h-full" />
                  ) : (
                    <DefaultIcon className="w-full h-full" color="#888" />
                  )}
                  {/* 高光效果 */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)",
                    }}
                  />
                </div>
                {/* 标签 */}
                <span className="text-[12px] font-medium text-slate-700 text-center leading-tight max-w-[80px] truncate">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {filteredApps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Search className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">未找到匹配的应用</p>
          </div>
        )}

        {/* 最近使用 */}
        {recentVisits.length > 0 && (
          <div className="mt-14">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-500">最近使用</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {recentVisits.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="group flex flex-col items-start rounded-2xl bg-white/60 px-4 py-3 text-left shadow-sm backdrop-blur-sm transition-all hover:bg-white/90 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-sm font-medium text-slate-800 truncate w-full">
                    {item.parentLabel ? `${item.parentLabel} · ${item.label}` : item.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDateTime(item.visitedAt)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 底部版权 */}
      <footer className="py-4 text-center text-xs text-slate-400/70">
        © 2026 苏州神韵医疗器械有限公司
      </footer>
    </div>
  );
}
