/**
 * 邮件协同服务
 * - IMAP 收信（163企业邮箱）
 * - SMTP 发信（复用 emailService 的 nodemailer）
 * - AI 翻译 / AI 生成回复（OpenAI）
 * - 附件自动下载备案
 * - 发件人归档
 *
 * 环境变量（后期绑定真实账号时填写）：
 *   MAIL_IMAP_HOST   - IMAP 服务器，默认 imap.qiye.163.com
 *   MAIL_IMAP_PORT   - IMAP 端口，默认 993
 *   MAIL_SMTP_HOST   - SMTP 服务器，默认 smtp.qiye.163.com
 *   MAIL_SMTP_PORT   - SMTP 端口，默认 465
 *   MAIL_USER        - 邮箱账号
 *   MAIL_PASS        - 邮箱授权码
 *   MAIL_FROM_NAME   - 发件人显示名称，默认 GTP-ERP
 *   ATTACHMENT_DIR   - 附件存储目录，默认 ./uploads/email-attachments
 */

import Imap from "imap";
import { simpleParser, ParsedMail, Attachment } from "mailparser";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";
import { getDb, ensureEmailTables } from "./db";
import { emails, emailAttachments, emailContacts } from "../drizzle/schema";
import { eq, desc, like, and, or, inArray } from "drizzle-orm";

// ==================== 配置 ====================

function getMailConfig() {
  return {
    imapHost: process.env.MAIL_IMAP_HOST || "imap.qiye.163.com",
    imapPort: parseInt(process.env.MAIL_IMAP_PORT || "993"),
    smtpHost: process.env.MAIL_SMTP_HOST || "smtp.qiye.163.com",
    smtpPort: parseInt(process.env.MAIL_SMTP_PORT || "465"),
    user: process.env.MAIL_USER || "",
    pass: process.env.MAIL_PASS || "",
    fromName: process.env.MAIL_FROM_NAME || "GTP-ERP",
    attachmentDir: process.env.ATTACHMENT_DIR || "./uploads/email-attachments",
  };
}

function isMailConfigured(): boolean {
  const cfg = getMailConfig();
  return !!(cfg.user && cfg.pass);
}

function ensureAttachmentDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ==================== IMAP 收信 ====================

export async function syncInbox(limit = 50): Promise<{ synced: number; errors: string[] }> {
  if (!isMailConfigured()) {
    return { synced: 0, errors: ["邮箱未配置，请设置 MAIL_USER 和 MAIL_PASS 环境变量"] };
  }

  const cfg = getMailConfig();
  const db = await getDb();
  if (!db) return { synced: 0, errors: ["数据库连接不可用"] };
  await ensureEmailTables(db);

  return new Promise((resolve) => {
    const imap = new Imap({
      user: cfg.user,
      password: cfg.pass,
      host: cfg.imapHost,
      port: cfg.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 15000,
      authTimeout: 10000,
    });

    const errors: string[] = [];
    let synced = 0;

    imap.once("error", (err: Error) => {
      resolve({ synced, errors: [err.message] });
    });

    imap.once("ready", () => {
      imap.openBox("INBOX", false, async (err, box) => {
        if (err) {
          imap.end();
          return resolve({ synced, errors: [err.message] });
        }

        const total = box.messages.total;
        if (total === 0) {
          imap.end();
          return resolve({ synced: 0, errors: [] });
        }

        const start = Math.max(1, total - limit + 1);
        const fetch = imap.seq.fetch(`${start}:${total}`, {
          bodies: "",
          struct: true,
        });

        const parsePromises: Promise<void>[] = [];

        fetch.on("message", (msg, seqno) => {
          let uid = seqno;
          const p = new Promise<void>((res) => {
            let rawBuffer = "";
            msg.on("body", (stream) => {
              stream.on("data", (chunk: Buffer) => {
                rawBuffer += chunk.toString("utf8");
              });
            });
            msg.once("attributes", (attrs) => {
              uid = attrs.uid || seqno;
            });
            msg.once("end", async () => {
              try {
                const parsed = await simpleParser(rawBuffer);
                await saveEmail(db, parsed, uid, "inbox", cfg.attachmentDir);
                synced++;
              } catch (e: any) {
                errors.push(e.message);
              }
              res();
            });
          });
          parsePromises.push(p);
        });

        fetch.once("error", (err: Error) => errors.push(err.message));
        fetch.once("end", async () => {
          await Promise.all(parsePromises);
          imap.end();
          resolve({ synced, errors });
        });
      });
    });

    imap.connect();
  });
}

async function saveEmail(db: any, parsed: ParsedMail, uid: number, folder: string, attachmentDir: string) {
  const messageId = parsed.messageId || `uid-${uid}-${Date.now()}`;

  // 检查是否已存在
  const existing = await db.select({ id: emails.id })
    .from(emails)
    .where(eq(emails.messageId, messageId))
    .limit(1);
  if (existing.length > 0) return;

  const fromAddress = parsed.from?.value?.[0]?.address || "";
  const fromName = parsed.from?.value?.[0]?.name || "";
  const toAddress = parsed.to
    ? (Array.isArray(parsed.to.value)
      ? parsed.to.value.map((a: any) => a.address).join(",")
      : "")
    : "";
  const hasAttachment = (parsed.attachments?.length || 0) > 0;

  const [result] = await db.insert(emails).values({
    messageId,
    folder,
    subject: parsed.subject || "(无主题)",
    fromAddress,
    fromName,
    toAddress,
    ccAddress: parsed.cc
      ? (Array.isArray(parsed.cc.value)
        ? parsed.cc.value.map((a: any) => a.address).join(",")
        : "")
      : "",
    bodyHtml: parsed.html || "",
    bodyText: parsed.text || "",
    isRead: false,
    isStarred: false,
    hasAttachment,
    receivedAt: parsed.date || new Date(),
    uid,
  } as any);

  const emailId = (result as any).insertId;

  // 处理附件
  if (hasAttachment && parsed.attachments) {
    ensureAttachmentDir(attachmentDir);
    for (const att of parsed.attachments) {
      await saveAttachment(db, emailId, att, attachmentDir);
    }
  }

  // 更新联系人归档
  if (fromAddress) {
    await upsertContact(db, fromAddress, fromName);
  }
}

async function saveAttachment(db: any, emailId: number, att: Attachment, attachmentDir: string) {
  const filename = att.filename || `attachment-${Date.now()}`;
  const safeName = filename.replace(/[^a-zA-Z0-9.\-_\u4e00-\u9fa5]/g, "_");
  const filePath = path.join(attachmentDir, `${emailId}_${safeName}`);

  try {
    if (att.content) {
      fs.writeFileSync(filePath, att.content);
    }
    await db.insert(emailAttachments).values({
      emailId,
      filename,
      mimeType: att.contentType || "application/octet-stream",
      size: att.size || (att.content?.length ?? 0),
      storagePath: filePath,
      downloadedAt: new Date(),
    } as any);
  } catch (e) {
    console.error("[Mail] 附件保存失败:", e);
  }
}

async function upsertContact(db: any, emailAddress: string, displayName: string) {
  try {
    const existing = await db.select().from(emailContacts)
      .where(eq(emailContacts.emailAddress, emailAddress))
      .limit(1);

    if (existing.length > 0) {
      await db.update(emailContacts)
        .set({
          emailCount: existing[0].emailCount + 1,
          lastEmailAt: new Date(),
          displayName: displayName || existing[0].displayName,
        } as any)
        .where(eq(emailContacts.emailAddress, emailAddress));
    } else {
      await db.insert(emailContacts).values({
        emailAddress,
        displayName,
        emailCount: 1,
        lastEmailAt: new Date(),
      } as any);
    }
  } catch (e) {
    console.error("[Mail] 联系人归档失败:", e);
  }
}

// ==================== 邮件列表查询 ====================

export async function getEmails(params: {
  folder?: string;
  search?: string;
  contactAddress?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { list: [], total: 0 };
  await ensureEmailTables(db);

  const { folder = "inbox", search, contactAddress, limit = 50, offset = 0 } = params;

  const conditions: any[] = [eq(emails.folder, folder as any)];
  if (search) {
    conditions.push(
      or(
        like(emails.subject, `%${search}%`),
        like(emails.fromAddress, `%${search}%`),
        like(emails.fromName, `%${search}%`),
      )
    );
  }
  if (contactAddress) {
    conditions.push(eq(emails.fromAddress, contactAddress));
  }

  const list = await db.select().from(emails)
    .where(and(...conditions))
    .orderBy(desc(emails.receivedAt))
    .limit(limit)
    .offset(offset);

  return { list };
}

export async function getEmailById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [email] = await db.select().from(emails).where(eq(emails.id, id));
  if (!email) return null;

  const attachmentList = await db.select().from(emailAttachments)
    .where(eq(emailAttachments.emailId, id));

  // 标记为已读
  if (!email.isRead) {
    await db.update(emails).set({ isRead: true } as any).where(eq(emails.id, id));
  }

  return { ...email, attachments: attachmentList };
}

export async function markEmailRead(id: number, isRead: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(emails).set({ isRead } as any).where(eq(emails.id, id));
}

export async function markEmailStarred(id: number, isStarred: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(emails).set({ isStarred } as any).where(eq(emails.id, id));
}

export async function deleteEmail(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(emails).set({ folder: "trash" } as any).where(eq(emails.id, id));
}

// ==================== 草稿保存 ====================

export async function saveDraft(data: {
  id?: number;
  subject?: string;
  toAddress?: string;
  ccAddress?: string;
  bodyHtml?: string;
  bodyText?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  if (data.id) {
    await db.update(emails).set({
      subject: data.subject,
      toAddress: data.toAddress,
      ccAddress: data.ccAddress,
      bodyHtml: data.bodyHtml,
      bodyText: data.bodyText,
    } as any).where(eq(emails.id, data.id));
    return data.id;
  } else {
    const cfg = getMailConfig();
    const [result] = await db.insert(emails).values({
      folder: "draft",
      subject: data.subject || "(草稿)",
      fromAddress: cfg.user,
      fromName: cfg.fromName,
      toAddress: data.toAddress || "",
      ccAddress: data.ccAddress || "",
      bodyHtml: data.bodyHtml || "",
      bodyText: data.bodyText || "",
      isRead: true,
      isStarred: false,
      hasAttachment: false,
    } as any);
    return (result as any).insertId;
  }
}

// ==================== SMTP 发信 ====================

export async function sendMail(params: {
  to: string;
  cc?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  draftId?: number;
}): Promise<{ success: boolean; error?: string }> {
  if (!isMailConfigured()) {
    return { success: false, error: "邮箱未配置，请设置 MAIL_USER 和 MAIL_PASS 环境变量" };
  }

  const cfg = getMailConfig();

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      secure: true,
      auth: { user: cfg.user, pass: cfg.pass },
    });

    await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.user}>`,
      to: params.to,
      cc: params.cc,
      subject: params.subject,
      html: params.bodyHtml,
      text: params.bodyText,
    });

    // 保存到已发送
    const db = await getDb();
    if (db) {
      if (params.draftId) {
        await db.update(emails).set({
          folder: "sent",
          sentAt: new Date(),
          toAddress: params.to,
          ccAddress: params.cc || "",
          subject: params.subject,
          bodyHtml: params.bodyHtml,
        } as any).where(eq(emails.id, params.draftId));
      } else {
        await db.insert(emails).values({
          folder: "sent",
          subject: params.subject,
          fromAddress: cfg.user,
          fromName: cfg.fromName,
          toAddress: params.to,
          ccAddress: params.cc || "",
          bodyHtml: params.bodyHtml,
          bodyText: params.bodyText || "",
          isRead: true,
          isStarred: false,
          hasAttachment: false,
          sentAt: new Date(),
        } as any);
      }
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ==================== AI 客户端工厂 ====================

/**
 * 使用智谱 GLM-4-Flash（免费且已激活）
 * 兼容 OpenAI SDK
 */
function getAiClient(): { client: OpenAI; model: string } {
  const zhipuKey = process.env.ZHIPU_API_KEY || "b2427e1eaec24e1dbfc6b08c82e6d693.zc0XAEJ1g7iStgYY";
  return {
    client: new OpenAI({
      apiKey: zhipuKey,
      baseURL: "https://open.bigmodel.cn/api/paas/v4",
    }),
    model: "glm-4-flash",
  };
}

function htmlToPlainTextPreserveLayout(html: string | null | undefined): string {
  const source = String(html || "");
  if (!source.trim()) return "";
  return source
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ==================== AI 翻译 ====================

export async function translateEmail(emailId: number, targetLang = "中文"): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const [email] = await db.select().from(emails).where(eq(emails.id, emailId));
  if (!email) throw new Error("邮件不存在");

  const content =
    email.bodyText || htmlToPlainTextPreserveLayout(email.bodyHtml) || "";
  if (!content.trim()) return "(邮件正文为空)";

  const { client, model } = getAiClient();
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `你是一个专业的商务邮件翻译助手。请将以下邮件内容翻译成${targetLang}，并严格保留原文排版结构。
要求：
1. 保留原有段落、空行、换行、编号、项目符号、称呼、签名和引用层级
2. 如果原文有列表、条款、缩进或分段，请在译文中按相同结构呈现
3. 不要合并段落，不要重写格式，不要自行补充说明
4. 只输出翻译结果`,
      },
      { role: "user", content: content.substring(0, 4000) },
    ],
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content || "(翻译失败)";
}

// ==================== AI 生成回复 ====================

export async function generateReply(emailId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("数据库连接不可用");

  const [email] = await db.select().from(emails).where(eq(emails.id, emailId));
  if (!email) throw new Error("邮件不存在");

  const content = email.bodyText || email.bodyHtml?.replace(/<[^>]+>/g, "") || "";
  const subject = email.subject || "";
  const fromName = email.fromName || email.fromAddress || "";

  const { client, model } = getAiClient();
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `你是一个专业的商务邮件助手。请根据以下收到的邮件内容，生成一封专业、礼貌的回复邮件草稿。
要求：
1. 使用中文回复（除非原邮件是英文，则用英文回复）
2. 格式规范，包含称呼、正文、结尾敬语和署名占位符
3. 内容简洁专业，针对邮件主题给出合理回复
4. 只输出回复邮件正文，不要添加任何说明`,
      },
      {
        role: "user",
        content: `发件人：${fromName}\n主题：${subject}\n\n邮件内容：\n${content.substring(0, 3000)}`,
      },
    ],
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || "(生成失败)";
}

// ==================== 联系人归档查询 ====================

export async function getEmailContacts(params: { search?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];

  const { search, limit = 50, offset = 0 } = params;
  const conditions: any[] = [];
  if (search) {
    conditions.push(
      or(
        like(emailContacts.emailAddress, `%${search}%`),
        like(emailContacts.displayName, `%${search}%`),
      )
    );
  }

  return await db.select().from(emailContacts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(emailContacts.lastEmailAt))
    .limit(limit)
    .offset(offset);
}
