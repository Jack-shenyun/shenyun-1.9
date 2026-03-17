import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import RaLayout from "@/components/RaLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowLeft,
  Globe,
  Loader2,
  Lock,
  LockOpen,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getAllDocuments } from "@/data/ra/mdrTemplates";
import {
  MARKET_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type DocumentDefinition,
  type DocumentId,
  type DocumentSection,
  type RaProjectData,
} from "@/data/ra/types";

type ChapterStatus = "draft" | "confirmed" | "frozen";
type RightPaneMode = "preview" | "mdr";

type WorkspaceSection = DocumentSection & {
  status?: ChapterStatus;
  isConfirmed?: boolean;
  isFrozen?: boolean;
  canBeReferencedByNext?: boolean;
  mdrContent?: string;
  requirementOutline?: string;
  updatedBy?: string;
  parentId?: string | null;
};

type ChapterNode = {
  id: string;
  chapterNo: string;
  titleZh: string;
  titleEn: string;
  level: number;
  sortOrder: number;
  status: ChapterStatus;
  isConfirmed: boolean;
  isFrozen: boolean;
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

const SECTION_META: Record<string, { hint: string; regulation: string; ai: string; attachment: string; mdr: string }> = {
  dd_scope: {
    hint: "请说明本文件的适用范围、目的以及与项目的对应关系。",
    regulation: "文件范围与目的应明确技术文档覆盖边界。",
    ai: "AI 可辅助生成范围说明草稿，但需人工确认。",
    attachment: "可关联项目范围说明、申报计划。",
    mdr: "MDR Annex II, Section 1.1 要求技术文档识别器械及其文档覆盖范围。",
  },
  dd_product_name: {
    hint: "请输入标准产品名称，系统后续将联动 ERP 产品主数据、规格和历史模板。",
    regulation: "产品名称应与标签、注册资料、主数据一致。",
    ai: "AI 可辅助中英文术语统一。",
    attachment: "无需附件，可联动产品主数据。",
    mdr: "产品名称需与技术文档、标签及注册数据库中的器械识别信息保持一致。",
  },
  dd_intended_purpose: {
    hint: "请描述器械用途、适应症、使用场景与预期使用者。",
    regulation: "内容应符合 MDR Annex II Section 1 的器械描述要求。",
    ai: "建议先生成中文，再确认后翻译英文。",
    attachment: "可关联产品图片、用途说明书。",
    mdr: "预期用途、适应症与使用者描述应支撑后续分类、风险和临床评价。",
  },
  dd_target_population: {
    hint: "请说明目标患者人群与预期使用者。",
    regulation: "患者与使用者范围需与预期用途一致。",
    ai: "AI 可帮助检查人群描述是否遗漏。",
    attachment: "可关联临床适用性说明。",
    mdr: "目标患者人群应与器械适应症、使用环境和使用者要求形成闭环。",
  },
  dd_contraindications: {
    hint: "请列出禁忌症、限制条件和不适用情况。",
    regulation: "禁忌症应与风险分析、临床评价一致。",
    ai: "AI 可辅助列出常见禁忌，但不可替代法规判断。",
    attachment: "建议关联风险管理或临床资料。",
    mdr: "禁忌症与使用限制应反映已知风险、临床限制和医疗判断边界。",
  },
  dd_working_principle: {
    hint: "请说明产品工作原理和核心功能逻辑。",
    regulation: "工作原理应支撑后续性能和风险分析。",
    ai: "AI 可辅助整理表达，但需技术确认。",
    attachment: "可关联原理图、流程图。",
    mdr: "工作原理说明应与设计输入输出、关键性能和风险控制保持一致。",
  },
  dd_components: {
    hint: "请列出主要组件、配件及组成关系。",
    regulation: "组件描述应与 BOM、图纸、标签一致。",
    ai: "AI 可辅助整理结构化组件描述。",
    attachment: "建议关联图纸、BOM、部件清单。",
    mdr: "组件及配件说明应支持器械定义、配置识别和标签一致性审查。",
  },
  dd_materials: {
    hint: "请说明主要材料、接触部位及关键材料特性。",
    regulation: "材料说明应与生物相容性和验证资料一致。",
    ai: "AI 可辅助检查材料描述完整性。",
    attachment: "建议关联材料规格书、供应商资料。",
    mdr: "材料信息应支撑生物相容性、灭菌、清洁和长期稳定性相关论证。",
  },
  dd_variants: {
    hint: "请说明产品变体、型号差异和配置关系。",
    regulation: "变体配置应与 UDI、型号、图纸一致。",
    ai: "AI 可辅助梳理版本与差异项。",
    attachment: "建议关联型号配置表。",
    mdr: "器械变体和配置关系应支持技术文档识别、UDI 管理和适用性判断。",
  },
  dd_classification: {
    hint: "请填写器械分类、适用规则和判定依据。",
    regulation: "分类必须有 Annex VIII 规则支撑。",
    ai: "AI 可辅助检索 MDR 分类规则。",
    attachment: "建议关联分类判定记录。",
    mdr: "器械分类应依据 MDR Annex VIII 规则，并写明判定逻辑与引用条款。",
  },
  dd_packaging: {
    hint: "请描述包装层级、包装方式和包装材料。",
    regulation: "包装描述应与标签和运输验证资料一致。",
    ai: "AI 可辅助补全包装说明。",
    attachment: "建议关联包装图样、运输测试。",
    mdr: "包装描述应支撑标签、运输稳定性和无菌屏障的相关证明。",
  },
  dd_predecessor: {
    hint: "请说明前代产品、等效器械或对比关系。",
    regulation: "前代或等效说明应服务于技术与临床论证。",
    ai: "AI 可辅助整理对比逻辑。",
    attachment: "可关联等效性分析资料。",
    mdr: "前代或等效器械关系可为技术比较、临床评价和变更说明提供依据。",
  },
  dd_specifications: {
    hint: "请填写尺寸、规格、性能参数与技术指标。",
    regulation: "技术规格应与验证和检验记录闭环。",
    ai: "AI 可辅助生成规格表述草稿。",
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
  { id: "chapter-1", chapterNo: "1", titleZh: "器械描述与规范", titleEn: "Device Description and Specification", level: 1, sortOrder: 100 },
  { id: "chapter-2", chapterNo: "2", titleZh: "性能与规格", titleEn: "Performance and Specifications", level: 1, sortOrder: 200 },
] as const;

function getWorkspaceSection(section: DocumentSection): WorkspaceSection {
  return section as WorkspaceSection;
}

function getSortOrder(sectionId: string) {
  const index = SECTION_ORDER.indexOf(sectionId as (typeof SECTION_ORDER)[number]);
  return index === -1 ? 999 : index;
}

function deriveStatus(section: WorkspaceSection): ChapterStatus {
  if (section.status) return section.status;
  if (section.isConfirmed) return "confirmed";
  if (section.isFrozen) return "frozen";
  return "draft";
}

function getStatusMeta(status: ChapterStatus) {
  if (status === "confirmed") {
    return {
      label: "已确认",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  }
  if (status === "frozen") {
    return {
      label: "暂不变",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    };
  }
  return {
    label: "未确认",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };
}

function buildChapterTree(sections: WorkspaceSection[]): ChapterNode[] {
  const topLevelZero = sections
    .filter((section) => SECTION_NO_MAP[section.id] === "0")
    .map((section) => {
      const status = deriveStatus(section);
      return {
        id: section.id,
        chapterNo: "0",
        titleZh: section.title,
        titleEn: section.titleEn,
        level: 1,
        sortOrder: 0,
        status,
        isConfirmed: status === "confirmed",
        isFrozen: status === "frozen",
        canBeReferencedByNext: Boolean(section.canBeReferencedByNext),
        children: [],
      };
    });

  const groups = PARENT_CHAPTERS.map((parent) => {
    const children = sections
      .filter((section) => {
        const chapterNo = SECTION_NO_MAP[section.id] || "";
        return chapterNo.startsWith(`${parent.chapterNo}.`);
      })
      .sort((a, b) => getSortOrder(a.id) - getSortOrder(b.id))
      .map((section) => {
        const status = deriveStatus(section);
        return {
          id: section.id,
          chapterNo: SECTION_NO_MAP[section.id] || "",
          titleZh: section.title,
          titleEn: section.titleEn,
          level: 2,
          sortOrder: getSortOrder(section.id),
          status,
          isConfirmed: status === "confirmed",
          isFrozen: status === "frozen",
          canBeReferencedByNext: Boolean(section.canBeReferencedByNext),
          children: [],
        };
      });

    return {
      ...parent,
      status: children.every((child) => child.status === "confirmed")
        ? "confirmed"
        : children.some((child) => child.status === "frozen")
          ? "frozen"
          : "draft",
      isConfirmed: children.every((child) => child.status === "confirmed"),
      isFrozen: children.some((child) => child.status === "frozen"),
      canBeReferencedByNext: children.some((child) => child.canBeReferencedByNext),
      children,
    } as ChapterNode;
  }).filter((group) => group.children.length > 0);

  return [...topLevelZero, ...groups];
}

function isPlaceholderContent(content: string) {
  return content.includes("[待补充") || content.includes("待补充：") || content.includes("产品分类：");
}

function translateProductNameZhToEn(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.includes("引流管")) return "Drainage Tube";
  if (normalized.includes("胃校准管")) return "Gastric Calibration Tube";
  if (normalized.includes("胃内球囊")) return "Intragastric Balloon";
  return normalized;
}

function looksLikeChinese(text: string) {
  return /[\u4e00-\u9fff]/.test(text);
}

function normalizeEnglishProductName(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  return looksLikeChinese(normalized) ? translateProductNameZhToEn(normalized) : normalized;
}

function syncPreviewProductName(content: string, previousZh: string, previousEn: string, nextEn: string) {
  let next = content;
  if (previousZh) next = next.split(previousZh).join(nextEn);
  if (previousEn) next = next.split(previousEn).join(nextEn);
  return next;
}

export default function RaWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, navigate] = useLocation();

  const { data: projectRaw, isLoading } = trpc.ra.projects.get.useQuery({ id: projectId });
  const updateMutation = trpc.ra.projects.update.useMutation();
  const generateMutation = trpc.ra.ai.generateContent.useMutation();

  const project = projectRaw as RaProjectData | null | undefined;

  const [documents, setDocuments] = useState<DocumentDefinition[]>([]);
  const [activeDocId, setActiveDocId] = useState<DocumentId | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string>("dd_product_name");
  const [rightPaneMode, setRightPaneMode] = useState<RightPaneMode>("preview");
  const [aiNotes, setAiNotes] = useState<string[]>([
    "当前工作台已按章节组织为左目录、中编辑、右预览/MDR 的三栏结构。",
    "章节状态由草稿、已确认、暂不变三种语义驱动。",
    "后续章节的引用权限将只读取 canBeReferencedByNext=true 的前文章节。",
  ]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const middlePaneRef = useRef<HTMLDivElement | null>(null);
  const rightPaneRef = useRef<HTMLDivElement | null>(null);
  const middleSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const syncFromClickRef = useRef(false);
  const previousProductNameRef = useRef<{ zh: string; en: string }>({ zh: "", en: "" });

  useEffect(() => {
    if (!project) return;
    if (project.documents && (project.documents as any[]).length > 0) {
      setDocuments(project.documents as DocumentDefinition[]);
    } else {
      const initDocs = getAllDocuments();
      setDocuments(initDocs);
      updateMutation.mutate({ id: projectId, documents: initDocs, currentStep: 3 });
    }
    setActiveDocId((project.activeDocumentId as DocumentId) || "device_description");
  }, [project?.id]);

  const autoSave = useCallback((docs: DocumentDefinition[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateMutation.mutate({ id: projectId, documents: docs });
    }, 1200);
  }, [projectId, updateMutation]);

  const persistDocuments = useCallback(async (docs: DocumentDefinition[], successMessage: string) => {
    await updateMutation.mutateAsync({ id: projectId, documents: docs });
    toast.success(successMessage);
  }, [projectId, updateMutation]);

  const updateSection = useCallback((
    docId: DocumentId,
    sectionId: string,
    update: Partial<WorkspaceSection>,
    options?: { autoSave?: boolean }
  ) => {
    let nextDocs: DocumentDefinition[] = [];
    setDocuments((prev) => {
      nextDocs = prev.map((doc) => {
        if (doc.id !== docId) return doc;
        return {
          ...doc,
          sections: doc.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              ...update,
              lastModified: Date.now(),
            } as DocumentSection;
          }),
        };
      });
      return nextDocs;
    });

    if (options?.autoSave !== false) {
      autoSave(nextDocs);
    }
    return nextDocs;
  }, [autoSave]);

  const activeDoc = useMemo(() => {
    const resolved = documents.find((doc) => doc.id === activeDocId) || documents.find((doc) => doc.id === "device_description");
    return resolved || null;
  }, [documents, activeDocId]);

  const sections = useMemo(
    () => (activeDoc?.sections || []).map(getWorkspaceSection).sort((a, b) => getSortOrder(a.id) - getSortOrder(b.id)),
    [activeDoc]
  );

  const chapterTree = useMemo(() => buildChapterTree(sections), [sections]);

  const activeSection = sections.find((section) => section.id === activeChapterId) || sections[0] || null;

  useEffect(() => {
    if (!activeSection && sections[0]) {
      setActiveChapterId(sections[0].id);
    }
  }, [sections, activeSection]);

  const translatedSections = sections.filter((section) => section.contentEn.trim()).length;
  const savedSections = sections.filter((section) => section.content.trim()).length;
  const referenceableSections = sections.filter((section) => Boolean(section.canBeReferencedByNext)).length;
  const overallProgress = sections.length > 0 ? Math.round((referenceableSections / sections.length) * 100) : 0;

  const resolveProductNameZh = () => {
    return sections.find((section) => section.id === "dd_product_name")?.content?.trim()
      || project?.productData?.identification?.tradeName
      || project?.productData?.identification?.genericName
      || project?.name
      || "引流管";
  };

  const resolveProductNameEn = () => {
    const productNameSection = sections.find((section) => section.id === "dd_product_name");
    return normalizeEnglishProductName(productNameSection?.contentEn || "")
      || translateProductNameZhToEn(productNameSection?.content || "")
      || normalizeEnglishProductName(project?.productData?.identification?.tradeName || "")
      || normalizeEnglishProductName(project?.productData?.identification?.genericName || "")
      || normalizeEnglishProductName(project?.name || "")
      || "Drainage Tube";
  };

  const buildGenerationProductData = useCallback(() => {
    const productNameZh = resolveProductNameZh();
    const currentProductData = project?.productData || {};
    const currentIdentification = (currentProductData as any).identification || {};
    const currentDescription = (currentProductData as any).description || {};

    return {
      ...currentProductData,
      identification: {
        ...currentIdentification,
        tradeName: currentIdentification.tradeName || productNameZh,
        genericName: currentIdentification.genericName || productNameZh,
      },
      description: {
        ...currentDescription,
        intendedPurpose: currentDescription.intendedPurpose || sections.find((section) => section.id === "dd_intended_purpose")?.content || "",
        targetPopulation: currentDescription.targetPopulation || sections.find((section) => section.id === "dd_target_population")?.content || "",
        contraindications: currentDescription.contraindications || sections.find((section) => section.id === "dd_contraindications")?.content || "",
        workingPrinciple: currentDescription.workingPrinciple || sections.find((section) => section.id === "dd_working_principle")?.content || "",
        components: currentDescription.components || sections.find((section) => section.id === "dd_components")?.content || "",
        packagingDescription: currentDescription.packagingDescription || sections.find((section) => section.id === "dd_packaging")?.content || "",
      },
    };
  }, [project?.productData, resolveProductNameZh, sections]);

  const buildChineseDraft = useCallback((section: WorkspaceSection) => {
    const productNameZh = resolveProductNameZh();
    if (section.id === "dd_product_name") return productNameZh;
    if (section.id === "dd_scope") {
      return `${productNameZh}技术文档用于说明本产品在欧盟 MDR 申报中的器械描述、规格要求及相关支撑信息。本文件适用于 CE-01 Device Description and Specification 章节编制、审核与后续引用。`;
    }
    if (section.id === "dd_intended_purpose") {
      return `${productNameZh}是一种用于相关临床操作的医疗器械。本产品的预期用途是协助医疗专业人员在适用手术或操作过程中完成目标处理；适应症应结合实际临床场景、术式要求及产品注册资料进一步明确。预期使用者为经过培训的医疗专业人员。`;
    }
    if (section.id === "dd_target_population") {
      return `${productNameZh}的目标患者人群应与其预期用途、适应症及使用场景保持一致。预期使用者为受过培训并具备相应资质的医疗专业人员；患者纳入范围、使用限制和边界条件应在本章节进一步明确。`;
    }
    if (section.id === "dd_contraindications") {
      return `${productNameZh}的禁忌症应基于产品预期用途、已知风险、临床限制及医疗判断要求进行界定。对于存在不适用的患者条件、操作场景或风险因素，应在本章节中逐项说明。`;
    }
    if (section.id === "dd_working_principle") {
      return `${productNameZh}通过其设计结构与功能部件配合实现预期工作原理。本章节应说明器械在临床使用中的核心作用机制、关键功能路径以及与预期用途相关的工作逻辑。`;
    }
    if (section.id === "dd_components") {
      return `${productNameZh}由主要器械本体、必要连接结构及适用配件组成。各组件的名称、功能、相互关系及是否为标准配置或可选配件，应在本章节中结合图纸、BOM 和规格信息进行说明。`;
    }
    if (section.id === "dd_materials") {
      return `${productNameZh}所使用的主要材料应结合产品接触部位、预期使用时长及功能需求进行说明。关键材料特性、材料合规性及与验证资料的一致性也应在本章节中体现。`;
    }
    if (section.id === "dd_variants") {
      return `${productNameZh}可能存在不同型号、规格或配置变体。各变体之间的差异项、共用部件、适用范围及与 UDI/型号管理的对应关系，应在本章节中明确描述。`;
    }
    if (section.id === "dd_classification") {
      return `${productNameZh}的器械分类应依据 MDR Annex VIII 的适用分类规则进行判定。本章节需写明分类结果、适用规则、判定依据及支撑说明，并保持与注册资料一致。`;
    }
    if (section.id === "dd_packaging") {
      return `${productNameZh}的包装应结合包装层级、包装材料、标签承载方式及运输保护要求进行说明。对于无菌屏障、运输稳定性和储存条件相关要求，也应在本章节中描述。`;
    }
    if (section.id === "dd_predecessor") {
      return `${productNameZh}如存在前代产品、等效器械或可比对的历史型号，应在本章节中说明其与当前产品的关系、差异点及可用于技术或临床论证的支撑内容。`;
    }
    if (section.id === "dd_specifications") {
      return `${productNameZh}的技术规格应包括外观、尺寸、关键性能参数、功能指标及其他适用技术要求。本章节内容应与规格书、图纸、检验报告和验证记录保持一致。`;
    }
    return section.content || "";
  }, [resolveProductNameZh]);

  const buildRequirementContext = useCallback((section: WorkspaceSection) => {
    const headings = SECTION_HEADINGS[section.id] || [];
    const headingText = headings.length > 0 ? headings.join("、") : "待结合章节实际内容补充";
    return [
      `章节编号：${SECTION_NO_MAP[section.id] || "-"}`,
      `章节中文标题：${section.title}`,
      `MDR要求摘要：${SECTION_META[section.id]?.mdr || "当前章节MDR依据待补充。"}`,
      `法规提示：${SECTION_META[section.id]?.regulation || "请补充法规提示。"}`,
      `建议覆盖的小标题：${headingText}`,
    ].join("\n");
  }, []);

  const buildRequirementOutline = useCallback((section: WorkspaceSection) => {
    const headings = SECTION_HEADINGS[section.id] || [];
    const headingLines = headings.length > 0
      ? headings.map((heading, index) => `${index + 1}. ${heading}`).join("\n")
      : "1. 待补充章节要点";

    return [
      `章节：${SECTION_NO_MAP[section.id] || "-"} ${section.title}`,
      "",
      "法规要求摘要",
      `${SECTION_META[section.id]?.mdr || "当前章节法规要求待补充。"}`,
      "",
      "建议填写要点",
      headingLines,
      "",
      "填写提示",
      `${SECTION_META[section.id]?.regulation || "请结合适用法规补充要求。"}`,
      `${SECTION_META[section.id]?.attachment || "如有附件支撑，请在本章中同步引用。"}`,
    ].join("\n");
  }, []);

  const getReferenceSections = useCallback((sectionId: string) => {
    const currentIndex = sections.findIndex((section) => section.id === sectionId);
    if (currentIndex === -1) return [];
    return sections.slice(0, currentIndex).filter((section) => Boolean(section.canBeReferencedByNext));
  }, [sections]);

  const translateSection = useCallback((section: WorkspaceSection) => {
    const productNameEn = resolveProductNameEn();
    if (section.id === "dd_scope") return "This section defines the scope and purpose of the CE technical documentation for the device.";
    if (section.id === "dd_product_name") {
      if ((section.content || "").includes("引流管")) return "Drainage Tube";
      if ((section.content || "").includes("胃校准管")) return "Gastric Calibration Tube";
      return section.content || productNameEn;
    }
    if (section.id === "dd_intended_purpose") return `${productNameEn} is intended for the relevant clinical procedure and shall be used by qualified healthcare professionals.`;
    if (section.id === "dd_target_population") return `The target patient population and intended users of ${productNameEn} shall be defined in line with the intended purpose and conditions of use.`;
    if (section.id === "dd_contraindications") return `The contraindications of ${productNameEn} shall be described based on known risks, clinical limitations, and medical judgment.`;
    if (section.id === "dd_working_principle") return `The working principle of ${productNameEn} is described in this section based on its core design and intended functionality.`;
    if (section.id === "dd_components") return `The components and accessories of ${productNameEn} are described in alignment with drawings and BOM information.`;
    if (section.id === "dd_materials") return `The materials used in ${productNameEn} are described here in alignment with material specifications and verification records.`;
    if (section.id === "dd_variants") return `The product variants and configurations of ${productNameEn} are described in this section.`;
    if (section.id === "dd_classification") return `The device classification of ${productNameEn} shall be determined according to the applicable MDR classification rules and supporting rationale.`;
    if (section.id === "dd_packaging") return `The packaging description of ${productNameEn} includes packaging configuration, labeling, and packaging materials.`;
    if (section.id === "dd_predecessor") return `Previous and equivalent devices related to ${productNameEn} are described in this section where applicable.`;
    if (section.id === "dd_specifications") return `The technical specifications of ${productNameEn} include dimensions, performance characteristics, and other applicable technical indicators.`;
    return section.content || "";
  }, [resolveProductNameEn]);

  const buildMdrContent = useCallback((section: WorkspaceSection) => {
    const references = getReferenceSections(section.id);
    const baseText = SECTION_META[section.id]?.mdr || "当前章节的 MDR 依据待接入法规要求库。";
    if (references.length === 0) return baseText;
    const refSummary = references
      .map((ref) => `${SECTION_NO_MAP[ref.id] || ""} ${ref.title}`)
      .join(" / ");
    return `${baseText}\n\n可引用前文章节：${refSummary}`;
  }, [getReferenceSections]);

  const scrollToChapter = useCallback((chapterId: string) => {
    syncFromClickRef.current = true;
    setActiveChapterId(chapterId);

    const middleTarget = middleSectionRefs.current[chapterId];
    const rightTarget = rightSectionRefs.current[chapterId];

    if (middleTarget) {
      middleTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (rightTarget) {
      rightTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    window.setTimeout(() => {
      syncFromClickRef.current = false;
    }, 500);
  }, []);

  useEffect(() => {
    const root = middlePaneRef.current;
    if (!root || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (syncFromClickRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const sectionId = visible[0].target.getAttribute("data-section-id");
          if (sectionId) setActiveChapterId(sectionId);
        }
      },
      {
        root,
        threshold: [0.2, 0.4, 0.65],
        rootMargin: "-10% 0px -45% 0px",
      }
    );

    sections.forEach((section) => {
      const node = middleSectionRefs.current[section.id];
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    if (!activeChapterId) return;
    const rightTarget = rightSectionRefs.current[activeChapterId];
    if (rightTarget) {
      rightTarget.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeChapterId]);

  useEffect(() => {
    if (!activeDoc) return;
    const productNameSection = sections.find((section) => section.id === "dd_product_name");
    if (!productNameSection?.content?.trim()) return;

    const translatedName = translateProductNameZhToEn(productNameSection.content);
    const nextZh = productNameSection.content.trim();
    const previous = previousProductNameRef.current;
    if (!translatedName) return;
    if (productNameSection.contentEn?.trim() === translatedName && previous.zh === nextZh && previous.en === translatedName) return;

    setDocuments((prev) => prev.map((doc) => {
      if (doc.id !== activeDoc.id) return doc;
      return {
        ...doc,
        sections: doc.sections.map((rawSection) => {
          const section = rawSection as WorkspaceSection;
          if (section.id === "dd_product_name") {
            return { ...section, contentEn: translatedName };
          }
          if (!section.contentEn?.trim()) return section;
          return {
            ...section,
            contentEn: syncPreviewProductName(section.contentEn, previous.zh, previous.en, translatedName),
          };
        }),
      };
    }));

    previousProductNameRef.current = { zh: nextZh, en: translatedName };
  }, [activeDoc, sections]);

  const handleZhContentChange = (sectionId: string, value: string) => {
    if (!activeDoc) return;
    updateSection(activeDoc.id, sectionId, {
      content: value,
      contentEn: "",
      userEdited: true,
      status: "draft",
      isConfirmed: false,
      isFrozen: false,
      canBeReferencedByNext: false,
    });
  };

  const handleSaveChapter = async (sectionId: string) => {
    if (!activeDoc) return;
    const nextDocs = updateSection(activeDoc.id, sectionId, {}, { autoSave: false });
    await persistDocuments(nextDocs, `${SECTION_NO_MAP[sectionId] || ""} 章节已保存`);
  };

  const handleRetrieveRequirements = async (section: WorkspaceSection) => {
    if (!activeDoc) return;
    const outline = buildRequirementOutline(section);
    const nextDocs = updateSection(activeDoc.id, section.id, {
      requirementOutline: outline,
      mdrContent: buildMdrContent(section),
    }, { autoSave: false });
    await persistDocuments(nextDocs, `${SECTION_NO_MAP[section.id] || ""} 法规要求已整理`);
    setRightPaneMode("mdr");
    setAiNotes([
      `已整理 ${SECTION_NO_MAP[section.id] || ""} ${section.title} 的法规要求。`,
      `建议先按这些要点补全内容：${(SECTION_HEADINGS[section.id] || []).join(" / ") || "待补充"}`,
      "你可以先手动修改“法规要求梳理”，再点击 AI生成中文。",
    ]);
  };

  const handleGenerateCurrent = async (section: WorkspaceSection) => {
    if (!activeDoc) return;
    try {
      const result = await generateMutation.mutateAsync({
        projectId,
        documentId: activeDoc.id,
        sectionId: section.id,
        sectionTitle: section.title,
        sectionTitleEn: section.titleEn,
        productData: buildGenerationProductData(),
        classification: project?.classification,
        technicalChars: project?.technicalChars,
        requirementContext: section.requirementOutline || buildRequirementContext(section),
        suggestedHeadings: SECTION_HEADINGS[section.id] || [],
        existingContent: section.content || undefined,
      });

      const generatedContent = result.content?.trim() || "";
      const fallbackContent = buildChineseDraft(section);
      const nextContent = generatedContent && !isPlaceholderContent(generatedContent)
        ? generatedContent
        : fallbackContent;

      updateSection(activeDoc.id, section.id, {
        content: nextContent,
        aiGenerated: true,
        userEdited: false,
        status: "draft",
        isConfirmed: false,
        isFrozen: false,
        canBeReferencedByNext: false,
      });

      setAiNotes([
        `已为 ${SECTION_NO_MAP[section.id] || ""} ${section.title} 生成中文草稿。`,
        `本次先按 MDR 要求整理了章节要点：${(SECTION_HEADINGS[section.id] || []).join(" / ") || "待补充"}`,
        nextContent === fallbackContent ? "检测到通用占位稿，已自动回退为基于当前产品名称的章节草稿。" : `本次生成已注入产品名称“${resolveProductNameZh()}”作为核心上下文。`,
        "当前章节仍处于草稿状态，后续章节默认不可引用。",
      ]);
      toast.success("AI 中文草稿已生成");
    } catch {
      toast.error("AI 生成失败，请重试");
    }
  };

  const handleTranslateCurrent = (section: WorkspaceSection) => {
    if (!activeDoc) return;
    updateSection(activeDoc.id, section.id, {
      contentEn: translateSection(section),
      mdrContent: buildMdrContent(section),
    });
    setAiNotes([
      `已生成 ${SECTION_NO_MAP[section.id] || ""} 章节英文镜像内容。`,
      "右侧英文区目前是章节镜像预览，后续会继续接入真实翻译流程。",
      "右侧 MDR 区会基于法规要求库和前文引用逻辑继续扩展。",
    ]);
  };

  const handleConfirmChapter = async (sectionId: string) => {
    if (!activeDoc) return;
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return;
    const nextDocs = updateSection(activeDoc.id, sectionId, {
      contentEn: translateSection({ ...section, content: section.content }),
      status: "confirmed",
      isConfirmed: true,
      isFrozen: false,
      canBeReferencedByNext: true,
      mdrContent: buildMdrContent(section),
    }, { autoSave: false });
    await persistDocuments(nextDocs, `${SECTION_NO_MAP[sectionId] || ""} 章节已确认`);
    setAiNotes([
      `${SECTION_NO_MAP[sectionId] || ""} 章节已进入“已确认”状态。`,
      "后续章节现在可以把该章节作为稳定引用源。",
      "若再次修改内容，应重新评估是否继续保持可引用状态。",
    ]);
  };

  const handleFreezeChapter = async (sectionId: string) => {
    if (!activeDoc) return;
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return;
    const nextDocs = updateSection(activeDoc.id, sectionId, {
      contentEn: section.contentEn?.trim() ? section.contentEn : translateSection({ ...section, content: section.content }),
      status: "frozen",
      isConfirmed: false,
      isFrozen: true,
      canBeReferencedByNext: true,
      mdrContent: buildMdrContent(section),
    }, { autoSave: false });
    await persistDocuments(nextDocs, `${SECTION_NO_MAP[sectionId] || ""} 章节已设为暂不变`);
    setAiNotes([
      `${SECTION_NO_MAP[sectionId] || ""} 章节已进入“暂不变”状态。`,
      "当前轮次中后续章节可以继续引用该章节当前版本。",
      "该状态不是最终定稿，后续可手动解除并恢复草稿编辑优先。",
    ]);
  };

  const handleUnfreezeChapter = async (sectionId: string) => {
    if (!activeDoc) return;
    const nextDocs = updateSection(activeDoc.id, sectionId, {
      status: "draft",
      isConfirmed: false,
      isFrozen: false,
      canBeReferencedByNext: false,
    }, { autoSave: false });
    await persistDocuments(nextDocs, `${SECTION_NO_MAP[sectionId] || ""} 章节已解除暂不变`);
    setAiNotes([
      `${SECTION_NO_MAP[sectionId] || ""} 章节已恢复草稿状态。`,
      "解除后，该章节不再作为后续章节的稳定引用源。",
      "如需继续引用，请重新确认或重新设为暂不变。",
    ]);
  };

  if (isLoading) {
    return (
      <RaLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          加载项目数据...
        </div>
      </RaLayout>
    );
  }

  if (!project) {
    return (
      <RaLayout>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <AlertCircle className="h-10 w-10 opacity-30" />
          <p>项目不存在或无权访问</p>
          <Button variant="outline" onClick={() => navigate("/ra/eu-mdr")}>返回项目列表</Button>
        </div>
      </RaLayout>
    );
  }

  return (
    <RaLayout>
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate("/ra/eu-mdr")}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  返回
                </Button>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h1 className="text-2xl font-bold text-slate-900">{resolveProductNameZh()}</h1>
                  <Badge variant="outline" className={STATUS_COLORS[project.status] || ""}>
                    {STATUS_LABELS[project.status] || project.status}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    <Globe className="mr-1 h-3 w-3" />
                    {MARKET_LABELS[project.market] || project.market}
                  </Badge>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">CE-01 Device Description and Specification</h2>
                <p className="text-sm text-slate-500">
                  {project.productData?.manufacturer?.companyName || "Suzhou Shenyun Medical Equipment Co., Ltd."}
                </p>
                <p className="text-sm text-slate-500">产品名称：{resolveProductNameZh()}</p>
              </div>
            </div>

            <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3 xl:w-[42%]">
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-400">版本</div>
                <div className="font-medium">00</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-400">起草人</div>
                <div className="font-medium">Zoe Wang</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-400">审核人</div>
                <div className="font-medium">Lily Chen</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-400">批准人</div>
                <div className="font-medium">Michael Xu</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-400">生效日期</div>
                <div className="font-medium">{new Date(project.updatedAt).toISOString().slice(0, 10)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-400">状态</div>
                <div className="font-medium">编辑中</div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>章节完成进度</span>
              <span>{referenceableSections}/{sections.length} 可引用</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-slate-900 transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
        </div>

        <div className="grid min-h-[calc(100vh-230px)] grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1.08fr)_minmax(0,1fr)]">
          <aside className="max-h-[calc(100vh-230px)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">章节目录</h2>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">CE-01</span>
            </div>

            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-800">整体完成进度</div>
                <div className="text-sm font-semibold text-slate-900">{overallProgress}%</div>
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
                        <div className="text-sm font-semibold text-slate-900">
                          {node.chapterNo} {node.titleZh}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">{node.titleEn}</div>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[10px] ${nodeMeta.className}`}>
                        {nodeMeta.label}
                      </span>
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
                                  <div className="text-sm font-medium text-slate-900">
                                    {child.chapterNo} {child.titleZh}
                                  </div>
                                  <div className="mt-1 text-[11px] leading-5 text-slate-500">{child.titleEn}</div>
                                </div>
                                <span className={`rounded-full border px-2 py-1 text-[10px] ${childMeta.className}`}>
                                  {childMeta.label}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        onClick={() => scrollToChapter(node.id)}
                        className={`mt-3 w-full rounded-2xl border px-3 py-3 text-left transition ${activeChapterId === node.id ? "border-sky-300 bg-sky-50 ring-2 ring-sky-200" : "border-slate-200 bg-white hover:border-slate-300"}`}
                      >
                        <div className="text-sm font-medium text-slate-900">{node.chapterNo} {node.titleZh}</div>
                        <div className="mt-1 text-[11px] text-slate-500">{node.titleEn}</div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          <main ref={middlePaneRef} className="max-h-[calc(100vh-230px)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-600">当前章节编辑模式</div>
              <div className="mt-1 text-xs text-slate-500">左侧目录、中间中文块、右侧英文/MDR 按章节同步定位，不再是 tab 切换。</div>
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
                        <h2 className="mt-1 text-xl font-semibold">
                          {SECTION_NO_MAP[section.id] || "-"} {section.title}
                        </h2>
                        <div className="mt-1 text-sm text-slate-500">{section.titleEn}</div>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleRetrieveRequirements(section)}>
                        检索法规要求
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleGenerateCurrent(section)} disabled={generateMutation.isPending}>
                        {generateMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                        AI生成中文
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleTranslateCurrent(section)}>
                        AI翻译英文
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleSaveChapter(section.id)}>
                        <Save className="mr-1 h-3 w-3" />
                        保存本节
                      </Button>
                      <Button size="sm" onClick={() => handleConfirmChapter(section.id)} className="bg-slate-900 text-white hover:bg-slate-800">
                        确认
                      </Button>
                      {status !== "frozen" ? (
                        <Button variant="outline" size="sm" onClick={() => handleFreezeChapter(section.id)}>
                          <Lock className="mr-1 h-3 w-3" />
                          本章节内容临时不变
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => handleUnfreezeChapter(section.id)}>
                          <LockOpen className="mr-1 h-3 w-3" />
                          解除暂不变
                        </Button>
                      )}
                    </div>

                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold">中文编辑区</h3>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">主编辑语言：中文</span>
                    </div>

                    <div className="mb-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                      {SECTION_META[section.id]?.hint || "请填写当前章节内容。"}
                    </div>

                    <div className="mb-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-semibold">法规要求梳理</h3>
                        <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">可手动修改</span>
                      </div>
                      <div className="mb-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                        先整理本章在 MDR 下需要覆盖的内容范围和小标题，再据此生成中文正文。
                      </div>
                      <Textarea
                        value={section.requirementOutline || ""}
                        onFocus={() => setActiveChapterId(section.id)}
                        onChange={(e) => updateSection(activeDoc?.id || "device_description", section.id, {
                          requirementOutline: e.target.value,
                          userEdited: true,
                        })}
                        placeholder="点击“检索法规要求”先生成本章法规要求，也可以在这里手动整理需要覆盖的内容要点。"
                        className="min-h-[180px] rounded-2xl border border-slate-200 p-4 text-sm leading-7"
                      />
                    </div>

                    <Textarea
                      value={section.content}
                      onFocus={() => setActiveChapterId(section.id)}
                      onChange={(e) => handleZhContentChange(section.id, e.target.value)}
                      className="min-h-[220px] rounded-2xl border border-slate-200 p-4 text-sm leading-7"
                    />

                    <div className="mt-4 grid gap-2 lg:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-600">
                        <div className="font-medium text-slate-800">法规提示</div>
                        <div className="mt-1">{SECTION_META[section.id]?.regulation || "请先确认法规依据。"}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-600">
                        <div className="font-medium text-slate-800">AI 提示</div>
                        <div className="mt-1">{SECTION_META[section.id]?.ai || "AI 仅作辅助，须人工确认。"}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-600">
                        <div className="font-medium text-slate-800">附件提示</div>
                        <div className="mt-1">{SECTION_META[section.id]?.attachment || "后续将联动 ERP 图纸与附件。"}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-600">
                        <div className="font-medium text-slate-800">引用状态</div>
                        <div className="mt-1">
                          {section.canBeReferencedByNext ? "当前章节已可供后续章节引用。" : "当前章节仍是草稿，后续章节默认不可引用。"}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </main>

          <aside ref={rightPaneRef} className="max-h-[calc(100vh-230px)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{rightPaneMode === "preview" ? "英文整文预览（实时镜像）" : "MDR 查看"}</h2>
                <div className="mt-1 text-sm text-slate-500">
                  {rightPaneMode === "preview"
                    ? "右侧英文预览按章节联动定位，可作为后续正式翻译流程的镜像参考。"
                    : "右侧 MDR 查看将按章节展示法规依据和可引用前文。"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={rightPaneMode === "preview" ? "default" : "outline"} size="sm" onClick={() => setRightPaneMode("preview")}>
                  英文预览
                </Button>
                <Button variant={rightPaneMode === "mdr" ? "default" : "outline"} size="sm" onClick={() => setRightPaneMode("mdr")}>
                  MDR查看
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="border-b border-slate-200 pb-3">
                <div className="text-sm font-semibold">{project.productData?.manufacturer?.companyName || "Suzhou Shenyun Medical Equipment Co., Ltd."}</div>
                <div className="mt-2 text-lg font-semibold">CE-01 Device Description and Specification</div>
                <div className="mt-1 text-sm text-slate-600">Product Name: {resolveProductNameEn()}</div>
              </div>

              <div className="mt-4 space-y-3">
                {sections.map((section) => {
                  const status = deriveStatus(section);
                  const statusMeta = getStatusMeta(status);
                  const isActive = activeChapterId === section.id;
                  const references = getReferenceSections(section.id);
                  const previewContent = section.id === "dd_product_name"
                    ? resolveProductNameEn()
                    : section.contentEn.trim() || translateSection(section) || "[Content not generated yet]";
                  const mdrContent = section.requirementOutline || section.mdrContent || buildMdrContent(section);

                  return (
                    <div
                      key={section.id}
                      ref={(node) => {
                        rightSectionRefs.current[section.id] = node;
                      }}
                      className={`rounded-2xl border p-4 text-sm leading-7 ${isActive ? "border-sky-300 bg-sky-50/70 ring-2 ring-sky-200" : "border-slate-200 bg-white"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-slate-900">
                          {SECTION_NO_MAP[section.id] || "-"} {rightPaneMode === "preview" ? section.titleEn : section.title}
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[11px] ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>

                      {rightPaneMode === "preview" ? (
                        <div className="mt-2 whitespace-pre-wrap text-slate-700">{previewContent}</div>
                      ) : (
                        <div className="mt-3 space-y-3">
                          <div className="rounded-2xl bg-slate-50 p-3 whitespace-pre-wrap text-slate-700">
                            {mdrContent}
                          </div>
                          <div className="rounded-2xl bg-white p-3">
                            <div className="text-xs font-medium text-slate-800">可引用前文</div>
                            {references.length > 0 ? (
                              <div className="mt-2 space-y-2">
                                {references.map((ref) => {
                                  const refMeta = getStatusMeta(deriveStatus(ref));
                                  return (
                                    <div key={ref.id} className="rounded-xl border border-slate-200 px-3 py-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="text-xs font-medium text-slate-800">
                                          {SECTION_NO_MAP[ref.id] || ""} {ref.title}
                                        </div>
                                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${refMeta.className}`}>
                                          {refMeta.label}
                                        </span>
                                      </div>
                                      <div className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">
                                        {ref.content || "该章节已标记为可引用，但内容仍待补充。"}
                                      </div>
                                    </div>
                                  );
                                })}
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
                  <li key={`${note}-${idx}`} className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </RaLayout>
  );
}
