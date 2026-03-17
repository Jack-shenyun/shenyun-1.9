export type FormVisibilityItem = {
  id: string;
  label: string;
  menuId: string;
};

export type FormVisibilityGroup = {
  id: string;
  label: string;
  items: readonly FormVisibilityItem[];
};

export const FORM_VISIBILITY_GROUPS: readonly FormVisibilityGroup[] = [
  {
    id: "admin",
    label: "管理部",
    items: [
      { id: "/admin/documents", label: "知识库", menuId: "admin" },
      { id: "/admin/personnel", label: "人事管理", menuId: "admin" },
      { id: "/admin/training", label: "培训管理", menuId: "admin" },
      { id: "/admin/audit", label: "内审管理", menuId: "admin" },
      { id: "/admin/expense", label: "费用报销", menuId: "admin" },
      { id: "/admin/overtime", label: "加班申请", menuId: "admin" },
      { id: "/admin/leave", label: "请假申请", menuId: "admin" },
      { id: "/admin/outing", label: "外出申请", menuId: "admin" },
    ],
  },
  {
    id: "investment",
    label: "招商部",
    items: [
      { id: "/investment/dealer", label: "首营管理", menuId: "investment" },
      {
        id: "/investment/authorization",
        label: "授权书管理",
        menuId: "investment",
      },
      {
        id: "/investment/agreement",
        label: "经销商协议",
        menuId: "investment",
      },
      { id: "/investment/platform", label: "平台管理", menuId: "investment" },
      { id: "/investment/listing", label: "挂网管理", menuId: "investment" },
      { id: "/investment/hospital", label: "入院管理", menuId: "investment" },
    ],
  },
  {
    id: "sales",
    label: "销售部",
    items: [
      { id: "/sales/customers", label: "客户管理", menuId: "sales" },
      { id: "/sales/quotes", label: "报价单", menuId: "sales" },
      { id: "/sales/orders", label: "订单管理", menuId: "sales" },
      { id: "/sales/customs", label: "报关管理", menuId: "sales" },
      { id: "/sales/hs-codes", label: "HS编码库", menuId: "sales" },
      {
        id: "/sales/finance-collaboration",
        label: "财务协同",
        menuId: "sales",
      },
      { id: "/sales/reconciliation", label: "对账管理", menuId: "sales" },
    ],
  },
  {
    id: "rd",
    label: "研发部",
    items: [
      { id: "/rd/products", label: "产品管理", menuId: "rd" },
      { id: "/rd/projects", label: "项目管理", menuId: "rd" },
      { id: "/rd/drawings", label: "图纸管理", menuId: "rd" },
    ],
  },
  {
    id: "production",
    label: "生产部",
    items: [
      {
        id: "/production/plan-board",
        label: "生产计划看板",
        menuId: "production",
      },
      { id: "/production/orders", label: "生产指令", menuId: "production" },
      {
        id: "/production/material-requisition",
        label: "领料单",
        menuId: "production",
      },
      {
        id: "/production/staging-area",
        label: "暂存区管理",
        menuId: "production",
      },
      { id: "/production/records", label: "生产记录单", menuId: "production" },
      {
        id: "/production/routing-cards",
        label: "生产流转单",
        menuId: "production",
      },
      { id: "/production/udi/print", label: "标签打印", menuId: "production" },
      {
        id: "/production/large-packaging",
        label: "大包装记录",
        menuId: "production",
      },
      {
        id: "/production/pending-scrap-records",
        label: "待报废记录",
        menuId: "production",
      },
      {
        id: "/production/sterilization",
        label: "委外灭菌单",
        menuId: "production",
      },
      {
        id: "/production/warehouse-entry",
        label: "生产入库申请",
        menuId: "production",
      },
      { id: "/production/bom", label: "BOM物料清单", menuId: "production" },
      { id: "/production/mrp", label: "MRP物料计划", menuId: "production" },
      { id: "/production/equipment", label: "设备管理", menuId: "production" },
      {
        id: "/production/equipment-inspection",
        label: "设备点检",
        menuId: "production",
      },
      {
        id: "/production/equipment-maintenance",
        label: "设备保养",
        menuId: "production",
      },
      {
        id: "/production/environment",
        label: "记录管理",
        menuId: "production",
      },
      {
        id: "/production/process",
        label: "生产工序管理",
        menuId: "production",
      },
    ],
  },
  {
    id: "quality",
    label: "质量部",
    items: [
      { id: "/quality/lab", label: "实验室管理", menuId: "quality" },
      { id: "/quality/iqc", label: "来料检验", menuId: "quality" },
      { id: "/quality/ipqc", label: "过程检验", menuId: "quality" },
      { id: "/quality/oqc", label: "成品检验", menuId: "quality" },
      { id: "/quality/release-records", label: "放行记录", menuId: "quality" },
      { id: "/quality/samples", label: "留样管理", menuId: "quality" },
      { id: "/quality/incidents", label: "不良事件", menuId: "quality" },
      {
        id: "/quality/inspection-requirements",
        label: "检验要求",
        menuId: "quality",
      },
    ],
  },
  {
    id: "purchase",
    label: "采购部",
    items: [
      { id: "/purchase/plan", label: "采购计划", menuId: "purchase" },
      { id: "/purchase/suppliers", label: "供应商管理", menuId: "purchase" },
      { id: "/purchase/orders", label: "采购执行", menuId: "purchase" },
      { id: "/purchase/requests", label: "采购申请", menuId: "purchase" },
      { id: "/purchase/goods-receipt", label: "到货管理", menuId: "purchase" },
      { id: "/purchase/reconciliation", label: "对账管理", menuId: "purchase" },
      { id: "/purchase/finance", label: "财务协同", menuId: "purchase" },
    ],
  },
  {
    id: "warehouse",
    label: "仓库管理",
    items: [
      { id: "/warehouse/warehouses", label: "仓库管理", menuId: "warehouse" },
      { id: "/warehouse/inbound", label: "入库管理", menuId: "warehouse" },
      { id: "/warehouse/outbound", label: "出库管理", menuId: "warehouse" },
      { id: "/warehouse/inventory", label: "库存控制", menuId: "warehouse" },
      { id: "/warehouse/stocktake", label: "盘点管理", menuId: "warehouse" },
    ],
  },
  {
    id: "finance",
    label: "财务部",
    items: [
      { id: "/finance/ledger", label: "总账管理", menuId: "finance" },
      { id: "/finance/receivable", label: "应收管理", menuId: "finance" },
      { id: "/finance/payable", label: "应付管理", menuId: "finance" },
      { id: "/finance/accounts", label: "账户管理", menuId: "finance" },
      { id: "/finance/cost", label: "成本核算", menuId: "finance" },
      { id: "/finance/salaries", label: "人员工资", menuId: "finance" },
      { id: "/finance/invoice", label: "发票管理", menuId: "finance" },
      { id: "/finance/reimbursement", label: "报销管理", menuId: "finance" },
      {
        id: "/finance/expense-management",
        label: "费用管理",
        menuId: "finance",
      },
      { id: "/finance/seals", label: "印章管理", menuId: "finance" },
      { id: "/finance/reports", label: "报表中心", menuId: "finance" },
    ],
  },
  {
    id: "udi",
    label: "UDI管理",
    items: [
      { id: "/production/udi/archive", label: "UDI档案", menuId: "udi" },
      { id: "/production/udi/designer", label: "标签设计器", menuId: "udi" },
      { id: "/production/udi/report", label: "UDI上报", menuId: "udi" },
    ],
  },
  {
    id: "batch-management",
    label: "批记录管理",
    items: [
      {
        id: "/production/batch-records",
        label: "批记录查询",
        menuId: "batch-management",
      },
      {
        id: "/production/batch-review-records",
        label: "批记录审核记录",
        menuId: "batch-management",
      },
      {
        id: "/ra/regulatory-release-records",
        label: "法规放行记录",
        menuId: "batch-management",
      },
    ],
  },
  {
    id: "settings",
    label: "系统设置",
    items: [
      { id: "/settings/company", label: "公司信息", menuId: "settings" },
      { id: "/settings/departments", label: "部门设置", menuId: "settings" },
      { id: "/settings/codes", label: "编码设置", menuId: "settings" },
      { id: "/settings/users", label: "用户设置", menuId: "settings" },
      { id: "/settings/workflows", label: "审批流程", menuId: "settings" },
      { id: "/settings/language", label: "语言设置", menuId: "settings" },
      { id: "/settings/audit-trail", label: "审计追踪", menuId: "settings" },
      { id: "/settings/signature", label: "签名页", menuId: "settings" },
      {
        id: "/settings/print-templates",
        label: "打印模板",
        menuId: "settings",
      },
      { id: "/settings/email", label: "邮件通知", menuId: "settings" },
      { id: "/settings/recycle-bin", label: "回收箱", menuId: "settings" },
    ],
  },
] as const;

export const FORM_VISIBILITY_IDS = FORM_VISIBILITY_GROUPS.flatMap(group =>
  group.items.map(item => item.id)
);

const FORM_VISIBILITY_ITEM_MAP = new Map(
  FORM_VISIBILITY_GROUPS.flatMap(group =>
    group.items.map(item => [item.id, item] as const)
  )
);

export function parseVisibleFormIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return Array.from(
      new Set(
        raw
          .map(item => String(item || "").trim())
          .filter(item => FORM_VISIBILITY_ITEM_MAP.has(item))
      )
    );
  }

  const value = String(raw ?? "").trim();
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split(/[,\uFF0C;；、|\s]+/)
        .map(item => item.trim())
        .filter(item => FORM_VISIBILITY_ITEM_MAP.has(item))
    )
  );
}

export function getFormVisibilityItem(id: string) {
  return FORM_VISIBILITY_ITEM_MAP.get(id) ?? null;
}

export function getFormVisibilityLabel(id: string) {
  return getFormVisibilityItem(id)?.label ?? id;
}
