import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ShieldCheck,
  Globe,
  Flag,
  Landmark,
  Settings,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import shenyunLogo from "@/assets/2ac420a999cddd5f145a62155f78b13e.png";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

const RA_MENUS = [
  {
    id: "EU_MDR",
    label: "EU MDR",
    sublabel: "欧盟医疗器械法规",
    path: "/ra/eu-mdr",
    icon: Globe,
    color: "text-blue-600",
    activeBg: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-100",
  },
  {
    id: "US_FDA",
    label: "US FDA",
    sublabel: "美国食品药品监督",
    path: "/ra/us-fda",
    icon: Flag,
    color: "text-red-600",
    activeBg: "bg-red-50 border-red-200",
    iconBg: "bg-red-100",
  },
  {
    id: "CN_NMPA",
    label: "CN NMPA",
    sublabel: "中国药品监督管理局",
    path: "/ra/cn-nmpa",
    icon: Landmark,
    color: "text-green-600",
    activeBg: "bg-green-50 border-green-200",
    iconBg: "bg-green-100",
  },
];

interface RaLayoutProps {
  children: React.ReactNode;
}

export default function RaLayout({ children }: RaLayoutProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { companyShortName } = useCompanyBranding();
  const isWorkspacePage = location.startsWith("/ra/workspace/");

  const userName = String((user as any)?.name ?? "U");
  const userEmail = String((user as any)?.email ?? "");
  const userAvatarUrl = String((user as any)?.avatarUrl ?? "");
  const userInitial = userName.charAt(0).toUpperCase();

  const activeMenu = RA_MENUS.find((m) => location.startsWith(m.path));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* 顶部抬头（与 ERPLayout 一致） */}
      <header
        className="flex-none w-full z-50 flex h-12 items-center justify-between px-3 md:px-6"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center gap-2">
          <img src={shenyunLogo} alt="SHENYUN" className="h-6 w-auto object-contain" />
          <span className="text-sm font-semibold text-slate-700 hidden sm:block">{companyShortName}</span>
          <span className="text-slate-300 hidden sm:block">·</span>
          <span className="text-sm text-slate-500 hidden sm:block">法规事务部</span>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 items-center gap-2 rounded-full px-2 transition-colors hover:bg-slate-100"
              >
                <span className="hidden sm:block text-sm font-medium text-slate-700">{userName}</span>
                <Avatar className="h-8 w-8 border-2 border-white/60 shadow-sm">
                  {userAvatarUrl && userAvatarUrl !== "undefined" ? (
                    <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white text-sm font-bold">
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

      {/* 下方：左侧菜单 + 右侧内容 */}
      <div className="flex flex-1 overflow-hidden">
        {!isWorkspacePage ? (
          <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 leading-tight">法规事务部</p>
                  <p className="text-[10px] text-gray-400 leading-tight">RA Management</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {RA_MENUS.map((menu) => {
                const Icon = menu.icon;
                const isActive = location.startsWith(menu.path);
                return (
                  <button
                    key={menu.id}
                    onClick={() => navigate(menu.path)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg border text-left transition-all",
                      isActive
                        ? `${menu.activeBg} border-opacity-100`
                        : "border-transparent hover:bg-gray-50 hover:border-gray-100"
                    )}
                  >
                    <div className={cn("h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0", menu.iconBg)}>
                      <Icon className={cn("h-4 w-4", menu.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-sm font-semibold leading-tight", isActive ? menu.color : "text-gray-700")}>
                        {menu.label}
                      </p>
                      <p className="text-[10px] text-gray-400 leading-tight truncate">{menu.sublabel}</p>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="px-3 py-4 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                onClick={() => navigate("/")}
              >
                <ChevronLeft className="h-4 w-4" />
                返回主页
              </Button>
            </div>
          </aside>
        ) : null}

        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
