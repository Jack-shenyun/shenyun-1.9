import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import ERPLayout from "@/components/ERPLayout";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import StructuredReportEditor, {
  buildStructuredReportPrintableDocument,
  createStructuredReportFromContext,
  type StructuredReportData,
} from "@/components/rd/StructuredReportEditor";
import { trpc } from "@/lib/trpc";
import { normalizeEnglishAbbreviations } from "@/lib/runtimePageTranslator";
import { formatDateValue } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRightCircle,
  Bold,
  CheckCircle2,
  ClipboardList,
  Copy,
  Edit,
  ExternalLink,
  Eye,
  FilePenLine,
  FileUp,
  FlaskConical,
  FolderKanban,
  GitBranch,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Languages,
  Pilcrow,
  Plus,
  Rocket,
  Search,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Underline,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type ProjectType = "new_product" | "improvement" | "customization" | "research";
type ProjectStatus = "planning" | "in_progress" | "testing" | "completed" | "suspended" | "cancelled";
type StageStatus = "not_started" | "in_progress" | "completed" | "blocked";
type GateResult = "pending" | "pass" | "fail" | "waived";
type DeliverableStatus = "not_started" | "draft" | "in_review" | "approved" | "archived" | "na";
type RegulatoryMarket = "EU_MDR" | "US_FDA" | "CN_NMPA";
type ReleaseStatus = "未启动" | "准备放行" | "已放行" | "需补资料";

type DeliverableTemplate = {
  code: string;
  name: string;
  stageCode: string;
  market: "COMMON" | RegulatoryMarket;
  requiredType: "必需" | "条件必需" | "不适用";
  description: string;
};

interface ProjectStageItem {
  id: string;
  code: string;
  name: string;
  relatedForms: string[];
  department: string;
  ownerId: number | null;
  ownerName: string;
  planStart: string;
  planEnd: string;
  actualStart: string;
  actualEnd: string;
  status: StageStatus;
  gateRequired: boolean;
  gateResult: GateResult;
  notes: string;
}

interface DeliverableAttachment {
  id: string;
  name: string;
  fileName?: string;
  filePath: string;
  mimeType?: string;
  uploadedAt: string;
}

interface ProjectDeliverable {
  id: string;
  code: string;
  name: string;
  stageCode: string;
  stageName: string;
  market: "COMMON" | RegulatoryMarket;
  requiredType: "必需" | "条件必需" | "不适用";
  status: DeliverableStatus;
  version: string;
  ownerId: number | null;
  ownerName: string;
  plannedDate: string;
  completedDate: string;
  lastRevisedAt: string;
  description: string;
  attachments: DeliverableAttachment[];
  content?: string;
  structuredData?: StructuredReportData;
  templateName?: string;
  contentUpdatedAt?: string;
}

interface ProjectMember {
  id: string;
  userId: number | null;
  name: string;
  department: string;
  role: string;
  responsibility: string;
  isCore: boolean;
}

interface ProjectTrial {
  id: string;
  trialType: string;
  taskNo: string;
  batchNo: string;
  quantity: string;
  planDate: string;
  actualDate: string;
  productionStatus: string;
  inspectionStatus: string;
  conclusion: string;
}

interface ProjectRegulatoryTrack {
  id: string;
  market: RegulatoryMarket;
  classification: string;
  pathway: string;
  currentStep: string;
  status: "planning" | "in_progress" | "submitted" | "approved" | "archived";
  documentProgress: number;
  submissionNo: string;
  certificateNo: string;
  ownerId: number | null;
  ownerName: string;
  gapNotes: string;
  raProjectId: number | null;
}

interface ProjectChangeItem {
  id: string;
  changeNo: string;
  changeType: string;
  reason: string;
  regulatoryImpact: string;
  riskImpact: string;
  decision: string;
  status: string;
  effectiveDate: string;
}

interface ProjectReleaseCheck {
  id: string;
  code: string;
  item: string;
  market: "COMMON" | RegulatoryMarket;
  required: boolean;
  passed: boolean;
  ownerName: string;
  checkedAt: string;
  notes: string;
}

interface ProjectPostMarketItem {
  id: string;
  category: string;
  itemNo: string;
  status: string;
  ownerName: string;
  closedAt: string;
  notes: string;
}

interface ProjectWorkspaceProfile {
  intendedUse: string;
  indications: string;
  contraindications: string;
  targetPatients: string;
  targetUsers: string;
  useEnvironment: string;
  workingPrinciple: string;
  mainMaterials: string;
  deviceClassCn: string;
  deviceClassEu: string;
  fdaPathway: string;
  nmpaPathway: string;
  riskLevel: string;
  isSterile: boolean;
  sterilizationMethod: string;
  hasSoftware: boolean;
  hasElectricalSafety: boolean;
  isReusable: boolean;
  basicUdiDi: string;
  udiDi: string;
  srn: string;
  gmdnCode: string;
  emdnCode: string;
  registrationNo: string;
}

interface ProjectWorkspaceData {
  profile: ProjectWorkspaceProfile;
  members: ProjectMember[];
  stages: ProjectStageItem[];
  deliverables: ProjectDeliverable[];
  trials: ProjectTrial[];
  regulatoryTracks: ProjectRegulatoryTrack[];
  changes: ProjectChangeItem[];
  releaseChecks: ProjectReleaseCheck[];
  postMarketItems: ProjectPostMarketItem[];
}

interface ProjectFormData {
  projectNo: string;
  name: string;
  type: ProjectType;
  productId: string;
  leaderId: string;
  raOwnerId: string;
  qaOwnerId: string;
  productionOwnerId: string;
  clinicalOwnerId: string;
  projectCategory: string;
  developmentType: string;
  priority: string;
  currentStage: string;
  releaseStatus: ReleaseStatus;
  startDate: string;
  endDate: string;
  targetFinishDate: string;
  actualFinishDate: string;
  launchDate: string;
  budget: string;
  progress: string;
  status: ProjectStatus;
  targetMarkets: RegulatoryMarket[];
  description: string;
  remark: string;
  projectData: ProjectWorkspaceData;
}

interface NormalizedProject {
  id: number;
  projectNo: string;
  name: string;
  type: ProjectType;
  productId: number | null;
  leaderId: number | null;
  raOwnerId: number | null;
  qaOwnerId: number | null;
  productionOwnerId: number | null;
  clinicalOwnerId: number | null;
  projectCategory: string;
  developmentType: string;
  priority: string;
  currentStage: string;
  releaseStatus: ReleaseStatus;
  startDate: string;
  endDate: string;
  targetFinishDate: string;
  actualFinishDate: string;
  launchDate: string;
  budget: string;
  progress: number;
  status: ProjectStatus;
  targetMarkets: RegulatoryMarket[];
  description: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
  projectData: ProjectWorkspaceData;
}

const TYPE_OPTIONS: Array<{ value: ProjectType; label: string }> = [
  { value: "new_product", label: "新产品开发" },
  { value: "improvement", label: "产品改进" },
  { value: "customization", label: "定制开发" },
  { value: "research", label: "技术预研" },
];

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: "planning", label: "规划中" },
  { value: "in_progress", label: "进行中" },
  { value: "testing", label: "验证中" },
  { value: "completed", label: "已完成" },
  { value: "suspended", label: "已暂停" },
  { value: "cancelled", label: "已取消" },
];

const PRIORITY_OPTIONS = ["高", "中", "低"];
const PROJECT_CATEGORY_OPTIONS = ["新产品", "改型升级", "设计变更", "法规补强"];
const DEVELOPMENT_TYPE_OPTIONS = ["自研", "OEM", "ODM", "联合开发"];
const RELEASE_STATUS_OPTIONS: ReleaseStatus[] = ["未启动", "准备放行", "已放行", "需补资料"];

const MARKET_OPTIONS: Array<{ value: RegulatoryMarket; label: string }> = [
  { value: "CN_NMPA", label: "NMPA" },
  { value: "EU_MDR", label: "EU MDR" },
  { value: "US_FDA", label: "US FDA" },
];

const MARKET_LABELS: Record<RegulatoryMarket, string> = {
  CN_NMPA: "NMPA",
  EU_MDR: "EU MDR",
  US_FDA: "US FDA",
};

const MARKET_BADGE_CLASS: Record<RegulatoryMarket, string> = {
  CN_NMPA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EU_MDR: "bg-blue-50 text-blue-700 border-blue-200",
  US_FDA: "bg-rose-50 text-rose-700 border-rose-200",
};

const PROJECT_STAGE_TEMPLATES = [
  { code: "initiation", name: "立项准备", relatedForms: ["QTQP11-01", "QTQP11-02", "QTQP11-03", "QTQP11-04"], department: "研发部", gateRequired: true },
  { code: "planning", name: "开发策划", relatedForms: ["QTQP11-05"], department: "研发部", gateRequired: true },
  { code: "design_input", name: "设计输入", relatedForms: ["QTQP11-06"], department: "研发部", gateRequired: true },
  { code: "input_review", name: "输入评审", relatedForms: ["QTQP11-07"], department: "研发部", gateRequired: true },
  { code: "design_output", name: "设计输出", relatedForms: ["图纸", "BOM", "技术要求"], department: "研发部", gateRequired: true },
  { code: "output_review", name: "输出评审", relatedForms: ["QTQP11-07"], department: "研发部", gateRequired: true },
  { code: "trial", name: "样品试制", relatedForms: ["QTQP11-08"], department: "研发部/生产部", gateRequired: true },
  { code: "verification", name: "设计验证", relatedForms: ["QTQP11-09", "QTQP11-10"], department: "研发部/质量部", gateRequired: true },
  { code: "validation", name: "设计确认", relatedForms: ["QTQP11-11"], department: "研发部/法规部", gateRequired: true },
  { code: "transfer", name: "设计转换", relatedForms: ["QTQP11-12"], department: "研发部/生产部", gateRequired: true },
  { code: "release", name: "上市评估/放行", relatedForms: ["QTQP11-14"], department: "法规部/质量部", gateRequired: true },
  { code: "post_change", name: "上市后变更", relatedForms: ["QTQP11-13"], department: "研发部/法规部", gateRequired: false },
] as const;

const STAGE_NAME_BY_CODE = Object.fromEntries(PROJECT_STAGE_TEMPLATES.map((item) => [item.code, item.name])) as Record<string, string>;
const STAGE_OPTIONS = PROJECT_STAGE_TEMPLATES.map((item) => item.name);

const BASE_DELIVERABLE_TEMPLATES = [
  { code: "QTQP11-01", name: "项目建议书", stageCode: "initiation", market: "COMMON" as const, requiredType: "必需" as const, description: "项目立项建议、项目来源和机会说明" },
  { code: "QTQP11-02", name: "市场调查报告", stageCode: "initiation", market: "COMMON" as const, requiredType: "必需" as const, description: "市场规模、竞品和商业机会评估" },
  { code: "QTQP11-03", name: "技术可行性分析报告", stageCode: "initiation", market: "COMMON" as const, requiredType: "必需" as const, description: "技术路径、关键难点与资源评估" },
  { code: "QTQP11-04", name: "产品开发立项、任务书", stageCode: "initiation", market: "COMMON" as const, requiredType: "必需" as const, description: "立项批准、项目目标和分工" },
  { code: "QTQP11-05", name: "项目计划书", stageCode: "planning", market: "COMMON" as const, requiredType: "必需" as const, description: "阶段计划、责任人、起止时间和交付件" },
  { code: "QTQP11-06", name: "产品设计规范", stageCode: "design_input", market: "COMMON" as const, requiredType: "必需" as const, description: "设计输入、功能要求和边界条件" },
  { code: "QTQP11-07", name: "设计开发评审报告", stageCode: "input_review", market: "COMMON" as const, requiredType: "必需" as const, description: "输入/输出/变更评审共用模板" },
  { code: "QTQP11-08", name: "试制任务单", stageCode: "trial", market: "COMMON" as const, requiredType: "必需" as const, description: "试制计划、样机批次与执行要求" },
  { code: "QTQP11-09", name: "设计验证报告", stageCode: "verification", market: "COMMON" as const, requiredType: "必需" as const, description: "设计验证活动与结果" },
  { code: "QTQP11-10", name: "自测报告", stageCode: "verification", market: "COMMON" as const, requiredType: "必需" as const, description: "研发自测、试验记录和问题闭环" },
  { code: "QTQP11-11", name: "设计确认报告", stageCode: "validation", market: "COMMON" as const, requiredType: "必需" as const, description: "设计确认、临床/用户需求满足性" },
  { code: "QTQP11-12", name: "设计转换活动检查表", stageCode: "transfer", market: "COMMON" as const, requiredType: "必需" as const, description: "图纸/BOM/工艺/检验/培训齐套检查" },
  { code: "QTQP11-13", name: "设计变更申请表", stageCode: "post_change", market: "COMMON" as const, requiredType: "条件必需" as const, description: "全生命周期设计变更申请与评审" },
  { code: "QTQP11-14", name: "上市评估表", stageCode: "release", market: "COMMON" as const, requiredType: "必需" as const, description: "上市前综合评估和放行结论" },
];

const MARKET_DELIVERABLE_TEMPLATES: Record<RegulatoryMarket, Array<{ code: string; name: string; stageCode: string; description: string }>> = {
  EU_MDR: [
    { code: "MDR-AII-01", name: "设备描述与规格", stageCode: "design_output", description: "Annex II Device Description" },
    { code: "MDR-GSPR-01", name: "GSPR 符合性检查表", stageCode: "design_output", description: "通用安全与性能要求检查表" },
    { code: "MDR-RISK-01", name: "风险管理文件", stageCode: "verification", description: "风险管理计划/报告" },
    { code: "MDR-CER-01", name: "临床评价文件", stageCode: "validation", description: "Clinical Evaluation" },
    { code: "MDR-PMS-01", name: "PMS/PMCF 计划", stageCode: "release", description: "上市后监督与 PMCF 计划" },
    { code: "MDR-LABEL-01", name: "标签与 IFU", stageCode: "release", description: "欧盟标签、说明书与符号" },
  ],
  US_FDA: [
    { code: "FDA-DHF-01", name: "DHF 索引", stageCode: "design_output", description: "Design History File 索引" },
    { code: "FDA-DMR-01", name: "DMR 索引", stageCode: "transfer", description: "Device Master Record 索引" },
    { code: "FDA-DHR-01", name: "DHR 准备清单", stageCode: "release", description: "Device History Record 准备情况" },
    { code: "FDA-SUB-01", name: "510(k)/De Novo 提交资料", stageCode: "release", description: "FDA 申报包与 predicate 资料" },
    { code: "FDA-LABEL-01", name: "FDA Labeling", stageCode: "release", description: "美国标签、说明书与 UDI 要求" },
  ],
  CN_NMPA: [
    { code: "NMPA-PTR-01", name: "产品技术要求", stageCode: "design_output", description: "产品技术要求与检验依据" },
    { code: "NMPA-TEST-01", name: "注册检验资料", stageCode: "verification", description: "注册检验、型检或自检资料" },
    { code: "NMPA-CE-01", name: "临床评价/临床试验资料", stageCode: "validation", description: "临床评价路径与结论" },
    { code: "NMPA-LABEL-01", name: "注册说明书/标签", stageCode: "release", description: "说明书、标签与最小销售单元要求" },
    { code: "NMPA-SUB-01", name: "注册申报资料", stageCode: "release", description: "NMPA 注册/备案资料包" },
  ],
};

const DELIVERABLE_TEMPLATE_SECTIONS: Record<string, string[]> = {
  "QTQP11-01": ["立项背景", "产品概述", "项目目标", "资源需求", "预期收益", "建议结论"],
  "QTQP11-02": ["调研范围", "市场规模", "竞品分析", "临床需求", "商业机会", "调研结论"],
  "QTQP11-03": ["技术路线", "关键难点", "材料与工艺", "验证思路", "风险与对策", "可行性结论"],
  "QTQP11-04": ["立项信息", "项目目标", "项目组织", "职责分工", "里程碑", "批准结论"],
  "QTQP11-05": ["阶段计划", "任务分工", "关键节点", "交付文件", "风险应对", "资源安排"],
  "QTQP11-06": ["设计输入总则", "法规与标准要求", "性能要求", "可用性要求", "标签与说明书要求", "验收标准"],
  "QTQP11-07": ["评审范围", "评审资料", "评审成员", "评审意见", "整改要求", "评审结论"],
  "QTQP11-08": ["试制目的", "试制产品与数量", "物料与工装", "生产与检验要求", "记录要求", "责任分工"],
  "QTQP11-09": ["验证目的", "验证项目", "样品信息", "标准与方法", "结果汇总", "验证结论"],
  "QTQP11-10": ["自测目的", "自测项目", "测试方法", "结果记录", "异常与整改", "自测结论"],
  "QTQP11-11": ["确认目的", "确认对象", "确认方法", "结果评估", "问题整改", "确认结论"],
  "QTQP11-12": ["转换检查范围", "图纸/BOM/工艺", "设备与工装", "检验与培训", "标签与包装", "转换结论"],
  "QTQP11-13": ["变更背景", "变更内容", "影响分析", "风险评估", "法规影响", "实施计划"],
  "QTQP11-14": ["上市评估范围", "法规符合性", "生产放行条件", "标签与说明书", "UDI与上市后准备", "放行结论"],
  "MDR-AII-01": ["设备描述", "产品变体与配置", "预期用途", "基本原理", "关键材料", "参考型号"],
  "MDR-GSPR-01": ["适用条款", "符合性说明", "采用标准", "验证证据", "不适用理由"],
  "MDR-RISK-01": ["风险管理范围", "危害识别", "风险估计", "风险控制措施", "残余风险", "受益风险结论"],
  "MDR-CER-01": ["产品与适应症", "临床数据来源", "等同性/文献评价", "临床评价结论", "PMCF建议"],
  "MDR-PMS-01": ["PMS计划", "PMCF计划", "数据来源", "评价频次", "PSUR要求"],
  "MDR-LABEL-01": ["标签版本", "IFU版本", "符号说明", "语言要求", "UDI信息", "审核结论"],
  "FDA-DHF-01": ["DHF范围", "设计输入输出索引", "验证确认索引", "评审与变更索引", "追溯矩阵"],
  "FDA-DMR-01": ["产品规格", "制造工艺", "质检规范", "标签/包装", "设备与工装"],
  "FDA-DHR-01": ["批记录准备", "放行记录", "偏差/OOS", "追溯信息", "缺口说明"],
  "FDA-SUB-01": ["Device Description", "Predicate / Product Code", "Performance Testing", "Biocompatibility / Sterility", "Labeling", "Submission Strategy"],
  "FDA-LABEL-01": ["Principal Display Panel", "IFU", "Symbols", "UDI", "Complaint / Contact Info"],
  "NMPA-PTR-01": ["产品描述", "性能指标", "检验方法", "适用范围", "技术要求条款"],
  "NMPA-TEST-01": ["检验样品", "检验项目", "标准依据", "结果记录", "偏差说明"],
  "NMPA-CE-01": ["临床评价路径", "同品种对比", "文献综述", "临床证据", "临床结论"],
  "NMPA-LABEL-01": ["说明书", "标签", "禁忌症", "使用方法", "储运条件", "UDI信息"],
  "NMPA-SUB-01": ["申报路径", "资料清单", "风险分析", "检验与临床", "注册结论"],
};

const DELIVERABLE_TEMPLATE_APPENDIX: Record<string, string> = {
  "QTQP11-05": [
    "| 阶段 | 主要任务 | 责任部门 | 责任人 | 计划开始 | 计划完成 | 交付文件 |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    "| 立项准备 | [待补充] | [待补充] | [待补充] | [待补充] | [待补充] | QTQP11-01/02/03/04 |",
    "| 开发策划 | [待补充] | [待补充] | [待补充] | [待补充] | [待补充] | QTQP11-05 |",
    "| 设计输入 | [待补充] | [待补充] | [待补充] | [待补充] | [待补充] | QTQP11-06 |",
  ].join("\n"),
  "QTQP11-07": [
    "| 评审部门 | 评审人 | 关注点 | 评审意见 | 是否整改 |",
    "| --- | --- | --- | --- | --- |",
    "| 研发部 | [待补充] | [待补充] | [待补充] | [是/否] |",
    "| 法规部 | [待补充] | [待补充] | [待补充] | [是/否] |",
  ].join("\n"),
  "QTQP11-08": [
    "| 产品名称 | 规格型号 | 数量 | 试制批次 | 责任部门 | 备注 |",
    "| --- | --- | --- | --- | --- | --- |",
    "| [待补充] | [待补充] | [待补充] | [待补充] | [待补充] | [待补充] |",
  ].join("\n"),
  "QTQP11-09": [
    "| 验证项目 | 标准/方法 | 样品信息 | 结果 | 结论 |",
    "| --- | --- | --- | --- | --- |",
    "| [待补充] | [待补充] | [待补充] | [待补充] | [通过/不通过] |",
  ].join("\n"),
  "QTQP11-10": [
    "| 自测项目 | 方法 | 结果 | 异常 | 整改措施 |",
    "| --- | --- | --- | --- | --- |",
    "| [待补充] | [待补充] | [待补充] | [待补充] | [待补充] |",
  ].join("\n"),
  "QTQP11-11": [
    "| 确认项目 | 确认证据 | 结果 | 问题整改 | 结论 |",
    "| --- | --- | --- | --- | --- |",
    "| [待补充] | [待补充] | [待补充] | [待补充] | [待补充] |",
  ].join("\n"),
  "QTQP11-12": [
    "| 检查项 | 对应文件 | 责任部门 | 检查结果 | 备注 |",
    "| --- | --- | --- | --- | --- |",
    "| 图纸/BOM/工艺 | [待补充] | [待补充] | [通过/不通过] | [待补充] |",
  ].join("\n"),
  "QTQP11-13": [
    "| 影响维度 | 变更前 | 变更后 | 风险/法规影响 | 结论 |",
    "| --- | --- | --- | --- | --- |",
    "| 设计/工艺/标签 | [待补充] | [待补充] | [待补充] | [待补充] |",
  ].join("\n"),
  "QTQP11-14": [
    "| 评估项 | 评估内容 | 结论 | 风险等级 |",
    "| --- | --- | --- | --- |",
    "| 法规符合性 | [待补充] | [通过/不通过] | [低/中/高] |",
  ].join("\n"),
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "规划中",
  in_progress: "进行中",
  testing: "验证中",
  completed: "已完成",
  suspended: "已暂停",
  cancelled: "已取消",
};

const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  not_started: "未开始",
  draft: "编制中",
  in_review: "待评审",
  approved: "已批准",
  archived: "已归档",
  na: "不适用",
};

const TRACK_STATUS_LABELS: Record<ProjectRegulatoryTrack["status"], string> = {
  planning: "规划中",
  in_progress: "进行中",
  submitted: "已提交",
  approved: "已批准",
  archived: "已归档",
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (typeof value === "object") return value as T;
  return fallback;
}

function toInputDate(value: unknown): string {
  const formatted = formatDateValue(value);
  return formatted === "-" ? "" : formatted;
}

function toOptionalNumber(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeMarkets(rawValue: unknown): RegulatoryMarket[] {
  const fallback = parseJsonValue<RegulatoryMarket[]>(rawValue, []);
  const arrayValue = Array.isArray(rawValue) ? rawValue : fallback;
  const valid = arrayValue.filter((item): item is RegulatoryMarket =>
    item === "CN_NMPA" || item === "EU_MDR" || item === "US_FDA"
  );
  return Array.from(new Set(valid));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildDeliverableTemplateHtml(params: {
  project: NormalizedProject;
  deliverable: ProjectDeliverable;
  product: any;
}) {
  const { project, deliverable, product } = params;
  const sections = DELIVERABLE_TEMPLATE_SECTIONS[deliverable.code] || [
    "文件目的",
    "适用范围",
    "正文内容",
    "结论与后续动作",
  ];
  const appendix = DELIVERABLE_TEMPLATE_APPENDIX[deliverable.code];
  const marketText = deliverable.market === "COMMON" ? project.targetMarkets.map((item) => MARKET_LABELS[item]).join(" / ") : MARKET_LABELS[deliverable.market];
  const appendixRows = appendix
    ? appendix
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => line.startsWith("|"))
    : [];

  const appendixTable = appendixRows.length > 2
    ? (() => {
        const headerCells = appendixRows[0]
          .split("|")
          .map((cell) => cell.trim())
          .filter(Boolean);
        const bodyRows = appendixRows.slice(2).map((row) =>
          row
            .split("|")
            .map((cell) => cell.trim())
            .filter(Boolean)
        );
        return `
          <h2>明细表</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:12px;">
            <thead>
              <tr>
                ${headerCells.map((cell) => `<th style="border:1px solid #d4d4d8;padding:8px;background:#f4f4f5;text-align:left;">${escapeHtml(cell)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${bodyRows.map((cells) => `
                <tr>
                  ${cells.map((cell) => `<td style="border:1px solid #d4d4d8;padding:8px;">${escapeHtml(cell || "[待补充]")}</td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        `;
      })()
    : "";

  return `
    <h1>${escapeHtml(deliverable.name)}</h1>
    <h2>文件信息</h2>
    <ul>
      <li>项目编号：${escapeHtml(project.projectNo)}</li>
      <li>项目名称：${escapeHtml(project.name)}</li>
      <li>输出物编号：${escapeHtml(deliverable.code)}</li>
      <li>当前阶段：${escapeHtml(deliverable.stageName)}</li>
      <li>目标市场：${escapeHtml(marketText || "[待补充]")}</li>
      <li>关联产品：${escapeHtml(product?.name || "[待补充]")}</li>
      <li>产品编码：${escapeHtml(product?.code || "[待补充]")}</li>
      <li>规格型号：${escapeHtml(product?.specification || "[待补充]")}</li>
      <li>当前版本：${escapeHtml(deliverable.version || "V1.0")}</li>
      <li>负责人：${escapeHtml(deliverable.ownerName || "[待补充]")}</li>
    </ul>
    <h2>编写说明</h2>
    <ul>
      <li>请结合项目实际情况补充完整内容。</li>
      <li>未确认的信息请保留 [待补充] 占位。</li>
      <li>定稿前请同步核对法规、质量、生产和注册要求。</li>
    </ul>
    ${sections.map((section) => `<h2>${escapeHtml(section)}</h2><p>[待补充]</p>`).join("")}
    ${appendixTable}
  `.trim();
}

function normalizeDeliverableEditorHtml(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "<p>[待补充]</p>";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;

  const lines = trimmed.split("\n");
  const parts: string[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    parts.push(`<ul>${listBuffer.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    listBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      parts.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      parts.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("- ")) {
      listBuffer.push(line.slice(2));
      continue;
    }
    flushList();
    parts.push(`<p>${escapeHtml(line)}</p>`);
  }

  flushList();
  return parts.join("");
}

const TERM_PAIRS: Array<[string, string]> = [
  ["自测报告", "Self-Inspection Report"],
  ["商业发票", "Commercial Invoice"],
  ["装箱单", "Packing List"],
  ["申报要素", "Declaration Elements"],
  ["报关单", "Customs Declaration"],
  ["报告编号", "Report No."],
  ["产品名称", "Product Name"],
  ["产品型号", "Product Model"],
  ["规格型号", "Specification / Model"],
  ["规格", "Specification"],
  ["型号", "Model"],
  ["批号", "Lot No."],
  ["生产日期", "Manufacturing Date"],
  ["有效期", "Expiry Date"],
  ["检验项目", "Inspection Item"],
  ["检验标准", "Inspection Standard"],
  ["检验方法", "Inspection Method"],
  ["检验结果", "Inspection Result"],
  ["检验结论", "Inspection Conclusion"],
  ["结论", "Conclusion"],
  ["判定", "Judgment"],
  ["合格", "Pass"],
  ["不合格", "Fail"],
  ["备注", "Remarks"],
  ["版本", "Version"],
  ["页码", "Page"],
  ["日期", "Date"],
  ["客户", "Customer"],
  ["供应商", "Supplier"],
  ["收货人", "Consignee"],
  ["发货人", "Shipper"],
  ["通知人", "Notify Party"],
  ["数量", "Quantity"],
  ["单位", "Unit"],
  ["单价", "Unit Price"],
  ["总价", "Total Amount"],
  ["金额", "Amount"],
  ["币种", "Currency"],
  ["材质", "Material"],
  ["颜色", "Color"],
  ["尺寸", "Dimensions"],
  ["重量", "Weight"],
  ["毛重", "Gross Weight"],
  ["净重", "Net Weight"],
  ["体积", "Volume"],
  ["原产地", "Country of Origin"],
  ["国家", "Country"],
  ["用途", "Intended Use"],
  ["说明", "Description"],
  ["外观", "Appearance"],
  ["标签", "Label"],
  ["包装", "Packaging"],
  ["灭菌", "Sterilization"],
  ["密封", "Seal Integrity"],
  ["抽样", "Sampling"],
  ["样品", "Sample"],
  ["审核", "Reviewed By"],
  ["批准", "Approved By"],
  ["检验员", "Inspector"],
  ["编号", "No."],
  ["名称", "Name"],
  ["温度", "Temperature"],
  ["湿度", "Humidity"],
  ["压力", "Pressure"],
  ["运输方式", "Shipment Method"],
  ["起运港", "Port of Loading"],
  ["目的港", "Port of Destination"],
  ["箱号", "Carton No."],
];

const TRANSLATION_DICT = new Map(TERM_PAIRS);
const SORTED_TRANSLATION_TERMS = [...TRANSLATION_DICT.keys()].sort((a, b) => b.length - a.length);

function isChineseChar(char: string) {
  return /[\u3400-\u9fff]/.test(char);
}

function normalizeTranslationPunctuation(text: string) {
  return text
    .replace(/[，]/g, ", ")
    .replace(/[。]/g, ".")
    .replace(/[；]/g, "; ")
    .replace(/[（]/g, " (")
    .replace(/[）]/g, ") ")
    .replace(/[【]/g, " [")
    .replace(/[】]/g, "] ")
    .replace(/[、]/g, ", ")
    .replace(/[：]/g, ": ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:)\]])/g, "$1")
    .trim();
}

function translateSegment(source: string) {
  if (!source) return "";
  const exact = TRANSLATION_DICT.get(source.trim());
  if (exact) return exact;

  let i = 0;
  const out: string[] = [];

  while (i < source.length) {
    const ch = source[i];

    if (!isChineseChar(ch)) {
      out.push(ch);
      i += 1;
      continue;
    }

    let matched = false;
    for (const term of SORTED_TRANSLATION_TERMS) {
      if (source.startsWith(term, i)) {
        out.push(TRANSLATION_DICT.get(term) || term);
        i += term.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      let j = i + 1;
      while (j < source.length && isChineseChar(source[j])) j += 1;
      out.push(source.slice(i, j));
      i = j;
    }
  }

  return normalizeTranslationPunctuation(out.join(" "));
}

function translateLine(line: string) {
  const value = line.trim();
  if (!value) return "";

  if (TRANSLATION_DICT.has(value)) return TRANSLATION_DICT.get(value) || value;

  const labelMatch = value.match(/^(.+?)\s*[：:]\s*(.+)$/);
  if (labelMatch) {
    const [, left, right] = labelMatch;
    return `${translateSegment(left)}: ${translateSegment(right)}`.trim();
  }

  return translateSegment(value);
}

async function fallbackTranslate(text: string) {
  return normalizeEnglishAbbreviations(
    text
    .split(/\r?\n/)
    .map(translateLine)
    .join("\n")
    .trim()
  );
}

async function runTranslator(text: string) {
  const custom = (globalThis as typeof globalThis & { customReportTranslator?: (text: string) => Promise<string> | string }).customReportTranslator;
  if (typeof custom === "function") {
    try {
      const result = await custom(text);
      if (result && String(result).trim()) {
        return normalizeEnglishAbbreviations(String(result).trim());
      }
    } catch {
      // Ignore and fall back to local translator.
    }
  }

  return fallbackTranslate(text);
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Ignore and use fallback copy.
  }

  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

function createEmptyProfile(): ProjectWorkspaceProfile {
  return {
    intendedUse: "",
    indications: "",
    contraindications: "",
    targetPatients: "",
    targetUsers: "",
    useEnvironment: "",
    workingPrinciple: "",
    mainMaterials: "",
    deviceClassCn: "",
    deviceClassEu: "",
    fdaPathway: "",
    nmpaPathway: "",
    riskLevel: "",
    isSterile: false,
    sterilizationMethod: "",
    hasSoftware: false,
    hasElectricalSafety: false,
    isReusable: false,
    basicUdiDi: "",
    udiDi: "",
    srn: "",
    gmdnCode: "",
    emdnCode: "",
    registrationNo: "",
  };
}

function createStageDefaults(): ProjectStageItem[] {
  return PROJECT_STAGE_TEMPLATES.map((template) => ({
    id: makeId(`stage-${template.code}`),
    code: template.code,
    name: template.name,
    relatedForms: [...template.relatedForms],
    department: template.department,
    ownerId: null,
    ownerName: "",
    planStart: "",
    planEnd: "",
    actualStart: "",
    actualEnd: "",
    status: "not_started",
    gateRequired: template.gateRequired,
    gateResult: "pending",
    notes: "",
  }));
}

function createTrackTemplate(market: RegulatoryMarket): ProjectRegulatoryTrack {
  const defaultPathway =
    market === "EU_MDR" ? "CE / MDR (EU) 2017/745" :
    market === "US_FDA" ? "510(k)" :
    "注册";
  const defaultStep =
    market === "EU_MDR" ? "分类与 Annex II/III 准备" :
    market === "US_FDA" ? "predicate 与 design controls 准备" :
    "分类界定与注册路径确认";
  return {
    id: makeId(`track-${market}`),
    market,
    classification: "",
    pathway: defaultPathway,
    currentStep: defaultStep,
    status: "planning",
    documentProgress: 0,
    submissionNo: "",
    certificateNo: "",
    ownerId: null,
    ownerName: "",
    gapNotes: "",
    raProjectId: null,
  };
}

function createReleaseCheckTemplates(markets: RegulatoryMarket[]): ProjectReleaseCheck[] {
  const commonChecks: ProjectReleaseCheck[] = [
    { id: makeId("release"), code: "COMMON-01", item: "设计输出齐套", market: "COMMON", required: true, passed: false, ownerName: "", checkedAt: "", notes: "" },
    { id: makeId("release"), code: "COMMON-02", item: "验证/确认完成", market: "COMMON", required: true, passed: false, ownerName: "", checkedAt: "", notes: "" },
    { id: makeId("release"), code: "COMMON-03", item: "图纸/BOM/工艺已冻结", market: "COMMON", required: true, passed: false, ownerName: "", checkedAt: "", notes: "" },
    { id: makeId("release"), code: "COMMON-04", item: "标签/说明书齐套", market: "COMMON", required: true, passed: false, ownerName: "", checkedAt: "", notes: "" },
    { id: makeId("release"), code: "COMMON-05", item: "UDI 数据准备完成", market: "COMMON", required: true, passed: false, ownerName: "", checkedAt: "", notes: "" },
  ];
  const marketChecks: ProjectReleaseCheck[] = [];
  if (markets.includes("EU_MDR")) {
    marketChecks.push({ id: makeId("release"), code: "EU-01", item: "EUDAMED/SRN 准备完成", market: "EU_MDR", required: true, passed: false, ownerName: "", checkedAt: "", notes: "" });
  }
  if (markets.includes("US_FDA")) {
    marketChecks.push({ id: makeId("release"), code: "FDA-01", item: "510(k)/Listing 资料准备完成", market: "US_FDA", required: true, passed: false, ownerName: "", checkedAt: "", notes: "" });
  }
  if (markets.includes("CN_NMPA")) {
    marketChecks.push({ id: makeId("release"), code: "NMPA-01", item: "注册检验/申报资料准备完成", market: "CN_NMPA", required: true, passed: false, ownerName: "", checkedAt: "", notes: "" });
  }
  return [...commonChecks, ...marketChecks];
}

function buildDeliverableTemplates(markets: RegulatoryMarket[]): DeliverableTemplate[] {
  const templates: DeliverableTemplate[] = [...BASE_DELIVERABLE_TEMPLATES];
  markets.forEach((market) => {
    MARKET_DELIVERABLE_TEMPLATES[market].forEach((item) => {
      templates.push({
        ...item,
        market,
        requiredType: "必需" as const,
      });
    });
  });
  return templates;
}

function computeTrackProgress(deliverables: ProjectDeliverable[], market: RegulatoryMarket): number {
  const scoped = deliverables.filter((item) => item.market === market && item.requiredType !== "不适用");
  if (scoped.length === 0) return 0;
  const done = scoped.filter((item) => item.status === "approved" || item.status === "archived").length;
  return Math.round((done / scoped.length) * 100);
}

function mergeWorkspaceWithMarkets(rawWorkspace: Partial<ProjectWorkspaceData> | null | undefined, markets: RegulatoryMarket[]): ProjectWorkspaceData {
  const workspace = rawWorkspace || {};
  const stageMap = new Map(
    (Array.isArray(workspace.stages) ? workspace.stages : []).map((item) => [String(item.code || ""), item])
  );
  const deliverableMap = new Map(
    (Array.isArray(workspace.deliverables) ? workspace.deliverables : []).map((item) => [String(item.code || ""), item])
  );
  const trackMap = new Map(
    (Array.isArray(workspace.regulatoryTracks) ? workspace.regulatoryTracks : []).map((item) => [String(item.market || ""), item])
  );
  const releaseCheckMap = new Map(
    (Array.isArray(workspace.releaseChecks) ? workspace.releaseChecks : []).map((item) => [String(item.code || ""), item])
  );

  const stages = createStageDefaults().map((template) => {
    const existing = stageMap.get(template.code);
    return {
      ...template,
      ...existing,
      id: existing?.id || template.id,
      code: template.code,
      name: template.name,
      relatedForms: Array.isArray(existing?.relatedForms) ? existing.relatedForms : template.relatedForms,
      gateRequired: template.gateRequired,
    };
  });

  const deliverables = buildDeliverableTemplates(markets).map((template) => {
    const existing = deliverableMap.get(template.code);
    return {
      id: existing?.id || makeId(`deliverable-${template.code}`),
      code: template.code,
      name: template.name,
      stageCode: template.stageCode,
      stageName: STAGE_NAME_BY_CODE[template.stageCode] || "",
      market: template.market,
      requiredType: existing?.requiredType || template.requiredType,
      status: (existing?.status || "not_started") as DeliverableStatus,
      version: existing?.version || "V1.0",
      ownerId: existing?.ownerId ?? null,
      ownerName: existing?.ownerName || "",
      plannedDate: toInputDate(existing?.plannedDate),
      completedDate: toInputDate(existing?.completedDate),
      lastRevisedAt: toInputDate(existing?.lastRevisedAt),
      description: existing?.description || template.description,
      attachments: Array.isArray(existing?.attachments) ? existing.attachments : [],
      content: existing?.content || "",
      structuredData: existing?.structuredData || undefined,
      templateName: existing?.templateName || "",
      contentUpdatedAt: toInputDate(existing?.contentUpdatedAt),
    };
  });

  const regulatoryTracks = markets.map((market) => {
    const existing = trackMap.get(market);
    const template = createTrackTemplate(market);
    return {
      ...template,
      ...existing,
      id: existing?.id || template.id,
      market,
      documentProgress: computeTrackProgress(deliverables, market),
    };
  });

  const releaseChecks = createReleaseCheckTemplates(markets).map((template) => {
    const existing = releaseCheckMap.get(template.code);
    return {
      ...template,
      ...existing,
      id: existing?.id || template.id,
      code: template.code,
      item: template.item,
      market: template.market,
    };
  });

  return {
    profile: {
      ...createEmptyProfile(),
      ...(workspace.profile || {}),
    },
    members: Array.isArray(workspace.members) ? workspace.members : [],
    stages,
    deliverables,
    trials: Array.isArray(workspace.trials) ? workspace.trials : [],
    regulatoryTracks,
    changes: Array.isArray(workspace.changes) ? workspace.changes : [],
    releaseChecks,
    postMarketItems: Array.isArray(workspace.postMarketItems) ? workspace.postMarketItems : [],
  };
}

function createDefaultWorkspace(markets: RegulatoryMarket[]): ProjectWorkspaceData {
  return mergeWorkspaceWithMarkets({}, markets);
}

function getDeliverableStats(projectData: ProjectWorkspaceData) {
  const required = projectData.deliverables.filter((item) => item.requiredType !== "不适用");
  const approved = required.filter((item) => item.status === "approved" || item.status === "archived").length;
  return {
    done: approved,
    total: required.length,
    percent: required.length ? Math.round((approved / required.length) * 100) : 0,
  };
}

function getRegulatoryStats(projectData: ProjectWorkspaceData) {
  const total = projectData.regulatoryTracks.length;
  const approved = projectData.regulatoryTracks.filter((item) => item.status === "approved" || item.status === "archived").length;
  const averageProgress = total
    ? Math.round(projectData.regulatoryTracks.reduce((sum, item) => sum + Number(item.documentProgress || 0), 0) / total)
    : 0;
  return { approved, total, averageProgress };
}

function isProjectOverdue(project: NormalizedProject) {
  if (!project.targetFinishDate) return false;
  if (project.status === "completed" || project.status === "cancelled") return false;
  return project.targetFinishDate < new Date().toISOString().slice(0, 10);
}

function hasPendingGate(project: NormalizedProject) {
  const stage = project.projectData.stages.find((item) => item.name === project.currentStage || item.code === project.currentStage);
  if (!stage) return false;
  if (!stage.gateRequired) return false;
  return stage.gateResult !== "pass";
}

function hasPendingRelease(project: NormalizedProject) {
  const requiredChecks = project.projectData.releaseChecks.filter((item) => item.required);
  return project.releaseStatus !== "已放行" && requiredChecks.some((item) => !item.passed);
}

function projectToForm(project: NormalizedProject): ProjectFormData {
  return {
    projectNo: project.projectNo,
    name: project.name,
    type: project.type,
    productId: project.productId ? String(project.productId) : "",
    leaderId: project.leaderId ? String(project.leaderId) : "",
    raOwnerId: project.raOwnerId ? String(project.raOwnerId) : "",
    qaOwnerId: project.qaOwnerId ? String(project.qaOwnerId) : "",
    productionOwnerId: project.productionOwnerId ? String(project.productionOwnerId) : "",
    clinicalOwnerId: project.clinicalOwnerId ? String(project.clinicalOwnerId) : "",
    projectCategory: project.projectCategory,
    developmentType: project.developmentType,
    priority: project.priority,
    currentStage: project.currentStage,
    releaseStatus: project.releaseStatus,
    startDate: project.startDate,
    endDate: project.endDate,
    targetFinishDate: project.targetFinishDate,
    actualFinishDate: project.actualFinishDate,
    launchDate: project.launchDate,
    budget: project.budget,
    progress: String(project.progress || 0),
    status: project.status,
    targetMarkets: [...project.targetMarkets],
    description: project.description,
    remark: project.remark,
    projectData: cloneJson(project.projectData),
  };
}

function createEmptyFormData(projects: NormalizedProject[]): ProjectFormData {
  const defaultMarkets: RegulatoryMarket[] = ["CN_NMPA"];
  return {
    projectNo: "",
    name: "",
    type: "new_product",
    productId: "",
    leaderId: "",
    raOwnerId: "",
    qaOwnerId: "",
    productionOwnerId: "",
    clinicalOwnerId: "",
    projectCategory: "新产品",
    developmentType: "自研",
    priority: "中",
    currentStage: "立项准备",
    releaseStatus: "未启动",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    targetFinishDate: "",
    actualFinishDate: "",
    launchDate: "",
    budget: "",
    progress: "0",
    status: "planning",
    targetMarkets: defaultMarkets,
    description: "",
    remark: "",
    projectData: createDefaultWorkspace(defaultMarkets),
  };
}

function normalizeProjectRecord(raw: any): NormalizedProject {
  const rawProjectData = parseJsonValue<Partial<ProjectWorkspaceData>>(raw?.projectData, {});
  const parsedMarkets = normalizeMarkets(raw?.targetMarkets);
  const projectMarkets = parsedMarkets.length > 0
    ? parsedMarkets
    : normalizeMarkets(Array.isArray(rawProjectData?.regulatoryTracks) ? rawProjectData.regulatoryTracks.map((item: any) => item?.market) : []);
  const targetMarkets: RegulatoryMarket[] = projectMarkets.length > 0 ? [...projectMarkets] : ["CN_NMPA"];
  const projectData = mergeWorkspaceWithMarkets(rawProjectData, targetMarkets);

  return {
    id: Number(raw?.id || 0),
    projectNo: String(raw?.projectNo || ""),
    name: String(raw?.name || ""),
    type: (raw?.type || "new_product") as ProjectType,
    productId: raw?.productId ? Number(raw.productId) : null,
    leaderId: raw?.leaderId ? Number(raw.leaderId) : null,
    raOwnerId: raw?.raOwnerId ? Number(raw.raOwnerId) : null,
    qaOwnerId: raw?.qaOwnerId ? Number(raw.qaOwnerId) : null,
    productionOwnerId: raw?.productionOwnerId ? Number(raw.productionOwnerId) : null,
    clinicalOwnerId: raw?.clinicalOwnerId ? Number(raw.clinicalOwnerId) : null,
    projectCategory: String(raw?.projectCategory || "新产品"),
    developmentType: String(raw?.developmentType || "自研"),
    priority: String(raw?.priority || "中"),
    currentStage: String(raw?.currentStage || "立项准备"),
    releaseStatus: (raw?.releaseStatus || "未启动") as ReleaseStatus,
    startDate: toInputDate(raw?.startDate),
    endDate: toInputDate(raw?.endDate),
    targetFinishDate: toInputDate(raw?.targetFinishDate),
    actualFinishDate: toInputDate(raw?.actualFinishDate),
    launchDate: toInputDate(raw?.launchDate),
    budget: String(raw?.budget || ""),
    progress: Number(raw?.progress || 0),
    status: (raw?.status || "planning") as ProjectStatus,
    targetMarkets,
    description: String(raw?.description || ""),
    remark: String(raw?.remark || ""),
    createdAt: toInputDate(raw?.createdAt),
    updatedAt: toInputDate(raw?.updatedAt),
    projectData,
  };
}

function MetricCard({
  label,
  value,
  helper,
  className = "",
}: {
  label: string;
  value: string | number;
  helper?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

function MarketChips({
  value,
  onToggle,
}: {
  value: RegulatoryMarket[];
  onToggle: (market: RegulatoryMarket) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MARKET_OPTIONS.map((item) => {
        const selected = value.includes(item.value);
        return (
          <Button
            key={item.value}
            type="button"
            variant={selected ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle(item.value)}
          >
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}

export default function ProjectsPage() {
  const [, navigate] = useLocation();
  const trpcAny = trpc as any;
  const { data: rawProjects = [], isLoading, refetch } = trpcAny.rdProjects.list.useQuery();
  const { data: rawUsers = [] } = trpcAny.users.list.useQuery();
  const { data: rawProducts = [] } = trpcAny.products.list.useQuery({ limit: 500 });

  const createMutation = trpcAny.rdProjects.create.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("研发项目已创建");
      setDialogOpen(false);
    },
  });
  const updateMutation = trpcAny.rdProjects.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("研发项目已保存");
    },
  });
  const deleteMutation = trpcAny.rdProjects.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("研发项目已删除");
    },
  });
  const uploadDeliverableAttachmentMutation = trpcAny.rdProjects.uploadDeliverableAttachment.useMutation();
  const saveDeliverableContentMutation = trpcAny.rdProjects.saveDeliverableContent.useMutation();
  const generateDeliverableAiContentMutation = trpcAny.rdProjects.generateDeliverableAiContent.useMutation();
  const createRaProjectMutation = trpcAny.ra.projects.create.useMutation();
  const translateToEnglishMutation = trpcAny.ra.ai.translateToEnglish.useMutation();

  const users = rawUsers as any[];
  const products = rawProducts as any[];
  const userMap = useMemo(() => new Map(users.map((item) => [Number(item.id), item])), [users]);
  const productMap = useMemo(() => new Map(products.map((item) => [Number(item.id), item])), [products]);
  const projects = useMemo(() => (rawProjects as any[]).map(normalizeProjectRecord), [rawProjects]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [leaderFilter, setLeaderFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMaximized, setDialogMaximized] = useState(false);
  const [editingProject, setEditingProject] = useState<NormalizedProject | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(() => createEmptyFormData([]));

  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [workbenchMaximized, setWorkbenchMaximized] = useState(false);
  const [workbenchProject, setWorkbenchProject] = useState<NormalizedProject | null>(null);
  const [workbenchMeta, setWorkbenchMeta] = useState<ProjectFormData | null>(null);
  const [workspaceDraft, setWorkspaceDraft] = useState<ProjectWorkspaceData | null>(null);
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState("overview");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingDeliverableUploadId, setPendingDeliverableUploadId] = useState<string | null>(null);
  const [deliverableEditorOpen, setDeliverableEditorOpen] = useState(false);
  const [deliverableEditorMaximized, setDeliverableEditorMaximized] = useState(false);
  const [deliverableReviewOpen, setDeliverableReviewOpen] = useState(false);
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null);
  const [reviewingDeliverableId, setReviewingDeliverableId] = useState<string | null>(null);
  const [deliverableDraftContent, setDeliverableDraftContent] = useState("");
  const [deliverableAiPrompt, setDeliverableAiPrompt] = useState("");
  const [deliverableSaveStatus, setDeliverableSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [deliverableSavedAt, setDeliverableSavedAt] = useState("");
  const deliverableEditorRef = useRef<HTMLDivElement | null>(null);
  const [structuredReportDraft, setStructuredReportDraft] = useState<StructuredReportData | null>(null);
  const deliverableSelectionRef = useRef<Range | null>(null);
  const [translatorOpen, setTranslatorOpen] = useState(false);
  const [translatorSource, setTranslatorSource] = useState("");
  const [translatorResult, setTranslatorResult] = useState("");
  const [translatorLoading, setTranslatorLoading] = useState(false);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const keyword = searchTerm.trim().toLowerCase();
      const leaderName = project.leaderId ? String(userMap.get(project.leaderId)?.name || "") : "";
      const productName = project.productId ? String(productMap.get(project.productId)?.name || "") : "";
      const matchesSearch =
        !keyword ||
        project.projectNo.toLowerCase().includes(keyword) ||
        project.name.toLowerCase().includes(keyword) ||
        leaderName.toLowerCase().includes(keyword) ||
        productName.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      const matchesStage = stageFilter === "all" || project.currentStage === stageFilter;
      const matchesMarket = marketFilter === "all" || project.targetMarkets.includes(marketFilter as RegulatoryMarket);
      const matchesLeader = leaderFilter === "all" || String(project.leaderId || "") === leaderFilter;
      const matchesOverdue = !overdueOnly || isProjectOverdue(project);
      return matchesSearch && matchesStatus && matchesStage && matchesMarket && matchesLeader && matchesOverdue;
    });
  }, [projects, searchTerm, statusFilter, stageFilter, marketFilter, leaderFilter, overdueOnly, userMap, productMap]);

  const activeCount = projects.filter((item) => item.status === "planning" || item.status === "in_progress" || item.status === "testing").length;
  const pendingGateCount = projects.filter(hasPendingGate).length;
  const overdueCount = projects.filter(isProjectOverdue).length;
  const pendingReleaseCount = projects.filter(hasPendingRelease).length;

  const resetDialog = () => {
    setEditingProject(null);
    setFormData(createEmptyFormData(projects));
    setDialogOpen(true);
  };

  const handleEdit = (project: NormalizedProject) => {
    setEditingProject(project);
    setFormData(projectToForm(project));
    setDialogOpen(true);
  };

  const openWorkbench = (project: NormalizedProject) => {
    setWorkbenchProject(project);
    setWorkbenchMeta(projectToForm(project));
    setWorkspaceDraft(cloneJson(project.projectData));
    setActiveWorkbenchTab("overview");
    setWorkbenchOpen(true);
  };

  const toggleFormMarket = (market: RegulatoryMarket) => {
    setFormData((current) => {
      const nextMarkets = current.targetMarkets.includes(market)
        ? current.targetMarkets.filter((item) => item !== market)
        : [...current.targetMarkets, market];
      const safeMarkets = (nextMarkets.length > 0 ? nextMarkets : ["CN_NMPA"]) as RegulatoryMarket[];
      return {
        ...current,
        targetMarkets: safeMarkets,
        projectData: mergeWorkspaceWithMarkets(current.projectData, safeMarkets),
      };
    });
  };

  const toggleWorkbenchMarket = (market: RegulatoryMarket) => {
    if (!workbenchMeta || !workspaceDraft) return;
    const nextMarkets = workbenchMeta.targetMarkets.includes(market)
      ? workbenchMeta.targetMarkets.filter((item) => item !== market)
      : [...workbenchMeta.targetMarkets, market];
    const safeMarkets = (nextMarkets.length > 0 ? nextMarkets : ["CN_NMPA"]) as RegulatoryMarket[];
    setWorkbenchMeta({
      ...workbenchMeta,
      targetMarkets: safeMarkets,
    });
    setWorkspaceDraft(mergeWorkspaceWithMarkets(workspaceDraft, safeMarkets));
  };

  const buildPayload = (data: ProjectFormData, projectData: ProjectWorkspaceData) => ({
    name: data.name.trim(),
    type: data.type,
    productId: toOptionalNumber(data.productId),
    leaderId: toOptionalNumber(data.leaderId),
    raOwnerId: toOptionalNumber(data.raOwnerId),
    qaOwnerId: toOptionalNumber(data.qaOwnerId),
    productionOwnerId: toOptionalNumber(data.productionOwnerId),
    clinicalOwnerId: toOptionalNumber(data.clinicalOwnerId),
    projectCategory: data.projectCategory,
    developmentType: data.developmentType,
    priority: data.priority,
    currentStage: data.currentStage,
    releaseStatus: data.releaseStatus,
    startDate: data.startDate || undefined,
    endDate: data.endDate || undefined,
    targetFinishDate: data.targetFinishDate || undefined,
    actualFinishDate: data.actualFinishDate || undefined,
    launchDate: data.launchDate || undefined,
    budget: data.budget || undefined,
    progress: Number(data.progress || 0),
    status: data.status,
    targetMarkets: data.targetMarkets,
    projectData,
    description: data.description || undefined,
    remark: data.remark || undefined,
  });

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.leaderId || !formData.projectCategory) {
      toast.error("请先补齐项目名称、项目负责人和项目类别");
      return;
    }

    const projectData = mergeWorkspaceWithMarkets(formData.projectData, formData.targetMarkets);
    if (editingProject) {
      await updateMutation.mutateAsync({
        id: editingProject.id,
        data: buildPayload(formData, projectData),
      });
      setDialogOpen(false);
      return;
    }

    await createMutation.mutateAsync({
      projectNo: formData.projectNo || undefined,
      ...buildPayload(formData, projectData),
    });
  };

  const handleDelete = async (project: NormalizedProject) => {
    if (!window.confirm(`确认删除研发项目「${project.name}」吗？`)) return;
    await deleteMutation.mutateAsync({ id: project.id });
  };

  const updateWorkspaceListItem = <K extends keyof ProjectWorkspaceData>(
    key: K,
    id: string,
    updater: (item: any) => any,
  ) => {
    setWorkspaceDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        [key]: (current[key] as any[]).map((item) => (String(item.id) === id ? updater(item) : item)),
      };
    });
  };

  const addWorkspaceRow = (key: keyof ProjectWorkspaceData) => {
    setWorkspaceDraft((current) => {
      if (!current) return current;
      if (key === "members") {
        return {
          ...current,
          members: [...current.members, { id: makeId("member"), userId: null, name: "", department: "", role: "成员", responsibility: "", isCore: false }],
        };
      }
      if (key === "trials") {
        return {
          ...current,
          trials: [...current.trials, { id: makeId("trial"), trialType: "样机试制", taskNo: "", batchNo: "", quantity: "", planDate: "", actualDate: "", productionStatus: "", inspectionStatus: "", conclusion: "" }],
        };
      }
      if (key === "changes") {
        return {
          ...current,
          changes: [...current.changes, { id: makeId("change"), changeNo: "", changeType: "设计变更", reason: "", regulatoryImpact: "", riskImpact: "", decision: "", status: "草稿", effectiveDate: "" }],
        };
      }
      if (key === "postMarketItems") {
        return {
          ...current,
          postMarketItems: [...current.postMarketItems, { id: makeId("post"), category: "PMS", itemNo: "", status: "待启动", ownerName: "", closedAt: "", notes: "" }],
        };
      }
      return current;
    });
  };

  const removeWorkspaceRow = (key: keyof ProjectWorkspaceData, id: string) => {
    setWorkspaceDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        [key]: (current[key] as any[]).filter((item) => String(item.id) !== id),
      };
    });
  };

  const handleWorkspaceSave = async () => {
    if (!workbenchProject || !workbenchMeta || !workspaceDraft) return;
    const nextProjectData = mergeWorkspaceWithMarkets(workspaceDraft, workbenchMeta.targetMarkets);
    await updateMutation.mutateAsync({
      id: workbenchProject.id,
      data: buildPayload(workbenchMeta, nextProjectData),
    });
    const nextProject = normalizeProjectRecord({
      ...workbenchProject,
      ...buildPayload(workbenchMeta, nextProjectData),
      updatedAt: new Date().toISOString(),
    });
    setWorkbenchProject(nextProject);
    setWorkspaceDraft(cloneJson(nextProjectData));
  };

  const handleDeliverableUploadClick = (deliverableId: string) => {
    setPendingDeliverableUploadId(deliverableId);
    fileInputRef.current?.click();
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleDeliverableFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !pendingDeliverableUploadId || !workbenchProject) return;

    try {
      const base64 = await fileToBase64(file);
      const uploaded = await uploadDeliverableAttachmentMutation.mutateAsync({
        projectId: workbenchProject.id,
        deliverableId: pendingDeliverableUploadId,
        name: file.name,
        mimeType: file.type,
        base64,
      });
      setWorkspaceDraft((current) => {
        if (!current) return current;
        const deliverables = current.deliverables.map((item) => {
          if (item.id !== pendingDeliverableUploadId) return item;
          return {
            ...item,
            attachments: [...item.attachments, uploaded],
            lastRevisedAt: new Date().toISOString().slice(0, 10),
            status: item.status === "not_started" ? "draft" : item.status,
          };
        });
        return mergeWorkspaceWithMarkets({ ...current, deliverables }, workbenchMeta?.targetMarkets || workbenchProject.targetMarkets);
      });
      toast.success("输出物附件已上传");
    } catch (error: any) {
      toast.error(error?.message || "附件上传失败");
    } finally {
      event.target.value = "";
      setPendingDeliverableUploadId(null);
    }
  };

  const handleCreateOrOpenRaTrack = async (track: ProjectRegulatoryTrack) => {
    if (!workbenchProject || !workspaceDraft) return;
    if (track.raProjectId) {
      navigate(`/ra/workspace/${track.raProjectId}`);
      return;
    }

    const productId = workbenchProject.productId || undefined;
    const ownerId = track.ownerId || workbenchProject.raOwnerId || undefined;
    const result = await createRaProjectMutation.mutateAsync({
      name: `${workbenchProject.name}-${MARKET_LABELS[track.market]}项目`,
      market: track.market,
      productId,
      ownerId,
    });

    const nextDraft = {
      ...workspaceDraft,
      regulatoryTracks: workspaceDraft.regulatoryTracks.map((item) =>
        item.id === track.id
          ? { ...item, raProjectId: Number(result.id), status: item.status === "planning" ? "in_progress" : item.status }
          : item
      ),
    };
    setWorkspaceDraft(nextDraft);
    await updateMutation.mutateAsync({
      id: workbenchProject.id,
      data: buildPayload(workbenchMeta || projectToForm(workbenchProject), mergeWorkspaceWithMarkets(nextDraft, workbenchMeta?.targetMarkets || workbenchProject.targetMarkets)),
    });
    navigate(`/ra/workspace/${result.id}`);
  };

  const linkedWorkbenchProduct = workbenchMeta?.productId ? productMap.get(Number(workbenchMeta.productId)) : null;
  const activeDeliverable = useMemo(
    () => workspaceDraft?.deliverables.find((item) => item.id === editingDeliverableId) || null,
    [workspaceDraft, editingDeliverableId]
  );
  const reviewingDeliverable = useMemo(
    () => workspaceDraft?.deliverables.find((item) => item.id === reviewingDeliverableId) || null,
    [workspaceDraft, reviewingDeliverableId]
  );
  const isStructuredReportDeliverable = activeDeliverable?.code === "QTQP11-10";

  const openDeliverableEditor = (deliverable: ProjectDeliverable) => {
    if (!workbenchProject) return;
    const template = buildDeliverableTemplateHtml({
      project: workbenchProject,
      deliverable,
      product: linkedWorkbenchProduct,
    });
    const structuredTemplate = deliverable.code === "QTQP11-10"
      ? (deliverable.structuredData || createStructuredReportFromContext({
          companyName: "苏州神韵医疗器械有限公司",
          projectNo: workbenchProject.projectNo,
          projectName: workbenchProject.name,
          targetMarkets: workbenchProject.targetMarkets.map((item) => MARKET_LABELS[item]),
          deliverableCode: deliverable.code,
          deliverableName: deliverable.name,
          version: deliverable.version,
          ownerName: deliverable.ownerName,
          stageName: deliverable.stageName,
          product: linkedWorkbenchProduct,
        }))
      : null;
    setEditingDeliverableId(deliverable.id);
    setDeliverableDraftContent(normalizeDeliverableEditorHtml(deliverable.content?.trim() ? deliverable.content : template));
    setStructuredReportDraft(structuredTemplate);
    setDeliverableAiPrompt("");
    setDeliverableSaveStatus("idle");
    setDeliverableSavedAt(deliverable.contentUpdatedAt || "");
    setDeliverableEditorOpen(true);
  };

  const openDeliverableReview = (deliverable: ProjectDeliverable) => {
    setReviewingDeliverableId(deliverable.id);
    setDeliverableReviewOpen(true);
  };

  const applyDeliverableContentLocal = (deliverableId: string, content: string, savedAt?: string, structuredData?: StructuredReportData | null) => {
    setWorkspaceDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        deliverables: current.deliverables.map((item) =>
          item.id === deliverableId
            ? {
                ...item,
                content,
                structuredData: structuredData ?? item.structuredData,
                templateName: item.templateName || item.name,
                contentUpdatedAt: savedAt || item.contentUpdatedAt,
                status: item.status === "not_started" ? "draft" : item.status,
                lastRevisedAt: savedAt ? savedAt.slice(0, 10) : item.lastRevisedAt,
              }
            : item
        ),
      };
    });
  };

  const persistDeliverableContent = async (showToastMessage = false) => {
    if (!deliverableEditorOpen || !editingDeliverableId || !workbenchProject || !activeDeliverable) return true;
    const contentToSave = isStructuredReportDeliverable && structuredReportDraft
      ? buildStructuredReportPrintableDocument(structuredReportDraft)
      : deliverableDraftContent;

    try {
      setDeliverableSaveStatus("saving");
      const result = await saveDeliverableContentMutation.mutateAsync({
        projectId: workbenchProject.id,
        deliverableId: editingDeliverableId,
        content: contentToSave,
        structuredData: isStructuredReportDeliverable ? structuredReportDraft : undefined,
        templateName: activeDeliverable.templateName || activeDeliverable.name,
        version: activeDeliverable.version,
        ownerName: activeDeliverable.ownerName,
        status: activeDeliverable.status === "not_started" ? "draft" : activeDeliverable.status,
      });
      applyDeliverableContentLocal(editingDeliverableId, contentToSave, result.savedAt, structuredReportDraft);
      setDeliverableSaveStatus("saved");
      setDeliverableSavedAt(result.savedAt);
      if (showToastMessage) {
        toast.success("文档内容已保存");
      }
      return true;
    } catch {
      setDeliverableSaveStatus("error");
      if (showToastMessage) {
        toast.error("文档保存失败");
      }
      return false;
    }
  };

  useEffect(() => {
    if (!deliverableEditorOpen || !editingDeliverableId || !workbenchProject || !activeDeliverable) return;
    const timer = window.setTimeout(async () => {
      await persistDeliverableContent(false);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    deliverableEditorOpen,
    editingDeliverableId,
    deliverableDraftContent,
    structuredReportDraft,
    workbenchProject,
    activeDeliverable?.version,
    activeDeliverable?.ownerName,
    activeDeliverable?.status,
  ]);

  const handleDeliverableEditorClose = async () => {
    if (saveDeliverableContentMutation.isPending) {
      toast.info("正在保存，请稍候");
      return;
    }
    const saved = await persistDeliverableContent(false);
    if (!saved) {
      toast.error("关闭前保存失败，请先手动保存");
      return;
    }
    setDeliverableEditorOpen(false);
  };

  const handleInsertTemplate = () => {
    if (!workbenchProject || !activeDeliverable) return;
    if (activeDeliverable.code === "QTQP11-10") {
      setStructuredReportDraft(createStructuredReportFromContext({
        companyName: "苏州神韵医疗器械有限公司",
        projectNo: workbenchProject.projectNo,
        projectName: workbenchProject.name,
        targetMarkets: workbenchProject.targetMarkets.map((item) => MARKET_LABELS[item]),
        deliverableCode: activeDeliverable.code,
        deliverableName: activeDeliverable.name,
        version: activeDeliverable.version,
        ownerName: activeDeliverable.ownerName,
        stageName: activeDeliverable.stageName,
        product: linkedWorkbenchProduct,
      }));
      return;
    }
    setDeliverableDraftContent(
      buildDeliverableTemplateHtml({
        project: workbenchProject,
        deliverable: activeDeliverable,
        product: linkedWorkbenchProduct,
      })
    );
  };

  const handleGenerateAiContent = async () => {
    if (!workbenchProject || !editingDeliverableId) return;
    const result = await generateDeliverableAiContentMutation.mutateAsync({
      projectId: workbenchProject.id,
      deliverableId: editingDeliverableId,
      currentContent: deliverableDraftContent,
      userPrompt: deliverableAiPrompt,
    });
    setDeliverableDraftContent(normalizeDeliverableEditorHtml(result.content || deliverableDraftContent));
    toast.success("AI 初稿已生成");
  };

  useEffect(() => {
    if (!deliverableEditorOpen || !deliverableEditorRef.current) return;
    if (deliverableEditorRef.current.innerHTML !== deliverableDraftContent) {
      deliverableEditorRef.current.innerHTML = deliverableDraftContent;
    }
  }, [deliverableEditorOpen, deliverableDraftContent]);

  useEffect(() => {
    if (!translatorOpen) return;
    const text = translatorSource.trim();
    if (!text) {
      setTranslatorResult("");
      setTranslatorLoading(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setTranslatorLoading(true);
      const translated = await runTranslator(text);
      setTranslatorResult(translated);
      setTranslatorLoading(false);
    }, 260);

    return () => window.clearTimeout(timer);
  }, [translatorOpen, translatorSource]);

  useEffect(() => {
    const globalScope = globalThis as typeof globalThis & { customReportTranslator?: (text: string) => Promise<string> };
    globalScope.customReportTranslator = async (text: string) => {
      const result = await translateToEnglishMutation.mutateAsync({
        content: text,
        context: "研发输出物中英翻译",
      });
      return result.translatedContent || "";
    };

    return () => {
      delete globalScope.customReportTranslator;
    };
  }, [translateToEnglishMutation]);

  const runDeliverableEditorCommand = (command: string, value?: string) => {
    if (!deliverableEditorRef.current) return;
    deliverableEditorRef.current.focus();
    document.execCommand(command, false, value);
    setDeliverableDraftContent(deliverableEditorRef.current.innerHTML);
  };

  const rememberDeliverableSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (deliverableEditorRef.current?.contains(range.commonAncestorContainer)) {
      deliverableSelectionRef.current = range.cloneRange();
    }
  };

  const getSelectedEditorText = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return "";
    const range = selection.getRangeAt(0);
    if (!deliverableEditorRef.current?.contains(range.commonAncestorContainer)) return "";
    return selection.toString().trim();
  };

  const handleOpenTranslator = async () => {
    rememberDeliverableSelection();
    const selected = getSelectedEditorText();
    const nextSource = selected || translatorSource;
    setTranslatorSource(nextSource);
    setTranslatorOpen(true);
    if (nextSource.trim()) {
      setTranslatorLoading(true);
      const translated = await runTranslator(nextSource);
      setTranslatorResult(translated);
      setTranslatorLoading(false);
    } else {
      setTranslatorResult("");
    }
  };

  const handleTranslatorRun = async () => {
    setTranslatorLoading(true);
    const translated = await runTranslator(translatorSource);
    setTranslatorResult(translated);
    setTranslatorLoading(false);
  };

  const handleTranslatorInsert = async () => {
    if (!translatorResult.trim()) {
      await handleTranslatorRun();
    }
    if (!deliverableEditorRef.current) return;
    deliverableEditorRef.current.focus();

    const selection = window.getSelection();
    selection?.removeAllRanges();
    if (deliverableSelectionRef.current) {
      selection?.addRange(deliverableSelectionRef.current);
    }

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(translatorResult));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      deliverableSelectionRef.current = range.cloneRange();
    } else {
      deliverableEditorRef.current.appendChild(document.createTextNode(translatorResult));
    }

    setDeliverableDraftContent(deliverableEditorRef.current.innerHTML);
    setTranslatorOpen(false);
    toast.success("翻译内容已插入");
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">项目管理</h2>
              <p className="text-sm text-muted-foreground">围绕立项、设计开发、验证确认、设计转换、法规申报和上市后变更管理研发项目</p>
            </div>
          </div>
          <Button onClick={resetDialog}>
            <Plus className="mr-1 h-4 w-4" />
            新建项目
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 xl:grid-cols-5">
          <MetricCard label="项目总数" value={projects.length} />
          <MetricCard label="进行中项目" value={activeCount} className="border-blue-200" />
          <MetricCard label="待关卡评审" value={pendingGateCount} className="border-amber-200" />
          <MetricCard label="逾期项目" value={overdueCount} className="border-rose-200" />
          <MetricCard label="待上市放行" value={pendingReleaseCount} className="border-emerald-200" />
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-6">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="搜索项目编号、名称、负责人、产品"
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="项目状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger><SelectValue placeholder="当前阶段" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部阶段</SelectItem>
                  {STAGE_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={marketFilter} onValueChange={setMarketFilter}>
                <SelectTrigger><SelectValue placeholder="目标市场" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部市场</SelectItem>
                  {MARKET_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={leaderFilter} onValueChange={setLeaderFilter}>
                <SelectTrigger><SelectValue placeholder="项目负责人" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部负责人</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>{user.name || `用户${user.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox checked={overdueOnly} onCheckedChange={(checked) => setOverdueOnly(Boolean(checked))} />
                <span className="text-sm text-muted-foreground">只看逾期项目</span>
              </div>
              <Badge variant="outline">共 {filteredProjects.length} 个项目</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>项目编号</TableHead>
                  <TableHead>项目名称</TableHead>
                  <TableHead>目标市场</TableHead>
                  <TableHead>当前阶段</TableHead>
                  <TableHead>项目状态</TableHead>
                  <TableHead>输出物</TableHead>
                  <TableHead>法规完成</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>目标完成</TableHead>
                  <TableHead>最后更新</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                      研发项目加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                      暂无匹配项目
                    </TableCell>
                  </TableRow>
                ) : filteredProjects.map((project) => {
                  const deliverableStats = getDeliverableStats(project.projectData);
                  const regulatoryStats = getRegulatoryStats(project.projectData);
                  const linkedProduct = project.productId ? productMap.get(project.productId) : null;
                  const leader = project.leaderId ? userMap.get(project.leaderId) : null;
                  return (
                    <TableRow key={project.id} className="align-top">
                      <TableCell className="font-medium">{project.projectNo}</TableCell>
                      <TableCell>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {linkedProduct ? `${linkedProduct.code || ""} ${linkedProduct.name || ""}`.trim() : "未关联产品"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {project.targetMarkets.map((market) => (
                            <Badge key={market} variant="outline" className={MARKET_BADGE_CLASS[market]}>
                              {MARKET_LABELS[market]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{project.currentStage}</div>
                        {hasPendingGate(project) ? (
                          <div className="mt-1 text-xs text-amber-600">当前关卡待通过</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{STATUS_LABELS[project.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="w-28">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span>{deliverableStats.done}/{deliverableStats.total}</span>
                            <span>{deliverableStats.percent}%</span>
                          </div>
                          <Progress value={deliverableStats.percent} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-28">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span>{regulatoryStats.approved}/{regulatoryStats.total}</span>
                            <span>{regulatoryStats.averageProgress}%</span>
                          </div>
                          <Progress value={regulatoryStats.averageProgress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>{leader?.name || "-"}</TableCell>
                      <TableCell>
                        <div>{project.targetFinishDate || "-"}</div>
                        {isProjectOverdue(project) ? (
                          <div className="mt-1 text-xs text-rose-600">已逾期</div>
                        ) : null}
                      </TableCell>
                      <TableCell>{formatDateValue(project.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openWorkbench(project)}>
                            <Eye className="mr-1 h-4 w-4" />
                            工作台
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(project)}>
                            <Edit className="mr-1 h-4 w-4" />
                            编辑
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(project)}>
                            <Trash2 className="mr-1 h-4 w-4" />
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <DraggableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultWidth={1120}
        defaultHeight={820}
        isMaximized={dialogMaximized}
        onMaximizedChange={setDialogMaximized}
      >
        <DraggableDialogContent isMaximized={dialogMaximized}>
          <DialogHeader>
            <DialogTitle>{editingProject ? "编辑研发项目" : "新建研发项目"}</DialogTitle>
            <DialogDescription>先完成项目基础建档，详细的阶段、输出物、法规轨道和变更管理在项目工作台里继续维护。</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>项目编号</Label>
                <Input value={formData.projectNo} disabled placeholder="系统自动生成" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>项目名称 *</Label>
                <Input value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} placeholder="请输入项目名称" />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>关联产品</Label>
                <Select
                  value={formData.productId || undefined}
                  onValueChange={(value) => {
                    const product = productMap.get(Number(value));
                    setFormData({
                      ...formData,
                      productId: value,
                      projectData: {
                        ...formData.projectData,
                        profile: {
                          ...formData.projectData.profile,
                          riskLevel: formData.projectData.profile.riskLevel || String(product?.riskLevel || ""),
                          registrationNo: formData.projectData.profile.registrationNo || String(product?.registrationNo || ""),
                          udiDi: formData.projectData.profile.udiDi || String(product?.udiDi || ""),
                          isSterile: formData.projectData.profile.isSterile || Boolean(product?.isSterilized),
                        },
                      },
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="选择产品" /></SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.code} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>项目类型</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as ProjectType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>项目类别 *</Label>
                <Select value={formData.projectCategory} onValueChange={(value) => setFormData({ ...formData, projectCategory: value })}>
                  <SelectTrigger><SelectValue placeholder="选择项目类别" /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_CATEGORY_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>项目负责人 *</Label>
                <Select value={formData.leaderId || undefined} onValueChange={(value) => setFormData({ ...formData, leaderId: value })}>
                  <SelectTrigger><SelectValue placeholder="选择负责人" /></SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>{user.name || `用户${user.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>法规负责人</Label>
                <Select value={formData.raOwnerId || undefined} onValueChange={(value) => setFormData({ ...formData, raOwnerId: value })}>
                  <SelectTrigger><SelectValue placeholder="选择法规负责人" /></SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>{user.name || `用户${user.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>质量负责人</Label>
                <Select value={formData.qaOwnerId || undefined} onValueChange={(value) => setFormData({ ...formData, qaOwnerId: value })}>
                  <SelectTrigger><SelectValue placeholder="选择质量负责人" /></SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>{user.name || `用户${user.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>生产负责人</Label>
                <Select value={formData.productionOwnerId || undefined} onValueChange={(value) => setFormData({ ...formData, productionOwnerId: value })}>
                  <SelectTrigger><SelectValue placeholder="选择生产负责人" /></SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>{user.name || `用户${user.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>临床/医学负责人</Label>
                <Select value={formData.clinicalOwnerId || undefined} onValueChange={(value) => setFormData({ ...formData, clinicalOwnerId: value })}>
                  <SelectTrigger><SelectValue placeholder="选择临床负责人" /></SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>{user.name || `用户${user.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>开发类型</Label>
                <Select value={formData.developmentType} onValueChange={(value) => setFormData({ ...formData, developmentType: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEVELOPMENT_TYPE_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>优先级</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>当前状态</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as ProjectStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>目标市场</Label>
              <MarketChips value={formData.targetMarkets} onToggle={toggleFormMarket} />
              <p className="text-xs text-muted-foreground">切换市场时会自动增删对应的法规输出物、法规轨道和放行检查项。</p>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>项目开始</Label>
                <Input type="date" value={formData.startDate} onChange={(event) => setFormData({ ...formData, startDate: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>计划完成</Label>
                <Input type="date" value={formData.targetFinishDate} onChange={(event) => setFormData({ ...formData, targetFinishDate: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>当前阶段</Label>
                <Select value={formData.currentStage} onValueChange={(value) => setFormData({ ...formData, currentStage: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGE_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>上市放行</Label>
                <Select value={formData.releaseStatus} onValueChange={(value) => setFormData({ ...formData, releaseStatus: value as ReleaseStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELEASE_STATUS_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>项目预算</Label>
                <Input type="number" min={0} step={0.01} value={formData.budget} onChange={(event) => setFormData({ ...formData, budget: event.target.value })} placeholder="预算金额" />
              </div>
              <div className="space-y-2">
                <Label>项目进度 %</Label>
                <Input type="number" min={0} max={100} value={formData.progress} onChange={(event) => setFormData({ ...formData, progress: event.target.value })} placeholder="0-100" />
              </div>
              <div className="space-y-2">
                <Label>目标上市日期</Label>
                <Input type="date" value={formData.launchDate} onChange={(event) => setFormData({ ...formData, launchDate: event.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>项目说明</Label>
              <Textarea value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} placeholder="项目背景、范围、立项目的" rows={4} />
            </div>

            <div className="space-y-2">
              <Label>补充备注</Label>
              <Textarea value={formData.remark} onChange={(event) => setFormData({ ...formData, remark: event.target.value })} placeholder="其他需要说明的事项" rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingProject ? "保存项目" : "创建项目"}
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      <DraggableDialog
        open={workbenchOpen}
        onOpenChange={setWorkbenchOpen}
        defaultWidth={1320}
        defaultHeight={900}
        isMaximized={workbenchMaximized}
        onMaximizedChange={setWorkbenchMaximized}
      >
        <DraggableDialogContent isMaximized={workbenchMaximized}>
          {workbenchProject && workbenchMeta && workspaceDraft ? (
            <>
              <DialogHeader>
                <DialogTitle>{workbenchProject.name} - 项目工作台</DialogTitle>
                <DialogDescription>在一个项目里统一推进阶段计划、输出物、试制验证、法规轨道、设计变更和上市后动作。</DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-4">
                <div className="grid gap-4 grid-cols-2 xl:grid-cols-6">
                  <MetricCard label="当前阶段" value={workbenchMeta.currentStage} />
                  <MetricCard label="项目状态" value={STATUS_LABELS[workbenchMeta.status]} />
                  <MetricCard label="项目进度" value={`${workbenchMeta.progress}%`} />
                  <MetricCard label="输出物完成" value={`${getDeliverableStats(workspaceDraft).done}/${getDeliverableStats(workspaceDraft).total}`} helper={`${getDeliverableStats(workspaceDraft).percent}%`} />
                  <MetricCard label="法规平均进度" value={`${getRegulatoryStats(workspaceDraft).averageProgress}%`} helper={`${getRegulatoryStats(workspaceDraft).approved}/${getRegulatoryStats(workspaceDraft).total} 轨道已批准`} />
                  <MetricCard label="上市放行" value={workbenchMeta.releaseStatus} helper={hasPendingRelease({ ...workbenchProject, ...normalizeProjectRecord({ ...workbenchProject, targetMarkets: workbenchMeta.targetMarkets, projectData: workspaceDraft, releaseStatus: workbenchMeta.releaseStatus }) }) ? "仍有检查项未通过" : "当前检查正常"} />
                </div>

                <Tabs value={activeWorkbenchTab} onValueChange={setActiveWorkbenchTab}>
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">项目总览</TabsTrigger>
                    <TabsTrigger value="stages">阶段计划</TabsTrigger>
                    <TabsTrigger value="deliverables">输出物清单</TabsTrigger>
                    <TabsTrigger value="validation">试制与验证</TabsTrigger>
                    <TabsTrigger value="regulatory">法规申报</TabsTrigger>
                    <TabsTrigger value="changes">设计变更与上市后</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-5">
                    <Card>
                      <CardContent className="grid gap-4 p-4 md:grid-cols-4">
                        <div className="space-y-2">
                          <Label>当前阶段</Label>
                          <Select value={workbenchMeta.currentStage} onValueChange={(value) => setWorkbenchMeta({ ...workbenchMeta, currentStage: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STAGE_OPTIONS.map((item) => (
                                <SelectItem key={item} value={item}>{item}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>项目状态</Label>
                          <Select value={workbenchMeta.status} onValueChange={(value) => setWorkbenchMeta({ ...workbenchMeta, status: value as ProjectStatus })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((item) => (
                                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>项目进度</Label>
                          <Input type="number" min={0} max={100} value={workbenchMeta.progress} onChange={(event) => setWorkbenchMeta({ ...workbenchMeta, progress: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>上市放行</Label>
                          <Select value={workbenchMeta.releaseStatus} onValueChange={(value) => setWorkbenchMeta({ ...workbenchMeta, releaseStatus: value as ReleaseStatus })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {RELEASE_STATUS_OPTIONS.map((item) => (
                                <SelectItem key={item} value={item}>{item}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-4">
                          <Label>目标市场</Label>
                          <MarketChips value={workbenchMeta.targetMarkets} onToggle={toggleWorkbenchMarket} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <ClipboardList className="h-4 w-4 text-primary" />
                          项目与法规基础
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2 md:col-span-2">
                            <Label>预期用途</Label>
                            <Textarea
                              value={workspaceDraft.profile.intendedUse}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, intendedUse: event.target.value } })}
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>风险等级</Label>
                            <Input
                              value={workspaceDraft.profile.riskLevel}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, riskLevel: event.target.value } })}
                              placeholder="I / II / III"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>适应症</Label>
                            <Textarea
                              value={workspaceDraft.profile.indications}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, indications: event.target.value } })}
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>禁忌症</Label>
                            <Textarea
                              value={workspaceDraft.profile.contraindications}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, contraindications: event.target.value } })}
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>目标患者/用户</Label>
                            <Textarea
                              value={`${workspaceDraft.profile.targetPatients}${workspaceDraft.profile.targetPatients && workspaceDraft.profile.targetUsers ? "\n" : ""}${workspaceDraft.profile.targetUsers}`}
                              onChange={(event) => {
                                const [patients = "", usersText = ""] = String(event.target.value).split("\n");
                                setWorkspaceDraft({
                                  ...workspaceDraft,
                                  profile: { ...workspaceDraft.profile, targetPatients: patients, targetUsers: usersText },
                                });
                              }}
                              rows={2}
                              placeholder="第一行患者人群，第二行预期使用者"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>使用环境</Label>
                            <Input
                              value={workspaceDraft.profile.useEnvironment}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, useEnvironment: event.target.value } })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>工作原理</Label>
                            <Input
                              value={workspaceDraft.profile.workingPrinciple}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, workingPrinciple: event.target.value } })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>主要材料</Label>
                            <Input
                              value={workspaceDraft.profile.mainMaterials}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, mainMaterials: event.target.value } })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>中国分类</Label>
                            <Input
                              value={workspaceDraft.profile.deviceClassCn}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, deviceClassCn: event.target.value } })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>欧盟分类</Label>
                            <Input
                              value={workspaceDraft.profile.deviceClassEu}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, deviceClassEu: event.target.value } })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>FDA 路径</Label>
                            <Input
                              value={workspaceDraft.profile.fdaPathway}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, fdaPathway: event.target.value } })}
                              placeholder="510(k) / De Novo / PMA"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>NMPA 路径</Label>
                            <Input
                              value={workspaceDraft.profile.nmpaPathway}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, nmpaPathway: event.target.value } })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Basic UDI-DI</Label>
                            <Input
                              value={workspaceDraft.profile.basicUdiDi}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, basicUdiDi: event.target.value } })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>UDI-DI</Label>
                            <Input
                              value={workspaceDraft.profile.udiDi}
                              onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, udiDi: event.target.value } })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>SRN / GMDN / EMDN</Label>
                            <Textarea
                              value={[workspaceDraft.profile.srn, workspaceDraft.profile.gmdnCode, workspaceDraft.profile.emdnCode].filter(Boolean).join("\n")}
                              onChange={(event) => {
                                const [srn = "", gmdnCode = "", emdnCode = ""] = String(event.target.value).split("\n");
                                setWorkspaceDraft({
                                  ...workspaceDraft,
                                  profile: { ...workspaceDraft.profile, srn, gmdnCode, emdnCode },
                                });
                              }}
                              rows={3}
                              placeholder="第一行 SRN，第二行 GMDN，第三行 EMDN"
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={workspaceDraft.profile.isSterile}
                              onCheckedChange={(checked) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, isSterile: Boolean(checked) } })}
                            />
                            <span className="text-sm">无菌产品</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={workspaceDraft.profile.hasSoftware}
                              onCheckedChange={(checked) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, hasSoftware: Boolean(checked) } })}
                            />
                            <span className="text-sm">包含软件</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={workspaceDraft.profile.hasElectricalSafety}
                              onCheckedChange={(checked) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, hasElectricalSafety: Boolean(checked) } })}
                            />
                            <span className="text-sm">涉及电气安全</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={workspaceDraft.profile.isReusable}
                              onCheckedChange={(checked) => setWorkspaceDraft({ ...workspaceDraft, profile: { ...workspaceDraft.profile, isReusable: Boolean(checked) } })}
                            />
                            <span className="text-sm">可重复使用</span>
                          </div>
                        </div>
                  </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FolderKanban className="h-4 w-4 text-primary" />
                          关联产品信息
                        </div>
                        {linkedWorkbenchProduct ? (
                          <div className="grid gap-4 md:grid-cols-4">
                            <div className="rounded-lg border p-3">
                              <div className="text-xs text-muted-foreground">产品编码</div>
                              <div className="mt-1 font-medium">{linkedWorkbenchProduct.code || "-"}</div>
                            </div>
                            <div className="rounded-lg border p-3">
                              <div className="text-xs text-muted-foreground">产品名称</div>
                              <div className="mt-1 font-medium">{linkedWorkbenchProduct.name || "-"}</div>
                            </div>
                            <div className="rounded-lg border p-3">
                              <div className="text-xs text-muted-foreground">规格型号</div>
                              <div className="mt-1 font-medium">{linkedWorkbenchProduct.specification || "-"}</div>
                            </div>
                            <div className="rounded-lg border p-3">
                              <div className="text-xs text-muted-foreground">风险等级</div>
                              <div className="mt-1 font-medium">{linkedWorkbenchProduct.riskLevel || "-"}</div>
                            </div>
                            <div className="rounded-lg border p-3">
                              <div className="text-xs text-muted-foreground">注册证号</div>
                              <div className="mt-1 font-medium">{linkedWorkbenchProduct.registrationNo || "-"}</div>
                            </div>
                            <div className="rounded-lg border p-3">
                              <div className="text-xs text-muted-foreground">UDI-DI</div>
                              <div className="mt-1 font-medium break-all">{linkedWorkbenchProduct.udiDi || "-"}</div>
                            </div>
                            <div className="rounded-lg border p-3">
                              <div className="text-xs text-muted-foreground">是否灭菌</div>
                              <div className="mt-1 font-medium">{linkedWorkbenchProduct.isSterilized ? "是" : "否"}</div>
                            </div>
                            <div className="rounded-lg border p-3">
                              <div className="text-xs text-muted-foreground">产品描述</div>
                              <div className="mt-1 text-sm text-muted-foreground line-clamp-3">{linkedWorkbenchProduct.description || "-"}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                            当前项目未关联产品
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Users className="h-4 w-4 text-primary" />
                            项目团队
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => addWorkspaceRow("members")}>
                            <Plus className="mr-1 h-4 w-4" />
                            新增成员
                          </Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>成员</TableHead>
                              <TableHead>部门</TableHead>
                              <TableHead>角色</TableHead>
                              <TableHead>职责</TableHead>
                              <TableHead>核心成员</TableHead>
                              <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workspaceDraft.members.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">暂无项目成员</TableCell>
                              </TableRow>
                            ) : workspaceDraft.members.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell>
                                  <Select
                                    value={member.userId ? String(member.userId) : undefined}
                                    onValueChange={(value) => {
                                      const selected = userMap.get(Number(value));
                                      updateWorkspaceListItem("members", member.id, (item) => ({
                                        ...item,
                                        userId: Number(value),
                                        name: selected?.name || "",
                                        department: selected?.department || item.department,
                                      }));
                                    }}
                                  >
                                    <SelectTrigger><SelectValue placeholder="选择成员" /></SelectTrigger>
                                    <SelectContent>
                                      {users.map((user) => (
                                        <SelectItem key={user.id} value={String(user.id)}>{user.name || `用户${user.id}`}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input value={member.department} onChange={(event) => updateWorkspaceListItem("members", member.id, (item) => ({ ...item, department: event.target.value }))} />
                                </TableCell>
                                <TableCell>
                                  <Input value={member.role} onChange={(event) => updateWorkspaceListItem("members", member.id, (item) => ({ ...item, role: event.target.value }))} />
                                </TableCell>
                                <TableCell>
                                  <Input value={member.responsibility} onChange={(event) => updateWorkspaceListItem("members", member.id, (item) => ({ ...item, responsibility: event.target.value }))} />
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-center">
                                    <Checkbox checked={member.isCore} onCheckedChange={(checked) => updateWorkspaceListItem("members", member.id, (item) => ({ ...item, isCore: Boolean(checked) }))} />
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeWorkspaceRow("members", member.id)}>
                                    删除
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="stages" className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>阶段</TableHead>
                              <TableHead>关联表单</TableHead>
                              <TableHead>责任部门</TableHead>
                              <TableHead>责任人</TableHead>
                              <TableHead>计划起止</TableHead>
                              <TableHead>实际起止</TableHead>
                              <TableHead>状态</TableHead>
                              <TableHead>关卡结论</TableHead>
                              <TableHead>备注</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workspaceDraft.stages.map((stage) => (
                              <TableRow key={stage.id} className="align-top">
                                <TableCell className="font-medium">
                                  <div>{stage.name}</div>
                                  <div className="text-xs text-muted-foreground">{stage.code}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {stage.relatedForms.map((item) => (
                                      <Badge key={item} variant="outline">{item}</Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input value={stage.department} onChange={(event) => updateWorkspaceListItem("stages", stage.id, (item) => ({ ...item, department: event.target.value }))} />
                                </TableCell>
                                <TableCell>
                                  <Input value={stage.ownerName} onChange={(event) => updateWorkspaceListItem("stages", stage.id, (item) => ({ ...item, ownerName: event.target.value }))} placeholder="责任人" />
                                </TableCell>
                                <TableCell>
                                  <div className="grid gap-2">
                                    <Input type="date" value={stage.planStart} onChange={(event) => updateWorkspaceListItem("stages", stage.id, (item) => ({ ...item, planStart: event.target.value }))} />
                                    <Input type="date" value={stage.planEnd} onChange={(event) => updateWorkspaceListItem("stages", stage.id, (item) => ({ ...item, planEnd: event.target.value }))} />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="grid gap-2">
                                    <Input type="date" value={stage.actualStart} onChange={(event) => updateWorkspaceListItem("stages", stage.id, (item) => ({ ...item, actualStart: event.target.value }))} />
                                    <Input type="date" value={stage.actualEnd} onChange={(event) => updateWorkspaceListItem("stages", stage.id, (item) => ({ ...item, actualEnd: event.target.value }))} />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Select value={stage.status} onValueChange={(value) => updateWorkspaceListItem("stages", stage.id, (item) => ({ ...item, status: value as StageStatus }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="not_started">未开始</SelectItem>
                                      <SelectItem value="in_progress">进行中</SelectItem>
                                      <SelectItem value="completed">已完成</SelectItem>
                                      <SelectItem value="blocked">阻塞</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  {stage.gateRequired ? (
                                    <Select value={stage.gateResult} onValueChange={(value) => updateWorkspaceListItem("stages", stage.id, (item) => ({ ...item, gateResult: value as GateResult }))}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">待评审</SelectItem>
                                        <SelectItem value="pass">通过</SelectItem>
                                        <SelectItem value="fail">不通过</SelectItem>
                                        <SelectItem value="waived">豁免</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">非关卡</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Textarea value={stage.notes} onChange={(event) => updateWorkspaceListItem("stages", stage.id, (item) => ({ ...item, notes: event.target.value }))} rows={3} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="deliverables" className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            已预置中国设计开发 14 张表及所选市场的法规输出物。状态、版本、附件和责任人都可以在这里继续维护。
                          </div>
                          <Badge variant="secondary">总计 {workspaceDraft.deliverables.length} 项</Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>编号</TableHead>
                              <TableHead>输出物</TableHead>
                              <TableHead>阶段</TableHead>
                              <TableHead>法规属性</TableHead>
                              <TableHead>状态</TableHead>
                              <TableHead>版本</TableHead>
                              <TableHead>负责人</TableHead>
                              <TableHead>计划/完成</TableHead>
                              <TableHead>附件</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workspaceDraft.deliverables.map((deliverable) => (
                              <TableRow key={deliverable.id} className="align-top">
                                <TableCell className="font-mono text-xs">{deliverable.code}</TableCell>
                                <TableCell>
                                  <div className="font-medium">{deliverable.name}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">{deliverable.description}</div>
                                </TableCell>
                                <TableCell>{deliverable.stageName}</TableCell>
                                <TableCell>
                                  {deliverable.market === "COMMON" ? (
                                    <Badge variant="outline">通用</Badge>
                                  ) : (
                                    <Badge variant="outline" className={MARKET_BADGE_CLASS[deliverable.market]}>
                                      {MARKET_LABELS[deliverable.market]}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Select value={deliverable.status} onValueChange={(value) => setWorkspaceDraft(mergeWorkspaceWithMarkets({
                                    ...workspaceDraft,
                                    deliverables: workspaceDraft.deliverables.map((item) =>
                                      item.id === deliverable.id ? { ...item, status: value as DeliverableStatus } : item
                                    ),
                                  }, workbenchMeta.targetMarkets))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="not_started">未开始</SelectItem>
                                      <SelectItem value="draft">编制中</SelectItem>
                                      <SelectItem value="in_review">待评审</SelectItem>
                                      <SelectItem value="approved">已批准</SelectItem>
                                      <SelectItem value="archived">已归档</SelectItem>
                                      <SelectItem value="na">不适用</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input value={deliverable.version} onChange={(event) => updateWorkspaceListItem("deliverables", deliverable.id, (item) => ({ ...item, version: event.target.value }))} />
                                </TableCell>
                                <TableCell>
                                  <Input value={deliverable.ownerName} onChange={(event) => updateWorkspaceListItem("deliverables", deliverable.id, (item) => ({ ...item, ownerName: event.target.value }))} />
                                </TableCell>
                                <TableCell>
                                  <div className="grid gap-2">
                                    <Input type="date" value={deliverable.plannedDate} onChange={(event) => updateWorkspaceListItem("deliverables", deliverable.id, (item) => ({ ...item, plannedDate: event.target.value }))} />
                                    <Input type="date" value={deliverable.completedDate} onChange={(event) => updateWorkspaceListItem("deliverables", deliverable.id, (item) => ({ ...item, completedDate: event.target.value }))} />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => openDeliverableReview(deliverable)}>
                                      <Eye className="mr-1 h-4 w-4" />
                                      审核查看
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => openDeliverableEditor(deliverable)}>
                                      <FilePenLine className="mr-1 h-4 w-4" />
                                      在线编辑
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => handleDeliverableUploadClick(deliverable.id)}>
                                      <FileUp className="mr-1 h-4 w-4" />
                                      上传附件
                                    </Button>
                                    <div className="text-xs text-muted-foreground">
                                      {deliverable.content?.trim()
                                        ? `已在线编辑${deliverable.contentUpdatedAt ? ` · ${deliverable.contentUpdatedAt}` : ""}`
                                        : "未建立在线内容"}
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      {deliverable.attachments.length === 0 ? (
                                        <div className="text-muted-foreground">暂无附件</div>
                                      ) : deliverable.attachments.map((attachment) => (
                                        <a key={attachment.id} href={attachment.filePath} target="_blank" rel="noreferrer" className="block text-primary hover:underline">
                                          {attachment.name}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="validation" className="space-y-4">
                    <Card>
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <FlaskConical className="h-4 w-4 text-primary" />
                            试制与验证
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => addWorkspaceRow("trials")}>
                            <Plus className="mr-1 h-4 w-4" />
                            新增试制/验证
                          </Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>类型</TableHead>
                              <TableHead>任务单号</TableHead>
                              <TableHead>批号</TableHead>
                              <TableHead>数量</TableHead>
                              <TableHead>计划/实际日期</TableHead>
                              <TableHead>生产状态</TableHead>
                              <TableHead>检验状态</TableHead>
                              <TableHead>结论</TableHead>
                              <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workspaceDraft.trials.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground">暂无试制与验证记录</TableCell>
                              </TableRow>
                            ) : workspaceDraft.trials.map((trial) => (
                              <TableRow key={trial.id} className="align-top">
                                <TableCell><Input value={trial.trialType} onChange={(event) => updateWorkspaceListItem("trials", trial.id, (item) => ({ ...item, trialType: event.target.value }))} /></TableCell>
                                <TableCell><Input value={trial.taskNo} onChange={(event) => updateWorkspaceListItem("trials", trial.id, (item) => ({ ...item, taskNo: event.target.value }))} /></TableCell>
                                <TableCell><Input value={trial.batchNo} onChange={(event) => updateWorkspaceListItem("trials", trial.id, (item) => ({ ...item, batchNo: event.target.value }))} /></TableCell>
                                <TableCell><Input value={trial.quantity} onChange={(event) => updateWorkspaceListItem("trials", trial.id, (item) => ({ ...item, quantity: event.target.value }))} /></TableCell>
                                <TableCell>
                                  <div className="grid gap-2">
                                    <Input type="date" value={trial.planDate} onChange={(event) => updateWorkspaceListItem("trials", trial.id, (item) => ({ ...item, planDate: event.target.value }))} />
                                    <Input type="date" value={trial.actualDate} onChange={(event) => updateWorkspaceListItem("trials", trial.id, (item) => ({ ...item, actualDate: event.target.value }))} />
                                  </div>
                                </TableCell>
                                <TableCell><Input value={trial.productionStatus} onChange={(event) => updateWorkspaceListItem("trials", trial.id, (item) => ({ ...item, productionStatus: event.target.value }))} /></TableCell>
                                <TableCell><Input value={trial.inspectionStatus} onChange={(event) => updateWorkspaceListItem("trials", trial.id, (item) => ({ ...item, inspectionStatus: event.target.value }))} /></TableCell>
                                <TableCell><Textarea value={trial.conclusion} onChange={(event) => updateWorkspaceListItem("trials", trial.id, (item) => ({ ...item, conclusion: event.target.value }))} rows={2} /></TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeWorkspaceRow("trials", trial.id)}>删除</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          上市放行检查
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>检查项</TableHead>
                              <TableHead>市场</TableHead>
                              <TableHead>必需</TableHead>
                              <TableHead>通过</TableHead>
                              <TableHead>责任人</TableHead>
                              <TableHead>检查日期</TableHead>
                              <TableHead>备注</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workspaceDraft.releaseChecks.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.item}</TableCell>
                                <TableCell>{item.market === "COMMON" ? "通用" : MARKET_LABELS[item.market]}</TableCell>
                                <TableCell>
                                  <div className="flex justify-center">
                                    <Checkbox checked={item.required} onCheckedChange={(checked) => updateWorkspaceListItem("releaseChecks", item.id, (row) => ({ ...row, required: Boolean(checked) }))} />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-center">
                                    <Checkbox checked={item.passed} onCheckedChange={(checked) => updateWorkspaceListItem("releaseChecks", item.id, (row) => ({ ...row, passed: Boolean(checked) }))} />
                                  </div>
                                </TableCell>
                                <TableCell><Input value={item.ownerName} onChange={(event) => updateWorkspaceListItem("releaseChecks", item.id, (row) => ({ ...row, ownerName: event.target.value }))} /></TableCell>
                                <TableCell><Input type="date" value={item.checkedAt} onChange={(event) => updateWorkspaceListItem("releaseChecks", item.id, (row) => ({ ...row, checkedAt: event.target.value }))} /></TableCell>
                                <TableCell><Input value={item.notes} onChange={(event) => updateWorkspaceListItem("releaseChecks", item.id, (row) => ({ ...row, notes: event.target.value }))} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="regulatory" className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-3">
                      {workspaceDraft.regulatoryTracks.map((track) => (
                        <Card key={track.id}>
                          <CardContent className="space-y-4 p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                <span className="font-medium">{MARKET_LABELS[track.market]} 轨道</span>
                              </div>
                              <Badge variant="outline" className={MARKET_BADGE_CLASS[track.market]}>
                                {TRACK_STATUS_LABELS[track.status]}
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              <Label>分类</Label>
                              <Input value={track.classification} onChange={(event) => setWorkspaceDraft({
                                ...workspaceDraft,
                                regulatoryTracks: workspaceDraft.regulatoryTracks.map((item) =>
                                  item.id === track.id ? { ...item, classification: event.target.value } : item
                                ),
                              })} />
                            </div>
                            <div className="space-y-2">
                              <Label>路径</Label>
                              <Input value={track.pathway} onChange={(event) => setWorkspaceDraft({
                                ...workspaceDraft,
                                regulatoryTracks: workspaceDraft.regulatoryTracks.map((item) =>
                                  item.id === track.id ? { ...item, pathway: event.target.value } : item
                                ),
                              })} />
                            </div>
                            <div className="space-y-2">
                              <Label>当前步骤</Label>
                              <Input value={track.currentStep} onChange={(event) => setWorkspaceDraft({
                                ...workspaceDraft,
                                regulatoryTracks: workspaceDraft.regulatoryTracks.map((item) =>
                                  item.id === track.id ? { ...item, currentStep: event.target.value } : item
                                ),
                              })} />
                            </div>
                            <div className="space-y-2">
                              <Label>轨道状态</Label>
                              <Select value={track.status} onValueChange={(value) => setWorkspaceDraft({
                                ...workspaceDraft,
                                regulatoryTracks: workspaceDraft.regulatoryTracks.map((item) =>
                                  item.id === track.id ? { ...item, status: value as ProjectRegulatoryTrack["status"] } : item
                                ),
                              })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="planning">规划中</SelectItem>
                                  <SelectItem value="in_progress">进行中</SelectItem>
                                  <SelectItem value="submitted">已提交</SelectItem>
                                  <SelectItem value="approved">已批准</SelectItem>
                                  <SelectItem value="archived">已归档</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>文档完成率</Label>
                              <div className="space-y-1">
                                <Progress value={track.documentProgress} className="h-2" />
                                <div className="text-xs text-muted-foreground">{track.documentProgress}%</div>
                              </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>提交号/受理号</Label>
                                <Input value={track.submissionNo} onChange={(event) => setWorkspaceDraft({
                                  ...workspaceDraft,
                                  regulatoryTracks: workspaceDraft.regulatoryTracks.map((item) =>
                                    item.id === track.id ? { ...item, submissionNo: event.target.value } : item
                                  ),
                                })} />
                              </div>
                              <div className="space-y-2">
                                <Label>证号/批准号</Label>
                                <Input value={track.certificateNo} onChange={(event) => setWorkspaceDraft({
                                  ...workspaceDraft,
                                  regulatoryTracks: workspaceDraft.regulatoryTracks.map((item) =>
                                    item.id === track.id ? { ...item, certificateNo: event.target.value } : item
                                  ),
                                })} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>缺口说明</Label>
                              <Textarea value={track.gapNotes} onChange={(event) => setWorkspaceDraft({
                                ...workspaceDraft,
                                regulatoryTracks: workspaceDraft.regulatoryTracks.map((item) =>
                                  item.id === track.id ? { ...item, gapNotes: event.target.value } : item
                                ),
                              })} rows={3} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="outline" onClick={() => handleCreateOrOpenRaTrack(track)}>
                                <ArrowRightCircle className="mr-1 h-4 w-4" />
                                {track.raProjectId ? "打开法规工作台" : "创建法规轨道"}
                              </Button>
                              {track.raProjectId ? (
                                <Button type="button" variant="outline" onClick={() => navigate(`/ra/workspace/${track.raProjectId}`)}>
                                  <ExternalLink className="mr-1 h-4 w-4" />
                                  进入详情
                                </Button>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="changes" className="space-y-4">
                    <Card>
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <GitBranch className="h-4 w-4 text-primary" />
                            设计变更
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => addWorkspaceRow("changes")}>
                            <Plus className="mr-1 h-4 w-4" />
                            新增变更
                          </Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>变更编号</TableHead>
                              <TableHead>变更类型</TableHead>
                              <TableHead>变更原因</TableHead>
                              <TableHead>法规影响</TableHead>
                              <TableHead>风险影响</TableHead>
                              <TableHead>结论</TableHead>
                              <TableHead>状态</TableHead>
                              <TableHead>生效日期</TableHead>
                              <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workspaceDraft.changes.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground">暂无设计变更</TableCell>
                              </TableRow>
                            ) : workspaceDraft.changes.map((change) => (
                              <TableRow key={change.id} className="align-top">
                                <TableCell><Input value={change.changeNo} onChange={(event) => updateWorkspaceListItem("changes", change.id, (item) => ({ ...item, changeNo: event.target.value }))} /></TableCell>
                                <TableCell><Input value={change.changeType} onChange={(event) => updateWorkspaceListItem("changes", change.id, (item) => ({ ...item, changeType: event.target.value }))} /></TableCell>
                                <TableCell><Textarea value={change.reason} onChange={(event) => updateWorkspaceListItem("changes", change.id, (item) => ({ ...item, reason: event.target.value }))} rows={2} /></TableCell>
                                <TableCell><Textarea value={change.regulatoryImpact} onChange={(event) => updateWorkspaceListItem("changes", change.id, (item) => ({ ...item, regulatoryImpact: event.target.value }))} rows={2} /></TableCell>
                                <TableCell><Textarea value={change.riskImpact} onChange={(event) => updateWorkspaceListItem("changes", change.id, (item) => ({ ...item, riskImpact: event.target.value }))} rows={2} /></TableCell>
                                <TableCell><Input value={change.decision} onChange={(event) => updateWorkspaceListItem("changes", change.id, (item) => ({ ...item, decision: event.target.value }))} /></TableCell>
                                <TableCell><Input value={change.status} onChange={(event) => updateWorkspaceListItem("changes", change.id, (item) => ({ ...item, status: event.target.value }))} /></TableCell>
                                <TableCell><Input type="date" value={change.effectiveDate} onChange={(event) => updateWorkspaceListItem("changes", change.id, (item) => ({ ...item, effectiveDate: event.target.value }))} /></TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeWorkspaceRow("changes", change.id)}>删除</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Rocket className="h-4 w-4 text-primary" />
                            上市后动作
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => addWorkspaceRow("postMarketItems")}>
                            <Plus className="mr-1 h-4 w-4" />
                            新增项目
                          </Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>类别</TableHead>
                              <TableHead>编号</TableHead>
                              <TableHead>状态</TableHead>
                              <TableHead>责任人</TableHead>
                              <TableHead>关闭日期</TableHead>
                              <TableHead>说明</TableHead>
                              <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workspaceDraft.postMarketItems.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">暂无上市后事项</TableCell>
                              </TableRow>
                            ) : workspaceDraft.postMarketItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell><Input value={item.category} onChange={(event) => updateWorkspaceListItem("postMarketItems", item.id, (row) => ({ ...row, category: event.target.value }))} /></TableCell>
                                <TableCell><Input value={item.itemNo} onChange={(event) => updateWorkspaceListItem("postMarketItems", item.id, (row) => ({ ...row, itemNo: event.target.value }))} /></TableCell>
                                <TableCell><Input value={item.status} onChange={(event) => updateWorkspaceListItem("postMarketItems", item.id, (row) => ({ ...row, status: event.target.value }))} /></TableCell>
                                <TableCell><Input value={item.ownerName} onChange={(event) => updateWorkspaceListItem("postMarketItems", item.id, (row) => ({ ...row, ownerName: event.target.value }))} /></TableCell>
                                <TableCell><Input type="date" value={item.closedAt} onChange={(event) => updateWorkspaceListItem("postMarketItems", item.id, (row) => ({ ...row, closedAt: event.target.value }))} /></TableCell>
                                <TableCell><Input value={item.notes} onChange={(event) => updateWorkspaceListItem("postMarketItems", item.id, (row) => ({ ...row, notes: event.target.value }))} /></TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeWorkspaceRow("postMarketItems", item.id)}>删除</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setWorkbenchOpen(false)}>关闭</Button>
                <Button onClick={handleWorkspaceSave} disabled={updateMutation.isPending}>
                  保存工作台
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DraggableDialogContent>
      </DraggableDialog>

      <DraggableDialog
        open={deliverableReviewOpen}
        onOpenChange={(open) => {
          setDeliverableReviewOpen(open);
          if (!open) {
            setReviewingDeliverableId(null);
          }
        }}
        defaultWidth={1180}
        defaultHeight={860}
      >
        <DraggableDialogContent>
          {reviewingDeliverable && workbenchProject ? (
            <>
              <DialogHeader>
                <DialogTitle>{reviewingDeliverable.name} - 审核查看文件</DialogTitle>
                <DialogDescription>审核时可直接查看在线正文和已上传附件，不需要再切出去找文件。</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4 md:grid-cols-[320px_1fr]">
                <Card>
                  <CardContent className="space-y-4 p-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">输出物编号</div>
                      <div className="font-medium">{reviewingDeliverable.code}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">所属阶段</div>
                      <div className="font-medium">{reviewingDeliverable.stageName}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">状态</div>
                      <div className="font-medium">{DELIVERABLE_STATUS_LABELS[reviewingDeliverable.status]}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">版本 / 负责人</div>
                      <div className="font-medium">{reviewingDeliverable.version || "V1.0"} / {reviewingDeliverable.ownerName || "-"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">内容更新时间</div>
                      <div className="font-medium">{reviewingDeliverable.contentUpdatedAt ? formatDateValue(reviewingDeliverable.contentUpdatedAt, true) : "-"}</div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="text-sm font-medium">附件文件</div>
                      {reviewingDeliverable.attachments.length === 0 ? (
                        <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                          暂无附件
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {reviewingDeliverable.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.filePath}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                            >
                              <span className="truncate">{attachment.name}</span>
                              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">在线正文</div>
                      <Badge variant="outline">{reviewingDeliverable.templateName || reviewingDeliverable.name}</Badge>
                    </div>
                    {reviewingDeliverable.content?.trim() || (reviewingDeliverable.code === "QTQP11-10" && reviewingDeliverable.structuredData) ? (
                      <div
                        className="min-h-[640px] rounded-md border bg-background p-4 prose prose-sm max-w-none overflow-auto"
                        dangerouslySetInnerHTML={{
                          __html:
                            reviewingDeliverable.code === "QTQP11-10" && reviewingDeliverable.structuredData
                              ? buildStructuredReportPrintableDocument(reviewingDeliverable.structuredData)
                              : (reviewingDeliverable.content || ""),
                        }}
                      />
                    ) : (
                      <div className="flex min-h-[640px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                        暂无在线正文，请查看左侧附件文件
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeliverableReviewOpen(false);
                    openDeliverableEditor(reviewingDeliverable);
                  }}
                >
                  <Edit className="mr-1 h-4 w-4" />
                  转到编辑
                </Button>
                <Button variant="outline" onClick={() => setDeliverableReviewOpen(false)}>关闭</Button>
              </DialogFooter>
            </>
          ) : null}
        </DraggableDialogContent>
      </DraggableDialog>

      <DraggableDialog
        open={deliverableEditorOpen}
        onOpenChange={(open) => {
          if (open) {
            setDeliverableEditorOpen(true);
            return;
          }
          void handleDeliverableEditorClose();
        }}
        defaultWidth={1180}
        defaultHeight={860}
        isMaximized={deliverableEditorMaximized}
        onMaximizedChange={setDeliverableEditorMaximized}
      >
        <DraggableDialogContent isMaximized={deliverableEditorMaximized}>
          {activeDeliverable && workbenchProject ? (
            <>
              <DialogHeader>
                <DialogTitle>{activeDeliverable.name} - 在线编辑</DialogTitle>
                <DialogDescription>套用文档编辑方式，支持标题、加粗、列表等常用正文编辑；修改后会自动保存到数据库，也可以手动保存。</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {isStructuredReportDeliverable && structuredReportDraft ? (
                  <StructuredReportEditor
                    key={activeDeliverable.id}
                    initialValue={structuredReportDraft}
                    fileName={`${workbenchProject.projectNo}-${activeDeliverable.code}-${activeDeliverable.name}`}
                    saving={saveDeliverableContentMutation.isPending}
                    onChange={setStructuredReportDraft}
                    onSave={() => void persistDeliverableContent(true)}
                    translateText={runTranslator}
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-[320px_1fr]">
                    <Card>
                      <CardContent className="space-y-4 p-4">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">输出物编号</div>
                          <div className="font-medium">{activeDeliverable.code}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">所属阶段</div>
                          <div className="font-medium">{activeDeliverable.stageName}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">法规属性</div>
                          <div className="font-medium">
                            {activeDeliverable.market === "COMMON" ? "通用" : MARKET_LABELS[activeDeliverable.market]}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">版本 / 负责人</div>
                          <div className="font-medium">{activeDeliverable.version || "V1.0"} / {activeDeliverable.ownerName || "-"}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">自动保存状态</div>
                          <div className="flex items-center gap-2 text-sm">
                            {deliverableSaveStatus === "saving" ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
                            {deliverableSaveStatus === "saved" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
                            <span>
                              {deliverableSaveStatus === "saving" && "自动保存中..."}
                              {deliverableSaveStatus === "saved" && `已自动保存${deliverableSavedAt ? ` · ${formatDateValue(deliverableSavedAt, true)}` : ""}`}
                              {deliverableSaveStatus === "error" && "自动保存失败"}
                              {deliverableSaveStatus === "idle" && "等待编辑"}
                            </span>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <Label>AI 辅助要求</Label>
                          <Textarea
                            value={deliverableAiPrompt}
                            onChange={(event) => setDeliverableAiPrompt(event.target.value)}
                            placeholder="例如：突出注册检验准备、增加法规风险、按照正式表单语气编写"
                            rows={5}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Button type="button" variant="outline" onClick={handleInsertTemplate}>
                            <ClipboardList className="mr-1 h-4 w-4" />
                            重置为模板
                          </Button>
                          <Button type="button" onClick={handleGenerateAiContent} disabled={generateDeliverableAiContentMutation.isPending}>
                            {generateDeliverableAiContentMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                            AI 生成初稿
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">正文内容</div>
                          <Badge variant="outline">{activeDeliverable.templateName || activeDeliverable.name}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 rounded-md border bg-muted/30 p-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => runDeliverableEditorCommand("formatBlock", "H1")}>
                            <Heading1 className="mr-1 h-4 w-4" />
                            一级标题
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => runDeliverableEditorCommand("formatBlock", "H2")}>
                            <Heading2 className="mr-1 h-4 w-4" />
                            二级标题
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => runDeliverableEditorCommand("formatBlock", "P")}>
                            <Pilcrow className="mr-1 h-4 w-4" />
                            正文
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => runDeliverableEditorCommand("bold")}>
                            <Bold className="mr-1 h-4 w-4" />
                            加粗
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => runDeliverableEditorCommand("italic")}>
                            <Italic className="mr-1 h-4 w-4" />
                            斜体
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => runDeliverableEditorCommand("underline")}>
                            <Underline className="mr-1 h-4 w-4" />
                            下划线
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => runDeliverableEditorCommand("insertUnorderedList")}>
                            <List className="mr-1 h-4 w-4" />
                            无序列表
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => runDeliverableEditorCommand("insertOrderedList")}>
                            <ListOrdered className="mr-1 h-4 w-4" />
                            有序列表
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => void handleOpenTranslator()}>
                            <Languages className="mr-1 h-4 w-4" />
                            中英翻译
                          </Button>
                        </div>
                        <div
                          ref={deliverableEditorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(event) => setDeliverableDraftContent((event.target as HTMLDivElement).innerHTML)}
                          onMouseUp={rememberDeliverableSelection}
                          onKeyUp={rememberDeliverableSelection}
                          onFocus={rememberDeliverableSelection}
                          className="min-h-[620px] rounded-md border bg-background p-4 text-sm leading-7 outline-none prose prose-sm max-w-none"
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => void persistDeliverableContent(true)}
                  disabled={saveDeliverableContentMutation.isPending || generateDeliverableAiContentMutation.isPending}
                >
                  <Save className="mr-1 h-4 w-4" />
                  保存
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleDeliverableEditorClose()}
                  disabled={saveDeliverableContentMutation.isPending}
                >
                  关闭并保存
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DraggableDialogContent>
      </DraggableDialog>

      <DraggableDialog
        open={translatorOpen}
        onOpenChange={setTranslatorOpen}
        defaultWidth={960}
        defaultHeight={620}
      >
        <DraggableDialogContent>
          <DialogHeader>
            <DialogTitle>中文到英文翻译器</DialogTitle>
            <DialogDescription>默认使用内置术语翻译；如果定义了 `window.customReportTranslator(text)`，会优先走自定义在线翻译。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>中文</Label>
              <Textarea
                value={translatorSource}
                onChange={(event) => setTranslatorSource(event.target.value)}
                placeholder="输入中文，支持多行"
                className="min-h-[320px]"
              />
            </div>
            <div className="space-y-2">
              <Label>英文</Label>
              <Textarea
                value={translatorResult}
                onChange={(event) => setTranslatorResult(event.target.value)}
                placeholder="自动翻译结果"
                className="min-h-[320px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setTranslatorSource(""); setTranslatorResult(""); }}>
              清空
            </Button>
            <Button type="button" variant="outline" onClick={() => void copyText(translatorResult)}>
              <Copy className="mr-1 h-4 w-4" />
              复制英文
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleTranslatorInsert()}>
              插入当前字段
            </Button>
            <Button type="button" onClick={() => void handleTranslatorRun()} disabled={translatorLoading}>
              {translatorLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Languages className="mr-1 h-4 w-4" />}
              立即翻译
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleDeliverableFileChange}
      />
    </ERPLayout>
  );
}
