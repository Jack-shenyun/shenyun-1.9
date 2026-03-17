import ERPLayout from "@/components/ERPLayout";
import { formatDisplayNumber } from "@/lib/formatters";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import { SignatureHistory, SignatureRecord, SignatureStatusCard } from "@/components/ElectronicSignature";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  ClipboardCheck,
  Edit,
  Eye,
  FlaskConical,
  FolderOpen,
  Microscope,
  AlertTriangle,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  TestTube,
  Trash2,
  Upload,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type FieldType = "text" | "date" | "number" | "textarea" | "select";

type FieldConfig = {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  colSpan?: 1 | 2;
  options?: Array<{ value: string; label: string }>;
};

type SectionConfig = {
  id: string;
  title: string;
  fields: FieldConfig[];
};

type LabFormConfig = {
  id: string;
  title: string;
  shortTitle: string;
  type: "记录" | "检验" | "SOP";
  description: string;
  icon: typeof TestTube;
  sections: SectionConfig[];
};

const LAB_ICON_STYLE_MAP: Record<string, { bg: string; icon: string }> = {
  "cleaning-record": {
    bg: "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-200/80",
    icon: "text-white",
  },
  "pw-chemical": {
    bg: "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-200/80",
    icon: "text-white",
  },
  "pw-microbial": {
    bg: "bg-gradient-to-br from-pink-500 to-rose-500 shadow-pink-200/80",
    icon: "text-white",
  },
  "airborne-microbe": {
    bg: "bg-gradient-to-br from-sky-500 to-cyan-500 shadow-sky-200/80",
    icon: "text-white",
  },
  "particle-monitor": {
    bg: "bg-gradient-to-br from-orange-400 to-amber-400 shadow-orange-200/80",
    icon: "text-white",
  },
  "airflow-monitor": {
    bg: "bg-gradient-to-br from-fuchsia-300 to-violet-300 shadow-fuchsia-100/90",
    icon: "text-white",
  },
  "settling-bacteria": {
    bg: "bg-gradient-to-br from-teal-400 to-emerald-400 shadow-teal-100/90",
    icon: "text-white",
  },
  "endotoxin-sop": {
    bg: "bg-gradient-to-br from-indigo-400 to-blue-500 shadow-indigo-100/90",
    icon: "text-white",
  },
};

const LAB_FORMS: LabFormConfig[] = [
  {
    id: "cleaning-record",
    title: "实验室清洁记录",
    shortTitle: "清洁记录",
    type: "记录",
    description: "记录实验室区域、消毒液配置、执行人与复核人的清洁过程。",
    icon: Sparkles,
    sections: [
      {
        id: "basic",
        title: "基础信息",
        fields: [
          { id: "docNo", label: "表单编号", type: "text", placeholder: "自动生成或手动填写" },
          { id: "recordDate", label: "记录日期", type: "date" },
          { id: "room", label: "区域/房间", type: "text", placeholder: "填写清洁区域" },
          {
            id: "shift",
            label: "班次",
            type: "select",
            options: [{ value: "早班", label: "早班" }, { value: "中班", label: "中班" }, { value: "晚班", label: "晚班" }],
          },
        ],
      },
      {
        id: "execution",
        title: "执行信息",
        fields: [
          { id: "disinfectant", label: "消毒液配置", type: "text", placeholder: "选择或填写消毒液" },
          { id: "executor", label: "执行人", type: "text", placeholder: "选择执行人" },
          { id: "reviewer", label: "复核人", type: "text", placeholder: "选择复核人" },
          { id: "detail", label: "清洁详情", type: "textarea", placeholder: "填写清洁明细", colSpan: 2 },
        ],
      },
    ],
  },
  {
    id: "pw-chemical",
    title: "纯化水化学性能检验",
    shortTitle: "纯化水化学",
    type: "检验",
    description: "记录纯化水理化项目、逐项结论、纸质报告与审核信息。",
    icon: FlaskConical,
    sections: [
      {
        id: "basic",
        title: "基础信息",
        fields: [
          { id: "docNo", label: "检验单号", type: "text", placeholder: "自动生成" },
          { id: "reportName", label: "名称", type: "text", placeholder: "填写理化检验名称" },
          { id: "sampleDate", label: "取样日期", type: "date" },
          { id: "sampler", label: "取样器具", type: "text", placeholder: "填写取样器具" },
          { id: "samplePoint", label: "取样点", type: "text", placeholder: "选择取样点" },
          { id: "standard", label: "检验依据", type: "text", placeholder: "填写检验依据", colSpan: 2 },
          { id: "reportMode", label: "报告模式", type: "text", placeholder: "online" },
          { id: "inspectionItems", label: "检验明细", type: "textarea", placeholder: "系统生成", colSpan: 2 },
          { id: "paperReportName", label: "纸质报告名称", type: "text", placeholder: "上传后自动带入" },
          { id: "paperReportDataUrl", label: "纸质报告数据", type: "textarea", placeholder: "上传后自动带入", colSpan: 2 },
          { id: "finalResult", label: "结果判定", type: "text", placeholder: "pass/fail" },
          { id: "requiresReview", label: "表单审核", type: "text", placeholder: "yes/no" },
        ],
      },
    ],
  },
  {
    id: "pw-microbial",
    title: "纯化水微生物限度检验",
    shortTitle: "纯化水微生物",
    type: "检验",
    description: "记录纯化水微生物限度检验、培养基批号和菌落结果。",
    icon: Microscope,
    sections: [
      {
        id: "basic",
        title: "基础信息",
        fields: [
          { id: "docNo", label: "检验单号", type: "text", placeholder: "自动生成" },
          { id: "reportMode", label: "报告模式", type: "text", placeholder: "online" },
          { id: "category", label: "品类", type: "text", placeholder: "纯化水" },
          { id: "reportName", label: "产品名称", type: "text", placeholder: "填写微生物检验名称" },
          { id: "sampleDate", label: "取样日期", type: "date" },
          { id: "sampler", label: "取样器具", type: "text", placeholder: "填写取样器具" },
          { id: "sampleAreas", label: "取样区域", type: "text", placeholder: "多个区域用顿号或逗号分隔", colSpan: 2 },
          { id: "inspectionItem", label: "检验项目", type: "text", placeholder: "填写检验项目" },
          { id: "cultureNo", label: "培养箱编号", type: "text", placeholder: "填写培养箱编号" },
          { id: "cultureMediaItems", label: "培养基及批号", type: "textarea", placeholder: "系统生成", colSpan: 2 },
          { id: "standard", label: "检验依据", type: "text", placeholder: "填写检验依据", colSpan: 2 },
          { id: "inspectionDate", label: "检验日期", type: "date" },
          { id: "inspector", label: "检验人员", type: "text", placeholder: "填写检验人员" },
          { id: "standardOperation", label: "标准及操作", type: "textarea", placeholder: "填写标准及操作", colSpan: 2 },
          { id: "incubationTemp", label: "培养温度", type: "text", placeholder: "例如：25℃" },
          { id: "incubationStart", label: "培养开始日期", type: "text", placeholder: "yyyy-mm-dd hh:mm" },
          { id: "incubationEnd", label: "培养结束日期", type: "text", placeholder: "yyyy-mm-dd hh:mm" },
          { id: "resultItems", label: "结果明细", type: "textarea", placeholder: "系统生成", colSpan: 2 },
          { id: "paperReportName", label: "纸质报告名称", type: "text", placeholder: "上传后自动带入" },
          { id: "paperReportDataUrl", label: "纸质报告数据", type: "textarea", placeholder: "上传后自动带入", colSpan: 2 },
          { id: "finalResult", label: "结果判定", type: "text", placeholder: "pass/fail" },
        ],
      },
    ],
  },
  {
    id: "airborne-microbe",
    title: "浮游菌检验记录",
    shortTitle: "浮游菌",
    type: "记录",
    description: "记录洁净区浮游菌采样点、采样量和判定结果。",
    icon: Microscope,
    sections: [
      {
        id: "monitor",
        title: "监测信息",
        fields: [
          { id: "docNo", label: "检验单号", type: "text", placeholder: "自动生成" },
          { id: "monitorDate", label: "取样日期", type: "date" },
          { id: "cleanRoom", label: "洁净区/房间", type: "text", placeholder: "填写洁净区" },
          { id: "samplePoint", label: "取样点", type: "text", placeholder: "选择取样点" },
        ],
      },
      {
        id: "data",
        title: "检测数据",
        fields: [
          { id: "equipment", label: "采样设备", type: "text", placeholder: "选择采样设备" },
          { id: "volume", label: "采样量", type: "number", placeholder: "填写采样量" },
          { id: "count", label: "浮游菌数", type: "number", placeholder: "填写菌落数" },
          { id: "conclusion", label: "结果判定", type: "text", placeholder: "填写结果判定" },
        ],
      },
    ],
  },
  {
    id: "particle-monitor",
    title: "尘埃粒子检验记录",
    shortTitle: "尘埃粒子",
    type: "记录",
    description: "记录尘埃粒子监测点、设备和 0.5um / 5.0um 粒子数据。",
    icon: ShieldCheck,
    sections: [
      {
        id: "basic",
        title: "基础信息",
        fields: [
          { id: "docNo", label: "检验单号", type: "text", placeholder: "自动生成" },
          { id: "reportMode", label: "报告模式", type: "text", placeholder: "online" },
          { id: "equipmentNo", label: "设备编号", type: "text", placeholder: "填写设备编号" },
          { id: "equipmentName", label: "设备名称", type: "text", placeholder: "填写设备名称" },
          { id: "resultCount", label: "实测结果数量", type: "text", placeholder: "填写数量" },
          { id: "inspectionType", label: "检验类型", type: "text", placeholder: "dynamic/static" },
          { id: "inspectionDate", label: "检验日期", type: "date" },
          { id: "inspector", label: "检验员", type: "text", placeholder: "填写检验员" },
          { id: "standard", label: "检验依据", type: "text", placeholder: "填写检验依据", colSpan: 2 },
          { id: "measurementItems", label: "实测内容", type: "textarea", placeholder: "系统生成", colSpan: 2 },
          { id: "paperReportName", label: "纸质报告名称", type: "text", placeholder: "上传后自动带入" },
          { id: "paperReportDataUrl", label: "纸质报告数据", type: "textarea", placeholder: "上传后自动带入", colSpan: 2 },
          { id: "finalResult", label: "结果判定", type: "text", placeholder: "pass/fail" },
        ],
      },
    ],
  },
  {
    id: "airflow-monitor",
    title: "风量、换气次数监测记录",
    shortTitle: "风量换气",
    type: "记录",
    description: "记录风量、换气次数、温湿度和压差等环境参数。",
    icon: ShieldCheck,
    sections: [
      {
        id: "basic",
        title: "基础信息",
        fields: [
          { id: "docNo", label: "检验单号", type: "text", placeholder: "自动生成" },
          { id: "reportMode", label: "报告模式", type: "text", placeholder: "online" },
          { id: "equipmentNo", label: "设备编号", type: "text", placeholder: "填写设备编号" },
          { id: "inspectionDate", label: "检验日期", type: "date" },
          { id: "inspector", label: "检验员", type: "text", placeholder: "填写检验员" },
          { id: "standard", label: "检验依据", type: "text", placeholder: "填写检验依据", colSpan: 2 },
          { id: "measurementItems", label: "实测内容", type: "textarea", placeholder: "系统生成", colSpan: 2 },
          { id: "paperReportName", label: "纸质报告名称", type: "text", placeholder: "上传后自动带入" },
          { id: "paperReportDataUrl", label: "纸质报告数据", type: "textarea", placeholder: "上传后自动带入", colSpan: 2 },
          { id: "finalResult", label: "结果判定", type: "text", placeholder: "pass/fail" },
        ],
      },
    ],
  },
  {
    id: "settling-bacteria",
    title: "沉降菌检验记录",
    shortTitle: "沉降菌",
    type: "记录",
    description: "记录沉降菌点位、暴露时间、菌落数和结果判定。",
    icon: Microscope,
    sections: [
      {
        id: "basic",
        title: "基础信息",
        fields: [
          { id: "docNo", label: "检验单号", type: "text", placeholder: "自动生成" },
          { id: "reportMode", label: "报告模式", type: "text", placeholder: "online" },
          { id: "cultureBoxNo", label: "培养箱设备编号", type: "text", placeholder: "填写培养箱设备编号" },
          { id: "envTemp", label: "环境温度", type: "text", placeholder: "例如：25℃" },
          { id: "relativeHumidity", label: "相对湿度", type: "text", placeholder: "例如：30%" },
          { id: "exposureTime", label: "暴露时间", type: "text", placeholder: "填写暴露时间" },
          { id: "incubationTemp", label: "培养温度", type: "text", placeholder: "例如：20℃" },
          { id: "standard", label: "检验依据", type: "text", placeholder: "填写检验依据" },
          { id: "cultureMediaItems", label: "培养基及批号", type: "textarea", placeholder: "系统生成", colSpan: 2 },
          { id: "inspectionDate", label: "检验日期", type: "date" },
          { id: "inspector", label: "检验人员", type: "text", placeholder: "填写检验人员" },
          { id: "measurementItems", label: "实测内容", type: "textarea", placeholder: "系统生成", colSpan: 2 },
          { id: "paperReportName", label: "纸质报告名称", type: "text", placeholder: "上传后自动带入" },
          { id: "paperReportDataUrl", label: "纸质报告数据", type: "textarea", placeholder: "上传后自动带入", colSpan: 2 },
          { id: "finalResult", label: "结果判定", type: "text", placeholder: "pass/fail" },
        ],
      },
    ],
  },
  {
    id: "endotoxin-sop",
    title: "细菌内毒素检测试剂标准操作记录",
    shortTitle: "内毒素 SOP",
    type: "SOP",
    description: "记录内毒素检测试剂、标准曲线、适用范围和关键操作。",
    icon: ClipboardCheck,
    sections: [
      {
        id: "basic",
        title: "基础信息",
        fields: [
          { id: "docNo", label: "记录编号", type: "text", placeholder: "自动生成或填写" },
          { id: "reportMode", label: "报告模式", type: "text", placeholder: "online" },
          { id: "sampleName", label: "样品名称", type: "text", placeholder: "填写样品名称" },
          { id: "sterilizationBatch", label: "灭菌批号", type: "text", placeholder: "填写灭菌批号" },
          { id: "productionBatch", label: "生产批号", type: "text", placeholder: "填写生产批号" },
          { id: "sampleModel", label: "样品型号", type: "text", placeholder: "填写样品型号" },
          { id: "endotoxinLimit", label: "内毒素限制", type: "text", placeholder: "填写内毒素限制", colSpan: 2 },
          { id: "samplePreparation", label: "供试液制备", type: "text", placeholder: "填写供试液制备", colSpan: 2 },
          { id: "inspectionDate", label: "检验日期", type: "date" },
          { id: "standard", label: "检验依据", type: "text", placeholder: "填写检验依据", colSpan: 2 },
          { id: "inspector", label: "检验员", type: "text", placeholder: "填写检验员" },
          { id: "reagentItems", label: "试剂信息", type: "textarea", placeholder: "系统生成", colSpan: 2 },
          { id: "testItems", label: "测试内容", type: "textarea", placeholder: "系统生成", colSpan: 2 },
          { id: "paperReportName", label: "纸质报告名称", type: "text", placeholder: "上传后自动带入" },
          { id: "paperReportDataUrl", label: "纸质报告数据", type: "textarea", placeholder: "上传后自动带入", colSpan: 2 },
          { id: "finalResult", label: "结果判定", type: "text", placeholder: "pass/fail" },
        ],
      },
    ],
  },
  {
    id: "bioburden",
    title: "初始污染菌检验记录",
    shortTitle: "初始污染菌",
    type: "检验",
    description: "记录产品初始污染菌（生物负载）检验过程、结果及判定。",
    icon: Microscope,
    sections: [], // 使用专用渲染器，不走通用 renderField
  },
  {
    id: "sterility",
    title: "无菌检验记录",
    shortTitle: "无菌检验",
    type: "检验",
    description: "记录产品无菌检验过程、培养结果及合格判定。",
    icon: TestTube,
    sections: [], // 使用专用渲染器，不走通用 renderField
  },
];

// ===== Bioburden / Sterility 常量和辅助函数 =====
const BIOBURDEN_STANDARD_OPTIONS = [
  "初始污染菌检验标准一",
  "初始污染菌检验标准二",
  "企业内控标准",
];
const defaultBioburdenRowNames = ["阴性对照", "稀释10倍", "稀释100倍", "稀释1000倍"];
const defaultSterilityRowNames = ["供试品"];

interface BioburdenRow {
  itemName: string;
  plate1: string;
  plate2: string;
  average: string;
  conclusion: "qualified" | "unqualified";
}

interface SterilityRow {
  itemName: string;
  colony1: string;
  colony2: string;
  average: string;
  conclusion: "qualified" | "unqualified";
}

function parseBioburdenRows(raw: string | undefined): BioburdenRow[] {
  try {
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr) || arr.length === 0) {
      return defaultBioburdenRowNames.map((name) => ({ itemName: name, plate1: "", plate2: "", average: "", conclusion: "qualified" as const }));
    }
    return arr.map((row: any, index: number) => ({
      itemName: String(row?.itemName || defaultBioburdenRowNames[index] || `检测项${index + 1}`),
      plate1: String(row?.plate1 || ""),
      plate2: String(row?.plate2 || ""),
      average: String(row?.average || ""),
      conclusion: (row?.conclusion === "unqualified" ? "unqualified" : "qualified") as "qualified" | "unqualified",
    }));
  } catch {
    return defaultBioburdenRowNames.map((name) => ({ itemName: name, plate1: "", plate2: "", average: "", conclusion: "qualified" as const }));
  }
}

function parseSterilityRows(raw: string | undefined): SterilityRow[] {
  try {
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr) || arr.length === 0) {
      return defaultSterilityRowNames.map((name) => ({ itemName: name, colony1: "", colony2: "", average: "", conclusion: "qualified" as const }));
    }
    return arr.map((row: any, index: number) => ({
      itemName: String(row?.itemName || defaultSterilityRowNames[index] || `检验项${index + 1}`),
      colony1: String(row?.colony1 || ""),
      colony2: String(row?.colony2 || ""),
      average: String(row?.average || ""),
      conclusion: (row?.conclusion === "unqualified" ? "unqualified" : "qualified") as "qualified" | "unqualified",
    }));
  } catch {
    return defaultSterilityRowNames.map((name) => ({ itemName: name, colony1: "", colony2: "", average: "", conclusion: "qualified" as const }));
  }
}

function parseMediumBatchNos(raw: string | undefined): string[] {
  try {
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return ["", "", ""];
    while (arr.length < 3) arr.push("");
    return arr.slice(0, 3).map(String);
  } catch {
    return ["", "", ""];
  }
}

function calcBioburdenAverage(plate1: string, plate2: string): string {
  const v1 = parseFloat(plate1);
  const v2 = parseFloat(plate2);
  if (!isFinite(v1) && !isFinite(v2)) return "";
  if (!isFinite(v1)) return String(v2);
  if (!isFinite(v2)) return String(v1);
  return String(((v1 + v2) / 2).toFixed(1));
}

function calcSterilityAverage(colony1: string, colony2: string): string {
  const v1 = parseFloat(colony1);
  const v2 = parseFloat(colony2);
  if (!isFinite(v1) && !isFinite(v2)) return "";
  if (!isFinite(v1)) return String(v2);
  if (!isFinite(v2)) return String(v1);
  return String(((v1 + v2) / 2).toFixed(1));
}
// ===== End Bioburden / Sterility =====

const COMMON_FIELD_DEFAULTS: Record<string, string> = {
  testDate: "",
  testMethod: "",
  specification: "",
  result: "",
  testerName: "",
  reviewerName: "",
  reviewDate: "",
  status: "pending",
  conclusion: "pending",
  remark: "",
};

type LabRecordView = {
  id: number;
  recordNo: string;
  formId: string;
  formTitle: string;
  formType: string;
  testType: string;
  testMethod: string;
  specification: string;
  result: string;
  conclusion: "pass" | "fail" | "pending";
  status: "pending" | "testing" | "completed" | "reviewed";
  testerName: string;
  reviewerName: string;
  testDate: string;
  reviewDate: string;
  remark: string;
  formData: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
  sourceType?: string;
  sourceId?: number;
  sourceItemId?: number;
};

type PwChemicalInspectionRow = {
  id: string;
  itemName: string;
  conclusion: "pass" | "fail";
  inspector: string;
  inspectionDate: string;
};

type PwMicrobialCultureMediumRow = {
  id: string;
  enabled: boolean;
  mediumName: string;
  batchNo: string;
};

type PwMicrobialResultRow = {
  id: string;
  sampleArea: string;
  result: string;
  conclusion: "pass" | "fail";
};

type AirborneCultureMediumRow = {
  id: string;
  enabled: boolean;
  mediumName: string;
  batchNo: string;
};

type AirborneMeasurementRow = {
  id: string;
  areaDivision: string;
  cleanlinessLevel: string;
  cleanRoomName: string;
  plate1: string;
  plate2: string;
  plate3: string;
  plate4: string;
  conclusion: "pass" | "fail";
};

type ParticleMeasurementRow = {
  id: string;
  areaDivision: string;
  cleanlinessLevel: string;
  cleanRoomName: string;
  particleSize: string;
  value1: string;
  value2: string;
  value3: string;
  value4: string;
  ucl: string;
  conclusion: "pass" | "fail";
};

type AirflowMeasurementRow = {
  id: string;
  areaDivision: string;
  cleanlinessLevel: string;
  cleanRoomName: string;
  areaSize: string;
  roomHeight: string;
  outletCount: string;
  airVolume: string;
  airChanges: string;
  conclusion: "pass" | "fail";
};

type EndotoxinReagentRow = {
  id: string;
  reagentName: string;
  manufacturer: string;
  batchNo: string;
  sensitivity: string;
};

type EndotoxinTestRow = {
  id: string;
  solutionName: string;
  result1: string;
  result2: string;
};

const PW_CHEMICAL_DEFAULT_ITEMS = [
  "性状",
  "酸碱度",
  "硝酸盐",
  "亚硝酸盐",
  "氨",
  "电导率",
  "易氧化物",
  "不挥发物",
  "重金属",
];

const PW_MICROBIAL_DEFAULT_MEDIA = [
  "培养基1号",
  "培养基2号",
  "培养基3号",
  "培养基4号",
];

const PW_MICROBIAL_DEFAULT_AREAS = ["区域1", "区域2", "区域3"];
const AIRBORNE_DEFAULT_MEDIA = [
  "培养基1号",
  "培养基2号",
  "培养基3号",
  "培养基4号",
];

function buildDefaultPwChemicalRows(): PwChemicalInspectionRow[] {
  return PW_CHEMICAL_DEFAULT_ITEMS.map((itemName, index) => ({
    id: `pw-chemical-${index + 1}`,
    itemName,
    conclusion: "pass",
    inspector: "",
    inspectionDate: "",
  }));
}

function buildDefaultPwMicrobialMediaRows(): PwMicrobialCultureMediumRow[] {
  return PW_MICROBIAL_DEFAULT_MEDIA.map((mediumName, index) => ({
    id: `pw-microbial-medium-${index + 1}`,
    enabled: index === 0,
    mediumName,
    batchNo: index === 0 ? "" : "",
  }));
}

function buildDefaultPwMicrobialResultRows(): PwMicrobialResultRow[] {
  return PW_MICROBIAL_DEFAULT_AREAS.map((sampleArea, index) => ({
    id: `pw-microbial-result-${index + 1}`,
    sampleArea,
    result: "",
    conclusion: "pass",
  }));
}

function buildDefaultAirborneMediaRows(): AirborneCultureMediumRow[] {
  return AIRBORNE_DEFAULT_MEDIA.map((mediumName, index) => ({
    id: `airborne-medium-${index + 1}`,
    enabled: index === 0,
    mediumName,
    batchNo: "",
  }));
}

function buildDefaultAirborneMeasurementRows(): AirborneMeasurementRow[] {
  return [
    {
      id: "airborne-row-1",
      areaDivision: "无菌检测室",
      cleanlinessLevel: "万级立<3",
      cleanRoomName: "二更1",
      plate1: "",
      plate2: "",
      plate3: "",
      plate4: "",
      conclusion: "pass",
    },
  ];
}

function buildDefaultParticleMeasurementRows(): ParticleMeasurementRow[] {
  return [
    {
      id: "particle-row-1",
      areaDivision: "无菌检测室",
      cleanlinessLevel: "万级:>0.5um",
      cleanRoomName: "二更1",
      particleSize: ">0.5微米",
      value1: "",
      value2: "",
      value3: "",
      value4: "",
      ucl: "",
      conclusion: "pass",
    },
  ];
}

function buildDefaultAirflowMeasurementRows(): AirflowMeasurementRow[] {
  return [
    {
      id: "airflow-row-1",
      areaDivision: "无菌检测室",
      cleanlinessLevel: "万级应>20",
      cleanRoomName: "二更1",
      areaSize: "",
      roomHeight: "",
      outletCount: "",
      airVolume: "",
      airChanges: "",
      conclusion: "pass",
    },
  ];
}

function buildDefaultEndotoxinReagentRows(): EndotoxinReagentRow[] {
  return [
    { id: "endotoxin-reagent-1", reagentName: "鲎试剂", manufacturer: "", batchNo: "", sensitivity: "" },
    { id: "endotoxin-reagent-2", reagentName: "细菌内毒素标准品", manufacturer: "", batchNo: "", sensitivity: "" },
    { id: "endotoxin-reagent-3", reagentName: "细菌内毒素检查用水", manufacturer: "", batchNo: "", sensitivity: "" },
  ];
}

function buildDefaultEndotoxinTestRows(): EndotoxinTestRow[] {
  return [
    { id: "endotoxin-test-1", solutionName: "无/供试品溶液", result1: "", result2: "" },
    { id: "endotoxin-test-2", solutionName: "2λ/供试品溶液", result1: "", result2: "" },
    { id: "endotoxin-test-3", solutionName: "2λ/检查用水", result1: "", result2: "" },
    { id: "endotoxin-test-4", solutionName: "无/检查用水", result1: "", result2: "" },
  ];
}

function parsePwChemicalRows(rawValue?: string) {
  if (!rawValue) return buildDefaultPwChemicalRows();
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return buildDefaultPwChemicalRows();
    return parsed.map((item, index) => ({
      id: String(item?.id ?? `pw-chemical-${index + 1}`),
      itemName: String(item?.itemName ?? PW_CHEMICAL_DEFAULT_ITEMS[index] ?? `项目${index + 1}`),
      conclusion: item?.conclusion === "fail" ? "fail" : "pass",
      inspector: String(item?.inspector ?? ""),
      inspectionDate: String(item?.inspectionDate ?? ""),
    })) as PwChemicalInspectionRow[];
  } catch {
    return buildDefaultPwChemicalRows();
  }
}

function parsePwMicrobialMediaRows(rawValue?: string) {
  if (!rawValue) return buildDefaultPwMicrobialMediaRows();
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return buildDefaultPwMicrobialMediaRows();
    return parsed.map((item, index) => ({
      id: String(item?.id ?? `pw-microbial-medium-${index + 1}`),
      enabled: Boolean(item?.enabled),
      mediumName: String(item?.mediumName ?? PW_MICROBIAL_DEFAULT_MEDIA[index] ?? `培养基${index + 1}`),
      batchNo: String(item?.batchNo ?? ""),
    })) as PwMicrobialCultureMediumRow[];
  } catch {
    return buildDefaultPwMicrobialMediaRows();
  }
}

function parsePwMicrobialResultRows(rawValue?: string) {
  if (!rawValue) return buildDefaultPwMicrobialResultRows();
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return buildDefaultPwMicrobialResultRows();
    return parsed.map((item, index) => ({
      id: String(item?.id ?? `pw-microbial-result-${index + 1}`),
      sampleArea: String(item?.sampleArea ?? PW_MICROBIAL_DEFAULT_AREAS[index] ?? `区域${index + 1}`),
      result: String(item?.result ?? ""),
      conclusion: item?.conclusion === "fail" ? "fail" : "pass",
    })) as PwMicrobialResultRow[];
  } catch {
    return buildDefaultPwMicrobialResultRows();
  }
}

function parseAirborneMediaRows(rawValue?: string) {
  if (!rawValue) return buildDefaultAirborneMediaRows();
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return buildDefaultAirborneMediaRows();
    return parsed.map((item, index) => ({
      id: String(item?.id ?? `airborne-medium-${index + 1}`),
      enabled: Boolean(item?.enabled),
      mediumName: String(item?.mediumName ?? AIRBORNE_DEFAULT_MEDIA[index] ?? `培养基${index + 1}`),
      batchNo: String(item?.batchNo ?? ""),
    })) as AirborneCultureMediumRow[];
  } catch {
    return buildDefaultAirborneMediaRows();
  }
}

function parseAirborneMeasurementRows(rawValue?: string) {
  if (!rawValue) return buildDefaultAirborneMeasurementRows();
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return buildDefaultAirborneMeasurementRows();
    return parsed.map((item, index) => ({
      id: String(item?.id ?? `airborne-row-${index + 1}`),
      areaDivision: String(item?.areaDivision ?? ""),
      cleanlinessLevel: String(item?.cleanlinessLevel ?? ""),
      cleanRoomName: String(item?.cleanRoomName ?? ""),
      plate1: String(item?.plate1 ?? ""),
      plate2: String(item?.plate2 ?? ""),
      plate3: String(item?.plate3 ?? ""),
      plate4: String(item?.plate4 ?? ""),
      conclusion: item?.conclusion === "fail" ? "fail" : "pass",
    })) as AirborneMeasurementRow[];
  } catch {
    return buildDefaultAirborneMeasurementRows();
  }
}

function parseParticleMeasurementRows(rawValue?: string) {
  if (!rawValue) return buildDefaultParticleMeasurementRows();
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return buildDefaultParticleMeasurementRows();
    return parsed.map((item, index) => ({
      id: String(item?.id ?? `particle-row-${index + 1}`),
      areaDivision: String(item?.areaDivision ?? ""),
      cleanlinessLevel: String(item?.cleanlinessLevel ?? ""),
      cleanRoomName: String(item?.cleanRoomName ?? ""),
      particleSize: String(item?.particleSize ?? ""),
      value1: String(item?.value1 ?? ""),
      value2: String(item?.value2 ?? ""),
      value3: String(item?.value3 ?? ""),
      value4: String(item?.value4 ?? ""),
      ucl: String(item?.ucl ?? ""),
      conclusion: item?.conclusion === "fail" ? "fail" : "pass",
    })) as ParticleMeasurementRow[];
  } catch {
    return buildDefaultParticleMeasurementRows();
  }
}

function parseAirflowMeasurementRows(rawValue?: string) {
  if (!rawValue) return buildDefaultAirflowMeasurementRows();
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return buildDefaultAirflowMeasurementRows();
    return parsed.map((item, index) => ({
      id: String(item?.id ?? `airflow-row-${index + 1}`),
      areaDivision: String(item?.areaDivision ?? ""),
      cleanlinessLevel: String(item?.cleanlinessLevel ?? ""),
      cleanRoomName: String(item?.cleanRoomName ?? ""),
      areaSize: String(item?.areaSize ?? ""),
      roomHeight: String(item?.roomHeight ?? ""),
      outletCount: String(item?.outletCount ?? ""),
      airVolume: String(item?.airVolume ?? ""),
      airChanges: String(item?.airChanges ?? ""),
      conclusion: item?.conclusion === "fail" ? "fail" : "pass",
    })) as AirflowMeasurementRow[];
  } catch {
    return buildDefaultAirflowMeasurementRows();
  }
}

function parseEndotoxinReagentRows(rawValue?: string) {
  if (!rawValue) return buildDefaultEndotoxinReagentRows();
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return buildDefaultEndotoxinReagentRows();
    return parsed.map((item, index) => ({
      id: String(item?.id ?? `endotoxin-reagent-${index + 1}`),
      reagentName: String(item?.reagentName ?? ""),
      manufacturer: String(item?.manufacturer ?? ""),
      batchNo: String(item?.batchNo ?? ""),
      sensitivity: String(item?.sensitivity ?? ""),
    })) as EndotoxinReagentRow[];
  } catch {
    return buildDefaultEndotoxinReagentRows();
  }
}

function parseEndotoxinTestRows(rawValue?: string) {
  if (!rawValue) return buildDefaultEndotoxinTestRows();
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return buildDefaultEndotoxinTestRows();
    return parsed.map((item, index) => ({
      id: String(item?.id ?? `endotoxin-test-${index + 1}`),
      solutionName: String(item?.solutionName ?? ""),
      result1: String(item?.result1 ?? ""),
      result2: String(item?.result2 ?? ""),
    })) as EndotoxinTestRow[];
  } catch {
    return buildDefaultEndotoxinTestRows();
  }
}

function calculateAirborneAverage(row: AirborneMeasurementRow) {
  const values = [row.plate1, row.plate2, row.plate3, row.plate4]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) return "";
  return formatDisplayNumber(values.reduce((sum, value) => sum + value, 0) / values.length, {
    maximumFractionDigits: 1,
  });
}

function parseDelimitedValues(rawValue?: string) {
  if (!rawValue) return [];
  return rawValue
    .split(/[，,、；;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function syncPwMicrobialResultRows(sampleAreas: string, existingRows: PwMicrobialResultRow[]) {
  const parsedAreas = parseDelimitedValues(sampleAreas);
  if (parsedAreas.length === 0) {
    return existingRows.length > 0 ? existingRows : buildDefaultPwMicrobialResultRows();
  }

  return parsedAreas.map((sampleArea, index) => {
    const matched = existingRows.find((item) => item.sampleArea === sampleArea) || existingRows[index];
    return {
      id: matched?.id ?? `pw-microbial-result-${Date.now()}-${index + 1}`,
      sampleArea,
      result: matched?.result ?? "",
      conclusion: matched?.conclusion ?? "pass",
    };
  });
}

function buildPwChemicalHistory(records: LabRecordView[]) {
  const relatedRecords = records.filter((item) => item.formId === "pw-chemical");
  const itemNames = new Set<string>();
  const inspectors = new Set<string>();
  const reportNames = new Set<string>();
  const samplers = new Set<string>();
  const samplePoints = new Set<string>();
  const standards = new Set<string>();
  const reviewers = new Set<string>();

  relatedRecords.forEach((record) => {
    const formData = record.formData || {};
    if (formData.reportName) reportNames.add(formData.reportName.trim());
    if (formData.sampler) samplers.add(formData.sampler.trim());
    if (formData.samplePoint) samplePoints.add(formData.samplePoint.trim());
    if (formData.standard) standards.add(formData.standard.trim());
    if (formData.reviewerName) reviewers.add(formData.reviewerName.trim());
    if (record.reviewerName) reviewers.add(record.reviewerName.trim());

    parsePwChemicalRows(formData.inspectionItems).forEach((row) => {
      if (row.itemName.trim()) itemNames.add(row.itemName.trim());
      if (row.inspector.trim()) inspectors.add(row.inspector.trim());
    });
  });

  return {
    reportNames: Array.from(reportNames).filter(Boolean),
    samplers: Array.from(samplers).filter(Boolean),
    samplePoints: Array.from(samplePoints).filter(Boolean),
    standards: Array.from(standards).filter(Boolean),
    reviewers: Array.from(reviewers).filter(Boolean),
    itemNames: Array.from(itemNames).filter(Boolean),
    inspectors: Array.from(inspectors).filter(Boolean),
  };
}

function buildPwMicrobialHistory(records: LabRecordView[]) {
  const relatedRecords = records.filter((item) => item.formId === "pw-microbial");
  const categories = new Set<string>();
  const reportNames = new Set<string>();
  const samplers = new Set<string>();
  const sampleAreas = new Set<string>();
  const inspectionItems = new Set<string>();
  const cultureNos = new Set<string>();
  const standards = new Set<string>();
  const inspectors = new Set<string>();
  const incubationTemps = new Set<string>();
  const resultAreas = new Set<string>();
  const mediumNames = new Set<string>();

  relatedRecords.forEach((record) => {
    const formData = record.formData || {};
    if (formData.category) categories.add(formData.category.trim());
    if (formData.reportName) reportNames.add(formData.reportName.trim());
    if (formData.sampler) samplers.add(formData.sampler.trim());
    if (formData.sampleAreas) sampleAreas.add(formData.sampleAreas.trim());
    if (formData.inspectionItem) inspectionItems.add(formData.inspectionItem.trim());
    if (formData.cultureNo) cultureNos.add(formData.cultureNo.trim());
    if (formData.standard) standards.add(formData.standard.trim());
    if (formData.inspector) inspectors.add(formData.inspector.trim());
    if (formData.incubationTemp) incubationTemps.add(formData.incubationTemp.trim());

    parsePwMicrobialMediaRows(formData.cultureMediaItems).forEach((row) => {
      if (row.mediumName.trim()) mediumNames.add(row.mediumName.trim());
    });
    parsePwMicrobialResultRows(formData.resultItems).forEach((row) => {
      if (row.sampleArea.trim()) resultAreas.add(row.sampleArea.trim());
    });
  });

  return {
    categories: Array.from(categories).filter(Boolean),
    reportNames: Array.from(reportNames).filter(Boolean),
    samplers: Array.from(samplers).filter(Boolean),
    sampleAreas: Array.from(sampleAreas).filter(Boolean),
    inspectionItems: Array.from(inspectionItems).filter(Boolean),
    cultureNos: Array.from(cultureNos).filter(Boolean),
    standards: Array.from(standards).filter(Boolean),
    inspectors: Array.from(inspectors).filter(Boolean),
    incubationTemps: Array.from(incubationTemps).filter(Boolean),
    resultAreas: Array.from(resultAreas).filter(Boolean),
    mediumNames: Array.from(mediumNames).filter(Boolean),
  };
}

function buildAirborneHistory(records: LabRecordView[]) {
  const relatedRecords = records.filter((item) => item.formId === "airborne-microbe");
  const samplerNos = new Set<string>();
  const envTemps = new Set<string>();
  const relativeHumidities = new Set<string>();
  const cultureNos = new Set<string>();
  const incubationTemps = new Set<string>();
  const standards = new Set<string>();
  const inspectors = new Set<string>();
  const areaDivisions = new Set<string>();
  const cleanlinessLevels = new Set<string>();
  const cleanRoomNames = new Set<string>();
  const mediumNames = new Set<string>();

  relatedRecords.forEach((record) => {
    const formData = record.formData || {};
    if (formData.samplerNo) samplerNos.add(formData.samplerNo.trim());
    if (formData.envTemp) envTemps.add(formData.envTemp.trim());
    if (formData.relativeHumidity) relativeHumidities.add(formData.relativeHumidity.trim());
    if (formData.cultureNo) cultureNos.add(formData.cultureNo.trim());
    if (formData.incubationTemp) incubationTemps.add(formData.incubationTemp.trim());
    if (formData.standard) standards.add(formData.standard.trim());
    if (formData.inspector) inspectors.add(formData.inspector.trim());

    parseAirborneMediaRows(formData.cultureMediaItems).forEach((row) => {
      if (row.mediumName.trim()) mediumNames.add(row.mediumName.trim());
    });
    parseAirborneMeasurementRows(formData.measurementItems).forEach((row) => {
      if (row.areaDivision.trim()) areaDivisions.add(row.areaDivision.trim());
      if (row.cleanlinessLevel.trim()) cleanlinessLevels.add(row.cleanlinessLevel.trim());
      if (row.cleanRoomName.trim()) cleanRoomNames.add(row.cleanRoomName.trim());
    });
  });

  return {
    samplerNos: Array.from(samplerNos).filter(Boolean),
    envTemps: Array.from(envTemps).filter(Boolean),
    relativeHumidities: Array.from(relativeHumidities).filter(Boolean),
    cultureNos: Array.from(cultureNos).filter(Boolean),
    incubationTemps: Array.from(incubationTemps).filter(Boolean),
    standards: Array.from(standards).filter(Boolean),
    inspectors: Array.from(inspectors).filter(Boolean),
    areaDivisions: Array.from(areaDivisions).filter(Boolean),
    cleanlinessLevels: Array.from(cleanlinessLevels).filter(Boolean),
    cleanRoomNames: Array.from(cleanRoomNames).filter(Boolean),
    mediumNames: Array.from(mediumNames).filter(Boolean),
  };
}

function buildSettlingHistory(records: LabRecordView[]) {
  const relatedRecords = records.filter((item) => item.formId === "settling-bacteria");
  const cultureBoxNos = new Set<string>();
  const envTemps = new Set<string>();
  const relativeHumidities = new Set<string>();
  const exposureTimes = new Set<string>();
  const incubationTemps = new Set<string>();
  const standards = new Set<string>();
  const inspectors = new Set<string>();
  const areaDivisions = new Set<string>();
  const cleanlinessLevels = new Set<string>();
  const cleanRoomNames = new Set<string>();
  const mediumNames = new Set<string>();

  relatedRecords.forEach((record) => {
    const formData = record.formData || {};
    if (formData.cultureBoxNo) cultureBoxNos.add(formData.cultureBoxNo.trim());
    if (formData.envTemp) envTemps.add(formData.envTemp.trim());
    if (formData.relativeHumidity) relativeHumidities.add(formData.relativeHumidity.trim());
    if (formData.exposureTime) exposureTimes.add(formData.exposureTime.trim());
    if (formData.incubationTemp) incubationTemps.add(formData.incubationTemp.trim());
    if (formData.standard) standards.add(formData.standard.trim());
    if (formData.inspector) inspectors.add(formData.inspector.trim());

    parseAirborneMediaRows(formData.cultureMediaItems).forEach((row) => {
      if (row.mediumName.trim()) mediumNames.add(row.mediumName.trim());
    });
    parseAirborneMeasurementRows(formData.measurementItems).forEach((row) => {
      if (row.areaDivision.trim()) areaDivisions.add(row.areaDivision.trim());
      if (row.cleanlinessLevel.trim()) cleanlinessLevels.add(row.cleanlinessLevel.trim());
      if (row.cleanRoomName.trim()) cleanRoomNames.add(row.cleanRoomName.trim());
    });
  });

  return {
    cultureBoxNos: Array.from(cultureBoxNos).filter(Boolean),
    envTemps: Array.from(envTemps).filter(Boolean),
    relativeHumidities: Array.from(relativeHumidities).filter(Boolean),
    exposureTimes: Array.from(exposureTimes).filter(Boolean),
    incubationTemps: Array.from(incubationTemps).filter(Boolean),
    standards: Array.from(standards).filter(Boolean),
    inspectors: Array.from(inspectors).filter(Boolean),
    areaDivisions: Array.from(areaDivisions).filter(Boolean),
    cleanlinessLevels: Array.from(cleanlinessLevels).filter(Boolean),
    cleanRoomNames: Array.from(cleanRoomNames).filter(Boolean),
    mediumNames: Array.from(mediumNames).filter(Boolean),
  };
}

function buildParticleHistory(records: LabRecordView[]) {
  const relatedRecords = records.filter((item) => item.formId === "particle-monitor");
  const equipmentNos = new Set<string>();
  const equipmentNames = new Set<string>();
  const resultCounts = new Set<string>();
  const inspectionTypes = new Set<string>();
  const standards = new Set<string>();
  const inspectors = new Set<string>();
  const areaDivisions = new Set<string>();
  const cleanlinessLevels = new Set<string>();
  const cleanRoomNames = new Set<string>();
  const particleSizes = new Set<string>();
  const ucls = new Set<string>();

  relatedRecords.forEach((record) => {
    const formData = record.formData || {};
    if (formData.equipmentNo) equipmentNos.add(formData.equipmentNo.trim());
    if (formData.equipmentName) equipmentNames.add(formData.equipmentName.trim());
    if (formData.resultCount) resultCounts.add(formData.resultCount.trim());
    if (formData.inspectionType) inspectionTypes.add(formData.inspectionType.trim());
    if (formData.standard) standards.add(formData.standard.trim());
    if (formData.inspector) inspectors.add(formData.inspector.trim());

    parseParticleMeasurementRows(formData.measurementItems).forEach((row) => {
      if (row.areaDivision.trim()) areaDivisions.add(row.areaDivision.trim());
      if (row.cleanlinessLevel.trim()) cleanlinessLevels.add(row.cleanlinessLevel.trim());
      if (row.cleanRoomName.trim()) cleanRoomNames.add(row.cleanRoomName.trim());
      if (row.particleSize.trim()) particleSizes.add(row.particleSize.trim());
      if (row.ucl.trim()) ucls.add(row.ucl.trim());
    });
  });

  return {
    equipmentNos: Array.from(equipmentNos).filter(Boolean),
    equipmentNames: Array.from(equipmentNames).filter(Boolean),
    resultCounts: Array.from(resultCounts).filter(Boolean),
    inspectionTypes: Array.from(inspectionTypes).filter(Boolean),
    standards: Array.from(standards).filter(Boolean),
    inspectors: Array.from(inspectors).filter(Boolean),
    areaDivisions: Array.from(areaDivisions).filter(Boolean),
    cleanlinessLevels: Array.from(cleanlinessLevels).filter(Boolean),
    cleanRoomNames: Array.from(cleanRoomNames).filter(Boolean),
    particleSizes: Array.from(particleSizes).filter(Boolean),
    ucls: Array.from(ucls).filter(Boolean),
  };
}

function buildAirflowHistory(records: LabRecordView[]) {
  const relatedRecords = records.filter((item) => item.formId === "airflow-monitor");
  const equipmentNos = new Set<string>();
  const standards = new Set<string>();
  const inspectors = new Set<string>();
  const areaDivisions = new Set<string>();
  const cleanlinessLevels = new Set<string>();
  const cleanRoomNames = new Set<string>();
  const areaSizes = new Set<string>();
  const roomHeights = new Set<string>();
  const outletCounts = new Set<string>();
  const airVolumes = new Set<string>();
  const airChanges = new Set<string>();

  relatedRecords.forEach((record) => {
    const formData = record.formData || {};
    if (formData.equipmentNo) equipmentNos.add(formData.equipmentNo.trim());
    if (formData.standard) standards.add(formData.standard.trim());
    if (formData.inspector) inspectors.add(formData.inspector.trim());

    parseAirflowMeasurementRows(formData.measurementItems).forEach((row) => {
      if (row.areaDivision.trim()) areaDivisions.add(row.areaDivision.trim());
      if (row.cleanlinessLevel.trim()) cleanlinessLevels.add(row.cleanlinessLevel.trim());
      if (row.cleanRoomName.trim()) cleanRoomNames.add(row.cleanRoomName.trim());
      if (row.areaSize.trim()) areaSizes.add(row.areaSize.trim());
      if (row.roomHeight.trim()) roomHeights.add(row.roomHeight.trim());
      if (row.outletCount.trim()) outletCounts.add(row.outletCount.trim());
      if (row.airVolume.trim()) airVolumes.add(row.airVolume.trim());
      if (row.airChanges.trim()) airChanges.add(row.airChanges.trim());
    });
  });

  return {
    equipmentNos: Array.from(equipmentNos).filter(Boolean),
    standards: Array.from(standards).filter(Boolean),
    inspectors: Array.from(inspectors).filter(Boolean),
    areaDivisions: Array.from(areaDivisions).filter(Boolean),
    cleanlinessLevels: Array.from(cleanlinessLevels).filter(Boolean),
    cleanRoomNames: Array.from(cleanRoomNames).filter(Boolean),
    areaSizes: Array.from(areaSizes).filter(Boolean),
    roomHeights: Array.from(roomHeights).filter(Boolean),
    outletCounts: Array.from(outletCounts).filter(Boolean),
    airVolumes: Array.from(airVolumes).filter(Boolean),
    airChanges: Array.from(airChanges).filter(Boolean),
  };
}

function buildEndotoxinHistory(records: LabRecordView[]) {
  const relatedRecords = records.filter((item) => item.formId === "endotoxin-sop");
  const sampleNames = new Set<string>();
  const sterilizationBatches = new Set<string>();
  const productionBatches = new Set<string>();
  const sampleModels = new Set<string>();
  const endotoxinLimits = new Set<string>();
  const samplePreparations = new Set<string>();
  const standards = new Set<string>();
  const inspectors = new Set<string>();
  const reagentNames = new Set<string>();
  const manufacturers = new Set<string>();
  const sensitivities = new Set<string>();
  const solutions = new Set<string>();

  relatedRecords.forEach((record) => {
    const formData = record.formData || {};
    if (formData.sampleName) sampleNames.add(formData.sampleName.trim());
    if (formData.sterilizationBatch) sterilizationBatches.add(formData.sterilizationBatch.trim());
    if (formData.productionBatch) productionBatches.add(formData.productionBatch.trim());
    if (formData.sampleModel) sampleModels.add(formData.sampleModel.trim());
    if (formData.endotoxinLimit) endotoxinLimits.add(formData.endotoxinLimit.trim());
    if (formData.samplePreparation) samplePreparations.add(formData.samplePreparation.trim());
    if (formData.standard) standards.add(formData.standard.trim());
    if (formData.inspector) inspectors.add(formData.inspector.trim());

    parseEndotoxinReagentRows(formData.reagentItems).forEach((row) => {
      if (row.reagentName.trim()) reagentNames.add(row.reagentName.trim());
      if (row.manufacturer.trim()) manufacturers.add(row.manufacturer.trim());
      if (row.sensitivity.trim()) sensitivities.add(row.sensitivity.trim());
    });
    parseEndotoxinTestRows(formData.testItems).forEach((row) => {
      if (row.solutionName.trim()) solutions.add(row.solutionName.trim());
    });
  });

  return {
    sampleNames: Array.from(sampleNames).filter(Boolean),
    sterilizationBatches: Array.from(sterilizationBatches).filter(Boolean),
    productionBatches: Array.from(productionBatches).filter(Boolean),
    sampleModels: Array.from(sampleModels).filter(Boolean),
    endotoxinLimits: Array.from(endotoxinLimits).filter(Boolean),
    samplePreparations: Array.from(samplePreparations).filter(Boolean),
    standards: Array.from(standards).filter(Boolean),
    inspectors: Array.from(inspectors).filter(Boolean),
    reagentNames: Array.from(reagentNames).filter(Boolean),
    manufacturers: Array.from(manufacturers).filter(Boolean),
    sensitivities: Array.from(sensitivities).filter(Boolean),
    solutions: Array.from(solutions).filter(Boolean),
  };
}

function parseSignatureRecords(rawValue?: string): SignatureRecord[] {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildInitialState(form: LabFormConfig, recordNo = "") {
  const values: Record<string, string> = {};
  for (const section of form.sections) {
    for (const field of section.fields) {
      values[field.id] = "";
    }
  }
  const next = {
    ...COMMON_FIELD_DEFAULTS,
    ...values,
    docNo: recordNo,
  };

  if (form.id === "pw-chemical") {
    next.reportMode = "online";
    next.inspectionItems = JSON.stringify(buildDefaultPwChemicalRows());
    next.finalResult = "pass";
    next.signatures = "[]";
  }

  if (form.id === "pw-microbial") {
    next.reportMode = "online";
    next.category = "纯化水";
    next.reportName = "纯化水微生物检验";
    next.inspectionItem = "R2A琼脂培养方法";
    next.cultureMediaItems = JSON.stringify(buildDefaultPwMicrobialMediaRows());
    next.resultItems = JSON.stringify(buildDefaultPwMicrobialResultRows());
    next.incubationTemp = "25℃";
    next.finalResult = "pass";
    next.signatures = "[]";
  }

  if (form.id === "airborne-microbe") {
    next.reportMode = "online";
    next.cultureMediaItems = JSON.stringify(buildDefaultAirborneMediaRows());
    next.measurementItems = JSON.stringify(buildDefaultAirborneMeasurementRows());
    next.finalResult = "pass";
    next.signatures = "[]";
  }

  if (form.id === "settling-bacteria") {
    next.reportMode = "online";
    next.cultureMediaItems = JSON.stringify(buildDefaultAirborneMediaRows());
    next.measurementItems = JSON.stringify(buildDefaultAirborneMeasurementRows());
    next.finalResult = "pass";
    next.signatures = "[]";
  }

  if (form.id === "particle-monitor") {
    next.reportMode = "online";
    next.resultCount = "4";
    next.inspectionType = "static";
    next.measurementItems = JSON.stringify(buildDefaultParticleMeasurementRows());
    next.finalResult = "pass";
    next.signatures = "[]";
  }

  if (form.id === "airflow-monitor") {
    next.reportMode = "online";
    next.measurementItems = JSON.stringify(buildDefaultAirflowMeasurementRows());
    next.finalResult = "pass";
    next.signatures = "[]";
  }

  if (form.id === "endotoxin-sop") {
    next.reportMode = "online";
    next.reagentItems = JSON.stringify(buildDefaultEndotoxinReagentRows());
    next.testItems = JSON.stringify(buildDefaultEndotoxinTestRows());
    next.finalResult = "pass";
    next.signatures = "[]";
  }

  if (form.id === "bioburden") {
    next.finalResult = "qualified";
    next.inspectionDate = new Date().toISOString().split("T")[0];
    next.completionDate = new Date().toISOString().split("T")[0];
    next.entryMode = "online";
    next.specModel = "";
    next.inspectionStandard = BIOBURDEN_STANDARD_OPTIONS[0];
    next.mediumBatchNos = JSON.stringify(["", "", ""]);
    next.bioburdenRows = JSON.stringify(defaultBioburdenRowNames.map((name) => ({ itemName: name, plate1: "", plate2: "", average: "", conclusion: "qualified" })));
    next.paperReportName = "";
    next.paperReportPath = "";
    next.result = "qualified";
  }

  if (form.id === "sterility") {
    next.finalResult = "qualified";
    next.inspectionDate = new Date().toISOString().split("T")[0];
    next.entryMode = "online";
    next.endotoxinLimit = "";
    next.samplePreparation = "";
    next.inspectionBasis = "";
    next.sterilityRows = JSON.stringify(defaultSterilityRowNames.map((name) => ({ itemName: name, colony1: "", colony2: "", average: "", conclusion: "qualified" })));
    next.paperReportName = "";
    next.paperReportPath = "";
    next.result = "qualified";
  }

  return next;
}

function formatDateValue(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().split("T")[0];
}

function normalizeLabRecord(item: any): LabRecordView {
  return {
    id: Number(item?.id ?? 0),
    recordNo: String(item?.recordNo ?? ""),
    formId: String(item?.formId ?? ""),
    formTitle: String(item?.formTitle ?? item?.testType ?? ""),
    formType: String(item?.formType ?? ""),
    testType: String(item?.testType ?? ""),
    testMethod: String(item?.testMethod ?? ""),
    specification: String(item?.specification ?? ""),
    result: String(item?.result ?? ""),
    conclusion: (item?.conclusion ?? "pending") as LabRecordView["conclusion"],
    status: (item?.status ?? "pending") as LabRecordView["status"],
    testerName: String(item?.testerName ?? ""),
    reviewerName: String(item?.reviewerName ?? ""),
    testDate: item?.testDate ? formatDateValue(item.testDate) : "",
    reviewDate: item?.reviewDate ? formatDateValue(item.reviewDate) : "",
    remark: String(item?.remark ?? ""),
    formData: item?.formData && typeof item.formData === "object" ? item.formData as Record<string, string> : {},
    createdAt: item?.createdAt ? formatDateValue(item.createdAt) : "",
    updatedAt: item?.updatedAt ? formatDateValue(item.updatedAt) : "",
    sourceType: item?.sourceType ?? undefined,
    sourceId: item?.sourceId ? Number(item.sourceId) : undefined,
    sourceItemId: item?.sourceItemId ? Number(item.sourceItemId) : undefined,
  };
}

function normalizeConclusion(value?: string) {
  if (value === "pass" || value === "fail" || value === "pending") return value;
  if (!value) return "pending";
  if (["合格", "通过", "pass", "ok"].includes(value.toLowerCase?.() || "")) return "pass";
  if (["不合格", "失败", "fail", "ng"].includes(value.toLowerCase?.() || "")) return "fail";
  return "pending";
}

function normalizeStatus(value?: string) {
  if (value === "pending" || value === "testing" || value === "completed" || value === "reviewed") return value;
  return "pending";
}

function findTestDate(values: Record<string, string>) {
  return values.testDate || values.recordDate || values.sampleDate || values.monitorDate || values.effectiveDate || "";
}

function buildLabRecordNo(formId: string, records: LabRecordView[]) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = formId
    .split("-")
    .map((part) => part.slice(0, 1))
    .join("")
    .toUpperCase()
    .slice(0, 4) || "LAB";
  const seq = records.filter((item) => item.formId === formId).length + 1;
  return `LAB-${prefix}-${datePart}-${String(seq).padStart(3, "0")}`;
}

function buildRecordPayload(form: LabFormConfig, values: Record<string, string>, records: LabRecordView[]) {
  const recordNo = (values.docNo || "").trim() || buildLabRecordNo(form.id, records);
  const formData: Record<string, string> = {};
  for (const section of form.sections) {
    for (const field of section.fields) {
      formData[field.id] = values[field.id] || "";
    }
  }

  if (form.id === "pw-chemical") {
    const inspectionRows = parsePwChemicalRows(values.inspectionItems);
    const inspectors = Array.from(new Set(inspectionRows.map((item) => item.inspector.trim()).filter(Boolean)));
    return {
      recordNo,
      formId: form.id,
      formTitle: form.title,
      formType: form.type,
      testType: form.shortTitle,
      testMethod: values.reportMode === "paper" ? "上传纸质报告" : "在线填写报告",
      specification: values.standard || undefined,
      result: inspectionRows.map((item) => `${item.itemName}:${item.conclusion === "pass" ? "符合" : "不符合"}`).join("；"),
      formData: {
        ...formData,
        inspectionItems: JSON.stringify(inspectionRows),
        signatures: values.signatures || "[]",
      },
      conclusion: (values.finalResult === "fail" ? "fail" : "pass") as "pass" | "fail",
      testDate: values.sampleDate || undefined,
      testerName: values.testerName || inspectors.join("、") || undefined,
      reviewerName: undefined,
      reviewDate: undefined,
      status: normalizeStatus(values.status) as "pending" | "testing" | "completed" | "reviewed",
      remark: values.remark || undefined,
    };
  }

  if (form.id === "pw-microbial") {
    const cultureMediaItems = parsePwMicrobialMediaRows(values.cultureMediaItems);
    const resultItems = parsePwMicrobialResultRows(values.resultItems);
    return {
      recordNo,
      formId: form.id,
      formTitle: form.title,
      formType: form.type,
      testType: form.shortTitle,
      testMethod: values.reportMode === "paper" ? "上传纸质报告" : values.inspectionItem || "在线填写报告",
      specification: values.standard || undefined,
      result: resultItems.map((item) => `${item.sampleArea}:${item.result || "-"}(${item.conclusion === "pass" ? "符合" : "不符合"})`).join("；"),
      formData: {
        ...formData,
        cultureMediaItems: JSON.stringify(cultureMediaItems),
        resultItems: JSON.stringify(resultItems),
        signatures: values.signatures || "[]",
      },
      conclusion: (values.finalResult === "fail" ? "fail" : "pass") as "pass" | "fail",
      testDate: values.inspectionDate || values.sampleDate || undefined,
      testerName: values.inspector || undefined,
      reviewerName: undefined,
      reviewDate: undefined,
      status: normalizeStatus(values.status) as "pending" | "testing" | "completed" | "reviewed",
      remark: values.remark || undefined,
    };
  }

  if (form.id === "airborne-microbe") {
    const cultureMediaItems = parseAirborneMediaRows(values.cultureMediaItems);
    const measurementItems = parseAirborneMeasurementRows(values.measurementItems);
    return {
      recordNo,
      formId: form.id,
      formTitle: form.title,
      formType: form.type,
      testType: form.shortTitle,
      testMethod: values.reportMode === "paper" ? "上传纸质报告" : "在线填写报告",
      specification: values.standard || undefined,
      result: measurementItems.map((item) => `${item.cleanRoomName || item.areaDivision}:${calculateAirborneAverage(item) || "-"}(${item.conclusion === "pass" ? "合格" : "不合格"})`).join("；"),
      formData: {
        ...formData,
        cultureMediaItems: JSON.stringify(cultureMediaItems),
        measurementItems: JSON.stringify(measurementItems),
        signatures: values.signatures || "[]",
      },
      conclusion: (values.finalResult === "fail" ? "fail" : "pass") as "pass" | "fail",
      testDate: values.inspectionDate || undefined,
      testerName: values.inspector || undefined,
      reviewerName: undefined,
      reviewDate: undefined,
      status: normalizeStatus(values.status) as "pending" | "testing" | "completed" | "reviewed",
      remark: values.remark || undefined,
    };
  }

  if (form.id === "settling-bacteria") {
    const cultureMediaItems = parseAirborneMediaRows(values.cultureMediaItems);
    const measurementItems = parseAirborneMeasurementRows(values.measurementItems);
    return {
      recordNo,
      formId: form.id,
      formTitle: form.title,
      formType: form.type,
      testType: form.shortTitle,
      testMethod: values.reportMode === "paper" ? "上传纸质报告" : "在线填写报告",
      specification: values.standard || undefined,
      result: measurementItems.map((item) => `${item.cleanRoomName || item.areaDivision}:${calculateAirborneAverage(item) || "-"}(${item.conclusion === "pass" ? "合格" : "不合格"})`).join("；"),
      formData: {
        ...formData,
        cultureMediaItems: JSON.stringify(cultureMediaItems),
        measurementItems: JSON.stringify(measurementItems),
        signatures: values.signatures || "[]",
      },
      conclusion: (values.finalResult === "fail" ? "fail" : "pass") as "pass" | "fail",
      testDate: values.inspectionDate || undefined,
      testerName: values.inspector || undefined,
      reviewerName: undefined,
      reviewDate: undefined,
      status: normalizeStatus(values.status) as "pending" | "testing" | "completed" | "reviewed",
      remark: values.remark || undefined,
    };
  }

  if (form.id === "particle-monitor") {
    const measurementItems = parseParticleMeasurementRows(values.measurementItems);
    return {
      recordNo,
      formId: form.id,
      formTitle: form.title,
      formType: form.type,
      testType: form.shortTitle,
      testMethod: values.reportMode === "paper" ? "上传纸质报告" : `${values.inspectionType === "dynamic" ? "动态" : "静态"}检测`,
      specification: values.standard || undefined,
      result: measurementItems.map((item) => `${item.cleanRoomName || item.areaDivision}:${item.particleSize || "-"}[${[item.value1, item.value2, item.value3, item.value4].filter(Boolean).join("/")}] UCL:${item.ucl || "-"} (${item.conclusion === "pass" ? "合格" : "不合格"})`).join("；"),
      formData: {
        ...formData,
        measurementItems: JSON.stringify(measurementItems),
        signatures: values.signatures || "[]",
      },
      conclusion: (values.finalResult === "fail" ? "fail" : "pass") as "pass" | "fail",
      testDate: values.inspectionDate || undefined,
      testerName: values.inspector || undefined,
      reviewerName: undefined,
      reviewDate: undefined,
      status: normalizeStatus(values.status) as "pending" | "testing" | "completed" | "reviewed",
      remark: values.remark || undefined,
    };
  }

  if (form.id === "airflow-monitor") {
    const measurementItems = parseAirflowMeasurementRows(values.measurementItems);
    return {
      recordNo,
      formId: form.id,
      formTitle: form.title,
      formType: form.type,
      testType: form.shortTitle,
      testMethod: values.reportMode === "paper" ? "上传纸质报告" : "在线填写报告",
      specification: values.standard || undefined,
      result: measurementItems.map((item) => `${item.cleanRoomName || item.areaDivision}:风量${item.airVolume || "-"},换气次数${item.airChanges || "-"}(${item.conclusion === "pass" ? "合格" : "不合格"})`).join("；"),
      formData: {
        ...formData,
        measurementItems: JSON.stringify(measurementItems),
        signatures: values.signatures || "[]",
      },
      conclusion: (values.finalResult === "fail" ? "fail" : "pass") as "pass" | "fail",
      testDate: values.inspectionDate || undefined,
      testerName: values.inspector || undefined,
      reviewerName: undefined,
      reviewDate: undefined,
      status: normalizeStatus(values.status) as "pending" | "testing" | "completed" | "reviewed",
      remark: values.remark || undefined,
    };
  }

  if (form.id === "endotoxin-sop") {
    const reagentItems = parseEndotoxinReagentRows(values.reagentItems);
    const testItems = parseEndotoxinTestRows(values.testItems);
    return {
      recordNo,
      formId: form.id,
      formTitle: form.title,
      formType: form.type,
      testType: form.shortTitle,
      testMethod: values.reportMode === "paper" ? "上传纸质报告" : "在线填写报告",
      specification: values.standard || undefined,
      result: testItems.map((item) => `${item.solutionName}:${item.result1 || "-"}/${item.result2 || "-"}`).join("；"),
      formData: {
        ...formData,
        reagentItems: JSON.stringify(reagentItems),
        testItems: JSON.stringify(testItems),
        signatures: values.signatures || "[]",
      },
      conclusion: (values.finalResult === "fail" ? "fail" : "pass") as "pass" | "fail",
      testDate: values.inspectionDate || undefined,
      testerName: values.inspector || undefined,
      reviewerName: undefined,
      reviewDate: undefined,
      status: normalizeStatus(values.status) as "pending" | "testing" | "completed" | "reviewed",
      remark: values.remark || undefined,
    };
  }

  if (form.id === "bioburden") {
    const bioRows = parseBioburdenRows(values.bioburdenRows);
    const mediumBatchNos = parseMediumBatchNos(values.mediumBatchNos);
    const conclusion = (values.result === "unqualified" ? "fail" : "pass") as "pass" | "fail";
    return {
      recordNo,
      formId: form.id,
      formTitle: form.title,
      formType: form.type,
      testType: form.shortTitle,
      result: values.result === "unqualified" ? "不合格" : "合格",
      formData: {
        ...formData,
        entryMode: values.entryMode || "online",
        specModel: values.specModel || "",
        completionDate: values.completionDate || "",
        inspectionStandard: values.inspectionStandard || BIOBURDEN_STANDARD_OPTIONS[0],
        mediumBatchNos: JSON.stringify(mediumBatchNos),
        bioburdenRows: JSON.stringify(bioRows),
        paperReportName: values.paperReportName || "",
        paperReportPath: values.paperReportPath || "",
        batchNo: values.batchNo || "",
        productName: values.productName || "",
        result: values.result || "qualified",
      },
      conclusion,
      testDate: values.inspectionDate || undefined,
      testerName: values.inspector || undefined,
      reviewerName: undefined,
      status: normalizeStatus(values.status) as "pending" | "testing" | "completed" | "reviewed",
      remark: values.remark || undefined,
    };
  }

  if (form.id === "sterility") {
    const sterilityRows = parseSterilityRows(values.sterilityRows);
    const conclusion = (values.result === "unqualified" ? "fail" : "pass") as "pass" | "fail";
    return {
      recordNo,
      formId: form.id,
      formTitle: form.title,
      formType: form.type,
      testType: form.shortTitle,
      result: values.result === "unqualified" ? "不合格" : "合格",
      formData: {
        ...formData,
        entryMode: values.entryMode || "online",
        endotoxinLimit: values.endotoxinLimit || "",
        samplePreparation: values.samplePreparation || "",
        inspectionBasis: values.inspectionBasis || "",
        sterilityRows: JSON.stringify(sterilityRows),
        paperReportName: values.paperReportName || "",
        paperReportPath: values.paperReportPath || "",
        batchNo: values.batchNo || "",
        productName: values.productName || "",
        productCode: values.productCode || "",
        quantity: values.quantity || "",
        sterilizationBatchNo: values.sterilizationBatchNo || "",
        warehouseEntryNo: values.warehouseEntryNo || "",
        result: values.result || "qualified",
      },
      conclusion,
      testDate: values.inspectionDate || undefined,
      testerName: values.inspector || undefined,
      reviewerName: undefined,
      status: normalizeStatus(values.status) as "pending" | "testing" | "completed" | "reviewed",
      remark: values.remark || undefined,
    };
  }

  return {
    recordNo,
    formId: form.id,
    formTitle: form.title,
    formType: form.type,
    testType: form.shortTitle,
    testMethod: values.testMethod || undefined,
    specification: values.specification || undefined,
    result: values.result || undefined,
    formData,
    conclusion: normalizeConclusion(values.conclusion) as "pass" | "fail" | "pending",
    testDate: findTestDate(values) || undefined,
    testerName: values.testerName || values.executor || values.owner || undefined,
    reviewerName: values.reviewerName || values.reviewer || undefined,
    reviewDate: values.reviewDate || undefined,
    status: normalizeStatus(values.status) as "pending" | "testing" | "completed" | "reviewed",
    remark: values.remark || undefined,
  };
}

function buildRecordViewState(form: LabFormConfig, record: LabRecordView) {
  const next = {
    ...buildInitialState(form, record.recordNo),
    ...record.formData,
    docNo: record.recordNo,
    testDate: record.testDate || "",
    testMethod: record.testMethod || "",
    specification: record.specification || "",
    result: record.result || "",
    testerName: record.testerName || "",
    reviewerName: record.reviewerName || "",
    reviewDate: record.reviewDate || "",
    status: record.status || "pending",
    conclusion: record.conclusion || "pending",
    remark: record.remark || "",
  };

  if (form.id === "pw-chemical") {
    next.reportMode = record.formData.reportMode || "online";
    next.inspectionItems = record.formData.inspectionItems || JSON.stringify(buildDefaultPwChemicalRows());
    next.finalResult = record.formData.finalResult || (record.conclusion === "fail" ? "fail" : "pass");
    next.signatures = record.formData.signatures || "[]";
  }

  if (form.id === "pw-microbial") {
    next.reportMode = record.formData.reportMode || "online";
    next.category = record.formData.category || "纯化水";
    next.reportName = record.formData.reportName || "";
    next.cultureMediaItems = record.formData.cultureMediaItems || JSON.stringify(buildDefaultPwMicrobialMediaRows());
    next.resultItems = record.formData.resultItems || JSON.stringify(buildDefaultPwMicrobialResultRows());
    next.finalResult = record.formData.finalResult || (record.conclusion === "fail" ? "fail" : "pass");
    next.signatures = record.formData.signatures || "[]";
  }

  if (form.id === "airborne-microbe") {
    next.reportMode = record.formData.reportMode || "online";
    next.cultureMediaItems = record.formData.cultureMediaItems || JSON.stringify(buildDefaultAirborneMediaRows());
    next.measurementItems = record.formData.measurementItems || JSON.stringify(buildDefaultAirborneMeasurementRows());
    next.finalResult = record.formData.finalResult || (record.conclusion === "fail" ? "fail" : "pass");
    next.signatures = record.formData.signatures || "[]";
  }

  if (form.id === "settling-bacteria") {
    next.reportMode = record.formData.reportMode || "online";
    next.cultureMediaItems = record.formData.cultureMediaItems || JSON.stringify(buildDefaultAirborneMediaRows());
    next.measurementItems = record.formData.measurementItems || JSON.stringify(buildDefaultAirborneMeasurementRows());
    next.finalResult = record.formData.finalResult || (record.conclusion === "fail" ? "fail" : "pass");
    next.signatures = record.formData.signatures || "[]";
  }

  if (form.id === "particle-monitor") {
    next.reportMode = record.formData.reportMode || "online";
    next.measurementItems = record.formData.measurementItems || JSON.stringify(buildDefaultParticleMeasurementRows());
    next.finalResult = record.formData.finalResult || (record.conclusion === "fail" ? "fail" : "pass");
    next.signatures = record.formData.signatures || "[]";
  }

  if (form.id === "airflow-monitor") {
    next.reportMode = record.formData.reportMode || "online";
    next.measurementItems = record.formData.measurementItems || JSON.stringify(buildDefaultAirflowMeasurementRows());
    next.finalResult = record.formData.finalResult || (record.conclusion === "fail" ? "fail" : "pass");
    next.signatures = record.formData.signatures || "[]";
  }

  if (form.id === "endotoxin-sop") {
    next.reportMode = record.formData.reportMode || "online";
    next.reagentItems = record.formData.reagentItems || JSON.stringify(buildDefaultEndotoxinReagentRows());
    next.testItems = record.formData.testItems || JSON.stringify(buildDefaultEndotoxinTestRows());
    next.finalResult = record.formData.finalResult || (record.conclusion === "fail" ? "fail" : "pass");
    next.signatures = record.formData.signatures || "[]";
  }

  if (form.id === "bioburden") {
    next.entryMode = record.formData.entryMode || "online";
    next.specModel = record.formData.specModel || "";
    next.completionDate = record.formData.completionDate || record.testDate || new Date().toISOString().split("T")[0];
    next.inspectionDate = record.formData.inspectionDate || record.testDate || "";
    next.inspector = record.formData.inspector || record.testerName || "";
    next.inspectionStandard = record.formData.inspectionStandard || BIOBURDEN_STANDARD_OPTIONS[0];
    next.mediumBatchNos = record.formData.mediumBatchNos || JSON.stringify(["", "", ""]);
    next.bioburdenRows = record.formData.bioburdenRows || JSON.stringify(defaultBioburdenRowNames.map((name) => ({ itemName: name, plate1: "", plate2: "", average: "", conclusion: "qualified" })));
    next.paperReportName = record.formData.paperReportName || "";
    next.paperReportPath = record.formData.paperReportPath || "";
    next.result = record.formData.result || (record.conclusion === "fail" ? "unqualified" : "qualified");
    next.finalResult = record.formData.finalResult || (record.conclusion === "fail" ? "unqualified" : "qualified");
    next.batchNo = record.formData.batchNo || "";
    next.productName = record.formData.productName || "";
  }

  if (form.id === "sterility") {
    next.entryMode = record.formData.entryMode || "online";
    next.inspectionDate = record.formData.inspectionDate || record.testDate || "";
    next.inspector = record.formData.inspector || record.testerName || "";
    next.endotoxinLimit = record.formData.endotoxinLimit || "";
    next.samplePreparation = record.formData.samplePreparation || "";
    next.inspectionBasis = record.formData.inspectionBasis || "";
    next.sterilityRows = record.formData.sterilityRows || JSON.stringify(defaultSterilityRowNames.map((name) => ({ itemName: name, colony1: "", colony2: "", average: "", conclusion: "qualified" })));
    next.paperReportName = record.formData.paperReportName || "";
    next.paperReportPath = record.formData.paperReportPath || "";
    next.result = record.formData.result || (record.conclusion === "fail" ? "unqualified" : "qualified");
    next.finalResult = record.formData.finalResult || (record.conclusion === "fail" ? "unqualified" : "qualified");
    next.batchNo = record.formData.batchNo || "";
    next.productName = record.formData.productName || "";
    next.productCode = record.formData.productCode || "";
    next.quantity = record.formData.quantity || "";
    next.sterilizationBatchNo = record.formData.sterilizationBatchNo || "";
    next.warehouseEntryNo = record.formData.warehouseEntryNo || "";
  }

  return next;
}

export default function LabPage() {
  const [location, setLocation] = useLocation();
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({}); 
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [pendingLoadRecordId, setPendingLoadRecordId] = useState<number | null>(null);
  // URL 参数：来源信息（从 IQC/OQC 跳转过来时携带）
  const urlParams = useMemo(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    const sourceType = p.get("sourceType") || undefined;
    const sourceId = p.get("sourceId") ? Number(p.get("sourceId")) : undefined;
    const sourceItemId = p.get("sourceItemId") ? Number(p.get("sourceItemId")) : undefined;
    const testType = p.get("testType") || undefined; // "bioburden" | "sterility"
    const itemName = p.get("itemName") || undefined;
    if (!sourceType) return null;
    return { sourceType, sourceId, sourceItemId, testType, itemName };
  }, []);
  const [viewingRecord, setViewingRecord] = useState<LabRecordView | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewDialogMaximized, setViewDialogMaximized] = useState(false);
  const [endotoxinSamplePickerOpen, setEndotoxinSamplePickerOpen] = useState(false);
  const pathParts = location.split("/").filter(Boolean);
  const currentFormId = pathParts[2];
  const activeForm = LAB_FORMS.find((item) => item.id === currentFormId) || null;
  const isOverviewPage = !activeForm;
  const { data: rawRecords = [], isLoading, refetch } = trpc.labRecords.list.useQuery({ limit: 500 });
  const { data: productionWarehouseEntriesData = [] } = trpc.productionWarehouseEntries.list.useQuery({}, { refetchOnWindowFocus: false });
  const { data: productsData = [] } = trpc.products.list.useQuery({}, { refetchOnWindowFocus: false });
  const createMutation = trpc.labRecords.create.useMutation();
  const updateMutation = trpc.labRecords.update.useMutation();
  const deleteMutation = trpc.labRecords.delete.useMutation();
  const completeAndWriteBackMutation = trpc.labRecords.completeAndWriteBack.useMutation();
  const records = useMemo(() => (rawRecords as any[]).map(normalizeLabRecord), [rawRecords]);
  const formRecords = useMemo(
    () => (activeForm ? records.filter((item) => item.formId === activeForm.id) : []),
    [activeForm, records]
  );
  const visibleForms = useMemo(() => {
    return LAB_FORMS.filter((form) => {
      const matchesType = typeFilter === "all" || form.type === typeFilter;
      const keyword = search.trim().toLowerCase();
      const matchesSearch =
        keyword.length === 0 ||
        form.title.toLowerCase().includes(keyword) ||
        form.shortTitle.toLowerCase().includes(keyword) ||
        form.description.toLowerCase().includes(keyword);
      return matchesType && matchesSearch;
    });
  }, [search, typeFilter]);
  const stats = useMemo(() => ([
    { label: "表单总数", value: LAB_FORMS.length, color: "text-foreground" },
    { label: "记录总数", value: records.length, color: "text-blue-600" },
    { label: "待处理", value: records.filter((item) => item.status === "pending" || item.status === "testing").length, color: "text-amber-600" },
    { label: "已完成", value: records.filter((item) => item.status === "completed" || item.status === "reviewed").length, color: "text-emerald-600" },
  ]), [records]);

  const typeBadgeClassMap: Record<LabFormConfig["type"], string> = {
    记录: "bg-blue-50 text-blue-700 border-blue-200",
    检验: "bg-emerald-50 text-emerald-700 border-emerald-200",
    SOP: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const currentValues = useMemo(() => {
    if (!activeForm) {
      return {};
    }
    return formValues[activeForm.id] || buildInitialState(activeForm, buildLabRecordNo(activeForm.id, records));
  }, [activeForm, formValues, records]);
  const isPwChemicalPage = activeForm?.id === "pw-chemical";
  const isPwMicrobialPage = activeForm?.id === "pw-microbial";
  const isAirbornePage = activeForm?.id === "airborne-microbe";
  const isSettlingPage = activeForm?.id === "settling-bacteria";
  const isParticlePage = activeForm?.id === "particle-monitor";
  const isAirflowPage = activeForm?.id === "airflow-monitor";
  const isEndotoxinPage = activeForm?.id === "endotoxin-sop";
  const pwChemicalRows = useMemo(
    () => (isPwChemicalPage ? parsePwChemicalRows(currentValues.inspectionItems) : []),
    [isPwChemicalPage, currentValues.inspectionItems]
  );
  const pwChemicalSignatures = useMemo(
    () => (isPwChemicalPage ? parseSignatureRecords(currentValues.signatures) : []),
    [isPwChemicalPage, currentValues.signatures]
  );
  const pwChemicalHistory = useMemo(() => buildPwChemicalHistory(records), [records]);
  const pwMicrobialMediaRows = useMemo(
    () => (isPwMicrobialPage ? parsePwMicrobialMediaRows(currentValues.cultureMediaItems) : []),
    [isPwMicrobialPage, currentValues.cultureMediaItems]
  );
  const pwMicrobialResultRows = useMemo(
    () => (isPwMicrobialPage ? parsePwMicrobialResultRows(currentValues.resultItems) : []),
    [isPwMicrobialPage, currentValues.resultItems]
  );
  const pwMicrobialSignatures = useMemo(
    () => (isPwMicrobialPage ? parseSignatureRecords(currentValues.signatures) : []),
    [isPwMicrobialPage, currentValues.signatures]
  );
  const pwMicrobialHistory = useMemo(() => buildPwMicrobialHistory(records), [records]);
  const airborneMediaRows = useMemo(
    () => (isAirbornePage ? parseAirborneMediaRows(currentValues.cultureMediaItems) : []),
    [isAirbornePage, currentValues.cultureMediaItems]
  );
  const airborneMeasurementRows = useMemo(
    () => (isAirbornePage ? parseAirborneMeasurementRows(currentValues.measurementItems) : []),
    [isAirbornePage, currentValues.measurementItems]
  );
  const airborneSignatures = useMemo(
    () => (isAirbornePage ? parseSignatureRecords(currentValues.signatures) : []),
    [isAirbornePage, currentValues.signatures]
  );
  const airborneHistory = useMemo(() => buildAirborneHistory(records), [records]);
  const settlingMediaRows = useMemo(
    () => (isSettlingPage ? parseAirborneMediaRows(currentValues.cultureMediaItems) : []),
    [isSettlingPage, currentValues.cultureMediaItems]
  );
  const settlingMeasurementRows = useMemo(
    () => (isSettlingPage ? parseAirborneMeasurementRows(currentValues.measurementItems) : []),
    [isSettlingPage, currentValues.measurementItems]
  );
  const settlingSignatures = useMemo(
    () => (isSettlingPage ? parseSignatureRecords(currentValues.signatures) : []),
    [isSettlingPage, currentValues.signatures]
  );
  const settlingHistory = useMemo(() => buildSettlingHistory(records), [records]);
  const particleMeasurementRows = useMemo(
    () => (isParticlePage ? parseParticleMeasurementRows(currentValues.measurementItems) : []),
    [isParticlePage, currentValues.measurementItems]
  );
  const particleSignatures = useMemo(
    () => (isParticlePage ? parseSignatureRecords(currentValues.signatures) : []),
    [isParticlePage, currentValues.signatures]
  );
  const particleHistory = useMemo(() => buildParticleHistory(records), [records]);
  const airflowMeasurementRows = useMemo(
    () => (isAirflowPage ? parseAirflowMeasurementRows(currentValues.measurementItems) : []),
    [isAirflowPage, currentValues.measurementItems]
  );
  const airflowSignatures = useMemo(
    () => (isAirflowPage ? parseSignatureRecords(currentValues.signatures) : []),
    [isAirflowPage, currentValues.signatures]
  );
  const airflowHistory = useMemo(() => buildAirflowHistory(records), [records]);
  const endotoxinReagentRows = useMemo(
    () => (isEndotoxinPage ? parseEndotoxinReagentRows(currentValues.reagentItems) : []),
    [isEndotoxinPage, currentValues.reagentItems]
  );
  const endotoxinTestRows = useMemo(
    () => (isEndotoxinPage ? parseEndotoxinTestRows(currentValues.testItems) : []),
    [isEndotoxinPage, currentValues.testItems]
  );
  const endotoxinSignatures = useMemo(
    () => (isEndotoxinPage ? parseSignatureRecords(currentValues.signatures) : []),
    [isEndotoxinPage, currentValues.signatures]
  );
  const endotoxinHistory = useMemo(() => buildEndotoxinHistory(records), [records]);

  // Bioburden / Sterility 专用状态
  const isBioburdenPage = activeForm?.id === "bioburden";
  const isSterilityPage = activeForm?.id === "sterility";
  const bioburdenRows = useMemo(
    () => (isBioburdenPage ? parseBioburdenRows(currentValues.bioburdenRows) : []),
    [isBioburdenPage, currentValues.bioburdenRows]
  );
  const sterilityRows = useMemo(
    () => (isSterilityPage ? parseSterilityRows(currentValues.sterilityRows) : []),
    [isSterilityPage, currentValues.sterilityRows]
  );
  const bioburdenMediumBatchNos = useMemo(
    () => (isBioburdenPage ? parseMediumBatchNos(currentValues.mediumBatchNos) : ["", "", ""]),
    [isBioburdenPage, currentValues.mediumBatchNos]
  );
  const bioburdenPaperInputRef = useRef<HTMLInputElement>(null);
  const sterilityPaperInputRef = useRef<HTMLInputElement>(null);

  const updateBioburdenRow = (index: number, field: keyof BioburdenRow, value: string) => {
    if (!activeForm) return;
    const rows = [...bioburdenRows];
    const row = { ...rows[index], [field]: value };
    if (field === "plate1" || field === "plate2") {
      row.average = calcBioburdenAverage(field === "plate1" ? value : row.plate1, field === "plate2" ? value : row.plate2);
    }
    rows[index] = row as BioburdenRow;
    updateField(activeForm.id, "bioburdenRows", JSON.stringify(rows));
  };

  const addBioburdenRow = () => {
    if (!activeForm) return;
    const rows = [...bioburdenRows, { itemName: "", plate1: "", plate2: "", average: "", conclusion: "qualified" as const }];
    updateField(activeForm.id, "bioburdenRows", JSON.stringify(rows));
  };

  const removeBioburdenRow = (index: number) => {
    if (!activeForm || bioburdenRows.length <= 1) return;
    const rows = bioburdenRows.filter((_, i) => i !== index);
    updateField(activeForm.id, "bioburdenRows", JSON.stringify(rows));
  };

  const updateSterilityRow = (index: number, field: keyof SterilityRow, value: string) => {
    if (!activeForm) return;
    const rows = [...sterilityRows];
    const row = { ...rows[index], [field]: value };
    if (field === "colony1" || field === "colony2") {
      row.average = calcSterilityAverage(field === "colony1" ? value : row.colony1, field === "colony2" ? value : row.colony2);
    }
    rows[index] = row as SterilityRow;
    updateField(activeForm.id, "sterilityRows", JSON.stringify(rows));
  };

  const addSterilityRow = () => {
    if (!activeForm) return;
    const rows = [...sterilityRows, { itemName: "", colony1: "", colony2: "", average: "", conclusion: "qualified" as const }];
    updateField(activeForm.id, "sterilityRows", JSON.stringify(rows));
  };

  const removeSterilityRow = (index: number) => {
    if (!activeForm || sterilityRows.length <= 1) return;
    const rows = sterilityRows.filter((_, i) => i !== index);
    updateField(activeForm.id, "sterilityRows", JSON.stringify(rows));
  };

  const handleBioburdenPaperUpload = (files: FileList | null) => {
    if (!files || !files[0] || !activeForm) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      updateField(activeForm.id, "paperReportName", file.name);
      updateField(activeForm.id, "paperReportPath", String(reader.result || ""));
      toast.success("纸质报告已上传");
    };
    reader.readAsDataURL(file);
  };

  const handleSterilityPaperUpload = (files: FileList | null) => {
    if (!files || !files[0] || !activeForm) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      updateField(activeForm.id, "paperReportName", file.name);
      updateField(activeForm.id, "paperReportPath", String(reader.result || ""));
      toast.success("纸质报告已上传");
    };
    reader.readAsDataURL(file);
  };

  const { data: personnelData = [] } = trpc.personnel.list.useQuery(
    { status: "active", limit: 500 },
    { refetchOnWindowFocus: false }
  );
  const { user } = useAuth();
  const currentUserName = String((user as any)?.name || "").trim();
  const inspectorOptions = useMemo(() => {
    const names = (personnelData as any[]).map((p: any) => String(p.name || "").trim()).filter(Boolean);
    if (currentUserName && !names.includes(currentUserName)) {
      return [currentUserName, ...names];
    }
    return names.length > 0 ? names : [currentUserName].filter(Boolean);
  }, [personnelData, currentUserName]);
  const endotoxinProductSpecMap = useMemo(() => {
    return new Map((productsData as any[]).map((item: any) => [String(item.id || ""), String(item.specification || item.model || "")]));
  }, [productsData]);
  const endotoxinSampleRows = useMemo(() => {
    return (productionWarehouseEntriesData as any[])
      .filter((item: any) => String(item?.productName || "").trim())
      .map((item: any) => ({
        id: Number(item.id),
        entryNo: String(item.entryNo || ""),
        productName: String(item.productName || ""),
        productId: String(item.productId || ""),
        specification: endotoxinProductSpecMap.get(String(item.productId || "")) || "",
        batchNo: String(item.batchNo || ""),
        sterilizationBatchNo: String(item.sterilizationBatchNo || ""),
        quantity: String(item.quantity || ""),
        unit: String(item.unit || ""),
        status: String(item.status || ""),
      }));
  }, [productionWarehouseEntriesData, endotoxinProductSpecMap]);

  // URL 参数处理：当有 testType 参数时自动跳转到对应表单
  const urlParamsHandledRef = useRef(false);
  useEffect(() => {
    if (!urlParams || urlParamsHandledRef.current) return;
    if (isOverviewPage) {
      // 如果当前在总览页，自动跳转到对应表单
      const formId = urlParams.testType === "bioburden" ? "bioburden" : urlParams.testType === "sterility" ? "sterility" : null;
      if (formId) {
        urlParamsHandledRef.current = true;
        setLocation(`/quality/lab/${formId}`);
      }
    } else if (activeForm && (activeForm.id === "bioburden" || activeForm.id === "sterility")) {
      // 已在对应表单，自动填充样品名称
      urlParamsHandledRef.current = true;
      if (urlParams.itemName) {
        setFormValues((prev) => ({
          ...prev,
          [activeForm.id]: {
            ...(prev[activeForm.id] || buildInitialState(activeForm, buildLabRecordNo(activeForm.id, records))),
            sampleName: urlParams.itemName || "",
          },
        }));
      }
    }
  }, [urlParams, isOverviewPage, activeForm, records, setLocation]);

  useEffect(() => {
    if (!activeForm) {
      setEditingRecordId(null);
      return;
    }

    setFormValues((prev) => {
      if (prev[activeForm.id]) return prev;
      return {
        ...prev,
        [activeForm.id]: buildInitialState(activeForm, buildLabRecordNo(activeForm.id, records)),
      };
    });
  }, [activeForm, records]);

  useEffect(() => {
    if (!activeForm || !pendingLoadRecordId) return;
    const record = records.find((item) => item.id === pendingLoadRecordId && item.formId === activeForm.id);
    if (!record) return;
    setFormValues((prev) => ({
      ...prev,
      [activeForm.id]: buildRecordViewState(activeForm, record),
    }));
    setEditingRecordId(record.id);
    setPendingLoadRecordId(null);
  }, [activeForm, pendingLoadRecordId, records]);

  const updateField = (formId: string, fieldId: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [formId]: {
        ...(prev[formId] || buildInitialState(LAB_FORMS.find((item) => item.id === formId)!)),
        [fieldId]: value,
      },
    }));
  };

  const updatePwChemicalRows = (rows: PwChemicalInspectionRow[]) => {
    if (!activeForm) return;
    updateField(activeForm.id, "inspectionItems", JSON.stringify(rows));
    updateField(activeForm.id, "finalResult", rows.every((item) => item.conclusion === "pass") ? "pass" : "fail");
  };

  const updatePwChemicalRow = (rowId: string, patch: Partial<PwChemicalInspectionRow>) => {
    updatePwChemicalRows(
      pwChemicalRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const handleAddPwChemicalRow = () => {
    const nextIndex = pwChemicalRows.length + 1;
    updatePwChemicalRows([
      ...pwChemicalRows,
      {
        id: `pw-chemical-extra-${Date.now()}-${nextIndex}`,
        itemName: "",
        conclusion: "pass",
        inspector: "",
        inspectionDate: currentValues.sampleDate || "",
      },
    ]);
    toast.success("已新增一行检验内容");
  };

  const updatePwMicrobialMediaRows = (rows: PwMicrobialCultureMediumRow[]) => {
    if (!activeForm) return;
    updateField(activeForm.id, "cultureMediaItems", JSON.stringify(rows));
  };

  const updatePwMicrobialMediaRow = (rowId: string, patch: Partial<PwMicrobialCultureMediumRow>) => {
    updatePwMicrobialMediaRows(
      pwMicrobialMediaRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const updatePwMicrobialResultRows = (rows: PwMicrobialResultRow[]) => {
    if (!activeForm) return;
    updateField(activeForm.id, "resultItems", JSON.stringify(rows));
    updateField(activeForm.id, "finalResult", rows.every((item) => item.conclusion === "pass") ? "pass" : "fail");
  };

  const updatePwMicrobialResultRow = (rowId: string, patch: Partial<PwMicrobialResultRow>) => {
    updatePwMicrobialResultRows(
      pwMicrobialResultRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const handlePwMicrobialSampleAreasChange = (value: string) => {
    if (!activeForm) return;
    updateField(activeForm.id, "sampleAreas", value);
    updatePwMicrobialResultRows(syncPwMicrobialResultRows(value, pwMicrobialResultRows));
  };

  const handleAddPwMicrobialRow = () => {
    const nextIndex = pwMicrobialResultRows.length + 1;
    updatePwMicrobialResultRows([
      ...pwMicrobialResultRows,
      {
        id: `pw-microbial-extra-${Date.now()}-${nextIndex}`,
        sampleArea: "",
        result: "",
        conclusion: "pass",
      },
    ]);
    toast.success("已新增一行结果明细");
  };

  const handleRemovePwMicrobialRow = (rowId: string) => {
    const nextRows = pwMicrobialResultRows.filter((row) => row.id !== rowId);
    updatePwMicrobialResultRows(nextRows.length > 0 ? nextRows : buildDefaultPwMicrobialResultRows());
    toast.success("已移除该行");
  };

  const handlePwChemicalSignComplete = async (signature: SignatureRecord) => {
    if (!activeForm || !editingRecordId) return;
    const nextSignatures = [...pwChemicalSignatures, signature];
    const nextStatus = signature.signatureType === "reviewer"
      ? "reviewed"
      : currentValues.status === "pending"
        ? "completed"
        : currentValues.status;
    const payload = buildRecordPayload(activeForm, {
      ...currentValues,
      status: nextStatus,
      signatures: JSON.stringify(nextSignatures),
    }, records);

    await updateMutation.mutateAsync({
      id: editingRecordId,
      data: {
        ...payload,
        status: nextStatus,
        formData: {
          ...payload.formData,
          signatures: JSON.stringify(nextSignatures),
        },
      },
    });

    setFormValues((prev) => ({
      ...prev,
      [activeForm.id]: {
        ...prev[activeForm.id],
        status: nextStatus,
        signatures: JSON.stringify(nextSignatures),
      },
    }));

    await refetch();
  };

  const handlePwMicrobialSignComplete = async (signature: SignatureRecord) => {
    if (!activeForm || !editingRecordId) return;
    const nextSignatures = [...pwMicrobialSignatures, signature];
    const nextStatus = signature.signatureType === "reviewer"
      ? "reviewed"
      : currentValues.status === "pending"
        ? "completed"
        : currentValues.status;
    const payload = buildRecordPayload(activeForm, {
      ...currentValues,
      status: nextStatus,
      signatures: JSON.stringify(nextSignatures),
    }, records);

    await updateMutation.mutateAsync({
      id: editingRecordId,
      data: {
        ...payload,
        status: nextStatus,
        formData: {
          ...payload.formData,
          signatures: JSON.stringify(nextSignatures),
        },
      },
    });

    setFormValues((prev) => ({
      ...prev,
      [activeForm.id]: {
        ...prev[activeForm.id],
        status: nextStatus,
        signatures: JSON.stringify(nextSignatures),
      },
    }));

    await refetch();
  };

  const handlePwChemicalPaperUpload = (file?: File | null) => {
    if (!file || !activeForm) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField(activeForm.id, "paperReportName", file.name);
      updateField(activeForm.id, "paperReportDataUrl", String(reader.result || ""));
      toast.success("纸质报告已上传到当前记录");
    };
    reader.readAsDataURL(file);
  };

  const handlePwChemicalBrowsePaper = () => {
    if (!currentValues.paperReportDataUrl) {
      toast.error("暂无纸质报告");
      return;
    }
    window.open(currentValues.paperReportDataUrl, "_blank", "noopener,noreferrer");
  };

  const handlePwMicrobialPaperUpload = (file?: File | null) => {
    if (!file || !activeForm) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField(activeForm.id, "paperReportName", file.name);
      updateField(activeForm.id, "paperReportDataUrl", String(reader.result || ""));
      toast.success("纸质报告已上传到当前记录");
    };
    reader.readAsDataURL(file);
  };

  const handlePwMicrobialBrowsePaper = () => {
    if (!currentValues.paperReportDataUrl) {
      toast.error("暂无纸质报告");
      return;
    }
    window.open(currentValues.paperReportDataUrl, "_blank", "noopener,noreferrer");
  };

  const updateAirborneMediaRows = (rows: AirborneCultureMediumRow[]) => {
    if (!activeForm) return;
    updateField(activeForm.id, "cultureMediaItems", JSON.stringify(rows));
  };

  const updateAirborneMediaRow = (rowId: string, patch: Partial<AirborneCultureMediumRow>) => {
    updateAirborneMediaRows(
      airborneMediaRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const updateAirborneMeasurementRows = (rows: AirborneMeasurementRow[]) => {
    if (!activeForm) return;
    updateField(activeForm.id, "measurementItems", JSON.stringify(rows));
    updateField(activeForm.id, "finalResult", rows.every((item) => item.conclusion === "pass") ? "pass" : "fail");
  };

  const updateAirborneMeasurementRow = (rowId: string, patch: Partial<AirborneMeasurementRow>) => {
    updateAirborneMeasurementRows(
      airborneMeasurementRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const handleAddAirborneRow = () => {
    const nextIndex = airborneMeasurementRows.length + 1;
    updateAirborneMeasurementRows([
      ...airborneMeasurementRows,
      {
        id: `airborne-row-${Date.now()}-${nextIndex}`,
        areaDivision: "",
        cleanlinessLevel: "",
        cleanRoomName: "",
        plate1: "",
        plate2: "",
        plate3: "",
        plate4: "",
        conclusion: "pass",
      },
    ]);
    toast.success("已新增一行实测内容");
  };

  const handleRemoveAirborneRow = (rowId: string) => {
    const nextRows = airborneMeasurementRows.filter((row) => row.id !== rowId);
    updateAirborneMeasurementRows(nextRows.length > 0 ? nextRows : buildDefaultAirborneMeasurementRows());
    toast.success("已移除该行");
  };

  const handleAirborneSignComplete = async (signature: SignatureRecord) => {
    if (!activeForm || !editingRecordId) return;
    const nextSignatures = [...airborneSignatures, signature];
    const nextStatus = signature.signatureType === "reviewer"
      ? "reviewed"
      : currentValues.status === "pending"
        ? "completed"
        : currentValues.status;
    const payload = buildRecordPayload(activeForm, {
      ...currentValues,
      status: nextStatus,
      signatures: JSON.stringify(nextSignatures),
    }, records);

    await updateMutation.mutateAsync({
      id: editingRecordId,
      data: {
        ...payload,
        status: nextStatus,
        formData: {
          ...payload.formData,
          signatures: JSON.stringify(nextSignatures),
        },
      },
    });

    setFormValues((prev) => ({
      ...prev,
      [activeForm.id]: {
        ...prev[activeForm.id],
        status: nextStatus,
        signatures: JSON.stringify(nextSignatures),
      },
    }));

    await refetch();
  };

  const handleAirbornePaperUpload = (file?: File | null) => {
    if (!file || !activeForm) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField(activeForm.id, "paperReportName", file.name);
      updateField(activeForm.id, "paperReportDataUrl", String(reader.result || ""));
      toast.success("纸质报告已上传到当前记录");
    };
    reader.readAsDataURL(file);
  };

  const handleAirborneBrowsePaper = () => {
    if (!currentValues.paperReportDataUrl) {
      toast.error("暂无纸质报告");
      return;
    }
    window.open(currentValues.paperReportDataUrl, "_blank", "noopener,noreferrer");
  };

  const updateSettlingMediaRows = (rows: AirborneCultureMediumRow[]) => {
    if (!activeForm) return;
    updateField(activeForm.id, "cultureMediaItems", JSON.stringify(rows));
  };

  const updateSettlingMediaRow = (rowId: string, patch: Partial<AirborneCultureMediumRow>) => {
    updateSettlingMediaRows(
      settlingMediaRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const updateSettlingMeasurementRows = (rows: AirborneMeasurementRow[]) => {
    if (!activeForm) return;
    updateField(activeForm.id, "measurementItems", JSON.stringify(rows));
    updateField(activeForm.id, "finalResult", rows.every((item) => item.conclusion === "pass") ? "pass" : "fail");
  };

  const updateSettlingMeasurementRow = (rowId: string, patch: Partial<AirborneMeasurementRow>) => {
    updateSettlingMeasurementRows(
      settlingMeasurementRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const handleAddSettlingRow = () => {
    const nextIndex = settlingMeasurementRows.length + 1;
    updateSettlingMeasurementRows([
      ...settlingMeasurementRows,
      {
        id: `settling-row-${Date.now()}-${nextIndex}`,
        areaDivision: "",
        cleanlinessLevel: "",
        cleanRoomName: "",
        plate1: "",
        plate2: "",
        plate3: "",
        plate4: "",
        conclusion: "pass",
      },
    ]);
    toast.success("已新增一行实测内容");
  };

  const handleRemoveSettlingRow = (rowId: string) => {
    const nextRows = settlingMeasurementRows.filter((row) => row.id !== rowId);
    updateSettlingMeasurementRows(nextRows.length > 0 ? nextRows : buildDefaultAirborneMeasurementRows());
    toast.success("已移除该行");
  };

  const handleSettlingSignComplete = async (signature: SignatureRecord) => {
    if (!activeForm || !editingRecordId) return;
    const nextSignatures = [...settlingSignatures, signature];
    const nextStatus = signature.signatureType === "reviewer"
      ? "reviewed"
      : currentValues.status === "pending"
        ? "completed"
        : currentValues.status;
    const payload = buildRecordPayload(activeForm, {
      ...currentValues,
      status: nextStatus,
      signatures: JSON.stringify(nextSignatures),
    }, records);

    await updateMutation.mutateAsync({
      id: editingRecordId,
      data: {
        ...payload,
        status: nextStatus,
        formData: {
          ...payload.formData,
          signatures: JSON.stringify(nextSignatures),
        },
      },
    });

    setFormValues((prev) => ({
      ...prev,
      [activeForm.id]: {
        ...prev[activeForm.id],
        status: nextStatus,
        signatures: JSON.stringify(nextSignatures),
      },
    }));

    await refetch();
  };

  const handleSettlingPaperUpload = (file?: File | null) => {
    if (!file || !activeForm) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField(activeForm.id, "paperReportName", file.name);
      updateField(activeForm.id, "paperReportDataUrl", String(reader.result || ""));
      toast.success("纸质报告已上传到当前记录");
    };
    reader.readAsDataURL(file);
  };

  const handleSettlingBrowsePaper = () => {
    if (!currentValues.paperReportDataUrl) {
      toast.error("暂无纸质报告");
      return;
    }
    window.open(currentValues.paperReportDataUrl, "_blank", "noopener,noreferrer");
  };

  const updateParticleMeasurementRows = (rows: ParticleMeasurementRow[]) => {
    if (!activeForm) return;
    updateField(activeForm.id, "measurementItems", JSON.stringify(rows));
    updateField(activeForm.id, "finalResult", rows.every((item) => item.conclusion === "pass") ? "pass" : "fail");
  };

  const updateParticleMeasurementRow = (rowId: string, patch: Partial<ParticleMeasurementRow>) => {
    updateParticleMeasurementRows(
      particleMeasurementRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const handleAddParticleRow = () => {
    const nextIndex = particleMeasurementRows.length + 1;
    updateParticleMeasurementRows([
      ...particleMeasurementRows,
      {
        id: `particle-row-${Date.now()}-${nextIndex}`,
        areaDivision: "",
        cleanlinessLevel: "",
        cleanRoomName: "",
        particleSize: "",
        value1: "",
        value2: "",
        value3: "",
        value4: "",
        ucl: "",
        conclusion: "pass",
      },
    ]);
    toast.success("已新增一行实测内容");
  };

  const handleRemoveParticleRow = (rowId: string) => {
    const nextRows = particleMeasurementRows.filter((row) => row.id !== rowId);
    updateParticleMeasurementRows(nextRows.length > 0 ? nextRows : buildDefaultParticleMeasurementRows());
    toast.success("已移除该行");
  };

  const handleParticleSignComplete = async (signature: SignatureRecord) => {
    if (!activeForm || !editingRecordId) return;
    const nextSignatures = [...particleSignatures, signature];
    const nextStatus = signature.signatureType === "reviewer"
      ? "reviewed"
      : currentValues.status === "pending"
        ? "completed"
        : currentValues.status;
    const payload = buildRecordPayload(activeForm, {
      ...currentValues,
      status: nextStatus,
      signatures: JSON.stringify(nextSignatures),
    }, records);

    await updateMutation.mutateAsync({
      id: editingRecordId,
      data: {
        ...payload,
        status: nextStatus,
        formData: {
          ...payload.formData,
          signatures: JSON.stringify(nextSignatures),
        },
      },
    });

    setFormValues((prev) => ({
      ...prev,
      [activeForm.id]: {
        ...prev[activeForm.id],
        status: nextStatus,
        signatures: JSON.stringify(nextSignatures),
      },
    }));

    await refetch();
  };

  const handleParticlePaperUpload = (file?: File | null) => {
    if (!file || !activeForm) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField(activeForm.id, "paperReportName", file.name);
      updateField(activeForm.id, "paperReportDataUrl", String(reader.result || ""));
      toast.success("纸质报告已上传到当前记录");
    };
    reader.readAsDataURL(file);
  };

  const handleParticleBrowsePaper = () => {
    if (!currentValues.paperReportDataUrl) {
      toast.error("暂无纸质报告");
      return;
    }
    window.open(currentValues.paperReportDataUrl, "_blank", "noopener,noreferrer");
  };

  const updateAirflowMeasurementRows = (rows: AirflowMeasurementRow[]) => {
    if (!activeForm) return;
    updateField(activeForm.id, "measurementItems", JSON.stringify(rows));
    updateField(activeForm.id, "finalResult", rows.every((item) => item.conclusion === "pass") ? "pass" : "fail");
  };

  const updateAirflowMeasurementRow = (rowId: string, patch: Partial<AirflowMeasurementRow>) => {
    updateAirflowMeasurementRows(
      airflowMeasurementRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const handleAddAirflowRow = () => {
    const nextIndex = airflowMeasurementRows.length + 1;
    updateAirflowMeasurementRows([
      ...airflowMeasurementRows,
      {
        id: `airflow-row-${Date.now()}-${nextIndex}`,
        areaDivision: "",
        cleanlinessLevel: "",
        cleanRoomName: "",
        areaSize: "",
        roomHeight: "",
        outletCount: "",
        airVolume: "",
        airChanges: "",
        conclusion: "pass",
      },
    ]);
    toast.success("已新增一行实测内容");
  };

  const handleRemoveAirflowRow = (rowId: string) => {
    const nextRows = airflowMeasurementRows.filter((row) => row.id !== rowId);
    updateAirflowMeasurementRows(nextRows.length > 0 ? nextRows : buildDefaultAirflowMeasurementRows());
    toast.success("已移除该行");
  };

  const handleAirflowSignComplete = async (signature: SignatureRecord) => {
    if (!activeForm || !editingRecordId) return;
    const nextSignatures = [...airflowSignatures, signature];
    const nextStatus = signature.signatureType === "reviewer"
      ? "reviewed"
      : currentValues.status === "pending"
        ? "completed"
        : currentValues.status;
    const payload = buildRecordPayload(activeForm, {
      ...currentValues,
      status: nextStatus,
      signatures: JSON.stringify(nextSignatures),
    }, records);

    await updateMutation.mutateAsync({
      id: editingRecordId,
      data: {
        ...payload,
        status: nextStatus,
        formData: {
          ...payload.formData,
          signatures: JSON.stringify(nextSignatures),
        },
      },
    });

    setFormValues((prev) => ({
      ...prev,
      [activeForm.id]: {
        ...prev[activeForm.id],
        status: nextStatus,
        signatures: JSON.stringify(nextSignatures),
      },
    }));

    await refetch();
  };

  const handleAirflowPaperUpload = (file?: File | null) => {
    if (!file || !activeForm) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField(activeForm.id, "paperReportName", file.name);
      updateField(activeForm.id, "paperReportDataUrl", String(reader.result || ""));
      toast.success("纸质报告已上传到当前记录");
    };
    reader.readAsDataURL(file);
  };

  const handleAirflowBrowsePaper = () => {
    if (!currentValues.paperReportDataUrl) {
      toast.error("暂无纸质报告");
      return;
    }
    window.open(currentValues.paperReportDataUrl, "_blank", "noopener,noreferrer");
  };

  const updateEndotoxinReagentRows = (rows: EndotoxinReagentRow[]) => {
    if (!activeForm) return;
    updateField(activeForm.id, "reagentItems", JSON.stringify(rows));
  };

  const updateEndotoxinReagentRow = (rowId: string, patch: Partial<EndotoxinReagentRow>) => {
    updateEndotoxinReagentRows(
      endotoxinReagentRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const updateEndotoxinTestRows = (rows: EndotoxinTestRow[]) => {
    if (!activeForm) return;
    updateField(activeForm.id, "testItems", JSON.stringify(rows));
  };

  const updateEndotoxinTestRow = (rowId: string, patch: Partial<EndotoxinTestRow>) => {
    updateEndotoxinTestRows(
      endotoxinTestRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const handleAddEndotoxinRow = () => {
    const nextIndex = endotoxinTestRows.length + 1;
    updateEndotoxinTestRows([
      ...endotoxinTestRows,
      {
        id: `endotoxin-test-${Date.now()}-${nextIndex}`,
        solutionName: "",
        result1: "",
        result2: "",
      },
    ]);
    toast.success("已新增一行测试内容");
  };

  const handleSelectEndotoxinSample = (row: {
    id: number;
    entryNo: string;
    productName: string;
    specification: string;
    batchNo: string;
    sterilizationBatchNo: string;
    quantity: string;
    unit: string;
  }) => {
    if (!activeForm) return;
    updateField(activeForm.id, "sampleName", row.productName || "");
    updateField(activeForm.id, "productionBatch", row.batchNo || "");
    updateField(activeForm.id, "sterilizationBatch", row.sterilizationBatchNo || "");
    updateField(activeForm.id, "sampleModel", row.specification || "");
    updateField(activeForm.id, "sourceWarehouseEntryId", String(row.id || ""));
    updateField(activeForm.id, "sourceWarehouseEntryNo", row.entryNo || "");
    updateField(activeForm.id, "sourceWarehouseQuantity", row.quantity || "");
    updateField(activeForm.id, "sourceWarehouseUnit", row.unit || "");
    setEndotoxinSamplePickerOpen(false);
    toast.success("已带入生产入库申请样品信息");
  };

  const handleEndotoxinSignComplete = async (signature: SignatureRecord) => {
    if (!activeForm || !editingRecordId) return;
    const nextSignatures = [...endotoxinSignatures, signature];
    const nextStatus = signature.signatureType === "reviewer"
      ? "reviewed"
      : currentValues.status === "pending"
        ? "completed"
        : currentValues.status;
    const payload = buildRecordPayload(activeForm, {
      ...currentValues,
      status: nextStatus,
      signatures: JSON.stringify(nextSignatures),
    }, records);

    await updateMutation.mutateAsync({
      id: editingRecordId,
      data: {
        ...payload,
        status: nextStatus,
        formData: {
          ...payload.formData,
          signatures: JSON.stringify(nextSignatures),
        },
      },
    });

    setFormValues((prev) => ({
      ...prev,
      [activeForm.id]: {
        ...prev[activeForm.id],
        status: nextStatus,
        signatures: JSON.stringify(nextSignatures),
      },
    }));

    await refetch();
  };

  const handleEndotoxinPaperUpload = (file?: File | null) => {
    if (!file || !activeForm) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField(activeForm.id, "paperReportName", file.name);
      updateField(activeForm.id, "paperReportDataUrl", String(reader.result || ""));
      toast.success("纸质报告已上传到当前记录");
    };
    reader.readAsDataURL(file);
  };

  const handleEndotoxinBrowsePaper = () => {
    if (!currentValues.paperReportDataUrl) {
      toast.error("暂无纸质报告");
      return;
    }
    window.open(currentValues.paperReportDataUrl, "_blank", "noopener,noreferrer");
  };

  const resetActiveForm = () => {
    if (!activeForm) return;
    setFormValues((prev) => ({
      ...prev,
      [activeForm.id]: buildInitialState(activeForm, buildLabRecordNo(activeForm.id, records)),
    }));
    setEditingRecordId(null);
  };

  const handleViewRecord = (record: LabRecordView) => {
    setViewingRecord(record);
    setViewDialogOpen(true);
  };

  const handleEditRecord = (record: LabRecordView) => {
    if (activeForm?.id !== record.formId) {
      setPendingLoadRecordId(record.id);
      setLocation(`/quality/lab/${record.formId}`);
      return;
    }

    const currentEditForm = LAB_FORMS.find((item) => item.id === record.formId);
    if (!currentEditForm) return;
    setFormValues((prev) => ({
      ...prev,
      [currentEditForm.id]: buildRecordViewState(currentEditForm, record),
    }));
    setEditingRecordId(record.id);
    toast.success("实验室记录已载入编辑区");
  };

  const handleDeleteRecord = async (record: LabRecordView) => {
    if (!window.confirm(`确认删除 ${record.recordNo} 吗？`)) return;
    await deleteMutation.mutateAsync({ id: record.id });
    await refetch();
    if (editingRecordId === record.id) {
      resetActiveForm();
    }
    toast.success("实验室记录已删除");
  };

  const handleSaveRecord = async (draft: boolean) => {
    if (!activeForm) return;
    const payload = buildRecordPayload(activeForm, currentValues, records);
    const nextStatus = draft ? "pending" : payload.status === "pending" ? "completed" : payload.status;
    const nextPayload = {
      ...payload,
      status: nextStatus,
      conclusion: payload.conclusion,
      // 来源信息：从 URL 参数中读取
      ...(urlParams?.sourceType ? { sourceType: urlParams.sourceType } : {}),
      ...(urlParams?.sourceId ? { sourceId: urlParams.sourceId } : {}),
      ...(urlParams?.sourceItemId ? { sourceItemId: urlParams.sourceItemId } : {}),
    };

    if (!nextPayload.recordNo) {
      toast.error("记录编号不能为空");
      return;
    }

    setFormValues((prev) => ({
      ...prev,
      [activeForm.id]: {
        ...prev[activeForm.id],
        docNo: nextPayload.recordNo,
        status: nextStatus,
      },
    }));

    if (editingRecordId) {
      await updateMutation.mutateAsync({
        id: editingRecordId,
        data: nextPayload,
      });
      // 如果非草稿且有来源项目，自动回写结论
      if (!draft && urlParams?.sourceItemId && nextPayload.conclusion !== "pending") {
        await completeAndWriteBackMutation.mutateAsync({
          labRecordId: editingRecordId,
          conclusion: nextPayload.conclusion as "pass" | "fail" | "pending",
          result: nextPayload.result,
        });
        toast.success("实验室记录已更新并回写至检验单");
      } else {
        toast.success(draft ? "草稿已保存" : "实验室记录已更新");
      }
    } else {
      const newId = await createMutation.mutateAsync(nextPayload);
      setEditingRecordId(Number(newId));
      // 如果非草稿且有来源项目，自动回写结论
      if (!draft && urlParams?.sourceItemId && nextPayload.conclusion !== "pending") {
        await completeAndWriteBackMutation.mutateAsync({
          labRecordId: Number(newId),
          conclusion: nextPayload.conclusion as "pass" | "fail" | "pending",
          result: nextPayload.result,
        });
        toast.success("实验室记录已保存并回写至检验单");
      } else {
        toast.success(draft ? "草稿已创建" : "实验室记录已保存");
      }
    }

    await refetch();
  };

  const recentRecords = useMemo(() => records.slice(0, 8), [records]);

  const statusMetaMap: Record<LabRecordView["status"], { label: string; className: string }> = {
    pending: { label: "待处理", className: "bg-amber-50 text-amber-700 border-amber-200" },
    testing: { label: "检验中", className: "bg-blue-50 text-blue-700 border-blue-200" },
    completed: { label: "已完成", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    reviewed: { label: "已复核", className: "bg-violet-50 text-violet-700 border-violet-200" },
  };

  const conclusionMetaMap: Record<LabRecordView["conclusion"], { label: string; className: string }> = {
    pending: { label: "待判定", className: "bg-slate-50 text-slate-700 border-slate-200" },
    pass: { label: "合格", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    fail: { label: "不合格", className: "bg-rose-50 text-rose-700 border-rose-200" },
  };

  const renderField = (formId: string, field: FieldConfig) => {
    const value = currentValues[field.id] || "";

    if (field.type === "textarea") {
      return (
        <Textarea
          value={value}
          onChange={(e) => updateField(formId, field.id, e.target.value)}
          placeholder={field.placeholder}
          rows={4}
        />
      );
    }

    if (field.type === "select") {
      return (
        <Select value={value} onValueChange={(nextValue) => updateField(formId, field.id, nextValue)}>
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || `请选择${field.label}`} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type={field.type}
        value={value}
        onChange={(e) => updateField(formId, field.id, e.target.value)}
        placeholder={field.placeholder}
      />
    );
  };

  const renderPwChemicalEditor = () => (
    <div className="mx-auto w-full max-w-6xl px-2 md:px-6 xl:px-10">
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-8 border-b pb-4">
            <RadioGroup
              value={currentValues.reportMode || "online"}
              onValueChange={(value) => updateField(activeForm!.id, "reportMode", value)}
              className="flex flex-row gap-8"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="pw-chemical-online" />
                <Label htmlFor="pw-chemical-online">在线填写报告</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paper" id="pw-chemical-paper" />
                <Label htmlFor="pw-chemical-paper">上传纸质报告</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-semibold tracking-wide">理化检验记录</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">检验单号</Label>
              <Input
                value={currentValues.docNo || ""}
                onChange={(e) => updateField(activeForm!.id, "docNo", e.target.value)}
                placeholder="自动生成"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">名称</Label>
              <Input
                list="pw-chemical-report-name-options"
                value={currentValues.reportName || ""}
                onChange={(e) => updateField(activeForm!.id, "reportName", e.target.value)}
                placeholder="填写理化检验名称"
              />
              <datalist id="pw-chemical-report-name-options">
                {pwChemicalHistory.reportNames.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">取样日期</Label>
              <Input
                type="date"
                value={currentValues.sampleDate || ""}
                onChange={(e) => updateField(activeForm!.id, "sampleDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">取样器具</Label>
              <Input
                list="pw-chemical-sampler-options"
                value={currentValues.sampler || ""}
                onChange={(e) => updateField(activeForm!.id, "sampler", e.target.value)}
                placeholder="例如：细口试剂瓶"
              />
              <datalist id="pw-chemical-sampler-options">
                {pwChemicalHistory.samplers.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-destructive">取样点</Label>
              <Input
                list="pw-chemical-sample-point-options"
                value={currentValues.samplePoint || ""}
                onChange={(e) => updateField(activeForm!.id, "samplePoint", e.target.value)}
                placeholder="例如：送水点、回水点、1#"
              />
              <datalist id="pw-chemical-sample-point-options">
                {pwChemicalHistory.samplePoints.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label className="text-sm font-medium">检验依据</Label>
              <Input
                list="pw-chemical-standard-options"
                value={currentValues.standard || ""}
                onChange={(e) => updateField(activeForm!.id, "standard", e.target.value)}
                placeholder="填写检验依据"
              />
              <datalist id="pw-chemical-standard-options">
                {pwChemicalHistory.standards.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">检验内容</div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddPwChemicalRow}>
                <Plus className="mr-1 h-4 w-4" />
                增加行
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[72px] text-center">序号</TableHead>
                    <TableHead>检验项目</TableHead>
                    <TableHead className="w-[220px]">结论</TableHead>
                    <TableHead className="w-[180px]">检验人</TableHead>
                    <TableHead className="w-[180px]">检验日期</TableHead>
                    <TableHead className="w-[100px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pwChemicalRows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          list="pw-chemical-item-name-options"
                          value={row.itemName}
                          onChange={(e) => updatePwChemicalRow(row.id, { itemName: e.target.value })}
                          placeholder="填写或选择检验项目"
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <RadioGroup
                          value={row.conclusion}
                          onValueChange={(value) => updatePwChemicalRow(row.id, { conclusion: value as "pass" | "fail" })}
                          className="flex flex-row gap-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pass" id={`${row.id}-pass`} />
                            <Label htmlFor={`${row.id}-pass`}>符合</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fail" id={`${row.id}-fail`} />
                            <Label htmlFor={`${row.id}-fail`}>不符合</Label>
                          </div>
                        </RadioGroup>
                      </TableCell>
                      <TableCell>
                        <Input
                          list="pw-chemical-inspector-options"
                          value={row.inspector}
                          onChange={(e) => updatePwChemicalRow(row.id, { inspector: e.target.value })}
                          placeholder="填写检验人"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.inspectionDate}
                          onChange={(e) => updatePwChemicalRow(row.id, { inspectionDate: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="outline" onClick={() => toast.success(`${row.itemName} 已在当前行直接编辑`)}>
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <datalist id="pw-chemical-item-name-options">
              {pwChemicalHistory.itemNames.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="pw-chemical-inspector-options">
              {pwChemicalHistory.inspectors.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-4 md:grid-cols-[90px_1fr_auto_auto] md:items-center">
            <div className="text-sm font-medium">纸质报告：</div>
            <Input value={currentValues.paperReportName || ""} readOnly placeholder="未上传纸质报告" />
            <Button type="button" variant="outline" onClick={handlePwChemicalBrowsePaper}>
              <FolderOpen className="mr-2 h-4 w-4" />
              浏览
            </Button>
            <label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handlePwChemicalPaperUpload(e.target.files?.[0])}
              />
              <Button type="button" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  上传
                </span>
              </Button>
            </label>
          </div>

          <div className="grid gap-6 border-t pt-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-destructive">结果判定</Label>
              <RadioGroup
                value={currentValues.finalResult || "pass"}
                onValueChange={(value) => updateField(activeForm!.id, "finalResult", value)}
                className="flex flex-row gap-8"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pass" id="pw-final-pass" />
                  <Label htmlFor="pw-final-pass">合格</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fail" id="pw-final-fail" />
                  <Label htmlFor="pw-final-fail">不合格</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={currentValues.status || "pending"} onValueChange={(value) => updateField(activeForm!.id, "status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="testing">检验中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="reviewed">已复核</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6">
            {!editingRecordId ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <div className="text-sm">请先保存检验单，保存后可进行电子签名</div>
                <div className="mt-1 text-xs">符合 FDA 21 CFR Part 11 法规要求</div>
              </div>
            ) : (
              <SignatureStatusCard
                documentType="LAB"
                documentNo={currentValues.docNo || ""}
                documentId={editingRecordId}
                signatures={pwChemicalSignatures}
                onSignComplete={(signature) => void handlePwChemicalSignComplete(signature)}
                enabledTypes={["inspector", "reviewer"]}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              value={currentValues.remark || ""}
              onChange={(e) => updateField(activeForm!.id, "remark", e.target.value)}
              placeholder="填写备注"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" onClick={() => void handleSaveRecord(false)} disabled={createMutation.isPending || updateMutation.isPending}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPwMicrobialEditor = () => (
    <div className="mx-auto w-full max-w-6xl px-2 md:px-6 xl:px-10">
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-8 border-b pb-4">
            <RadioGroup
              value={currentValues.reportMode || "online"}
              onValueChange={(value) => updateField(activeForm!.id, "reportMode", value)}
              className="flex flex-row gap-8"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="pw-microbial-online" />
                <Label htmlFor="pw-microbial-online">在线填写报告</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paper" id="pw-microbial-paper" />
                <Label htmlFor="pw-microbial-paper">上传纸质报告</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-semibold tracking-wide">微生物检验记录</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">检验单号</Label>
              <Input
                value={currentValues.docNo || ""}
                onChange={(e) => updateField(activeForm!.id, "docNo", e.target.value)}
                placeholder="自动生成"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">品类</Label>
              <Select
                value={currentValues.category || "纯化水"}
                onValueChange={(value) => updateField(activeForm!.id, "category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择品类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="纯化水">纯化水</SelectItem>
                  {pwMicrobialHistory.categories
                    .filter((item) => item && item !== "纯化水")
                    .map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">产品名称</Label>
              <Input
                list="pw-microbial-report-name-options"
                value={currentValues.reportName || ""}
                onChange={(e) => updateField(activeForm!.id, "reportName", e.target.value)}
                placeholder="填写微生物检验名称"
              />
              <datalist id="pw-microbial-report-name-options">
                {pwMicrobialHistory.reportNames.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">取样器具</Label>
              <Input
                list="pw-microbial-sampler-options"
                value={currentValues.sampler || ""}
                onChange={(e) => updateField(activeForm!.id, "sampler", e.target.value)}
                placeholder="例如：细口试剂瓶"
              />
              <datalist id="pw-microbial-sampler-options">
                {pwMicrobialHistory.samplers.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-destructive">取样区域</Label>
              <Input
                list="pw-microbial-sample-areas-options"
                value={currentValues.sampleAreas || ""}
                onChange={(e) => handlePwMicrobialSampleAreasChange(e.target.value)}
                placeholder="例如：区域一、区域二、区域三"
              />
              <datalist id="pw-microbial-sample-areas-options">
                {pwMicrobialHistory.sampleAreas.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">检验项目</Label>
              <Input
                list="pw-microbial-inspection-item-options"
                value={currentValues.inspectionItem || ""}
                onChange={(e) => updateField(activeForm!.id, "inspectionItem", e.target.value)}
                placeholder="填写检验项目"
              />
              <datalist id="pw-microbial-inspection-item-options">
                {pwMicrobialHistory.inspectionItems.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">培养箱编号</Label>
              <Input
                list="pw-microbial-culture-no-options"
                value={currentValues.cultureNo || ""}
                onChange={(e) => updateField(activeForm!.id, "cultureNo", e.target.value)}
                placeholder="填写培养箱编号"
              />
              <datalist id="pw-microbial-culture-no-options">
                {pwMicrobialHistory.cultureNos.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验日期</Label>
              <Input
                type="date"
                value={currentValues.inspectionDate || ""}
                onChange={(e) => updateField(activeForm!.id, "inspectionDate", e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-destructive">培养基及批号</Label>
              <div className="space-y-2 rounded-md border p-3">
                {pwMicrobialMediaRows.map((row) => (
                  <div key={row.id} className="grid gap-3 md:grid-cols-[28px_180px_1fr] md:items-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={row.enabled}
                        onCheckedChange={(checked) => updatePwMicrobialMediaRow(row.id, { enabled: Boolean(checked) })}
                      />
                    </div>
                    <Input
                      list="pw-microbial-medium-name-options"
                      value={row.mediumName}
                      onChange={(e) => updatePwMicrobialMediaRow(row.id, { mediumName: e.target.value })}
                      placeholder="培养基名称"
                    />
                    <Input
                      value={row.batchNo}
                      onChange={(e) => updatePwMicrobialMediaRow(row.id, { batchNo: e.target.value })}
                      placeholder="批号"
                    />
                  </div>
                ))}
              </div>
              <datalist id="pw-microbial-medium-name-options">
                {pwMicrobialHistory.mediumNames.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验人员</Label>
              <Input
                list="pw-microbial-inspector-options"
                value={currentValues.inspector || ""}
                onChange={(e) => updateField(activeForm!.id, "inspector", e.target.value)}
                placeholder="填写检验人员"
              />
              <datalist id="pw-microbial-inspector-options">
                {pwMicrobialHistory.inspectors.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label className="text-sm font-medium">检验依据</Label>
              <Input
                list="pw-microbial-standard-options"
                value={currentValues.standard || ""}
                onChange={(e) => updateField(activeForm!.id, "standard", e.target.value)}
                placeholder="填写检验依据"
              />
              <datalist id="pw-microbial-standard-options">
                {pwMicrobialHistory.standards.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label className="text-sm font-medium">标准及操作</Label>
              <Textarea
                value={currentValues.standardOperation || ""}
                onChange={(e) => updateField(activeForm!.id, "standardOperation", e.target.value)}
                placeholder="填写标准及操作"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">培养温度</Label>
              <Input
                list="pw-microbial-incubation-temp-options"
                value={currentValues.incubationTemp || ""}
                onChange={(e) => updateField(activeForm!.id, "incubationTemp", e.target.value)}
                placeholder="例如：25℃"
              />
              <datalist id="pw-microbial-incubation-temp-options">
                {pwMicrobialHistory.incubationTemps.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">培养开始日期</Label>
              <Input
                type="datetime-local"
                value={currentValues.incubationStart || ""}
                onChange={(e) => updateField(activeForm!.id, "incubationStart", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">培养结束日期</Label>
              <Input
                type="datetime-local"
                value={currentValues.incubationEnd || ""}
                onChange={(e) => updateField(activeForm!.id, "incubationEnd", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">结果及结论</div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddPwMicrobialRow}>
                <Plus className="mr-1 h-4 w-4" />
                增加行
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>取样区域</TableHead>
                    <TableHead>结果</TableHead>
                    <TableHead className="w-[240px]">结论</TableHead>
                    <TableHead className="w-[100px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pwMicrobialResultRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          list="pw-microbial-result-area-options"
                          value={row.sampleArea}
                          onChange={(e) => updatePwMicrobialResultRow(row.id, { sampleArea: e.target.value })}
                          placeholder="填写取样区域"
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.result}
                          onChange={(e) => updatePwMicrobialResultRow(row.id, { result: e.target.value })}
                          placeholder="填写检验结果"
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                        />
                      </TableCell>
                      <TableCell>
                        <RadioGroup
                          value={row.conclusion}
                          onValueChange={(value) => updatePwMicrobialResultRow(row.id, { conclusion: value as "pass" | "fail" })}
                          className="flex flex-row gap-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pass" id={`${row.id}-pass`} />
                            <Label htmlFor={`${row.id}-pass`}>符合</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fail" id={`${row.id}-fail`} />
                            <Label htmlFor={`${row.id}-fail`}>不符合</Label>
                          </div>
                        </RadioGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" onClick={() => handleRemovePwMicrobialRow(row.id)}>
                          移除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <datalist id="pw-microbial-result-area-options">
              {pwMicrobialHistory.resultAreas.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-4 md:grid-cols-[90px_1fr_auto_auto] md:items-center">
            <div className="text-sm font-medium">纸质报告：</div>
            <Input value={currentValues.paperReportName || ""} readOnly placeholder="未上传纸质报告" />
            <Button type="button" variant="outline" onClick={handlePwMicrobialBrowsePaper}>
              <FolderOpen className="mr-2 h-4 w-4" />
              浏览
            </Button>
            <label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handlePwMicrobialPaperUpload(e.target.files?.[0])}
              />
              <Button type="button" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  上传
                </span>
              </Button>
            </label>
          </div>

          <div className="grid gap-6 border-t pt-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-destructive">结果判定</Label>
              <RadioGroup
                value={currentValues.finalResult || "pass"}
                onValueChange={(value) => updateField(activeForm!.id, "finalResult", value)}
                className="flex flex-row gap-8"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pass" id="pw-microbial-final-pass" />
                  <Label htmlFor="pw-microbial-final-pass">合格</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fail" id="pw-microbial-final-fail" />
                  <Label htmlFor="pw-microbial-final-fail">不合格</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={currentValues.status || "pending"} onValueChange={(value) => updateField(activeForm!.id, "status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="testing">检验中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="reviewed">已复核</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6">
            {!editingRecordId ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <div className="text-sm">请先保存检验单，保存后可进行电子签名</div>
                <div className="mt-1 text-xs">符合 FDA 21 CFR Part 11 法规要求</div>
              </div>
            ) : (
              <SignatureStatusCard
                documentType="LAB"
                documentNo={currentValues.docNo || ""}
                documentId={editingRecordId}
                signatures={pwMicrobialSignatures}
                onSignComplete={(signature) => void handlePwMicrobialSignComplete(signature)}
                enabledTypes={["inspector", "reviewer"]}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              value={currentValues.remark || ""}
              onChange={(e) => updateField(activeForm!.id, "remark", e.target.value)}
              placeholder="填写备注"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" onClick={() => void handleSaveRecord(false)} disabled={createMutation.isPending || updateMutation.isPending}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAirborneEditor = () => (
    <div className="mx-auto w-full max-w-6xl px-2 md:px-6 xl:px-10">
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-8 border-b pb-4">
            <RadioGroup
              value={currentValues.reportMode || "online"}
              onValueChange={(value) => updateField(activeForm!.id, "reportMode", value)}
              className="flex flex-row gap-8"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="airborne-online" />
                <Label htmlFor="airborne-online">在线填写报告</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paper" id="airborne-paper" />
                <Label htmlFor="airborne-paper">上传纸质报告</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-semibold tracking-wide">浮游菌检验记录</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">浮游菌取样仪编号</Label>
              <Input
                list="airborne-sampler-no-options"
                value={currentValues.samplerNo || ""}
                onChange={(e) => updateField(activeForm!.id, "samplerNo", e.target.value)}
                placeholder="填写取样仪编号"
              />
              <datalist id="airborne-sampler-no-options">
                {airborneHistory.samplerNos.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">环境温度</Label>
              <Input
                list="airborne-env-temp-options"
                value={currentValues.envTemp || ""}
                onChange={(e) => updateField(activeForm!.id, "envTemp", e.target.value)}
                placeholder="例如：25℃"
              />
              <datalist id="airborne-env-temp-options">
                {airborneHistory.envTemps.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">相对湿度</Label>
              <Input
                list="airborne-relative-humidity-options"
                value={currentValues.relativeHumidity || ""}
                onChange={(e) => updateField(activeForm!.id, "relativeHumidity", e.target.value)}
                placeholder="例如：25%"
              />
              <datalist id="airborne-relative-humidity-options">
                {airborneHistory.relativeHumidities.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">培养箱编号</Label>
              <Input
                list="airborne-culture-no-options"
                value={currentValues.cultureNo || ""}
                onChange={(e) => updateField(activeForm!.id, "cultureNo", e.target.value)}
                placeholder="填写培养箱编号"
              />
              <datalist id="airborne-culture-no-options">
                {airborneHistory.cultureNos.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">培养温度</Label>
              <Input
                list="airborne-incubation-temp-options"
                value={currentValues.incubationTemp || ""}
                onChange={(e) => updateField(activeForm!.id, "incubationTemp", e.target.value)}
                placeholder="例如：20℃"
              />
              <datalist id="airborne-incubation-temp-options">
                {airborneHistory.incubationTemps.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验依据</Label>
              <Input
                list="airborne-standard-options"
                value={currentValues.standard || ""}
                onChange={(e) => updateField(activeForm!.id, "standard", e.target.value)}
                placeholder="填写检验依据"
              />
              <datalist id="airborne-standard-options">
                {airborneHistory.standards.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-destructive">培养基及批号</Label>
              <div className="space-y-2 rounded-md border p-3">
                {airborneMediaRows.map((row) => (
                  <div key={row.id} className="grid gap-3 md:grid-cols-[28px_180px_1fr] md:items-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={row.enabled}
                        onCheckedChange={(checked) => updateAirborneMediaRow(row.id, { enabled: Boolean(checked) })}
                      />
                    </div>
                    <Input
                      list="airborne-medium-name-options"
                      value={row.mediumName}
                      onChange={(e) => updateAirborneMediaRow(row.id, { mediumName: e.target.value })}
                      placeholder="培养基名称"
                    />
                    <Input
                      value={row.batchNo}
                      onChange={(e) => updateAirborneMediaRow(row.id, { batchNo: e.target.value })}
                      placeholder="批号"
                    />
                  </div>
                ))}
              </div>
              <datalist id="airborne-medium-name-options">
                {airborneHistory.mediumNames.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">培养开始时间</Label>
              <Input
                type="datetime-local"
                value={currentValues.incubationStart || ""}
                onChange={(e) => updateField(activeForm!.id, "incubationStart", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">培养结束时间</Label>
              <Input
                type="datetime-local"
                value={currentValues.incubationEnd || ""}
                onChange={(e) => updateField(activeForm!.id, "incubationEnd", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验日期</Label>
              <Input
                type="datetime-local"
                value={currentValues.inspectionDate || ""}
                onChange={(e) => updateField(activeForm!.id, "inspectionDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验人员</Label>
              <Input
                list="airborne-inspector-options"
                value={currentValues.inspector || ""}
                onChange={(e) => updateField(activeForm!.id, "inspector", e.target.value)}
                placeholder="填写检验人员"
              />
              <datalist id="airborne-inspector-options">
                {airborneHistory.inspectors.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">实测内容</div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddAirborneRow}>
                <Plus className="mr-1 h-4 w-4" />
                增加行
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[70px] text-center">序号</TableHead>
                    <TableHead>区域划分</TableHead>
                    <TableHead>洁净度级别</TableHead>
                    <TableHead>洁净区名称</TableHead>
                    <TableHead className="w-[90px]">平皿1</TableHead>
                    <TableHead className="w-[90px]">平皿2</TableHead>
                    <TableHead className="w-[90px]">平皿3</TableHead>
                    <TableHead className="w-[90px]">平皿4</TableHead>
                    <TableHead className="w-[90px] text-center">平均</TableHead>
                    <TableHead className="w-[180px]">结果判定</TableHead>
                    <TableHead className="w-[90px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {airborneMeasurementRows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          list="airborne-area-division-options"
                          value={row.areaDivision}
                          onChange={(e) => updateAirborneMeasurementRow(row.id, { areaDivision: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="区域划分"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="airborne-cleanliness-options"
                          value={row.cleanlinessLevel}
                          onChange={(e) => updateAirborneMeasurementRow(row.id, { cleanlinessLevel: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="洁净度级别"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="airborne-clean-room-options"
                          value={row.cleanRoomName}
                          onChange={(e) => updateAirborneMeasurementRow(row.id, { cleanRoomName: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="洁净区名称"
                        />
                      </TableCell>
                      <TableCell><Input value={row.plate1} onChange={(e) => updateAirborneMeasurementRow(row.id, { plate1: e.target.value })} /></TableCell>
                      <TableCell><Input value={row.plate2} onChange={(e) => updateAirborneMeasurementRow(row.id, { plate2: e.target.value })} /></TableCell>
                      <TableCell><Input value={row.plate3} onChange={(e) => updateAirborneMeasurementRow(row.id, { plate3: e.target.value })} /></TableCell>
                      <TableCell><Input value={row.plate4} onChange={(e) => updateAirborneMeasurementRow(row.id, { plate4: e.target.value })} /></TableCell>
                      <TableCell className="text-center font-semibold text-muted-foreground">{calculateAirborneAverage(row) || "-"}</TableCell>
                      <TableCell>
                        <RadioGroup
                          value={row.conclusion}
                          onValueChange={(value) => updateAirborneMeasurementRow(row.id, { conclusion: value as "pass" | "fail" })}
                          className="flex flex-row gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pass" id={`${row.id}-pass`} />
                            <Label htmlFor={`${row.id}-pass`}>合格</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fail" id={`${row.id}-fail`} />
                            <Label htmlFor={`${row.id}-fail`}>不合格</Label>
                          </div>
                        </RadioGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveAirborneRow(row.id)}>
                          移除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <datalist id="airborne-area-division-options">
              {airborneHistory.areaDivisions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="airborne-cleanliness-options">
              {airborneHistory.cleanlinessLevels.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="airborne-clean-room-options">
              {airborneHistory.cleanRoomNames.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-4 md:grid-cols-[90px_1fr_auto_auto] md:items-center">
            <div className="text-sm font-medium">纸质报告：</div>
            <Input value={currentValues.paperReportName || ""} readOnly placeholder="未上传纸质报告" />
            <Button type="button" variant="outline" onClick={handleAirborneBrowsePaper}>
              <FolderOpen className="mr-2 h-4 w-4" />
              浏览
            </Button>
            <label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleAirbornePaperUpload(e.target.files?.[0])}
              />
              <Button type="button" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  上传
                </span>
              </Button>
            </label>
          </div>

          <div className="grid gap-6 border-t pt-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-destructive">结果判定</Label>
              <RadioGroup
                value={currentValues.finalResult || "pass"}
                onValueChange={(value) => updateField(activeForm!.id, "finalResult", value)}
                className="flex flex-row gap-8"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pass" id="airborne-final-pass" />
                  <Label htmlFor="airborne-final-pass">合格</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fail" id="airborne-final-fail" />
                  <Label htmlFor="airborne-final-fail">不合格</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={currentValues.status || "pending"} onValueChange={(value) => updateField(activeForm!.id, "status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="testing">检验中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="reviewed">已复核</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6">
            {!editingRecordId ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <div className="text-sm">请先保存检验单，保存后可进行电子签名</div>
                <div className="mt-1 text-xs">符合 FDA 21 CFR Part 11 法规要求</div>
              </div>
            ) : (
              <SignatureStatusCard
                documentType="LAB"
                documentNo={currentValues.docNo || ""}
                documentId={editingRecordId}
                signatures={airborneSignatures}
                onSignComplete={(signature) => void handleAirborneSignComplete(signature)}
                enabledTypes={["inspector", "reviewer"]}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              value={currentValues.remark || ""}
              onChange={(e) => updateField(activeForm!.id, "remark", e.target.value)}
              placeholder="填写备注"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" onClick={() => void handleSaveRecord(false)} disabled={createMutation.isPending || updateMutation.isPending}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettlingEditor = () => (
    <div className="mx-auto w-full max-w-6xl px-2 md:px-6 xl:px-10">
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-8 border-b pb-4">
            <RadioGroup
              value={currentValues.reportMode || "online"}
              onValueChange={(value) => updateField(activeForm!.id, "reportMode", value)}
              className="flex flex-row gap-8"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="settling-online" />
                <Label htmlFor="settling-online">在线填写报告</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paper" id="settling-paper" />
                <Label htmlFor="settling-paper">上传纸质报告</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-semibold tracking-wide">沉降菌检验记录</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">培养箱设备编号</Label>
              <Input
                list="settling-culture-box-options"
                value={currentValues.cultureBoxNo || ""}
                onChange={(e) => updateField(activeForm!.id, "cultureBoxNo", e.target.value)}
                placeholder="填写培养箱设备编号"
              />
              <datalist id="settling-culture-box-options">
                {settlingHistory.cultureBoxNos.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">环境温度</Label>
              <Input
                list="settling-env-temp-options"
                value={currentValues.envTemp || ""}
                onChange={(e) => updateField(activeForm!.id, "envTemp", e.target.value)}
                placeholder="例如：25℃"
              />
              <datalist id="settling-env-temp-options">
                {settlingHistory.envTemps.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">相对湿度</Label>
              <Input
                list="settling-humidity-options"
                value={currentValues.relativeHumidity || ""}
                onChange={(e) => updateField(activeForm!.id, "relativeHumidity", e.target.value)}
                placeholder="例如：30%"
              />
              <datalist id="settling-humidity-options">
                {settlingHistory.relativeHumidities.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">暴露时间</Label>
              <Input
                list="settling-exposure-time-options"
                value={currentValues.exposureTime || ""}
                onChange={(e) => updateField(activeForm!.id, "exposureTime", e.target.value)}
                placeholder="填写暴露时间"
              />
              <datalist id="settling-exposure-time-options">
                {settlingHistory.exposureTimes.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">培养温度</Label>
              <Input
                list="settling-incubation-temp-options"
                value={currentValues.incubationTemp || ""}
                onChange={(e) => updateField(activeForm!.id, "incubationTemp", e.target.value)}
                placeholder="例如：20℃"
              />
              <datalist id="settling-incubation-temp-options">
                {settlingHistory.incubationTemps.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验依据</Label>
              <Input
                list="settling-standard-options"
                value={currentValues.standard || ""}
                onChange={(e) => updateField(activeForm!.id, "standard", e.target.value)}
                placeholder="填写检验依据"
              />
              <datalist id="settling-standard-options">
                {settlingHistory.standards.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-destructive">培养基及批号</Label>
              <div className="space-y-2 rounded-md border p-3">
                {settlingMediaRows.map((row) => (
                  <div key={row.id} className="grid gap-3 md:grid-cols-[28px_180px_1fr] md:items-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={row.enabled}
                        onCheckedChange={(checked) => updateSettlingMediaRow(row.id, { enabled: Boolean(checked) })}
                      />
                    </div>
                    <Input
                      list="settling-medium-name-options"
                      value={row.mediumName}
                      onChange={(e) => updateSettlingMediaRow(row.id, { mediumName: e.target.value })}
                      placeholder="培养基名称"
                    />
                    <Input
                      value={row.batchNo}
                      onChange={(e) => updateSettlingMediaRow(row.id, { batchNo: e.target.value })}
                      placeholder="批号"
                    />
                  </div>
                ))}
              </div>
              <datalist id="settling-medium-name-options">
                {settlingHistory.mediumNames.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验日期</Label>
              <Input
                type="date"
                value={currentValues.inspectionDate || ""}
                onChange={(e) => updateField(activeForm!.id, "inspectionDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验人员</Label>
              <Input
                list="settling-inspector-options"
                value={currentValues.inspector || ""}
                onChange={(e) => updateField(activeForm!.id, "inspector", e.target.value)}
                placeholder="填写检验人员"
              />
              <datalist id="settling-inspector-options">
                {settlingHistory.inspectors.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">实测内容</div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSettlingRow}>
                <Plus className="mr-1 h-4 w-4" />
                增加行
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[70px] text-center">序号</TableHead>
                    <TableHead>区域划分</TableHead>
                    <TableHead>洁净度级别</TableHead>
                    <TableHead>洁净区名称</TableHead>
                    <TableHead className="w-[90px]">平皿1</TableHead>
                    <TableHead className="w-[90px]">平皿2</TableHead>
                    <TableHead className="w-[90px]">平皿3</TableHead>
                    <TableHead className="w-[90px]">平皿4</TableHead>
                    <TableHead className="w-[90px] text-center">平均</TableHead>
                    <TableHead className="w-[180px]">结果判定</TableHead>
                    <TableHead className="w-[90px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlingMeasurementRows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          list="settling-area-division-options"
                          value={row.areaDivision}
                          onChange={(e) => updateSettlingMeasurementRow(row.id, { areaDivision: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="区域划分"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="settling-cleanliness-options"
                          value={row.cleanlinessLevel}
                          onChange={(e) => updateSettlingMeasurementRow(row.id, { cleanlinessLevel: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="洁净度级别"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="settling-clean-room-options"
                          value={row.cleanRoomName}
                          onChange={(e) => updateSettlingMeasurementRow(row.id, { cleanRoomName: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="洁净区名称"
                        />
                      </TableCell>
                      <TableCell><Input value={row.plate1} onChange={(e) => updateSettlingMeasurementRow(row.id, { plate1: e.target.value })} /></TableCell>
                      <TableCell><Input value={row.plate2} onChange={(e) => updateSettlingMeasurementRow(row.id, { plate2: e.target.value })} /></TableCell>
                      <TableCell><Input value={row.plate3} onChange={(e) => updateSettlingMeasurementRow(row.id, { plate3: e.target.value })} /></TableCell>
                      <TableCell><Input value={row.plate4} onChange={(e) => updateSettlingMeasurementRow(row.id, { plate4: e.target.value })} /></TableCell>
                      <TableCell className="text-center font-semibold text-muted-foreground">{calculateAirborneAverage(row) || "-"}</TableCell>
                      <TableCell>
                        <RadioGroup
                          value={row.conclusion}
                          onValueChange={(value) => updateSettlingMeasurementRow(row.id, { conclusion: value as "pass" | "fail" })}
                          className="flex flex-row gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pass" id={`${row.id}-pass`} />
                            <Label htmlFor={`${row.id}-pass`}>合格</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fail" id={`${row.id}-fail`} />
                            <Label htmlFor={`${row.id}-fail`}>不合格</Label>
                          </div>
                        </RadioGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveSettlingRow(row.id)}>
                          移除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <datalist id="settling-area-division-options">
              {settlingHistory.areaDivisions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="settling-cleanliness-options">
              {settlingHistory.cleanlinessLevels.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="settling-clean-room-options">
              {settlingHistory.cleanRoomNames.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-4 md:grid-cols-[90px_1fr_auto_auto] md:items-center">
            <div className="text-sm font-medium">纸质报告：</div>
            <Input value={currentValues.paperReportName || ""} readOnly placeholder="未上传纸质报告" />
            <Button type="button" variant="outline" onClick={handleSettlingBrowsePaper}>
              <FolderOpen className="mr-2 h-4 w-4" />
              浏览
            </Button>
            <label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleSettlingPaperUpload(e.target.files?.[0])}
              />
              <Button type="button" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  上传
                </span>
              </Button>
            </label>
          </div>

          <div className="grid gap-6 border-t pt-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-destructive">结果判定</Label>
              <RadioGroup
                value={currentValues.finalResult || "pass"}
                onValueChange={(value) => updateField(activeForm!.id, "finalResult", value)}
                className="flex flex-row gap-8"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pass" id="settling-final-pass" />
                  <Label htmlFor="settling-final-pass">合格</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fail" id="settling-final-fail" />
                  <Label htmlFor="settling-final-fail">不合格</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={currentValues.status || "pending"} onValueChange={(value) => updateField(activeForm!.id, "status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="testing">检验中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="reviewed">已复核</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6">
            {!editingRecordId ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <div className="text-sm">请先保存检验单，保存后可进行电子签名</div>
                <div className="mt-1 text-xs">符合 FDA 21 CFR Part 11 法规要求</div>
              </div>
            ) : (
              <SignatureStatusCard
                documentType="LAB"
                documentNo={currentValues.docNo || ""}
                documentId={editingRecordId}
                signatures={settlingSignatures}
                onSignComplete={(signature) => void handleSettlingSignComplete(signature)}
                enabledTypes={["inspector", "reviewer"]}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              value={currentValues.remark || ""}
              onChange={(e) => updateField(activeForm!.id, "remark", e.target.value)}
              placeholder="填写备注"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" onClick={() => void handleSaveRecord(false)} disabled={createMutation.isPending || updateMutation.isPending}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderParticleEditor = () => (
    <div className="mx-auto w-full max-w-6xl px-2 md:px-6 xl:px-10">
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-8 border-b pb-4">
            <RadioGroup
              value={currentValues.reportMode || "online"}
              onValueChange={(value) => updateField(activeForm!.id, "reportMode", value)}
              className="flex flex-row gap-8"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="particle-online" />
                <Label htmlFor="particle-online">在线填写报告</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paper" id="particle-paper" />
                <Label htmlFor="particle-paper">上传纸质报告</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-semibold tracking-wide">尘埃粒子检验记录</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">设备编号</Label>
              <Input
                list="particle-equipment-no-options"
                value={currentValues.equipmentNo || ""}
                onChange={(e) => updateField(activeForm!.id, "equipmentNo", e.target.value)}
                placeholder="填写设备编号"
              />
              <datalist id="particle-equipment-no-options">
                {particleHistory.equipmentNos.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">设备名称</Label>
              <Input
                list="particle-equipment-name-options"
                value={currentValues.equipmentName || ""}
                onChange={(e) => updateField(activeForm!.id, "equipmentName", e.target.value)}
                placeholder="填写设备名称"
              />
              <datalist id="particle-equipment-name-options">
                {particleHistory.equipmentNames.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">实测结果数量</Label>
              <Input
                list="particle-result-count-options"
                value={currentValues.resultCount || ""}
                onChange={(e) => updateField(activeForm!.id, "resultCount", e.target.value)}
                placeholder="填写数量"
              />
              <datalist id="particle-result-count-options">
                {particleHistory.resultCounts.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-destructive">检验类型</Label>
              <RadioGroup
                value={currentValues.inspectionType || "static"}
                onValueChange={(value) => updateField(activeForm!.id, "inspectionType", value)}
                className="flex flex-row gap-8"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dynamic" id="particle-type-dynamic" />
                  <Label htmlFor="particle-type-dynamic">动态</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="static" id="particle-type-static" />
                  <Label htmlFor="particle-type-static">静态</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验日期</Label>
              <Input
                type="date"
                value={currentValues.inspectionDate || ""}
                onChange={(e) => updateField(activeForm!.id, "inspectionDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验员</Label>
              <Input
                list="particle-inspector-options"
                value={currentValues.inspector || ""}
                onChange={(e) => updateField(activeForm!.id, "inspector", e.target.value)}
                placeholder="填写检验员"
              />
              <datalist id="particle-inspector-options">
                {particleHistory.inspectors.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label className="text-sm font-medium">检验依据</Label>
              <Input
                list="particle-standard-options"
                value={currentValues.standard || ""}
                onChange={(e) => updateField(activeForm!.id, "standard", e.target.value)}
                placeholder="填写检验依据"
              />
              <datalist id="particle-standard-options">
                {particleHistory.standards.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">实测内容</div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddParticleRow}>
                <Plus className="mr-1 h-4 w-4" />
                增加行
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[70px] text-center">序号</TableHead>
                    <TableHead>区域划分</TableHead>
                    <TableHead>洁净度级别</TableHead>
                    <TableHead>洁净间名称</TableHead>
                    <TableHead>粒子大小</TableHead>
                    <TableHead className="w-[80px]">1</TableHead>
                    <TableHead className="w-[80px]">2</TableHead>
                    <TableHead className="w-[80px]">3</TableHead>
                    <TableHead className="w-[80px]">4</TableHead>
                    <TableHead className="w-[90px]">UCL</TableHead>
                    <TableHead className="w-[180px]">结果判定</TableHead>
                    <TableHead className="w-[90px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {particleMeasurementRows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          list="particle-area-division-options"
                          value={row.areaDivision}
                          onChange={(e) => updateParticleMeasurementRow(row.id, { areaDivision: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="区域划分"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="particle-cleanliness-options"
                          value={row.cleanlinessLevel}
                          onChange={(e) => updateParticleMeasurementRow(row.id, { cleanlinessLevel: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="洁净度级别"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="particle-clean-room-options"
                          value={row.cleanRoomName}
                          onChange={(e) => updateParticleMeasurementRow(row.id, { cleanRoomName: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="洁净间名称"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="particle-size-options"
                          value={row.particleSize}
                          onChange={(e) => updateParticleMeasurementRow(row.id, { particleSize: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="粒子大小"
                        />
                      </TableCell>
                      <TableCell><Input value={row.value1} onChange={(e) => updateParticleMeasurementRow(row.id, { value1: e.target.value })} /></TableCell>
                      <TableCell><Input value={row.value2} onChange={(e) => updateParticleMeasurementRow(row.id, { value2: e.target.value })} /></TableCell>
                      <TableCell><Input value={row.value3} onChange={(e) => updateParticleMeasurementRow(row.id, { value3: e.target.value })} /></TableCell>
                      <TableCell><Input value={row.value4} onChange={(e) => updateParticleMeasurementRow(row.id, { value4: e.target.value })} /></TableCell>
                      <TableCell>
                        <Input
                          list="particle-ucl-options"
                          value={row.ucl}
                          onChange={(e) => updateParticleMeasurementRow(row.id, { ucl: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <RadioGroup
                          value={row.conclusion}
                          onValueChange={(value) => updateParticleMeasurementRow(row.id, { conclusion: value as "pass" | "fail" })}
                          className="flex flex-row gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pass" id={`${row.id}-pass`} />
                            <Label htmlFor={`${row.id}-pass`}>合格</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fail" id={`${row.id}-fail`} />
                            <Label htmlFor={`${row.id}-fail`}>不合格</Label>
                          </div>
                        </RadioGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveParticleRow(row.id)}>
                          移除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <datalist id="particle-area-division-options">
              {particleHistory.areaDivisions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="particle-cleanliness-options">
              {particleHistory.cleanlinessLevels.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="particle-clean-room-options">
              {particleHistory.cleanRoomNames.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="particle-size-options">
              {particleHistory.particleSizes.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="particle-ucl-options">
              {particleHistory.ucls.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-4 md:grid-cols-[90px_1fr_auto_auto] md:items-center">
            <div className="text-sm font-medium">纸质报告：</div>
            <Input value={currentValues.paperReportName || ""} readOnly placeholder="未上传纸质报告" />
            <Button type="button" variant="outline" onClick={handleParticleBrowsePaper}>
              <FolderOpen className="mr-2 h-4 w-4" />
              浏览
            </Button>
            <label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleParticlePaperUpload(e.target.files?.[0])}
              />
              <Button type="button" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  上传
                </span>
              </Button>
            </label>
          </div>

          <div className="grid gap-6 border-t pt-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-destructive">结果判定</Label>
              <RadioGroup
                value={currentValues.finalResult || "pass"}
                onValueChange={(value) => updateField(activeForm!.id, "finalResult", value)}
                className="flex flex-row gap-8"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pass" id="particle-final-pass" />
                  <Label htmlFor="particle-final-pass">合格</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fail" id="particle-final-fail" />
                  <Label htmlFor="particle-final-fail">不合格</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={currentValues.status || "pending"} onValueChange={(value) => updateField(activeForm!.id, "status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="testing">检验中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="reviewed">已复核</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6">
            {!editingRecordId ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <div className="text-sm">请先保存检验单，保存后可进行电子签名</div>
                <div className="mt-1 text-xs">符合 FDA 21 CFR Part 11 法规要求</div>
              </div>
            ) : (
              <SignatureStatusCard
                documentType="LAB"
                documentNo={currentValues.docNo || ""}
                documentId={editingRecordId}
                signatures={particleSignatures}
                onSignComplete={(signature) => void handleParticleSignComplete(signature)}
                enabledTypes={["inspector", "reviewer"]}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              value={currentValues.remark || ""}
              onChange={(e) => updateField(activeForm!.id, "remark", e.target.value)}
              placeholder="填写备注"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" onClick={() => void handleSaveRecord(false)} disabled={createMutation.isPending || updateMutation.isPending}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAirflowEditor = () => (
    <div className="mx-auto w-full max-w-6xl px-2 md:px-6 xl:px-10">
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-8 border-b pb-4">
            <RadioGroup
              value={currentValues.reportMode || "online"}
              onValueChange={(value) => updateField(activeForm!.id, "reportMode", value)}
              className="flex flex-row gap-8"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="airflow-online" />
                <Label htmlFor="airflow-online">在线填写报告</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paper" id="airflow-paper" />
                <Label htmlFor="airflow-paper">上传纸质报告</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-semibold tracking-wide">风量、换气次数监测记录</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">设备编号</Label>
              <Input
                list="airflow-equipment-no-options"
                value={currentValues.equipmentNo || ""}
                onChange={(e) => updateField(activeForm!.id, "equipmentNo", e.target.value)}
                placeholder="填写设备编号"
              />
              <datalist id="airflow-equipment-no-options">
                {airflowHistory.equipmentNos.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验日期</Label>
              <Input
                type="date"
                value={currentValues.inspectionDate || ""}
                onChange={(e) => updateField(activeForm!.id, "inspectionDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验员</Label>
              <Input
                list="airflow-inspector-options"
                value={currentValues.inspector || ""}
                onChange={(e) => updateField(activeForm!.id, "inspector", e.target.value)}
                placeholder="填写检验员"
              />
              <datalist id="airflow-inspector-options">
                {airflowHistory.inspectors.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label className="text-sm font-medium">检验依据</Label>
              <Input
                list="airflow-standard-options"
                value={currentValues.standard || ""}
                onChange={(e) => updateField(activeForm!.id, "standard", e.target.value)}
                placeholder="填写检验依据"
              />
              <datalist id="airflow-standard-options">
                {airflowHistory.standards.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">实测内容</div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddAirflowRow}>
                <Plus className="mr-1 h-4 w-4" />
                增加行
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[70px] text-center">序号</TableHead>
                    <TableHead>区域划分</TableHead>
                    <TableHead>洁净度级别</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead className="w-[110px]">面积/m²</TableHead>
                    <TableHead className="w-[110px]">房高/m</TableHead>
                    <TableHead className="w-[100px]">风口/个</TableHead>
                    <TableHead className="w-[110px]">风量/m³</TableHead>
                    <TableHead className="w-[100px]">次数</TableHead>
                    <TableHead className="w-[180px]">结果判定</TableHead>
                    <TableHead className="w-[90px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {airflowMeasurementRows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          list="airflow-area-division-options"
                          value={row.areaDivision}
                          onChange={(e) => updateAirflowMeasurementRow(row.id, { areaDivision: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="区域划分"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="airflow-cleanliness-options"
                          value={row.cleanlinessLevel}
                          onChange={(e) => updateAirflowMeasurementRow(row.id, { cleanlinessLevel: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="洁净度级别"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="airflow-clean-room-options"
                          value={row.cleanRoomName}
                          onChange={(e) => updateAirflowMeasurementRow(row.id, { cleanRoomName: e.target.value })}
                          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder="名称"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="airflow-area-size-options"
                          value={row.areaSize}
                          onChange={(e) => updateAirflowMeasurementRow(row.id, { areaSize: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="airflow-room-height-options"
                          value={row.roomHeight}
                          onChange={(e) => updateAirflowMeasurementRow(row.id, { roomHeight: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="airflow-outlet-count-options"
                          value={row.outletCount}
                          onChange={(e) => updateAirflowMeasurementRow(row.id, { outletCount: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="airflow-air-volume-options"
                          value={row.airVolume}
                          onChange={(e) => updateAirflowMeasurementRow(row.id, { airVolume: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="airflow-air-changes-options"
                          value={row.airChanges}
                          onChange={(e) => updateAirflowMeasurementRow(row.id, { airChanges: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <RadioGroup
                          value={row.conclusion}
                          onValueChange={(value) => updateAirflowMeasurementRow(row.id, { conclusion: value as "pass" | "fail" })}
                          className="flex flex-row gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pass" id={`${row.id}-pass`} />
                            <Label htmlFor={`${row.id}-pass`}>合格</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fail" id={`${row.id}-fail`} />
                            <Label htmlFor={`${row.id}-fail`}>不合格</Label>
                          </div>
                        </RadioGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveAirflowRow(row.id)}>
                          移除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <datalist id="airflow-area-division-options">
              {airflowHistory.areaDivisions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="airflow-cleanliness-options">
              {airflowHistory.cleanlinessLevels.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="airflow-clean-room-options">
              {airflowHistory.cleanRoomNames.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="airflow-area-size-options">
              {airflowHistory.areaSizes.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="airflow-room-height-options">
              {airflowHistory.roomHeights.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="airflow-outlet-count-options">
              {airflowHistory.outletCounts.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="airflow-air-volume-options">
              {airflowHistory.airVolumes.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="airflow-air-changes-options">
              {airflowHistory.airChanges.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-4 md:grid-cols-[90px_1fr_auto_auto] md:items-center">
            <div className="text-sm font-medium">纸质报告：</div>
            <Input value={currentValues.paperReportName || ""} readOnly placeholder="未上传纸质报告" />
            <Button type="button" variant="outline" onClick={handleAirflowBrowsePaper}>
              <FolderOpen className="mr-2 h-4 w-4" />
              浏览
            </Button>
            <label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleAirflowPaperUpload(e.target.files?.[0])}
              />
              <Button type="button" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  上传
                </span>
              </Button>
            </label>
          </div>

          <div className="grid gap-6 border-t pt-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-destructive">结果判定</Label>
              <RadioGroup
                value={currentValues.finalResult || "pass"}
                onValueChange={(value) => updateField(activeForm!.id, "finalResult", value)}
                className="flex flex-row gap-8"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pass" id="airflow-final-pass" />
                  <Label htmlFor="airflow-final-pass">合格</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fail" id="airflow-final-fail" />
                  <Label htmlFor="airflow-final-fail">不合格</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={currentValues.status || "pending"} onValueChange={(value) => updateField(activeForm!.id, "status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="testing">检验中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="reviewed">已复核</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6">
            {!editingRecordId ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <div className="text-sm">请先保存检验单，保存后可进行电子签名</div>
                <div className="mt-1 text-xs">符合 FDA 21 CFR Part 11 法规要求</div>
              </div>
            ) : (
              <SignatureStatusCard
                documentType="LAB"
                documentNo={currentValues.docNo || ""}
                documentId={editingRecordId}
                signatures={airflowSignatures}
                onSignComplete={(signature) => void handleAirflowSignComplete(signature)}
                enabledTypes={["inspector", "reviewer"]}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              value={currentValues.remark || ""}
              onChange={(e) => updateField(activeForm!.id, "remark", e.target.value)}
              placeholder="填写备注"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" onClick={() => void handleSaveRecord(false)} disabled={createMutation.isPending || updateMutation.isPending}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEndotoxinEditor = () => (
    <div className="mx-auto w-full max-w-6xl px-2 md:px-6 xl:px-10">
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="text-center">
            <h3 className="text-2xl font-semibold tracking-wide">细菌内毒素检测试剂标准操作记录</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">样品名称</Label>
              <div className="flex gap-2">
                <Input value={currentValues.sampleName || ""} readOnly placeholder="请选择生产入库申请样品" />
                <Button type="button" variant="outline" onClick={() => setEndotoxinSamplePickerOpen(true)}>
                  选择
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">灭菌批号</Label>
              <Input list="endotoxin-sterilization-options" value={currentValues.sterilizationBatch || ""} onChange={(e) => updateField(activeForm!.id, "sterilizationBatch", e.target.value)} />
              <datalist id="endotoxin-sterilization-options">
                {endotoxinHistory.sterilizationBatches.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-destructive">生产批号</Label>
              <Input list="endotoxin-production-options" value={currentValues.productionBatch || ""} onChange={(e) => updateField(activeForm!.id, "productionBatch", e.target.value)} />
              <datalist id="endotoxin-production-options">
                {endotoxinHistory.productionBatches.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">样品型号</Label>
              <Input list="endotoxin-model-options" value={currentValues.sampleModel || ""} onChange={(e) => updateField(activeForm!.id, "sampleModel", e.target.value)} />
              <datalist id="endotoxin-model-options">
                {endotoxinHistory.sampleModels.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">入库申请号</Label>
              <Input value={currentValues.sourceWarehouseEntryNo || ""} readOnly placeholder="选择样品后自动带入" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-destructive">内毒素限制</Label>
              <Input list="endotoxin-limit-options" value={currentValues.endotoxinLimit || ""} onChange={(e) => updateField(activeForm!.id, "endotoxinLimit", e.target.value)} />
              <datalist id="endotoxin-limit-options">
                {endotoxinHistory.endotoxinLimits.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium text-destructive">供试液制备</Label>
              <Input list="endotoxin-preparation-options" value={currentValues.samplePreparation || ""} onChange={(e) => updateField(activeForm!.id, "samplePreparation", e.target.value)} />
              <datalist id="endotoxin-preparation-options">
                {endotoxinHistory.samplePreparations.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验日期</Label>
              <Input type="date" value={currentValues.inspectionDate || ""} onChange={(e) => updateField(activeForm!.id, "inspectionDate", e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium">检验依据</Label>
              <Input list="endotoxin-standard-options" value={currentValues.standard || ""} onChange={(e) => updateField(activeForm!.id, "standard", e.target.value)} />
              <datalist id="endotoxin-standard-options">
                {endotoxinHistory.standards.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">检验员</Label>
              <Input list="endotoxin-inspector-options" value={currentValues.inspector || ""} onChange={(e) => updateField(activeForm!.id, "inspector", e.target.value)} />
              <datalist id="endotoxin-inspector-options">
                {endotoxinHistory.inspectors.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">试剂信息</div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[70px] text-center">序号</TableHead>
                    <TableHead>试剂名称</TableHead>
                    <TableHead>生产单位</TableHead>
                    <TableHead>批号</TableHead>
                    <TableHead>灵敏度</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endotoxinReagentRows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell><Input list="endotoxin-reagent-name-options" value={row.reagentName} onChange={(e) => updateEndotoxinReagentRow(row.id, { reagentName: e.target.value })} /></TableCell>
                      <TableCell><Input list="endotoxin-manufacturer-options" value={row.manufacturer} onChange={(e) => updateEndotoxinReagentRow(row.id, { manufacturer: e.target.value })} /></TableCell>
                      <TableCell><Input value={row.batchNo} onChange={(e) => updateEndotoxinReagentRow(row.id, { batchNo: e.target.value })} /></TableCell>
                      <TableCell><Input list="endotoxin-sensitivity-options" value={row.sensitivity} onChange={(e) => updateEndotoxinReagentRow(row.id, { sensitivity: e.target.value })} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <datalist id="endotoxin-reagent-name-options">
              {endotoxinHistory.reagentNames.map((item) => <option key={item} value={item} />)}
            </datalist>
            <datalist id="endotoxin-manufacturer-options">
              {endotoxinHistory.manufacturers.map((item) => <option key={item} value={item} />)}
            </datalist>
            <datalist id="endotoxin-sensitivity-options">
              {endotoxinHistory.sensitivities.map((item) => <option key={item} value={item} />)}
            </datalist>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">测试内容</div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddEndotoxinRow}>
                <Plus className="mr-1 h-4 w-4" />
                增加行
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[70px] text-center">序号</TableHead>
                    <TableHead>内毒素浓度/配置内毒素的溶液</TableHead>
                    <TableHead className="w-[180px]">结果1</TableHead>
                    <TableHead className="w-[180px]">结果2</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endotoxinTestRows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell><Input list="endotoxin-solution-options" value={row.solutionName} onChange={(e) => updateEndotoxinTestRow(row.id, { solutionName: e.target.value })} /></TableCell>
                      <TableCell><Input value={row.result1} onChange={(e) => updateEndotoxinTestRow(row.id, { result1: e.target.value })} /></TableCell>
                      <TableCell><Input value={row.result2} onChange={(e) => updateEndotoxinTestRow(row.id, { result2: e.target.value })} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <datalist id="endotoxin-solution-options">
              {endotoxinHistory.solutions.map((item) => <option key={item} value={item} />)}
            </datalist>
          </div>

          <div className="grid gap-4 md:grid-cols-[90px_1fr_auto_auto] md:items-center">
            <div className="text-sm font-medium">纸质报告：</div>
            <Input value={currentValues.paperReportName || ""} readOnly placeholder="未上传纸质报告" />
            <Button type="button" variant="outline" onClick={handleEndotoxinBrowsePaper}>
              <FolderOpen className="mr-2 h-4 w-4" />
              浏览
            </Button>
            <label>
              <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleEndotoxinPaperUpload(e.target.files?.[0])} />
              <Button type="button" asChild>
                <span><Upload className="mr-2 h-4 w-4" />上传</span>
              </Button>
            </label>
          </div>

          <div className="grid gap-6 border-t pt-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-destructive">结果判定</Label>
              <RadioGroup value={currentValues.finalResult || "pass"} onValueChange={(value) => updateField(activeForm!.id, "finalResult", value)} className="flex flex-row gap-8">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pass" id="endotoxin-final-pass" />
                  <Label htmlFor="endotoxin-final-pass">合格</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fail" id="endotoxin-final-fail" />
                  <Label htmlFor="endotoxin-final-fail">不合格</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={currentValues.status || "pending"} onValueChange={(value) => updateField(activeForm!.id, "status", value)}>
                <SelectTrigger><SelectValue placeholder="选择状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="testing">检验中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="reviewed">已复核</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-6">
            {!editingRecordId ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <div className="text-sm">请先保存检验单，保存后可进行电子签名</div>
                <div className="mt-1 text-xs">符合 FDA 21 CFR Part 11 法规要求</div>
              </div>
            ) : (
              <SignatureStatusCard
                documentType="LAB"
                documentNo={currentValues.docNo || ""}
                documentId={editingRecordId}
                signatures={endotoxinSignatures}
                onSignComplete={(signature) => void handleEndotoxinSignComplete(signature)}
                enabledTypes={["inspector", "reviewer"]}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea value={currentValues.remark || ""} onChange={(e) => updateField(activeForm!.id, "remark", e.target.value)} placeholder="填写备注" rows={3} />
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" onClick={() => void handleSaveRecord(false)} disabled={createMutation.isPending || updateMutation.isPending}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBioburdenEditor = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* 在线填写/上传纸质切换 */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={(currentValues.entryMode || "online") === "online"} onChange={() => updateField(activeForm!.id, "entryMode", "online")} />
              <span className="text-sm">在线填写报告</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={currentValues.entryMode === "paper"} onChange={() => updateField(activeForm!.id, "entryMode", "paper")} />
              <span className="text-sm">上传纸质报告</span>
            </label>
          </div>

          <h2 className="text-2xl font-bold">初始污染菌检测记录</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>编号 *</Label>
              <Input value={currentValues.docNo || ""} onChange={(e) => updateField(activeForm!.id, "docNo", e.target.value)} placeholder="自动生成" />
            </div>
            <div className="space-y-2">
              <Label>生产批号 *</Label>
              <Input value={currentValues.batchNo || ""} onChange={(e) => updateField(activeForm!.id, "batchNo", e.target.value)} placeholder="输入生产批号" />
            </div>
            <div className="space-y-2">
              <Label>产品名称 *</Label>
              <Input value={currentValues.productName || ""} onChange={(e) => updateField(activeForm!.id, "productName", e.target.value)} placeholder="输入产品名称" />
            </div>
            <div className="space-y-2">
              <Label>规格型号 *</Label>
              <Input value={currentValues.specModel || ""} onChange={(e) => updateField(activeForm!.id, "specModel", e.target.value)} placeholder="输入规格型号" />
            </div>
            <div className="space-y-2">
              <Label>完成日期 *</Label>
              <Input type="date" value={currentValues.completionDate || ""} onChange={(e) => updateField(activeForm!.id, "completionDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>检验日期 *</Label>
              <Input type="date" value={currentValues.inspectionDate || ""} onChange={(e) => updateField(activeForm!.id, "inspectionDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>检验员 *</Label>
              <Select value={currentValues.inspector || undefined} onValueChange={(value) => updateField(activeForm!.id, "inspector", value)}>
                <SelectTrigger><SelectValue placeholder="选择检验员" /></SelectTrigger>
                <SelectContent>
                  {inspectorOptions.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>检验标准 *</Label>
              <Select value={currentValues.inspectionStandard || BIOBURDEN_STANDARD_OPTIONS[0]} onValueChange={(value) => updateField(activeForm!.id, "inspectionStandard", value)}>
                <SelectTrigger><SelectValue placeholder="选择检验标准" /></SelectTrigger>
                <SelectContent>
                  {BIOBURDEN_STANDARD_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>培养基批号</Label>
            <div className="grid grid-cols-3 gap-4">
              {bioburdenMediumBatchNos.map((val, idx) => (
                <Input
                  key={idx}
                  value={val}
                  onChange={(e) => {
                    const next = [...bioburdenMediumBatchNos];
                    next[idx] = e.target.value;
                    updateField(activeForm!.id, "mediumBatchNos", JSON.stringify(next));
                  }}
                  placeholder={`P00${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">检验内容</div>
              <Button type="button" variant="outline" size="sm" onClick={addBioburdenRow}>
                <Plus className="h-4 w-4 mr-1" />增加行
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>检验项目</TableHead>
                    <TableHead className="w-[180px] text-center">皘1</TableHead>
                    <TableHead className="w-[180px] text-center">皘2</TableHead>
                    <TableHead className="w-[180px] text-center">均値</TableHead>
                    <TableHead className="w-[160px] text-center">结论</TableHead>
                    <TableHead className="w-[80px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bioburdenRows.map((row, index) => (
                    <TableRow key={`bioburden-row-${index}`}>
                      <TableCell>
                        <Input value={row.itemName} onChange={(e) => updateBioburdenRow(index, "itemName", e.target.value)} />
                      </TableCell>
                      <TableCell><Input value={row.plate1} onChange={(e) => updateBioburdenRow(index, "plate1", e.target.value)} /></TableCell>
                      <TableCell><Input value={row.plate2} onChange={(e) => updateBioburdenRow(index, "plate2", e.target.value)} /></TableCell>
                      <TableCell><Input value={row.average} readOnly className="bg-muted/40 text-center font-semibold" /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-4 text-sm">
                          <label className="flex items-center gap-2">
                            <input type="radio" checked={row.conclusion === "qualified"} onChange={() => updateBioburdenRow(index, "conclusion", "qualified")} />
                            合格
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="radio" checked={row.conclusion === "unqualified"} onChange={() => updateBioburdenRow(index, "conclusion", "unqualified")} />
                            不合格
                          </label>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" disabled={bioburdenRows.length <= 1} onClick={() => removeBioburdenRow(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>纸质报告</Label>
              <div className="flex gap-2">
                <Input value={currentValues.paperReportName || ""} readOnly placeholder="未上传纸质报告" />
                <Button type="button" variant="outline" disabled={!currentValues.paperReportPath} onClick={() => currentValues.paperReportPath && window.open(currentValues.paperReportPath, "_blank")}>浏览</Button>
                <Button type="button" onClick={() => bioburdenPaperInputRef.current?.click()}>上传</Button>
                <input ref={bioburdenPaperInputRef} type="file" className="hidden" onChange={(e) => handleBioburdenPaperUpload(e.target.files)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>结果判定 *</Label>
              <div className="flex h-10 items-center gap-6 rounded-md border px-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={(currentValues.result || "qualified") === "qualified"} onChange={() => updateField(activeForm!.id, "result", "qualified")} />
                  合格
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={currentValues.result === "unqualified"} onChange={() => updateField(activeForm!.id, "result", "unqualified")} />
                  不合格
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <div className="text-sm">保存时将弹出电子签名验证，不再单独在表单内签名</div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" onClick={() => void handleSaveRecord(false)} disabled={createMutation.isPending || updateMutation.isPending}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSterilityEditor = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold">无菌检验记录</h2>
            <p className="text-sm text-muted-foreground">按初始污染菌检测记录同版式录入无菌检验数据</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>检验单号</Label>
              <Input value={currentValues.docNo || ""} readOnly placeholder="自动生成无需填写" className="bg-muted/40" />
            </div>
            <div className="space-y-2">
              <Label>检验日期 *</Label>
              <Input type="date" value={currentValues.inspectionDate || ""} onChange={(e) => updateField(activeForm!.id, "inspectionDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>检验员 *</Label>
              <Select value={currentValues.inspector || undefined} onValueChange={(value) => updateField(activeForm!.id, "inspector", value)}>
                <SelectTrigger><SelectValue placeholder="选择检验员" /></SelectTrigger>
                <SelectContent>
                  {inspectorOptions.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">产品信息</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>产品名称</Label>
                <Input value={currentValues.productName || ""} onChange={(e) => updateField(activeForm!.id, "productName", e.target.value)} placeholder="输入产品名称" />
              </div>
              <div className="space-y-2">
                <Label>产品编码</Label>
                <Input value={currentValues.productCode || ""} onChange={(e) => updateField(activeForm!.id, "productCode", e.target.value)} placeholder="输入产品编码" />
              </div>
              <div className="space-y-2">
                <Label>生产批号</Label>
                <Input value={currentValues.batchNo || ""} onChange={(e) => updateField(activeForm!.id, "batchNo", e.target.value)} placeholder="输入生产批号" />
              </div>
              <div className="space-y-2">
                <Label>入库数量</Label>
                <Input value={currentValues.quantity || ""} onChange={(e) => updateField(activeForm!.id, "quantity", e.target.value)} placeholder="输入入库数量" />
              </div>
              <div className="space-y-2">
                <Label>灰菌批号</Label>
                <Input value={currentValues.sterilizationBatchNo || ""} onChange={(e) => updateField(activeForm!.id, "sterilizationBatchNo", e.target.value)} placeholder="输入灰菌批号" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">检验条件</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>内毒素限制</Label>
                <Input value={currentValues.endotoxinLimit || ""} onChange={(e) => updateField(activeForm!.id, "endotoxinLimit", e.target.value)} placeholder="填写内毒素限制" />
              </div>
              <div className="space-y-2">
                <Label>供试液制备</Label>
                <Input value={currentValues.samplePreparation || ""} onChange={(e) => updateField(activeForm!.id, "samplePreparation", e.target.value)} placeholder="填写供试液制备" />
              </div>
              <div className="space-y-2">
                <Label>检验依据</Label>
                <Input value={currentValues.inspectionBasis || ""} onChange={(e) => updateField(activeForm!.id, "inspectionBasis", e.target.value)} placeholder="填写检验依据" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">检验内容</div>
              <Button type="button" variant="outline" size="sm" onClick={addSterilityRow}>
                <Plus className="h-4 w-4 mr-1" />增加行
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] text-center">#</TableHead>
                    <TableHead>检验项目</TableHead>
                    <TableHead className="w-[180px] text-center">茓1</TableHead>
                    <TableHead className="w-[180px] text-center">茓2</TableHead>
                    <TableHead className="w-[180px] text-center">均値</TableHead>
                    <TableHead className="w-[160px] text-center">结论</TableHead>
                    <TableHead className="w-[80px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sterilityRows.map((row, index) => (
                    <TableRow key={`sterility-row-${index}`}>
                      <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <Input value={row.itemName} onChange={(e) => updateSterilityRow(index, "itemName", e.target.value)} />
                      </TableCell>
                      <TableCell><Input value={row.colony1} onChange={(e) => updateSterilityRow(index, "colony1", e.target.value)} /></TableCell>
                      <TableCell><Input value={row.colony2} onChange={(e) => updateSterilityRow(index, "colony2", e.target.value)} /></TableCell>
                      <TableCell><Input value={row.average} readOnly className="bg-muted/40 text-center font-semibold" /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-4 text-sm">
                          <label className="flex items-center gap-2">
                            <input type="radio" checked={row.conclusion === "qualified"} onChange={() => updateSterilityRow(index, "conclusion", "qualified")} />
                            合格
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="radio" checked={row.conclusion === "unqualified"} onChange={() => updateSterilityRow(index, "conclusion", "unqualified")} />
                            不合格
                          </label>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" disabled={sterilityRows.length <= 1} onClick={() => removeSterilityRow(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>纸质报告</Label>
              <div className="flex gap-2">
                <Input value={currentValues.paperReportName || ""} readOnly placeholder="未上传纸质报告" />
                <Button type="button" variant="outline" disabled={!currentValues.paperReportPath} onClick={() => currentValues.paperReportPath && window.open(currentValues.paperReportPath, "_blank")}>浏览</Button>
                <Button type="button" onClick={() => sterilityPaperInputRef.current?.click()}>上传</Button>
                <input ref={sterilityPaperInputRef} type="file" className="hidden" onChange={(e) => handleSterilityPaperUpload(e.target.files)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>判定结果 *</Label>
              <div className="flex h-10 items-center gap-6 rounded-md border px-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={(currentValues.result || "qualified") === "qualified"} onChange={() => updateField(activeForm!.id, "result", "qualified")} />
                  合格
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={currentValues.result === "unqualified"} onChange={() => updateField(activeForm!.id, "result", "unqualified")} />
                  不合格
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <div className="text-sm">保存时将弹出电子签名验证，不再单独在表单内签名</div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" onClick={() => void handleSaveRecord(false)} disabled={createMutation.isPending || updateMutation.isPending}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TestTube className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{isOverviewPage ? "实验室管理" : activeForm.title}</h2>
              <p className="text-sm text-muted-foreground">
                {isOverviewPage ? "保留现有 8 个实验室表单入口，并支持记录保存、查看和编辑。" : activeForm.description}
              </p>
            </div>
          </div>
          {!isOverviewPage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLocation("/quality/lab")}>
                返回总览
              </Button>
              <Button variant="outline" onClick={resetActiveForm}>
                <Plus className="mr-2 h-4 w-4" />
                新建记录
              </Button>
              {!isPwChemicalPage && !isPwMicrobialPage && !isAirbornePage && !isSettlingPage && !isParticlePage && !isAirflowPage && !isEndotoxinPage && (
                <>
                  <Button variant="outline" onClick={() => void handleSaveRecord(true)} disabled={createMutation.isPending || updateMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    保存草稿
                  </Button>
                  <Button onClick={() => void handleSaveRecord(false)} disabled={createMutation.isPending || updateMutation.isPending}>
                    保存
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {isOverviewPage && (
          <>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-[1.9rem] font-bold leading-none ${stat.color}`}>{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-3">
                {visibleForms.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/10 py-8 text-center text-sm text-muted-foreground">
                    暂无匹配的实验室表单
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                    {visibleForms.map((form) => {
                      const Icon = form.icon;
                      const iconStyle = LAB_ICON_STYLE_MAP[form.id] || {
                        bg: "bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-200/80",
                        icon: "text-white",
                      };
                      return (
                        <button
                          key={form.id}
                          type="button"
                          onClick={() => setLocation(`/quality/lab/${form.id}`)}
                          className="group flex w-full flex-col items-center text-center transition-transform hover:-translate-y-0.5"
                        >
                          <div className={`mb-2 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:scale-[1.03] ${iconStyle.bg}`}>
                            <Icon className={`h-7 w-7 ${iconStyle.icon}`} />
                          </div>
                          <div className="w-full text-[13px] font-semibold leading-5 text-slate-800">
                            {form.shortTitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="搜索表单名称、简称..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="表单类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      <SelectItem value="记录">记录</SelectItem>
                      <SelectItem value="检验">检验</SelectItem>
                      <SelectItem value="SOP">SOP</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => { setSearch(""); setTypeFilter("all"); }}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">最近实验室记录</CardTitle>
                <CardDescription>所有已保存的实验室记录会统一显示在这里，方便快速查看和进入编辑。</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>记录编号</TableHead>
                      <TableHead>表单</TableHead>
                      <TableHead>检验日期</TableHead>
                      <TableHead>检验人</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>结论</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          正在加载实验室记录...
                        </TableCell>
                      </TableRow>
                    ) : recentRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          暂无已保存的实验室记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.recordNo}</TableCell>
                          <TableCell>{record.formTitle || record.testType}</TableCell>
                          <TableCell>{formatDateValue(record.testDate)}</TableCell>
                          <TableCell>{record.testerName || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusMetaMap[record.status].className}>
                              {statusMetaMap[record.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={conclusionMetaMap[record.conclusion].className}>
                              {conclusionMetaMap[record.conclusion].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => handleViewRecord(record)}>
                                <Eye className="mr-1 h-4 w-4" />
                                查看
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleEditRecord(record)}>
                                <Edit className="mr-1 h-4 w-4" />
                                编辑
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {isOverviewPage ? (
            null
        ) : (
          <>
            {isPwChemicalPage ? (
              renderPwChemicalEditor()
            ) : isPwMicrobialPage ? (
              renderPwMicrobialEditor()
            ) : isAirbornePage ? (
              renderAirborneEditor()
            ) : isSettlingPage ? (
              renderSettlingEditor()
            ) : isParticlePage ? (
              renderParticleEditor()
            ) : isAirflowPage ? (
              renderAirflowEditor()
            ) : isEndotoxinPage ? (
              renderEndotoxinEditor()
            ) : isBioburdenPage ? (
              renderBioburdenEditor()
            ) : isSterilityPage ? (
              renderSterilityEditor()
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {editingRecordId ? "当前编辑记录" : "通用记录信息"}
                    </CardTitle>
                    <CardDescription>这些字段会统一写入实验室记录主表，便于后续查询、统计和追溯。</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>记录编号</Label>
                        <Input
                          value={currentValues.docNo || ""}
                          onChange={(e) => updateField(activeForm.id, "docNo", e.target.value)}
                          placeholder="自动生成，可手动修改"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验日期</Label>
                        <Input
                          type="date"
                          value={currentValues.testDate || ""}
                          onChange={(e) => updateField(activeForm.id, "testDate", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验方法</Label>
                        <Input
                          value={currentValues.testMethod || ""}
                          onChange={(e) => updateField(activeForm.id, "testMethod", e.target.value)}
                          placeholder="填写检验方法"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验依据</Label>
                        <Input
                          value={currentValues.specification || ""}
                          onChange={(e) => updateField(activeForm.id, "specification", e.target.value)}
                          placeholder="填写检验依据/标准"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>检验人</Label>
                        <Input
                          value={currentValues.testerName || ""}
                          onChange={(e) => updateField(activeForm.id, "testerName", e.target.value)}
                          placeholder="填写检验人"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>复核人</Label>
                        <Input
                          value={currentValues.reviewerName || ""}
                          onChange={(e) => updateField(activeForm.id, "reviewerName", e.target.value)}
                          placeholder="填写复核人"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>复核日期</Label>
                        <Input
                          type="date"
                          value={currentValues.reviewDate || ""}
                          onChange={(e) => updateField(activeForm.id, "reviewDate", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>状态</Label>
                        <Select value={currentValues.status || "pending"} onValueChange={(value) => updateField(activeForm.id, "status", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择状态" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">待处理</SelectItem>
                            <SelectItem value="testing">检验中</SelectItem>
                            <SelectItem value="completed">已完成</SelectItem>
                            <SelectItem value="reviewed">已复核</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>结论</Label>
                        <Select value={currentValues.conclusion || "pending"} onValueChange={(value) => updateField(activeForm.id, "conclusion", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择结论" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">待判定</SelectItem>
                            <SelectItem value="pass">合格</SelectItem>
                            <SelectItem value="fail">不合格</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>结果摘要</Label>
                        <Textarea
                          value={currentValues.result || ""}
                          onChange={(e) => updateField(activeForm.id, "result", e.target.value)}
                          placeholder="填写结果摘要"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>备注</Label>
                        <Textarea
                          value={currentValues.remark || ""}
                          onChange={(e) => updateField(activeForm.id, "remark", e.target.value)}
                          placeholder="填写备注"
                          rows={3}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {activeForm.sections.map((section, index) => (
                  <Card key={section.id}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {index + 1}
                        </div>
                        <CardTitle className="text-base">{section.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        {section.fields.map((field) => (
                          <div
                            key={field.id}
                            className={`space-y-2 ${field.colSpan === 2 ? "md:col-span-2" : ""}`}
                          >
                            <Label>{field.label}</Label>
                            {renderField(activeForm.id, field)}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

          </>
        )}
      </div>

      <DraggableDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        defaultWidth={960}
        defaultHeight={760}
        isMaximized={viewDialogMaximized}
        onMaximizedChange={setViewDialogMaximized}
      >
        <DraggableDialogContent isMaximized={viewDialogMaximized} className="space-y-4">
          {viewingRecord && (
            <>
              <DialogHeader>
                <DialogTitle>{viewingRecord.formTitle || viewingRecord.testType}</DialogTitle>
                <DialogDescription>{viewingRecord.recordNo}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">主记录信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">表单类型</span><span>{viewingRecord.formType || "-"}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">检验日期</span><span>{formatDateValue(viewingRecord.testDate)}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">检验人</span><span>{viewingRecord.testerName || "-"}</span></div>
                    {viewingRecord.formId !== "pw-chemical" && viewingRecord.formId !== "pw-microbial" && viewingRecord.formId !== "airborne-microbe" && viewingRecord.formId !== "settling-bacteria" && viewingRecord.formId !== "particle-monitor" && viewingRecord.formId !== "airflow-monitor" && viewingRecord.formId !== "endotoxin-sop" && (
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">复核人</span><span>{viewingRecord.reviewerName || "-"}</span></div>
                    )}
                    {viewingRecord.formId !== "pw-chemical" && viewingRecord.formId !== "pw-microbial" && viewingRecord.formId !== "airborne-microbe" && viewingRecord.formId !== "settling-bacteria" && viewingRecord.formId !== "particle-monitor" && viewingRecord.formId !== "airflow-monitor" && viewingRecord.formId !== "endotoxin-sop" && (
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">复核日期</span><span>{formatDateValue(viewingRecord.reviewDate)}</span></div>
                    )}
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">状态</span><Badge variant="outline" className={statusMetaMap[viewingRecord.status].className}>{statusMetaMap[viewingRecord.status].label}</Badge></div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">结论</span><Badge variant="outline" className={conclusionMetaMap[viewingRecord.conclusion].className}>{conclusionMetaMap[viewingRecord.conclusion].label}</Badge></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">摘要信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <div className="mb-1 text-muted-foreground">检验方法</div>
                      <div>{viewingRecord.testMethod || "-"}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-muted-foreground">检验依据</div>
                      <div>{viewingRecord.specification || "-"}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-muted-foreground">结果摘要</div>
                      <div className="whitespace-pre-wrap">{viewingRecord.result || "-"}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-muted-foreground">备注</div>
                      <div className="whitespace-pre-wrap">{viewingRecord.remark || "-"}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {(() => {
                const recordForm = LAB_FORMS.find((item) => item.id === viewingRecord.formId);
                if (!recordForm) return null;
                if (viewingRecord.formId === "pw-chemical") {
                  const rows = parsePwChemicalRows(viewingRecord.formData.inspectionItems);
                  const signatures = parseSignatureRecords(viewingRecord.formData.signatures);
                  return (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">理化检验基础信息</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>名称</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.reportName || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>取样器具</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.sampler || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>取样点</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.samplePoint || "-"}</div>
                          </div>
                          <div className="space-y-2 md:col-span-3">
                            <Label>检验依据</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.standard || "-"}</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">检验内容</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40">
                                  <TableHead className="w-[72px] text-center">序号</TableHead>
                                  <TableHead>检验项目</TableHead>
                                  <TableHead>结论</TableHead>
                                  <TableHead>检验人</TableHead>
                                  <TableHead>检验日期</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rows.map((row, index) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="text-center">{index + 1}</TableCell>
                                    <TableCell className="font-medium">{row.itemName}</TableCell>
                                    <TableCell>{row.conclusion === "pass" ? "符合" : "不符合"}</TableCell>
                                    <TableCell>{row.inspector || "-"}</TableCell>
                                    <TableCell>{row.inspectionDate || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">纸质报告与审核</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>纸质报告</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.paperReportName || "-"}</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">电子签名</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <SignatureHistory signatures={signatures} />
                        </CardContent>
                      </Card>
                    </div>
                  );
                }
                if (viewingRecord.formId === "pw-microbial") {
                  const cultureMediaRows = parsePwMicrobialMediaRows(viewingRecord.formData.cultureMediaItems);
                  const resultRows = parsePwMicrobialResultRows(viewingRecord.formData.resultItems);
                  const signatures = parseSignatureRecords(viewingRecord.formData.signatures);
                  return (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">微生物检验基础信息</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>品类</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.category || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>产品名称</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.reportName || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>取样器具</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.sampler || "-"}</div>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>取样区域</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm whitespace-pre-wrap">{viewingRecord.formData.sampleAreas || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>检验项目</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspectionItem || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>培养箱编号</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.cultureNo || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>检验人员</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspector || viewingRecord.testerName || "-"}</div>
                          </div>
                          <div className="space-y-2 md:col-span-3">
                            <Label>检验依据</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.standard || "-"}</div>
                          </div>
                          <div className="space-y-2 md:col-span-3">
                            <Label>标准及操作</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm whitespace-pre-wrap">{viewingRecord.formData.standardOperation || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>培养温度</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.incubationTemp || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>培养开始日期</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.incubationStart || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>培养结束日期</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.incubationEnd || "-"}</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">培养基及批号</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40">
                                  <TableHead className="w-[100px] text-center">启用</TableHead>
                                  <TableHead>培养基</TableHead>
                                  <TableHead>批号</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {cultureMediaRows.map((row) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="text-center">{row.enabled ? "是" : "否"}</TableCell>
                                    <TableCell className="font-medium">{row.mediumName || "-"}</TableCell>
                                    <TableCell>{row.batchNo || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">结果及结论</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40">
                                  <TableHead>取样区域</TableHead>
                                  <TableHead>结果</TableHead>
                                  <TableHead>结论</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {resultRows.map((row) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="font-medium">{row.sampleArea || "-"}</TableCell>
                                    <TableCell>{row.result || "-"}</TableCell>
                                    <TableCell>{row.conclusion === "pass" ? "符合" : "不符合"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">纸质报告与电子签名</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>纸质报告</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.paperReportName || "-"}</div>
                          </div>
                          <SignatureHistory signatures={signatures} />
                        </CardContent>
                      </Card>
                    </div>
                  );
                }
                if (viewingRecord.formId === "airborne-microbe") {
                  const cultureMediaRows = parseAirborneMediaRows(viewingRecord.formData.cultureMediaItems);
                  const measurementRows = parseAirborneMeasurementRows(viewingRecord.formData.measurementItems);
                  const signatures = parseSignatureRecords(viewingRecord.formData.signatures);
                  return (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">浮游菌基础信息</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>浮游菌取样仪编号</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.samplerNo || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>环境温度</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.envTemp || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>相对湿度</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.relativeHumidity || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>培养箱编号</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.cultureNo || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>培养温度</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.incubationTemp || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>检验人员</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspector || viewingRecord.testerName || "-"}</div>
                          </div>
                          <div className="space-y-2 md:col-span-3">
                            <Label>检验依据</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.standard || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>培养开始时间</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.incubationStart || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>培养结束时间</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.incubationEnd || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>检验日期</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspectionDate || "-"}</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">培养基及批号</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40">
                                  <TableHead className="w-[100px] text-center">启用</TableHead>
                                  <TableHead>培养基</TableHead>
                                  <TableHead>批号</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {cultureMediaRows.map((row) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="text-center">{row.enabled ? "是" : "否"}</TableCell>
                                    <TableCell className="font-medium">{row.mediumName || "-"}</TableCell>
                                    <TableCell>{row.batchNo || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">实测内容</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40">
                                  <TableHead className="w-[70px] text-center">序号</TableHead>
                                  <TableHead>区域划分</TableHead>
                                  <TableHead>洁净度级别</TableHead>
                                  <TableHead>洁净区名称</TableHead>
                                  <TableHead>平皿1</TableHead>
                                  <TableHead>平皿2</TableHead>
                                  <TableHead>平皿3</TableHead>
                                  <TableHead>平皿4</TableHead>
                                  <TableHead className="text-center">平均</TableHead>
                                  <TableHead>结果判定</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {measurementRows.map((row, index) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="text-center">{index + 1}</TableCell>
                                    <TableCell>{row.areaDivision || "-"}</TableCell>
                                    <TableCell>{row.cleanlinessLevel || "-"}</TableCell>
                                    <TableCell>{row.cleanRoomName || "-"}</TableCell>
                                    <TableCell>{row.plate1 || "-"}</TableCell>
                                    <TableCell>{row.plate2 || "-"}</TableCell>
                                    <TableCell>{row.plate3 || "-"}</TableCell>
                                    <TableCell>{row.plate4 || "-"}</TableCell>
                                    <TableCell className="text-center font-medium">{calculateAirborneAverage(row) || "-"}</TableCell>
                                    <TableCell>{row.conclusion === "pass" ? "合格" : "不合格"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">纸质报告与电子签名</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>纸质报告</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.paperReportName || "-"}</div>
                          </div>
                          <SignatureHistory signatures={signatures} />
                        </CardContent>
                      </Card>
                    </div>
                  );
                }
                if (viewingRecord.formId === "settling-bacteria") {
                  const cultureMediaRows = parseAirborneMediaRows(viewingRecord.formData.cultureMediaItems);
                  const measurementRows = parseAirborneMeasurementRows(viewingRecord.formData.measurementItems);
                  const signatures = parseSignatureRecords(viewingRecord.formData.signatures);
                  return (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">沉降菌基础信息</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>培养箱设备编号</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.cultureBoxNo || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>环境温度</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.envTemp || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>相对湿度</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.relativeHumidity || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>暴露时间</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.exposureTime || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>培养温度</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.incubationTemp || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>检验人员</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspector || viewingRecord.testerName || "-"}</div>
                          </div>
                          <div className="space-y-2 md:col-span-3">
                            <Label>检验依据</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.standard || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>检验日期</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspectionDate || "-"}</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">培养基及批号</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40">
                                  <TableHead className="w-[100px] text-center">启用</TableHead>
                                  <TableHead>培养基</TableHead>
                                  <TableHead>批号</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {cultureMediaRows.map((row) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="text-center">{row.enabled ? "是" : "否"}</TableCell>
                                    <TableCell className="font-medium">{row.mediumName || "-"}</TableCell>
                                    <TableCell>{row.batchNo || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">实测内容</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40">
                                  <TableHead className="w-[70px] text-center">序号</TableHead>
                                  <TableHead>区域划分</TableHead>
                                  <TableHead>洁净度级别</TableHead>
                                  <TableHead>洁净区名称</TableHead>
                                  <TableHead>平皿1</TableHead>
                                  <TableHead>平皿2</TableHead>
                                  <TableHead>平皿3</TableHead>
                                  <TableHead>平皿4</TableHead>
                                  <TableHead className="text-center">平均</TableHead>
                                  <TableHead>结果判定</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {measurementRows.map((row, index) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="text-center">{index + 1}</TableCell>
                                    <TableCell>{row.areaDivision || "-"}</TableCell>
                                    <TableCell>{row.cleanlinessLevel || "-"}</TableCell>
                                    <TableCell>{row.cleanRoomName || "-"}</TableCell>
                                    <TableCell>{row.plate1 || "-"}</TableCell>
                                    <TableCell>{row.plate2 || "-"}</TableCell>
                                    <TableCell>{row.plate3 || "-"}</TableCell>
                                    <TableCell>{row.plate4 || "-"}</TableCell>
                                    <TableCell className="text-center font-medium">{calculateAirborneAverage(row) || "-"}</TableCell>
                                    <TableCell>{row.conclusion === "pass" ? "合格" : "不合格"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">纸质报告与电子签名</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>纸质报告</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.paperReportName || "-"}</div>
                          </div>
                          <SignatureHistory signatures={signatures} />
                        </CardContent>
                      </Card>
                    </div>
                  );
                }
                if (viewingRecord.formId === "particle-monitor") {
                  const measurementRows = parseParticleMeasurementRows(viewingRecord.formData.measurementItems);
                  const signatures = parseSignatureRecords(viewingRecord.formData.signatures);
                  return (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">尘埃粒子基础信息</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>设备编号</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.equipmentNo || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>设备名称</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.equipmentName || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>实测结果数量</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.resultCount || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>检验类型</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspectionType === "dynamic" ? "动态" : "静态"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>检验日期</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspectionDate || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>检验员</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspector || viewingRecord.testerName || "-"}</div>
                          </div>
                          <div className="space-y-2 md:col-span-3">
                            <Label>检验依据</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.standard || "-"}</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">实测内容</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40">
                                  <TableHead className="w-[70px] text-center">序号</TableHead>
                                  <TableHead>区域划分</TableHead>
                                  <TableHead>洁净度级别</TableHead>
                                  <TableHead>洁净间名称</TableHead>
                                  <TableHead>粒子大小</TableHead>
                                  <TableHead>1</TableHead>
                                  <TableHead>2</TableHead>
                                  <TableHead>3</TableHead>
                                  <TableHead>4</TableHead>
                                  <TableHead>UCL</TableHead>
                                  <TableHead>结果判定</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {measurementRows.map((row, index) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="text-center">{index + 1}</TableCell>
                                    <TableCell>{row.areaDivision || "-"}</TableCell>
                                    <TableCell>{row.cleanlinessLevel || "-"}</TableCell>
                                    <TableCell>{row.cleanRoomName || "-"}</TableCell>
                                    <TableCell>{row.particleSize || "-"}</TableCell>
                                    <TableCell>{row.value1 || "-"}</TableCell>
                                    <TableCell>{row.value2 || "-"}</TableCell>
                                    <TableCell>{row.value3 || "-"}</TableCell>
                                    <TableCell>{row.value4 || "-"}</TableCell>
                                    <TableCell>{row.ucl || "-"}</TableCell>
                                    <TableCell>{row.conclusion === "pass" ? "合格" : "不合格"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">纸质报告与电子签名</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>纸质报告</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.paperReportName || "-"}</div>
                          </div>
                          <SignatureHistory signatures={signatures} />
                        </CardContent>
                      </Card>
                    </div>
                  );
                }
                if (viewingRecord.formId === "airflow-monitor") {
                  const measurementRows = parseAirflowMeasurementRows(viewingRecord.formData.measurementItems);
                  const signatures = parseSignatureRecords(viewingRecord.formData.signatures);
                  return (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">风量换气基础信息</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>设备编号</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.equipmentNo || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>检验日期</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspectionDate || "-"}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>检验员</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspector || viewingRecord.testerName || "-"}</div>
                          </div>
                          <div className="space-y-2 md:col-span-3">
                            <Label>检验依据</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.standard || "-"}</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">实测内容</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40">
                                  <TableHead className="w-[70px] text-center">序号</TableHead>
                                  <TableHead>区域划分</TableHead>
                                  <TableHead>洁净度级别</TableHead>
                                  <TableHead>名称</TableHead>
                                  <TableHead>面积/m²</TableHead>
                                  <TableHead>房高/m</TableHead>
                                  <TableHead>风口/个</TableHead>
                                  <TableHead>风量/m³</TableHead>
                                  <TableHead>次数</TableHead>
                                  <TableHead>结果判定</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {measurementRows.map((row, index) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="text-center">{index + 1}</TableCell>
                                    <TableCell>{row.areaDivision || "-"}</TableCell>
                                    <TableCell>{row.cleanlinessLevel || "-"}</TableCell>
                                    <TableCell>{row.cleanRoomName || "-"}</TableCell>
                                    <TableCell>{row.areaSize || "-"}</TableCell>
                                    <TableCell>{row.roomHeight || "-"}</TableCell>
                                    <TableCell>{row.outletCount || "-"}</TableCell>
                                    <TableCell>{row.airVolume || "-"}</TableCell>
                                    <TableCell>{row.airChanges || "-"}</TableCell>
                                    <TableCell>{row.conclusion === "pass" ? "合格" : "不合格"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">纸质报告与电子签名</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>纸质报告</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.paperReportName || "-"}</div>
                          </div>
                          <SignatureHistory signatures={signatures} />
                        </CardContent>
                      </Card>
                    </div>
                  );
                }
                if (viewingRecord.formId === "endotoxin-sop") {
                  const reagentRows = parseEndotoxinReagentRows(viewingRecord.formData.reagentItems);
                  const testRows = parseEndotoxinTestRows(viewingRecord.formData.testItems);
                  const signatures = parseSignatureRecords(viewingRecord.formData.signatures);
                  return (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">内毒素基础信息</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2"><Label>样品名称</Label><div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.sampleName || "-"}</div></div>
                          <div className="space-y-2"><Label>灭菌批号</Label><div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.sterilizationBatch || "-"}</div></div>
                          <div className="space-y-2"><Label>生产批号</Label><div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.productionBatch || "-"}</div></div>
                          <div className="space-y-2"><Label>样品型号</Label><div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.sampleModel || "-"}</div></div>
                          <div className="space-y-2"><Label>入库申请号</Label><div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.sourceWarehouseEntryNo || "-"}</div></div>
                          <div className="space-y-2 md:col-span-2"><Label>内毒素限制</Label><div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.endotoxinLimit || "-"}</div></div>
                          <div className="space-y-2 md:col-span-2"><Label>供试液制备</Label><div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.samplePreparation || "-"}</div></div>
                          <div className="space-y-2"><Label>检验日期</Label><div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspectionDate || "-"}</div></div>
                          <div className="space-y-2 md:col-span-2"><Label>检验依据</Label><div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.standard || "-"}</div></div>
                          <div className="space-y-2"><Label>检验员</Label><div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.inspector || viewingRecord.testerName || "-"}</div></div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">试剂信息</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40">
                                  <TableHead className="w-[70px] text-center">序号</TableHead>
                                  <TableHead>试剂名称</TableHead>
                                  <TableHead>生产单位</TableHead>
                                  <TableHead>批号</TableHead>
                                  <TableHead>灵敏度</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {reagentRows.map((row, index) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="text-center">{index + 1}</TableCell>
                                    <TableCell>{row.reagentName || "-"}</TableCell>
                                    <TableCell>{row.manufacturer || "-"}</TableCell>
                                    <TableCell>{row.batchNo || "-"}</TableCell>
                                    <TableCell>{row.sensitivity || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">测试内容</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/40">
                                  <TableHead className="w-[70px] text-center">序号</TableHead>
                                  <TableHead>内毒素浓度/配置内毒素的溶液</TableHead>
                                  <TableHead>结果1</TableHead>
                                  <TableHead>结果2</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {testRows.map((row, index) => (
                                  <TableRow key={row.id}>
                                    <TableCell className="text-center">{index + 1}</TableCell>
                                    <TableCell>{row.solutionName || "-"}</TableCell>
                                    <TableCell>{row.result1 || "-"}</TableCell>
                                    <TableCell>{row.result2 || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">纸质报告与电子签名</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>纸质报告</Label>
                            <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">{viewingRecord.formData.paperReportName || "-"}</div>
                          </div>
                          <SignatureHistory signatures={signatures} />
                        </CardContent>
                      </Card>
                    </div>
                  );
                }
                return (
                  <div className="space-y-4">
                    {recordForm.sections.map((section) => (
                      <Card key={section.id}>
                        <CardHeader>
                          <CardTitle className="text-base">{section.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4 md:grid-cols-2">
                            {section.fields.map((field) => (
                              <div key={field.id} className={`space-y-2 ${field.colSpan === 2 ? "md:col-span-2" : ""}`}>
                                <Label>{field.label}</Label>
                                <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm whitespace-pre-wrap">
                                  {viewingRecord.formData[field.id] || "-"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleEditRecord(viewingRecord);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  进入编辑
                </Button>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  关闭
                </Button>
              </DialogFooter>
            </>
          )}
        </DraggableDialogContent>
      </DraggableDialog>

      <EntityPickerDialog
        open={endotoxinSamplePickerOpen}
        onOpenChange={setEndotoxinSamplePickerOpen}
        title="选择样品"
        searchPlaceholder="搜索入库申请号、样品名称、规格型号、批号..."
        columns={[
          { key: "entryNo", title: "入库申请号", render: (row: any) => <span className="font-mono font-medium">{row.entryNo || "-"}</span> },
          { key: "productName", title: "样品名称", render: (row: any) => <span className="font-medium">{row.productName || "-"}</span> },
          { key: "specification", title: "规格型号", render: (row: any) => <span>{row.specification || "-"}</span> },
          { key: "batchNo", title: "生产批号", render: (row: any) => <span className="font-mono">{row.batchNo || "-"}</span> },
          { key: "sterilizationBatchNo", title: "灭菌批号", render: (row: any) => <span className="font-mono">{row.sterilizationBatchNo || "-"}</span> },
          { key: "quantity", title: "数量", render: (row: any) => <span>{row.quantity || "-"} {row.unit || ""}</span> },
        ]}
        rows={endotoxinSampleRows}
        selectedId={currentValues.sourceWarehouseEntryId || null}
        onSelect={handleSelectEndotoxinSample}
        filterFn={(row: any, query: string) => {
          const lower = query.toLowerCase();
          return [row.entryNo, row.productName, row.specification, row.batchNo, row.sterilizationBatchNo]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(lower));
        }}
        emptyText="生产入库申请中暂无可选样品"
      />
    </ERPLayout>
  );
}
