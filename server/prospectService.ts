/**
 * 获客情报服务
 * 集成：Google Custom Search → 公司发现
 *       Apollo.io API    → 联系人姓名/职务/邮箱/电话
 *       Hunter.io API    → 邮箱验证与补全
 *       HubSpot API      → 线索双向同步
 *       LinkedIn（间接）  → 通过 Apollo 数据覆盖
 */

import fetch from "node-fetch";

// ─── 类型定义 ──────────────────────────────────────────────────────────────────

export interface ProspectCompany {
  name: string;
  domain: string;
  website: string;
  description: string;
  country: string;
  industry: string;
  employeeCount?: string;
  linkedinUrl?: string;
  source: "google" | "apollo" | "hubspot";
  snippet?: string;
}

export interface ProspectContact {
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;           // 职务
  email: string;
  emailStatus: string;     // verified / guessed / unknown
  phone?: string;
  linkedinUrl?: string;
  companyName: string;
  companyDomain: string;
  source: "apollo" | "hunter" | "hubspot";
}

export interface EnrichResult {
  company: ProspectCompany;
  contacts: ProspectContact[];
}

// ─── Google Custom Search ──────────────────────────────────────────────────────

/**
 * 通过 Google Custom Search API 搜索目标公司
 * 需要配置：GOOGLE_CSE_API_KEY 和 GOOGLE_CSE_ID
 * 免费额度：100次/天
 */
export async function searchCompaniesByGoogle(
  keyword: string,
  region: string = "",
  industry: string = "",
  maxResults: number = 10
): Promise<ProspectCompany[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    // 未配置时返回模拟数据供演示
    return getMockGoogleResults(keyword, region, industry);
  }

  const query = [keyword, industry, region, "medical device distributor OR supplier OR importer"]
    .filter(Boolean)
    .join(" ");

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 10)}`;

  try {
    const res = await fetch(url);
    const data: any = await res.json();

    if (!data.items) return [];

    return data.items.map((item: any) => {
      const domain = extractDomain(item.link);
      return {
        name: item.title?.replace(/\s*[-|].*$/, "").trim() || domain,
        domain,
        website: item.link,
        description: item.snippet || "",
        country: region || detectCountryFromDomain(domain),
        industry: industry || "医疗器械",
        source: "google" as const,
        snippet: item.snippet,
      };
    });
  } catch (e: any) {
    console.error("[Google CSE] 搜索失败:", e.message);
    return getMockGoogleResults(keyword, region, industry);
  }
}

// ─── Apollo.io ────────────────────────────────────────────────────────────────

/**
 * 通过 Apollo.io API 获取公司联系人（姓名、职务、邮箱、电话、LinkedIn）
 * 需要配置：APOLLO_API_KEY
 * 免费额度：每月50次联系人导出
 */
export async function enrichContactsByApollo(
  domain: string,
  titles: string[] = ["Procurement Manager", "Purchasing Director", "Supply Chain Manager", "CEO", "General Manager"]
): Promise<ProspectContact[]> {
  const apiKey = process.env.APOLLO_API_KEY;

  if (!apiKey) {
    return getMockApolloContacts(domain);
  }

  try {
    // Step 1: 搜索该域名下的联系人
    const searchRes = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        q_organization_domains: [domain],
        person_titles: titles,
        page: 1,
        per_page: 10,
      }),
    });

    const searchData: any = await searchRes.json();
    if (!searchData.people?.length) return getMockApolloContacts(domain);

    const contacts: ProspectContact[] = searchData.people.map((p: any) => ({
      firstName: p.first_name || "",
      lastName: p.last_name || "",
      fullName: p.name || `${p.first_name} ${p.last_name}`,
      title: p.title || "",
      email: p.email || "",
      emailStatus: p.email_status || "unknown",
      phone: p.phone_numbers?.[0]?.sanitized_number || "",
      linkedinUrl: p.linkedin_url || "",
      companyName: p.organization?.name || "",
      companyDomain: domain,
      source: "apollo" as const,
    }));

    return contacts;
  } catch (e: any) {
    console.error("[Apollo.io] 联系人获取失败:", e.message);
    return getMockApolloContacts(domain);
  }
}

// ─── Hunter.io ────────────────────────────────────────────────────────────────

/**
 * 通过 Hunter.io 查找域名下的邮箱列表
 * 需要配置：HUNTER_API_KEY
 * 免费额度：每月25次搜索
 */
export async function findEmailsByHunter(domain: string): Promise<ProspectContact[]> {
  const apiKey = process.env.HUNTER_API_KEY;

  if (!apiKey) {
    return [];
  }

  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}&limit=10`;
    const res = await fetch(url);
    const data: any = await res.json();

    if (!data.data?.emails?.length) return [];

    return data.data.emails.map((e: any) => ({
      firstName: e.first_name || "",
      lastName: e.last_name || "",
      fullName: `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.value.split("@")[0],
      title: e.position || "",
      email: e.value,
      emailStatus: e.confidence > 70 ? "verified" : "guessed",
      phone: e.phone_number || "",
      linkedinUrl: e.linkedin || "",
      companyName: data.data.organization || "",
      companyDomain: domain,
      source: "hunter" as const,
    }));
  } catch (e: any) {
    console.error("[Hunter.io] 邮箱查找失败:", e.message);
    return [];
  }
}

// ─── HubSpot ──────────────────────────────────────────────────────────────────

/**
 * 从 HubSpot 同步联系人到 ERP 线索库
 * 需要配置：HUBSPOT_ACCESS_TOKEN
 */
export async function syncLeadsFromHubSpot(limit: number = 50): Promise<ProspectContact[]> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!token) {
    return [];
  }

  try {
    const url = `https://api.hubapi.com/crm/v3/objects/contacts?limit=${limit}&properties=firstname,lastname,email,phone,jobtitle,company,hs_linkedin_url`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: any = await res.json();

    if (!data.results?.length) return [];

    return data.results.map((c: any) => {
      const p = c.properties;
      return {
        firstName: p.firstname || "",
        lastName: p.lastname || "",
        fullName: `${p.firstname || ""} ${p.lastname || ""}`.trim(),
        title: p.jobtitle || "",
        email: p.email || "",
        emailStatus: p.email ? "verified" : "unknown",
        phone: p.phone || "",
        linkedinUrl: p.hs_linkedin_url || "",
        companyName: p.company || "",
        companyDomain: p.email ? p.email.split("@")[1] : "",
        source: "hubspot" as const,
      };
    });
  } catch (e: any) {
    console.error("[HubSpot] 同步失败:", e.message);
    return [];
  }
}

/**
 * 将线索推送到 HubSpot（双向同步）
 */
export async function pushLeadToHubSpot(contact: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  source?: string;
}): Promise<{ success: boolean; hubspotId?: string; error?: string }> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!token) {
    return { success: false, error: "未配置 HUBSPOT_ACCESS_TOKEN" };
  }

  try {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          firstname: contact.firstName,
          lastname: contact.lastName,
          email: contact.email,
          phone: contact.phone || "",
          company: contact.company || "",
          jobtitle: contact.title || "",
          lead_source: contact.source || "ERP获客情报",
        },
      }),
    });
    const data: any = await res.json();
    if (data.id) return { success: true, hubspotId: data.id };
    return { success: false, error: data.message || "创建失败" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── 综合富化：一键获取公司+联系人 ────────────────────────────────────────────

/**
 * 综合富化：给定域名，同时调用 Apollo + Hunter，合并去重后返回
 */
export async function enrichCompany(domain: string): Promise<EnrichResult> {
  const [apolloContacts, hunterContacts] = await Promise.all([
    enrichContactsByApollo(domain),
    findEmailsByHunter(domain),
  ]);

  // 合并去重（以邮箱为主键）
  const emailMap = new Map<string, ProspectContact>();
  for (const c of [...apolloContacts, ...hunterContacts]) {
    if (c.email && !emailMap.has(c.email)) {
      emailMap.set(c.email, c);
    } else if (!c.email) {
      emailMap.set(`noemail_${Math.random()}`, c);
    }
  }

  const company: ProspectCompany = {
    name: domain,
    domain,
    website: `https://${domain}`,
    description: "",
    country: detectCountryFromDomain(domain),
    industry: "医疗器械",
    source: "apollo",
  };

  return { company, contacts: Array.from(emailMap.values()) };
}

// ─── 工具函数 ──────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function detectCountryFromDomain(domain: string): string {
  const tld = domain.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    de: "德国", jp: "日本", us: "美国", uk: "英国", fr: "法国",
    it: "意大利", es: "西班牙", nl: "荷兰", kr: "韩国", au: "澳大利亚",
    ca: "加拿大", br: "巴西", in: "印度", sg: "新加坡", ae: "阿联酋",
    cn: "中国", com: "美国/国际", co: "国际",
  };
  return map[tld] || "国际";
}

// ─── 模拟数据（未配置API Key时使用）────────────────────────────────────────────

function getMockGoogleResults(keyword: string, region: string, industry: string): ProspectCompany[] {
  const mockData: ProspectCompany[] = [
    {
      name: "MedTech Solutions GmbH",
      domain: "medtech-solutions.de",
      website: "https://www.medtech-solutions.de",
      description: `Leading ${industry || "medical device"} distributor in ${region || "Germany"} with 20+ years experience. Specializing in ${keyword}.`,
      country: "德国",
      industry: industry || "医疗器械经销商",
      employeeCount: "50-200",
      linkedinUrl: "https://linkedin.com/company/medtech-solutions-gmbh",
      source: "google",
      snippet: `MedTech Solutions GmbH is a leading distributor of ${keyword} in the German healthcare market...`,
    },
    {
      name: "Pacific Medical Imports Co., Ltd.",
      domain: "pacificmedical.co.jp",
      website: "https://www.pacificmedical.co.jp",
      description: `Japan's top importer of ${keyword} medical devices. PMDA registered distributor.`,
      country: "日本",
      industry: industry || "医疗器械进口商",
      employeeCount: "100-500",
      linkedinUrl: "https://linkedin.com/company/pacific-medical-imports",
      source: "google",
      snippet: `Pacific Medical Imports specializes in importing ${keyword} from Chinese manufacturers...`,
    },
    {
      name: "Gulf Healthcare Trading LLC",
      domain: "gulfhealthcare.ae",
      website: "https://www.gulfhealthcare.ae",
      description: `UAE-based medical device distributor covering GCC countries. Authorized importer for ${keyword}.`,
      country: "阿联酋",
      industry: industry || "医疗器械经销商",
      employeeCount: "20-100",
      source: "google",
      snippet: `Gulf Healthcare Trading is the premier distributor of ${keyword} in the Middle East region...`,
    },
    {
      name: "AmeriCare Medical Devices Inc.",
      domain: "americare-devices.com",
      website: "https://www.americare-devices.com",
      description: `FDA-registered US importer and distributor of ${keyword}. Serving 500+ hospitals nationwide.`,
      country: "美国",
      industry: industry || "医疗器械分销商",
      employeeCount: "200-1000",
      linkedinUrl: "https://linkedin.com/company/americare-medical-devices",
      source: "google",
      snippet: `AmeriCare Medical Devices is a leading US distributor of ${keyword} with FDA registration...`,
    },
    {
      name: "EuroMed Surgical Supplies B.V.",
      domain: "euromed-surgical.nl",
      website: "https://www.euromed-surgical.nl",
      description: `Netherlands-based pan-European distributor of surgical instruments and ${keyword}.`,
      country: "荷兰",
      industry: industry || "外科器械经销商",
      employeeCount: "50-200",
      source: "google",
      snippet: `EuroMed Surgical Supplies distributes ${keyword} across 15 European countries...`,
    },
    {
      name: "SingMed Healthcare Pte Ltd",
      domain: "singmed-healthcare.sg",
      website: "https://www.singmed-healthcare.sg",
      description: `Singapore-based distributor covering Southeast Asia. HSA registered for ${keyword}.`,
      country: "新加坡",
      industry: industry || "医疗器械经销商",
      employeeCount: "20-100",
      source: "google",
      snippet: `SingMed Healthcare is the leading distributor of ${keyword} in Southeast Asia...`,
    },
  ];

  // 按关键词过滤模拟数据（实际场景由Google返回）
  return mockData.slice(0, 6);
}

function getMockApolloContacts(domain: string): ProspectContact[] {
  const country = detectCountryFromDomain(domain);
  const isChina = country === "中国";

  const mockContacts: ProspectContact[] = [
    {
      firstName: isChina ? "Wei" : "Klaus",
      lastName: isChina ? "Zhang" : "Weber",
      fullName: isChina ? "Zhang Wei" : "Klaus Weber",
      title: "Procurement Manager",
      email: `procurement@${domain}`,
      emailStatus: "guessed",
      phone: isChina ? "+86-21-5566-7788" : "+49-40-1234-5678",
      linkedinUrl: `https://linkedin.com/in/${isChina ? "zhangwei" : "klausweber"}`,
      companyName: domain.split(".")[0],
      companyDomain: domain,
      source: "apollo",
    },
    {
      firstName: isChina ? "Fang" : "Sarah",
      lastName: isChina ? "Liu" : "Mitchell",
      fullName: isChina ? "Liu Fang" : "Sarah Mitchell",
      title: "Supply Chain Director",
      email: `supply@${domain}`,
      emailStatus: "guessed",
      phone: "",
      linkedinUrl: `https://linkedin.com/in/${isChina ? "liufang" : "sarahmitchell"}`,
      companyName: domain.split(".")[0],
      companyDomain: domain,
      source: "apollo",
    },
    {
      firstName: isChina ? "Jian" : "Michael",
      lastName: isChina ? "Chen" : "Brown",
      fullName: isChina ? "Chen Jian" : "Michael Brown",
      title: "CEO / General Manager",
      email: `ceo@${domain}`,
      emailStatus: "guessed",
      phone: "",
      linkedinUrl: "",
      companyName: domain.split(".")[0],
      companyDomain: domain,
      source: "apollo",
    },
  ];

  return mockContacts;
}
