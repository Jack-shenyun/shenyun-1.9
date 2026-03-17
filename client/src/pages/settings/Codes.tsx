import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Hash,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useOperationLog } from "@/hooks/useOperationLog";

interface CodeRule {
  id: number;
  name: string;
  prefix: string;
  dateFormat: string;
  serialLength: number;
  currentSerial: number;
  separator: string;
  example: string;
  department: string;
  module: string;
  status: "active" | "inactive";
  description: string;
}

const MODULE_NAME_MAP: Record<string, string> = {
  purchaseOrder: "采购订单",
  productionOrder: "生产订单",
  materialRequest: "物料请购",
  salesOrder: "销售订单",
  customer: "客户管理",
  inbound: "入库单",
  outbound: "出库单",
  receivable: "应收单",
  paymentRecord: "付款/收款记录",
  reimbursement: "报销单",
  customs: "报关单",
  productionPlan: "生产计划",
  requisition: "领料单",
  productionRecord: "生产记录",
  routingCard: "流转卡",
  sterilization: "灭菌单",
  warehouseEntry: "生产入库申请",
  stocktake: "盘点单",
  sample: "留样单",
  lab: "实验室记录",
  qualityIncident: "质量事件",
  training: "培训记录",
  rdProject: "研发项目",
  overtime: "加班申请",
  leave: "请假申请",
  outing: "外出申请",
  "客户管理": "客户编码",
  "销售订单": "销售订单编码",
  "采购订单": "采购订单编码",
  "生产订单": "生产订单编码",
  "物料请购": "物料申请编码",
  "入库单": "入库单编码",
  "出库单": "出库单编码",
  "应收单": "应收单编码",
  "付款/收款记录": "资金流水编码",
  "报销单": "报销编码",
  "报关单": "报关编码",
  "生产计划": "生产计划编码",
  "领料单": "领料单编码",
  "生产记录": "生产记录编码",
  "流转卡": "流转卡编码",
  "灭菌单": "灭菌单编码",
  "生产入库申请": "生产入库申请编码",
  "盘点单": "盘点单编码",
  "留样单": "留样单编码",
  "实验室记录": "实验室记录编码",
  "质量事件": "质量事件编码",
  "培训记录": "培训记录编码",
  "研发项目": "研发项目编码",
  "加班申请": "加班申请编码",
  "请假申请": "请假申请编码",
  "外出申请": "外出申请编码",
};

const MODULE_NAME_MAP_LOWER: Record<string, string> = Object.fromEntries(
  Object.entries(MODULE_NAME_MAP).map(([k, v]) => [k.toLowerCase(), v]),
);

function toChineseModuleName(input: string): string {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";
  if (trimmed.endsWith("编码")) {
    const stripped = trimmed.slice(0, -2);
    if (stripped) return toChineseModuleName(stripped);
  }
  if (MODULE_NAME_MAP[trimmed]) return MODULE_NAME_MAP[trimmed];
  const lower = trimmed.toLowerCase();
  if (MODULE_NAME_MAP_LOWER[lower]) return MODULE_NAME_MAP_LOWER[lower];
  const compact = lower.replace(/[\s_-]+/g, "");
  if (MODULE_NAME_MAP_LOWER[compact]) return MODULE_NAME_MAP_LOWER[compact];
  return trimmed;
}

function inferDepartmentByModule(moduleName: string): string {
  const m = moduleName.trim();
  const map: Record<string, string> = {
    "客户管理": "销售部",
    "销售订单": "销售部",
    "报关单": "销售部",
    "应收单": "销售部",
    "采购订单": "采购部",
    "物料请购": "采购部",
    "生产订单": "生产部",
    "生产计划": "生产部",
    "领料单": "生产部",
    "生产记录": "生产部",
    "流转卡": "生产部",
    "灭菌单": "生产部",
    "生产入库申请": "生产部",
    "入库单": "仓库管理",
    "出库单": "仓库管理",
    "盘点单": "仓库管理",
    "付款/收款记录": "财务部",
    "报销单": "财务部",
    "留样单": "质量部",
    "实验室记录": "质量部",
    "质量事件": "质量部",
    "研发项目": "研发部",
    "培训记录": "管理部",
    "加班申请": "管理部",
    "请假申请": "管理部",
    "外出申请": "管理部",
  };
  return map[m] || "系统设置";
}

function normalizeCodeRule(raw: any): CodeRule {
  const rawModuleName = String(raw?.module ?? "");
  const moduleName = toChineseModuleName(rawModuleName);
  const prefix = String(raw?.prefix ?? "");
  const dateFormat = String(raw?.dateFormat ?? "");
  const serialLength = Number(raw?.serialLength ?? raw?.seqLength ?? 4);
  const currentSerial = Number(raw?.currentSerial ?? raw?.currentSeq ?? 0);
  const separator = String(raw?.separator ?? "-");
  const description = String(raw?.description ?? "");
  const example =
    String(raw?.example ?? "") ||
    [prefix, dateFormat ? "2026" : "", String(1).padStart(serialLength, "0")]
      .filter(Boolean)
      .join(separator);
  const inferredName = MODULE_NAME_MAP[moduleName] || (moduleName ? `${moduleName}编码` : "");
  return {
    id: Number(raw?.id ?? 0),
    name: String(raw?.name ?? "") || description || inferredName || "未命名编码规则",
    prefix,
    dateFormat,
    serialLength,
    currentSerial,
    separator,
    example,
    department: inferDepartmentByModule(moduleName),
    module: moduleName || "未分类",
    status: (raw?.status === "inactive" ? "inactive" : "active") as "active" | "inactive",
    description,
  };
}

const moduleOptions = [
  { label: "管理部", value: "管理部" },
  { label: "招商部", value: "招商部" },
  { label: "销售部", value: "销售部" },
  { label: "研发部", value: "研发部" },
  { label: "生产部", value: "生产部" },
  { label: "质量部", value: "质量部" },
  { label: "采购部", value: "采购部" },
  { label: "仓库管理", value: "仓库管理" },
  { label: "财务部", value: "财务部" },
];

const dateFormatOptions = [
  { label: "无日期", value: "" },
  { label: "YYYYMMDD (20260202)", value: "YYYYMMDD" },
  { label: "YYYYMM (202602)", value: "YYYYMM" },
  { label: "YYYY (2026)", value: "YYYY" },
];

export default function CodesPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.codeRules.list.useQuery();
  const createMutation = trpc.codeRules.create.useMutation({ onSuccess: () => { refetch(); toast.success("创建成功"); } });
  const updateMutation = trpc.codeRules.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.codeRules.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });
  const syncMutation = trpc.codeRules.resync.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("流水号已重新同步");
    },
  });
  const codeRules = Array.from(
    (_dbData as any[])
      .map(normalizeCodeRule)
      .reduce((map, rule) => {
        const key = `${rule.module}::${rule.prefix}`;
        const existing = map.get(key);
        if (
          !existing ||
          Number(rule.currentSerial || 0) > Number(existing.currentSerial || 0) ||
          (Number(rule.currentSerial || 0) === Number(existing.currentSerial || 0) &&
            Number(rule.id || 0) > Number(existing.id || 0))
        ) {
          map.set(key, rule);
        }
        return map;
      }, new Map<string, CodeRule>())
      .values()
  ).sort((a, b) => (a.department + a.module).localeCompare(b.department + b.module, "zh-CN"));
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CodeRule | null>(null);
  const [viewingRule, setViewingRule] = useState<CodeRule | null>(null);
  const { canDelete } = usePermission();
  const { logOperation } = useOperationLog();

  const [formData, setFormData] = useState({
    name: "",
    prefix: "",
    dateFormat: "",
    serialLength: 4,
    separator: "-",
    module: "",
    status: "active",
    description: "",
  });

  const filteredRules = codeRules.filter(
    (rule) =>
      String(rule.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(rule.prefix ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(rule.module ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(rule.department ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 生成示例编码
  const generateExample = () => {
    const { prefix, dateFormat, serialLength, separator } = formData;
    let example = prefix;
    
    if (dateFormat) {
      const now = new Date();
      let dateStr = "";
      if (dateFormat === "YYYYMMDD") {
        dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      } else if (dateFormat === "YYYYMM") {
        dateStr = now.toISOString().slice(0, 7).replace(/-/g, "");
      } else if (dateFormat === "YYYY") {
        dateStr = now.getFullYear().toString();
      }
      example += separator + dateStr;
    }
    
    example += separator + "0001".padStart(serialLength, "0");
    return example;
  };

  const handleAdd = () => {
    setEditingRule(null);
    setFormData({
      name: "",
      prefix: "",
      dateFormat: "",
      serialLength: 4,
      separator: "-",
      module: "",
      status: "active",
      description: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (rule: CodeRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      prefix: rule.prefix,
      dateFormat: rule.dateFormat,
      serialLength: rule.serialLength,
      separator: rule.separator,
      module: rule.module,
      status: rule.status,
      description: rule.description,
    });
    setDialogOpen(true);
  };

  const handleView = (rule: CodeRule) => {
    setViewingRule(rule);
    setViewDialogOpen(true);
  };

  const handleDelete = (rule: CodeRule) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除编码规则" });
      return;
    }
    deleteMutation.mutate({ id: rule.id });
    
    // 记录操作日志
    logOperation({
      module: "code_rule",
      action: "delete",
      targetType: "编码规则",
      targetId: rule.id,
      targetName: rule.name,
      description: `删除编码规则：${rule.name}`,
      previousData: rule as unknown as Record<string, unknown>,
    });
    
    toast.success("删除成功");
  };

  const handleResetSerial = (rule: CodeRule) => {
    syncMutation.mutate({ id: rule.id });
    logOperation({
      module: "code_rule",
      action: "sync",
      targetType: "编码规则",
      targetId: rule.id,
      targetName: rule.name,
      description: `重新同步编码规则流水号：${rule.name}`,
      previousData: { currentSerial: rule.currentSerial },
    });
  };

  const handleCopyExample = (example: string) => {
    navigator.clipboard.writeText(example);
    toast.success("已复制到剪贴板");
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.prefix) {
      toast.error("请填写必填项");
      return;
    }

    const example = generateExample();

    const payload = {
      module: formData.module || formData.name,
      prefix: formData.prefix,
      dateFormat: formData.dateFormat || "",
      seqLength: formData.serialLength,
      example,
      description: formData.description || formData.name,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: payload });
      // 记录操作日志
      logOperation({
        module: "code_rule",
        action: "update",
        targetType: "编码规则",
        targetId: editingRule.id,
        targetName: formData.name,
        description: `编辑编码规则：${formData.name}`,
        previousData: editingRule as unknown as Record<string, unknown>,
        newData: formData as unknown as Record<string, unknown>,
      });
      
      toast.success("编码规则已更新");
    } else {
      createMutation.mutate(payload);
      const nextId = codeRules.length > 0 ? Math.max(...codeRules.map((r: any) => r.id)) + 1 : 1;
      const newRule: CodeRule = {
        id: nextId,
        name: formData.name,
        prefix: formData.prefix,
        dateFormat: formData.dateFormat,
        serialLength: formData.serialLength,
        currentSerial: 0,
        separator: formData.separator,
        example,
        module: formData.module,
        status: formData.status as "active" | "inactive",
        description: formData.description,
      };
      // 记录操作日志
      logOperation({
        module: "code_rule",
        action: "create",
        targetType: "编码规则",
        targetId: newRule.id,
        targetName: newRule.name,
        description: `新建编码规则：${newRule.name}`,
        newData: newRule as unknown as Record<string, unknown>,
      });
      
      toast.success("编码规则创建成功");
    }
    setDialogOpen(false);
  };

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (

    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">

      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>

      <span className="flex-1 text-sm text-right break-all">{children}</span>

    </div>

  );


  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">编码设置</h2>
              <p className="text-sm text-muted-foreground">配置各类单据的自动编码规则</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新增规则
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">编码规则总数</p>
              <p className="text-2xl font-bold">{codeRules.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">启用规则</p>
              <p className="text-2xl font-bold text-green-600">
                {codeRules.filter((r: any) => r.status === "active").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">涉及模块</p>
              <p className="text-2xl font-bold text-primary">
                {new Set(codeRules.map((r: any) => r.module)).size}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已有流水规则</p>
              <p className="text-2xl font-bold text-amber-600">
                {codeRules.filter((rule: any) => Number(rule.currentSerial || 0) > 0).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索 */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索规则名称、前缀、所属模块..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* 数据表格 */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="text-center font-bold">规则名称</TableHead>
                    <TableHead className="text-center font-bold">前缀</TableHead>
                    <TableHead className="text-center font-bold">日期格式</TableHead>
                    <TableHead className="text-center font-bold">流水号位数</TableHead>
                    <TableHead className="text-center font-bold">当前流水号</TableHead>
                    <TableHead className="text-center font-bold">示例</TableHead>
                    <TableHead className="text-center font-bold">所属部门</TableHead>
                    <TableHead className="text-center font-bold">所属模块</TableHead>
                    <TableHead className="text-center font-bold">状态</TableHead>
                    <TableHead className="w-[100px] text-center font-bold">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {isLoading ? "加载中..." : "暂无数据"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRules.map((rule: any) => (
                      <TableRow key={rule.id}>
                        <TableCell className="text-center font-medium">{rule.name}</TableCell>
                        <TableCell className="text-center font-mono">{rule.prefix}</TableCell>
                        <TableCell className="text-center">{rule.dateFormat || "-"}</TableCell>
                        <TableCell className="text-center">{rule.serialLength}</TableCell>
                        <TableCell className="text-center">{rule.currentSerial}</TableCell>
                        <TableCell className="text-center">
                          <div className="w-full flex items-center justify-center gap-1">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {rule.example}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopyExample(rule.example)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{rule.department}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{rule.module}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={rule.status === "active" ? "default" : "secondary"} className={getStatusSemanticClass(rule.status)}>
                            {rule.status === "active" ? "启用" : "停用"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(rule)}>
                                <Eye className="h-4 w-4 mr-2" />
                                查看
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(rule)}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetSerial(rule)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                重新同步流水号
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(rule)}
                                className={canDelete ? "text-destructive" : "text-muted-foreground"}
                                disabled={!canDelete}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 新建/编辑对话框 */}
      <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DraggableDialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? "编辑编码规则" : "新增编码规则"}</DialogTitle>
            <DialogDescription>
              配置单据自动编码的生成规则
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>规则名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：销售订单编码"
                />
              </div>
              <div className="space-y-2">
                <Label>编码前缀 *</Label>
                <Input
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                  placeholder="如：SO"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>日期格式</Label>
                <Select
                  value={formData.dateFormat || "none"}
                  onValueChange={(v) => setFormData({ ...formData, dateFormat: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择日期格式" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFormatOptions.map((opt: any) => (
                      <SelectItem key={opt.value} value={opt.value || "none"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>流水号位数</Label>
                <Select
                  value={formData.serialLength.toString()}
                  onValueChange={(v) => setFormData({ ...formData, serialLength: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7, 8].map((n: any) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} 位
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分隔符</Label>
                <Select
                  value={formData.separator}
                  onValueChange={(v) => setFormData({ ...formData, separator: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">连字符 (-)</SelectItem>
                    <SelectItem value="_">下划线 (_)</SelectItem>
                    <SelectItem value="none">无分隔符</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>所属模块</Label>
                <Select
                  value={formData.module}
                  onValueChange={(v) => setFormData({ ...formData, module: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择模块" />
                  </SelectTrigger>
                  <SelectContent>
                    {moduleOptions.map((opt: any) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
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
              <Label>编码示例</Label>
              <div className="p-3 bg-muted rounded-md">
                <code className="text-sm font-mono">{generateExample()}</code>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>保存</Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* 查看详情对话框 */}
      <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DraggableDialogContent>
          {viewingRule && (
            <>
              <div className="border-b pb-3">
                <h2 className="text-lg font-semibold">编码规则详情</h2>
                <p className="text-sm text-muted-foreground">
                  {viewingRule.name}
                  {viewingRule.status && (
                    <>
                      {' · '}
                      <Badge
                        variant={viewingRule.status === 'active' ? 'default' : 'secondary'}
                        className={`ml-1 ${getStatusSemanticClass(viewingRule.status)}`}
                      >
                        {viewingRule.status === 'active' ? '启用' : '停用'}
                      </Badge>
                    </>
                  )}
                </p>
              </div>
              <div className="space-y-4 py-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="规则名称">{viewingRule.name}</FieldRow>
                      <FieldRow label="编码前缀"><span className="font-mono">{viewingRule.prefix}</span></FieldRow>
                      <FieldRow label="所属模块"><Badge variant="outline">{viewingRule.module}</Badge></FieldRow>
                    </div>
                    <div>
                      <FieldRow label="日期格式">{viewingRule.dateFormat || '无'}</FieldRow>
                      <FieldRow label="分隔符">{viewingRule.separator || '无'}</FieldRow>
                      <FieldRow label="流水号位数">{viewingRule.serialLength} 位</FieldRow>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">状态与示例</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                       <FieldRow label="当前流水号">{viewingRule.currentSerial}</FieldRow>
                    </div>
                    <div>
                      <FieldRow label="编码示例">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{viewingRule.example}</code>
                      </FieldRow>
                    </div>
                  </div>
                </div>

                {viewingRule.description && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{viewingRule.description}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
                <div className="flex gap-2 flex-wrap"></div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(viewingRule)}>编辑</Button>
                </div>
              </div>
            </>
          )}
        </DraggableDialogContent>
      </DraggableDialog>
    </ERPLayout>
  );
}
