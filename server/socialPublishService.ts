/**
 * 社交媒体同步发布服务
 * 支持 Facebook Page 和 LinkedIn Organization 发帖
 */

interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

// ============================================================
// Facebook Graph API 发帖
// ============================================================
export async function publishToFacebook(params: {
  title: string;
  summary: string;
  coverImage?: string;
  articleUrl?: string;
}): Promise<PublishResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return { success: false, error: "Facebook Page ID 或 Access Token 未配置" };
  }

  try {
    const message = `${params.title}\n\n${params.summary}${params.articleUrl ? `\n\n🔗 ${params.articleUrl}` : ""}`;

    // 如果有封面图片，使用 /photos 接口；否则使用 /feed 接口
    let endpoint: string;
    let body: Record<string, string>;

    if (params.coverImage) {
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      body = {
        url: params.coverImage,
        caption: message,
        access_token: accessToken,
      };
    } else {
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
      body = {
        message,
        access_token: accessToken,
        ...(params.articleUrl ? { link: params.articleUrl } : {}),
      };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json() as any;

    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message ?? "Facebook API 请求失败" };
    }

    return { success: true, postId: data.id ?? data.post_id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// LinkedIn Organization Share API 发帖
// ============================================================
export async function publishToLinkedin(params: {
  title: string;
  summary: string;
  coverImage?: string;
  articleUrl?: string;
}): Promise<PublishResult> {
  const orgId = process.env.LINKEDIN_ORGANIZATION_ID;
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

  if (!orgId || !accessToken) {
    return { success: false, error: "LinkedIn Organization ID 或 Access Token 未配置" };
  }

  try {
    const author = `urn:li:organization:${orgId}`;
    const commentary = `${params.title}\n\n${params.summary}`;

    // 构建 LinkedIn Share 请求体（使用 UGC Posts API）
    const shareBody: any = {
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: commentary },
          shareMediaCategory: params.articleUrl ? "ARTICLE" : "NONE",
          ...(params.articleUrl ? {
            media: [{
              status: "READY",
              description: { text: params.summary.slice(0, 256) },
              originalUrl: params.articleUrl,
              title: { text: params.title.slice(0, 200) },
            }],
          } : {}),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(shareBody),
    });

    const data = await res.json() as any;

    if (!res.ok) {
      return { success: false, error: data.message ?? "LinkedIn API 请求失败" };
    }

    return { success: true, postId: data.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// 官网 Webhook 推送
// ============================================================
export async function publishToWebsiteWebhook(params: {
  title: string;
  summary: string;
  content: string;
  category: string;
  coverImage?: string;
  publishedAt: string;
}): Promise<PublishResult> {
  const webhookUrl = process.env.WEBSITE_WEBHOOK_URL;
  const secretKey = process.env.WEBSITE_WEBHOOK_SECRET;

  if (!webhookUrl) {
    // 没有配置 Webhook 也算成功（仅在 ERP 内记录）
    return { success: true };
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secretKey) {
      headers["X-Webhook-Secret"] = secretKey;
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      return { success: false, error: `Webhook 响应 ${res.status}` };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
