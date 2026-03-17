export const PRODUCT_CATEGORY_VALUES = [
  "finished",
  "semi_finished",
  "raw_material",
  "component",
  "equipment",
  "consumable",
  "packaging_material",
  "other",
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORY_VALUES[number];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  finished: "成品",
  semi_finished: "半成品",
  raw_material: "原材料",
  component: "组件",
  equipment: "设备",
  consumable: "耗材",
  packaging_material: "包装材料",
  other: "其他",
};

export const PRODUCT_CATEGORY_PREFIXES: Record<ProductCategory, string> = {
  finished: "CP",
  semi_finished: "BCP",
  raw_material: "YCL",
  component: "ZJ",
  equipment: "SB",
  consumable: "HC",
  packaging_material: "BZ",
  other: "QT",
};

export const PRODUCT_CATEGORY_OPTIONS = PRODUCT_CATEGORY_VALUES.map((value) => ({
  value,
  label: PRODUCT_CATEGORY_LABELS[value],
  prefix: PRODUCT_CATEGORY_PREFIXES[value],
}));

export const PRODUCT_CATEGORY_DEFAULT_PRODUCTION_CLASS: Record<ProductCategory, string> = {
  finished: "finished_goods",
  semi_finished: "semi_finished",
  raw_material: "raw_material",
  component: "component",
  equipment: "tool_fixture",
  consumable: "production_consumable",
  packaging_material: "outer_packaging",
  other: "other",
};

export const PRODUCT_CATEGORY_BOM_LEVEL2_VALUES: readonly ProductCategory[] = [
  "semi_finished",
  "raw_material",
  "component",
  "consumable",
  "packaging_material",
  "other",
] as const;

export const PRODUCT_CATEGORY_BOM_LEVEL3_VALUES: readonly ProductCategory[] = [
  "raw_material",
  "component",
  "consumable",
  "packaging_material",
  "other",
] as const;

export const PRODUCT_CATEGORY_PRODUCTION_ISSUE_EXCLUDED_VALUES: readonly ProductCategory[] = [
  "consumable",
  "packaging_material",
] as const;

export function isProductionIssueExcludedCategory(
  value?: string | null
): value is ProductCategory {
  return PRODUCT_CATEGORY_PRODUCTION_ISSUE_EXCLUDED_VALUES.includes(
    String(value || "").trim() as ProductCategory
  );
}

export const PRODUCT_CATEGORY_CUSTOMS_EXCLUDED_VALUES: readonly ProductCategory[] = [
  "raw_material",
  "component",
  "equipment",
  "consumable",
  "packaging_material",
] as const;
