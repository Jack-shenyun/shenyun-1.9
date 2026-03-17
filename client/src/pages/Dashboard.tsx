import { formatDate, formatDateTime } from "@/lib/formatters";
import { getCompanyMenuIds, readActiveCompany, writeActiveCompany } from "@/lib/activeCompany";
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
  MessageCircle,
  Mail,
  MoreHorizontal,
  Network,
  ExternalLink,
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
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

const DEPARTMENT_MENU_ACCESS: Record<string, string[]> = {
  管理部: ["admin", "settings", "batch-management", "common"],
  招商部: ["investment", "common"],
  销售部: ["sales", "batch-management", "common"],
  研发部: ["rd", "common"],
  生产部: ["production", "udi", "batch-management", "common"],
  质量部: ["quality", "batch-management", "common"],
  采购部: ["purchase", "common"],
  仓库管理: ["warehouse", "batch-management", "common"],
  财务部: ["finance", "batch-management", "common"],
  法规事务部: ["batch-management", "common"],
  法规部: ["batch-management", "common"],
  法规负责人: ["batch-management", "common"],
};

function parseDepartments(raw: unknown): string[] {
  const value = String(raw ?? "").trim();
  if (!value) return [];
  return value
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((s) => s.trim())
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
  "operations-dashboard": ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#ops_bg)"/>
      <defs>
        <linearGradient id="ops_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b86e5"/>
          <stop offset="1" stopColor="#36d1dc"/>
        </linearGradient>
      </defs>
      <path d="M18 42L28 30L35 36L46 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9"/>
      <path d="M42 22H46V26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8"/>
      <rect x="18" y="18" width="28" height="28" rx="8" stroke="white" strokeWidth="2.2" strokeOpacity="0.45"/>
      <circle cx="24" cy="42" r="2.8" fill="white" fillOpacity="0.95"/>
      <circle cx="35" cy="36" r="2.8" fill="white" fillOpacity="0.85"/>
      <circle cx="46" cy="22" r="2.8" fill="white" fillOpacity="0.95"/>
    </svg>
  ),
  "inventory-board": ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#inv_bg)"/>
      <defs>
        <linearGradient id="inv_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14B8A6"/>
          <stop offset="1" stopColor="#06B6D4"/>
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="14" height="12" rx="3" fill="white" fillOpacity="0.95"/>
      <rect x="34" y="18" width="14" height="12" rx="3" fill="white" fillOpacity="0.85"/>
      <rect x="16" y="34" width="14" height="12" rx="3" fill="white" fillOpacity="0.85"/>
      <rect x="34" y="34" width="14" height="12" rx="3" fill="white" fillOpacity="0.95"/>
      <path d="M30 24H34M23 30V34M41 30V34M30 40H34" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.85"/>
    </svg>
  ),
  udi: ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#udi_bg)"/>
      <defs>
        <linearGradient id="udi_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#36C9FF"/>
          <stop offset="1" stopColor="#3764FF"/>
        </linearGradient>
      </defs>
      <rect x="18" y="16" width="28" height="32" rx="6" fill="white" fillOpacity="0.92"/>
      <path d="M24 24H40" stroke="url(#udi_bg)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M24 31H28M32 31H40" stroke="url(#udi_bg)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M24 38H26M30 38H34M38 38H40" stroke="url(#udi_bg)" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="24" y="42" width="16" height="2.8" rx="1.4" fill="url(#udi_bg)"/>
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
  "whatsapp-workbench": ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#wa_bg)"/>
      <defs>
        <linearGradient id="wa_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2AD66C"/>
          <stop offset="1" stopColor="#149E55"/>
        </linearGradient>
      </defs>
      <path d="M32 17C23.716 17 17 23.492 17 31.5C17 34.534 17.963 37.35 19.607 39.681L18 47L25.66 45.057C27.628 45.98 29.834 46.5 32 46.5C40.284 46.5 47 40.008 47 32C47 23.992 40.284 17 32 17Z" fill="white" fillOpacity="0.92"/>
      <path d="M27.4 26.7C26.9 25.6 26.35 25.58 25.88 25.56C25.49 25.55 25.05 25.55 24.61 25.55C24.17 25.55 23.45 25.72 22.84 26.39C22.23 27.07 20.5 28.64 20.5 31.84C20.5 35.03 22.89 38.12 23.23 38.58C23.56 39.03 27.94 45.94 34.9 48.63C40.68 50.87 41.86 50.43 43.12 50.32C44.39 50.2 47.18 48.76 47.73 47.19C48.28 45.62 48.28 44.27 48.12 44C47.95 43.73 47.5 43.56 46.83 43.22C46.16 42.88 42.85 41.26 42.24 41.04C41.63 40.81 41.19 40.7 40.74 41.37C40.3 42.03 39 43.56 38.61 44.01C38.22 44.46 37.83 44.51 37.16 44.17C36.49 43.83 34.34 43.13 31.79 40.87C29.81 39.12 28.47 36.95 28.08 36.28C27.69 35.6 28.04 35.24 28.37 34.9C28.67 34.6 29.04 34.11 29.38 33.72C29.71 33.33 29.82 33.05 30.05 32.6C30.27 32.15 30.16 31.76 29.99 31.42C29.82 31.08 28.5 27.79 27.4 26.7Z" fill="url(#wa_bg)"/>
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
  "ra": ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#ra_bg)"/>
      <defs>
        <linearGradient id="ra_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7"/>
          <stop offset="1" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <path d="M32 14L46 20V32C46 40 39 47 32 50C25 47 18 40 18 32V20L32 14Z" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
      <path d="M26 32L30 36L38 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9"/>
    </svg>
  ),
  "file-manager": ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="url(#filemanager_bg)"/>
      <defs>
        <linearGradient id="filemanager_bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b"/>
          <stop offset="1" stopColor="#ea580c"/>
        </linearGradient>
      </defs>
      <path d="M14 26C14 24 15.5 22 18 22H28L32 26H46C48 26 50 28 50 30V44C50 46 48 48 46 48H18C16 48 14 46 14 44V26Z" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
      <path d="M24 36H40M32 30V42" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.8"/>
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
  const { companyDisplayName, companyShortName } = useCompanyBranding();
  const { data: stats } = trpc.dashboard.stats.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const [recentVisits, setRecentVisits] = useState<RecentVisitItem[]>([]);
  const [appSearch, setAppSearch] = useState("");

  const userRole = String((user as any)?.role ?? "user");
  const userDepartments = useMemo(() => parseDepartments((user as any)?.department), [user]);
  const configuredVisibleAppIds = useMemo(() => parseVisibleAppIds((user as any)?.visibleApps), [user]);
  const { data: accessibleCompanies = [] } = trpc.companies.myCompanies.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const activeCompany = useMemo(() => {
    const storedCompany = readActiveCompany();
    const activeCompanyId = Number(storedCompany?.id || 0);
    if (activeCompanyId <= 0 || !Array.isArray(accessibleCompanies) || accessibleCompanies.length === 0) {
      return storedCompany;
    }
    const matchedCompany = accessibleCompanies.find((item: any) => Number(item?.id || 0) === activeCompanyId);
    return matchedCompany ? { ...storedCompany, ...matchedCompany } : storedCompany;
  }, [accessibleCompanies, user]);
  const companyMenuIds = useMemo(() => getCompanyMenuIds(activeCompany?.modules), [activeCompany]);
  const activeCompanyId = Number(activeCompany?.id || 0);
  const currentCompanyId = Number((user as any)?.companyId || 0);
  const homeCompanyId = Number((user as any)?.homeCompanyId || currentCompanyId || 0);
  const isCrossCompanyContext = activeCompanyId > 0 && homeCompanyId > 0 && activeCompanyId !== homeCompanyId;
  const isCompanyAdmin = Boolean((user as any)?.isCompanyAdmin);
  const scopedCompanyMenuIds = isCrossCompanyContext ? companyMenuIds : null;
  const effectiveConfiguredVisibleAppIds = configuredVisibleAppIds;
  const { data: dashboardAccessData } = trpc.dashboard.access.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const allowedDashboardIds = useMemo(
    () => new Set(dashboardAccessData?.allowedDashboardIds ?? []),
    [dashboardAccessData],
  );

  const defaultMenuIds = useMemo(() => {
    const ids = isCompanyAdmin || userRole === "admin"
      ? new Set(WORKBENCH_APP_ENTRIES.map((item) => item.menuId))
      : new Set<string>();
    if (!isCompanyAdmin && userRole !== "admin") {
      for (const dept of userDepartments) {
        const menuIds = DEPARTMENT_MENU_ACCESS[dept] ?? [];
        for (const menuId of menuIds) ids.add(menuId);
      }
    }
    if (scopedCompanyMenuIds && scopedCompanyMenuIds.size > 0) {
      return new Set(Array.from(ids).filter((menuId) => scopedCompanyMenuIds.has(menuId)));
    }
    return ids;
  }, [isCompanyAdmin, scopedCompanyMenuIds, userDepartments, userRole]);

  const visibleApps = useMemo(() => {
    const hasBossAccess = isCompanyAdmin || userRole === "admin" || allowedDashboardIds.has("boss_dashboard");
    const configuredIds = effectiveConfiguredVisibleAppIds.length > 0
      ? new Set(effectiveConfiguredVisibleAppIds)
      : null;
    const sourceApps = configuredIds
      ? WORKBENCH_APP_ENTRIES.filter((item) => configuredIds.has(item.id))
      : WORKBENCH_APP_ENTRIES.filter((item) => defaultMenuIds.has(item.menuId) || (item.id === "operations-dashboard" && hasBossAccess));

    return sourceApps.filter((item) => {
      if (item.id === "operations-dashboard") return hasBossAccess;
      return true;
    });
  }, [allowedDashboardIds, defaultMenuIds, effectiveConfiguredVisibleAppIds, isCompanyAdmin, scopedCompanyMenuIds, userRole]);

  const filteredApps = useMemo(() => {
    const keyword = appSearch.trim().toLowerCase();
    if (!keyword) return visibleApps;
    return visibleApps.filter((item) => item.label.toLowerCase().includes(keyword));
  }, [appSearch, visibleApps]);
  const hasMailCollaboration = useMemo(
    () => visibleApps.some((item) => item.id === "mail-collaboration"),
    [visibleApps],
  );

  const handleAppClick = (item: (typeof WORKBENCH_APP_ENTRIES)[number]) => {
    if (item.path) {
      navigate(item.path);
      return;
    }
    toast.info(`${item.label}功能开发中`);
  };

  const MENU_PATH_PREFIXES: Record<string, string[]> = {
    dashboard: ["/boss/dashboard"],
    admin: ["/admin/"],
    common: ["/mail", "/whatsapp", "/website", "/leads/", "/ra/", "/admin/file-manager"],
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
    if (effectiveConfiguredVisibleAppIds.length > 0) {
      return Array.from(new Set(visibleApps.map((item) => getWorkbenchPathPrefix(item.path))));
    }
    const sourceMenuIds = Array.from(defaultMenuIds);
    return Array.from(new Set(sourceMenuIds)).flatMap((menuId) => MENU_PATH_PREFIXES[menuId] ?? []);
  }, [defaultMenuIds, effectiveConfiguredVisibleAppIds, visibleApps]);

  useEffect(() => {
    if (!activeCompany || Number(activeCompany.id || 0) <= 0) return;
    writeActiveCompany(activeCompany);
  }, [activeCompany]);

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
  const workflowScopeKey = [
    Number((user as any)?.id || 0),
    Number((user as any)?.companyId || 0),
    Number((user as any)?.homeCompanyId || 0),
    String((user as any)?.role || ""),
  ].join(":");

  const { data: todoData } = trpc.workflowCenter.list.useQuery(
    { tab: "todo", limit: 5, scopeKey: workflowScopeKey },
    {
      enabled: Number((user as any)?.id || 0) > 0,
      refetchInterval: 60_000,
      refetchOnMount: "always",
      refetchOnReconnect: "always",
      refetchOnWindowFocus: true,
      staleTime: 0,
    }
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
      {/* 顶部导航栏 */}
      <header
        className="sticky top-0 z-50 flex h-12 items-center justify-between px-3 md:px-6"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {/* 左侧 Logo */}
        <button
          type="button"
          onClick={() => { window.location.href = getLoginUrl(); }}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          title="返回登录页"
        >
          <img src={shenyunLogo} alt="SHENYUN" className="h-6 w-auto object-contain" />
          <span className="text-sm font-semibold text-slate-700 hidden sm:block">{companyShortName}</span>
        </button>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-1">
          {/* 顶部快捷入口 */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/whatsapp")}
              title="WhatsApp"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100 text-slate-600 hover:text-[#25D366]"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            {hasMailCollaboration && (
              <button
                type="button"
                onClick={() => navigate("/mail")}
                title="邮件协同"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100 text-slate-600"
              >
                <Mail className="h-4 w-4" />
              </button>
            )}
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
              <DropdownMenuItem onClick={() => navigate("/whatsapp")} className="rounded-lg text-sm cursor-pointer gap-2">
                <MessageCircle className="h-4 w-4 text-green-500" />
                WhatsApp
              </DropdownMenuItem>
              {hasMailCollaboration && (
                <DropdownMenuItem onClick={() => navigate("/mail")} className="rounded-lg text-sm cursor-pointer gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  邮件协同
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
                        onClick={() => navigate(item.routePath || "/workflow/center?tab=todo")}
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
      <main className="mx-auto max-w-5xl px-3 py-4 md:px-8 md:py-10">
        {/* 搜索框 */}
        <div className="mb-4 md:mb-8 flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              placeholder="搜索应用..."
              className="h-11 rounded-full border-0 bg-white/80 pl-11 pr-4 text-sm shadow-md backdrop-blur-sm focus:bg-white focus:shadow-lg transition-all placeholder:text-slate-400"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)", fontSize: "16px" }}
            />
          </div>
        </div>

        {/* 应用网格 - 手机4列，平板5列，桌面7列 */}
        <div className="grid grid-cols-4 gap-x-1.5 gap-y-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 sm:gap-4 md:gap-6">
          {filteredApps.map((item) => {
            const IconComponent = APP_ICONS[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAppClick(item)}
                className="group flex flex-col items-center gap-1 sm:gap-1.5 rounded-2xl p-1 sm:p-2.5 transition-all duration-200 hover:bg-white/30 active:scale-95"
                style={{ minHeight: 0 }}
              >
                {/* 图标卡片 - 使用 aspect-square 自适应宽度 */}
                <div className="relative w-full aspect-square overflow-hidden rounded-xl sm:rounded-2xl shadow-md transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-xl">
                  {IconComponent ? (
                    <IconComponent className="w-full h-full" />
                  ) : (
                    <DefaultIcon className="w-full h-full" color="#888" />
                  )}
                  {/* 高光效果 */}
                  <div
                    className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)",
                    }}
                  />
                </div>
                {/* 标签 */}
                <span className="text-[10px] sm:text-[12px] font-medium text-slate-700 text-center leading-tight w-full truncate">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {filteredApps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Search className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">未找到匹配的应用</p>
          </div>
        )}

        {/* 最近使用 */}
        {recentVisits.length > 0 && (
          <div className="mt-6 md:mt-10">
            <div className="flex items-center gap-2 mb-2.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs sm:text-sm font-medium text-slate-500">最近使用</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {recentVisits.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="group flex flex-col items-start rounded-xl bg-white/70 px-2.5 py-2 sm:px-3 sm:py-2.5 text-left shadow-sm backdrop-blur-sm transition-all hover:bg-white/90 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-xs sm:text-sm font-medium text-slate-800 truncate w-full">
                    {item.parentLabel ? `${item.parentLabel} · ${item.label}` : item.label}
                  </p>
                  <p className="mt-0.5 text-[10px] sm:text-xs text-slate-400">
                    {formatDateTime(item.visitedAt)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 底部版权 */}
      <footer className="flex items-center justify-center gap-3 px-4 py-3 text-center text-[10px] text-slate-400/70 sm:text-xs">
        <span>© 2026 {companyDisplayName}</span>
        <span>v1.0</span>
      </footer>
    </div>
  );
}
