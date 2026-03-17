import { formatDate, formatDateTime } from "@/lib/formatters";
import {
  getCompanyMenuIds,
  readActiveCompany,
  writeActiveCompany,
} from "@/lib/activeCompany";
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
import { readRecentVisits, writeRecentVisits } from "@/constants/recentVisits";
import {
  parseVisibleAppIds,
  WORKBENCH_APP_ENTRIES,
} from "@/constants/workbenchApps";
import shenyunLogo from "@/assets/2ac420a999cddd5f145a62155f78b13e.png";
import { useIsMobile } from "@/hooks/useMobile";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  FileText,
  HardDrive,
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
  Stamp,
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
  FileSignature,
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
  ShieldCheck,
  Network,
  ExternalLink,
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
import {
  getFormVisibilityItem,
  parseVisibleFormIds,
} from "@shared/formVisibility";

// 菜单配置 - 九大部门模块
const menuConfig = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "首页",
    path: "/",
  },
  {
    id: "operations-dashboard",
    icon: BarChart3,
    label: "经营看板",
    path: "/boss/dashboard",
    requiredDashboardId: "boss_dashboard",
    hidden: true,
  },
  {
    id: "inventory-board",
    icon: Boxes,
    label: "库存看板",
    path: "/inventory-board",
  },
  {
    id: "admin",
    icon: Building2,
    label: "管理部",
    children: [
      { icon: FileText, label: "文件管理", path: "/admin/file-manager" },
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
      {
        icon: ScrollText,
        label: "授权书管理",
        path: "/investment/authorization",
      },
      { icon: FileCheck, label: "经销商协议", path: "/investment/agreement" },
      { icon: Globe, label: "平台管理", path: "/investment/platform" },
      { icon: ClipboardList, label: "挂网管理", path: "/investment/listing" },
      { icon: Hospital, label: "入院管理", path: "/investment/hospital" },
    ],
  },
  {
    id: "sales",
    icon: ShoppingCart,
    label: "销售部",
    children: [
      {
        icon: LayoutDashboard,
        label: "销售看板",
        path: "/sales/dashboard",
        requiredDashboardId: "sales_dashboard",
      },
      { icon: Contact, label: "客户管理", path: "/sales/customers" },
      { icon: FileText, label: "报价单", path: "/sales/quotes" },
      { icon: Receipt, label: "订单管理", path: "/sales/orders" },
      { icon: Ship, label: "报关管理", path: "/sales/customs" },
      { icon: Hash, label: "HS编码库", path: "/sales/hs-codes" },
      {
        icon: CreditCard,
        label: "财务协同",
        path: "/sales/finance-collaboration",
      },
      {
        icon: ClipboardCheck,
        label: "对账管理",
        path: "/sales/reconciliation",
      },
    ],
  },
  {
    id: "rd",
    icon: FlaskConical,
    label: "研发部",
    children: [
      {
        icon: Package,
        label: "产品管理",
        path: "/rd/products",
        formVisibilityId: "/rd/products",
      },
      { icon: FolderKanban, label: "项目管理", path: "/rd/projects" },
      { icon: FileText, label: "图纸管理", path: "/rd/drawings" },
    ],
  },
  {
    id: "production",
    icon: Factory,
    label: "生产部",
    children: [
      {
        icon: BarChart3,
        label: "生产看板",
        path: "/production/dashboard",
        requiredDashboardId: "production_dashboard",
      },
      {
        icon: LayoutDashboard,
        label: "生产计划看板",
        path: "/production/plan-board",
      },
      { icon: Cog, label: "生产指令", path: "/production/orders" },
      {
        icon: PackageOpen,
        label: "领料单",
        path: "/production/material-requisition",
      },
      { icon: Boxes, label: "暂存区管理", path: "/production/staging-area" },
      { icon: ClipboardList, label: "生产记录单", path: "/production/records" },
      {
        icon: ArrowRightLeft,
        label: "生产流转单",
        path: "/production/routing-cards",
      },
      { icon: Printer, label: "标签打印", path: "/production/udi/print" },
      {
        icon: PackageCheck,
        label: "大包装记录",
        path: "/production/large-packaging",
      },
      {
        icon: AlertTriangle,
        label: "待报废记录",
        path: "/production/pending-scrap-records",
      },
      { icon: Flame, label: "委外灭菌单", path: "/production/sterilization" },
      {
        icon: Warehouse,
        label: "生产入库申请",
        path: "/production/warehouse-entry",
      },
      { icon: Layers, label: "BOM物料清单", path: "/production/bom" },
      { icon: GitBranch, label: "MRP物料计划", path: "/production/mrp" },
      { icon: Wrench, label: "设备管理", path: "/production/equipment" },
      {
        icon: ClipboardCheck,
        label: "设备点检",
        path: "/production/equipment-inspection",
      },
      {
        icon: Settings,
        label: "设备保养",
        path: "/production/equipment-maintenance",
      },
      { icon: Thermometer, label: "记录管理", path: "/production/environment" },
      { icon: Settings2, label: "生产工序管理", path: "/production/process" },
    ],
  },
  {
    id: "quality",
    icon: ClipboardCheck,
    label: "质量部",
    children: [
      {
        icon: BarChart3,
        label: "质量看板",
        path: "/quality/dashboard",
        requiredDashboardId: "quality_dashboard",
      },
      { icon: TestTube, label: "实验室管理", path: "/quality/lab" },
      { icon: PackageSearch, label: "来料检验", path: "/quality/iqc" },
      { icon: ClipboardList, label: "过程检验", path: "/quality/ipqc" },
      { icon: Beaker, label: "成品检验", path: "/quality/oqc" },
      { icon: FileCheck, label: "放行记录", path: "/quality/release-records" },
      { icon: Boxes, label: "留样管理", path: "/quality/samples" },
      { icon: AlertTriangle, label: "不良事件", path: "/quality/incidents" },
      {
        icon: FileCheck,
        label: "检验要求",
        path: "/quality/inspection-requirements",
      },
    ],
  },

  {
    id: "purchase",
    icon: Truck,
    label: "采购部",
    children: [
      {
        icon: BarChart3,
        label: "采购看板",
        path: "/purchase/dashboard",
        requiredDashboardId: "purchase_dashboard",
      },
      { icon: LayoutDashboard, label: "采购计划", path: "/purchase/plan" },
      { icon: UserCheck, label: "供应商管理", path: "/purchase/suppliers" },
      { icon: FileText, label: "供应商资料", path: "/purchase/supplier-profiles" },
      { icon: FileInput, label: "采购执行", path: "/purchase/orders" },
      { icon: ClipboardList, label: "采购申请", path: "/purchase/requests" },
      {
        icon: PackageCheck,
        label: "到货管理",
        path: "/purchase/goods-receipt",
      },
      {
        icon: ClipboardCheck,
        label: "对账管理",
        path: "/purchase/reconciliation",
      },
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
      {
        icon: BarChart3,
        label: "财务看板",
        path: "/finance/dashboard",
        requiredDashboardId: "finance_dashboard",
      },
      { icon: BookOpen, label: "总账管理", path: "/finance/ledger" },
      { icon: Wallet, label: "应收管理", path: "/finance/receivable" },
      { icon: CreditCard, label: "应付管理", path: "/finance/payable" },
      { icon: Wallet, label: "账户管理", path: "/finance/accounts" },
      { icon: TrendingUp, label: "成本核算", path: "/finance/cost" },
      { icon: Users, label: "人员工资", path: "/finance/salaries" },
      { icon: FileText, label: "发票管理", path: "/finance/invoice" },
      { icon: Receipt, label: "报销管理", path: "/finance/reimbursement" },
      {
        icon: DollarSign,
        label: "费用管理",
        path: "/finance/expense-management",
      },
      { icon: Stamp, label: "印章管理", path: "/finance/seals" },
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
      {
        icon: FileText,
        label: "批记录查询",
        path: "/production/batch-records",
      },
      {
        icon: ClipboardCheck,
        label: "批记录审核记录",
        path: "/production/batch-review-records",
      },
      {
        icon: ShieldCheck,
        label: "法规放行记录",
        path: "/ra/regulatory-release-records",
      },
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
      { icon: History, label: "审计追踪", path: "/settings/audit-trail" },
      { icon: Printer, label: "打印模板", path: "/settings/print-templates" },
      { icon: FileSignature, label: "签名页", path: "/settings/signature" },
      {
        icon: Mail,
        label: "邮件通知",
        path: "/settings/email",
        adminOnly: true,
      },
      {
        icon: Trash2,
        label: "回收箱",
        path: "/settings/recycle-bin",
        adminOnly: true,
      },
    ],
  },
];

const DEPARTMENT_MENU_ACCESS: Record<string, string[]> = {
  管理部: ["admin", "settings", "batch-management"],
  招商部: ["investment"],
  销售部: ["inventory-board", "sales", "batch-management"],
  研发部: ["rd"],
  生产部: ["production", "udi", "batch-management"],
  质量部: ["quality", "batch-management"],
  采购部: ["purchase"],
  仓库管理: ["warehouse", "batch-management"],
  财务部: ["finance", "batch-management"],
  法规事务部: ["batch-management"],
  法规部: ["batch-management"],
  法规负责人: ["batch-management"],
};

function parseDepartments(raw: unknown): string[] {
  const value = String(raw ?? "").trim();
  if (!value) return [];
  return value
    .split(/[,\uFF0C;；/、|\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function getWorkbenchPathPrefix(path: string): string {
  if (path.startsWith("/admin/file-manager")) return "/admin/file-manager";
  if (path.startsWith("/boss/")) return "/boss/";
  if (path.startsWith("/admin/")) return "/admin/";
  if (path.startsWith("/investment/")) return "/investment/";
  if (path.startsWith("/sales/")) return "/sales/";
  if (path.startsWith("/rd/")) return "/rd/";
  if (path.startsWith("/production/")) return "/production/";
  if (path.startsWith("/quality/")) return "/quality/";
  if (path.startsWith("/purchase/")) return "/purchase/";
  if (path.startsWith("/warehouse/")) return "/warehouse/";
  if (path.startsWith("/finance/")) return "/finance/";
  if (path.startsWith("/settings/")) return "/settings/";
  if (path.startsWith("/mail")) return "/mail";
  if (path.startsWith("/website")) return "/website";
  if (path.startsWith("/leads/")) return "/leads/";
  if (path.startsWith("/ra/")) return "/ra/";
  return path;
}

function resolveMenuIdFromPath(path: string): string | null {
  if (path.startsWith("/boss/dashboard")) return "operations-dashboard";
  if (path.startsWith("/admin/")) return "admin";
  if (path.startsWith("/investment/")) return "investment";
  if (path.startsWith("/sales/")) return "sales";
  if (path.startsWith("/rd/")) return "rd";
  if (path.startsWith("/production/")) return "production";
  if (path.startsWith("/quality/")) return "quality";
  if (path.startsWith("/purchase/")) return "purchase";
  if (path.startsWith("/warehouse/")) return "warehouse";
  if (path.startsWith("/finance/")) return "finance";
  if (path.startsWith("/settings/")) return "settings";
  return null;
}

function matchesAllowedPrefix(location: string, prefix: string) {
  if (location === prefix) return true;
  if (prefix.endsWith("/")) return location.startsWith(prefix);
  return location.startsWith(`${prefix}/`);
}

function isAlwaysAllowedPath(location: string) {
  return location === "/workflow/center" || location.startsWith("/workflow/center?");
}

const SIDEBAR_WIDTH_KEY = "erp-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 220;
const MAX_WIDTH = 400;

function matchesPath(path: string | undefined, location: string) {
  if (!path) return false;
  return location === path || location.startsWith(`${path}/`);
}

function hasActiveDescendant(item: any, location: string): boolean {
  if (matchesPath(item.path, location)) return true;
  return (
    item.children?.some((child: any) => hasActiveDescendant(child, location)) ??
    false
  );
}

function findMenuLabel(items: any[], location: string): string | null {
  for (const item of items) {
    if (matchesPath(item.path, location)) return item.label;
    if (item.children) {
      const childLabel = findMenuLabel(item.children, location);
      if (childLabel) return childLabel;
    }
  }
  return null;
}

export default function ERPLayout({ children }: { children: React.ReactNode }) {
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
  const { companyShortName } = useCompanyBranding();
  const user = authUser;
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isHomePage = location === "/";
  const hideMainSidebar = location.startsWith("/ra/workspace/");
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const userName = String((user as any)?.name ?? "U");
  const userEmail = String((user as any)?.email ?? "");
  const userAvatarUrl = String((user as any)?.avatarUrl ?? "");
  const userInitial = userName.charAt(0).toUpperCase();
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
  const { data: todoData } = trpc.workflowCenter.list.useQuery(
    { tab: "todo", limit: 200, scopeKey: workflowScopeKey },
    {
      enabled: Number((user as any)?.id || 0) > 0,
      refetchInterval: 60_000,
      refetchOnMount: "always",
      refetchOnReconnect: "always",
      refetchOnWindowFocus: true,
      staleTime: 0,
    }
  );
  const { data: dashboardAccessData, isLoading: dashboardAccessLoading } =
    trpc.dashboard.access.useQuery(undefined, {
      refetchOnWindowFocus: false,
    });

  const allTodoItems: any[] = Array.isArray(todoData)
    ? todoData
    : Array.isArray((todoData as any)?.items)
      ? (todoData as any).items
      : [];
  const todoItems = allTodoItems.slice(0, 5);
  const todoCount = allTodoItems.length;
  const userRole = String((user as any)?.role ?? "user");
  const userDepartment = String((user as any)?.department ?? "");
  const userDepartments = useMemo(
    () => parseDepartments(userDepartment),
    [userDepartment]
  );
  const configuredVisibleAppIds = useMemo(
    () => parseVisibleAppIds((user as any)?.visibleApps),
    [user]
  );
  const configuredVisibleFormIds = useMemo(
    () => parseVisibleFormIds((user as any)?.visibleForms),
    [user]
  );
  const allowedDashboardIds = useMemo(
    () => new Set<string>(dashboardAccessData?.allowedDashboardIds ?? []),
    [dashboardAccessData]
  );
  const { data: accessibleCompanies = [] } =
    trpc.companies.myCompanies.useQuery(undefined, {
      refetchOnWindowFocus: false,
    });
  const activeCompany = useMemo(() => {
    const storedCompany = readActiveCompany();
    const activeCompanyId = Number(storedCompany?.id || 0);
    if (
      activeCompanyId <= 0 ||
      !Array.isArray(accessibleCompanies) ||
      accessibleCompanies.length === 0
    ) {
      return storedCompany;
    }
    const matchedCompany = accessibleCompanies.find(
      (item: any) => Number(item?.id || 0) === activeCompanyId
    );
    return matchedCompany
      ? { ...storedCompany, ...matchedCompany }
      : storedCompany;
  }, [accessibleCompanies, user]);
  const companyMenuIds = useMemo(
    () => getCompanyMenuIds(activeCompany?.modules),
    [activeCompany]
  );
  const activeCompanyId = Number(activeCompany?.id || 0);
  const currentCompanyId = Number((user as any)?.companyId || 0);
  const homeCompanyId = Number(
    (user as any)?.homeCompanyId || currentCompanyId || 0
  );
  const isCrossCompanyContext =
    activeCompanyId > 0 &&
    homeCompanyId > 0 &&
    activeCompanyId !== homeCompanyId;
  const isCompanyAdmin = Boolean((user as any)?.isCompanyAdmin);
  const scopedCompanyMenuIds = isCrossCompanyContext ? companyMenuIds : null;
  const effectiveConfiguredVisibleAppIds = configuredVisibleAppIds;
  const effectiveConfiguredVisibleFormIds = configuredVisibleFormIds;
  const effectiveConfiguredVisibleFormIdSet = useMemo(
    () => new Set(effectiveConfiguredVisibleFormIds),
    [effectiveConfiguredVisibleFormIds]
  );
  const effectiveConfiguredVisibleFormItems = useMemo(
    () =>
      effectiveConfiguredVisibleFormIds
        .map(id => getFormVisibilityItem(id))
        .filter(Boolean),
    [effectiveConfiguredVisibleFormIds]
  );
  const defaultMenuIds = useMemo(() => {
    const ids =
      isCompanyAdmin || userRole === "admin"
        ? new Set(menuConfig.map(item => item.id))
        : new Set<string>(["dashboard"]);
    if (!isCompanyAdmin && userRole !== "admin") {
      for (const dept of userDepartments) {
        const menuIds = DEPARTMENT_MENU_ACCESS[dept] ?? [];
        for (const menuId of menuIds) ids.add(menuId);
      }
      if (allowedDashboardIds.has("boss_dashboard")) {
        ids.add("operations-dashboard");
      }
    }
    if (scopedCompanyMenuIds && scopedCompanyMenuIds.size > 0) {
      return new Set(
        Array.from(ids).filter(
          menuId =>
            menuId === "operations-dashboard" || scopedCompanyMenuIds.has(menuId)
        )
      );
    }
    return ids;
  }, [
    allowedDashboardIds,
    isCompanyAdmin,
    scopedCompanyMenuIds,
    userRole,
    userDepartments,
  ]);
  const configuredWorkbenchEntries = useMemo(() => {
    if (effectiveConfiguredVisibleAppIds.length === 0) return [];
    const configuredIds = new Set(effectiveConfiguredVisibleAppIds);
    return WORKBENCH_APP_ENTRIES.filter(item => configuredIds.has(item.id));
  }, [effectiveConfiguredVisibleAppIds]);
  const fallbackStandaloneEntries = useMemo(
    () =>
      defaultMenuIds.has("common")
        ? WORKBENCH_APP_ENTRIES.filter(entry => entry.menuId === "common")
        : [],
    [defaultMenuIds]
  );
  const standaloneWorkbenchEntries =
    configuredWorkbenchEntries.length > 0
      ? configuredWorkbenchEntries
      : fallbackStandaloneEntries;
  const allowedStandalonePrefixes = useMemo(
    () =>
      Array.from(
        new Set(
          standaloneWorkbenchEntries.map(entry =>
            getWorkbenchPathPrefix(entry.path)
          )
        )
      ),
    [standaloneWorkbenchEntries]
  );
  const allowedMenuIds = useMemo(() => {
    const ids = new Set(defaultMenuIds);
    for (const item of effectiveConfiguredVisibleFormItems) {
      if (item?.menuId) ids.add(item.menuId);
    }
    if (scopedCompanyMenuIds && scopedCompanyMenuIds.size > 0) {
      return new Set(
        Array.from(ids).filter(
          menuId => menuId === "operations-dashboard" || scopedCompanyMenuIds.has(menuId)
        )
      );
    }
    return ids;
  }, [
    defaultMenuIds,
    effectiveConfiguredVisibleFormItems,
    scopedCompanyMenuIds,
  ]);

  const visibleMenuConfig = useMemo(() => {
    return menuConfig
      .filter((item: any) => {
        if (!allowedMenuIds.has(item.id)) return false;
        if (
          item.requiredDashboardId &&
          !isCompanyAdmin &&
          userRole !== "admin" &&
          !allowedDashboardIds.has(item.requiredDashboardId)
        )
          return false;
        if (
          effectiveConfiguredVisibleFormIdSet.size > 0 &&
          item.formVisibilityId &&
          !effectiveConfiguredVisibleFormIdSet.has(item.formVisibilityId)
        )
          return false;
        return true;
      })
      .map(item => {
        if (!item.children) return item;

        const children = item.children.filter((child: any) => {
          if (child.adminOnly && !isCompanyAdmin && userRole !== "admin")
            return false;
          if (
            child.requiredDashboardId &&
            !isCompanyAdmin &&
            userRole !== "admin" &&
            !allowedDashboardIds.has(child.requiredDashboardId)
          )
            return false;
          if (
            effectiveConfiguredVisibleFormIdSet.size > 0 &&
            !child.requiredDashboardId &&
            !effectiveConfiguredVisibleFormIdSet.has(child.path)
          )
            return false;
          return true;
        });

        return { ...item, children };
      })
      .filter(item => !item.children || item.children.length > 0);
  }, [
    allowedDashboardIds,
    allowedMenuIds,
    effectiveConfiguredVisibleFormIdSet,
    isCompanyAdmin,
    userRole,
  ]);

  useEffect(() => {
    if (!activeCompany || Number(activeCompany.id || 0) <= 0) return;
    writeActiveCompany(activeCompany);
  }, [activeCompany]);

  const currentNavMeta = useMemo(() => {
    for (const menu of visibleMenuConfig) {
      if (menu.path && matchesPath(menu.path, location)) {
        return { path: menu.path, label: menu.label };
      }
      for (const child of menu.children ?? []) {
        if (hasActiveDescendant(child, location)) {
          return {
            path: child.path,
            label: child.label,
            parentLabel: menu.label,
          };
        }
      }
    }
    const standaloneEntry = standaloneWorkbenchEntries.find(entry =>
      matchesAllowedPrefix(location, getWorkbenchPathPrefix(entry.path))
    );
    if (standaloneEntry) {
      return {
        path: standaloneEntry.path,
        label: standaloneEntry.label,
      };
    }
    return null;
  }, [location, standaloneWorkbenchEntries, visibleMenuConfig]);

  useEffect(() => {
    if (location === "/" || hideMainSidebar) return;
    if (isAlwaysAllowedPath(location)) return;
    const matchedMenu =
      menuConfig.some(menu => {
        if (matchesPath(menu.path, location)) return true;
        return (menu.children ?? []).some(child =>
          hasActiveDescendant(child, location)
        );
      }) ||
      allowedStandalonePrefixes.some(prefix =>
        matchesAllowedPrefix(location, prefix)
      );
    if (!matchedMenu) return;
    const allowed =
      allowedStandalonePrefixes.some(prefix =>
        matchesAllowedPrefix(location, prefix)
      ) ||
      visibleMenuConfig.some(menu => {
        if (matchesPath(menu.path, location)) return true;
        return (menu.children ?? []).some(child =>
          hasActiveDescendant(child, location)
        );
      });
    if (!allowed) {
      setLocation("/");
    }
  }, [
    allowedStandalonePrefixes,
    hideMainSidebar,
    location,
    setLocation,
    visibleMenuConfig,
  ]);

  // 根据当前路径自动展开对应菜单
  useEffect(() => {
    const currentMenu = visibleMenuConfig.find(item =>
      item.children?.some(child => hasActiveDescendant(child, location))
    );
    if (!currentMenu) return;
    setOpenMenus(prev =>
      prev.includes(currentMenu.id) ? prev : [...prev, currentMenu.id]
    );
  }, [location, visibleMenuConfig]);

  // 获取当前页面标题
  const getCurrentPageTitle = () => {
    if (isAlwaysAllowedPath(location)) return "待办中心";
    return (
      currentNavMeta?.label ||
      findMenuLabel(visibleMenuConfig, location) ||
      "首页"
    );
  };

  // URL 越权访问保护：非管理员只能访问本部门可见菜单对应页面
  useEffect(() => {
    if (isCompanyAdmin || userRole === "admin") return;
    if (dashboardAccessLoading) return;
    if (isAlwaysAllowedPath(location)) return;
    const visiblePaths = new Set<string>();
    for (const menu of visibleMenuConfig) {
      if (menu.path) visiblePaths.add(menu.path);
      for (const child of menu.children ?? []) visiblePaths.add(child.path);
    }
    const allowed =
      allowedStandalonePrefixes.some(prefix =>
        matchesAllowedPrefix(location, prefix)
      ) ||
      Array.from(visiblePaths).some(
        p => location === p || location.startsWith(`${p}/`)
      );
    if (!allowed) {
      setLocation("/");
    }
  }, [
    allowedStandalonePrefixes,
    dashboardAccessLoading,
    isCompanyAdmin,
    location,
    setLocation,
    userRole,
    visibleMenuConfig,
  ]);

  useEffect(() => {
    if (!currentNavMeta) return;
    if (currentNavMeta.path === "/" || currentNavMeta.path === "/login") return;
    const nextItem = {
      ...currentNavMeta,
      visitedAt: Date.now(),
    };
    const history = readRecentVisits(user);
    const nextHistory = [
      nextItem,
      ...history.filter(item => item.path !== nextItem.path),
    ].slice(0, 20);
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
    setOpenMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const renderSubMenuItems = (items: any[], level = 0): React.ReactNode =>
    items.map(item => {
      const itemKey = item.path || `${item.label}-${level}`;
      const isActive = hasActiveDescendant(item, location);

      if (item.children) {
        const nestedKey = `${itemKey}-group`;
        const isOpen = openMenus.includes(nestedKey) || isActive;
        return (
          <SidebarMenuSubItem key={itemKey}>
            <button
              type="button"
              onClick={() => {
                if (item.path) setLocation(item.path);
                toggleMenu(nestedKey);
              }}
              className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/60"
              }`}
            >
              <item.icon className="h-3 w-3" />
              <span className="flex-1 truncate">{item.label}</span>
              <ChevronRight
                className={`h-3 w-3 transition-transform ${isOpen ? "rotate-90" : ""}`}
              />
            </button>
            {isOpen ? (
              <SidebarMenuSub className="ml-2 mt-1">
                {renderSubMenuItems(item.children, level + 1)}
              </SidebarMenuSub>
            ) : null}
          </SidebarMenuSubItem>
        );
      }

      return (
        <SidebarMenuSubItem key={itemKey}>
          <SidebarMenuSubButton
            onClick={() => item.path && setLocation(item.path)}
            isActive={isActive}
            className={`h-9 ${level > 0 ? "pl-4" : ""}`}
          >
            <item.icon className="h-3 w-3" />
            <span>{item.label}</span>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      );
    });

  const redirectToLogin = async () => {
    try {
      await logout();
    } catch {
      // ignore and continue to login page
    }
    window.location.href = getLoginUrl();
  };

  if (isHomePage) {
    return (
      <main className="h-screen w-full flex-1 overflow-hidden">{children}</main>
    );
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
            <img
              src={shenyunLogo}
              alt="SHENYUN"
              className="h-6 w-auto object-contain"
            />
            <span className="text-sm font-semibold text-slate-700 hidden sm:block">
              {companyShortName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* 桌面端展示快捷入口 */}
          <div className="flex items-center gap-1">
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
            <DropdownMenuContent
              align="end"
              className="w-44 rounded-xl shadow-xl border-0 p-1"
            >
              <DropdownMenuItem
                onClick={() => setLocation("/whatsapp")}
                className="rounded-lg text-sm cursor-pointer gap-2"
              >
                <MessageCircle className="h-4 w-4 text-green-500" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLocation("/prospect")}
                className="rounded-lg text-sm cursor-pointer gap-2"
              >
                <Target className="h-4 w-4 text-orange-500" />
                获客情报
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLocation("/mail")}
                className="rounded-lg text-sm cursor-pointer gap-2"
              >
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
                  <span className="text-sm font-semibold text-white">
                    我的待办
                  </span>
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
                    <p className="text-sm font-medium text-slate-500">
                      暂无待办事项
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      所有事项已处理完毕
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[360px] overflow-y-auto">
                    <div className="divide-y divide-slate-50">
                      {todoItems.map((item: any, idx: number) => (
                        <button
                          key={item.id ?? idx}
                          type="button"
                          onClick={() =>
                            setLocation("/workflow/center?tab=todo")
                          }
                          className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                            <FileText className="h-3.5 w-3.5 text-violet-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {item.title ??
                                item.orderNo ??
                                item.docNo ??
                                "待办事项"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400 truncate">
                              {item.applicantName ?? item.createdByName ?? ""}
                              {item.createdAt
                                ? ` · ${formatDate(item.createdAt)}`
                                : ""}
                            </p>
                          </div>
                          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300" />
                        </button>
                      ))}
                    </div>
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
                <span className="hidden sm:block text-sm font-medium text-slate-700">
                  {userName}
                </span>
                <Avatar className="h-8 w-8 border-2 border-white/60 shadow-sm">
                  {userAvatarUrl ? (
                    <img
                      src={userAvatarUrl}
                      alt={userName}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-bold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 rounded-xl shadow-xl border-0 p-1"
            >
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-sm font-semibold text-slate-900">
                  {userName}
                </p>
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
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
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
        {!hideMainSidebar ? (
          <div className="relative flex-none" ref={sidebarRef}>
            <Sidebar
              collapsible="icon"
              className="border-r-0 !h-[calc(100vh-3.5rem)] !top-14"
              disableTransition={isResizing}
            >
              <SidebarContent className="gap-0">
                <ScrollArea className="h-[calc(100vh-8rem)]">
                  <SidebarMenu className="px-2 py-2">
                    {visibleMenuConfig
                      .filter((item: any) => !item.hidden)
                      .map(item => {
                        const isActive =
                          matchesPath(item.path, location) ||
                          item.children?.some(child =>
                            hasActiveDescendant(child, location)
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
                                    {renderSubMenuItems(item.children)}
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
        ) : null}

        <SidebarInset>
          <main className="flex-1 overflow-y-auto p-3 md:p-6 bg-muted/30 min-h-[calc(100vh-3rem)]">
            {children}
          </main>
        </SidebarInset>
      </div>
    </div>
  );
}
