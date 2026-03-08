/**
 * 微信公众号服务
 * 功能：
 * 1. 获取 Access Token（自动缓存刷新）
 * 2. 发送模板消息（待办提醒、审批结果通知）
 * 3. 处理公众号消息回调（用户扫码/发消息绑定）
 * 4. 生成绑定二维码（带参数的临时二维码）
 *
 * 环境变量：
 *   WECHAT_APPID          - 公众号 AppID
 *   WECHAT_APPSECRET      - 公众号 AppSecret
 *   WECHAT_TODO_TEMPLATE_ID     - 待办提醒模板 ID
 *   WECHAT_APPROVE_TEMPLATE_ID  - 审批结果模板 ID
 *   WECHAT_SERVER_URL     - 服务器公网 URL（用于生成跳转链接）
 */

import { getDb } from "./db";

// ============================================================
// Access Token 缓存（进程内）
// ============================================================
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }
  const appid = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_APPSECRET;
  if (!appid || !secret) {
    throw new Error("WECHAT_APPID 或 WECHAT_APPSECRET 未配置");
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
  const res = await fetch(url);
  const data = await res.json() as any;
  if (data.errcode) {
    throw new Error(`获取微信 Access Token 失败：${data.errmsg} (${data.errcode})`);
  }
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cachedToken.token;
}

// ============================================================
// 模板消息发送
// ============================================================
export interface WechatTemplateMessage {
  touser: string;           // 接收者 openid
  template_id: string;      // 模板 ID
  url?: string;             // 点击跳转 URL
  miniprogram?: { appid: string; pagepath: string };
  data: Record<string, { value: string; color?: string }>;
}

export async function sendTemplateMessage(msg: WechatTemplateMessage): Promise<{ success: boolean; msgid?: number; error?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    const data = await res.json() as any;
    if (data.errcode && data.errcode !== 0) {
      return { success: false, error: `${data.errmsg} (${data.errcode})` };
    }
    return { success: true, msgid: data.msgid };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// 待办提醒推送
// ============================================================
export async function sendTodoNotification(params: {
  openid: string;
  userId: number;
  title: string;         // 单据名称，如"销售订单 SO-2026-001"
  applicant: string;     // 申请人
  submitTime: string;    // 提交时间
  remark?: string;       // 备注
  jumpUrl?: string;      // 点击跳转地址
}): Promise<{ success: boolean; error?: string }> {
  const templateId = process.env.WECHAT_TODO_TEMPLATE_ID;
  if (!templateId) {
    return { success: false, error: "WECHAT_TODO_TEMPLATE_ID 未配置" };
  }
  const serverUrl = process.env.WECHAT_SERVER_URL || "";
  const result = await sendTemplateMessage({
    touser: params.openid,
    template_id: templateId,
    url: params.jumpUrl || `${serverUrl}/workflow/center?tab=todo`,
    data: {
      first: { value: `您有一条新的待办事项，请及时处理`, color: "#173177" },
      keyword1: { value: params.title },
      keyword2: { value: params.applicant },
      keyword3: { value: params.submitTime },
      keyword4: { value: params.remark || "请登录系统查看详情" },
      remark: { value: "点击查看详情 →", color: "#173177" },
    },
  });

  // 记录推送日志
  try {
    const db = await getDb();
    if (db) {
      await db.execute(
        `INSERT INTO wechat_notify_logs (userId, wxOpenid, templateId, title, content, bizType, status, errMsg, createdAt)
         VALUES (?, ?, ?, ?, ?, 'workflow_todo', ?, ?, NOW())`,
        [
          params.userId,
          params.openid,
          templateId,
          params.title,
          `申请人：${params.applicant}，时间：${params.submitTime}`,
          result.success ? "success" : "failed",
          result.error || null,
        ]
      );
    }
  } catch (e) {
    console.error("[WechatService] 记录推送日志失败：", e);
  }

  return result;
}

// ============================================================
// 审批结果通知
// ============================================================
export async function sendApprovalResultNotification(params: {
  openid: string;
  userId: number;
  title: string;         // 单据名称
  result: "approved" | "rejected";
  approver: string;      // 审批人
  approveTime: string;
  comment?: string;      // 审批意见
  jumpUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const templateId = process.env.WECHAT_APPROVE_TEMPLATE_ID || process.env.WECHAT_TODO_TEMPLATE_ID;
  if (!templateId) {
    return { success: false, error: "WECHAT_APPROVE_TEMPLATE_ID 未配置" };
  }
  const serverUrl = process.env.WECHAT_SERVER_URL || "";
  const resultText = params.result === "approved" ? "✅ 审批通过" : "❌ 审批拒绝";
  const result = await sendTemplateMessage({
    touser: params.openid,
    template_id: templateId,
    url: params.jumpUrl || `${serverUrl}/workflow/center?tab=created`,
    data: {
      first: { value: `您的单据审批结果已出`, color: params.result === "approved" ? "#07c160" : "#e64340" },
      keyword1: { value: params.title },
      keyword2: { value: `${resultText}（${params.approver}）` },
      keyword3: { value: params.approveTime },
      keyword4: { value: params.comment || "无" },
      remark: { value: "点击查看详情 →", color: "#173177" },
    },
  });

  try {
    const db = await getDb();
    if (db) {
      await db.execute(
        `INSERT INTO wechat_notify_logs (userId, wxOpenid, templateId, title, content, bizType, status, errMsg, createdAt)
         VALUES (?, ?, ?, ?, ?, 'approval_result', ?, ?, NOW())`,
        [
          params.userId,
          params.openid,
          templateId,
          params.title,
          `${resultText}，审批人：${params.approver}`,
          result.success ? "success" : "failed",
          result.error || null,
        ]
      );
    }
  } catch (e) {
    console.error("[WechatService] 记录推送日志失败：", e);
  }

  return result;
}

// ============================================================
// 批量推送待办（给所有有绑定的审批人）
// ============================================================
export async function notifyTodoToUsers(params: {
  userIds: number[];     // 需要通知的 ERP 用户 ID 列表
  title: string;
  applicant: string;
  submitTime: string;
  remark?: string;
  jumpUrl?: string;
}): Promise<void> {
  if (!params.userIds.length) return;
  const appid = process.env.WECHAT_APPID;
  if (!appid) return; // 未配置微信则跳过

  try {
    const db = await getDb();
    if (!db) return;
    // 查询这些用户中有微信绑定的
    const placeholders = params.userIds.map(() => "?").join(",");
    const [bindings] = await db.execute(
      `SELECT userId, wxOpenid FROM wechat_bindings WHERE userId IN (${placeholders}) AND status = 'active'`,
      params.userIds
    ) as any;

    if (!bindings || bindings.length === 0) return;

    // 并发推送（限制并发数为 5）
    const chunks: any[][] = [];
    for (let i = 0; i < bindings.length; i += 5) {
      chunks.push(bindings.slice(i, i + 5));
    }
    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map((b: any) =>
          sendTodoNotification({
            openid: b.wxOpenid,
            userId: b.userId,
            title: params.title,
            applicant: params.applicant,
            submitTime: params.submitTime,
            remark: params.remark,
            jumpUrl: params.jumpUrl,
          })
        )
      );
    }
  } catch (e) {
    console.error("[WechatService] 批量推送待办失败：", e);
  }
}

// ============================================================
// 生成绑定验证码（用户在 ERP 内生成，发给微信公众号）
// ============================================================
export function generateBindCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase(); // 6位大写字母数字
}

// ============================================================
// 生成带参数临时二维码（用户扫码后公众号推送 bindCode）
// ============================================================
export async function createBindQrCode(scene: string): Promise<{ url: string; ticket: string } | null> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expire_seconds: 600, // 10分钟有效
        action_name: "QR_STR_SCENE",
        action_info: { scene: { scene_str: scene } },
      }),
    });
    const data = await res.json() as any;
    if (data.errcode) return null;
    return {
      ticket: data.ticket,
      url: `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(data.ticket)}`,
    };
  } catch {
    return null;
  }
}

// ============================================================
// 处理公众号服务器回调（用户扫码/发消息时触发绑定）
// ============================================================
export async function handleWechatCallback(xml: string): Promise<string> {
  // 解析 XML（简单正则，无需引入 xml2js）
  const getTag = (tag: string) => {
    const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([^\\]]+)\\]\\]></${tag}>`));
    return m ? m[1] : "";
  };
  const msgType = getTag("MsgType");
  const event = getTag("Event");
  const fromUser = getTag("FromUserName");
  const toUser = getTag("ToUserName");
  const eventKey = getTag("EventKey").replace("qrscene_", "");
  const content = getTag("Content").trim().toUpperCase();

  let replyText = "";

  try {
    const db = await getDb();
    if (!db) return buildTextReply(toUser, fromUser, "系统暂时不可用，请稍后重试");

    if (msgType === "event" && (event === "SCAN" || event === "subscribe")) {
      // 扫描带参数二维码
      if (eventKey) {
        const [rows] = await db.execute(
          `SELECT wb.userId, wb.bindCode, wb.bindCodeExpiredAt, u.name
           FROM wechat_bindings wb
           LEFT JOIN users u ON u.id = wb.userId
           WHERE wb.bindCode = ? AND wb.bindCodeExpiredAt > NOW()`,
          [eventKey]
        ) as any;
        if (rows && rows.length > 0) {
          const row = rows[0];
          await db.execute(
            `UPDATE wechat_bindings SET wxOpenid = ?, status = 'active', bindCode = NULL, bindCodeExpiredAt = NULL, updatedAt = NOW() WHERE userId = ?`,
            [fromUser, row.userId]
          );
          replyText = `✅ 绑定成功！\n\n您的微信已与 ERP 账号「${row.name || "用户"}」绑定，后续有新待办事项时将第一时间通知您。`;
        } else {
          replyText = "二维码已过期，请在 ERP 系统中重新生成绑定码。";
        }
      } else {
        replyText = "欢迎关注神韵医疗 ERP 系统！\n\n请在 ERP 系统「个人设置 → 微信绑定」中生成绑定码，发送给本公众号完成绑定，即可接收待办提醒。";
      }
    } else if (msgType === "text") {
      // 用户发送文字绑定码（6位大写字母数字）
      if (/^[A-Z0-9]{6}$/.test(content)) {
        const [rows] = await db.execute(
          `SELECT wb.userId, wb.bindCode, wb.bindCodeExpiredAt, u.name
           FROM wechat_bindings wb
           LEFT JOIN users u ON u.id = wb.userId
           WHERE wb.bindCode = ? AND wb.bindCodeExpiredAt > NOW()`,
          [content]
        ) as any;
        if (rows && rows.length > 0) {
          const row = rows[0];
          await db.execute(
            `UPDATE wechat_bindings SET wxOpenid = ?, status = 'active', bindCode = NULL, bindCodeExpiredAt = NULL, updatedAt = NOW() WHERE userId = ?`,
            [fromUser, row.userId]
          );
          replyText = `✅ 绑定成功！\n\n您的微信已与 ERP 账号「${row.name || "用户"}」绑定，后续有新待办事项时将第一时间通知您。`;
        } else {
          replyText = "绑定码无效或已过期，请在 ERP 系统中重新生成。";
        }
      } else if (content === "解绑" || content === "UNBIND") {
        await db.execute(
          `UPDATE wechat_bindings SET status = 'inactive', updatedAt = NOW() WHERE wxOpenid = ?`,
          [fromUser]
        );
        replyText = "已解除绑定，您将不再收到 ERP 待办提醒。";
      } else {
        replyText = "您好！发送 6 位绑定码可完成账号绑定，发送「解绑」可取消绑定。";
      }
    }
  } catch (e) {
    console.error("[WechatService] 处理回调失败：", e);
    replyText = "处理失败，请稍后重试。";
  }

  if (!replyText) return "success";
  return buildTextReply(toUser, fromUser, replyText);
}

function buildTextReply(from: string, to: string, content: string): string {
  const ts = Math.floor(Date.now() / 1000);
  return `<xml>
  <ToUserName><![CDATA[${to}]]></ToUserName>
  <FromUserName><![CDATA[${from}]]></FromUserName>
  <CreateTime>${ts}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${content}]]></Content>
</xml>`;
}

// ============================================================
// 验证微信服务器签名
// ============================================================
export function verifyWechatSignature(token: string, timestamp: string, nonce: string, signature: string): boolean {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join("");
  const crypto = require("crypto");
  const hash = crypto.createHash("sha1").update(str).digest("hex");
  return hash === signature;
}
