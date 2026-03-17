import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Globe,
  Lock,
  LockOpen,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getAllDocuments } from "@/data/ra/mdrTemplates";
import type { DocumentSection } from "@/data/ra/types";

type ChapterStatus = "draft" | "confirmed" | "frozen";
type RightPaneMode = "preview" | "mdr";

type WorkspaceSection = DocumentSection & {
  status?: ChapterStatus;
  isConfirmed?: boolean;
  isFrozen?: boolean;
  canBeReferencedByNext?: boolean;
  mdrContent?: string;
  requirementOutline?: string;
};

type ChapterNode = {
  id: string;
  chapterNo: string;
  titleZh: string;
  titleEn: string;
  level: number;
  status: ChapterStatus;
  canBeReferencedByNext: boolean;
  children: ChapterNode[];
};

const SECTION_ORDER = [
  "dd_scope",
  "dd_product_name",
  "dd_intended_purpose",
  "dd_target_population",
  "dd_contraindications",
  "dd_working_principle",
  "dd_components",
  "dd_materials",
  "dd_variants",
  "dd_classification",
  "dd_packaging",
  "dd_predecessor",
  "dd_specifications",
] as const;

const SECTION_NO_MAP: Record<string, string> = {
  dd_scope: "0",
  dd_product_name: "1.1",
  dd_intended_purpose: "1.2",
  dd_target_population: "1.4",
  dd_contraindications: "1.5",
  dd_working_principle: "1.6",
  dd_components: "1.7",
  dd_materials: "1.8",
  dd_variants: "1.9",
  dd_classification: "1.10",
  dd_packaging: "1.11",
  dd_predecessor: "1.12",
  dd_specifications: "2.2",
};

const SECTION_META: Record<string, { hint: string; regulation: string; attachment: string; mdr: string }> = {
  dd_scope: {
    hint: "请说明本文件的适用范围、目的以及与项目的对应关系。",
    regulation: "文件范围与目的应明确技术文档覆盖边界。",
    attachment: "可关联项目范围说明、申报计划。",
    mdr: "MDR Annex II, Section 1.1 要求技术文档识别器械及其文档覆盖范围。",
  },
  dd_product_name: {
    hint: "请输入标准产品名称。",
    regulation: "产品名称应与标签、注册资料、主数据一致。",
    attachment: "无需附件，可后续联动产品主数据。",
    mdr: "产品名称需与技术文档、标签及注册数据库中的器械识别信息保持一致。",
  },
  dd_intended_purpose: {
    hint: "请描述器械用途、适应症、使用场景与预期使用者。",
    regulation: "内容应符合 MDR Annex II Section 1 的器械描述要求。",
    attachment: "可关联产品图片、用途说明书。",
    mdr: "预期用途、适应症与使用者描述应支撑后续分类、风险和临床评价。",
  },
  dd_target_population: {
    hint: "请说明目标患者人群与预期使用者。",
    regulation: "患者与使用者范围需与预期用途一致。",
    attachment: "可关联临床适用性说明。",
    mdr: "目标患者人群应与器械适应症、使用环境和使用者要求形成闭环。",
  },
  dd_contraindications: {
    hint: "请列出禁忌症、限制条件和不适用情况。",
    regulation: "禁忌症应与风险分析、临床评价一致。",
    attachment: "建议关联风险管理或临床资料。",
    mdr: "禁忌症与使用限制应反映已知风险、临床限制和医疗判断边界。",
  },
  dd_working_principle: {
    hint: "请说明产品工作原理和核心功能逻辑。",
    regulation: "工作原理应支撑后续性能和风险分析。",
    attachment: "可关联原理图、流程图。",
    mdr: "工作原理说明应与设计输入输出、关键性能和风险控制保持一致。",
  },
  dd_components: {
    hint: "请列出主要组件、配件及组成关系。",
    regulation: "组件描述应与 BOM、图纸、标签一致。",
    attachment: "建议关联图纸、BOM、部件清单。",
    mdr: "组件及配件说明应支持器械定义、配置识别和标签一致性审查。",
  },
  dd_materials: {
    hint: "请说明主要材料、接触部位及关键材料特性。",
    regulation: "材料说明应与生物相容性和验证资料一致。",
    attachment: "建议关联材料规格书、供应商资料。",
    mdr: "材料信息应支撑生物相容性、灭菌、清洁和长期稳定性相关论证。",
  },
  dd_variants: {
    hint: "请说明产品变体、型号差异和配置关系。",
    regulation: "变体配置应与 UDI、型号、图纸一致。",
    attachment: "建议关联型号配置表。",
    mdr: "器械变体和配置关系应支持技术文档识别、UDI 管理和适用性判断。",
  },
  dd_classification: {
    hint: "请填写器械分类、适用规则和判定依据。",
    regulation: "分类必须有 Annex VIII 规则支撑。",
    attachment: "建议关联分类判定记录。",
    mdr: "器械分类应依据 MDR Annex VIII 规则，并写明判定逻辑与引用条款。",
  },
  dd_packaging: {
    hint: "请描述包装层级、包装方式和包装材料。",
    regulation: "包装描述应与标签和运输验证资料一致。",
    attachment: "建议关联包装图样、运输测试。",
    mdr: "包装描述应支撑标签、运输稳定性和无菌屏障的相关证明。",
  },
  dd_predecessor: {
    hint: "请说明前代产品、等效器械或对比关系。",
    regulation: "前代或等效说明应服务于技术与临床论证。",
    attachment: "可关联等效性分析资料。",
    mdr: "前代或等效器械关系可为技术比较、临床评价和变更说明提供依据。",
  },
  dd_specifications: {
    hint: "请填写尺寸、规格、性能参数与技术指标。",
    regulation: "技术规格应与验证和检验记录闭环。",
    attachment: "建议关联规格书、检验报告、图纸。",
    mdr: "技术规格和性能要求应与验证、检验和声明性能保持一致。",
  },
};

const SECTION_HEADINGS: Record<string, string[]> = {
  dd_scope: ["文件目的", "文件适用范围", "文档与项目对应关系"],
  dd_product_name: ["产品名称", "通用名称/商品名", "产品标识信息", "与标签和注册资料一致性"],
  dd_intended_purpose: ["预期用途", "适应症", "使用场景", "预期使用者", "使用限制"],
  dd_target_population: ["目标患者人群", "纳入边界", "预期使用者", "适用环境"],
  dd_contraindications: ["禁忌症", "不适用人群", "使用限制", "风险提示"],
  dd_working_principle: ["工作原理", "核心功能逻辑", "关键作用机制"],
  dd_components: ["主要组件", "配件", "组成关系", "标准配置/可选配置"],
  dd_materials: ["主要材料", "接触部位", "关键材料特性", "材料一致性说明"],
  dd_variants: ["型号/规格变体", "配置差异", "共用部件", "UDI/型号对应关系"],
  dd_classification: ["分类结果", "适用规则", "判定依据", "法规条款引用"],
  dd_packaging: ["包装层级", "包装材料", "标签承载方式", "运输/储存相关要求"],
  dd_predecessor: ["前代产品", "等效器械", "差异说明", "对比关系"],
  dd_specifications: ["外观", "尺寸规格", "关键性能参数", "技术指标", "与验证资料一致性"],
};

const PARENT_CHAPTERS = [
  { chapterNo: "1", titleZh: "器械描述与规范", titleEn: "Device Description and Specification" },
  { chapterNo: "2", titleZh: "性能与规格", titleEn: "Performance and Specifications" },
] as const;

function getStatusMeta(status: ChapterStatus) {
  if (status === "confirmed") return { label: "已确认", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (status === "frozen") return { label: "暂不变", className: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "未确认", className: "bg-slate-100 text-slate-600 border-slate-200" };
}

function looksLikeChinese(text: string) {
  return /[\u4e00-\u9fff]/.test(text);
}

function translateProductNameZhToEn(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.includes("引流管")) return "Drainage Tube";
  if (normalized.includes("胃校准管")) return "Gastric Calibration Tube";
  if (normalized.includes("胃内球囊")) return "Intragastric Balloon";
  return normalized;
}

function deriveStatus(section: WorkspaceSection): ChapterStatus {
  if (section.status) return section.status;
  if (section.isConfirmed) return "confirmed";
  if (section.isFrozen) return "frozen";
  return "draft";
}

function syncPreviewProductName(content: string, previousZh: string, previousEn: string, nextEn: string) {
  let next = content;
  if (previousZh) next = next.split(previousZh).join(nextEn);
  if (previousEn) next = next.split(previousEn).join(nextEn);
  return next;
}

function extractRequirementHeadings(outline: string) {
  return outline
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s*/.test(line))
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

function buildChapterTree(sections: WorkspaceSection[]): ChapterNode[] {
  const top = sections
    .filter((section) => SECTION_NO_MAP[section.id] === "0")
    .map((section) => ({
      id: section.id,
      chapterNo: "0",
      titleZh: section.title,
      titleEn: section.titleEn,
      level: 1,
      status: deriveStatus(section),
      canBeReferencedByNext: Boolean(section.canBeReferencedByNext),
      children: [],
    }));

  const grouped = PARENT_CHAPTERS.map((parent) => {
    const children = sections
      .filter((section) => (SECTION_NO_MAP[section.id] || "").startsWith(`${parent.chapterNo}.`))
      .map((section) => ({
        id: section.id,
        chapterNo: SECTION_NO_MAP[section.id] || "",
        titleZh: section.title,
        titleEn: section.titleEn,
        level: 2,
        status: deriveStatus(section),
        canBeReferencedByNext: Boolean(section.canBeReferencedByNext),
        children: [],
      }));

    return {
      id: `chapter-${parent.chapterNo}`,
      chapterNo: parent.chapterNo,
      titleZh: parent.titleZh,
      titleEn: parent.titleEn,
      level: 1,
      status: children.every((child) => child.status === "confirmed") ? "confirmed" : children.some((child) => child.status === "frozen") ? "frozen" : "draft",
      canBeReferencedByNext: children.some((child) => child.canBeReferencedByNext),
      children,
    } as ChapterNode;
  }).filter((group) => group.children.length > 0);

  return [...top, ...grouped];
}

export default function CEDocumentWorkspacePage() {
  const [, navigate] = useLocation();
  const generateMutation = trpc.ra.ai.generateContent.useMutation();
  const translateMutation = trpc.ra.ai.translateToEnglish.useMutation();
  const initialDoc = useMemo(() => {
    const doc = getAllDocuments().find((item) => item.id === "device_description");
    if (!doc) return [];
    return doc.sections.map((section) => ({
      ...section,
      status: "draft" as ChapterStatus,
      isConfirmed: false,
      isFrozen: false,
      canBeReferencedByNext: false,
      requirementOutline: "",
      mdrContent: "",
    }));
  }, []);

  const [sections, setSections] = useState<WorkspaceSection[]>(initialDoc);
  const [activeChapterId, setActiveChapterId] = useState("dd_product_name");
  const [rightPaneMode, setRightPaneMode] = useState<RightPaneMode>("preview");
  const [aiNotes, setAiNotes] = useState<string[]>([
    "当前页面是独立版 CE 工作台，不联动 ERP 或数据库。",
    "章节树、中文编辑、英文预览/MDR 和状态语义都在本页本地状态中验证。",
    "后续需要联动时，再把这套结构接回 ERP 和 itdb。",
  ]);

  const middlePaneRef = useRef<HTMLDivElement | null>(null);
  const middleSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const syncingRef = useRef(false);
  const previousProductNameRef = useRef<{ zh: string; en: string }>({
    zh: initialDoc.find((section) => section.id === "dd_product_name")?.content || "引流管",
    en: "Drainage Tube",
  });

  const chapterTree = useMemo(() => buildChapterTree(sections), [sections]);
  const savedSections = sections.filter((section) => section.content.trim()).length;
  const translatedSections = sections.filter((section) => section.contentEn.trim()).length;
  const referenceableSections = sections.filter((section) => section.canBeReferencedByNext).length;
  const overallProgress = sections.length ? Math.round((referenceableSections / sections.length) * 100) : 0;

  const resolveProductNameZh = useCallback(() => {
    return sections.find((section) => section.id === "dd_product_name")?.content?.trim() || "引流管";
  }, [sections]);

  const resolveProductNameEn = useCallback(() => {
    const current = sections.find((section) => section.id === "dd_product_name");
    const contentEn = current?.contentEn?.trim() || "";
    if (contentEn && !looksLikeChinese(contentEn)) return contentEn;
    return translateProductNameZhToEn(current?.content || "") || "Drainage Tube";
  }, [sections]);

  const getReferenceSections = useCallback((sectionId: string) => {
    const idx = sections.findIndex((section) => section.id === sectionId);
    if (idx === -1) return [];
    return sections.slice(0, idx).filter((section) => section.canBeReferencedByNext);
  }, [sections]);

  const updateSection = useCallback((sectionId: string, patch: Partial<WorkspaceSection>) => {
    setSections((prev) => prev.map((section) => section.id === sectionId ? { ...section, ...patch } : section));
  }, []);

  const translateSection = useCallback((section: WorkspaceSection) => {
    const productNameEn = resolveProductNameEn();
    if (section.id === "dd_product_name") return productNameEn;
    if (section.id === "dd_scope") return "This section defines the scope and purpose of the CE technical documentation for the device.";
    if (section.id === "dd_intended_purpose") return `${productNameEn} is intended for the relevant clinical procedure and shall be used by qualified healthcare professionals.`;
    if (section.id === "dd_target_population") return `The target patient population and intended users of ${productNameEn} shall be defined in line with the intended purpose and conditions of use.`;
    if (section.id === "dd_contraindications") return `The contraindications of ${productNameEn} shall be described based on known risks, clinical limitations, and medical judgment.`;
    if (section.id === "dd_specifications") return `The technical specifications of ${productNameEn} include dimensions, performance characteristics, and other applicable technical indicators.`;
    return section.contentEn || `${productNameEn} is described in this section.`;
  }, [resolveProductNameEn]);

  const buildRequirementOutline = useCallback((section: WorkspaceSection) => {
    const headings = SECTION_HEADINGS[section.id] || [];
    return [
      `章节：${SECTION_NO_MAP[section.id] || "-"} ${section.title}`,
      "",
      "法规要求摘要",
      SECTION_META[section.id]?.mdr || "当前章节法规要求待补充。",
      "",
      "建议填写要点",
      ...(headings.length ? headings.map((heading, index) => `${index + 1}. ${heading}`) : ["1. 待补充章节要点"]),
    ].join("\n");
  }, []);

  const buildChineseDraft = useCallback((section: WorkspaceSection) => {
    const productNameZh = resolveProductNameZh();
    const headings = extractRequirementHeadings(section.requirementOutline || "");
    const effectiveHeadings = headings.length > 0 ? headings : (SECTION_HEADINGS[section.id] || []);

    if (section.id === "dd_product_name") {
      return [
        "1. 产品名称",
        `${productNameZh}`,
        "",
        "2. 通用名称/商品名",
        `${productNameZh}`,
        "",
        "3. 产品标识信息",
        `${productNameZh}的器械识别信息应与标签、技术文档和注册资料保持一致。`,
        "",
        "4. 与标签和注册资料一致性",
        `应确认${productNameZh}在技术文档、标签及注册数据库中的名称和识别字段一致。`,
      ].join("\n");
    }

    const intro = `以下内容基于产品名称“${productNameZh}”以及本章已整理的法规要求生成：`;
    const body = effectiveHeadings.map((heading, index) => {
      if (heading.includes("预期用途")) {
        return `${index + 1}. ${heading}\n${productNameZh}的预期用途应明确其在临床操作中的作用、应用目的以及与适应症相关的使用边界。`;
      }
      if (heading.includes("适应症")) {
        return `${index + 1}. ${heading}\n${productNameZh}的适应症应结合目标临床场景、适用患者情况和预期治疗或支持目的进行描述。`;
      }
      if (heading.includes("使用场景")) {
        return `${index + 1}. ${heading}\n${productNameZh}应说明其适用的临床使用场景、操作环境以及与术式或流程相关的应用条件。`;
      }
      if (heading.includes("预期使用者")) {
        return `${index + 1}. ${heading}\n${productNameZh}的预期使用者应为经过培训并具备相应资质的医疗专业人员。`;
      }
      if (heading.includes("使用限制")) {
        return `${index + 1}. ${heading}\n${productNameZh}的使用限制应结合风险控制要求、适应症边界和不适用情形进行说明。`;
      }
      if (heading.includes("目标患者")) {
        return `${index + 1}. ${heading}\n${productNameZh}的目标患者人群应与预期用途和适应症保持一致，并说明纳入边界。`;
      }
      if (heading.includes("禁忌")) {
        return `${index + 1}. ${heading}\n${productNameZh}的禁忌症应基于已知风险、临床限制和不适用患者条件进行描述。`;
      }
      if (heading.includes("工作原理")) {
        return `${index + 1}. ${heading}\n${productNameZh}应说明其核心作用机制、功能实现路径以及与预期用途的对应关系。`;
      }
      if (heading.includes("组件") || heading.includes("配件")) {
        return `${index + 1}. ${heading}\n${productNameZh}的主要组件、配件及其组成关系应结合结构设计和配置要求进行描述。`;
      }
      if (heading.includes("材料")) {
        return `${index + 1}. ${heading}\n${productNameZh}的材料说明应包括关键材料、接触部位及与验证资料一致性的说明。`;
      }
      if (heading.includes("分类")) {
        return `${index + 1}. ${heading}\n${productNameZh}的器械分类应依据适用法规规则给出分类结果、规则依据和判断逻辑。`;
      }
      if (heading.includes("技术指标") || heading.includes("性能") || heading.includes("规格")) {
        return `${index + 1}. ${heading}\n${productNameZh}应明确外观、尺寸、关键性能参数及其他适用技术规格，并与验证资料保持一致。`;
      }
      return `${index + 1}. ${heading}\n请结合${productNameZh}的产品特性、法规要求及技术资料补充本项内容。`;
    }).join("\n\n");

    return `${intro}\n\n${body}`;
  }, [resolveProductNameZh]);

  const buildMdrContent = useCallback((section: WorkspaceSection) => {
    const refs = getReferenceSections(section.id);
    const summary = refs.length ? `\n\n可引用前文章节：${refs.map((ref) => `${SECTION_NO_MAP[ref.id] || ""} ${ref.title}`).join(" / ")}` : "";
    return `${SECTION_META[section.id]?.mdr || "当前章节的 MDR 依据待补充。"}${summary}`;
  }, [getReferenceSections]);

  const scrollToChapter = useCallback((chapterId: string) => {
    syncingRef.current = true;
    setActiveChapterId(chapterId);
    middleSectionRefs.current[chapterId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    rightSectionRefs.current[chapterId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      syncingRef.current = false;
    }, 400);
  }, []);

  useEffect(() => {
    const root = middlePaneRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      if (syncingRef.current) return;
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      const sectionId = visible[0]?.target.getAttribute("data-section-id");
      if (sectionId) setActiveChapterId(sectionId);
    }, { root, threshold: [0.2, 0.5], rootMargin: "-10% 0px -45% 0px" });

    sections.forEach((section) => {
      const node = middleSectionRefs.current[section.id];
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const productSection = sections.find((section) => section.id === "dd_product_name");
    if (!productSection?.content?.trim()) return;
    const nextEn = translateProductNameZhToEn(productSection.content);
    const nextZh = productSection.content.trim();
    const previous = previousProductNameRef.current;

    if (!nextEn) return;
    if (productSection.contentEn === nextEn && previous.zh === nextZh && previous.en === nextEn) return;

    setSections((prev) => prev.map((section) => {
      if (section.id === "dd_product_name") {
        return { ...section, contentEn: nextEn };
      }
      if (!section.contentEn.trim()) return section;
      return {
        ...section,
        contentEn: syncPreviewProductName(section.contentEn, previous.zh, previous.en, nextEn),
      };
    }));

    previousProductNameRef.current = { zh: nextZh, en: nextEn };
  }, [sections]);

  const handleSave = (sectionId: string) => {
    toast.success(`${SECTION_NO_MAP[sectionId] || ""} 章节已保存（独立页本地状态）`);
  };

  const handleRetrieveRequirements = (section: WorkspaceSection) => {
    updateSection(section.id, {
      requirementOutline: buildRequirementOutline(section),
      mdrContent: buildMdrContent(section),
    });
    setRightPaneMode("mdr");
    setAiNotes([
      `已整理 ${SECTION_NO_MAP[section.id] || ""} ${section.title} 的法规要求。`,
      `建议先按这些要点补全内容：${(SECTION_HEADINGS[section.id] || []).join(" / ") || "待补充"}`,
      "这块内容可手动修改，再作为后续 AI 生成中文的输入。",
    ]);
  };

  const buildGenerationProductData = useCallback(() => {
    const productNameZh = resolveProductNameZh();
    return {
      identification: {
        tradeName: productNameZh,
        genericName: productNameZh,
      },
      description: {
        intendedPurpose: sections.find((item) => item.id === "dd_intended_purpose")?.content || "",
        targetPopulation: sections.find((item) => item.id === "dd_target_population")?.content || "",
        contraindications: sections.find((item) => item.id === "dd_contraindications")?.content || "",
        workingPrinciple: sections.find((item) => item.id === "dd_working_principle")?.content || "",
        components: sections.find((item) => item.id === "dd_components")?.content || "",
        packagingDescription: sections.find((item) => item.id === "dd_packaging")?.content || "",
      },
      technicalParams: {
        performanceSpecs: sections.find((item) => item.id === "dd_specifications")?.content || "",
      },
    };
  }, [resolveProductNameZh, sections]);

  const handleGenerate = async (section: WorkspaceSection) => {
    const hasRequirements = Boolean(section.requirementOutline?.trim());
    const hasProductName = Boolean(resolveProductNameZh().trim());
    if (!hasProductName) {
      toast.error("请先确定 1.1 产品名称");
      return;
    }
    if (!hasRequirements) {
      toast.error("请先检索法规要求或手动整理本章要点，再生成中文");
      return;
    }
    try {
      const result = await generateMutation.mutateAsync({
        projectId: 0,
        documentId: "device_description",
        sectionId: section.id,
        sectionTitle: section.title,
        sectionTitleEn: section.titleEn,
        productData: buildGenerationProductData(),
        requirementContext: section.requirementOutline || "",
        suggestedHeadings: extractRequirementHeadings(section.requirementOutline || ""),
        existingContent: section.content || undefined,
      });

      updateSection(section.id, {
        content: result.content?.trim() || buildChineseDraft(section),
        status: "draft",
        isConfirmed: false,
        isFrozen: false,
        canBeReferencedByNext: false,
      });
      setAiNotes([
        `已按产品名称“${resolveProductNameZh()}”和本章法规要求生成 ${SECTION_NO_MAP[section.id] || ""} 中文草稿。`,
        "本次为真实 AI 生成，输入来自当前页本地填写的产品名称和法规要求梳理。",
        "如法规要求梳理被修改，请重新生成中文以保持一致。",
      ]);
      toast.success("已根据产品名称和法规要求生成中文草稿");
    } catch {
      toast.error("AI生成中文失败");
    }
  };

  const handleTranslate = async (section: WorkspaceSection) => {
    if (!section.content.trim()) {
      toast.error("请先准备中文内容，再翻译英文");
      return;
    }
    try {
      const result = await translateMutation.mutateAsync({
        content: section.content,
        context: `产品名称：${resolveProductNameZh()} / 章节：${section.title} / 法规要求：${section.requirementOutline || "无"}`,
      });
      updateSection(section.id, {
        contentEn: result.translatedContent?.trim() || translateSection(section),
        mdrContent: section.mdrContent || buildMdrContent(section),
      });
      toast.success("已生成英文预览");
    } catch {
      toast.error("AI翻译英文失败");
    }
  };

  const handleConfirm = (section: WorkspaceSection) => {
    updateSection(section.id, {
      status: "confirmed",
      isConfirmed: true,
      isFrozen: false,
      canBeReferencedByNext: true,
      contentEn: translateSection(section),
      mdrContent: section.mdrContent || buildMdrContent(section),
    });
  };

  const handleFreeze = (section: WorkspaceSection) => {
    updateSection(section.id, {
      status: "frozen",
      isConfirmed: false,
      isFrozen: true,
      canBeReferencedByNext: true,
      contentEn: section.contentEn || translateSection(section),
      mdrContent: section.mdrContent || buildMdrContent(section),
    });
  };

  const handleUnfreeze = (section: WorkspaceSection) => {
    updateSection(section.id, {
      status: "draft",
      isConfirmed: false,
      isFrozen: false,
      canBeReferencedByNext: false,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回
            </Button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h1 className="text-2xl font-bold">CE 独立工作台</h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                <Globe className="mr-1 h-3 w-3" />
                欧盟 MDR
              </Badge>
            </div>
            <p className="text-sm text-slate-500">不联动 ERP、数据库或接口，专门用于先定框架和交互。</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-100 px-3 py-2">版本<br />00</div>
            <div className="rounded-2xl bg-slate-100 px-3 py-2">产品名称<br />{resolveProductNameZh()}</div>
            <div className="rounded-2xl bg-slate-100 px-3 py-2">状态<br />编辑中</div>
          </div>
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-100px)] grid-cols-1 gap-4 p-4 xl:grid-cols-[280px_minmax(0,1.08fr)_minmax(0,1fr)]">
        <aside className="max-h-[calc(100vh-120px)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">章节目录</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">CE-01</span>
          </div>
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">整体完成进度</div>
              <div className="text-sm font-semibold">{overallProgress}%</div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white">
              <div className="h-2 rounded-full bg-slate-900" style={{ width: `${overallProgress}%` }} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
              <div>已填写 {savedSections}</div>
              <div>已翻译 {translatedSections}</div>
              <div>可引用 {referenceableSections}</div>
            </div>
          </div>

          <div className="space-y-3">
            {chapterTree.map((node) => {
              const nodeMeta = getStatusMeta(node.status);
              return (
                <div key={node.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{node.chapterNo} {node.titleZh}</div>
                      <div className="mt-1 text-[11px] text-slate-500">{node.titleEn}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] ${nodeMeta.className}`}>{nodeMeta.label}</span>
                  </div>

                  {node.children.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {node.children.map((child) => {
                        const childMeta = getStatusMeta(child.status);
                        const isActive = activeChapterId === child.id;
                        return (
                          <button
                            key={child.id}
                            onClick={() => scrollToChapter(child.id)}
                            className={`w-full rounded-2xl border px-3 py-3 text-left transition ${isActive ? "border-sky-300 bg-sky-50 ring-2 ring-sky-200" : "border-slate-200 bg-white hover:border-slate-300"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium">{child.chapterNo} {child.titleZh}</div>
                                <div className="mt-1 text-[11px] leading-5 text-slate-500">{child.titleEn}</div>
                              </div>
                              <span className={`rounded-full border px-2 py-1 text-[10px] ${childMeta.className}`}>{childMeta.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>

        <main ref={middlePaneRef} className="max-h-[calc(100vh-120px)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">独立框架模式</div>
            <div className="mt-1 text-xs text-slate-500">这里不联动 ERP，只验证三栏结构、章节滚动联动和状态语义。</div>
          </div>

          <div className="space-y-5">
            {sections.map((section) => {
              const status = deriveStatus(section);
              const statusMeta = getStatusMeta(status);
              const isActive = activeChapterId === section.id;

              return (
                <section
                  key={section.id}
                  data-section-id={section.id}
                  ref={(node) => {
                    middleSectionRefs.current[section.id] = node;
                  }}
                  className={`rounded-3xl border bg-white p-5 shadow-sm ${isActive ? "border-sky-300 ring-2 ring-sky-200" : "border-slate-200"}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">当前章节</div>
                      <h2 className="mt-1 text-xl font-semibold">{SECTION_NO_MAP[section.id] || "-"} {section.title}</h2>
                      <div className="mt-1 text-sm text-slate-500">{section.titleEn}</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusMeta.className}`}>{statusMeta.label}</span>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleRetrieveRequirements(section)}>检索法规要求</Button>
                    <Button variant="outline" size="sm" onClick={() => handleGenerate(section)}>AI生成中文</Button>
                    <Button variant="outline" size="sm" onClick={() => handleTranslate(section)}>AI翻译英文</Button>
                    <Button variant="outline" size="sm" onClick={() => handleSave(section.id)}><Save className="mr-1 h-3 w-3" />保存本节</Button>
                    <Button size="sm" onClick={() => handleConfirm(section)} className="bg-slate-900 text-white hover:bg-slate-800">确认</Button>
                    {status !== "frozen" ? (
                      <Button variant="outline" size="sm" onClick={() => handleFreeze(section)}><Lock className="mr-1 h-3 w-3" />本章节内容临时不变</Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleUnfreeze(section)}><LockOpen className="mr-1 h-3 w-3" />解除暂不变</Button>
                    )}
                  </div>

                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">中文编辑区</h3>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">主编辑语言：中文</span>
                  </div>

                  <div className="mb-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{SECTION_META[section.id]?.hint || "请填写当前章节内容。"}</div>

                  <div className="mb-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">法规要求梳理</h3>
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">可手动修改</span>
                    </div>
                    <Textarea
                      value={section.requirementOutline || ""}
                      onFocus={() => setActiveChapterId(section.id)}
                      onChange={(e) => updateSection(section.id, { requirementOutline: e.target.value })}
                      placeholder="先点击“检索法规要求”，或者手动写本章需要覆盖的法规要点。"
                      className="min-h-[180px] rounded-2xl border border-slate-200 p-4 text-sm leading-7"
                    />
                  </div>

                  <Textarea
                    value={section.content}
                    onFocus={() => setActiveChapterId(section.id)}
                    onChange={(e) => updateSection(section.id, {
                      content: e.target.value,
                      contentEn: section.id === "dd_product_name" ? translateProductNameZhToEn(e.target.value) : "",
                      status: "draft",
                      isConfirmed: false,
                      isFrozen: false,
                      canBeReferencedByNext: false,
                    })}
                    className="min-h-[220px] rounded-2xl border border-slate-200 p-4 text-sm leading-7"
                  />

                  <div className="mt-4 grid gap-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-600"><div className="font-medium text-slate-800">法规提示</div><div className="mt-1">{SECTION_META[section.id]?.regulation}</div></div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-600"><div className="font-medium text-slate-800">附件提示</div><div className="mt-1">{SECTION_META[section.id]?.attachment}</div></div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-600"><div className="font-medium text-slate-800">引用状态</div><div className="mt-1">{section.canBeReferencedByNext ? "当前章节已可供后续章节引用。" : "当前章节仍是草稿，后续章节默认不可引用。"}</div></div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-600"><div className="font-medium text-slate-800">独立状态</div><div className="mt-1">当前不联动 ERP，仅本页本地状态生效。</div></div>
                  </div>
                </section>
              );
            })}
          </div>
        </main>

        <aside className="max-h-[calc(100vh-120px)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{rightPaneMode === "preview" ? "英文整文预览（实时镜像）" : "MDR查看"}</h2>
              <div className="mt-1 text-sm text-slate-500">{rightPaneMode === "preview" ? "右侧英文预览按章节联动定位。" : "右侧展示当前章节整理出的法规要求和可引用前文。"}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={rightPaneMode === "preview" ? "default" : "outline"} size="sm" onClick={() => setRightPaneMode("preview")}>英文预览</Button>
              <Button variant={rightPaneMode === "mdr" ? "default" : "outline"} size="sm" onClick={() => setRightPaneMode("mdr")}>MDR查看</Button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="border-b border-slate-200 pb-3">
              <div className="text-sm font-semibold">Suzhou Shenyun Medical Equipment Co., Ltd.</div>
              <div className="mt-2 text-lg font-semibold">CE-01 Device Description and Specification</div>
              <div className="mt-1 text-sm text-slate-600">Product Name: {resolveProductNameEn()}</div>
            </div>

            <div className="mt-4 space-y-3">
              {sections.map((section) => {
                const isActive = activeChapterId === section.id;
                const statusMeta = getStatusMeta(deriveStatus(section));
                const previewContent = section.id === "dd_product_name" ? resolveProductNameEn() : section.contentEn || translateSection(section);
                const mdrContent = section.requirementOutline || section.mdrContent || buildMdrContent(section);
                const refs = getReferenceSections(section.id);

                return (
                  <div
                    key={section.id}
                    ref={(node) => {
                      rightSectionRefs.current[section.id] = node;
                    }}
                    className={`rounded-2xl border p-4 text-sm leading-7 ${isActive ? "border-sky-300 bg-sky-50/70 ring-2 ring-sky-200" : "border-slate-200 bg-white"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{SECTION_NO_MAP[section.id] || "-"} {rightPaneMode === "preview" ? section.titleEn : section.title}</div>
                      <span className={`rounded-full border px-2 py-1 text-[11px] ${statusMeta.className}`}>{statusMeta.label}</span>
                    </div>

                    {rightPaneMode === "preview" ? (
                      <div className="mt-2 whitespace-pre-wrap text-slate-700">{previewContent}</div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        <div className="rounded-2xl bg-slate-50 p-3 whitespace-pre-wrap text-slate-700">{mdrContent}</div>
                        <div className="rounded-2xl bg-white p-3">
                          <div className="text-xs font-medium text-slate-800">可引用前文</div>
                          {refs.length > 0 ? (
                            <div className="mt-2 space-y-2">
                              {refs.map((ref) => (
                                <div key={ref.id} className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500">
                                  {SECTION_NO_MAP[ref.id] || ""} {ref.title}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-slate-500">当前章节之前暂无可引用的稳定章节。</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-3xl border bg-slate-50 p-4">
            <div className="mb-2 font-semibold">AI 建议</div>
            <ul className="space-y-2 text-sm text-slate-700">
              {aiNotes.map((note, idx) => (
                <li key={`${note}-${idx}`} className="rounded-2xl bg-white px-3 py-2 shadow-sm">{note}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
