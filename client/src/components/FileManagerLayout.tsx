import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Settings } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import shenyunLogo from "@/assets/2ac420a999cddd5f145a62155f78b13e.png";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

interface FileManagerLayoutProps {
  children: React.ReactNode;
}

export default function FileManagerLayout({ children }: FileManagerLayoutProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { companyShortName } = useCompanyBranding();

  const userName = String((user as any)?.name ?? "U");
  const userEmail = String((user as any)?.email ?? "");
  const userAvatarUrl = String((user as any)?.avatarUrl ?? "");
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* 顶部抬头 */}
      <header
        className="flex-none w-full z-50 flex h-12 items-center justify-between px-3 md:px-6"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mr-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回 ERP
          </button>
          <img src={shenyunLogo} alt="SHENYUN" className="h-6 w-auto object-contain" />
          <span className="text-sm font-semibold text-slate-700 hidden sm:block">{companyShortName}</span>
          <span className="text-slate-300 hidden sm:block">·</span>
          <span className="text-sm text-slate-500 hidden sm:block">文件管理</span>
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
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-bold">
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

      {/* 内容区（全宽，无左侧菜单） */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
