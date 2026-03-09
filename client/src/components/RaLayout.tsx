import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ShieldCheck,
  Globe,
  Flag,
  Landmark,
} from "lucide-react";

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

  const activeMenu = RA_MENUS.find((m) => location.startsWith(m.path));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* 左侧菜单 */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo 区域 */}
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

        {/* 菜单列表 */}
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

        {/* 返回主页按钮 */}
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

      {/* 右侧内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
