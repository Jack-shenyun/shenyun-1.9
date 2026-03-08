import { useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Printer,
  FileText,
  Edit,
  Eye,
  RotateCcw,
  Save,
  ShoppingCart,
  Truck,
  Receipt,
  Factory,
  Package,
  Tag,
  ClipboardCheck,
} from "lucide-react";

// ==================== 打印模板定义 ====================

interface PrintTemplateItem {
  id: string;
  name: string;
  module: string;
  moduleLabel: string;
  description: string;
  icon: React.ElementType;
  color: string;
  fields: TemplateField[];
  defaultCss: string;
  defaultHtml: string;
}

interface TemplateField {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "table";
  description: string;
}

const PRINT_TEMPLATES: PrintTemplateItem[] = [
  {
    id: "sales_order",
    name: "销售订单",
    module: "sales",
    moduleLabel: "销售部",
    description: "客户销售订单打印，包含订单信息、产品明细、金额汇总",
    icon: ShoppingCart,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    fields: [
      { key: "orderNumber", label: "订单编号", type: "text", description: "销售订单唯一编号" },
      { key: "orderDate", label: "订单日期", type: "date", description: "下单日期" },
      { key: "customerName", label: "客户名称", type: "text", description: "客户全称" },
      { key: "deliveryDate", label: "交货日期", type: "date", description: "预计交货日期" },
      { key: "shippingAddress", label: "收货地址", type: "text", description: "收货详细地址" },
      { key: "paymentMethod", label: "付款方式", type: "text", description: "结算方式" },
      { key: "totalAmount", label: "订单总额", type: "number", description: "含税总金额" },
      { key: "items", label: "产品明细", type: "table", description: "产品名称、规格、数量、单价、金额" },
      { key: "notes", label: "备注", type: "text", description: "订单备注信息" },
    ],
    defaultCss: `body { font-family: 'SimSun', Arial, sans-serif; font-size: 12px; color: #111; padding: 20px 28px; }
.header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
.title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 16px; letter-spacing: 2px; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 11px; }
th { background: #f5f5f5; font-weight: bold; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
.info-row { display: flex; gap: 8px; }
.info-label { color: #666; min-width: 80px; }
.total { text-align: right; font-size: 14px; font-weight: bold; margin-top: 8px; }
.footer { margin-top: 24px; display: flex; justify-content: space-between; }
.sign-box { border-top: 1px solid #111; width: 120px; text-align: center; padding-top: 4px; font-size: 11px; }`,
    defaultHtml: `<div class="header">
  <div>{{companyLogo}}</div>
  <div style="text-align:right">
    <div style="font-size:16px;font-weight:bold">{{companyName}}</div>
    <div style="font-size:11px;color:#666">{{companyAddress}}</div>
  </div>
</div>
<div class="title">销 售 订 单</div>
<div class="info-grid">
  <div class="info-row"><span class="info-label">订单编号：</span><span>{{orderNumber}}</span></div>
  <div class="info-row"><span class="info-label">订单日期：</span><span>{{orderDate}}</span></div>
  <div class="info-row"><span class="info-label">客户名称：</span><span>{{customerName}}</span></div>
  <div class="info-row"><span class="info-label">交货日期：</span><span>{{deliveryDate}}</span></div>
  <div class="info-row"><span class="info-label">收货地址：</span><span>{{shippingAddress}}</span></div>
  <div class="info-row"><span class="info-label">付款方式：</span><span>{{paymentMethod}}</span></div>
</div>
<table>
  <thead><tr><th>产品名称</th><th>产品编码</th><th>规格型号</th><th>数量</th><th>单价</th><th>金额</th></tr></thead>
  <tbody>{{itemRows}}</tbody>
</table>
<div class="total">合计金额：¥ {{totalAmount}}</div>
<div style="margin-top:8px;color:#666;font-size:11px">备注：{{notes}}</div>
<div class="footer">
  <div class="sign-box">销售员</div>
  <div class="sign-box">审核</div>
  <div class="sign-box">客户确认</div>
</div>`,
  },
  {
    id: "delivery_note",
    name: "发货单",
    module: "sales",
    moduleLabel: "销售部 / 仓库",
    description: "出库发货单打印，包含收货信息和发货产品明细",
    icon: Truck,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    fields: [
      { key: "orderNumber", label: "订单编号", type: "text", description: "关联销售订单号" },
      { key: "deliveryDate", label: "发货日期", type: "date", description: "实际发货日期" },
      { key: "customerName", label: "客户名称", type: "text", description: "收货客户" },
      { key: "shippingAddress", label: "收货地址", type: "text", description: "收货详细地址" },
      { key: "shippingContact", label: "收货联系人", type: "text", description: "收货人姓名" },
      { key: "shippingPhone", label: "联系电话", type: "text", description: "收货联系电话" },
      { key: "items", label: "发货明细", type: "table", description: "产品名称、规格、数量、单位" },
    ],
    defaultCss: `body { font-family: 'SimSun', Arial, sans-serif; font-size: 12px; color: #111; padding: 20px 28px; }
.header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
.title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 16px; letter-spacing: 2px; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 11px; }
th { background: #f5f5f5; font-weight: bold; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
.info-row { display: flex; gap: 8px; }
.info-label { color: #666; min-width: 80px; }
.footer { margin-top: 24px; display: flex; justify-content: space-between; }
.sign-box { border-top: 1px solid #111; width: 120px; text-align: center; padding-top: 4px; font-size: 11px; }`,
    defaultHtml: `<div class="header">
  <div>{{companyLogo}}</div>
  <div style="text-align:right">
    <div style="font-size:16px;font-weight:bold">{{companyName}}</div>
  </div>
</div>
<div class="title">发 货 单</div>
<div class="info-grid">
  <div class="info-row"><span class="info-label">订单编号：</span><span>{{orderNumber}}</span></div>
  <div class="info-row"><span class="info-label">发货日期：</span><span>{{deliveryDate}}</span></div>
  <div class="info-row"><span class="info-label">客户名称：</span><span>{{customerName}}</span></div>
  <div class="info-row"><span class="info-label">联系人：</span><span>{{shippingContact}}</span></div>
  <div class="info-row"><span class="info-label">联系电话：</span><span>{{shippingPhone}}</span></div>
  <div class="info-row"><span class="info-label">收货地址：</span><span>{{shippingAddress}}</span></div>
</div>
<table>
  <thead><tr><th>产品名称</th><th>产品编码</th><th>规格型号</th><th>数量</th><th>单位</th></tr></thead>
  <tbody>{{itemRows}}</tbody>
</table>
<div class="footer">
  <div class="sign-box">发货员</div>
  <div class="sign-box">收货确认</div>
  <div class="sign-box">备注</div>
</div>`,
  },
  {
    id: "receipt",
    name: "收据",
    module: "sales",
    moduleLabel: "销售部",
    description: "付款收据打印，包含收款信息和金额明细",
    icon: Receipt,
    color: "bg-violet-50 border-violet-200 text-violet-700",
    fields: [
      { key: "receiptNumber", label: "收据编号", type: "text", description: "收据唯一编号" },
      { key: "receiptDate", label: "收款日期", type: "date", description: "实际收款日期" },
      { key: "customerName", label: "客户名称", type: "text", description: "付款客户" },
      { key: "paymentMethod", label: "付款方式", type: "text", description: "现金/转账/支票等" },
      { key: "totalAmount", label: "应收金额", type: "number", description: "订单总金额" },
      { key: "paidAmount", label: "实收金额", type: "number", description: "本次实际收款金额" },
      { key: "remainingAmount", label: "未收金额", type: "number", description: "剩余未收款金额" },
    ],
    defaultCss: `body { font-family: 'SimSun', Arial, sans-serif; font-size: 12px; color: #111; padding: 20px 28px; }
.header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
.title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 16px; letter-spacing: 2px; }
.amount-box { border: 2px solid #111; padding: 12px; margin: 16px 0; text-align: center; }
.amount-big { font-size: 28px; font-weight: bold; color: #c00; }
.info-row { display: flex; gap: 8px; margin-bottom: 6px; }
.info-label { color: #666; min-width: 80px; }
.footer { margin-top: 24px; display: flex; justify-content: space-between; }
.sign-box { border-top: 1px solid #111; width: 120px; text-align: center; padding-top: 4px; font-size: 11px; }`,
    defaultHtml: `<div class="header">
  <div>{{companyLogo}}</div>
  <div style="text-align:right"><div style="font-size:16px;font-weight:bold">{{companyName}}</div></div>
</div>
<div class="title">收 据</div>
<div class="info-row"><span class="info-label">收据编号：</span><span>{{receiptNumber}}</span></div>
<div class="info-row"><span class="info-label">收款日期：</span><span>{{receiptDate}}</span></div>
<div class="info-row"><span class="info-label">客户名称：</span><span>{{customerName}}</span></div>
<div class="info-row"><span class="info-label">付款方式：</span><span>{{paymentMethod}}</span></div>
<div class="amount-box">
  <div style="font-size:12px;color:#666;margin-bottom:4px">实收金额</div>
  <div class="amount-big">¥ {{paidAmount}}</div>
</div>
<div class="info-row"><span class="info-label">应收金额：</span><span>¥ {{totalAmount}}</span></div>
<div class="info-row"><span class="info-label">未收金额：</span><span>¥ {{remainingAmount}}</span></div>
<div class="footer">
  <div class="sign-box">收款人</div>
  <div class="sign-box">财务审核</div>
  <div class="sign-box">客户签字</div>
</div>`,
  },
  {
    id: "purchase_order",
    name: "采购订单",
    module: "purchase",
    moduleLabel: "采购部",
    description: "采购订单打印下达，包含供应商信息和采购明细",
    icon: Package,
    color: "bg-cyan-50 border-cyan-200 text-cyan-700",
    fields: [
      { key: "orderNo", label: "采购单号", type: "text", description: "采购订单编号" },
      { key: "orderDate", label: "下单日期", type: "date", description: "采购下单日期" },
      { key: "supplierName", label: "供应商名称", type: "text", description: "供应商全称" },
      { key: "deliveryDate", label: "要求交货期", type: "date", description: "要求到货日期" },
      { key: "totalAmount", label: "采购总额", type: "number", description: "含税总金额" },
      { key: "items", label: "采购明细", type: "table", description: "物料名称、规格、数量、单价、金额" },
      { key: "remark", label: "备注", type: "text", description: "特殊要求或备注" },
    ],
    defaultCss: `body { font-family: 'SimSun', Arial, sans-serif; font-size: 12px; color: #111; padding: 20px 28px; }
.header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
.title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 16px; letter-spacing: 2px; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 11px; }
th { background: #f5f5f5; font-weight: bold; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
.info-row { display: flex; gap: 8px; }
.info-label { color: #666; min-width: 80px; }
.total { text-align: right; font-size: 14px; font-weight: bold; margin-top: 8px; }
.footer { margin-top: 24px; display: flex; justify-content: space-between; }
.sign-box { border-top: 1px solid #111; width: 120px; text-align: center; padding-top: 4px; font-size: 11px; }`,
    defaultHtml: `<div class="header">
  <div>{{companyLogo}}</div>
  <div style="text-align:right"><div style="font-size:16px;font-weight:bold">{{companyName}}</div></div>
</div>
<div class="title">采 购 订 单</div>
<div class="info-grid">
  <div class="info-row"><span class="info-label">采购单号：</span><span>{{orderNo}}</span></div>
  <div class="info-row"><span class="info-label">下单日期：</span><span>{{orderDate}}</span></div>
  <div class="info-row"><span class="info-label">供应商：</span><span>{{supplierName}}</span></div>
  <div class="info-row"><span class="info-label">要求交货期：</span><span>{{deliveryDate}}</span></div>
</div>
<table>
  <thead><tr><th>物料名称</th><th>规格型号</th><th>数量</th><th>单位</th><th>单价</th><th>金额</th></tr></thead>
  <tbody>{{itemRows}}</tbody>
</table>
<div class="total">合计金额：¥ {{totalAmount}}</div>
<div style="margin-top:8px;color:#666;font-size:11px">备注：{{remark}}</div>
<div class="footer">
  <div class="sign-box">采购员</div>
  <div class="sign-box">审核</div>
  <div class="sign-box">供应商确认</div>
</div>`,
  },
  {
    id: "production_order",
    name: "生产指令",
    module: "production",
    moduleLabel: "生产部",
    description: "生产工单打印，包含生产任务、物料、工序信息",
    icon: Factory,
    color: "bg-orange-50 border-orange-200 text-orange-700",
    fields: [
      { key: "orderNo", label: "工单编号", type: "text", description: "生产工单唯一编号" },
      { key: "productName", label: "产品名称", type: "text", description: "生产产品名称" },
      { key: "productCode", label: "产品编码", type: "text", description: "产品编码" },
      { key: "plannedQty", label: "计划数量", type: "number", description: "本次生产计划数量" },
      { key: "unit", label: "单位", type: "text", description: "计量单位" },
      { key: "plannedStartDate", label: "计划开始日期", type: "date", description: "生产开始日期" },
      { key: "plannedEndDate", label: "计划完成日期", type: "date", description: "生产完成日期" },
      { key: "batchNo", label: "批次号", type: "text", description: "生产批次号" },
      { key: "remark", label: "备注", type: "text", description: "生产注意事项" },
    ],
    defaultCss: `body { font-family: 'SimSun', Arial, sans-serif; font-size: 12px; color: #111; padding: 20px 28px; }
.header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
.title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 16px; letter-spacing: 2px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
.info-row { display: flex; gap: 8px; margin-bottom: 4px; }
.info-label { color: #666; min-width: 90px; }
.section-title { font-weight: bold; border-left: 3px solid #333; padding-left: 8px; margin: 12px 0 6px; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; }
th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; }
th { background: #f5f5f5; font-weight: bold; }
.footer { margin-top: 24px; display: flex; justify-content: space-between; }
.sign-box { border-top: 1px solid #111; width: 120px; text-align: center; padding-top: 4px; font-size: 11px; }`,
    defaultHtml: `<div class="header">
  <div>{{companyLogo}}</div>
  <div style="text-align:right"><div style="font-size:16px;font-weight:bold">{{companyName}}</div></div>
</div>
<div class="title">生 产 指 令</div>
<div class="info-grid">
  <div class="info-row"><span class="info-label">工单编号：</span><span>{{orderNo}}</span></div>
  <div class="info-row"><span class="info-label">产品名称：</span><span>{{productName}}</span></div>
  <div class="info-row"><span class="info-label">产品编码：</span><span>{{productCode}}</span></div>
  <div class="info-row"><span class="info-label">计划数量：</span><span>{{plannedQty}} {{unit}}</span></div>
  <div class="info-row"><span class="info-label">批次号：</span><span>{{batchNo}}</span></div>
  <div class="info-row"><span class="info-label">计划开始：</span><span>{{plannedStartDate}}</span></div>
  <div class="info-row"><span class="info-label">计划完成：</span><span>{{plannedEndDate}}</span></div>
</div>
<div class="section-title">备注 / 注意事项</div>
<div style="border:1px solid #ccc;padding:8px;min-height:40px;font-size:11px">{{remark}}</div>
<div class="footer">
  <div class="sign-box">生产主管</div>
  <div class="sign-box">操作员</div>
  <div class="sign-box">质检员</div>
</div>`,
  },
  {
    id: "iqc_inspection",
    name: "来料检验报告",
    module: "quality",
    moduleLabel: "质量部",
    description: "IQC 来料检验单打印，包含检验项目和结论",
    icon: ClipboardCheck,
    color: "bg-rose-50 border-rose-200 text-rose-700",
    fields: [
      { key: "inspectionNo", label: "检验编号", type: "text", description: "IQC 检验单编号" },
      { key: "inspectionDate", label: "检验日期", type: "date", description: "实际检验日期" },
      { key: "productName", label: "产品名称", type: "text", description: "被检验产品名称" },
      { key: "supplierName", label: "供应商", type: "text", description: "来料供应商" },
      { key: "batchNo", label: "批次号", type: "text", description: "来料批次号" },
      { key: "receivedQty", label: "到货数量", type: "number", description: "本次到货数量" },
      { key: "sampleQty", label: "抽样数量", type: "number", description: "实际抽样数量" },
      { key: "result", label: "检验结论", type: "text", description: "合格/不合格/条件接收" },
      { key: "items", label: "检验明细", type: "table", description: "检验项目、标准、实测值、结论" },
    ],
    defaultCss: `body { font-family: 'SimSun', Arial, sans-serif; font-size: 12px; color: #111; padding: 20px 28px; }
.header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
.title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 16px; letter-spacing: 2px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
.info-row { display: flex; gap: 8px; margin-bottom: 4px; }
.info-label { color: #666; min-width: 80px; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; }
th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; }
th { background: #f5f5f5; font-weight: bold; }
.result-pass { color: #16a34a; font-weight: bold; }
.result-fail { color: #dc2626; font-weight: bold; }
.footer { margin-top: 24px; display: flex; justify-content: space-between; }
.sign-box { border-top: 1px solid #111; width: 120px; text-align: center; padding-top: 4px; font-size: 11px; }`,
    defaultHtml: `<div class="header">
  <div>{{companyLogo}}</div>
  <div style="text-align:right"><div style="font-size:16px;font-weight:bold">{{companyName}}</div></div>
</div>
<div class="title">来 料 检 验 报 告</div>
<div class="info-grid">
  <div class="info-row"><span class="info-label">检验编号：</span><span>{{inspectionNo}}</span></div>
  <div class="info-row"><span class="info-label">检验日期：</span><span>{{inspectionDate}}</span></div>
  <div class="info-row"><span class="info-label">产品名称：</span><span>{{productName}}</span></div>
  <div class="info-row"><span class="info-label">供应商：</span><span>{{supplierName}}</span></div>
  <div class="info-row"><span class="info-label">批次号：</span><span>{{batchNo}}</span></div>
  <div class="info-row"><span class="info-label">到货数量：</span><span>{{receivedQty}}</span></div>
  <div class="info-row"><span class="info-label">抽样数量：</span><span>{{sampleQty}}</span></div>
  <div class="info-row"><span class="info-label">检验结论：</span><span class="result-pass">{{result}}</span></div>
</div>
<table>
  <thead><tr><th>检验项目</th><th>检验标准</th><th>实测值</th><th>结论</th></tr></thead>
  <tbody>{{itemRows}}</tbody>
</table>
<div class="footer">
  <div class="sign-box">检验员</div>
  <div class="sign-box">审核</div>
  <div class="sign-box">批准</div>
</div>`,
  },
  {
    id: "udi_label",
    name: "UDI 标签",
    module: "udi",
    moduleLabel: "UDI 管理",
    description: "UDI 产品标签打印，包含条形码、二维码和产品信息",
    icon: Tag,
    color: "bg-amber-50 border-amber-200 text-amber-700",
    fields: [
      { key: "udiDi", label: "UDI-DI", type: "text", description: "设备标识符" },
      { key: "udiPi", label: "UDI-PI", type: "text", description: "生产标识符" },
      { key: "productName", label: "产品名称", type: "text", description: "产品名称" },
      { key: "productCode", label: "产品编码", type: "text", description: "产品编码" },
      { key: "batchNo", label: "批次号", type: "text", description: "生产批次号" },
      { key: "productionDate", label: "生产日期", type: "date", description: "生产日期" },
      { key: "expiryDate", label: "有效期", type: "date", description: "产品有效期" },
      { key: "manufacturer", label: "生产厂家", type: "text", description: "生产企业名称" },
    ],
    defaultCss: `body { font-family: 'SimSun', Arial, sans-serif; font-size: 10px; color: #111; }
.label { border: 1px solid #333; padding: 8px; width: 80mm; display: inline-block; }
.label-title { font-size: 13px; font-weight: bold; text-align: center; margin-bottom: 6px; }
.barcode-area { text-align: center; margin: 6px 0; background: #f5f5f5; padding: 8px; border: 1px dashed #ccc; font-size: 11px; }
.info-row { display: flex; gap: 4px; margin-bottom: 2px; }
.info-label { color: #666; min-width: 60px; font-size: 9px; }`,
    defaultHtml: `<div class="label">
  <div class="label-title">{{productName}}</div>
  <div class="barcode-area">[ 条形码 / 二维码区域 ]<br/>{{udiDi}}</div>
  <div class="info-row"><span class="info-label">产品编码：</span><span>{{productCode}}</span></div>
  <div class="info-row"><span class="info-label">批次号：</span><span>{{batchNo}}</span></div>
  <div class="info-row"><span class="info-label">生产日期：</span><span>{{productionDate}}</span></div>
  <div class="info-row"><span class="info-label">有效期至：</span><span>{{expiryDate}}</span></div>
  <div class="info-row"><span class="info-label">生产厂家：</span><span>{{manufacturer}}</span></div>
</div>`,
  },
];

// ==================== 主页面组件 ====================

export default function PrintTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplateItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingCss, setEditingCss] = useState("");
  const [editingHtml, setEditingHtml] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingDesc, setEditingDesc] = useState("");
  // 本地存储自定义模板（后期可接后端）
  const [customTemplates, setCustomTemplates] = useState<Record<string, { css: string; html: string; name: string; description: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem("erpPrintTemplates") || "{}");
    } catch {
      return {};
    }
  });

  const getTemplate = (t: PrintTemplateItem) => {
    const custom = customTemplates[t.id];
    return {
      css: custom?.css ?? t.defaultCss,
      html: custom?.html ?? t.defaultHtml,
      name: custom?.name ?? t.name,
      description: custom?.description ?? t.description,
    };
  };

  const handleEdit = (t: PrintTemplateItem) => {
    const tpl = getTemplate(t);
    setSelectedTemplate(t);
    setEditingName(tpl.name);
    setEditingDesc(tpl.description);
    setEditingCss(tpl.css);
    setEditingHtml(tpl.html);
    setEditOpen(true);
  };

  const handlePreview = (t: PrintTemplateItem) => {
    setSelectedTemplate(t);
    setPreviewOpen(true);
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    const updated = {
      ...customTemplates,
      [selectedTemplate.id]: {
        css: editingCss,
        html: editingHtml,
        name: editingName,
        description: editingDesc,
      },
    };
    setCustomTemplates(updated);
    localStorage.setItem("erpPrintTemplates", JSON.stringify(updated));
    setEditOpen(false);
    toast.success("模板已保存");
  };

  const handleReset = () => {
    if (!selectedTemplate) return;
    const updated = { ...customTemplates };
    delete updated[selectedTemplate.id];
    setCustomTemplates(updated);
    localStorage.setItem("erpPrintTemplates", JSON.stringify(updated));
    setEditingCss(selectedTemplate.defaultCss);
    setEditingHtml(selectedTemplate.defaultHtml);
    setEditingName(selectedTemplate.name);
    setEditingDesc(selectedTemplate.description);
    toast.success("已恢复默认模板");
  };

  const isCustomized = (id: string) => !!customTemplates[id];

  // 按模块分组
  const moduleGroups: Record<string, { label: string; templates: PrintTemplateItem[] }> = {};
  for (const t of PRINT_TEMPLATES) {
    if (!moduleGroups[t.module]) {
      moduleGroups[t.module] = { label: t.moduleLabel, templates: [] };
    }
    moduleGroups[t.module].templates.push(t);
  }

  return (
    <ERPLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Printer className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">打印模板管理</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              管理系统中所有可打印表单的模板样式，支持自定义 HTML 和 CSS
            </p>
          </div>
        </div>

        {/* 说明卡片 */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex gap-3 text-sm text-blue-800">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">模板变量说明：</span>
                使用 <code className="bg-blue-100 px-1 rounded">{"{{字段名}}"}</code> 引用数据字段，
                <code className="bg-blue-100 px-1 rounded">{"{{companyName}}"}</code> 和
                <code className="bg-blue-100 px-1 rounded">{"{{companyLogo}}"}</code> 会自动读取公司信息，
                <code className="bg-blue-100 px-1 rounded">{"{{itemRows}}"}</code> 用于渲染表格明细行。
                模板当前保存在本地，后期将支持云端同步。
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 按模块分组展示 */}
        {Object.entries(moduleGroups).map(([moduleId, group]) => (
          <div key={moduleId} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-semibold">{group.label}</h2>
              <Badge variant="secondary" className="text-xs">{group.templates.length} 个模板</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.templates.map((t) => {
                const Icon = t.icon;
                const customized = isCustomized(t.id);
                const tpl = getTemplate(t);
                return (
                  <Card key={t.id} className={`border transition-shadow hover:shadow-md`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg border ${t.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">{tpl.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{t.moduleLabel}</p>
                          </div>
                        </div>
                        {customized && (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-600 bg-amber-50">
                            已自定义
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{tpl.description}</p>
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">包含字段：</p>
                        <div className="flex flex-wrap gap-1">
                          {t.fields.slice(0, 5).map((f) => (
                            <Badge key={f.key} variant="secondary" className="text-xs px-1.5 py-0">
                              {f.label}
                            </Badge>
                          ))}
                          {t.fields.length > 5 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0 text-muted-foreground">
                              +{t.fields.length - 5}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Separator className="mb-3" />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => handlePreview(t)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> 预览
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => handleEdit(t)}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" /> 编辑模板
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {/* 编辑模板对话框 */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                编辑打印模板 — {selectedTemplate?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">模板名称</Label>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="模板名称"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">模板描述</Label>
                  <Input
                    value={editingDesc}
                    onChange={(e) => setEditingDesc(e.target.value)}
                    placeholder="模板描述"
                  />
                </div>
              </div>

              {/* 字段说明 */}
              {selectedTemplate && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium mb-2">可用字段变量：</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.fields.map((f) => (
                      <div key={f.key} className="group relative">
                        <Badge
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(`{{${f.key}}}`);
                            toast.success(`已复制 {{${f.key}}}`);
                          }}
                        >
                          {`{{${f.key}}}`}
                        </Badge>
                      </div>
                    ))}
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground" onClick={() => { navigator.clipboard.writeText("{{companyName}}"); toast.success("已复制"); }}>
                      {"{{companyName}}"}
                    </Badge>
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground" onClick={() => { navigator.clipboard.writeText("{{companyLogo}}"); toast.success("已复制"); }}>
                      {"{{companyLogo}}"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">点击变量可复制到剪贴板</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm">HTML 模板</Label>
                <Textarea
                  value={editingHtml}
                  onChange={(e) => setEditingHtml(e.target.value)}
                  className="font-mono text-xs min-h-[200px]"
                  placeholder="HTML 模板内容..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">CSS 样式</Label>
                <Textarea
                  value={editingCss}
                  onChange={(e) => setEditingCss(e.target.value)}
                  className="font-mono text-xs min-h-[150px]"
                  placeholder="CSS 样式..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> 恢复默认
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>取消</Button>
              <Button size="sm" onClick={handleSave} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> 保存模板
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 预览对话框 */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                模板预览 — {selectedTemplate && getTemplate(selectedTemplate).name}
              </DialogTitle>
            </DialogHeader>
            {selectedTemplate && (() => {
              const tpl = getTemplate(selectedTemplate);
              return (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
                    <span>打印预览（示例数据）</span>
                    <Badge variant="secondary" className="text-xs">{selectedTemplate.moduleLabel}</Badge>
                  </div>
                  <div className="p-4 bg-white">
                    <style dangerouslySetInnerHTML={{ __html: tpl.css }} />
                    <div
                      dangerouslySetInnerHTML={{
                        __html: tpl.html
                          .replace(/\{\{companyName\}\}/g, "示例医疗器械有限公司")
                          .replace(/\{\{companyLogo\}\}/g, '<div style="width:50px;height:50px;background:#e5e7eb;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#9ca3af;">LOGO</div>')
                          .replace(/\{\{itemRows\}\}/g, '<tr><td>示例产品</td><td>SP-001</td><td>规格A</td><td>100</td><td>¥50.00</td><td>¥5000.00</td></tr>')
                          .replace(/\{\{(\w+)\}\}/g, (_, key) => {
                            const field = selectedTemplate.fields.find(f => f.key === key);
                            if (!field) return `[${key}]`;
                            if (field.type === "date") return "2026-03-08";
                            if (field.type === "number") return "1000.00";
                            return `示例${field.label}`;
                          })
                      }}
                    />
                  </div>
                </div>
              );
            })()}
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setPreviewOpen(false); if (selectedTemplate) handleEdit(selectedTemplate); }}>
                <Edit className="h-3.5 w-3.5 mr-1" /> 编辑此模板
              </Button>
              <Button size="sm" onClick={() => setPreviewOpen(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  );
}
