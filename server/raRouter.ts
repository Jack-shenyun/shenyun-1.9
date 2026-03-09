/**
 * 法规事务部 (Regulatory Affairs) tRPC 路由
 * 管理 EU MDR / US FDA / CN NMPA 法规申报项目及技术文件
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { raProjects } from "../drizzle/schema";
import { eq, desc, like, and, or } from "drizzle-orm";

// ==================== 数据库操作 ====================

async function getRaProjects(userId?: number) {
  const db = await getDb();
  return db.select().from(raProjects).orderBy(desc(raProjects.updatedAt));
}

async function getRaProjectById(id: number) {
  const db = await getDb();
  const rows = await db.select().from(raProjects).where(eq(raProjects.id, id));
  return rows[0] ?? null;
}

async function createRaProject(data: {
  name: string;
  market: "EU_MDR" | "US_FDA" | "CN_NMPA";
  productId?: number;
  ownerId?: number;
  createdBy?: number;
}) {
  const db = await getDb();
  const result = await db.insert(raProjects).values({
    name: data.name,
    market: data.market,
    productId: data.productId,
    ownerId: data.ownerId,
    createdBy: data.createdBy,
    status: "planning",
    currentStep: 1,
  });
  const id = (result as any).insertId ?? (result as any)[0]?.insertId;
  return { id: Number(id) };
}

async function updateRaProject(id: number, data: Partial<typeof raProjects.$inferInsert>) {
  const db = await getDb();
  await db.update(raProjects).set(data).where(eq(raProjects.id, id));
  return { success: true };
}

async function deleteRaProject(id: number) {
  const db = await getDb();
  await db.delete(raProjects).where(eq(raProjects.id, id));
  return { success: true };
}

// ==================== tRPC 路由 ====================

export const raRouter = router({

  // ---------- 项目管理 ----------
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getRaProjects(ctx.user?.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getRaProjectById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        market: z.enum(["EU_MDR", "US_FDA", "CN_NMPA"]).default("EU_MDR"),
        productId: z.number().optional(),
        ownerId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await createRaProject({ ...input, createdBy: ctx.user?.id });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        market: z.enum(["EU_MDR", "US_FDA", "CN_NMPA"]).optional(),
        status: z.enum(["planning", "in_progress", "submitted", "approved", "archived"]).optional(),
        currentStep: z.number().optional(),
        classification: z.any().optional(),
        technicalChars: z.any().optional(),
        applicableStandards: z.any().optional(),
        productData: z.any().optional(),
        gsprRequirements: z.any().optional(),
        documents: z.any().optional(),
        activeDocumentId: z.string().nullable().optional(),
        productId: z.number().optional(),
        ownerId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await updateRaProject(id, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deleteRaProject(input.id);
      }),
  }),

  // ---------- AI 内容生成 ----------
  ai: router({
    /** 为指定文件章节生成 AI 内容 */
    generateContent: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        documentId: z.string(),
        sectionId: z.string(),
        sectionTitle: z.string(),
        sectionTitleEn: z.string(),
        productData: z.any().optional(),
        classification: z.any().optional(),
        technicalChars: z.any().optional(),
        existingContent: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const productInfo = input.productData ? JSON.stringify(input.productData, null, 2) : "（产品信息待填写）";
        const classInfo = input.classification ? JSON.stringify(input.classification, null, 2) : "（分类信息待填写）";
        const techInfo = input.technicalChars ? JSON.stringify(input.technicalChars, null, 2) : "（技术特性待填写）";

        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `你是一位资深的欧盟医疗器械法规（MDR (EU) 2017/745）合规专家。根据产品信息为CE技术文件的特定章节生成专业合规内容。
要求：严格遵循MDR法规要求；内容基于提供的产品数据；使用专业法规术语；生成中文内容；数据不完整时用"[待补充：具体需要的信息]"占位；只填充内容，不修改框架结构；内容具体可操作，避免泛泛而谈。`,
            },
            {
              role: "user",
              content: `请为以下CE技术文件章节生成内容：
章节：${input.sectionTitle}（${input.sectionTitleEn}）
文件ID：${input.documentId} / 章节ID：${input.sectionId}

产品分类：${classInfo}
技术特性：${techInfo}
产品信息：${productInfo}

${input.existingContent ? `现有内容（请在此基础上补充完善）：\n${input.existingContent}` : "请从零开始生成该章节的完整内容。"}

直接输出章节内容，不要添加额外标题或说明。`,
            },
          ],
        });

        const content = result.choices[0]?.message?.content;
        const text = typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content.filter((c: any): c is { type: "text"; text: string } => c?.type === "text").map((c: any) => c.text).join("")
            : "";

        return { content: text, aiGenerated: true };
      }),

    /** 将中文内容翻译为英文 */
    translateToEnglish: protectedProcedure
      .input(z.object({
        content: z.string(),
        context: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "你是专业的医疗器械法规文件翻译专家。将中文内容翻译为英文，保持专业术语准确性和法规文件正式语气。直接输出翻译结果，不要添加额外说明。",
            },
            {
              role: "user",
              content: `${input.context ? `上下文：${input.context}\n\n` : ""}请翻译以下内容：\n\n${input.content}`,
            },
          ],
        });

        const content = result.choices[0]?.message?.content;
        const text = typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content.filter((c: any): c is { type: "text"; text: string } => c?.type === "text").map((c: any) => c.text).join("")
            : "";

        return { translatedContent: text };
      }),

    /** 为 GSPR 检查表生成符合性说明 */
    generateGSPRCompliance: protectedProcedure
      .input(z.object({
        clauseNumber: z.string(),
        clauseTitle: z.string(),
        clauseDescription: z.string(),
        productData: z.any().optional(),
        classification: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "你是资深MDR合规专家。根据产品信息，为GSPR检查表的特定条款生成符合性说明和证据文件引用。使用中文，内容具体且可操作。",
            },
            {
              role: "user",
              content: `GSPR条款 ${input.clauseNumber}：${input.clauseTitle}
条款要求：${input.clauseDescription}
产品信息：${JSON.stringify(input.productData, null, 2)}
分类信息：${JSON.stringify(input.classification, null, 2)}

请生成：
1. 符合性说明（说明产品如何满足该条款要求）
2. 证据文件引用（列出支持符合性的文件名称）

格式：
符合性说明：[内容]
证据文件：[文件列表]`,
            },
          ],
        });

        const content = result.choices[0]?.message?.content;
        const text = typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content.filter((c: any): c is { type: "text"; text: string } => c?.type === "text").map((c: any) => c.text).join("")
            : "";

        const complianceMatch = text.match(/符合性说明[：:]\s*([\s\S]*?)(?=证据文件|$)/);
        const evidenceMatch = text.match(/证据文件[：:]\s*([\s\S]*?)$/);

        return {
          complianceStatement: complianceMatch?.[1]?.trim() || text,
          evidenceDocuments: evidenceMatch?.[1]?.trim() || "",
          aiGenerated: true,
        };
      }),

    /** AI 智能分析产品分类 */
    analyzeClassification: protectedProcedure
      .input(z.object({
        productName: z.string(),
        intendedPurpose: z.string(),
        market: z.enum(["EU_MDR", "US_FDA", "CN_NMPA"]).default("EU_MDR"),
      }))
      .mutation(async ({ input }) => {
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "你是资深医疗器械法规专家，精通EU MDR、US FDA和中国NMPA的器械分类规则。根据产品信息给出分类建议，内容专业准确。",
            },
            {
              role: "user",
              content: `请根据以下信息，按照${input.market === "EU_MDR" ? "EU MDR (EU) 2017/745" : input.market === "US_FDA" ? "US FDA 21 CFR" : "中国NMPA医疗器械分类规则"}对该产品进行分类分析：

产品名称：${input.productName}
预期用途：${input.intendedPurpose}

请提供：
1. 建议的器械分类（如Class I/IIa/IIb/III）
2. 适用的分类规则（如Rule 1-22）
3. 分类依据说明
4. 合规路径建议

请用JSON格式返回，包含字段：deviceClass, appliedRule, ruleDescription, compliancePath, riskLevel`,
            },
          ],
        });

        const content = result.choices[0]?.message?.content;
        const text = typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content.filter((c: any): c is { type: "text"; text: string } => c?.type === "text").map((c: any) => c.text).join("")
            : "";

        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch {}
        return { rawResponse: text };
      }),
  }),
});
