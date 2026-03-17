import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  Briefcase,
  Calculator,
  ClipboardCheck,
  Factory,
  FlaskConical,
  FolderOpen,
  Globe,
  Handshake,
  Mail,
  MessageCircle,
  Megaphone,
  NotebookText,
  QrCode,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Warehouse,
} from "lucide-react";

export type WorkbenchAppEntry = {
  id: string;
  menuId: string;
  label: string;
  path: string;
  icon: LucideIcon;
  color: string;
};

export const WORKBENCH_APP_ENTRIES: readonly WorkbenchAppEntry[] = [
  { id: "admin", menuId: "admin", label: "管理部", path: "/admin/documents", icon: Briefcase, color: "from-sky-500 to-blue-600" },
  { id: "investment", menuId: "investment", label: "招商部", path: "/investment/dealer", icon: Handshake, color: "from-cyan-500 to-teal-600" },
  { id: "sales", menuId: "sales", label: "销售部", path: "/sales/orders", icon: ShoppingCart, color: "from-emerald-500 to-green-600" },
  { id: "rd", menuId: "rd", label: "研发部", path: "/rd/products", icon: FlaskConical, color: "from-violet-500 to-indigo-600" },
  { id: "production", menuId: "production", label: "生产部", path: "/production/orders", icon: Factory, color: "from-orange-500 to-amber-600" },
  { id: "inventory-board", menuId: "inventory-board", label: "库存看板", path: "/inventory-board", icon: Boxes, color: "from-teal-500 to-cyan-600" },
  { id: "udi", menuId: "udi", label: "UDI管理", path: "/production/udi/archive", icon: QrCode, color: "from-cyan-500 to-blue-600" },
  { id: "batch-records", menuId: "batch-management", label: "批记录管理", path: "/production/batch-records", icon: NotebookText, color: "from-fuchsia-500 to-pink-600" },
  { id: "quality", menuId: "quality", label: "质量部", path: "/quality/lab", icon: ClipboardCheck, color: "from-rose-500 to-red-600" },
  { id: "purchase", menuId: "purchase", label: "采购部", path: "/purchase/orders", icon: Truck, color: "from-cyan-500 to-sky-600" },
  { id: "warehouse", menuId: "warehouse", label: "仓库管理", path: "/warehouse/warehouses", icon: Warehouse, color: "from-slate-500 to-gray-600" },
  { id: "finance", menuId: "finance", label: "财务部", path: "/finance/receivable", icon: Calculator, color: "from-lime-500 to-green-700" },
  { id: "operations-dashboard", menuId: "dashboard", label: "经营看板", path: "/boss/dashboard", icon: BarChart3, color: "from-indigo-500 to-cyan-600" },
  { id: "settings", menuId: "settings", label: "系统设置", path: "/settings/users", icon: Settings, color: "from-gray-500 to-zinc-700" },
  { id: "mail-collaboration", menuId: "common", label: "邮件协同", path: "/mail", icon: Mail, color: "from-blue-500 to-cyan-600" },
  { id: "whatsapp-workbench", menuId: "common", label: "WhatsApp 工作台", path: "/whatsapp", icon: MessageCircle, color: "from-emerald-500 to-green-600" },
  { id: "website-management", menuId: "common", label: "网站管理", path: "/website", icon: Globe, color: "from-indigo-500 to-blue-700" },
  { id: "lead-marketing", menuId: "common", label: "获客营销", path: "/leads/overseas", icon: Megaphone, color: "from-pink-500 to-rose-600" },
  { id: "ra", menuId: "common", label: "法规事务部", path: "/ra/eu-mdr", icon: ShieldCheck, color: "from-purple-500 to-violet-600" },
  { id: "file-manager", menuId: "common", label: "文件管理", path: "/admin/file-manager", icon: FolderOpen, color: "from-amber-500 to-orange-600" },
] as const;

export const WORKBENCH_APP_OPTIONS = WORKBENCH_APP_ENTRIES.map((item) => ({
  id: item.id,
  label: item.label,
}));

export function parseVisibleAppIds(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
