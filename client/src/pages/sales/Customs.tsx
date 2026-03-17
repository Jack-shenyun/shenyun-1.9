import { formatDateValue, formatDate } from "@/lib/formatters";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { PrintTemplate } from "@/components/PrintTemplate";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Ship,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { rawTemplateValue, renderPrintTemplate } from "@shared/printTemplateRenderer";
import { CUSTOMS_PRINT_TEMPLATE_DEFAULTS } from "@shared/customsPrintTemplateDefaults";
import { buildMergedCustomsPdf } from "./customsPdf";

interface CustomsRecord {
  id: number;
  declarationNo: string;
  orderNo: string;
  salesOrderNo?: string;
  salesPersonName?: string;
  customerName: string;
  productName: string;
  quantity: number;
  unit: string;
  currency: string;
  amount: number;
  destination: string;
  portOfLoading: string;
  portOfDischarge: string;
  shippingMethod: string;
  hsCode: string;
  status: "preparing" | "submitted" | "cleared" | "shipped";
  declarationDate: string;
  clearanceDate: string;
  shippingDate: string;
  trackingNo: string;
  remarks: string;
}

interface HsCodeEntry {
  id: number;
  code: string;
  category: string;
  productName: string;
  productId?: number;
  productAlias?: string;
  declarationElements: string;
  unit: string;
}

const statusMap: Record<string, any> = {
  preparing: { label: "准备中", variant: "outline" as const },
  submitted: { label: "正式报关", variant: "secondary" as const },
  cleared: { label: "已通关", variant: "default" as const },
  shipped: { label: "已发运", variant: "secondary" as const },
};

type CustomsDocType = "商业发票" | "装箱单" | "申报要素" | "报关单";

interface CustomsMainData {
  customsId: number;
  orderId: number;
  customerName: string;
  sellerName: string;
  sellerAddress: string;
  buyerName: string;
  buyerAddress: string;
  consignee: string;
  notifyParty: string;
  loadingPort: string;
  destinationPort: string;
  shipmentMethod: string;
  tradeTerm: string;
  paymentTerm: string;
  currency: string;
  contractNo: string;
  grossWeight: string;
  netWeight: string;
  totalVolume: string;
  totalPackages: string;
}

interface CustomsItemData {
  customsItemId: number;
  customsId: number;
  itemNo: string;
  productName: string;
  productNameCn: string;
  productNameEn: string;
  model: string;
  specificationModel: string;
  descriptionEn: string;
  quantity: string;
  unit: string;
  quantityUnit: string;
  unitPrice: string;
  totalPrice: string;
  currency: string;
  hsCode: string;
  declarationElements: string;
  brand: string;
  brandType: string;
  usage: string;
  material: string;
  functionPurpose: string;
  applicationScope: string;
  countryOfOrigin: string;
  cartonNo: string;
  qtyPerCarton: string;
  totalQuantity: string;
  packingNote: string;
  countryOfOriginLabel: string;
  finalDestinationCountry: string;
  domesticSource: string;
  registrationNo: string;
  gtin: string;
  cas: string;
  otherNote: string;
  exemptionNature: string;
}

interface CommercialInvoiceExt {
  invoiceNo: string;
  invoiceDate: string;
  subtotal: string;
  freight: string;
  insurance: string;
  totalAmount: string;
  bankInfo: string;
}

interface PackingListExt {
  packingListNo: string;
  packingDate: string;
  packageType: string;
}

interface DeclarationElementsExt {
  exportBenefit: string;
}

interface CustomsDeclarationExt {
  declarationNo: string;
  recordNo: string;
  customsPort: string;
  exportDate: string;
  declareDate: string;
  licenseNo: string;
  businessUnit: string;
  consignor: string;
  domesticSource: string;
  supervisionMode: string;
  transportMode: string;
  transportTool: string;
  billNo: string;
  levyNature: string;
  settlementMode: string;
  tradeCountry: string;
  destinationCountry: string;
  domesticDestination: string;
  overseasConsignee: string;
  overseasShipper: string;
  productionSalesUnit: string;
  packageType: string;
  transactionMethod: string;
  freight: string;
  insurance: string;
  incidentalFee: string;
  marksRemarks: string;
}

interface CustomsDocumentState {
  customsMain: CustomsMainData;
  customsItems: CustomsItemData[];
  documents: {
    commercialInvoice: CommercialInvoiceExt;
    packingList: PackingListExt;
    declarationElements: DeclarationElementsExt;
    customsDeclaration: CustomsDeclarationExt;
  };
}

type FormFieldType = "text" | "date" | "number" | "select" | "textarea";

interface FieldConfig {
  key: string;
  label: string;
  type?: FormFieldType;
  options?: string[];
  rows?: number;
}

const documentTypeKeyMap: Record<CustomsDocType, keyof CustomsDocumentState["documents"]> = {
  商业发票: "commercialInvoice",
  装箱单: "packingList",
  申报要素: "declarationElements",
  报关单: "customsDeclaration",
};

function splitDeclarationElementLines(value: string): string[] {
  return String(value || "")
    .split(/[\r\n]+|(?<=.)[;；]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

const DEFAULT_DECLARATION_BRAND = "SHENYUN";
const DEFAULT_DECLARATION_BRAND_TYPE = "境内自主品牌";
const DEFAULT_EXPORT_BENEFIT = "否";

function normalizeProductKeywordText(item: Partial<CustomsItemData>, matched?: HsCodeEntry) {
  return [
    item.productNameCn,
    item.productName,
    item.productNameEn,
    item.descriptionEn,
    matched?.productAlias,
    matched?.productName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inferDeclarationMaterial(item: Partial<CustomsItemData>, matched?: HsCodeEntry) {
  const explicit = String(item.material || "").trim();
  if (explicit) return explicit;

  const text = normalizeProductKeywordText(item, matched);
  if (text.includes("硅胶") || text.includes("silicone")) return "硅胶";
  if (text.includes("pvc")) return "PVC";
  if (text.includes("乳胶")) return "乳胶";
  if (text.includes("橡胶") || text.includes("rubber")) return "硫化橡胶";
  if (text.includes("塑料") || text.includes("plastic")) return "塑料";
  return "";
}

function inferDeclarationUsage(item: Partial<CustomsItemData>, matched?: HsCodeEntry) {
  const explicit = String(item.usage || "").trim();
  if (explicit) return explicit;

  const text = normalizeProductKeywordText(item, matched);
  if (text.includes("引流")) return "医用引流";
  if (text.includes("胃管")) return "胃肠减压、营养输入";
  if (text.includes("导尿")) return "导尿";
  if (text.includes("穿刺")) return "外科或腔镜手术穿刺、建立通道";
  if (text.includes("输血")) return "输血";
  if (text.includes("注射")) return "注射";
  if (text.includes("缝合")) return "缝合";
  if (text.includes("手套")) return "医疗防护";
  if (text.includes("支架")) return "植入血管狭窄部位起支撑作用";
  if (text.includes("节育")) return "宫内避孕";
  if (text.includes("袋") || text.includes("包")) return "包装";
  if (text.includes("塞") || text.includes("盖")) return "封装";
  if (matched?.category === "医疗器械") return "医用";
  return "";
}

function inferDeclarationPrinciple(item: Partial<CustomsItemData>, matched?: HsCodeEntry) {
  const text = normalizeProductKeywordText(item, matched);
  if (text.includes("支架")) return "植入后支撑病变部位，保持通畅";
  if (text.includes("节育")) return "通过宫内放置达到避孕作用";
  return "";
}

function fillDeclarationElementLine(
  label: string,
  item: Partial<CustomsItemData>,
  matched?: HsCodeEntry,
) {
  const productTitle = String(item.productNameCn || item.productName || matched?.productAlias || matched?.productName || "").trim();
  const brand = String(item.brand || "").trim() || DEFAULT_DECLARATION_BRAND;
  const brandType = String(item.brandType || "").trim() || DEFAULT_DECLARATION_BRAND_TYPE;
  const usage = inferDeclarationUsage(item, matched);
  const material = inferDeclarationMaterial(item, matched);
  const principle = inferDeclarationPrinciple(item, matched);
  const model = String(item.model || item.specificationModel || "").trim();
  const registrationNo = String(item.registrationNo || "").trim();
  const gtin = String(item.gtin || "").trim();
  const cas = String(item.cas || "").trim();
  const otherNote = String(item.otherNote || "").trim();
  const text = label.toLowerCase();

  let value = "";
  if (text.includes("品名")) value = productTitle;
  else if (text.includes("品牌类型")) value = brandType;
  else if (text.includes("出口享惠情况")) value = DEFAULT_EXPORT_BENEFIT;
  else if (text.includes("用途")) value = usage;
  else if (text.includes("组成或构成") || text.includes("材质")) value = material;
  else if (text.includes("原理")) value = principle;
  else if (text.includes("品牌")) value = brand;
  else if (text.includes("型号")) value = model;
  else if (text.includes("技术参数")) value = String(item.specificationModel || item.model || "").trim();
  else if (text.includes("注册编号")) value = registrationNo;
  else if (text.includes("gtin")) value = gtin;
  else if (text.includes("cas")) value = cas;
  else if (text.includes("成分")) value = material;
  else if (text.includes("规格型号")) value = model;
  else if (text.includes("是否海绵橡胶")) value = normalizeProductKeywordText(item, matched).includes("海绵") ? "是" : "否";
  else if (text.includes("是否机器及仪器用")) value = "否";
  else if (text.includes("是否硫化")) value = material.includes("橡胶") || material.includes("硅胶") ? "是" : "";
  else if (text.includes("其他")) value = otherNote;

  return `${label}: ${value}`.trim();
}

function buildDeclarationElementsForItem(
  item: Partial<CustomsItemData>,
  matched?: HsCodeEntry,
) {
  const labels = splitDeclarationElementLines(String(matched?.declarationElements || item.declarationElements || ""));
  if (labels.length === 0) return "";
  return labels
    .map((line) => line.replace(/^\d+\s*[:：]\s*/, "").trim())
    .filter(Boolean)
    .map((label) => fillDeclarationElementLine(label, item, matched))
    .join("\n");
}

const emptyMainData = (): CustomsMainData => ({
  customsId: 0,
  orderId: 0,
  customerName: "",
  sellerName: "苏州神韵医疗器械有限公司",
  sellerAddress: "江苏省苏州市吴中区临湖镇银藏路666号11幢",
  buyerName: "",
  buyerAddress: "",
  consignee: "",
  notifyParty: "",
  loadingPort: "",
  destinationPort: "",
  shipmentMethod: "海运",
  tradeTerm: "",
  paymentTerm: "",
  currency: "USD",
  contractNo: "",
  grossWeight: "",
  netWeight: "",
  totalVolume: "",
  totalPackages: "",
});

const emptyItemData = (customsId = 0, customsItemId = Date.now()): CustomsItemData => ({
  customsItemId,
  customsId,
  itemNo: "1",
  productName: "",
  productNameCn: "",
  productNameEn: "",
  model: "",
  specificationModel: "",
  descriptionEn: "",
  quantity: "",
  unit: "PCS",
  quantityUnit: "PCS",
  unitPrice: "",
  totalPrice: "",
  currency: "USD",
  hsCode: "9018390000",
  declarationElements: "",
  brand: "",
  brandType: "",
  usage: "",
  material: "",
  functionPurpose: "",
  applicationScope: "",
  countryOfOrigin: "",
  cartonNo: "",
  qtyPerCarton: "",
  totalQuantity: "",
  packingNote: "",
  countryOfOriginLabel: "",
  finalDestinationCountry: "",
  domesticSource: "",
  registrationNo: "",
  gtin: "",
  cas: "",
  otherNote: "",
  exemptionNature: "",
});

const emptyDocumentState = (): CustomsDocumentState => ({
  customsMain: emptyMainData(),
  customsItems: [emptyItemData()],
  documents: {
    commercialInvoice: {
      invoiceNo: "",
      invoiceDate: "",
      subtotal: "",
      freight: "",
      insurance: "",
      totalAmount: "",
      bankInfo: "",
    },
    packingList: {
      packingListNo: "",
      packingDate: "",
      packageType: "",
    },
    declarationElements: {
      exportBenefit: "",
    },
    customsDeclaration: {
      declarationNo: "",
      recordNo: "",
      customsPort: "",
      exportDate: "",
      declareDate: "",
      licenseNo: "",
      businessUnit: "",
      consignor: "",
      domesticSource: "",
      supervisionMode: "",
      transportMode: "",
      transportTool: "",
      billNo: "",
      levyNature: "",
      settlementMode: "",
      tradeCountry: "",
      destinationCountry: "",
      domesticDestination: "",
      overseasConsignee: "",
      overseasShipper: "",
      productionSalesUnit: "",
      packageType: "",
      transactionMethod: "",
      freight: "",
      insurance: "",
      incidentalFee: "",
      marksRemarks: "",
    },
  },
});

const invoiceMainFields: FieldConfig[] = [
  { key: "sellerName", label: "卖方" },
  { key: "sellerAddress", label: "卖方地址" },
  { key: "buyerName", label: "买方" },
  { key: "buyerAddress", label: "买方地址" },
  { key: "consignee", label: "收货人" },
  { key: "notifyParty", label: "通知方" },
  { key: "tradeTerm", label: "贸易条款" },
  { key: "paymentTerm", label: "付款条件" },
  { key: "currency", label: "币种", type: "select", options: ["USD", "EUR", "GBP", "JPY", "CNY"] },
  { key: "contractNo", label: "合同号" },
];

const packingMainFields: FieldConfig[] = [
  { key: "consignee", label: "收货人" },
  { key: "notifyParty", label: "通知方" },
  { key: "contractNo", label: "合同号" },
  { key: "loadingPort", label: "起运港", type: "select", options: ["上海港", "深圳港", "宁波港", "青岛港", "天津港", "广州港"] },
  { key: "destinationPort", label: "目的港" },
  { key: "shipmentMethod", label: "运输方式", type: "select", options: ["海运", "空运", "陆运", "快递"] },
  { key: "grossWeight", label: "毛重" },
  { key: "netWeight", label: "净重" },
  { key: "totalVolume", label: "总体积" },
  { key: "totalPackages", label: "总件数", type: "number" },
];

const declarationMainFields: FieldConfig[] = [
  { key: "currency", label: "币种", type: "select", options: ["USD", "EUR", "GBP", "JPY", "CNY"] },
];

const customsDeclarationMainFields: FieldConfig[] = [
  { key: "loadingPort", label: "起运港", type: "select", options: ["上海港", "深圳港", "宁波港", "青岛港", "天津港", "广州港"] },
  { key: "destinationPort", label: "目的港" },
  { key: "shipmentMethod", label: "运输方式", type: "select", options: ["海运", "空运", "陆运", "快递"] },
  { key: "tradeTerm", label: "贸易条款" },
  { key: "paymentTerm", label: "付款条件" },
  { key: "contractNo", label: "合同号" },
  { key: "grossWeight", label: "毛重" },
  { key: "netWeight", label: "净重" },
  { key: "totalPackages", label: "件数", type: "number" },
];

const invoiceExtFields: FieldConfig[] = [
  { key: "invoiceNo", label: "发票号" },
  { key: "invoiceDate", label: "发票日期", type: "date" },
  { key: "subtotal", label: "小计", type: "number" },
  { key: "freight", label: "运费", type: "number" },
  { key: "insurance", label: "保险费", type: "number" },
  { key: "totalAmount", label: "总金额", type: "number" },
  { key: "bankInfo", label: "银行信息", type: "textarea", rows: 3 },
];

const packingExtFields: FieldConfig[] = [
  { key: "packingListNo", label: "装箱单号" },
  { key: "packingDate", label: "装箱日期", type: "date" },
  { key: "packageType", label: "包装类型" },
];

const declarationExtFields: FieldConfig[] = [
  { key: "exportBenefit", label: "出口享惠情况" },
];

const declarationDialogPrimaryFields: FieldConfig[] = [
  { key: "currency", label: "币制", type: "select", options: ["USD", "EUR", "GBP", "JPY", "CNY"] },
  { key: "exportBenefit", label: "出口享惠情况" },
  { key: "exemptionNature", label: "征免" },
  { key: "brandType", label: "品牌类型" },
  { key: "declarationElements", label: "申报要素", type: "textarea", rows: 2 },
  { key: "usage", label: "用途", type: "textarea", rows: 2 },
  { key: "material", label: "组成或构成", type: "textarea", rows: 2 },
  { key: "brand", label: "品牌" },
  { key: "model", label: "型号" },
  { key: "registrationNo", label: "注册编号" },
  { key: "gtin", label: "GTIN" },
  { key: "cas", label: "CAS" },
  { key: "otherNote", label: "其他" },
];

const customsDeclarationExtFields: FieldConfig[] = [
  { key: "declarationNo", label: "报关单号" },
  { key: "recordNo", label: "备案号" },
  { key: "customsPort", label: "申报口岸" },
  { key: "exportDate", label: "出口日期", type: "date" },
  { key: "declareDate", label: "申报日期", type: "date" },
  { key: "licenseNo", label: "许可证号" },
  { key: "businessUnit", label: "经营单位" },
  { key: "consignor", label: "发货单位" },
  { key: "domesticSource", label: "境内货源地" },
  { key: "supervisionMode", label: "监管方式" },
  { key: "transportMode", label: "运输方式" },
  { key: "transportTool", label: "运输工具" },
  { key: "billNo", label: "提运单号" },
  { key: "levyNature", label: "征免性质" },
  { key: "settlementMode", label: "结汇方式" },
  { key: "tradeCountry", label: "贸易国" },
  { key: "destinationCountry", label: "运抵国" },
  { key: "domesticDestination", label: "境内目的地" },
  { key: "overseasConsignee", label: "境外收货人" },
  { key: "overseasShipper", label: "境外发货人" },
  { key: "productionSalesUnit", label: "生产销售单位" },
  { key: "packageType", label: "包装种类" },
  { key: "transactionMethod", label: "成交方式" },
  { key: "freight", label: "运费", type: "number" },
  { key: "insurance", label: "保费", type: "number" },
  { key: "incidentalFee", label: "杂费", type: "number" },
  { key: "marksRemarks", label: "标记唛码及备注", type: "textarea", rows: 3 },
];

const customsDeclarationDialogPrimaryFields: FieldConfig[] = [
  { key: "declarationNo", label: "报关单号" },
  { key: "customsPort", label: "出境关别" },
  { key: "exportDate", label: "出口日期", type: "date" },
  { key: "declareDate", label: "申报日期", type: "date" },
  { key: "recordNo", label: "备案号" },
  { key: "overseasConsignee", label: "境外收货人" },
  { key: "transportMode", label: "运输方式", type: "select", options: ["海运", "空运", "陆运", "快递"] },
  { key: "transportTool", label: "运输工具名称及航次号" },
  { key: "billNo", label: "提运单号" },
  { key: "productionSalesUnit", label: "生产销售单位" },
  { key: "supervisionMode", label: "监管方式" },
  { key: "levyNature", label: "征免性质" },
  { key: "licenseNo", label: "许可证号" },
  { key: "contractNo", label: "合同协议号" },
  { key: "tradeCountry", label: "贸易国（地区）" },
  { key: "destinationCountry", label: "运抵国（地区）" },
  { key: "domesticDestination", label: "指运港" },
  { key: "loadingPort", label: "离境口岸", type: "select", options: ["上海港", "深圳港", "宁波港", "青岛港", "天津港", "广州港"] },
  { key: "packageType", label: "包装种类" },
  { key: "totalPackages", label: "件数", type: "number" },
  { key: "grossWeight", label: "毛重(千克)" },
  { key: "netWeight", label: "净重(千克)" },
  { key: "transactionMethod", label: "成交方式" },
  { key: "freight", label: "运费", type: "number" },
  { key: "insurance", label: "保费", type: "number" },
  { key: "incidentalFee", label: "杂费", type: "number" },
  { key: "marksRemarks", label: "标记唛码及备注", type: "textarea", rows: 3 },
];

const customsDeclarationFieldSpanMap: Partial<Record<string, string>> = {
  declarationNo: "md:col-span-3",
  customsPort: "md:col-span-3",
  exportDate: "md:col-span-3",
  declareDate: "md:col-span-3",
  recordNo: "md:col-span-3",
  overseasConsignee: "md:col-span-5",
  transportMode: "md:col-span-2",
  transportTool: "md:col-span-5",
  billNo: "md:col-span-3",
  productionSalesUnit: "md:col-span-5",
  supervisionMode: "md:col-span-2",
  levyNature: "md:col-span-2",
  licenseNo: "md:col-span-3",
  contractNo: "md:col-span-3",
  tradeCountry: "md:col-span-3",
  destinationCountry: "md:col-span-3",
  domesticDestination: "md:col-span-3",
  loadingPort: "md:col-span-3",
  packageType: "md:col-span-2",
  totalPackages: "md:col-span-2",
  grossWeight: "md:col-span-2",
  netWeight: "md:col-span-2",
  transactionMethod: "md:col-span-2",
  freight: "md:col-span-2",
  insurance: "md:col-span-2",
  incidentalFee: "md:col-span-2",
  marksRemarks: "md:col-span-6",
};

const invoiceItemFields: FieldConfig[] = [
  { key: "productName", label: "产品名称" },
  { key: "model", label: "型号" },
  { key: "descriptionEn", label: "英文描述" },
  { key: "quantity", label: "数量", type: "number" },
  { key: "unit", label: "单位" },
  { key: "unitPrice", label: "单价", type: "number" },
  { key: "totalPrice", label: "总价", type: "number" },
];

const invoiceDialogPrimaryFields: FieldConfig[] = [
  { key: "invoiceNo", label: "发票号" },
  { key: "invoiceDate", label: "发票日期", type: "date" },
  { key: "contractNo", label: "合同号" },
  { key: "currency", label: "币种", type: "select", options: ["USD", "EUR", "GBP", "JPY", "CNY"] },
  { key: "buyerName", label: "买方" },
  { key: "buyerAddress", label: "买方地址" },
  { key: "tradeTerm", label: "贸易条款" },
  { key: "paymentTerm", label: "付款条件" },
  { key: "freight", label: "运费", type: "number" },
];

const packingDialogPrimaryFields: FieldConfig[] = [
  { key: "packingListNo", label: "装箱单号" },
  { key: "packingDate", label: "装箱日期", type: "date" },
  { key: "contractNo", label: "合同号" },
  { key: "packageType", label: "包装类型" },
  { key: "consignee", label: "收货人" },
  { key: "notifyParty", label: "通知方" },
  { key: "totalPackages", label: "总件数", type: "number" },
  { key: "grossWeight", label: "毛重" },
  { key: "netWeight", label: "净重" },
  { key: "totalVolume", label: "总体积" },
];

const packingItemFields: FieldConfig[] = [
  { key: "productName", label: "产品名称" },
  { key: "model", label: "型号" },
  { key: "cartonNo", label: "箱号" },
  { key: "qtyPerCarton", label: "每箱数量", type: "number" },
  { key: "totalQuantity", label: "总数量", type: "number" },
  { key: "unit", label: "单位" },
  { key: "packingNote", label: "装箱备注", type: "textarea", rows: 2 },
];

const declarationItemFields: FieldConfig[] = [
  { key: "itemNo", label: "项号" },
  { key: "hsCode", label: "商品编号" },
  { key: "productNameCn", label: "商品名称" },
  { key: "specificationModel", label: "规格型号" },
  { key: "quantityUnit", label: "数量及单位" },
  { key: "finalDestinationCountry", label: "最终目的国" },
  { key: "unitPrice", label: "单价USD", type: "number" },
  { key: "totalPrice", label: "总价USD", type: "number" },
];

const customsDeclarationItemFields: FieldConfig[] = [
  { key: "itemNo", label: "项号" },
  { key: "hsCode", label: "商品编号" },
  { key: "productName", label: "商品名称" },
  { key: "specificationModel", label: "规格型号" },
  { key: "quantityUnit", label: "数量及单位" },
  { key: "unitPrice", label: "单价", type: "number" },
  { key: "totalPrice", label: "总价", type: "number" },
  { key: "currency", label: "币制" },
  { key: "countryOfOrigin", label: "原产国(地区)" },
  { key: "finalDestinationCountry", label: "最终目的国(地区)" },
  { key: "domesticSource", label: "境内货源地" },
  { key: "exemptionNature", label: "征免" },
];


const currencyOptions = ["USD", "EUR", "GBP", "JPY", "CNY"];
const shippingMethodOptions = ["海运", "空运", "陆运", "快递"];
const portOptions = ["上海港", "深圳港", "宁波港", "青岛港", "天津港", "广州港"];
const customsDetailDocButtons: CustomsDocType[] = ["商业发票", "装箱单", "申报要素", "报关单"];

interface CreatedDocumentEntry {
  type: CustomsDocType;
  createdAt: string;
  data: CustomsDocumentState;
}

interface PersistedCustomsRemarkPayload {
  version: 1;
  note: string;
  documents: Partial<Record<CustomsDocType, CreatedDocumentEntry>>;
}

function parseCustomsRemarkPayload(raw: unknown): PersistedCustomsRemarkPayload {
  const emptyPayload: PersistedCustomsRemarkPayload = {
    version: 1,
    note: "",
    documents: {},
  };
  if (!raw) return emptyPayload;
  const text = String(raw);
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      return {
        version: 1,
        note: typeof parsed.note === "string" ? parsed.note : "",
        documents: parsed.documents && typeof parsed.documents === "object"
          ? parsed.documents as Partial<Record<CustomsDocType, CreatedDocumentEntry>>
          : {},
      };
    }
  } catch {
    return {
      version: 1,
      note: text,
      documents: {},
    };
  }
  return emptyPayload;
}

function stringifyCustomsRemarkPayload(payload: PersistedCustomsRemarkPayload) {
  return JSON.stringify(payload);
}

const customsPrintTemplateIdMap: Record<CustomsDocType, keyof typeof CUSTOMS_PRINT_TEMPLATE_DEFAULTS> = {
  商业发票: "customs_commercial_invoice_en",
  装箱单: "customs_packing_list_en",
  申报要素: "customs_declaration_elements",
  报关单: "customs_declaration_form",
};

function escapeTemplateCell(value: unknown) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTemplateLogoHtml(companyInfo: any) {
  if (companyInfo?.logoUrl) {
    return `<img src="${companyInfo.logoUrl}" alt="logo" style="height:40px;width:auto;object-fit:contain;" />`;
  }
  return `<div style="display:flex;height:40px;width:96px;align-items:center;justify-content:center;border:1px solid #cbd5e1;font-size:14px;font-weight:600;letter-spacing:1px;color:#475569;">SHENYUN</div>`;
}

function buildTemplateRowHtml(cells: Array<unknown>) {
  return `<tr>${cells.map((cell) => `<td>${escapeTemplateCell(cell)}</td>`).join("")}</tr>`;
}

export default function CustomsPage() {
  const trpcUtils = trpc.useUtils();
  const { data: _dbData = [], isLoading, refetch } = trpc.customs.list.useQuery();
  const { data: hsCodeRows = [] } = trpc.hsCodes.list.useQuery(
    { status: "active", limit: 1000 },
    { refetchOnWindowFocus: false },
  );
  const { data: salesOrders = [] } = trpc.salesOrders.list.useQuery({ limit: 1000 });
  const { data: companyInfo } = trpc.companyInfo.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const { data: printTemplates = [] } = trpc.printTemplates.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const { data: receiptAccounts = [] } = trpc.bankAccounts.list.useQuery(
    { status: "active" },
    { refetchOnWindowFocus: false },
  );
  const createMutation = trpc.customs.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.customs.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const saveDocumentMutation = trpc.customs.update.useMutation({ onSuccess: () => { refetch(); } });
  const deleteMutation = trpc.customs.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const hsCodeLibrary = (hsCodeRows as any[]).map((item): HsCodeEntry => ({
    id: Number(item.id || 0),
    code: String(item.code || "").trim(),
    category: String(item.category || ""),
    productName: String(item.productName || ""),
    productId: item.productId ? Number(item.productId) : undefined,
    productAlias: String(item.productAlias || ""),
    declarationElements: String(item.declarationElements || ""),
    unit: String(item.unit || ""),
  }));
  const records = (_dbData as any[]).map((item: any) => {
    const rawRemark = item.remarks ?? item.remark ?? "";
    const parsedRemark = parseCustomsRemarkPayload(rawRemark);
    return {
      ...item,
      remarkRaw: rawRemark,
      remarks: parsedRemark.note,
    };
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CustomsRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<CustomsRecord | null>(null);
  const [documentRecord, setDocumentRecord] = useState<CustomsRecord | null>(null);
  const [documentType, setDocumentType] = useState<CustomsDocType>("商业发票");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocumentType, setPreviewDocumentType] = useState<CustomsDocType>("商业发票");
  const [previewDocumentData, setPreviewDocumentData] = useState<CustomsDocumentState>(emptyDocumentState);
  const [createdDocuments, setCreatedDocuments] = useState<Record<number, Partial<Record<CustomsDocType, CreatedDocumentEntry>>>>({});
  const [generatingMaterialId, setGeneratingMaterialId] = useState<number | null>(null);
  const [detailDocType, setDetailDocType] = useState<CustomsDocType>("商业发票");
  const { canDelete } = usePermission();

  const [formData, setFormData] = useState({
    declarationNo: "",
    orderNo: "",
    customerName: "",
    productName: "",
    quantity: 0,
    unit: "台",
    currency: "USD",
    amount: 0,
    destination: "",
    portOfLoading: "",
    portOfDischarge: "",
    shippingMethod: "海运",
    hsCode: "",
    status: "preparing",
    declarationDate: "",
    clearanceDate: "",
    shippingDate: "",
    trackingNo: "",
    remarks: "",
  });
  const [documentData, setDocumentData] = useState<CustomsDocumentState>(emptyDocumentState);

  const findHsCodeEntry = (code: string) => {
    const normalizedCode = String(code || "").trim();
    if (!normalizedCode) return undefined;
    return hsCodeLibrary.find((item) => item.code === normalizedCode);
  };

  const applyHsCodeToItem = (
    currentItem: CustomsItemData,
    hsCodeValue: string,
  ): CustomsItemData => {
    const normalizedCode = String(hsCodeValue || "").trim();
    const matched = findHsCodeEntry(normalizedCode);
    const brand = String(currentItem.brand || "").trim() || DEFAULT_DECLARATION_BRAND;
    const brandType = String(currentItem.brandType || "").trim() || DEFAULT_DECLARATION_BRAND_TYPE;
    const usage = inferDeclarationUsage(currentItem, matched);
    const material = inferDeclarationMaterial(currentItem, matched);
    const preparedItem: CustomsItemData = {
      ...currentItem,
      brand,
      brandType,
      usage,
      material,
      productName: currentItem.productName || matched?.productAlias || matched?.productName || "",
      productNameCn: currentItem.productNameCn || currentItem.productName || matched?.productAlias || matched?.productName || "",
      unit: currentItem.unit || matched?.unit || "",
    };

    return {
      ...preparedItem,
      hsCode: normalizedCode,
      declarationElements: matched
        ? buildDeclarationElementsForItem(preparedItem, matched) || currentItem.declarationElements || ""
        : normalizedCode
          ? currentItem.declarationElements
          : "",
    };
  };

  const updateMainField = (key: keyof CustomsMainData, value: string | number) => {
    setDocumentData((prev) => ({
      ...prev,
      customsMain: {
        ...prev.customsMain,
        [key]: String(value),
      },
    }));
  };

  const updateItemField = (index: number, key: keyof CustomsItemData, value: string | number) => {
    setDocumentData((prev) => {
      const nextItems = [...prev.customsItems];
      const currentItem = nextItems[index];
      if (key === "hsCode") {
        nextItems[index] = applyHsCodeToItem(currentItem, String(value));
      } else {
        let nextItem: CustomsItemData = {
          ...currentItem,
          [key]: String(value),
        };
        if (nextItem.hsCode) {
          const matched = findHsCodeEntry(nextItem.hsCode);
          const previousAutoDeclaration = buildDeclarationElementsForItem(currentItem, matched);
          if (!currentItem.declarationElements || currentItem.declarationElements === previousAutoDeclaration) {
            nextItem = applyHsCodeToItem(nextItem, nextItem.hsCode);
          }
        }
        nextItems[index] = nextItem;
      }
      return {
        ...prev,
        customsItems: nextItems,
      };
    });
  };

  const addDocumentItem = () => {
    setDocumentData((prev) => ({
      ...prev,
      customsItems: [
        ...prev.customsItems,
        emptyItemData(prev.customsMain.customsId, Date.now() + prev.customsItems.length),
      ],
    }));
  };

  const removeDocumentItem = (index: number) => {
    setDocumentData((prev) => ({
      ...prev,
      customsItems: prev.customsItems.length === 1
        ? prev.customsItems
        : prev.customsItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateDocumentExtField = (
    docKey: keyof CustomsDocumentState["documents"],
    key: string,
    value: string | number,
  ) => {
    setDocumentData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docKey]: {
          ...prev.documents[docKey],
          [key]: String(value),
        },
      },
    }));
  };

  const getReceiptAccountLabel = (accountId?: number | null) => {
    if (!accountId) return "";
    const matched = receiptAccounts.find((item: any) => item.id === accountId);
    return [
      String(matched?.accountName || "").trim(),
      String(matched?.bankName || "").trim(),
      String(matched?.accountNo || "").trim(),
    ].filter(Boolean).join(" / ");
  };

  const buildMergedDocumentState = async (record: CustomsRecord) => {
    const matchedOrder = salesOrders.find((order: any) => order.orderNo === (record.salesOrderNo || record.orderNo));
    let detailOrder: any = null;
    if (matchedOrder?.id) {
      try {
        detailOrder = await trpcUtils.salesOrders.getById.fetch({ id: matchedOrder.id });
      } catch (error) {
        console.error("加载销售订单详情失败", error);
      }
    }

    const mergedPayload = getMergedCreatedDocuments(record as any);
    const latestSavedState = customsDetailDocButtons
      .map((type) => mergedPayload.documents[type]?.data)
      .filter(Boolean)
      .sort((a, b) => String((b as any)?.documents?.customsDeclaration?.declareDate || "").localeCompare(String((a as any)?.documents?.customsDeclaration?.declareDate || "")))[0];
    const customerCountry = detailOrder?.country || matchedOrder?.country || record.destination || "";
    const resolvedBuyerAddress = detailOrder?.shippingAddress || matchedOrder?.shippingAddress || detailOrder?.address || latestSavedState?.customsMain?.buyerAddress || "";
    const resolvedTradeTerm = detailOrder?.tradeTerm || matchedOrder?.tradeTerm || latestSavedState?.customsMain?.tradeTerm || "";
    const resolvedPaymentTerm = detailOrder?.paymentMethod || matchedOrder?.paymentMethod || latestSavedState?.customsMain?.paymentTerm || "";
    const resolvedFreight = detailOrder?.shippingFee != null
      ? String(detailOrder.shippingFee)
      : matchedOrder?.shippingFee != null
        ? String(matchedOrder.shippingFee)
        : latestSavedState?.documents?.commercialInvoice?.freight || latestSavedState?.documents?.customsDeclaration?.freight || "";
    const orderItems = Array.isArray(detailOrder?.items) && detailOrder.items.length > 0 ? detailOrder.items : [{
      productName: record.productName || "",
      productNameCn: record.productName || "",
      productNameEn: "",
      specification: "",
      model: "",
      descriptionEn: "",
      quantity: record.quantity || 0,
      unit: record.unit || "PCS",
      unitPrice: record.quantity ? record.amount / record.quantity : record.amount,
      amount: record.amount || 0,
      hsCode: record.hsCode || "9018390000",
    }];
    const matchedReceiptAccount = receiptAccounts.find((account: any) => Number(account.id) === Number(detailOrder?.receiptAccountId || matchedOrder?.receiptAccountId || 0));
    const bankInfo = matchedReceiptAccount
      ? [
          matchedReceiptAccount.accountName ? `账户名称: ${matchedReceiptAccount.accountName}` : "",
          matchedReceiptAccount.bankName ? `开户行: ${matchedReceiptAccount.bankName}` : "",
          matchedReceiptAccount.accountNo ? `账号: ${matchedReceiptAccount.accountNo}` : "",
          matchedReceiptAccount.bankAddress ? `开户地址: ${matchedReceiptAccount.bankAddress}` : "",
          matchedReceiptAccount.swiftCode ? `SWIFT: ${matchedReceiptAccount.swiftCode}` : "",
        ].filter(Boolean).join("\n")
      : latestSavedState?.documents?.commercialInvoice?.bankInfo || "";
    const subtotal = String(detailOrder?.productSubtotal ?? detailOrder?.totalAmount ?? record.amount ?? "");
    const totalAmount = String(detailOrder?.totalAmount ?? record.amount ?? "");
    const contractNo = record.salesOrderNo || record.orderNo;
    const baseState = emptyDocumentState();
    const normalizedMappedItems = latestSavedState?.customsItems?.length
      ? latestSavedState.customsItems.map((item) => {
          const matchedHsCodeEntry = findHsCodeEntry(item.hsCode || "");
          return applyHsCodeToItem({
            ...item,
            unit: item.unit || matchedHsCodeEntry?.unit || "",
            productName: item.productName || matchedHsCodeEntry?.productAlias || matchedHsCodeEntry?.productName || "",
            productNameCn: item.productNameCn || matchedHsCodeEntry?.productAlias || matchedHsCodeEntry?.productName || item.productName || "",
          } as CustomsItemData, String(item.hsCode || ""));
        })
      : orderItems.map((item: any, index: number) => {
          const matchedHsCodeEntry = findHsCodeEntry(String(item.hsCode || record.hsCode || "9018390000"));
          return applyHsCodeToItem({
            ...emptyItemData(record.id, index + 1),
            customsItemId: index + 1,
            customsId: record.id,
            itemNo: String(index + 1),
            productName: item.productName || matchedHsCodeEntry?.productAlias || matchedHsCodeEntry?.productName || record.productName || "",
            productNameCn: item.productNameCn || item.productName || matchedHsCodeEntry?.productAlias || matchedHsCodeEntry?.productName || record.productName || "",
            productNameEn: item.productNameEn || item.descriptionEn || "",
            model: item.model || item.specification || "",
            specificationModel: item.specificationModel || item.specification || item.model || "",
            descriptionEn: item.descriptionEn || item.productNameEn || "",
            quantity: String(item.quantity ?? record.quantity ?? ""),
            unit: item.unit || matchedHsCodeEntry?.unit || record.unit || "PCS",
            quantityUnit: `${item.quantity ?? record.quantity ?? ""} ${item.unit || matchedHsCodeEntry?.unit || record.unit || "PCS"}`.trim(),
            unitPrice: String(item.unitPrice ?? (record.quantity ? record.amount / record.quantity : record.amount ?? "")),
            totalPrice: String(item.amount ?? record.amount ?? ""),
            currency: record.currency || detailOrder?.currency || "USD",
            hsCode: item.hsCode || record.hsCode || "9018390000",
            countryOfOrigin: item.countryOfOrigin || "中国",
            countryOfOriginLabel: item.countryOfOrigin || "中国",
            finalDestinationCountry: customerCountry,
            domesticSource: "苏州",
            exemptionNature: item.exemptionNature || "照章征税",
            brand: item.brand || "",
            brandType: item.brandType || "",
            usage: item.usage || "",
            material: item.material || "",
            registrationNo: item.registrationNo || "",
            gtin: item.gtin || "",
            cas: item.cas || "",
            otherNote: item.otherNote || "",
          }, String(item.hsCode || record.hsCode || "9018390000"));
      });

    const nextState: CustomsDocumentState = {
      customsMain: {
        ...baseState.customsMain,
        ...latestSavedState?.customsMain,
        customsId: record.id,
        orderId: matchedOrder?.id || latestSavedState?.customsMain?.orderId || 0,
        customerName: detailOrder?.customerName || record.customerName,
        sellerName: latestSavedState?.customsMain?.sellerName || "苏州神韵医疗器械有限公司",
        sellerAddress: latestSavedState?.customsMain?.sellerAddress || "江苏省苏州市吴中区临湖镇银藏路666号11幢",
        buyerName: detailOrder?.customerName || record.customerName,
        buyerAddress: resolvedBuyerAddress,
        consignee: detailOrder?.shippingContact || detailOrder?.contactPerson || record.customerName,
        notifyParty: detailOrder?.shippingContact || detailOrder?.contactPerson || record.customerName,
        loadingPort: record.portOfLoading || latestSavedState?.customsMain?.loadingPort || "",
        destinationPort: record.portOfDischarge || latestSavedState?.customsMain?.destinationPort || "",
        shipmentMethod: record.shippingMethod || latestSavedState?.customsMain?.shipmentMethod || "海运",
        tradeTerm: resolvedTradeTerm,
        paymentTerm: resolvedPaymentTerm,
        currency: record.currency || detailOrder?.currency || latestSavedState?.customsMain?.currency || "USD",
        contractNo,
      },
      customsItems: normalizedMappedItems.length ? normalizedMappedItems : [emptyItemData(record.id)],
      documents: {
        commercialInvoice: {
          ...baseState.documents.commercialInvoice,
          ...latestSavedState?.documents?.commercialInvoice,
          invoiceNo: latestSavedState?.documents?.commercialInvoice?.invoiceNo || `INV-${record.declarationNo}`,
          invoiceDate: latestSavedState?.documents?.commercialInvoice?.invoiceDate || record.declarationDate || new Date().toISOString().split("T")[0],
          subtotal: latestSavedState?.documents?.commercialInvoice?.subtotal || subtotal,
          freight: latestSavedState?.documents?.commercialInvoice?.freight || resolvedFreight,
          totalAmount: latestSavedState?.documents?.commercialInvoice?.totalAmount || totalAmount,
          bankInfo: latestSavedState?.documents?.commercialInvoice?.bankInfo || bankInfo,
        },
        packingList: {
          ...baseState.documents.packingList,
          ...latestSavedState?.documents?.packingList,
          packingListNo: latestSavedState?.documents?.packingList?.packingListNo || `ZX-${record.declarationNo}`,
          packingDate: latestSavedState?.documents?.packingList?.packingDate || record.declarationDate || new Date().toISOString().split("T")[0],
          packageType: latestSavedState?.documents?.packingList?.packageType || "纸箱",
        },
        declarationElements: {
          ...baseState.documents.declarationElements,
          ...latestSavedState?.documents?.declarationElements,
        },
        customsDeclaration: {
          ...baseState.documents.customsDeclaration,
          ...latestSavedState?.documents?.customsDeclaration,
          declarationNo: latestSavedState?.documents?.customsDeclaration?.declarationNo || `BG-${record.declarationNo}`,
          customsPort: latestSavedState?.documents?.customsDeclaration?.customsPort || "上海海关",
          exportDate: latestSavedState?.documents?.customsDeclaration?.exportDate || formatDateValue(detailOrder?.deliveryDate || ""),
          declareDate: latestSavedState?.documents?.customsDeclaration?.declareDate || record.declarationDate || new Date().toISOString().split("T")[0],
          businessUnit: latestSavedState?.documents?.customsDeclaration?.businessUnit || "苏州神韵医疗器械有限公司",
          consignor: latestSavedState?.documents?.customsDeclaration?.consignor || "苏州神韵医疗器械有限公司",
          domesticSource: latestSavedState?.documents?.customsDeclaration?.domesticSource || "苏州",
          supervisionMode: latestSavedState?.documents?.customsDeclaration?.supervisionMode || "一般贸易",
          transportMode: latestSavedState?.documents?.customsDeclaration?.transportMode || record.shippingMethod || "海运",
          levyNature: latestSavedState?.documents?.customsDeclaration?.levyNature || "一般征税",
          tradeCountry: latestSavedState?.documents?.customsDeclaration?.tradeCountry || record.destination || "",
          destinationCountry: latestSavedState?.documents?.customsDeclaration?.destinationCountry || customerCountry,
          domesticDestination: latestSavedState?.documents?.customsDeclaration?.domesticDestination || customerCountry,
          overseasConsignee: latestSavedState?.documents?.customsDeclaration?.overseasConsignee || detailOrder?.shippingContact || detailOrder?.contactPerson || record.customerName,
          overseasShipper: latestSavedState?.documents?.customsDeclaration?.overseasShipper || detailOrder?.customerName || record.customerName,
          productionSalesUnit: latestSavedState?.documents?.customsDeclaration?.productionSalesUnit || "苏州神韵医疗器械有限公司",
          packageType: latestSavedState?.documents?.customsDeclaration?.packageType || "纸箱",
          transactionMethod: latestSavedState?.documents?.customsDeclaration?.transactionMethod || resolvedTradeTerm,
          freight: latestSavedState?.documents?.customsDeclaration?.freight || resolvedFreight,
        },
      },
    };

    customsDetailDocButtons.forEach((type) => {
      const savedState = mergedPayload.documents[type]?.data;
      if (!savedState) return;
      nextState.documents[documentTypeKeyMap[type]] = {
        ...nextState.documents[documentTypeKeyMap[type]],
        ...savedState.documents?.[documentTypeKeyMap[type]],
      } as any;
    });

    return nextState;
  };

  const filteredRecords = records.filter((r: any) => {
    const matchesSearch =
      String(r.declarationNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.orderNo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.customerName ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (record: CustomsRecord) => {
    setEditingRecord(record);
    setFormData({
      declarationNo: record.declarationNo,
      orderNo: record.orderNo,
      customerName: record.customerName,
      productName: record.productName,
      quantity: record.quantity,
      unit: record.unit,
      currency: record.currency,
      amount: record.amount,
      destination: record.destination,
      portOfLoading: record.portOfLoading,
      portOfDischarge: record.portOfDischarge,
      shippingMethod: record.shippingMethod,
      hsCode: record.hsCode,
      status: record.status,
      declarationDate: record.declarationDate,
      clearanceDate: record.clearanceDate,
      shippingDate: record.shippingDate,
      trackingNo: record.trackingNo,
      remarks: record.remarks,
    });
    setDialogOpen(true);
  };

  const handleView = (record: CustomsRecord) => {
    setViewingRecord(record);
    setDetailDocType("商业发票");
    setViewDialogOpen(true);
  };

  const getMergedCreatedDocuments = (record: any) => {
    const parsedRemark = parseCustomsRemarkPayload(record?.remarkRaw ?? record?.remarks ?? record?.remark ?? "");
    return {
      note: parsedRemark.note,
      documents: {
        ...parsedRemark.documents,
        ...(createdDocuments[record?.id] || {}),
      },
    };
  };

  const handleDelete = (record: CustomsRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除报关记录" });
      return;
    }
    deleteMutation.mutate({ id: record.id });
    toast.success("报关记录已删除");
  };

  const handleClearance = (record: CustomsRecord) => {
    updateMutation.mutate({
      id: record.id,
      data: {
        status: "cleared",
        clearanceDate: new Date().toISOString().split("T")[0],
      },
    });
    toast.success("报关已通关");
  };

  const handleShip = (record: CustomsRecord) => {
    updateMutation.mutate({
      id: record.id,
      data: {
        status: "shipped",
        shippingDate: new Date().toISOString().split("T")[0],
      },
    });
    toast.success("货物已发运");
  };

  const handleGenerateMaterial = async (record: CustomsRecord) => {
    setGeneratingMaterialId(record.id);
    try {
      const mergedPayload = getMergedCreatedDocuments(record as any);
      const nextState = await buildMergedDocumentState(record);
      const createdAt = new Date().toISOString();
      const nextDocuments = customsDetailDocButtons.reduce((acc, type) => {
        acc[type] = {
          type,
          createdAt: mergedPayload.documents[type]?.createdAt || createdAt,
          data: JSON.parse(JSON.stringify(nextState)) as CustomsDocumentState,
        };
        return acc;
      }, {} as Partial<Record<CustomsDocType, CreatedDocumentEntry>>);

      await updateMutation.mutateAsync({
        id: record.id,
        data: {
          status: "submitted",
          declarationDate: record.declarationDate || new Date().toISOString().split("T")[0],
          remark: stringifyCustomsRemarkPayload({
            version: 1,
            note: mergedPayload.note,
            documents: nextDocuments,
          }),
        },
      });

      setCreatedDocuments((prev) => ({
        ...prev,
        [record.id]: nextDocuments,
      }));

      const pdfBytes = await buildMergedCustomsPdf({
        companyInfo,
        record,
        state: nextState,
      });
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank");
      if (!opened) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${record.declarationNo}-报关资料.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("报关资料已生成");
    } catch (error) {
      console.error(error);
      toast.error("报关资料生成失败");
    } finally {
      setGeneratingMaterialId(null);
    }
  };

  const openGenerateDocumentDialog = async (record: CustomsRecord, docType: CustomsDocType) => {
    const documentNoPrefixMap: Record<CustomsDocType, string> = {
      商业发票: "INV",
      装箱单: "ZX",
      申报要素: "YS",
      报关单: "BG",
    };
    const documentNoPrefix = documentNoPrefixMap[docType];
    const matchedOrder = salesOrders.find((order: any) => order.orderNo === (record.salesOrderNo || record.orderNo));
    let detailOrder: any = null;

    if (matchedOrder?.id) {
      try {
        detailOrder = await trpcUtils.salesOrders.getById.fetch({ id: matchedOrder.id });
      } catch (error) {
        console.error("加载销售订单详情失败", error);
      }
    }

    const customerCountry = detailOrder?.country || matchedOrder?.country || "";
    const resolvedBuyerAddress = detailOrder?.shippingAddress || matchedOrder?.shippingAddress || detailOrder?.address || "";
    const resolvedTradeTerm = detailOrder?.tradeTerm || matchedOrder?.tradeTerm || "";
    const resolvedPaymentTerm = detailOrder?.paymentMethod || matchedOrder?.paymentMethod || "";
    const resolvedFreight = detailOrder?.shippingFee != null
      ? String(detailOrder.shippingFee)
      : matchedOrder?.shippingFee != null
        ? String(matchedOrder.shippingFee)
        : "";
    const persistedDocuments = getMergedCreatedDocuments(record as any).documents;
    const persistedDocState = persistedDocuments[docType]?.data;

    setDocumentType(docType);
    setDocumentRecord(record);
    setDocumentData((prev) => {
      const sameRecord = documentRecord?.id === record.id;
      const orderItems = Array.isArray(detailOrder?.items) && detailOrder.items.length > 0
          ? detailOrder.items
        : [{
            productName: record.productName || "",
            productNameCn: record.productName || "",
            productNameEn: "",
            specification: "",
            model: "",
            descriptionEn: "",
            quantity: record.quantity || 0,
            unit: record.unit || "PCS",
            unitPrice: record.quantity ? record.amount / record.quantity : record.amount,
            amount: record.amount || 0,
            hsCode: record.hsCode || "9018390000",
          }];

      const mappedItems = persistedDocState?.customsItems?.length
        ? persistedDocState.customsItems.map((item) => applyHsCodeToItem({
            ...item,
            customsId: record.id,
            currency: item.currency || record.currency || detailOrder?.currency || "USD",
            countryOfOrigin: item.countryOfOrigin || "中国",
            countryOfOriginLabel: item.countryOfOriginLabel || "中国",
            finalDestinationCountry: item.finalDestinationCountry || customerCountry || record.destination || "",
            domesticSource: item.domesticSource || "苏州",
            unit: item.unit || findHsCodeEntry(item.hsCode || "")?.unit || "",
            productName: item.productName || findHsCodeEntry(item.hsCode || "")?.productAlias || findHsCodeEntry(item.hsCode || "")?.productName || "",
            productNameCn: item.productNameCn || findHsCodeEntry(item.hsCode || "")?.productAlias || findHsCodeEntry(item.hsCode || "")?.productName || item.productName || "",
          } as CustomsItemData, String(item.hsCode || "")))
        : sameRecord
        ? prev.customsItems.map((item) => applyHsCodeToItem({
            ...item,
            currency: item.currency || record.currency || detailOrder?.currency || "USD",
            countryOfOrigin: item.countryOfOrigin || "中国",
            countryOfOriginLabel: item.countryOfOriginLabel || "中国",
            finalDestinationCountry: item.finalDestinationCountry || customerCountry || record.destination || "",
            domesticSource: item.domesticSource || "苏州",
            unit: item.unit || findHsCodeEntry(item.hsCode || "")?.unit || "",
            productName: item.productName || findHsCodeEntry(item.hsCode || "")?.productAlias || findHsCodeEntry(item.hsCode || "")?.productName || "",
            productNameCn: item.productNameCn || findHsCodeEntry(item.hsCode || "")?.productAlias || findHsCodeEntry(item.hsCode || "")?.productName || item.productName || "",
          } as CustomsItemData, String(item.hsCode || "")))
        : orderItems.map((item: any, index: number) => {
            const matchedHsCodeEntry = findHsCodeEntry(String(item.hsCode || record.hsCode || "9018390000"));
            return applyHsCodeToItem({
              customsItemId: index + 1,
              customsId: record.id,
              itemNo: String(index + 1),
              productName: item.productName || matchedHsCodeEntry?.productAlias || matchedHsCodeEntry?.productName || record.productName || "",
              productNameCn: item.productNameCn || item.productName || matchedHsCodeEntry?.productAlias || matchedHsCodeEntry?.productName || record.productName || "",
              productNameEn: item.productNameEn || item.descriptionEn || "",
              model: item.model || item.specification || "",
              specificationModel: item.specificationModel || item.specification || item.model || "",
              descriptionEn: item.descriptionEn || item.productNameEn || "",
              quantity: String(item.quantity ?? record.quantity ?? ""),
              unit: item.unit || matchedHsCodeEntry?.unit || record.unit || "PCS",
              quantityUnit: `${item.quantity ?? record.quantity ?? ""} ${item.unit || matchedHsCodeEntry?.unit || record.unit || "PCS"}`.trim(),
              unitPrice: String(item.unitPrice ?? (record.quantity ? record.amount / record.quantity : record.amount ?? "")),
              totalPrice: String(item.amount ?? record.amount ?? ""),
              currency: record.currency || detailOrder?.currency || "USD",
              hsCode: item.hsCode || record.hsCode || "9018390000",
              brand: item.brand || "",
              brandType: item.brandType || "",
              usage: item.usage || "",
              material: item.material || "",
              functionPurpose: item.functionPurpose || "",
              applicationScope: item.applicationScope || "",
              countryOfOrigin: item.countryOfOrigin || "中国",
              cartonNo: item.cartonNo || "",
              qtyPerCarton: String(item.qtyPerCarton ?? ""),
              totalQuantity: String(item.totalQuantity ?? item.quantity ?? record.quantity ?? ""),
              packingNote: item.packingNote || "",
              countryOfOriginLabel: item.countryOfOrigin || "中国",
              finalDestinationCountry: customerCountry || record.destination || "",
              domesticSource: "苏州",
              exemptionNature: "照章征税",
              registrationNo: item.registrationNo || "",
              gtin: item.gtin || "",
              cas: item.cas || "",
              otherNote: item.otherNote || "",
            } as CustomsItemData, String(item.hsCode || record.hsCode || "9018390000"));
          });

      const shippingFee = resolvedFreight;
      const matchedReceiptAccount = receiptAccounts.find((account: any) => (
        Number(account.id) === Number(detailOrder?.receiptAccountId || matchedOrder?.receiptAccountId || 0)
      ));
      const bankInfo = matchedReceiptAccount
        ? [
            matchedReceiptAccount.accountName ? `账户名称: ${matchedReceiptAccount.accountName}` : "",
            matchedReceiptAccount.bankName ? `开户行: ${matchedReceiptAccount.bankName}` : "",
            matchedReceiptAccount.accountNo ? `账号: ${matchedReceiptAccount.accountNo}` : "",
            matchedReceiptAccount.bankAddress ? `开户地址: ${matchedReceiptAccount.bankAddress}` : "",
            matchedReceiptAccount.swiftCode ? `SWIFT: ${matchedReceiptAccount.swiftCode}` : "",
          ].filter(Boolean).join("\n")
        : "";
      const subtotal = String(detailOrder?.productSubtotal ?? detailOrder?.totalAmount ?? record.amount ?? "");
      const totalAmount = String(detailOrder?.totalAmount ?? record.amount ?? "");
      const orderNo = record.salesOrderNo || record.orderNo;
      const contractNo = orderNo;

      const nextMain = persistedDocState?.customsMain ? {
        ...persistedDocState.customsMain,
        customsId: record.id,
        orderId: matchedOrder?.id || persistedDocState.customsMain.orderId || 0,
        customerName: detailOrder?.customerName || record.customerName,
        buyerName: detailOrder?.customerName || record.customerName,
        buyerAddress: resolvedBuyerAddress,
        tradeTerm: resolvedTradeTerm,
        paymentTerm: resolvedPaymentTerm,
        currency: record.currency || detailOrder?.currency || persistedDocState.customsMain.currency || "USD",
        contractNo,
      } : sameRecord ? {
        ...prev.customsMain,
        buyerName: detailOrder?.customerName || record.customerName,
        buyerAddress: resolvedBuyerAddress,
        tradeTerm: resolvedTradeTerm,
        paymentTerm: resolvedPaymentTerm,
      } : {
          customsId: record.id,
          orderId: matchedOrder?.id || 0,
          customerName: detailOrder?.customerName || record.customerName,
          sellerName: "苏州神韵医疗器械有限公司",
          sellerAddress: "江苏省苏州市吴中区临湖镇银藏路666号11幢",
          buyerName: detailOrder?.customerName || record.customerName,
          buyerAddress: resolvedBuyerAddress,
          consignee: detailOrder?.shippingContact || detailOrder?.contactPerson || record.customerName,
          notifyParty: detailOrder?.shippingContact || detailOrder?.contactPerson || record.customerName,
          loadingPort: record.portOfLoading || "",
          destinationPort: record.portOfDischarge || "",
          shipmentMethod: record.shippingMethod || "海运",
          tradeTerm: resolvedTradeTerm,
          paymentTerm: resolvedPaymentTerm,
          currency: record.currency || detailOrder?.currency || "USD",
          contractNo,
          grossWeight: "",
          netWeight: "",
          totalVolume: "",
          totalPackages: "",
        };

      const nextCommercialInvoice = persistedDocState?.documents?.commercialInvoice ? {
        ...persistedDocState.documents.commercialInvoice,
        freight: persistedDocState.documents.commercialInvoice.freight || shippingFee,
        subtotal: persistedDocState.documents.commercialInvoice.subtotal || subtotal,
        totalAmount: persistedDocState.documents.commercialInvoice.totalAmount || totalAmount,
        bankInfo: persistedDocState.documents.commercialInvoice.bankInfo || bankInfo,
      } : sameRecord ? {
        ...prev.documents.commercialInvoice,
        freight: shippingFee,
        subtotal,
        totalAmount,
        bankInfo: bankInfo || prev.documents.commercialInvoice.bankInfo,
      } : {
        invoiceNo: `${documentNoPrefixMap["商业发票"]}-${record.declarationNo}`,
        invoiceDate: record.declarationDate || new Date().toISOString().split("T")[0],
        subtotal,
        freight: shippingFee,
        insurance: "",
        totalAmount,
        bankInfo,
      };

      return {
        customsMain: nextMain,
        customsItems: mappedItems.length > 0 ? mappedItems : [emptyItemData(record.id)],
        documents: {
          commercialInvoice: nextCommercialInvoice,
          packingList: persistedDocState?.documents?.packingList ? {
            ...persistedDocState.documents.packingList,
          } : sameRecord ? prev.documents.packingList : {
            packingListNo: `${documentNoPrefixMap["装箱单"]}-${record.declarationNo}`,
            packingDate: record.declarationDate || new Date().toISOString().split("T")[0],
            packageType: "纸箱",
          },
          declarationElements: persistedDocState?.documents?.declarationElements ? {
            ...persistedDocState.documents.declarationElements,
          } : sameRecord ? prev.documents.declarationElements : {
            exportBenefit: "",
          },
          customsDeclaration: persistedDocState?.documents?.customsDeclaration ? {
            ...persistedDocState.documents.customsDeclaration,
            customsPort: persistedDocState.documents.customsDeclaration.customsPort || "上海海关",
            supervisionMode: persistedDocState.documents.customsDeclaration.supervisionMode || "一般贸易",
            levyNature: persistedDocState.documents.customsDeclaration.levyNature || "一般征税",
          } : sameRecord ? prev.documents.customsDeclaration : {
            declarationNo: `${documentNoPrefixMap["报关单"]}-${record.declarationNo}`,
            recordNo: "",
            customsPort: "上海海关",
            exportDate: formatDateValue(detailOrder?.deliveryDate || ""),
            declareDate: record.declarationDate || new Date().toISOString().split("T")[0],
            licenseNo: "",
            businessUnit: "苏州神韵医疗器械有限公司",
            consignor: "苏州神韵医疗器械有限公司",
            domesticSource: "苏州",
            supervisionMode: "一般贸易",
            transportMode: record.shippingMethod || "海运",
            transportTool: "",
            billNo: "",
            levyNature: "一般征税",
            settlementMode: "",
            tradeCountry: record.destination || "",
            destinationCountry: customerCountry || record.destination || "",
            domesticDestination: customerCountry || record.destination || "",
            overseasConsignee: detailOrder?.shippingContact || detailOrder?.contactPerson || record.customerName,
            overseasShipper: detailOrder?.customerName || record.customerName,
            productionSalesUnit: "苏州神韵医疗器械有限公司",
            packageType: "纸箱",
            transactionMethod: detailOrder?.tradeTerm || "",
            freight: shippingFee,
            insurance: "",
            incidentalFee: "",
            marksRemarks: "",
          },
        },
      };
    });
    setDocumentDialogOpen(true);
  };

  const handleGenerateDocument = () => {
    if (!documentRecord) return;
    const createdEntry: CreatedDocumentEntry = {
      type: documentType,
      createdAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(documentData)) as CustomsDocumentState,
    };
    const mergedPayload = getMergedCreatedDocuments(documentRecord as any);
    const nextDocuments = {
      ...mergedPayload.documents,
      [documentType]: createdEntry,
    };
    saveDocumentMutation.mutate({
      id: documentRecord.id,
      data: {
        remark: stringifyCustomsRemarkPayload({
          version: 1,
          note: mergedPayload.note,
          documents: nextDocuments,
        }),
      },
    }, {
      onSuccess: () => {
        setCreatedDocuments((prev) => ({
          ...prev,
          [documentRecord.id]: nextDocuments,
        }));
        setDocumentDialogOpen(false);
        toast.success(`${documentType}已创建并保存`);
      },
    });
  };

  const handleSaveDocument = () => {
    if (!documentRecord) return;
    const createdEntry: CreatedDocumentEntry = {
      type: documentType,
      createdAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(documentData)) as CustomsDocumentState,
    };
    const mergedPayload = getMergedCreatedDocuments(documentRecord as any);
    const nextDocuments = {
      ...mergedPayload.documents,
      [documentType]: createdEntry,
    };
    saveDocumentMutation.mutate({
      id: documentRecord.id,
      data: {
        remark: stringifyCustomsRemarkPayload({
          version: 1,
          note: mergedPayload.note,
          documents: nextDocuments,
        }),
      },
    }, {
      onSuccess: () => {
        setCreatedDocuments((prev) => ({
          ...prev,
          [documentRecord.id]: nextDocuments,
        }));
        toast.success(`${documentType}已保存`);
      },
    });
  };

  const handleOpenPrintPreview = () => {
    setPreviewDocumentType(documentType);
    setPreviewDocumentData(JSON.parse(JSON.stringify(documentData)) as CustomsDocumentState);
    setPreviewOpen(true);
  };

  const handleOpenTemplateManager = () => {
    window.open("/settings/print-templates", "_blank");
  };

  const handleSubmit = () => {
    if (!formData.orderNo || !formData.customerName || !formData.destination) {
      toast.error("请填写必填项", { description: "关联订单、客户名称、目的地为必填" });
      return;
    }

    if (editingRecord) {
      const mergedPayload = getMergedCreatedDocuments(editingRecord as any);
      updateMutation.mutate({
        id: editingRecord.id,
        data: {
          status: formData.status as "preparing" | "submitted" | "cleared" | "shipped",
          declarationDate: formData.declarationDate,
          clearanceDate: formData.clearanceDate,
          shippingDate: formData.shippingDate,
          trackingNo: formData.trackingNo,
          destination: formData.destination,
          portOfLoading: formData.portOfLoading,
          portOfDischarge: formData.portOfDischarge,
          hsCode: formData.hsCode,
          remark: stringifyCustomsRemarkPayload({
            version: 1,
            note: formData.remarks,
            documents: mergedPayload.documents,
          }),
        },
      });
    } else {
      createMutation.mutate({
        ...formData,
        quantity: Number(formData.quantity),
        amount: Number(formData.amount),
      } as any);
    }
    setDialogOpen(false);
  };

  const formatAmount = (currency: string, amount: number) => {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥" };
    return `${symbols[currency] || currency}${amount?.toLocaleString?.() ?? "0"}`;
  };

  const clearedCount = records.filter((r: any) => r.status === "cleared").length;
  const pendingCount = records.filter((r: any) => r.status === "submitted").length;
  const totalAmount = records.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
  const currentDocKey = documentTypeKeyMap[documentType];
  const currentExtData = documentData.documents[currentDocKey] as Record<string, string>;

  const getMainFieldConfigs = (): FieldConfig[] => {
    if (documentType === "商业发票") return invoiceMainFields;
    if (documentType === "装箱单") return packingMainFields;
    if (documentType === "申报要素") return declarationMainFields;
    return customsDeclarationMainFields;
  };

  const getExtFieldConfigs = (): FieldConfig[] => {
    if (documentType === "商业发票") return invoiceExtFields;
    if (documentType === "装箱单") return packingExtFields;
    if (documentType === "申报要素") return declarationExtFields;
    return customsDeclarationExtFields;
  };

  const getItemFieldConfigs = (): FieldConfig[] => {
    if (documentType === "商业发票") return invoiceItemFields;
    if (documentType === "装箱单") return packingItemFields;
    if (documentType === "申报要素") return declarationItemFields;
    return customsDeclarationItemFields;
  };

  const getDetailDocLabel = (docType: CustomsDocType) => {
    if (docType === "商业发票") return "商业发票详情";
    if (docType === "装箱单") return "装箱单详情";
    if (docType === "申报要素") return "申报要素详情";
    return "报关单详情";
  };

  const renderPreviewContent = () => {
    const main = previewDocumentData.customsMain;
    const items = previewDocumentData.customsItems;
    const commercial = previewDocumentData.documents.commercialInvoice;
    const packing = previewDocumentData.documents.packingList;
    const declaration = previewDocumentData.documents.declarationElements;
    const customs = previewDocumentData.documents.customsDeclaration;
    const firstItem = items[0] || emptyItemData();
    const english = previewDocumentType === "商业发票" || previewDocumentType === "装箱单";
    const templateId = customsPrintTemplateIdMap[previewDocumentType];
    const resolvedTemplate =
      (printTemplates as any[]).find((item) => item.templateId === templateId) ||
      CUSTOMS_PRINT_TEMPLATE_DEFAULTS[templateId];
    const itemRows = (() => {
      if (previewDocumentType === "商业发票") {
        return rawTemplateValue(
          items
            .map((item, index) =>
              buildTemplateRowHtml([
                index + 1,
                item.productName,
                item.model,
                item.descriptionEn,
                item.quantity,
                item.unit,
                item.unitPrice,
                item.totalPrice,
              ]),
            )
            .join(""),
        );
      }
      if (previewDocumentType === "装箱单") {
        return rawTemplateValue(
          items
            .map((item, index) =>
              buildTemplateRowHtml([
                index + 1,
                item.productName,
                item.model,
                item.cartonNo,
                item.qtyPerCarton,
                item.totalQuantity,
                item.unit,
                item.packingNote,
              ]),
            )
            .join(""),
        );
      }
      if (previewDocumentType === "申报要素") {
        return rawTemplateValue(
          items
            .map((item) =>
              buildTemplateRowHtml([
                item.itemNo,
                item.hsCode,
                item.productNameCn || item.productName,
                item.specificationModel,
                item.quantityUnit || `${item.quantity} ${item.unit}`.trim(),
                item.finalDestinationCountry,
                item.unitPrice,
                item.totalPrice,
              ]),
            )
            .join(""),
        );
      }
      return rawTemplateValue(
        items
          .map((item) =>
            buildTemplateRowHtml([
              item.itemNo,
              item.hsCode,
              item.productName,
              item.specificationModel,
              item.quantityUnit || `${item.quantity} ${item.unit}`.trim(),
              item.unitPrice,
              item.totalPrice,
              item.currency || main.currency,
              item.countryOfOrigin || item.countryOfOriginLabel,
              item.finalDestinationCountry,
              item.domesticSource,
              item.exemptionNature,
            ]),
          )
          .join(""),
      );
    })();
    const rendered = renderPrintTemplate(resolvedTemplate, {
      companyLogo: rawTemplateValue(buildTemplateLogoHtml(companyInfo)),
      companyName: english
        ? companyInfo?.companyNameEn || companyInfo?.companyNameCn || "Suzhou Shenyun Medical Equipment Co., Ltd."
        : companyInfo?.companyNameCn || "苏州神韵医疗器械有限公司",
      companyAddress: english
        ? companyInfo?.addressEn || companyInfo?.addressCn || "-"
        : companyInfo?.addressCn || companyInfo?.addressEn || "-",
      companyPhone: english ? "+86-0512-65209633" : "0512-65209633",
      companyEmail: companyInfo?.email || "-",
      companyWebsite: companyInfo?.website || "-",
      templateCode:
        previewDocumentType === "商业发票"
          ? "SY-BG/CI-01  V1.0"
          : previewDocumentType === "装箱单"
            ? "SY-BG/PL-01  V1.0"
            : previewDocumentType === "申报要素"
              ? "SY-BG/DE-01  V1.0"
              : "SY-BG/CD-01  V1.0",
      invoiceNo: commercial.invoiceNo,
      invoiceDate: commercial.invoiceDate,
      packingListNo: packing.packingListNo,
      packingDate: packing.packingDate,
      declarationNo: customs.declarationNo,
      declareDate: customs.declareDate,
      exportDate: customs.exportDate,
      contractNo: main.contractNo,
      currency: main.currency,
      buyerName: main.buyerName,
      buyerAddress: main.buyerAddress,
      tradeTerm: main.tradeTerm,
      paymentTerm: main.paymentTerm,
      consignee: main.consignee,
      notifyParty: main.notifyParty,
      packageType: packing.packageType || customs.packageType,
      totalPackages: main.totalPackages,
      totalVolume: main.totalVolume,
      grossWeight: main.grossWeight,
      netWeight: main.netWeight,
      subtotal: commercial.subtotal,
      freight: commercial.freight || customs.freight,
      insurance: commercial.insurance || customs.insurance,
      totalAmount: commercial.totalAmount,
      bankInfo: commercial.bankInfo,
      exportBenefit: declaration.exportBenefit,
      exemptionNature: firstItem.exemptionNature,
      brandType: firstItem.brandType,
      declarationElements: firstItem.declarationElements,
      usage: firstItem.usage,
      material: firstItem.material,
      brand: firstItem.brand,
      model: firstItem.model,
      registrationNo: firstItem.registrationNo,
      gtin: firstItem.gtin,
      cas: firstItem.cas,
      otherNote: firstItem.otherNote,
      customsPort: customs.customsPort,
      recordNo: customs.recordNo,
      licenseNo: customs.licenseNo,
      overseasConsignee: customs.overseasConsignee,
      transportMode: customs.transportMode,
      transportTool: customs.transportTool,
      billNo: customs.billNo,
      productionSalesUnit: customs.productionSalesUnit,
      supervisionMode: customs.supervisionMode,
      levyNature: customs.levyNature,
      tradeCountry: customs.tradeCountry,
      destinationCountry: customs.destinationCountry,
      domesticDestination: customs.domesticDestination,
      loadingPort: main.loadingPort,
      transactionMethod: customs.transactionMethod,
      incidentalFee: customs.incidentalFee,
      marksRemarks: customs.marksRemarks,
      itemRows,
    });

    return rendered ? (
      <div className="w-full overflow-x-auto">
        <div
          className={previewDocumentType === "报关单" ? "min-w-[1120px]" : ""}
          dangerouslySetInnerHTML={rendered}
        />
      </div>
    ) : null;
  };

  const renderConfiguredField = (
    field: FieldConfig,
    value: string,
    onChange: (value: string) => void,
  ) => {
    if (field.type === "select") {
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === "textarea") {
      return (
        <div className="space-y-2">
          <Textarea
            value={value}
            rows={field.rows || 2}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.key === "declarationElements" && splitDeclarationElementLines(value).length > 0 && (
            <div className="rounded-md border border-dashed bg-muted/20 p-2">
              <div className="mb-2 text-xs text-muted-foreground">已拆分申报要素</div>
              <div className="flex flex-wrap gap-1.5">
                {splitDeclarationElementLines(value).map((item, index) => (
                  <Badge key={`${field.key}-${index}-${item}`} variant="outline" className="max-w-full whitespace-normal text-left leading-5">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (field.key === "hsCode") {
      return (
        <Input
          type="text"
          value={value}
          list="customs-hs-code-options"
          placeholder="输入或选择 HS 编码"
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }

    return (
      <Input
        type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };

  const renderItemField = (field: FieldConfig, item: CustomsItemData, index: number) => {
    return renderConfiguredField(
      field,
      String(item[field.key as keyof CustomsItemData] || ""),
      (nextValue) => updateItemField(index, field.key as keyof CustomsItemData, nextValue),
    );
  };

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (

    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">

      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>

      <span className="flex-1 text-sm text-right break-all">{children}</span>

    </div>

  );


  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Ship className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">报关管理</h2>
              <p className="text-sm text-muted-foreground">管理出口订单的报关流程和单据</p>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">本月报关</p>
              <p className="text-2xl font-bold">{records.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">报关总额</p>
              <p className="text-2xl font-bold text-green-600">{formatAmount("USD", totalAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待通关</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已完成</p>
              <p className="text-2xl font-bold text-blue-600">{clearedCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索报关单号、订单号、客户..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="preparing">准备中</SelectItem>
                  <SelectItem value="submitted">正式报关</SelectItem>
                  <SelectItem value="cleared">已通关</SelectItem>
                  <SelectItem value="shipped">已发运</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 数据表格 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">报关单号</TableHead>
                  <TableHead className="text-center font-bold">关联订单</TableHead>
                  <TableHead className="text-center font-bold">客户名称</TableHead>
                  <TableHead className="text-center font-bold">销售负责人</TableHead>
                  <TableHead className="text-center font-bold">报关金额</TableHead>
                  <TableHead className="text-center font-bold">目的地</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">报关日期</TableHead>
                  <TableHead className="text-center font-bold">生成资料</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-center font-medium">{record.declarationNo}</TableCell>
                      <TableCell className="text-center">{record.salesOrderNo || record.orderNo || "-"}</TableCell>
                      <TableCell className="text-center">{record.customerName}</TableCell>
                      <TableCell className="text-center">{record.salesPersonName || "-"}</TableCell>
                      <TableCell className="text-center">{formatAmount(record.currency, record.amount)}</TableCell>
                      <TableCell className="text-center">{record.destination || "-"}</TableCell>
                      <TableCell className="text-center">
                      <Badge
                        variant={statusMap[record.status]?.variant || "outline"}
                        className={getStatusSemanticClass(record.status, statusMap[record.status]?.label)}
                      >
                        {statusMap[record.status]?.label || String(record.status ?? "-")}
                      </Badge>
                      </TableCell>
                      <TableCell className="text-center">{formatDateValue(record.declarationDate)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleGenerateMaterial(record)}
                          disabled={generatingMaterialId === record.id}
                        >
                          {generatingMaterialId === record.id ? "生成中..." : "生成资料"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(record)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(record)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            {record.status === "submitted" && (
                              <DropdownMenuItem onClick={() => handleClearance(record)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                确认通关
                              </DropdownMenuItem>
                            )}
                            {record.status === "cleared" && (
                              <DropdownMenuItem onClick={() => handleShip(record)}>
                                <Truck className="h-4 w-4 mr-2" />
                                确认发运
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openGenerateDocumentDialog(record, "商业发票")}>
                              🧾 商业发票
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openGenerateDocumentDialog(record, "装箱单")}>
                              📦 装箱单
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openGenerateDocumentDialog(record, "申报要素")}>
                              📝 申报要素
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openGenerateDocumentDialog(record, "报关单")}>
                              📄 报关单
                            </DropdownMenuItem>
                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(record)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 编辑对话框 */}
        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>编辑报关信息</DialogTitle>
              <DialogDescription>修改报关单据信息</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>报关单号</Label>
                  <Input value={formData.declarationNo} disabled />
                </div>
                <div className="space-y-2">
                  <Label>关联订单 *</Label>
                  <Input
                    value={formData.orderNo}
                    onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
                    placeholder="销售订单号"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>客户名称 *</Label>
                  <Input
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="客户名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>目的地 *</Label>
                  <Input
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="目的国家/地区"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>产品名称</Label>
                <Input
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="出口产品名称"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>数量</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>币种</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((c: any) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>金额</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>HS编码</Label>
                  <Input
                    list="customs-hs-code-options"
                    value={formData.hsCode}
                    onChange={(e) => setFormData({ ...formData, hsCode: e.target.value })}
                    placeholder="海关商品编码"
                  />
                </div>
                <div className="space-y-2">
                  <Label>运输方式</Label>
                  <Select
                    value={formData.shippingMethod}
                    onValueChange={(value) => setFormData({ ...formData, shippingMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingMethodOptions.map((m: any) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>起运港</Label>
                  <Select
                    value={formData.portOfLoading}
                    onValueChange={(value) => setFormData({ ...formData, portOfLoading: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择起运港" />
                    </SelectTrigger>
                    <SelectContent>
                      {portOptions.map((p: any) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>目的港</Label>
                  <Input
                    value={formData.portOfDischarge}
                    onChange={(e) => setFormData({ ...formData, portOfDischarge: e.target.value })}
                    placeholder="目的港口"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>报关日期</Label>
                  <Input
                    type="date"
                    value={formData.declarationDate}
                    onChange={(e) => setFormData({ ...formData, declarationDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preparing">准备中</SelectItem>
                      <SelectItem value="submitted">正式报关</SelectItem>
                      <SelectItem value="cleared">已通关</SelectItem>
                      <SelectItem value="shipped">已发运</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>运单号</Label>
                  <Input
                    value={formData.trackingNo}
                    onChange={(e) => setFormData({ ...formData, trackingNo: e.target.value })}
                    placeholder="物流运单号"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="其他备注信息"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>保存修改</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <DraggableDialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{documentType}</DialogTitle>
              <DialogDescription>仅保留当前单据需要的字段，修改后可同步到其他单据</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>报关ID</Label>
                  <Input value={String(documentData.customsMain.customsId || "")} disabled />
                </div>
                <div className="space-y-2">
                  <Label>关联订单ID</Label>
                  <Input value={String(documentData.customsMain.orderId || "")} disabled />
                </div>
              </div>

              {documentType === "商业发票" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {invoiceDialogPrimaryFields.map((field) => {
                      const invoiceExt = documentData.documents.commercialInvoice;
                      const mainValueMap: Partial<Record<string, string>> = {
                        contractNo: documentData.customsMain.contractNo,
                        currency: documentData.customsMain.currency,
                        buyerName: documentData.customsMain.buyerName,
                        buyerAddress: documentData.customsMain.buyerAddress,
                        tradeTerm: documentData.customsMain.tradeTerm,
                        paymentTerm: documentData.customsMain.paymentTerm,
                        loadingPort: documentData.customsMain.loadingPort,
                        destinationPort: documentData.customsMain.destinationPort,
                        shipmentMethod: documentData.customsMain.shipmentMethod,
                      };
                      const extValueMap: Partial<Record<string, string>> = {
                        invoiceNo: invoiceExt.invoiceNo,
                        invoiceDate: invoiceExt.invoiceDate,
                        freight: invoiceExt.freight,
                      };
                      const value = field.key in extValueMap
                        ? String(extValueMap[field.key] || "")
                        : String(mainValueMap[field.key] || "");
                      return (
                        <div className="space-y-2" key={field.key}>
                          <Label>{field.label}</Label>
                          {renderConfiguredField(field, value, (nextValue) => {
                            if (field.key in extValueMap) {
                              updateDocumentExtField("commercialInvoice", field.key, nextValue);
                            } else {
                              updateMainField(field.key as keyof CustomsMainData, nextValue);
                            }
                          })}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <Label>银行信息</Label>
                    <Textarea
                      value={String(documentData.documents.commercialInvoice.bankInfo || "")}
                      rows={3}
                      onChange={(e) => updateDocumentExtField("commercialInvoice", "bankInfo", e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold">明细表</h3>
                    </div>
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            {invoiceItemFields.map((field) => (
                              <TableHead key={field.key} className="text-center whitespace-nowrap">
                                {field.label}
                              </TableHead>
                            ))}
                            <TableHead className="text-center whitespace-nowrap">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documentData.customsItems.map((item, index) => (
                            <TableRow key={item.customsItemId}>
                              {invoiceItemFields.map((field) => (
                                <TableCell key={`${item.customsItemId}-${field.key}`} className="min-w-[140px]">
                                  {renderItemField(field, item, index)}
                                </TableCell>
                              ))}
                              <TableCell className="text-center">
                                {documentData.customsItems.length > 1 && (
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeDocumentItem(index)}>
                                    删除
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={addDocumentItem}>
                        新增明细
                      </Button>
                    </div>
                  </div>
                </>
              ) : documentType === "装箱单" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {packingDialogPrimaryFields.map((field) => {
                      const packingExt = documentData.documents.packingList;
                      const mainValueMap: Partial<Record<string, string>> = {
                        contractNo: documentData.customsMain.contractNo,
                        consignee: documentData.customsMain.consignee,
                        notifyParty: documentData.customsMain.notifyParty,
                        totalPackages: documentData.customsMain.totalPackages,
                        grossWeight: documentData.customsMain.grossWeight,
                        netWeight: documentData.customsMain.netWeight,
                        totalVolume: documentData.customsMain.totalVolume,
                      };
                      const extValueMap: Partial<Record<string, string>> = {
                        packingListNo: packingExt.packingListNo,
                        packingDate: packingExt.packingDate,
                        packageType: packingExt.packageType,
                      };
                      const value = field.key in extValueMap
                        ? String(extValueMap[field.key] || "")
                        : String(mainValueMap[field.key] || "");
                      return (
                        <div className="space-y-2" key={field.key}>
                          <Label>{field.label}</Label>
                          {renderConfiguredField(field, value, (nextValue) => {
                            if (field.key in extValueMap) {
                              updateDocumentExtField("packingList", field.key, nextValue);
                            } else {
                              updateMainField(field.key as keyof CustomsMainData, nextValue);
                            }
                          })}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold">明细表</h3>
                    </div>
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            {packingItemFields.map((field) => (
                              <TableHead key={field.key} className="text-center whitespace-nowrap">
                                {field.label}
                              </TableHead>
                            ))}
                            <TableHead className="text-center whitespace-nowrap">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documentData.customsItems.map((item, index) => (
                            <TableRow key={item.customsItemId}>
                              {packingItemFields.map((field) => (
                                <TableCell key={`${item.customsItemId}-${field.key}`} className="min-w-[140px]">
                                  {renderItemField(field, item, index)}
                                </TableCell>
                              ))}
                              <TableCell className="text-center">
                                {documentData.customsItems.length > 1 && (
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeDocumentItem(index)}>
                                    删除
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={addDocumentItem}>
                        新增明细
                      </Button>
                    </div>
                  </div>
                </>
              ) : documentType === "申报要素" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {declarationDialogPrimaryFields.map((field) => {
                      const declarationExt = documentData.documents.declarationElements;
                      const firstItem = documentData.customsItems[0] || emptyItemData(documentData.customsMain.customsId);
                      const mainValueMap: Partial<Record<string, string>> = {
                        currency: documentData.customsMain.currency,
                      };
                      const extValueMap: Partial<Record<string, string>> = {
                        exportBenefit: declarationExt.exportBenefit,
                      };
                      const itemValueMap: Partial<Record<string, string>> = {
                        exemptionNature: firstItem.exemptionNature,
                        brandType: firstItem.brandType,
                        declarationElements: firstItem.declarationElements,
                        usage: firstItem.usage,
                        material: firstItem.material,
                        brand: firstItem.brand,
                        model: firstItem.model,
                        registrationNo: firstItem.registrationNo,
                        gtin: firstItem.gtin,
                        cas: firstItem.cas,
                        otherNote: firstItem.otherNote,
                      };
                      const value = field.key in extValueMap
                        ? String(extValueMap[field.key] || "")
                        : field.key in itemValueMap
                          ? String(itemValueMap[field.key] || "")
                          : String(mainValueMap[field.key] || "");
                      return (
                        <div className="space-y-2" key={field.key}>
                          <Label>{field.label}</Label>
                          {renderConfiguredField(field, value, (nextValue) => {
                            if (field.key in extValueMap) {
                              updateDocumentExtField("declarationElements", field.key, nextValue);
                            } else if (field.key in itemValueMap) {
                              updateItemField(0, field.key as keyof CustomsItemData, nextValue);
                            } else {
                              updateMainField(field.key as keyof CustomsMainData, nextValue);
                            }
                          })}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold">明细表</h3>
                    </div>
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            {declarationItemFields.map((field) => (
                              <TableHead key={field.key} className="text-center whitespace-nowrap">
                                {field.label}
                              </TableHead>
                            ))}
                            <TableHead className="text-center whitespace-nowrap">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documentData.customsItems.map((item, index) => (
                            <TableRow key={item.customsItemId}>
                              {declarationItemFields.map((field) => (
                                <TableCell key={`${item.customsItemId}-${field.key}`} className="min-w-[140px] align-top">
                                  {renderItemField(field, item, index)}
                                </TableCell>
                              ))}
                              <TableCell className="text-center">
                                {documentData.customsItems.length > 1 && (
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeDocumentItem(index)}>
                                    删除
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={addDocumentItem}>
                        新增明细
                      </Button>
                    </div>
                  </div>
                </>
              ) : documentType === "报关单" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {customsDeclarationDialogPrimaryFields.map((field) => {
                      const customsExt = documentData.documents.customsDeclaration;
                      const firstItem = documentData.customsItems[0] || emptyItemData(documentData.customsMain.customsId);
                      const mainValueMap: Partial<Record<string, string>> = {
                        contractNo: documentData.customsMain.contractNo,
                        loadingPort: documentData.customsMain.loadingPort,
                        totalPackages: documentData.customsMain.totalPackages,
                        grossWeight: documentData.customsMain.grossWeight,
                        netWeight: documentData.customsMain.netWeight,
                      };
                      const extValueMap: Partial<Record<string, string>> = {
                        declarationNo: customsExt.declarationNo,
                        customsPort: customsExt.customsPort,
                        exportDate: customsExt.exportDate,
                        declareDate: customsExt.declareDate,
                        recordNo: customsExt.recordNo,
                        overseasConsignee: customsExt.overseasConsignee,
                        transportMode: customsExt.transportMode,
                        transportTool: customsExt.transportTool,
                        billNo: customsExt.billNo,
                        productionSalesUnit: customsExt.productionSalesUnit,
                        supervisionMode: customsExt.supervisionMode,
                        levyNature: customsExt.levyNature,
                        licenseNo: customsExt.licenseNo,
                        tradeCountry: customsExt.tradeCountry,
                        destinationCountry: customsExt.destinationCountry,
                        domesticDestination: customsExt.domesticDestination,
                        packageType: customsExt.packageType,
                        transactionMethod: customsExt.transactionMethod,
                        freight: customsExt.freight,
                        insurance: customsExt.insurance,
                        incidentalFee: customsExt.incidentalFee,
                        marksRemarks: customsExt.marksRemarks,
                      };
                      const value = field.key in extValueMap
                        ? String(extValueMap[field.key] || "")
                        : field.key in firstItem
                          ? String(firstItem[field.key as keyof CustomsItemData] || "")
                          : String(mainValueMap[field.key] || "");
                      return (
                        <div
                          className={`space-y-2 ${customsDeclarationFieldSpanMap[field.key] || "md:col-span-3"}`}
                          key={field.key}
                        >
                          <Label>{field.label}</Label>
                          {renderConfiguredField(field, value, (nextValue) => {
                            if (field.key in extValueMap) {
                              updateDocumentExtField("customsDeclaration", field.key, nextValue);
                            } else if (field.key in firstItem) {
                              updateItemField(0, field.key as keyof CustomsItemData, nextValue);
                            } else {
                              updateMainField(field.key as keyof CustomsMainData, nextValue);
                            }
                          })}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold">明细表</h3>
                    </div>
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            {customsDeclarationItemFields.map((field) => (
                              <TableHead key={field.key} className="text-center whitespace-nowrap">
                                {field.label}
                              </TableHead>
                            ))}
                            <TableHead className="text-center whitespace-nowrap">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documentData.customsItems.map((item, index) => (
                            <TableRow key={item.customsItemId}>
                              {customsDeclarationItemFields.map((field) => (
                                <TableCell key={`${item.customsItemId}-${field.key}`} className="min-w-[140px] align-top">
                                  {renderItemField(field, item, index)}
                                </TableCell>
                              ))}
                              <TableCell className="text-center">
                                {documentData.customsItems.length > 1 && (
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeDocumentItem(index)}>
                                    删除
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={addDocumentItem}>
                        新增明细
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getMainFieldConfigs().map((field) => (
                      <div className="space-y-2" key={field.key}>
                        <Label>{field.label}</Label>
                        {renderConfiguredField(
                          field,
                          String(documentData.customsMain[field.key as keyof CustomsMainData] || ""),
                          (nextValue) => updateMainField(field.key as keyof CustomsMainData, nextValue),
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getExtFieldConfigs().map((field) => (
                      <div className="space-y-2" key={field.key}>
                        <Label>{field.label}</Label>
                        {renderConfiguredField(
                          field,
                          String(currentExtData[field.key] || ""),
                          (nextValue) => updateDocumentExtField(currentDocKey, field.key, nextValue),
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">明细表</h3>
                        <p className="text-xs text-muted-foreground">共用同一份主数据，支持多条明细</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addDocumentItem}>
                        新增明细
                      </Button>
                    </div>
                    {documentData.customsItems.map((item, index) => (
                      <div key={item.customsItemId} className="rounded-lg border p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">明细 {index + 1}</span>
                          {documentData.customsItems.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeDocumentItem(index)}>
                              删除
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {getItemFieldConfigs().map((field) => (
                            <div className="space-y-2" key={`${item.customsItemId}-${field.key}`}>
                              <Label>{field.label}</Label>
                              {renderConfiguredField(
                                field,
                                String(item[field.key as keyof CustomsItemData] || ""),
                                (nextValue) => updateItemField(index, field.key as keyof CustomsItemData, nextValue),
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDocumentDialogOpen(false)}>
                取消
              </Button>
              <Button variant="outline" onClick={handleOpenTemplateManager}>打印模板</Button>
              <Button variant="outline" onClick={handleOpenPrintPreview}>打印预览</Button>
              <Button variant="outline" onClick={handleSaveDocument}>保存</Button>
              <Button onClick={handleGenerateDocument}>创建</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <PrintTemplate
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={`${previewDocumentType}打印预览`}
          landscape={previewDocumentType === "报关单"}
        >
          {renderPreviewContent()}
        </PrintTemplate>

        {
  /* 查看详情对话框 */
}
{viewingRecord && (
  <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
    <DraggableDialogContent>
      {(() => {
        const currentCreatedDocuments = getMergedCreatedDocuments(viewingRecord as any).documents;
        return (
          <>
      <div className="border-b pb-3">
        <h2 className="text-lg font-semibold">报关详情</h2>
        <p className="text-sm text-muted-foreground">
          {viewingRecord.declarationNo}
          {viewingRecord.status && (
            <>
              {" "}
              ·{" "}
              <Badge
                variant={statusMap[viewingRecord.status]?.variant || "outline"}
                className={`ml-1 ${getStatusSemanticClass(
                  viewingRecord.status,
                  statusMap[viewingRecord.status]?.label
                )}`}
              >
                {statusMap[viewingRecord.status]?.label ||
                  String(viewingRecord.status ?? "-")}
              </Badge>
            </>
          )}
        </p>
      </div>

      <div className="space-y-6 py-4">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            基本信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="客户名称">{viewingRecord.customerName}</FieldRow>
              <FieldRow label="关联订单">{viewingRecord.orderNo}</FieldRow>
              <FieldRow label="目的地">{viewingRecord.destination}</FieldRow>
            </div>
            <div>
              <FieldRow label="报关金额">
                {formatAmount(viewingRecord.currency, viewingRecord.amount)}
              </FieldRow>
              <FieldRow label="报关日期">
                {formatDateValue(viewingRecord.declarationDate)}
              </FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            产品信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="产品名称">
                {viewingRecord.productName || "-"}
              </FieldRow>
            </div>
            <div>
              <FieldRow label="数量">
                {viewingRecord.quantity} {viewingRecord.unit}
              </FieldRow>
              <FieldRow label="HS编码">{viewingRecord.hsCode || "-"}</FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            物流信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="运输方式">{viewingRecord.shippingMethod}</FieldRow>
              <FieldRow label="起运港">
                {viewingRecord.portOfLoading || "-"}
              </FieldRow>
              <FieldRow label="目的港">
                {viewingRecord.portOfDischarge || "-"}
              </FieldRow>
            </div>
            <div>
              <FieldRow label="运单号">{viewingRecord.trackingNo || "-"}</FieldRow>
              <FieldRow label="通关日期">
                {formatDateValue(viewingRecord.clearanceDate)}
              </FieldRow>
              <FieldRow label="发运日期">
                {formatDateValue(viewingRecord.shippingDate)}
              </FieldRow>
            </div>
          </div>
        </div>

        {viewingRecord.remarks && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              备注
            </h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
              {viewingRecord.remarks}
            </p>
          </div>
        )}

        <div>
          <Tabs value={detailDocType} onValueChange={(value) => setDetailDocType(value as CustomsDocType)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              {customsDetailDocButtons.map((docButton) => (
                <TabsTrigger key={docButton} value={docButton}>
                  {docButton}
                </TabsTrigger>
              ))}
            </TabsList>

            {customsDetailDocButtons.map((docButton) => {
              const createdDoc = currentCreatedDocuments[docButton];
              const docItems = createdDoc?.data.customsItems || [];
              const docMain = createdDoc?.data.customsMain;
              const docExtKey = documentTypeKeyMap[docButton];
              const docExt = createdDoc?.data.documents[docExtKey] as Record<string, string> | undefined;

              return (
                <TabsContent key={docButton} value={docButton} className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {getDetailDocLabel(docButton)}
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => openGenerateDocumentDialog(viewingRecord, docButton)}>
                      {createdDoc ? "重新创建" : "创建"}
                    </Button>
                  </div>

                  {createdDoc ? (
                    <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <div>
                          <FieldRow label="单据编号">
                            {docButton === "商业发票"
                              ? docExt?.invoiceNo || "-"
                              : docButton === "装箱单"
                                ? docExt?.packingListNo || "-"
                                : docButton === "报关单"
                                    ? docExt?.declarationNo || "-"
                                    : "-"}
                          </FieldRow>
                          <FieldRow label="合同号">{docMain?.contractNo || "-"}</FieldRow>
                          <FieldRow label="买方">{docMain?.buyerName || docMain?.customerName || "-"}</FieldRow>
                          <FieldRow label="买方地址">{docMain?.buyerAddress || "-"}</FieldRow>
                        </div>
                        <div>
                          <FieldRow label="贸易条款">{docMain?.tradeTerm || "-"}</FieldRow>
                          <FieldRow label="付款条件">{docMain?.paymentTerm || "-"}</FieldRow>
                          <FieldRow label="币种">{docMain?.currency || "-"}</FieldRow>
                          <FieldRow label="创建时间">{formatDateValue(createdDoc.createdAt)}</FieldRow>
                        </div>
                      </div>

                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead>产品名称</TableHead>
                              <TableHead>型号</TableHead>
                              <TableHead>英文描述</TableHead>
                              <TableHead>数量</TableHead>
                              <TableHead>单位</TableHead>
                              <TableHead>单价</TableHead>
                              <TableHead>总价</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {docItems.length > 0 ? (
                              docItems.map((item) => (
                                <TableRow key={`${docButton}-${item.customsItemId}`}>
                                  <TableCell>{item.productName || "-"}</TableCell>
                                  <TableCell>{item.model || item.specificationModel || "-"}</TableCell>
                                  <TableCell>{item.descriptionEn || item.productNameEn || "-"}</TableCell>
                                  <TableCell>{item.quantity || "-"}</TableCell>
                                  <TableCell>{item.unit || "-"}</TableCell>
                                  <TableCell>{item.unitPrice || "-"}</TableCell>
                                  <TableCell>{item.totalPrice || "-"}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                                  暂无明细
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      暂未创建{docButton}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </div>

      <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
        <div className="flex gap-2 flex-wrap">{/* 左侧功能按钮 */}</div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewDialogOpen(false)}
          >
            关闭
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setViewDialogOpen(false);
              if (viewingRecord) handleEdit(viewingRecord);
            }}
          >
            编辑
          </Button>
        </div>
      </div>
          </>
        );
      })()}
    </DraggableDialogContent>
  </DraggableDialog>
)}
        <datalist id="customs-hs-code-options">
          {hsCodeLibrary.map((item) => (
            <option key={item.id} value={item.code}>
              {item.productAlias
                ? `${item.code} ${item.productAlias}`
                : item.productName
                  ? `${item.code} ${item.productName}`
                  : item.code}
            </option>
          ))}
        </datalist>
      </div>
    </ERPLayout>
  );
}
