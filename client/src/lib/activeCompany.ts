const ACTIVE_COMPANY_KEY = "erp-active-company";

export type ActiveCompany = {
  id?: number | null;
  name?: string | null;
  shortName?: string | null;
  modules?: string | string[] | null;
  type?: string | null;
  color?: string | null;
  description?: string | null;
  status?: string | null;
};

const MODULE_MENU_IDS: Record<string, string[]> = {
  admin: ["admin"],
  investment: ["investment"],
  sales: ["sales"],
  products: ["rd"],
  rd: ["rd"],
  production: ["production", "udi", "batch-management"],
  quality: ["quality"],
  purchase: ["purchase"],
  warehouse: ["warehouse", "inventory-board"],
  finance: ["finance"],
  settings: ["settings"],
  all: [
    "admin",
    "investment",
    "sales",
    "rd",
    "production",
    "udi",
    "batch-management",
    "quality",
    "purchase",
    "warehouse",
    "inventory-board",
    "finance",
    "settings",
  ],
};

export function readActiveCompany(): ActiveCompany | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_COMPANY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeActiveCompany(company: ActiveCompany | null) {
  if (typeof window === "undefined") return;
  if (!company) {
    localStorage.removeItem(ACTIVE_COMPANY_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_COMPANY_KEY, JSON.stringify(company));
}

export function parseCompanyModules(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(item => String(item || "").trim()).filter(Boolean);
  }
  return String(raw ?? "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function getCompanyMenuIds(raw: unknown): Set<string> | null {
  const modules = parseCompanyModules(raw);
  if (modules.length === 0) return null;
  const menuIds = new Set<string>(["dashboard"]);
  for (const moduleId of modules) {
    const mappedIds = MODULE_MENU_IDS[moduleId] || [];
    for (const menuId of mappedIds) {
      menuIds.add(menuId);
    }
  }
  return menuIds;
}

export function getActiveCompanyMenuIds(): Set<string> | null {
  const company = readActiveCompany();
  return getCompanyMenuIds(company?.modules);
}
