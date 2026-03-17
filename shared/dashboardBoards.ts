export const DASHBOARD_PERMISSION_IDS = [
  "boss_dashboard",
  "sales_dashboard",
  "production_dashboard",
  "purchase_dashboard",
  "finance_dashboard",
  "quality_dashboard",
] as const;

export type DashboardPermissionId = (typeof DASHBOARD_PERMISSION_IDS)[number];

export type DashboardBoardDefinition = {
  id: DashboardPermissionId;
  label: string;
  shortLabel: string;
  department: string;
  route?: string;
};

export const DASHBOARD_BOARD_DEFINITIONS: DashboardBoardDefinition[] = [
  {
    id: "boss_dashboard",
    label: "经营看板",
    shortLabel: "经营看板",
    department: "首页",
    route: "/boss/dashboard",
  },
  {
    id: "sales_dashboard",
    label: "销售部看板",
    shortLabel: "销售看板",
    department: "销售部",
    route: "/sales/dashboard",
  },
  {
    id: "production_dashboard",
    label: "生产部看板",
    shortLabel: "生产看板",
    department: "生产部",
    route: "/production/dashboard",
  },
  {
    id: "purchase_dashboard",
    label: "采购部看板",
    shortLabel: "采购看板",
    department: "采购部",
    route: "/purchase/dashboard",
  },
  {
    id: "finance_dashboard",
    label: "财务部看板",
    shortLabel: "财务看板",
    department: "财务部",
    route: "/finance/dashboard",
  },
  {
    id: "quality_dashboard",
    label: "质量部看板",
    shortLabel: "质量看板",
    department: "质量部",
    route: "/quality/dashboard",
  },
];

export const DEPARTMENT_DASHBOARD_DEFINITIONS = DASHBOARD_BOARD_DEFINITIONS.filter(
  (item) => item.id !== "boss_dashboard",
);

export const DEPARTMENT_DASHBOARD_PERMISSION_IDS = DEPARTMENT_DASHBOARD_DEFINITIONS.map(
  (item) => item.id,
) as Exclude<DashboardPermissionId, "boss_dashboard">[];

export function isDashboardPermissionId(value: unknown): value is DashboardPermissionId {
  return DASHBOARD_PERMISSION_IDS.includes(value as DashboardPermissionId);
}

export function parseDashboardPermissionIds(raw: unknown): DashboardPermissionId[] {
  if (Array.isArray(raw)) {
    return raw.filter(isDashboardPermissionId);
  }

  const value = String(raw ?? "").trim();
  if (!value) return [];

  return value
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((item) => item.trim())
    .filter(isDashboardPermissionId);
}

export function getDashboardBoardDefinition(id: DashboardPermissionId) {
  return DASHBOARD_BOARD_DEFINITIONS.find((item) => item.id === id) ?? null;
}

export function getDashboardBoardLabel(id: DashboardPermissionId) {
  return getDashboardBoardDefinition(id)?.label ?? id;
}
