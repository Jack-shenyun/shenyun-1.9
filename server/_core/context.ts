import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  ensureUsersExtendedColumns,
  getDb,
  resolveUserForCompanyScope,
} from "../db";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1. 尝试从 Cookie 中读取本地登录信息 (用于演示和本地用户名密码模式)
  const cookieValue = opts.req.cookies?.[COOKIE_NAME];
  if (cookieValue) {
    try {
      // 在实际生产中应该使用 JWT 签名校验，这里为了演示和快速切换，先尝试解析 JSON
      // 兼容可能存在的加密格式
      if (cookieValue.startsWith('{')) {
        user = JSON.parse(cookieValue);
        const cookieUserId = Number((user as any)?.id || 0);
        if (cookieUserId > 0) {
          const db = await getDb();
          if (db) {
            await ensureUsersExtendedColumns(db);
            const [dbUser] = await db.select().from(users).where(eq(users.id, cookieUserId)).limit(1);
            if (dbUser) {
              const currentCompanyId = Number((user as any)?.companyId || 0) || Number((dbUser as any)?.companyId || 0);
              user = (await resolveUserForCompanyScope(
                dbUser as any,
                currentCompanyId
              )) as any;
            }
          }
        }
      }
    } catch (e) {
      // 解析失败则忽略
    }
  }

  // 1.5. 本地用户名密码模式下，兼容从前端 header 透传本地登录用户。
  if (!user && !ENV.oAuthServerUrl) {
    const headerValue = opts.req.headers["x-local-auth-user"];
    const rawHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (rawHeader) {
      try {
        const decodedHeader = Buffer.from(rawHeader, "base64").toString("utf-8");
        const parsed = JSON.parse(decodedHeader);
        const userId = Number(parsed?.id);
        if (Number.isFinite(userId) && userId > 0) {
          const db = await getDb();
          if (db) {
            await ensureUsersExtendedColumns(db);
            const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
            user = (await resolveUserForCompanyScope(
              dbUser as any,
              Number(parsed?.companyId || 0) || Number((dbUser as any)?.companyId || 0)
            )) as any;
          }
        }
      } catch {
        // ignore invalid local auth header
      }
    }
  }

  // 2. 如果 Cookie 中没有，且有 OAuth 配置，则尝试 OAuth 校验
  if (!user && ENV.oAuthServerUrl) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
