/**
 * 邮箱协同服务
 * 支持 SMTP 直发（配置 SMTP_* 环境变量后启用）
 * 未配置 SMTP 时，降级为系统内通知（notifyOwner）
 */
import nodemailer from "nodemailer";
import { notifyOwner } from "./_core/notification";

// ==================== 类型定义 ====================
export interface EmailPayload {
  to: string | string[];      // 收件人邮箱（多个用数组）
  cc?: string | string[];     // 抄送
  subject: string;            // 邮件主题
  html: string;               // HTML 正文
  text?: string;              // 纯文本备用
}

export interface EmailNotificationConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  smtpSecure?: boolean;
}

// ==================== 环境变量读取 ====================
function getSmtpConfig(): EmailNotificationConfig {
  return {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER,
    smtpSecure: process.env.SMTP_SECURE !== "false",
  };
}

function isSmtpConfigured(): boolean {
  const cfg = getSmtpConfig();
  return !!(cfg.smtpHost && cfg.smtpUser && cfg.smtpPass);
}

// ==================== 邮件发送核心 ====================
async function sendViaSMTP(payload: EmailPayload): Promise<boolean> {
  const cfg = getSmtpConfig();
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      secure: cfg.smtpSecure,
      auth: {
        user: cfg.smtpUser,
        pass: cfg.smtpPass,
      },
    });

    const toList = Array.isArray(payload.to) ? payload.to.join(",") : payload.to;
    const ccList = payload.cc
      ? Array.isArray(payload.cc) ? payload.cc.join(",") : payload.cc
      : undefined;

    await transporter.sendMail({
      from: `"GTP-ERP 系统" <${cfg.smtpFrom}>`,
      to: toList,
      cc: ccList,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    console.log(`[Email] 邮件已发送至 ${toList}：${payload.subject}`);
    return true;
  } catch (error) {
    console.error("[Email] SMTP 发送失败：", error);
    return false;
  }
}

/**
 * 统一邮件发送入口
 * - 有 SMTP 配置时直接发送邮件
 * - 无 SMTP 配置时降级为系统通知（notifyOwner）
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (isSmtpConfigured()) {
    return await sendViaSMTP(payload);
  }
  // 降级：通过系统通知推送
  try {
    const toStr = Array.isArray(payload.to) ? payload.to.join(", ") : payload.to;
    await notifyOwner({
      title: `[邮件通知] ${payload.subject}`,
      content: `收件人: ${toStr}\n\n${payload.text || payload.subject}`,
    });
    console.log(`[Email] 降级为系统通知：${payload.subject}`);
    return true;
  } catch (e) {
    console.warn("[Email] 系统通知也失败：", e);
    return false;
  }
}

// ==================== HTML 邮件模板 ====================
function buildEmailTemplate(opts: {
  title: string;
  batchNo?: string;
  productName?: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  color?: string;
}): string {
  const color = opts.color || "#2563eb";
  const actionBtn = opts.actionUrl
    ? `<div style="margin:24px 0;">
        <a href="${opts.actionUrl}" style="background:${color};color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
          ${opts.actionLabel || "查看详情"}
        </a>
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${opts.title}</title></head>
<body style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#f5f7fa;margin:0;padding:0;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <!-- 头部 -->
    <div style="background:${color};padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">GTP-ERP 系统通知</h1>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">${opts.title}</p>
    </div>
    <!-- 批号信息 -->
    ${opts.batchNo ? `
    <div style="background:#f0f4ff;padding:12px 32px;border-bottom:1px solid #e5e7eb;">
      <span style="font-size:13px;color:#6b7280;">生产批号（唯一追溯）：</span>
      <span style="font-size:15px;font-weight:700;color:${color};font-family:monospace;">${opts.batchNo}</span>
      ${opts.productName ? `<span style="font-size:13px;color:#6b7280;margin-left:16px;">产品：${opts.productName}</span>` : ''}
    </div>` : ''}
    <!-- 正文 -->
    <div style="padding:24px 32px;font-size:14px;color:#374151;line-height:1.8;">
      ${opts.body}
      ${actionBtn}
    </div>
    <!-- 底部 -->
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
      此邮件由 GTP-ERP 系统自动发送，请勿直接回复。
    </div>
  </div>
</body>
</html>`;
}

// ==================== 业务通知函数 ====================

/**
 * 1. 灭菌单到货 → 通知质量部 OQC 检验
 */
export async function notifySterilizationArrived(params: {
  batchNo: string;
  productName?: string;
  sterilizationOrderNo: string;
  sterilizationBatchNo?: string;
  quantity: number;
  unit?: string;
  supplierName?: string;
  qualityEmails: string[];
}) {
  const subject = `【灭菌到货】批号 ${params.batchNo} 已到货，请安排 OQC 检验`;
  const body = `
    <p>您好，</p>
    <p>以下灭菌委外产品已到货，请质量部安排 <strong>OQC 出货检验</strong>：</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
      <tr style="background:#f3f4f6;">
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">灭菌单号</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.sterilizationOrderNo}</td>
      </tr>
      ${params.sterilizationBatchNo ? `<tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">灭菌批号</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.sterilizationBatchNo}</td>
      </tr>` : ''}
      <tr style="background:#f3f4f6;">
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">到货数量</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.quantity} ${params.unit || ''}</td>
      </tr>
      ${params.supplierName ? `<tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">灭菌供应商</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.supplierName}</td>
      </tr>` : ''}
    </table>
    <p style="color:#d97706;font-weight:600;">⚠️ 请及时登录系统完成 OQC 检验，检验结果将自动更新入库申请数量。</p>
  `;

  return await sendEmail({
    to: params.qualityEmails,
    subject,
    html: buildEmailTemplate({
      title: subject,
      batchNo: params.batchNo,
      productName: params.productName,
      body,
      color: "#7c3aed",
    }),
    text: `灭菌单 ${params.sterilizationOrderNo} 已到货，批号 ${params.batchNo}，数量 ${params.quantity} ${params.unit || ''}，请安排 OQC 检验。`,
  });
}

/**
 * 2. 生产入库申请已提交 → 通知质量部安排 OQC 检验
 */
export async function notifyWarehouseEntryCreatedForOqc(params: {
  entryNo: string;
  batchNo: string;
  productName?: string;
  quantity: number;
  unit?: string;
  qualityEmails: string[];
}) {
  const subject = `【入库申请待检】${params.entryNo} 已提交，请质量部安排 OQC 检验`;
  const body = `
    <p>您好，</p>
    <p>以下 <strong>生产入库申请</strong> 已提交，请质量部安排成品检验：</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
      <tr style="background:#f3f4f6;">
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">入库申请单号</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.entryNo}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">生产批号</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.batchNo || "-"}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">申请数量</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.quantity} ${params.unit || ""}</td>
      </tr>
    </table>
    <p style="color:#d97706;font-weight:600;">⚠️ 该入库申请已自动进入 OQC 待办列表，请及时检验。</p>
  `;

  return await sendEmail({
    to: params.qualityEmails,
    subject,
    html: buildEmailTemplate({
      title: subject,
      batchNo: params.batchNo,
      productName: params.productName,
      body,
      color: "#0f766e",
    }),
    text: `生产入库申请 ${params.entryNo} 已提交，批号 ${params.batchNo || "-"}，数量 ${params.quantity} ${params.unit || ""}，请质量部安排 OQC 检验。`,
  });
}

/**
 * 3. OQC 检验合格 → 通知生产部提交入库申请
 */
export async function notifyOqcQualified(params: {
  batchNo: string;
  productName?: string;
  inspectionNo: string;
  qualifiedQty: number;
  rejectQty?: number;
  sampleQty?: number;
  productionEmails: string[];
}) {
  const subject = `【OQC 合格】批号 ${params.batchNo} 检验通过，请提交入库申请`;
  const body = `
    <p>您好，</p>
    <p>以下批次 OQC 检验已通过，请生产部及时提交 <strong>生产入库申请</strong>：</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
      <tr style="background:#f3f4f6;">
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">检验单号</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.inspectionNo}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">合格数量</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#16a34a;font-weight:600;">${params.qualifiedQty}</td>
      </tr>
      ${params.rejectQty != null ? `<tr style="background:#f3f4f6;">
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">检验报废</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#dc2626;">${params.rejectQty}</td>
      </tr>` : ''}
      ${params.sampleQty != null ? `<tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">留样数量</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.sampleQty}</td>
      </tr>` : ''}
    </table>
    <p style="color:#16a34a;font-weight:600;">✅ 系统已自动更新入库申请数量，请登录系统确认并提交审批。</p>
  `;

  return await sendEmail({
    to: params.productionEmails,
    subject,
    html: buildEmailTemplate({
      title: subject,
      batchNo: params.batchNo,
      productName: params.productName,
      body,
      color: "#16a34a",
    }),
    text: `批号 ${params.batchNo} OQC 检验通过，合格数量 ${params.qualifiedQty}，请提交入库申请。`,
  });
}

/**
 * 4. OQC 检验不合格 → 通知生产部和质量主管
 */
export async function notifyOqcUnqualified(params: {
  batchNo: string;
  productName?: string;
  inspectionNo: string;
  unqualifiedQty: number;
  defectDescription?: string;
  notifyEmails: string[];
}) {
  const subject = `【OQC 不合格】批号 ${params.batchNo} 检验不通过，请及时处理`;
  const body = `
    <p>您好，</p>
    <p>以下批次 OQC 检验 <strong style="color:#dc2626;">不合格</strong>，请相关部门及时处理：</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
      <tr style="background:#fef2f2;">
        <td style="padding:8px 12px;border:1px solid #fecaca;font-weight:600;">检验单号</td>
        <td style="padding:8px 12px;border:1px solid #fecaca;">${params.inspectionNo}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #fecaca;font-weight:600;">不合格数量</td>
        <td style="padding:8px 12px;border:1px solid #fecaca;color:#dc2626;font-weight:600;">${params.unqualifiedQty}</td>
      </tr>
      ${params.defectDescription ? `<tr style="background:#fef2f2;">
        <td style="padding:8px 12px;border:1px solid #fecaca;font-weight:600;">不合格描述</td>
        <td style="padding:8px 12px;border:1px solid #fecaca;">${params.defectDescription}</td>
      </tr>` : ''}
    </table>
    <p style="color:#dc2626;font-weight:600;">❌ 请登录系统填写不合格处理方案（返工/报废/让步接收）。</p>
  `;

  return await sendEmail({
    to: params.notifyEmails,
    subject,
    html: buildEmailTemplate({
      title: subject,
      batchNo: params.batchNo,
      productName: params.productName,
      body,
      color: "#dc2626",
    }),
    text: `批号 ${params.batchNo} OQC 检验不合格，不合格数量 ${params.unqualifiedQty}，请及时处理。`,
  });
}

/**
 * 5. 生产入库申请审批通过 → 通知仓库部执行入库
 */
export async function notifyWarehouseEntryApproved(params: {
  batchNo: string;
  productName?: string;
  entryNo: string;
  quantity: number;
  unit?: string;
  warehouseEmails: string[];
}) {
  const subject = `【入库审批通过】批号 ${params.batchNo} 入库申请已审批，请安排入库`;
  const body = `
    <p>您好，</p>
    <p>以下生产入库申请已审批通过，请仓库部安排 <strong>实物入库</strong>：</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
      <tr style="background:#f3f4f6;">
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">入库申请单号</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.entryNo}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">入库数量</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">${params.quantity} ${params.unit || ''}</td>
      </tr>
    </table>
    <p style="color:#2563eb;font-weight:600;">📦 请登录系统确认实物入库并更新库存。</p>
  `;

  return await sendEmail({
    to: params.warehouseEmails,
    subject,
    html: buildEmailTemplate({
      title: subject,
      batchNo: params.batchNo,
      productName: params.productName,
      body,
      color: "#2563eb",
    }),
    text: `批号 ${params.batchNo} 入库申请 ${params.entryNo} 已审批通过，数量 ${params.quantity} ${params.unit || ''}，请安排入库。`,
  });
}

/**
 * 6. 生产入库完成 → 通知销售部和财务部
 */
export async function notifyWarehouseEntryCompleted(params: {
  batchNo: string;
  productName?: string;
  entryNo: string;
  quantity: number;
  unit?: string;
  salesOrderNo?: string;
  salesEmails: string[];
  financeEmails?: string[];
}) {
  const subject = `【入库完成】批号 ${params.batchNo} 已完成入库，库存已更新`;
  const body = `
    <p>您好，</p>
    <p>以下批次已完成 <strong>生产入库</strong>，库存已更新：</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
      <tr style="background:#f3f4f6;">
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">入库申请单号</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.entryNo}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">入库数量</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#16a34a;font-weight:600;">${params.quantity} ${params.unit || ''}</td>
      </tr>
      ${params.salesOrderNo ? `<tr style="background:#f3f4f6;">
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">关联销售订单</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.salesOrderNo}</td>
      </tr>` : ''}
    </table>
    <p style="color:#16a34a;font-weight:600;">✅ 库存已更新，销售部可安排发货，财务部可开具发票。</p>
  `;

  const allEmails = [...params.salesEmails, ...(params.financeEmails || [])];
  return await sendEmail({
    to: allEmails,
    subject,
    html: buildEmailTemplate({
      title: subject,
      batchNo: params.batchNo,
      productName: params.productName,
      body,
      color: "#16a34a",
    }),
    text: `批号 ${params.batchNo} 已完成入库，数量 ${params.quantity} ${params.unit || ''}，库存已更新。`,
  });
}

/**
 * 6. 采购申请审批通过 → 通知采购部下单
 */
export async function notifyMaterialRequestApproved(params: {
  requestNo: string;
  itemCount: number;
  urgency?: string;
  purchaseEmails: string[];
}) {
  const subject = `【采购申请通过】${params.requestNo} 已审批，请及时下采购订单`;
  const urgencyLabel: Record<string, string> = {
    normal: "普通", urgent: "紧急", critical: "特急",
  };
  const body = `
    <p>您好，</p>
    <p>以下采购申请已审批通过，请采购部及时 <strong>下达采购订单</strong>：</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
      <tr style="background:#f3f4f6;">
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">申请单号</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.requestNo}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">物料种数</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${params.itemCount} 种</td>
      </tr>
      ${params.urgency ? `<tr style="background:#f3f4f6;">
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">紧急程度</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;${params.urgency === 'critical' ? 'color:#dc2626;font-weight:600;' : params.urgency === 'urgent' ? 'color:#d97706;font-weight:600;' : ''}">${urgencyLabel[params.urgency] || params.urgency}</td>
      </tr>` : ''}
    </table>
    <p style="color:#2563eb;font-weight:600;">📋 请登录系统查看物料明细并创建采购订单。</p>
  `;

  return await sendEmail({
    to: params.purchaseEmails,
    subject,
    html: buildEmailTemplate({
      title: subject,
      body,
      color: "#2563eb",
    }),
    text: `采购申请 ${params.requestNo} 已审批通过，共 ${params.itemCount} 种物料，请及时下采购订单。`,
  });
}
