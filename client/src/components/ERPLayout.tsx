import { useAuth } from "@/_core/hooks/useAuth";
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
} from "lucide-react";
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
      { icon: Archive, label: "UDI档案", path: "/production/udi/archive" },
      { icon: QrCode, label: "标签设计器", path: "/production/udi/designer" },
      { icon: Printer, label: "标签打印", path: "/production/udi/print" },
      { icon: Upload, label: "UDI上报", path: "/production/udi/report" },
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
      { icon: FileSpreadsheet, label: "报表中心", path: "/finance/reports" },
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
      { icon: Trash2, label: "回收箱", path: "/settings/recycle-bin", adminOnly: true },
    ],
  },
];

const DEPARTMENT_MENU_ACCESS: Record<string, string[]> = {
  "管理部": ["admin", "settings"],
  "招商部": ["investment"],
  "销售部": ["sales"],
  "研发部": ["rd"],
  "生产部": ["production"],
  "质量部": ["quality"],
  "采购部": ["purchase"],
  "仓库管理": ["warehouse"],
  "财务部": ["finance"],
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
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 items-center w-full">
                  <button
                    type="button"
                    onClick={() => void redirectToLogin()}
                    className="flex items-center justify-center min-w-0 rounded-md px-1 py-1 hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="跳转登录页"
                    title="切换用户登录"
                  >
                    <img src={shenyunLogo} alt="SHENYUN" className="h-7 w-[150px] object-contain" />
                  </button>
                  <span className="mt-0.5 w-[150px] text-[11px] text-muted-foreground inline-flex items-center justify-center gap-1 tracking-[0.01em]">
                    <span>公司管理系统</span>
                    <span className="opacity-60">·</span>
                    <span className="font-medium tabular-nums">V1.0</span>
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

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
        {/* 移动端顶部导航栏 */}
        <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {isMobile && (
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
            )}
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg tracking-tight">
                {getCurrentPageTitle()}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <main className="flex-1 p-4 md:p-6 bg-muted/30 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
