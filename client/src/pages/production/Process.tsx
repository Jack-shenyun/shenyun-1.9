import { useEffect, useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import { loadInitialMoldToolingRecords, type MoldToolingRecord } from "./MoldTooling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings2,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { trpc } from "@/lib/trpc";
import {
  getApplicableProductDisplayName,
  getProcessBindingNames,
  normalizeApplicableProduct,
  normalizeApplicableProductKey,
} from "@/lib/productionProcessMatching";
import { defaultEquipmentRecords, type Equipment } from "./Equipment";

export type ProcessType = "regular" | "critical" | "special";
export type ProcessItemValueType = "qualitative" | "quantitative";
export type ModuleKey =
  | "clearance"
  | "mold"
  | "materialUsage"
  | "tempHumidity"
  | "equipment"
  | "qcPoint"
  | "firstArticle";

export interface ProcessItem {
  id: string;
  itemName: string;
  requirement: string;
  unit?: string;
  valueType?: ProcessItemValueType;
}

export interface ClearanceCheckItem {
  id: string;
  itemName: string;
  requirement: string;
  confirmerId?: number | null;
  confirmerName?: string;
}

export interface ProcessModules {
  clearance: boolean;
  mold: boolean;
  materialUsage: boolean;
  tempHumidity: boolean;
  equipment: boolean;
  qcPoint: boolean;
  firstArticle: boolean;
}

export interface ClearanceModuleConfig {
  requireRemark: boolean;
  items: ClearanceCheckItem[];
}

export interface MoldModuleConfig {
  selectionMode: "single" | "multiple";
  moldOptions: string[];
}

export interface MaterialUsageModuleConfig {
  sourceMode: "production_order" | "bom";
  trackBatchNo: boolean;
}

export interface TempHumidityModuleConfig {
  temperatureRange: string;
  humidityRange: string;
  pressureRange: string;
  cleanlinessLevel: string;
}

export interface EquipmentModuleConfig {
  equipmentNames: string[];
  autoConfirmOnSubmit: boolean;
}

export interface ProcessModuleConfigs {
  clearance: ClearanceModuleConfig;
  mold: MoldModuleConfig;
  materialUsage: MaterialUsageModuleConfig;
  tempHumidity: TempHumidityModuleConfig;
  equipment: EquipmentModuleConfig;
}

export interface ProductionProcess {
  id: number;
  processCode: string;
  processName: string;
  processType: ProcessType;
  sortOrder: number;
  standardTime: number;
  workshop: string;
  team: string;
  operator: string;
  applicableProducts: string;
  boundProductNames?: string[];
  controlledDocNo: string;
  controlledDocName: string;
  controlledFile: string;
  version: string;
  modules: ProcessModules;
  moduleConfigs: ProcessModuleConfigs;
  inspectionItems: ProcessItem[];
  qcPoints: ProcessItem[];
  description?: string;
  status: "active" | "inactive";
  createdAt: string;
}

interface ProcessFormState {
  processCode: string;
  processName: string;
  processType: ProcessType;
  sortOrder: string;
  standardTime: string;
  workshop: string;
  team: string;
  operator: string;
  applicableProducts: string;
  controlledDocNo: string;
  controlledDocName: string;
  controlledFile: string;
  version: string;
  modules: ProcessModules;
  moduleConfigs: ProcessModuleConfigs;
  inspectionItems: ProcessItem[];
  qcPoints: ProcessItem[];
  description: string;
  status: "active" | "inactive";
}

interface ProductProcessGroup {
  productName: string;
  displayName: string;
  processes: ProductionProcess[];
  workshops: string[];
  moduleKeys: ModuleKey[];
  boundProductNames: string[];
  boundProductCount: number;
}

interface ProcessProductOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  count: number;
  aliasNames: string[];
}

interface ProcessBindingOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  count: number;
}

interface ProcessOperatorOption {
  id: number;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  status: string;
}

const PAGE_SIZE = 10;
const STORAGE_KEY = "production-process-templates-v3";
const TODAY = "2026-03-12";
const ALL_PRODUCTS_VALUE = "__all_products__";

const processTypeMap: Record<ProcessType, { label: string; className: string }> = {
  regular: { label: "常规", className: "bg-slate-100 text-slate-700" },
  critical: { label: "关键", className: "bg-amber-100 text-amber-700" },
  special: { label: "特殊", className: "bg-rose-100 text-rose-700" },
};

const moduleLabels: Record<ModuleKey, string> = {
  clearance: "清场",
  mold: "模具",
  materialUsage: "材料使用",
  tempHumidity: "温湿度",
  equipment: "设备",
  qcPoint: "质控点",
  firstArticle: "首件",
};

const moduleTypeLabels: Record<ModuleKey, "字段型" | "记录表" | "自动型"> = {
  clearance: "字段型",
  mold: "字段型",
  materialUsage: "字段型",
  tempHumidity: "字段型",
  equipment: "自动型",
  qcPoint: "记录表",
  firstArticle: "记录表",
};

const moduleDescriptions: Record<ModuleKey, string> = {
  clearance: "定性记录，只判定合格/不合格，可选是否要求备注。",
  mold: "字段型记录，定义模具选择方式和可选模具。",
  materialUsage: "字段型记录，定义按生产指令还是 BOM 带出物料。",
  tempHumidity: "字段型记录，定义温度、湿度、压差和洁净级别标准。",
  equipment: "自动型记录，只要生产即视为使用设备，可配置关联设备。",
  qcPoint: "记录表，定义质控点项目、标准和单位。",
  firstArticle: "记录表，定义首件检验项目、标准和单位。",
};

const inferProcessItemValueType = (
  itemName: string,
  requirement: string,
  unit = ""
): ProcessItemValueType => {
  const name = String(itemName || "");
  const text = `${name} ${String(requirement || "")}`;
  if (String(unit || "").trim()) return "quantitative";
  if (["外观", "确认", "标识", "位置", "语言", "内容核对", "数量无误", "无黑点"].some((keyword) => text.includes(keyword))) {
    return "qualitative";
  }
  if (["内径", "外径", "长度", "硬度", "温度", "压力", "时间", "次数", "速度", "孔距", "孔直径", "强度", "剥离"].some((keyword) => text.includes(keyword))) {
    return "quantitative";
  }
  if (/\d/.test(text)) return "quantitative";
  return "qualitative";
};

const createItem = (
  itemName: string,
  requirement: string,
  unit = "",
  valueType?: ProcessItemValueType
): ProcessItem => ({
  id: `${itemName}-${requirement}-${unit}-${Math.random().toString(36).slice(2, 8)}`,
  itemName,
  requirement,
  unit,
  valueType: valueType || inferProcessItemValueType(itemName, requirement, unit),
});

const createClearanceCheckItem = (
  itemName = "",
  requirement = "",
  confirmerId: number | null = null,
  confirmerName = ""
): ClearanceCheckItem => ({
  id: `clearance-${Math.random().toString(36).slice(2, 8)}`,
  itemName,
  requirement,
  confirmerId,
  confirmerName,
});

const createModules = (overrides: Partial<ProcessModules>): ProcessModules => ({
  clearance: false,
  mold: false,
  materialUsage: false,
  tempHumidity: false,
  equipment: false,
  qcPoint: false,
  firstArticle: false,
  ...overrides,
});

const createModuleConfigs = (
  overrides: Partial<ProcessModuleConfigs> = {}
): ProcessModuleConfigs => ({
  clearance: {
    requireRemark: true,
    ...(overrides.clearance || {}),
    items:
      (overrides.clearance?.items || []).length > 0
        ? (overrides.clearance?.items || []).map((item) => ({
            id: item.id || createClearanceCheckItem().id,
            itemName: String(item.itemName || ""),
            requirement: String(item.requirement || ""),
            confirmerId: item.confirmerId ?? null,
            confirmerName: String(item.confirmerName || ""),
          }))
        : [createClearanceCheckItem()],
  },
  mold: {
    selectionMode: "single",
    moldOptions: [],
    ...(overrides.mold || {}),
  },
  materialUsage: {
    sourceMode: "production_order",
    trackBatchNo: true,
    ...(overrides.materialUsage || {}),
  },
  tempHumidity: {
    temperatureRange: "18-26℃",
    humidityRange: "45-65%",
    pressureRange: "5-15Pa",
    cleanlinessLevel: "十万级",
    ...(overrides.tempHumidity || {}),
  },
  equipment: {
    equipmentNames: [],
    autoConfirmOnSubmit: true,
    ...(overrides.equipment || {}),
  },
});

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const joinLines = (items: string[]) => items.join("\n");

const defaultProcesses: ProductionProcess[] = [
  {
    id: 1,
    processCode: "01",
    processName: "粗洗",
    processType: "regular",
    sortOrder: 1,
    standardTime: 0,
    workshop: "粗洗间",
    team: "A组",
    operator: "许大志",
    applicableProducts: "胃管",
    controlledDocNo: "OM-WQNWG-01",
    controlledDocName: "胃管粗洗作业指导书",
    controlledFile: "OM-WQNWG-01.pdf",
    version: "V1.0",
    modules: createModules({
      clearance: true,
      mold: false,
      materialUsage: true,
      tempHumidity: true,
      equipment: true,
      qcPoint: true,
      firstArticle: true,
    }),
    moduleConfigs: createModuleConfigs({
      clearance: {
        requireRemark: true,
        items: [
          createClearanceCheckItem("设备、操作台面无积灰、油污", "设备、操作台面无积灰、油污", null, "许大志"),
          createClearanceCheckItem("地面、墙角无积水、积灰、异物", "地面、墙角无积水、积灰、异物", null, "许大志"),
          createClearanceCheckItem("使用的工具、容器无异物，无前次产品的遗留物", "使用的工具、容器无异物，无前次产品的遗留物", null, "许大志"),
          createClearanceCheckItem("工作间内无生产尾料及废弃物，无与生产无关的杂物", "工作间内无生产尾料及废弃物，无与生产无关的杂物", null, "许大志"),
          createClearanceCheckItem("工作间内无前批次产品操作文件", "工作间内无前批次产品操作文件", null, "许大志"),
        ],
      },
    }),
    inspectionItems: [
      createItem("外观", "无黑点", "-"),
    ],
    qcPoints: [
      createItem("清洗时间", "680-690", "℃"),
      createItem("清洗次数", "250", "℃"),
      createItem("加注水量", "完全浸没产品", "-"),
    ],
    description: "胃管粗洗工序，按粗洗间 A组执行，受控文件为胃管粗洗作业指导书。",
    status: "active",
    createdAt: "2025-12-29",
  },
  {
    id: 2,
    processCode: "02",
    processName: "精洗",
    processType: "critical",
    sortOrder: 2,
    standardTime: 0,
    workshop: "精洗间",
    team: "A组",
    operator: "许大志",
    applicableProducts: "胃管",
    controlledDocNo: "OM-WQNWG-02",
    controlledDocName: "胃管精洗作业指导书",
    controlledFile: "OM-WQNWG-02.pdf",
    version: "V1.0",
    modules: createModules({
      clearance: true,
      mold: false,
      materialUsage: true,
      tempHumidity: true,
      equipment: true,
      qcPoint: true,
      firstArticle: true,
    }),
    moduleConfigs: createModuleConfigs({
      clearance: {
        requireRemark: true,
        items: [
          createClearanceCheckItem("设备、操作台面无积灰、油污", "设备、操作台面无积灰、油污", null, "许大志"),
          createClearanceCheckItem("地面、墙角无积水、积灰、异物", "地面、墙角无积水、积灰、异物", null, "许大志"),
          createClearanceCheckItem("使用的工具、容器无异物，无前次产品的遗留物", "使用的工具、容器无异物，无前次产品的遗留物", null, "许大志"),
          createClearanceCheckItem("工作间内无生产尾料及废弃物，无与生产无关的杂物", "工作间内无生产尾料及废弃物，无与生产无关的杂物", null, "许大志"),
          createClearanceCheckItem("工作间内无前批次产品操作文件", "工作间内无前批次产品操作文件", null, "许大志"),
        ],
      },
    }),
    inspectionItems: [
      createItem("外观", "无黑点", "-"),
    ],
    qcPoints: [
      createItem("清洗时间", "680-690", "℃"),
      createItem("清洗次数", "250", "℃"),
      createItem("加注水量", "完全浸没产品", "-"),
      createItem("干燥温度", "50", "℃"),
      createItem("干燥时间", "40", "Min"),
    ],
    description: "胃管精洗工序，按精洗间 A组执行，受控文件为胃管精洗作业指导书。",
    status: "active",
    createdAt: "2025-12-29",
  },
  {
    id: 3,
    processCode: "03",
    processName: "混炼",
    processType: "critical",
    sortOrder: 3,
    standardTime: 0,
    workshop: "混炼车间",
    team: "A组",
    operator: "许大志",
    applicableProducts: "胃管",
    controlledDocNo: "OM-WQNWG-03",
    controlledDocName: "胃管混炼作业指导书",
    controlledFile: "OM-WQNWG-03.pdf",
    version: "V1.1",
    modules: createModules({
      clearance: true,
      mold: false,
      materialUsage: true,
      tempHumidity: true,
      equipment: true,
      qcPoint: true,
      firstArticle: false,
    }),
    moduleConfigs: createModuleConfigs({
      clearance: {
        requireRemark: true,
        items: [
          createClearanceCheckItem("设备、操作台面无积灰、油污", "设备、操作台面无积灰、油污", null, ""),
          createClearanceCheckItem("地面、墙角无积水、积灰、异物", "地面、墙角无积水、积灰、异物", null, ""),
          createClearanceCheckItem("使用的工具、容器无异物，无前次产品的遗留物", "使用的工具、容器无异物，无前次产品的遗留物", null, ""),
          createClearanceCheckItem("工作间内无生产尾料及废弃物，无与生产无关的杂物", "工作间内无生产尾料及废弃物，无与生产无关的杂物", null, ""),
          createClearanceCheckItem("工作间内无前批次产品操作文件", "工作间内无前批次产品操作文件", null, ""),
        ],
      },
    }),
    inspectionItems: [
      createItem("外观", "无黑点", "-"),
      createItem("内径", "按照图纸要求", "mm"),
      createItem("外径", "按照图纸要求", "mm"),
      createItem("长度", "按照图纸要求", "mm"),
      createItem("硬度", "按照图纸要求", "A"),
    ],
    qcPoints: [
      createItem("冰水温度", "19-25", "℃"),
      createItem("混炼次数", "10-12", "次"),
    ],
    description: "胃管混炼工序，按混炼车间 A组执行，受控文件为胃管混炼作业指导书。",
    status: "active",
    createdAt: "2025-12-29",
  },
  {
    id: 4,
    processCode: "04",
    processName: "挤出",
    processType: "critical",
    sortOrder: 4,
    standardTime: 0,
    workshop: "挤出车间",
    team: "A班",
    operator: "许大志",
    applicableProducts: "胃管",
    controlledDocNo: "OM-WQNWG-04",
    controlledDocName: "胃管挤出作业指导书",
    controlledFile: "OM-WQNWG-04.pdf",
    version: "V1.1",
    modules: createModules({
      clearance: true,
      mold: true,
      materialUsage: false,
      tempHumidity: true,
      equipment: true,
      qcPoint: true,
      firstArticle: true,
    }),
    moduleConfigs: createModuleConfigs({
      clearance: {
        requireRemark: true,
        items: [
          createClearanceCheckItem("设备、操作台面无积灰、油污", "设备、操作台面无积灰、油污", null, "许大志"),
          createClearanceCheckItem("地面、墙角无积水、积灰、异物", "地面、墙角无积水、积灰、异物", null, "许大志"),
          createClearanceCheckItem("使用的工具、容器无异物，无前次产品的遗留物", "使用的工具、容器无异物，无前次产品的遗留物", null, "许大志"),
          createClearanceCheckItem("工作间内无生产尾料及废弃物，无与生产无关的杂物", "工作间内无生产尾料及废弃物，无与生产无关的杂物", null, "许大志"),
          createClearanceCheckItem("工作间内无前批次产品操作文件", "工作间内无前批次产品操作文件", null, "许大志"),
        ],
      },
    }),
    inspectionItems: [
      createItem("外观", "无黑点", "-"),
      createItem("内径", "按照图纸要求", "mm"),
      createItem("外径", "按照图纸要求", "mm"),
      createItem("长度", "按照图纸要求", "mm"),
      createItem("硬度", "按照图纸要求", "A"),
    ],
    qcPoints: [
      createItem("前烘道温度", "680-690", "℃"),
      createItem("后烘道温度1", "250", "℃"),
      createItem("后烘道温度2", "250", "℃"),
      createItem("后烘道温度3", "250", "℃"),
      createItem("后烘道温度4", "250", "℃"),
      createItem("主机螺杆转速", "18", "r/min"),
      createItem("辅机螺杆转速", "12", "r/min"),
      createItem("牵引速度", "-", "r/min"),
      createItem("切割速度", "-", "r/min"),
      createItem("切割参数", "-", "mm"),
    ],
    description: "胃管挤出工序，按挤出车间 A班执行，受控文件为胃管挤出作业指导书。",
    status: "active",
    createdAt: "2025-12-29",
  },
  {
    id: 5,
    processCode: "05",
    processName: "打孔",
    processType: "critical",
    sortOrder: 5,
    standardTime: 0,
    workshop: "模压车间",
    team: "A班",
    operator: "许大志",
    applicableProducts: "胃管",
    controlledDocNo: "OM-WQNWG-05",
    controlledDocName: "胃管打孔作业指导书",
    controlledFile: "OM-WQNWG-05.pdf",
    version: "V1.0",
    modules: createModules({
      clearance: true,
      mold: true,
      materialUsage: false,
      tempHumidity: true,
      equipment: false,
      qcPoint: true,
      firstArticle: true,
    }),
    moduleConfigs: createModuleConfigs({
      clearance: {
        requireRemark: true,
        items: [
          createClearanceCheckItem("设备、操作台面无积灰、油污", "设备、操作台面无积灰、油污", null, "许大志"),
          createClearanceCheckItem("地面、墙角无积水、积灰、异物", "地面、墙角无积水、积灰、异物", null, "许大志"),
          createClearanceCheckItem("使用的工具、容器无异物，无前次产品的遗留物", "使用的工具、容器无异物，无前次产品的遗留物", null, "许大志"),
          createClearanceCheckItem("工作间内无生产尾料及废弃物，无与生产无关的杂物", "工作间内无生产尾料及废弃物，无与生产无关的杂物", null, "许大志"),
          createClearanceCheckItem("工作间内无前批次产品操作文件", "工作间内无前批次产品操作文件", null, "许大志"),
        ],
      },
    }),
    inspectionItems: [
      createItem("外观", "无黑点", "-"),
      createItem("孔距", "按照图纸要求", "mm"),
      createItem("孔直径", "按照图纸要求", "mm"),
    ],
    qcPoints: [
      createItem("压力", "0.4-0.6", "Mpa"),
    ],
    description: "胃管打孔工序，按模压车间 A班执行，受控文件为胃管打孔作业指导书。",
    status: "active",
    createdAt: "2025-12-29",
  },
  {
    id: 6,
    processCode: "06",
    processName: "印刷",
    processType: "regular",
    sortOrder: 6,
    standardTime: 0,
    workshop: "印刷车间",
    team: "A班",
    operator: "许大志",
    applicableProducts: "胃管",
    controlledDocNo: "OM-WQNWG-06",
    controlledDocName: "胃管印刷作业指导书",
    controlledFile: "OM-WQNWG-06.pdf",
    version: "V1.0",
    modules: createModules({
      clearance: true,
      mold: true,
      materialUsage: true,
      tempHumidity: true,
      equipment: true,
      qcPoint: true,
      firstArticle: true,
    }),
    moduleConfigs: createModuleConfigs({
      clearance: {
        requireRemark: true,
        items: [
          createClearanceCheckItem("设备、操作台面无积灰、油污", "设备、操作台面无积灰、油污", null, "许大志"),
          createClearanceCheckItem("地面、墙角无积水、积灰、异物", "地面、墙角无积水、积灰、异物", null, "许大志"),
          createClearanceCheckItem("使用的工具、容器无异物，无前次产品的遗留物", "使用的工具、容器无异物，无前次产品的遗留物", null, "许大志"),
          createClearanceCheckItem("工作间内无生产尾料及废弃物，无与生产无关的杂物", "工作间内无生产尾料及废弃物，无与生产无关的杂物", null, "许大志"),
          createClearanceCheckItem("工作间内无前批次产品操作文件", "工作间内无前批次产品操作文件", null, "许大志"),
        ],
      },
    }),
    inspectionItems: [
      createItem("外观", "无黑点", "-"),
      createItem("标识清楚", "按照图纸要求", "-"),
      createItem("位置正确", "按照图纸要求", "-"),
    ],
    qcPoints: [
      createItem("压力", "0.4-0.6", "Mpa"),
      createItem("烘烤温度", "180-200", "℃"),
      createItem("烘烤时间", "50-55", "Min"),
    ],
    description: "胃管印刷工序，按印刷车间 A班执行，受控文件为胃管印刷作业指导书。",
    status: "active",
    createdAt: "2025-12-29",
  },
  {
    id: 7,
    processCode: "07",
    processName: "粘接",
    processType: "regular",
    sortOrder: 7,
    standardTime: 0,
    workshop: "组装车间",
    team: "A班",
    operator: "许大志",
    applicableProducts: "胃管",
    controlledDocNo: "OM-WQNWG-07",
    controlledDocName: "胃管粘接作业指导书",
    controlledFile: "OM-WQNWG-07.pdf",
    version: "V1.0",
    modules: createModules({
      clearance: true,
      mold: true,
      materialUsage: true,
      tempHumidity: true,
      equipment: true,
      qcPoint: true,
      firstArticle: true,
    }),
    moduleConfigs: createModuleConfigs({
      clearance: {
        requireRemark: true,
        items: [
          createClearanceCheckItem("设备、操作台面无积灰、油污", "设备、操作台面无积灰、油污", null, "许大志"),
          createClearanceCheckItem("地面、墙角无积水、积灰、异物", "地面、墙角无积水、积灰、异物", null, "许大志"),
          createClearanceCheckItem("使用的工具、容器无异物，无前次产品的遗留物", "使用的工具、容器无异物，无前次产品的遗留物", null, "许大志"),
          createClearanceCheckItem("工作间内无生产尾料及废弃物，无与生产无关的杂物", "工作间内无生产尾料及废弃物，无与生产无关的杂物", null, "许大志"),
          createClearanceCheckItem("工作间内无前批次产品操作文件", "工作间内无前批次产品操作文件", null, "许大志"),
        ],
      },
    }),
    inspectionItems: [
      createItem("外观", "无黑点", "-"),
      createItem("连接强度", "按照图纸要求", "Mpa"),
    ],
    qcPoints: [
      createItem("出胶时间", "10", "S"),
      createItem("凝固时间", "24", "H"),
    ],
    description: "胃管粘接工序，按组装车间 A班执行，受控文件为胃管粘接作业指导书。",
    status: "active",
    createdAt: "2025-12-29",
  },
  {
    id: 8,
    processCode: "08",
    processName: "组装",
    processType: "regular",
    sortOrder: 8,
    standardTime: 0,
    workshop: "组装车间",
    team: "A班",
    operator: "许大志",
    applicableProducts: "胃管",
    controlledDocNo: "OM-WQNWG-08",
    controlledDocName: "胃管组装作业指导书",
    controlledFile: "OM-WQNWG-08.pdf",
    version: "V1.0",
    modules: createModules({
      clearance: true,
      mold: false,
      materialUsage: true,
      tempHumidity: true,
      equipment: true,
      qcPoint: true,
      firstArticle: true,
    }),
    moduleConfigs: createModuleConfigs({
      clearance: {
        requireRemark: true,
        items: [
          createClearanceCheckItem("设备、操作台面无积灰、油污", "设备、操作台面无积灰、油污", null, "许大志"),
          createClearanceCheckItem("地面、墙角无积水、积灰、异物", "地面、墙角无积水、积灰、异物", null, "许大志"),
          createClearanceCheckItem("使用的工具、容器无异物，无前次产品的遗留物", "使用的工具、容器无异物，无前次产品的遗留物", null, "许大志"),
          createClearanceCheckItem("工作间内无生产尾料及废弃物，无与生产无关的杂物", "工作间内无生产尾料及废弃物，无与生产无关的杂物", null, "许大志"),
          createClearanceCheckItem("工作间内无前批次产品操作文件", "工作间内无前批次产品操作文件", null, "许大志"),
        ],
      },
    }),
    inspectionItems: [
      createItem("外观", "无黑点", "-"),
      createItem("连接强度", "按照图纸要求", "Mpa"),
    ],
    qcPoints: [
      createItem("温度", "250", "℃"),
      createItem("速度", "2", "挡"),
    ],
    description: "胃管组装工序，按组装车间 A班执行，受控文件为胃管组装作业指导书。",
    status: "active",
    createdAt: "2025-12-29",
  },
];

const createEmptyItem = (field: "inspectionItems" | "qcPoints" = "qcPoints") =>
  createItem("", "", "", field === "inspectionItems" ? "qualitative" : "quantitative");

const createEmptyForm = (processes: ProductionProcess[]): ProcessFormState => ({
  processCode: `WG-${String(processes.length + 1).padStart(2, "0")}`,
  processName: "",
  processType: "regular",
  sortOrder: String(Math.max(...processes.map((p) => p.sortOrder), 0) + 1),
  standardTime: "",
  workshop: "",
  team: "A班",
  operator: "",
  applicableProducts: "胃管（WG-38FR）",
  controlledDocNo: "",
  controlledDocName: "",
  controlledFile: "",
  version: "V1.0",
  modules: createModules({}),
  moduleConfigs: createModuleConfigs({}),
  inspectionItems: [createEmptyItem("inspectionItems")],
  qcPoints: [createEmptyItem("qcPoints")],
  description: "",
  status: "active",
});

const normalizeProcess = (process: ProductionProcess): ProductionProcess => ({
  ...process,
  boundProductNames: Array.from(
    new Set((process.boundProductNames || []).map((item) => getApplicableProductDisplayName(item || "")).filter(Boolean))
  ),
  modules: createModules(process.modules || {}),
  moduleConfigs: createModuleConfigs(process.moduleConfigs || {}),
  inspectionItems: (process.inspectionItems || []).map((item) => ({
    ...item,
    id: item.id || createEmptyItem("inspectionItems").id,
    valueType: item.valueType || inferProcessItemValueType(item.itemName, item.requirement, item.unit || ""),
  })),
  qcPoints: (process.qcPoints || []).map((item) => ({
    ...item,
    id: item.id || createEmptyItem("qcPoints").id,
    valueType: item.valueType || "quantitative",
  })),
});

const loadInitialProcesses = (): ProductionProcess[] => {
  if (typeof window === "undefined") return defaultProcesses;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProcesses;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultProcesses;
    return parsed.map(normalizeProcess);
  } catch {
    return defaultProcesses;
  }
};

export const loadProductionProcessTemplates = (): ProductionProcess[] => loadInitialProcesses();

const moduleBadges = (modules: ProcessModules) =>
  (Object.keys(moduleLabels) as ModuleKey[]).filter((key) => modules[key]);

const needsQualityCheck = (process: ProductionProcess) =>
  process.modules.qcPoint || process.modules.firstArticle || process.processType !== "regular";

const sortProcesses = (items: ProductionProcess[]) =>
  [...items].sort((a, b) => {
    const productCompare = normalizeApplicableProduct(a.applicableProducts).localeCompare(
      normalizeApplicableProduct(b.applicableProducts),
      "zh-CN"
    );
    if (productCompare !== 0) return productCompare;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.processCode.localeCompare(b.processCode, "zh-CN");
  });

export default function ProductionProcessPage() {
  const trpcClient = trpc as any;
  const { data: productsData = [] } = trpc.products.list.useQuery({ limit: 5000 });
  const { data: departmentsData = [] } = trpc.departments.list.useQuery({ status: "active" });
  const { data: personnelData = [] } = trpcClient.personnel.list.useQuery();
  const { data: equipmentData = [] } = trpc.equipment.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [productFilter, setProductFilter] = useState(ALL_PRODUCTS_VALUE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [bindingPickerOpen, setBindingPickerOpen] = useState(false);
  const [operatorPickerOpen, setOperatorPickerOpen] = useState(false);
  const [clearanceConfirmerPickerOpen, setClearanceConfirmerPickerOpen] = useState(false);
  const [moldPickerOpen, setMoldPickerOpen] = useState(false);
  const [equipmentPickerOpen, setEquipmentPickerOpen] = useState(false);
  const [bindingDraftIds, setBindingDraftIds] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ProductionProcess | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [processes, setProcesses] = useState<ProductionProcess[]>(loadInitialProcesses);
  const [formData, setFormData] = useState<ProcessFormState>(() => createEmptyForm(defaultProcesses));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(processes));
  }, [processes]);

  const isProductionProcessProduct = (product: any) => {
    const category = String(product?.productCategory || "");
    const procurePermission = String(product?.procurePermission || "");
    return ["finished", "semi_finished"].includes(category) && procurePermission === "production_only";
  };

  const processBindingOverrideMap = useMemo(() => {
    const overrides = new Map<string, Set<string>>();
    processes.forEach((process) => {
      const normalizedKey = normalizeApplicableProductKey(process.applicableProducts);
      const explicitNames = (process.boundProductNames || [])
        .map((item) => getApplicableProductDisplayName(item || ""))
        .filter(Boolean);
      if (!normalizedKey || explicitNames.length === 0) return;
      const current = overrides.get(normalizedKey) || new Set<string>();
      explicitNames.forEach((name) => current.add(name));
      overrides.set(normalizedKey, current);
    });
    return overrides;
  }, [processes]);

  const productBindingMap = useMemo(() => {
    const grouped = new Map<string, Set<string>>();

    ((productsData as any[]) || [])
      .filter(isProductionProcessProduct)
      .forEach((product: any) => {
        const normalizedKey = normalizeApplicableProductKey(product?.name || "");
        const displayName =
          getApplicableProductDisplayName(product?.name || "") ||
          normalizeApplicableProduct(product?.name || "");
        if (!normalizedKey || !displayName) return;
        const current = grouped.get(normalizedKey) || new Set<string>();
        current.add(displayName);
        grouped.set(normalizedKey, current);
      });

    processes.forEach((process) => {
      const normalizedKey = normalizeApplicableProductKey(process.applicableProducts);
      const displayName =
        getApplicableProductDisplayName(process.applicableProducts) ||
        normalizeApplicableProduct(process.applicableProducts);
      if (!normalizedKey || !displayName) return;
      const current = grouped.get(normalizedKey) || new Set<string>();
      current.add(displayName);
      grouped.set(normalizedKey, current);
    });

    return new Map(
      Array.from(grouped.entries()).map(([key, values]) => {
        const override = processBindingOverrideMap.get(key);
        const finalValues = override && override.size > 0 ? Array.from(override) : Array.from(values);
        return [key, finalValues.sort((a, b) => a.localeCompare(b, "zh-CN"))];
      })
    );
  }, [processBindingOverrideMap, processes, productsData]);

  const bindingRows = useMemo<ProcessBindingOption[]>(
    () => {
      const grouped = new Map<string, ProcessBindingOption>();
      ((productsData as any[]) || []).forEach((product: any) => {
        if (!isProductionProcessProduct(product)) return;
        const displayName = getApplicableProductDisplayName(product?.name || "");
        if (!displayName) return;
        const existing = grouped.get(displayName);
        if (existing) {
          existing.count += 1;
          if (!existing.unit && product?.unit) existing.unit = String(product.unit);
          if (!existing.code && product?.code) existing.code = String(product.code);
          return;
        }
        grouped.set(displayName, {
          id: displayName,
          code: String(product?.code || ""),
          name: displayName,
          unit: String(product?.unit || ""),
          count: 1,
        });
      });
      return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    },
    [productsData]
  );

  const productOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...(productsData as any[]).map((product: any) => normalizeApplicableProduct(product?.name || "")),
            ...processes.map((process) => normalizeApplicableProduct(process.applicableProducts)),
          ].filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [processes, productsData]
  );
  const productFilterOptions = useMemo(
    () =>
      productOptions.map((value) => {
        const boundNames = productBindingMap.get(normalizeApplicableProductKey(value)) || [];
        return {
          value,
          label: boundNames.includes(value) ? value : boundNames[0] || value,
        };
      }),
    [productBindingMap, productOptions]
  );
  const productRows = useMemo<ProcessProductOption[]>(
    () => {
      const grouped = new Map<string, ProcessProductOption>();
      ((productsData as any[]) || []).forEach((product: any) => {
        if (!isProductionProcessProduct(product)) return;
        const name = normalizeApplicableProduct(product?.name || "");
        if (!name) return;
        const existing = grouped.get(name);
        if (existing) {
          existing.count += 1;
          if (!existing.unit && product?.unit) existing.unit = String(product.unit);
          if (!existing.code && product?.code) existing.code = String(product.code);
          return;
        }
        grouped.set(name, {
          id: name,
          code: String(product?.code || ""),
          name,
          unit: String(product?.unit || ""),
          count: 1,
          aliasNames: [],
        });
      });
      return Array.from(grouped.values())
        .map((row) => ({
          ...row,
          aliasNames: productBindingMap.get(normalizeApplicableProductKey(row.name)) || [row.name],
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    },
    [productBindingMap, productsData]
  );
  const selectedApplicableProduct = useMemo(
    () =>
      productRows.find(
        (product) =>
          normalizeApplicableProduct(product.name) ===
          normalizeApplicableProduct(formData.applicableProducts)
      ) || null,
    [formData.applicableProducts, productRows]
  );
  const workshopOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...(departmentsData as any[])
              .map((department: any) => String(department?.name || "").trim())
              .filter((name) => name && (name.includes("车间") || name.endsWith("间"))),
            ...processes.map((process) => process.workshop.trim()).filter(Boolean),
            formData.workshop.trim(),
          ].filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [departmentsData, processes, formData.workshop]
  );
  const operatorRows = useMemo<ProcessOperatorOption[]>(
    () =>
      ((personnelData as any[]) || [])
        .map((person: any) => ({
          id: Number(person?.id || 0),
          employeeNo: String(person?.employeeNo || ""),
          name: String(person?.name || ""),
          department: String(person?.department || ""),
          position: String(person?.position || ""),
          status: String(person?.status || ""),
        }))
        .filter((person) => person.id > 0 && person.name)
        .sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
    [personnelData]
  );
  const selectedOperator = useMemo(
    () => operatorRows.find((person) => person.name === formData.operator) || null,
    [formData.operator, operatorRows]
  );
  const selectedClearanceConfirmer = useMemo(() => {
    const firstMatchedRow = formData.moduleConfigs.clearance.items.find(
      (item) => item.confirmerId || item.confirmerName
    );
    if (!firstMatchedRow) return null;
    return (
      operatorRows.find((person) => Number(person.id) === Number(firstMatchedRow.confirmerId)) ||
      operatorRows.find((person) => person.name === firstMatchedRow.confirmerName) ||
      null
    );
  }, [formData.moduleConfigs.clearance.items, operatorRows]);
  const equipmentRows = useMemo<Equipment[]>(
    () =>
      (((equipmentData as any[]) || []).length > 0
        ? (equipmentData as unknown as Equipment[])
        : defaultEquipmentRecords
      ).filter((item) => item.status !== "scrapped"),
    [equipmentData]
  );
  const moldToolingRows = useMemo<MoldToolingRecord[]>(
    () => loadInitialMoldToolingRecords().filter((item) => item.status !== "scrapped"),
    []
  );

  const getNextSortOrder = (productName: string, excludingId?: number) =>
    Math.max(
      0,
      ...processes
        .filter(
          (process) =>
            normalizeApplicableProduct(process.applicableProducts) === normalizeApplicableProduct(productName) &&
            process.id !== excludingId
        )
        .map((process) => Number(process.sortOrder) || 0)
    ) + 1;

  const productGroups = useMemo<ProductProcessGroup[]>(
    () => {
      const grouped = new Map<string, ProductionProcess[]>();
      sortProcesses(processes).forEach((process) => {
        const productName = normalizeApplicableProduct(process.applicableProducts) || "未设置产品";
        const list = grouped.get(productName) || [];
        list.push(process);
        grouped.set(productName, list);
      });
      return Array.from(grouped.entries())
        .map(([productName, rows]) => {
          const sortedRows = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
          const boundProductNames =
            productBindingMap.get(normalizeApplicableProductKey(productName)) || [productName];
          const displayName = boundProductNames.includes(productName)
            ? productName
            : boundProductNames[0] || productName;
          return {
            productName,
            displayName,
            processes: sortedRows,
            workshops: Array.from(
              new Set(sortedRows.map((item) => item.workshop.trim()).filter(Boolean))
            ),
            moduleKeys: Array.from(
              new Set(sortedRows.flatMap((item) => moduleBadges(item.modules)))
            ) as ModuleKey[],
            boundProductNames,
            boundProductCount: boundProductNames.length,
          };
        })
        .sort((a, b) => a.productName.localeCompare(b.productName, "zh-CN"));
    },
    [processes, productBindingMap]
  );

  const filtered = useMemo(
    () =>
      productGroups.filter((group) => {
        const keyword = searchTerm.trim().toLowerCase();
        const matchesProduct =
          productFilter === ALL_PRODUCTS_VALUE || group.productName === productFilter;
        const matchesKeyword =
          !keyword ||
          group.productName.toLowerCase().includes(keyword) ||
          group.boundProductNames.some((name) => name.toLowerCase().includes(keyword)) ||
          group.processes.some((process) =>
            [
              process.processCode,
              process.processName,
              process.workshop,
              process.team,
              process.controlledDocNo,
              process.controlledDocName,
            ]
              .filter(Boolean)
              .some((field) => field.toLowerCase().includes(keyword))
          );
        return matchesProduct && matchesKeyword;
      }),
    [productGroups, searchTerm, productFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedGroups = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const productCount = productGroups.reduce((sum, group) => sum + group.boundProductCount, 0);
  const templateGroupCount = productGroups.length;
  const processCount = processes.length;
  const keyOrSpecialCount = processes.filter((process) => process.processType !== "regular").length;
  const qualityCount = processes.filter(needsQualityCheck).length;
  const selectedProductName = selectedRecord
    ? normalizeApplicableProduct(selectedRecord.applicableProducts)
    : "";
  const selectedGroupDisplayName = useMemo(() => {
    if (!selectedProductName) return "";
    const boundNames = productBindingMap.get(normalizeApplicableProductKey(selectedProductName)) || [];
    return boundNames.includes(selectedProductName) ? selectedProductName : boundNames[0] || selectedProductName;
  }, [productBindingMap, selectedProductName]);
  const selectedProductProcesses = useMemo(
    () =>
      selectedProductName
        ? sortProcesses(processes).filter(
            (process) => normalizeApplicableProduct(process.applicableProducts) === selectedProductName
          )
        : [],
    [processes, selectedProductName]
  );
  const selectedGroupModules = useMemo(
    () =>
      Array.from(
        new Set(selectedProductProcesses.flatMap((process) => moduleBadges(process.modules)))
      ) as ModuleKey[],
    [selectedProductProcesses]
  );
  const selectedGroupWorkshops = useMemo(
    () => Array.from(new Set(selectedProductProcesses.map((process) => process.workshop.trim()).filter(Boolean))),
    [selectedProductProcesses]
  );
  const selectedGroupBoundProductNames = useMemo(
    () => productBindingMap.get(normalizeApplicableProductKey(selectedProductName)) || [],
    [productBindingMap, selectedProductName]
  );
  const selectedGroupActiveCount = selectedProductProcesses.filter(
    (process) => process.status === "active"
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, productFilter, filtered.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedRecord(null);
    const baseForm = createEmptyForm(processes);
    const nextProductName =
      productFilter !== ALL_PRODUCTS_VALUE
        ? productFilter
        : productOptions[0] || normalizeApplicableProduct(baseForm.applicableProducts);
    setFormData({
      ...baseForm,
      applicableProducts: nextProductName,
      sortOrder: String(getNextSortOrder(nextProductName)),
    });
    setDialogOpen(true);
  };

  const handleEdit = (record: ProductionProcess) => {
    setIsEditing(true);
    setSelectedRecord(record);
    setFormData({
      processCode: record.processCode,
      processName: record.processName,
      processType: record.processType,
      sortOrder: String(record.sortOrder),
      standardTime: record.standardTime ? String(record.standardTime) : "",
      workshop: record.workshop,
      team: record.team,
      operator: record.operator,
      applicableProducts: normalizeApplicableProduct(record.applicableProducts),
      controlledDocNo: record.controlledDocNo,
      controlledDocName: record.controlledDocName,
      controlledFile: record.controlledFile,
      version: record.version,
      modules: { ...record.modules },
      moduleConfigs: createModuleConfigs(record.moduleConfigs || {}),
      inspectionItems: record.inspectionItems.map((item) => ({ ...item })),
      qcPoints: record.qcPoints.map((item) => ({ ...item })),
      description: record.description || "",
      status: record.status,
    });
    setDialogOpen(true);
  };

  const toggleBindingDraftId = (id: string) => {
    setBindingDraftIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenBindingPicker = () => {
    const currentNames =
      selectedGroupBoundProductNames.length > 0
        ? selectedGroupBoundProductNames
        : selectedRecord
          ? getProcessBindingNames(selectedRecord)
          : [];
    setBindingDraftIds(currentNames);
    setBindingPickerOpen(true);
  };

  const handleConfirmBindings = () => {
    if (!selectedRecord) return;
    const selectedNames = bindingRows
      .filter((row) => bindingDraftIds.includes(row.id))
      .map((row) => row.name);
    if (!selectedNames.length) {
      toast.error("请至少选择一个绑定产品");
      return;
    }

    const targetKey = normalizeApplicableProductKey(selectedRecord.applicableProducts);
    const primaryName = selectedNames[0];
    setProcesses((prev) =>
      sortProcesses(
        prev.map((process) =>
          normalizeApplicableProductKey(process.applicableProducts) === targetKey
            ? normalizeProcess({
                ...process,
                applicableProducts: primaryName,
                boundProductNames: selectedNames,
              })
            : process
        )
      )
    );
    setSelectedRecord((prev) =>
      prev
        ? normalizeProcess({
            ...prev,
            applicableProducts: primaryName,
            boundProductNames: selectedNames,
          })
        : prev
    );
    setBindingPickerOpen(false);
    toast.success("绑定产品已更新");
  };

  const handleAddProcessToCurrentGroup = () => {
    const baseForm = createEmptyForm(processes);
    const applicableProducts = selectedGroupDisplayName || selectedProductName || normalizeApplicableProduct(baseForm.applicableProducts);
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData({
      ...baseForm,
      applicableProducts,
      sortOrder: String(getNextSortOrder(applicableProducts)),
    });
    setViewDialogOpen(false);
    setDialogOpen(true);
  };

  const updateModule = (key: ModuleKey, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [key]: checked,
      },
    }));
  };

  const updateModuleConfig = (key: keyof ProcessModuleConfigs, patch: Record<string, unknown>) => {
    setFormData((prev) => ({
      ...prev,
      moduleConfigs: {
        ...prev.moduleConfigs,
        [key]: {
          ...prev.moduleConfigs[key],
          ...patch,
        },
      } as ProcessModuleConfigs,
    }));
  };

  const addEquipmentName = (name: string) => {
    if (!name.trim()) return;
    setFormData((prev) => ({
      ...prev,
      moduleConfigs: {
        ...prev.moduleConfigs,
        equipment: {
          ...prev.moduleConfigs.equipment,
          equipmentNames: Array.from(
            new Set([...prev.moduleConfigs.equipment.equipmentNames, name.trim()])
          ),
        },
      },
    }));
  };

  const removeEquipmentName = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      moduleConfigs: {
        ...prev.moduleConfigs,
        equipment: {
          ...prev.moduleConfigs.equipment,
          equipmentNames: prev.moduleConfigs.equipment.equipmentNames.filter(
            (item) => item !== name
          ),
        },
      },
    }));
  };

  const updateItemRow = (
    field: "inspectionItems" | "qcPoints",
    id: string,
    key: keyof ProcessItem,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
  };

  const addItemRow = (field: "inspectionItems" | "qcPoints") => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], createEmptyItem(field)],
    }));
  };

  const removeItemRow = (field: "inspectionItems" | "qcPoints", id: string) => {
    setFormData((prev) => {
      const rows = prev[field].filter((item) => item.id !== id);
      return {
        ...prev,
        [field]: rows.length > 0 ? rows : [createEmptyItem(field)],
      };
    });
  };

  const updateClearanceItemRow = (
    id: string,
    key: keyof ClearanceCheckItem,
    value: string | number | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      moduleConfigs: {
        ...prev.moduleConfigs,
        clearance: {
          ...prev.moduleConfigs.clearance,
          items: prev.moduleConfigs.clearance.items.map((item) =>
            item.id === id ? { ...item, [key]: value } : item
          ),
        },
      },
    }));
  };

  const addClearanceItemRow = () => {
    const currentConfirmer = formData.moduleConfigs.clearance.items.find(
      (item) => item.confirmerId || item.confirmerName
    );
    setFormData((prev) => ({
      ...prev,
      moduleConfigs: {
        ...prev.moduleConfigs,
        clearance: {
          ...prev.moduleConfigs.clearance,
          items: [
            ...prev.moduleConfigs.clearance.items,
            createClearanceCheckItem(
              "",
              "",
              currentConfirmer?.confirmerId ?? null,
              currentConfirmer?.confirmerName || ""
            ),
          ],
        },
      },
    }));
  };

  const removeClearanceItemRow = (id: string) => {
    setFormData((prev) => {
      const rows = prev.moduleConfigs.clearance.items.filter((item) => item.id !== id);
      return {
        ...prev,
        moduleConfigs: {
          ...prev.moduleConfigs,
          clearance: {
            ...prev.moduleConfigs.clearance,
            items: rows.length > 0 ? rows : [createClearanceCheckItem()],
          },
        },
      };
    });
  };

  const applyClearanceConfirmerToAllRows = (person: ProcessOperatorOption) => {
    setFormData((prev) => ({
      ...prev,
      moduleConfigs: {
        ...prev.moduleConfigs,
        clearance: {
          ...prev.moduleConfigs.clearance,
          items: prev.moduleConfigs.clearance.items.map((item) => ({
            ...item,
            confirmerId: person.id,
            confirmerName: person.name,
          })),
        },
      },
    }));
  };

  const handleSubmit = () => {
    if (
      !normalizeApplicableProduct(formData.applicableProducts) ||
      !formData.processCode ||
      !formData.processName ||
      !formData.workshop
    ) {
      toast.error("请先补全适用产品、工序编号、工序名称和所属车间");
      return;
    }
    const normalizedProductName = normalizeApplicableProduct(formData.applicableProducts);
    const normalizedModuleConfigs = createModuleConfigs({
      ...formData.moduleConfigs,
      clearance: {
        ...formData.moduleConfigs.clearance,
        items: formData.moduleConfigs.clearance.items.filter(
          (item) =>
            item.itemName.trim() ||
            item.requirement.trim() ||
            item.confirmerName?.trim() ||
            item.confirmerId
        ),
      },
    });
    const normalized: ProductionProcess = normalizeProcess({
      id: selectedRecord?.id || Date.now(),
      processCode: formData.processCode.trim(),
      processName: formData.processName.trim(),
      processType: formData.processType,
      sortOrder:
        Number(formData.sortOrder) ||
        getNextSortOrder(normalizedProductName, selectedRecord?.id),
      standardTime: Number(formData.standardTime) || 0,
      workshop: formData.workshop.trim(),
      team: formData.team.trim(),
      operator: formData.operator.trim(),
      applicableProducts: normalizedProductName,
      boundProductNames:
        productBindingMap.get(normalizeApplicableProductKey(normalizedProductName)) || [],
      controlledDocNo: formData.controlledDocNo.trim(),
      controlledDocName: formData.controlledDocName.trim(),
      controlledFile: formData.controlledFile.trim(),
      version: formData.version.trim(),
      modules: formData.modules,
      moduleConfigs: normalizedModuleConfigs,
      inspectionItems: formData.inspectionItems.filter(
        (item) => item.itemName.trim() || item.requirement.trim() || item.unit?.trim()
      ),
      qcPoints: formData.qcPoints.filter(
        (item) => item.itemName.trim() || item.requirement.trim() || item.unit?.trim()
      ),
      description: formData.description.trim(),
      status: formData.status,
      createdAt: selectedRecord?.createdAt || TODAY,
    });

    if (isEditing && selectedRecord) {
      setProcesses((prev) =>
        sortProcesses(prev.map((process) => (process.id === selectedRecord.id ? normalized : process)))
      );
      toast.success("工序模板已更新");
    } else {
      setProcesses((prev) => sortProcesses([...prev, normalized]));
      toast.success("工序模板已新增");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    const deletingRecord = processes.find((process) => process.id === id) || null;
    const nextProcesses = processes.filter((process) => process.id !== id);
    setProcesses(nextProcesses);
    if (selectedRecord && deletingRecord) {
      const targetProductName = normalizeApplicableProduct(deletingRecord.applicableProducts);
      const remainingSameProduct = sortProcesses(nextProcesses).filter(
        (process) => normalizeApplicableProduct(process.applicableProducts) === targetProductName
      );
      if (!remainingSameProduct.length) {
        setSelectedRecord(null);
        setViewDialogOpen(false);
      } else if (selectedRecord.id === id) {
        setSelectedRecord(remainingSameProduct[0]);
      }
    }
    toast.success("工序模板已删除");
  };

  const handleMove = (id: number, direction: "up" | "down") => {
    setProcesses((prev) => {
      const sorted = sortProcesses(prev);
      const index = sorted.findIndex((process) => process.id === id);
      if (index < 0) return prev;
      const current = sorted[index];
      const sameProductIndexes = sorted
        .map((process, idx) => ({ process, idx }))
        .filter(
          ({ process }) =>
            normalizeApplicableProduct(process.applicableProducts) ===
            normalizeApplicableProduct(current.applicableProducts)
        )
        .map(({ idx }) => idx);
      const currentGroupIndex = sameProductIndexes.indexOf(index);
      const targetGroupIndex = direction === "up" ? currentGroupIndex - 1 : currentGroupIndex + 1;
      if (targetGroupIndex < 0 || targetGroupIndex >= sameProductIndexes.length) return prev;
      const targetIndex = sameProductIndexes[targetGroupIndex];
      const currentOrder = sorted[index].sortOrder;
      sorted[index].sortOrder = sorted[targetIndex].sortOrder;
      sorted[targetIndex].sortOrder = currentOrder;
      return sortProcesses(sorted);
    });
  };

  const getGroupStatusMeta = (group: ProductProcessGroup) => {
    const activeRows = group.processes.filter((process) => process.status === "active").length;
    if (activeRows === group.processes.length) {
      return {
        label: "全部启用",
        variant: "default" as const,
        className: getStatusSemanticClass("active"),
      };
    }
    if (activeRows === 0) {
      return {
        label: "已停用",
        variant: "outline" as const,
        className: getStatusSemanticClass("inactive"),
      };
    }
    return {
      label: "部分启用",
      variant: "secondary" as const,
      className: "bg-amber-100 text-amber-700 border-amber-200",
    };
  };

  const renderEditableTable = (
    title: string,
    field: "inspectionItems" | "qcPoints",
    rows: ProcessItem[],
    showValueType = false
  ) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={() => addItemRow(field)}>
          <Plus className="h-4 w-4 mr-1" />
          添加一行
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className={showValueType ? "w-[24%]" : "w-[28%]"}>项目名称</TableHead>
              <TableHead className={showValueType ? "w-[36%]" : "w-[48%]"}>要求</TableHead>
              {showValueType ? <TableHead className="w-[16%]">定性/定量</TableHead> : null}
              <TableHead className={showValueType ? "w-[14%]" : "w-[14%]"}>单位</TableHead>
              <TableHead className="w-[10%] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Input
                    value={row.itemName}
                    onChange={(e) => updateItemRow(field, row.id, "itemName", e.target.value)}
                    placeholder="项目名称"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={row.requirement}
                    onChange={(e) => updateItemRow(field, row.id, "requirement", e.target.value)}
                    placeholder="填写要求或范围"
                  />
                </TableCell>
                {showValueType ? (
                  <TableCell>
                    <Select
                      value={row.valueType || "qualitative"}
                      onValueChange={(value) =>
                        updateItemRow(field, row.id, "valueType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qualitative">定性</SelectItem>
                        <SelectItem value="quantitative">定量</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                ) : null}
                <TableCell>
                  <Input
                    value={row.unit || ""}
                    onChange={(e) => updateItemRow(field, row.id, "unit", e.target.value)}
                    placeholder="单位"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeItemRow(field, row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderModuleConfig = (key: ModuleKey) => {
    if (!formData.modules[key]) return null;

    if (key === "clearance") {
      return (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">清场记录配置</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setClearanceConfirmerPickerOpen(true)}
              >
                {selectedClearanceConfirmer?.name || "选择确认人"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addClearanceItemRow}>
                <Plus className="h-4 w-4 mr-1" />
                添加一行
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-[28%]">项目</TableHead>
                  <TableHead className="w-[42%]">检验要求</TableHead>
                  <TableHead className="w-[20%]">确认人</TableHead>
                  <TableHead className="w-[10%] text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.moduleConfigs.clearance.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input
                        value={row.itemName}
                        onChange={(e) =>
                          updateClearanceItemRow(row.id, "itemName", e.target.value)
                        }
                        placeholder="项目名称"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.requirement}
                        onChange={(e) =>
                          updateClearanceItemRow(row.id, "requirement", e.target.value)
                        }
                        placeholder="填写检验要求"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{row.confirmerName || "-"}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeClearanceItemRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      );
    }

    if (key === "mold") {
      return (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-base">模具记录配置</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>选择方式</Label>
              <Select
                value={formData.moduleConfigs.mold.selectionMode}
                onValueChange={(value) =>
                  updateModuleConfig("mold", {
                    selectionMode: value as "single" | "multiple",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">单选模具</SelectItem>
                  <SelectItem value="multiple">多选模具</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>可选模具</Label>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-start font-normal"
                onClick={() => setMoldPickerOpen(true)}
              >
                点击从模具工装选择...
              </Button>
              <div className="flex flex-wrap gap-2 pt-2">
                {formData.moduleConfigs.mold.moldOptions.length > 0 ? (
                  formData.moduleConfigs.mold.moldOptions.map((name) => (
                    <Badge key={name} variant="secondary" className="gap-2 px-3 py-1">
                      {name}
                      <button
                        type="button"
                        className="text-xs text-muted-foreground"
                        onClick={() =>
                          updateModuleConfig("mold", {
                            moldOptions: formData.moduleConfigs.mold.moldOptions.filter((item) => item !== name),
                          })
                        }
                      >
                        删除
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">暂未选择模具工装</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (key === "materialUsage") {
      return (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-base">材料使用记录配置</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>取数方式</Label>
              <Select
                value={formData.moduleConfigs.materialUsage.sourceMode}
                onValueChange={(value) =>
                  updateModuleConfig("materialUsage", {
                    sourceMode: value as "production_order" | "bom",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production_order">按生产指令带出</SelectItem>
                  <SelectItem value="bom">按 BOM 带出</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <Checkbox
                checked={formData.moduleConfigs.materialUsage.trackBatchNo}
                onCheckedChange={(checked) =>
                  updateModuleConfig("materialUsage", { trackBatchNo: Boolean(checked) })
                }
              />
              <span className="text-sm">记录物料批号</span>
            </label>
          </CardContent>
        </Card>
      );
    }

    if (key === "tempHumidity") {
      return (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-base">温湿度记录配置</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>温度范围</Label>
              <Input
                value={formData.moduleConfigs.tempHumidity.temperatureRange}
                onChange={(e) =>
                  updateModuleConfig("tempHumidity", { temperatureRange: e.target.value })
                }
                placeholder="如：18-26℃"
              />
            </div>
            <div className="space-y-2">
              <Label>湿度范围</Label>
              <Input
                value={formData.moduleConfigs.tempHumidity.humidityRange}
                onChange={(e) =>
                  updateModuleConfig("tempHumidity", { humidityRange: e.target.value })
                }
                placeholder="如：45-65%"
              />
            </div>
            <div className="space-y-2">
              <Label>压差范围</Label>
              <Input
                value={formData.moduleConfigs.tempHumidity.pressureRange}
                onChange={(e) =>
                  updateModuleConfig("tempHumidity", { pressureRange: e.target.value })
                }
                placeholder="如：5-15Pa"
              />
            </div>
          </CardContent>
        </Card>
      );
    }

    if (key === "equipment") {
      return (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-base">设备使用记录配置</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2 lg:col-span-2">
              <Label>关联设备</Label>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-start font-normal"
                onClick={() => setEquipmentPickerOpen(true)}
              >
                点击从设备管理选择设备...
              </Button>
              <div className="flex flex-wrap gap-2 pt-2">
                {formData.moduleConfigs.equipment.equipmentNames.length > 0 ? (
                  formData.moduleConfigs.equipment.equipmentNames.map((name) => (
                    <Badge key={name} variant="secondary" className="gap-2 px-3 py-1">
                      {name}
                      <button
                        type="button"
                        className="text-xs text-muted-foreground"
                        onClick={() => removeEquipmentName(name)}
                      >
                        删除
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">暂未选择设备</span>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <Checkbox
                checked={formData.moduleConfigs.equipment.autoConfirmOnSubmit}
                onCheckedChange={(checked) =>
                  updateModuleConfig("equipment", {
                    autoConfirmOnSubmit: Boolean(checked),
                  })
                }
              />
              <span className="text-sm">生产记录提交时自动确认已使用设备</span>
            </label>
          </CardContent>
        </Card>
      );
    }

    if (key === "qcPoint") {
      return renderEditableTable("质控点记录表", "qcPoints", formData.qcPoints);
    }

    if (key === "firstArticle") {
      return renderEditableTable("首件记录表", "inspectionItems", formData.inspectionItems, true);
    }

    return null;
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="h-6 w-6" />
              生产工序管理
            </h1>
            <p className="text-muted-foreground mt-1">
              生产工序按产品分别维护，每个产品单独形成一套工艺路线、表单设计和标准数据。
            </p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            新增工序
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{productCount}</div>
              <div className="text-sm text-muted-foreground">适用产品数</div>
              <div className="text-xs text-muted-foreground mt-1">共 {templateGroupCount} 套工序模板</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{processCount}</div>
              <div className="text-sm text-muted-foreground">工序总数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">{keyOrSpecialCount}</div>
              <div className="text-sm text-muted-foreground">关键/特殊工序</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{qualityCount}</div>
              <div className="text-sm text-muted-foreground">需质量介入</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索产品名称、工序名称、文件编号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger>
              <SelectValue placeholder="全部产品" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PRODUCTS_VALUE}>全部产品</SelectItem>
              {productFilterOptions.map((product) => (
                <SelectItem key={product.value} value={product.value}>
                  {product.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="w-16 text-center font-bold">序号</TableHead>
                <TableHead className="text-center font-bold">产品名称</TableHead>
                <TableHead className="text-center font-bold">工序数量</TableHead>
                <TableHead className="text-center font-bold">首道工序</TableHead>
                <TableHead className="text-center font-bold">末道工序</TableHead>
                <TableHead className="text-center font-bold">生产车间</TableHead>
                <TableHead className="text-center font-bold">表单设计</TableHead>
                <TableHead className="text-center font-bold">状态</TableHead>
                <TableHead className="text-center font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedGroups.map((group, index) => {
                const firstProcess = group.processes[0];
                const lastProcess = group.processes[group.processes.length - 1];
                const statusMeta = getGroupStatusMeta(group);
                return (
                  <TableRow key={group.productName}>
                    <TableCell className="text-center font-bold text-muted-foreground">
                      {(currentPage - 1) * PAGE_SIZE + index + 1}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="font-medium">{group.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        已绑定 {group.boundProductCount} 个产品
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {group.boundProductNames.join(" / ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="font-medium">{group.processes.length} 道</div>
                      <div className="text-xs text-muted-foreground">
                        启用 {group.processes.filter((item) => item.status === "active").length} 道
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div>{firstProcess?.processName || "-"}</div>
                      <div className="text-xs text-muted-foreground">{firstProcess?.processCode || "-"}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div>{lastProcess?.processName || "-"}</div>
                      <div className="text-xs text-muted-foreground">{lastProcess?.processCode || "-"}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div>{group.workshops[0] || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {group.workshops.length > 1 ? `共 ${group.workshops.length} 个车间` : (firstProcess?.team || "-")}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm">{group.moduleKeys.length} 项</div>
                      <div className="text-xs text-muted-foreground">
                        {group.moduleKeys.slice(0, 3).map((key) => moduleLabels[key]).join(" / ")}
                        {group.moduleKeys.length > 3 ? "..." : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusMeta.variant} className={statusMeta.className}>
                        {statusMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="查看详情"
                          onClick={() => {
                            setSelectedRecord(group.processes[0] || null);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="维护工序"
                          onClick={() => {
                            setSelectedRecord(group.processes[0] || null);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    暂无工序模板
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <TablePaginationFooter
          total={filtered.length}
          page={currentPage}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />

        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "编辑工序模板" : "新增工序模板"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">基础信息</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>适用产品</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-start font-normal"
                      onClick={() => setProductPickerOpen(true)}
                    >
                      {selectedApplicableProduct ? (
                        <span className="flex items-center gap-2 truncate">
                          {selectedApplicableProduct.code ? (
                            <span className="font-mono text-xs text-muted-foreground shrink-0">
                              {selectedApplicableProduct.code}
                            </span>
                          ) : null}
                          <span className="truncate">
                            {getApplicableProductDisplayName(formData.applicableProducts) || selectedApplicableProduct.aliasNames[0] || selectedApplicableProduct.name}
                            {selectedApplicableProduct.aliasNames.length > 1
                              ? `（含 ${selectedApplicableProduct.aliasNames.join(" / ")}）`
                              : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">点击选择产品...</span>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>工序编号 *</Label>
                    <Input
                      value={formData.processCode}
                      onChange={(e) => setFormData((prev) => ({ ...prev, processCode: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>工序名称 *</Label>
                    <Input
                      value={formData.processName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, processName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>工序类型</Label>
                    <Select
                      value={formData.processType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, processType: value as ProcessType }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">常规</SelectItem>
                        <SelectItem value="critical">关键</SelectItem>
                        <SelectItem value="special">特殊</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>状态</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, status: value as "active" | "inactive" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">启用</SelectItem>
                        <SelectItem value="inactive">停用</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>所属车间 *</Label>
                    <Select
                      value={formData.workshop || undefined}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, workshop: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择车间" />
                      </SelectTrigger>
                      <SelectContent>
                        {workshopOptions.map((workshop) => (
                          <SelectItem key={workshop} value={workshop}>
                            {workshop}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>生产班组</Label>
                    <Input
                      value={formData.team}
                      onChange={(e) => setFormData((prev) => ({ ...prev, team: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>操作人</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-start font-normal"
                      onClick={() => setOperatorPickerOpen(true)}
                    >
                      {selectedOperator ? (
                        <span className="flex items-center gap-2 truncate">
                          {selectedOperator.employeeNo ? (
                            <span className="font-mono text-xs text-muted-foreground shrink-0">
                              {selectedOperator.employeeNo}
                            </span>
                          ) : null}
                          <span className="truncate">{selectedOperator.name}</span>
                        </span>
                      ) : formData.operator ? (
                        <span className="truncate">{formData.operator}</span>
                      ) : (
                        <span className="text-muted-foreground">点击选择操作人...</span>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>排序序号</Label>
                    <Input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sortOrder: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>标准工时(分钟)</Label>
                    <Input
                      type="number"
                      value={formData.standardTime}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, standardTime: e.target.value }))
                      }
                      placeholder="未知可留空"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">表单设计</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                  {(Object.keys(moduleLabels) as ModuleKey[]).map((key) => (
                    <label
                      key={key}
                      className="flex min-h-[92px] items-start gap-2 rounded-lg border px-3 py-2.5 bg-muted/20"
                    >
                      <Checkbox
                        checked={formData.modules[key]}
                        onCheckedChange={(checked) => updateModule(key, Boolean(checked))}
                        className="mt-0.5"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium leading-none">{moduleLabels[key]}</span>
                          <Badge variant="outline" className="text-[11px]">
                            {moduleTypeLabels[key]}
                          </Badge>
                        </div>
                        <div className="text-[11px] leading-5 text-muted-foreground">{moduleDescriptions[key]}</div>
                      </div>
                    </label>
                  ))}
                </CardContent>
              </Card>

              {(Object.keys(moduleLabels) as ModuleKey[]).map((key) => renderModuleConfig(key))}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">补充说明</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>工序说明</Label>
                    <Textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="填写这道工序的执行要点、注意事项和业务说明"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>保存</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <EntityPickerDialog
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          title="选择产品"
          searchPlaceholder="搜索产品编码、名称、别名..."
          columns={[
            {
              key: "code",
              title: "产品编码",
              render: (product) => <span className="font-mono font-medium">{product.code || "-"}</span>,
            },
            {
              key: "name",
              title: "产品名称",
              render: (product) => (
                <div className="space-y-1">
                  <div className="font-medium">{product.aliasNames?.[0] || product.name || "-"}</div>
                  <div className="text-xs text-muted-foreground">
                    {product.aliasNames?.length > 1
                      ? `别名：${product.aliasNames.join(" / ")}`
                      : "无别名"}
                  </div>
                </div>
              ),
            },
            {
              key: "unit",
              title: "单位",
              render: (product) => <span>{product.unit || "-"}</span>,
            },
            {
              key: "count",
              title: "汇总数量",
              render: (product) => <span>{product.count} 个产品</span>,
            },
          ]}
          rows={productRows}
          selectedId={selectedApplicableProduct?.id || null}
          onSelect={(product: ProcessProductOption) => {
            const value = normalizeApplicableProduct(product.name);
            setFormData((prev) => ({
              ...prev,
              applicableProducts: value,
              sortOrder:
                isEditing &&
                value === normalizeApplicableProduct(selectedRecord?.applicableProducts || "")
                  ? prev.sortOrder
                  : String(getNextSortOrder(value, selectedRecord?.id)),
            }));
            setProductPickerOpen(false);
          }}
          filterFn={(product: any, q: string) => {
            const lower = q.toLowerCase();
            return [product.code, product.name, ...(product.aliasNames || [])]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(lower));
          }}
          emptyText="暂无符合条件的产品，仅支持成品/半成品且获取权限为生产的产品"
        />

        <EntityPickerDialog
          open={bindingPickerOpen}
          onOpenChange={setBindingPickerOpen}
          title="维护绑定产品"
          searchPlaceholder="搜索产品名称、编码..."
          columns={[
            {
              key: "code",
              title: "产品编码",
              render: (product) => <span className="font-mono font-medium">{product.code || "-"}</span>,
            },
            {
              key: "name",
              title: "产品名称",
              render: (product) => <span className="font-medium">{product.name || "-"}</span>,
            },
            {
              key: "unit",
              title: "单位",
              render: (product) => <span>{product.unit || "-"}</span>,
            },
            {
              key: "count",
              title: "规格数",
              render: (product) => <span>{product.count} 个产品</span>,
            },
          ]}
          rows={bindingRows}
          selectedIds={bindingDraftIds}
          onSelect={(product: ProcessBindingOption) => toggleBindingDraftId(product.id)}
          onConfirm={handleConfirmBindings}
          confirmText="保存绑定"
          filterFn={(product: ProcessBindingOption, q: string) => {
            const lower = q.toLowerCase();
            return [product.code, product.name]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(lower));
          }}
          emptyText="暂无可绑定产品"
        />

        <EntityPickerDialog
          open={moldPickerOpen}
          onOpenChange={setMoldPickerOpen}
          title="选择模具工装"
          searchPlaceholder="搜索编号、名称、工序..."
          columns={[
            {
              key: "code",
              title: "编号",
              render: (record) => <span className="font-mono font-medium">{record.code || "-"}</span>,
            },
            {
              key: "name",
              title: "名称",
              render: (record) => <span className="font-medium">{record.name || "-"}</span>,
            },
            {
              key: "type",
              title: "类型",
              render: (record) => <span>{record.type === "tooling" ? "工装" : "模具"}</span>,
            },
            {
              key: "applicableProcess",
              title: "适用工序",
              render: (record) => <span>{record.applicableProcess || "-"}</span>,
            },
          ]}
          rows={moldToolingRows}
          selectedId={null}
          onSelect={(record: MoldToolingRecord) => {
            updateModuleConfig("mold", {
              moldOptions: Array.from(
                new Set([...formData.moduleConfigs.mold.moldOptions, record.name])
              ),
            });
            setMoldPickerOpen(false);
          }}
          filterFn={(record: MoldToolingRecord, q: string) => {
            const lower = q.toLowerCase();
            return [record.code, record.name, record.applicableProcess, record.applicableProduct]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(lower));
          }}
          emptyText="暂无可选模具工装"
        />

        <EntityPickerDialog
          open={operatorPickerOpen}
          onOpenChange={setOperatorPickerOpen}
          title="选择操作人"
          searchPlaceholder="搜索工号、姓名、部门..."
          columns={[
            {
              key: "employeeNo",
              title: "工号",
              render: (person) => <span className="font-mono font-medium">{person.employeeNo || "-"}</span>,
            },
            {
              key: "name",
              title: "姓名",
              render: (person) => <span className="font-medium">{person.name || "-"}</span>,
            },
            {
              key: "department",
              title: "部门",
              render: (person) => <span>{person.department || "-"}</span>,
            },
            {
              key: "position",
              title: "岗位",
              render: (person) => <span>{person.position || "-"}</span>,
            },
          ]}
          rows={operatorRows}
          selectedId={selectedOperator?.id || null}
          onSelect={(person: ProcessOperatorOption) => {
            setFormData((prev) => ({ ...prev, operator: person.name }));
            setOperatorPickerOpen(false);
          }}
          filterFn={(person: any, q: string) => {
            const lower = q.toLowerCase();
            return [person.employeeNo, person.name, person.department, person.position]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(lower));
          }}
          emptyText="人事管理中暂无可选人员"
        />

        <EntityPickerDialog
          open={clearanceConfirmerPickerOpen}
          onOpenChange={setClearanceConfirmerPickerOpen}
          title="选择确认人"
          searchPlaceholder="搜索工号、姓名、部门..."
          columns={[
            {
              key: "employeeNo",
              title: "工号",
              render: (person) => <span className="font-mono font-medium">{person.employeeNo || "-"}</span>,
            },
            {
              key: "name",
              title: "姓名",
              render: (person) => <span className="font-medium">{person.name || "-"}</span>,
            },
            {
              key: "department",
              title: "部门",
              render: (person) => <span>{person.department || "-"}</span>,
            },
            {
              key: "position",
              title: "岗位",
              render: (person) => <span>{person.position || "-"}</span>,
            },
          ]}
          rows={operatorRows}
          selectedId={selectedClearanceConfirmer?.id || null}
          onSelect={(person: ProcessOperatorOption) => {
            applyClearanceConfirmerToAllRows(person);
            setClearanceConfirmerPickerOpen(false);
          }}
          filterFn={(person: any, q: string) => {
            const lower = q.toLowerCase();
            return [person.employeeNo, person.name, person.department, person.position]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(lower));
          }}
          emptyText="人事管理中暂无可选确认人"
        />

        <EntityPickerDialog
          open={equipmentPickerOpen}
          onOpenChange={setEquipmentPickerOpen}
          title="选择设备"
          searchPlaceholder="搜索设备编号、名称、型号..."
          columns={[
            {
              key: "code",
              title: "设备编号",
              render: (equipment) => <span className="font-mono font-medium">{equipment.code || "-"}</span>,
            },
            {
              key: "name",
              title: "设备名称",
              render: (equipment) => <span className="font-medium">{equipment.name || "-"}</span>,
            },
            {
              key: "model",
              title: "型号规格",
              render: (equipment) => <span>{equipment.model || "-"}</span>,
            },
            {
              key: "location",
              title: "安装位置",
              render: (equipment) => <span>{equipment.location || "-"}</span>,
            },
          ]}
          rows={equipmentRows}
          selectedId={null}
          onSelect={(equipment: Equipment) => {
            addEquipmentName(equipment.name);
            setEquipmentPickerOpen(false);
          }}
          filterFn={(equipment: any, q: string) => {
            const lower = q.toLowerCase();
            return [equipment.code, equipment.name, equipment.model, equipment.location]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(lower));
          }}
          emptyText="设备管理中暂无可选设备"
        />

        <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DraggableDialogContent className="w-full max-w-none max-h-[90vh] overflow-y-auto">
            {selectedRecord && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-lg font-semibold">工序详情</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedGroupDisplayName || selectedRecord.applicableProducts}
                    <span className="mx-2">·</span>
                    共 {selectedProductProcesses.length} 道工序
                    <span className="mx-2">·</span>
                    绑定 {Math.max(selectedGroupBoundProductNames.length, 1)} 个产品
                  </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">逻辑模板名称</div>
                      <div className="mt-2 text-lg font-semibold">
                        {selectedGroupDisplayName || "-"}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">绑定产品</div>
                      <div className="mt-2 text-lg font-semibold">
                        {Math.max(selectedGroupBoundProductNames.length, 1)} 个
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {(selectedGroupBoundProductNames.length > 0
                          ? selectedGroupBoundProductNames
                          : [selectedGroupDisplayName || selectedRecord.applicableProducts]
                        ).join(" / ")}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">工序数量</div>
                      <div className="mt-2 text-lg font-semibold">
                        {selectedProductProcesses.length} 道
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">启用工序</div>
                      <div className="mt-2 text-lg font-semibold">
                        {selectedGroupActiveCount} 道
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">生产车间</div>
                      <div className="mt-2 text-sm font-medium">
                        {selectedGroupWorkshops.join(" / ") || "-"}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">表单模块</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {selectedGroupModules.length > 0 ? (
                      selectedGroupModules.map((key) => (
                        <Badge key={key} variant="outline">
                          {moduleLabels[key]}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">暂无表单模块</span>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">工序列表</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleOpenBindingPicker}>
                        维护绑定产品
                      </Button>
                      <Button size="sm" onClick={handleAddProcessToCurrentGroup}>
                        <Plus className="mr-1 h-4 w-4" />
                        新增工序
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/60">
                          <TableHead className="text-center">顺序</TableHead>
                          <TableHead className="text-center">工序编号</TableHead>
                          <TableHead className="text-center">工序名称</TableHead>
                          <TableHead className="text-center">类型</TableHead>
                          <TableHead className="text-center">车间/班组</TableHead>
                          <TableHead className="text-center">受控文件</TableHead>
                          <TableHead className="text-center">状态</TableHead>
                          <TableHead className="text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedProductProcesses.map((process, index) => (
                          <TableRow key={process.id}>
                            <TableCell className="text-center font-medium">{process.sortOrder}</TableCell>
                            <TableCell className="text-center font-mono">{process.processCode}</TableCell>
                            <TableCell className="text-center">
                              <div>{process.processName}</div>
                              <div className="text-xs text-muted-foreground">
                                {process.standardTime ? `${process.standardTime} 分钟` : "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={processTypeMap[process.processType].className}>
                                {processTypeMap[process.processType].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div>{process.workshop || "-"}</div>
                              <div className="text-xs text-muted-foreground">{process.team || "-"}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div>{process.controlledDocNo || "-"}</div>
                              <div className="text-xs text-muted-foreground">
                                {process.controlledDocName || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={process.status === "active" ? "default" : "outline"}
                                className={getStatusSemanticClass(process.status)}
                              >
                                {process.status === "active" ? "启用" : "停用"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMove(process.id, "up")}
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMove(process.id, "down")}
                                  disabled={index === selectedProductProcesses.length - 1}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setViewDialogOpen(false);
                                    handleEdit(process);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => handleDelete(process.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {selectedProductProcesses.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                              暂无工序
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={handleOpenBindingPicker}>
                    维护绑定产品
                  </Button>
                  <Button onClick={handleAddProcessToCurrentGroup}>
                    <Plus className="mr-1 h-4 w-4" />
                    新增工序
                  </Button>
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                    关闭
                  </Button>
                </div>
              </div>
            )}
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
