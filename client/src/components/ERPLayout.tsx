import { formatDate, formatDateTime } from "@/lib/formatters";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import {
  readRecentVisits,
  writeRecentVisits,
} from "@/constants/recentVisits";
import shenyunLogo from "@/assets/2ac420a999cddd5f145a62155f78b13e.png";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  FileText,
  Users,
  Handshake,
  ShoppingCart,
  FlaskConical,
  Factory,
  ClipboardCheck,
  Truck,
  Warehouse,
  Calculator,
  ChevronRight,
  Building2,
  UserPlus,
  GraduationCap,
  FileSearch,
  Store,
  Globe,
  Hospital,
  Contact,
  Receipt,
  Ship,
  Package,
  FolderKanban,
  Cog,
  Tags,
  Wrench,
  TestTube,
  PackageSearch,
  ClipboardList,
  Beaker,
  AlertTriangle,
  UserCheck,
  FileInput,
  CreditCard,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  BookOpen,
  Wallet,
  TrendingUp,
  FileSpreadsheet,
  Trash2,
  Bell,
  Activity,
  Settings,
  Hash,
  Languages,
  UserCog,
  History,
  Layers,
  GitBranch,
  ArrowRightLeft,
  Flame,
  PackageOpen,
  AlarmClock,
  BedDouble,
  Navigation,
  Banknote,
  Clock,
  Calendar,
  MapPin,
  Thermometer,
  Settings2,
  Printer,
  QrCode,
  Upload,
  Archive,
  ArrowRight,
  CheckCircle2,
  Mail,
  Target,
  ScrollText,
  PackageCheck,
  FileCheck,
  DollarSign,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

// 菜单配置 - 九大部门模块
const menuConfig = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "首页",
    path: "/",
  },
  {
    id: "admin",
    icon: Building2,
    label: "管理部",
    children: [
      { icon: FileText, label: "文件管理", path: "/admin/documents" },
      { icon: Users, label: "人事管理", path: "/admin/personnel" },
      { icon: GraduationCap, label: "培训管理", path: "/admin/training" },
      { icon: FileSearch, label: "内审管理", path: "/admin/audit" },
      { icon: Banknote, label: "费用报销", path: "/admin/expense" },
      { icon: AlarmClock, label: "加班申请", path: "/admin/overtime" },
      { icon: BedDouble, label: "请假申请", path: "/admin/leave" },
      { icon: Navigation, label: "外出申请", path: "/admin/outing" },
    ],
  },
  {
    id: "investment",
    icon: Handshake,
    label: "招商部",
    children: [
      { icon: Store, label: "首营管理", path: "/investment/dealer" },
      { icon: Globe, label: "挂网管理", path: "/investment/platform" },
      { icon: Hospital, label: "入院管理", path: "/investment/hospital" },
    ],
  },
  {
    id: "sales",
    icon: ShoppingCart,
    label: "销售部",
    children: [
      { icon: Contact, label: "客户管理", path: "/sales/customers" },
      { icon: Receipt, label: "订单管理", path: "/sales/orders" },
      { icon: Ship, label: "报关管理", path: "/sales/customs" },
      { icon: CreditCard, label: "财务协同", path: "/sales/finance-collaboration" },
      { icon: ClipboardCheck, label: "对账管理", path: "/sales/reconciliation" },
    ],
  },
  {
    id: "rd",
    icon: FlaskConical,
    label: "研发部",
    children: [
      { icon: Package, label: "产品管理", path: "/rd/products" },
      { icon: FolderKanban, label: "项目管理", path: "/rd/projects" },
    ],
  },
  {
    id: "production",
    icon: Factory,
    label: "生产部",
    children: [
      { icon: LayoutDashboard, label: "生产计划看板", path: "/production/plan-board" },
      { icon: Cog, label: "生产指令", path: "/production/orders" },
      { icon: PackageOpen, label: "领料单", path: "/production/material-requisition" },
      { icon: ClipboardList, label: "生产记录单", path: "/production/records" },
      { icon: ArrowRightLeft, label: "生产流转单", path: "/production/routing-cards" },
      { icon: Flame, label: "委外灭菌单", path: "/production/sterilization" },
      { icon: Warehouse, label: "生产入库申请", path: "/production/warehouse-entry" },
      { icon: Layers, label: "BOM物料清单", path: "/production/bom" },
      { icon: GitBranch, label: "MRP物料计划", path: "/production/mrp" },
      { icon: Printer, label: "标签打印", path: "/production/udi/print" },
      { icon: Wrench, label: "设备管理", path: "/production/equipment" },
      { icon: Thermometer, label: "生产环境管理", path: "/production/environment" },
      { icon: Settings2, label: "生产工序管理", path: "/production/process" },
    ],
  },
  {
    id: "quality",
    icon: ClipboardCheck,
    label: "质量部",
    children: [
      { icon: TestTube, label: "实验室管理", path: "/quality/lab" },
      { icon: PackageSearch, label: "来料检验", path: "/quality/iqc" },
      { icon: ClipboardList, label: "过程检验", path: "/quality/ipqc" },
      { icon: Beaker, label: "成品检验", path: "/quality/oqc" },
      { icon: Boxes, label: "留样管理", path: "/quality/samples" },
      { icon: AlertTriangle, label: "不良事件", path: "/quality/incidents" },
      { icon: FileCheck, label: "检验要求", path: "/quality/inspection-requirements" },
    ],
  },
  {
    id: "purchase",
    icon: Truck,
    label: "采购部",
    children: [
      { icon: LayoutDashboard, label: "采购计划", path: "/purchase/plan" },
      { icon: UserCheck, label: "供应商管理", path: "/purchase/suppliers" },
      { icon: FileInput, label: "采购执行", path: "/purchase/orders" },
      { icon: ClipboardList, label: "采购申请", path: "/purchase/requests" },
      { icon: PackageCheck, label: "采购到货", path: "/purchase/goods-receipt" },
      { icon: CreditCard, label: "财务协同", path: "/purchase/finance" },
    ],
  },
  {
    id: "warehouse",
    icon: Warehouse,
    label: "仓库管理",
    children: [
      { icon: Warehouse, label: "仓库管理", path: "/warehouse/warehouses" },
      { icon: ArrowDownToLine, label: "入库管理", path: "/warehouse/inbound" },
      { icon: ArrowUpFromLine, label: "出库管理", path: "/warehouse/outbound" },
      { icon: BarChart3, label: "库存控制", path: "/warehouse/inventory" },
      { icon: BookOpen, label: "盘点管理", path: "/warehouse/stocktake" },
    ],
  },
  {
    id: "finance",
    icon: Calculator,
    label: "财务部",
    children: [
      { icon: BookOpen, label: "总账管理", path: "/finance/ledger" },
      { icon: Wallet, label: "应收管理", path: "/finance/receivable" },
      { icon: CreditCard, label: "应付管理", path: "/finance/payable" },
      { icon: Wallet, label: "账户管理", path: "/finance/accounts" },
      { icon: TrendingUp, label: "成本核算", path: "/finance/cost" },
      { icon: FileText, label: "发票管理", path: "/finance/invoice" },
      { icon: Receipt, label: "报销管理", path: "/finance/reimbursement" },
      { icon: DollarSign, label: "费用管理", path: "/finance/expense-management" },
      { icon: FileSpreadsheet, label: "报表中心", path: "/finance/reports" },
    ],
  },
  {
    id: "udi",
    icon: QrCode,
    label: "UDI管理",
    children: [
      { icon: Archive, label: "UDI档案", path: "/production/udi/archive" },
      { icon: QrCode, label: "标签设计器", path: "/production/udi/designer" },
      { icon: Printer, label: "标签打印", path: "/production/udi/print" },
      { icon: Upload, label: "UDI上报", path: "/production/udi/report" },
    ],
  },
  {
    id: "batch-management",
    icon: ScrollText,
    label: "批记录管理",
    children: [
      { icon: FileText, label: "批记录查询", path: "/production/batch-records" },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    label: "系统设置",
    children: [
      { icon: Store, label: "公司信息", path: "/settings/company" },
      { icon: Building2, label: "部门设置", path: "/settings/departments" },
      { icon: Hash, label: "编码设置", path: "/settings/codes" },
      { icon: UserCog, label: "用户设置", path: "/settings/users" },
      { icon: GitBranch, label: "审批流程", path: "/settings/workflows" },
      { icon: Languages, label: "语言设置", path: "/settings/language" },
      { icon: History, label: "操作日志", path: "/settings/logs" },
      { icon: Printer, label: "打印模板", path: "/settings/print-templates" },
      { icon: Mail, label: "邮件通知", path: "/settings/email", adminOnly: true },
      { icon: Trash2, label: "回收箱", path: "/settings/recycle-bin", adminOnly: true },
    ],
  },
];

const DEPARTMENT_MENU_ACCESS: Record<string, string[]> = {
  "管理部": ["admin", "settings", "batch-management"],
  "招商部": ["investment"],
  "销售部": ["sales", "batch-management"],
  "研发部": ["rd"],
  "生产部": ["production", "batch-management"],
  "质量部": ["quality", "batch-management"],
  "采购部": ["purchase"],
  "仓库管理": ["warehouse", "batch-management"],
  "财务部": ["finance", "batch-management"],
};

function parseDepartments(raw: unknown): string[] {
  const value = String(raw ?? "").trim();
  if (!value) return [];
  return value
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const SIDEBAR_WIDTH_KEY = "erp-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 220;
const MAX_WIDTH = 400;

export default function ERPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center text-gray-800">
              医疗器械ERP管理系统
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              请登录以访问系统功能
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all"
          >
            登录系统
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <ERPLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </ERPLayoutContent>
    </SidebarProvider>
  );
}

type ERPLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function ERPLayoutContent({
  children,
  setSidebarWidth,
}: ERPLayoutContentProps) {
  const { user: authUser, logout } = useAuth();
  const user = authUser;
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isHomePage = location === "/";
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const userName = String((user as any)?.name ?? "U");
  const userEmail = String((user as any)?.email ?? "");
  const userAvatarUrl = String((user as any)?.avatarUrl ?? "");
  const userInitial = userName.charAt(0).toUpperCase();
  const { data: todoData } = trpc.workflowCenter.list.useQuery(
    { tab: "todo", limit: 5 },
    { refetchInterval: 60_000 }
  );
  const todoItems: any[] = Array.isArray(todoData)
    ? todoData
    : Array.isArray((todoData as any)?.items)
      ? (todoData as any).items
      : [];
  const todoCount = todoItems.length;
  const userRole = String((user as any)?.role ?? "user");
  const userDepartment = String((user as any)?.department ?? "");
  const userDepartments = useMemo(() => parseDepartments(userDepartment), [userDepartment]);
  const allowedMenuIds = useMemo(() => {
    if (userRole === "admin") return new Set(menuConfig.map((item) => item.id));
    const ids = new Set<string>(["dashboard"]);
    for (const dept of userDepartments) {
      const menuIds = DEPARTMENT_MENU_ACCESS[dept] ?? [];
      for (const menuId of menuIds) ids.add(menuId);
    }
    return ids;
  }, [userRole, userDepartments]);

  const visibleMenuConfig = useMemo(() => {
    return menuConfig
      .filter((item) => allowedMenuIds.has(item.id))
      .map((item) => {
        if (!item.children) return item;
        const children = item.children.filter((child: any) => !child.adminOnly || userRole === "admin");
        return { ...item, children };
      })
      .filter((item) => !item.children || item.children.length > 0);
  }, [allowedMenuIds, userRole]);

  const currentNavMeta = useMemo(() => {
    for (const menu of visibleMenuConfig) {
      if (menu.path && location === menu.path) {
        return { path: menu.path, label: menu.label };
      }
      for (const child of menu.children ?? []) {
        if (location === child.path || location.startsWith(`${child.path}/`)) {
          return {
            path: child.path,
            label: child.label,
            parentLabel: menu.label,
          };
        }
      }
    }
    return null;
  }, [location, visibleMenuConfig]);

  // 根据当前路径自动展开对应菜单
  useEffect(() => {
    const currentMenu = visibleMenuConfig.find(
      (item) => item.children?.some((child) => location.startsWith(child.path)),
    );
    if (!currentMenu) return;
    setOpenMenus((prev) =>
      prev.includes(currentMenu.id) ? prev : [...prev, currentMenu.id],
    );
  }, [location, visibleMenuConfig]);

  // 获取当前页面标题
  const getCurrentPageTitle = () => {
    for (const menu of visibleMenuConfig) {
      if (menu.path === location) return menu.label;
      if (menu.children) {
        const child = menu.children.find((c) => location.startsWith(c.path));
        if (child) return child.label;
      }
    }
    return "首页";
  };

  // URL 越权访问保护：非管理员只能访问本部门可见菜单对应页面
  useEffect(() => {
    if (userRole === "admin") return;
    const visiblePaths = new Set<string>();
    for (const menu of visibleMenuConfig) {
      if (menu.path) visiblePaths.add(menu.path);
      for (const child of menu.children ?? []) visiblePaths.add(child.path);
    }
    const allowed = Array.from(visiblePaths).some((p) => location === p || location.startsWith(`${p}/`));
    if (!allowed) {
      setLocation("/");
    }
  }, [location, setLocation, userRole, visibleMenuConfig]);

  useEffect(() => {
    if (!currentNavMeta) return;
    if (currentNavMeta.path === "/" || currentNavMeta.path === "/login") return;
    const nextItem = {
      ...currentNavMeta,
      visitedAt: Date.now(),
    };
    const history = readRecentVisits(user);
    const nextHistory = [nextItem, ...history.filter((item) => item.path !== nextItem.path)].slice(0, 20);
    writeRecentVisits(nextHistory, user);
  }, [currentNavMeta, user]);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const toggleMenu = (menuId: string) => {
    setOpenMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const redirectToLogin = async () => {
    try {
      await logout();
    } catch {
      // ignore and continue to login page
    }
    window.location.href = getLoginUrl();
  };

  if (isHomePage) {
    return <main className="h-screen w-full flex-1 overflow-hidden">{children}</main>;
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* 全宽顶部导航栏 */}
      <header
        className="flex-none w-full z-50 flex h-12 items-center justify-between px-3 md:px-6"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center gap-2">
          {isMobile && (
            <SidebarTrigger className="h-8 w-8 rounded-lg bg-background" />
          )}
          <div className="flex items-center gap-2">
            <img src={shenyunLogo} alt="SHENYUN" className="h-6 w-auto object-contain" />
            <span className="text-sm font-semibold text-slate-700 hidden sm:block">神韵医疗</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* 桌面端展示所有快捷入口 */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setLocation("/leads/domestic")}
              title="国内获客"
              className="flex h-8 items-center justify-center gap-1 rounded-full px-2 transition-colors hover:bg-green-50 text-slate-600 hover:text-green-700"
            >
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-medium hidden lg:block">国内获客</span>
            </button>
            <button
              type="button"
              onClick={() => setLocation("/leads/overseas")}
              title="海外获客"
              className="flex h-8 items-center justify-center gap-1 rounded-full px-2 transition-colors hover:bg-blue-50 text-slate-600 hover:text-blue-700"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs font-medium hidden lg:block">海外获客</span>
            </button>
            <button
              type="button"
              onClick={() => setLocation("/whatsapp")}
              title="WhatsApp"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#e8fdf0] text-slate-600 hover:text-[#25D366]"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLocation("/prospect")}
              title="获客情报"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
            >
              <Target className="h-4 w-4 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={() => setLocation("/mail")}
              title="邮件协同"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
            >
              <Mail className="h-4 w-4 text-slate-600" />
            </button>
          </div>
          {/* 手机端：更多菜单（折叠快捷入口） */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex sm:hidden h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100 text-slate-600"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl border-0 p-1">
              <DropdownMenuItem onClick={() => setLocation("/leads/domestic")} className="rounded-lg text-sm cursor-pointer gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                国内获客
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/leads/overseas")} className="rounded-lg text-sm cursor-pointer gap-2">
                <Globe className="h-4 w-4 text-blue-600" />
                海外获客
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/whatsapp")} className="rounded-lg text-sm cursor-pointer gap-2">
                <MessageCircle className="h-4 w-4 text-green-500" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/prospect")} className="rounded-lg text-sm cursor-pointer gap-2">
                <Target className="h-4 w-4 text-orange-500" />
                获客情报
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/mail")} className="rounded-lg text-sm cursor-pointer gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                邮件协同
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
              >
                <Bell className="h-5 w-5 text-slate-600" />
                {todoCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                    {todoCount > 99 ? "99+" : todoCount}
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
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-white" />
                  <span className="text-sm font-semibold text-white">我的待办</span>
                  {todoCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/30 px-1.5 text-[11px] font-bold text-white">
                      {todoCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setLocation("/workflow/center?tab=todo")}
                  className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors"
                >
                  查看全部
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
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
                        onClick={() => setLocation("/workflow/center?tab=todo")}
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
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 items-center gap-2 rounded-full px-2 transition-colors hover:bg-slate-100"
              >
                <span className="hidden sm:block text-sm font-medium text-slate-700">{userName}</span>
                <Avatar className="h-8 w-8 border-2 border-white/60 shadow-sm">
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-bold">
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
                onClick={() => setLocation("/settings/users")}
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

      {/* 下方区域：侧边栏 + 内容区 */}
      <div className="flex flex-1 overflow-hidden">
      <div className="relative flex-none" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 !h-[calc(100vh-3.5rem)] !top-14"
          disableTransition={isResizing}
        >
          <SidebarContent className="gap-0">
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <SidebarMenu className="px-2 py-2">
                {visibleMenuConfig.map((item) => {
                  const isActive =
                    item.path === location ||
                    item.children?.some((child) =>
                      location.startsWith(child.path)
                    );
                  const isOpen = openMenus.includes(item.id);

                  if (item.children) {
                    return (
                      <Collapsible
                        key={item.id}
                        open={isOpen}
                        onOpenChange={() => toggleMenu(item.id)}
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.label}
                              className={`h-10 transition-all font-normal ${
                                isActive
                                  ? "bg-accent text-accent-foreground"
                                  : ""
                              }`}
                            >
                              <item.icon
                                className={`h-4 w-4 ${
                                  isActive ? "text-primary" : ""
                                }`}
                              />
                              <span className="flex-1">{item.label}</span>
                              <ChevronRight
                                className={`h-4 w-4 transition-transform duration-200 ${
                                  isOpen ? "rotate-90" : ""
                                }`}
                              />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.children.map((child) => {
                                const isChildActive = location.startsWith(
                                  child.path
                                );
                                return (
                                  <SidebarMenuSubItem key={child.path}>
                                    <SidebarMenuSubButton
                                      onClick={() => setLocation(child.path)}
                                      isActive={isChildActive}
                                      className="h-9"
                                    >
                                      <child.icon className="h-3.5 w-3.5" />
                                      <span>{child.label}</span>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path!)}
                        tooltip={item.label}
                        className="h-10 transition-all font-normal"
                      >
                        <item.icon
                          className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                        />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </ScrollArea>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-teal-500 to-blue-600 text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30 min-h-[calc(100vh-3rem)]">
          {children}
        </main>
      </SidebarInset>
      </div>
    </div>
  );
}
