import { useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { useAuth } from "@/_core/hooks/useAuth";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  GitBranch,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  ShieldCheck,
  Send,
  Check,
  ChevronsUpDown,
  X,
  Info,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";

type WorkflowRecord = {
  id: number;
  code: string;
  name: string;
  module: string;
  formType: string;
  initiators: string | null;
  approvalSteps: string | null;
  handlers: string | null;
  ccRecipients: string | null;
  description: string | null;
  status: "active" | "inactive";
  createdAt: string | Date;
  updatedAt: string | Date;
};

type UserOption = {
  id: string;
  name: string;
  department: string;
  label: string;
  searchValue: string;
};

type FormCatalogRecord = {
  id: number;
  module: string;
  formType: string;
  formName: string;
  path: string | null;
  sortOrder: number;
  status: "active" | "inactive";
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type WorkflowFormState = {
  code: string;
  module: string;
  formType: string;
  name: string;
  initiators: string[];
  approvalSteps: string[];
  handlers: string[];
  ccRecipients: string[];
  status: "active" | "inactive";
};

const WORKFLOW_RULE_NOTE = "基本原则：如果发起人与当前审批步骤的审批人为同一人，创建后自动审核，系统直接流转到下一步，不需要再次确认。";

function parseJsonList(raw: unknown) {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean)
      : [];
  } catch {
    return String(raw ?? "")
      .split(/[\n,\uFF0C;；]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function normalizeUserToken(value: string) {
  return String(value || "").replace(/[（(].*?[）)]/g, "").trim();
}

function formatDate(raw: unknown) {
  const date = new Date(String(raw ?? ""));
  if (Number.isNaN(date.getTime())) return "-";
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${min}`;
}

function parseStoredUserIds(raw: unknown, userIdMap: Map<string, UserOption>, userNameMap: Map<string, UserOption>) {
  return uniqueStrings(parseJsonList(raw)).flatMap((item) => {
    if (userIdMap.has(item)) return [item];
    const normalized = normalizeUserToken(item);
    const matched = userNameMap.get(item) || userNameMap.get(normalized);
    return matched ? [matched.id] : [];
  });
}

function resolveUserLabel(raw: string, userIdMap: Map<string, UserOption>, userNameMap: Map<string, UserOption>) {
  if (userIdMap.has(raw)) return userIdMap.get(raw)?.label || raw;
  const normalized = normalizeUserToken(raw);
  return userNameMap.get(raw)?.label || userNameMap.get(normalized)?.label || raw;
}

function renderSelectionPreview(labels: string[]) {
  if (labels.length === 0) return <span className="text-muted-foreground">-</span>;
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.slice(0, 3).map((item) => (
        <Badge key={item} variant="outline" className="font-normal">
          {item}
        </Badge>
      ))}
      {labels.length > 3 ? <Badge variant="secondary">+{labels.length - 3}</Badge> : null}
    </div>
  );
}

function UserMultiSelect({
  label,
  value,
  options,
  onChange,
  helperText,
  ordered = false,
}: {
  label: string;
  value: string[];
  options: UserOption[];
  onChange: (next: string[]) => void;
  helperText?: string;
  ordered?: boolean;
}) {
  const optionsById = useMemo(() => new Map(options.map((item) => [item.id, item])), [options]);
  const selectedItems = value.map((id) => optionsById.get(id)).filter(Boolean) as UserOption[];

  const toggleValue = (id: string) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {value.length > 0 ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange([])}>
            清空
          </Button>
        ) : null}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-11 w-full justify-between rounded-xl font-normal">
            <span className="truncate text-left">
              {selectedItems.length > 0
                ? `${selectedItems.slice(0, 2).map((item) => item.name).join("、")}${selectedItems.length > 2 ? ` 等${selectedItems.length}人` : ""}`
                : "请选择人员（可多选）"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[360px] p-0">
          <Command>
            <CommandInput placeholder="搜索姓名或部门..." />
            <CommandList className="max-h-[280px]">
              <CommandEmpty>未找到人员</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const checked = value.includes(option.id);
                  return (
                    <CommandItem
                      key={option.id}
                      value={option.searchValue}
                      onSelect={() => toggleValue(option.id)}
                      className="px-3 py-3"
                    >
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{option.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{option.department || "未设置部门"}</p>
                        </div>
                        <div className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          checked ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
                        )}>
                          {checked ? <Check className="h-3 w-3" /> : null}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="min-h-[48px] rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        {selectedItems.length === 0 ? (
          <span className="text-xs text-muted-foreground">未选择</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedItems.map((item, index) => (
              <Badge key={item.id} variant="outline" className="gap-1 rounded-full px-2.5 py-1 font-normal">
                {ordered ? <span className="font-semibold text-slate-500">{index + 1}.</span> : null}
                <span>{item.name}</span>
                <button
                  type="button"
                  className="ml-1 rounded-full text-slate-400 transition hover:text-slate-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(value.filter((entry) => entry !== item.id));
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}

export default function WorkflowSettingsPage() {
  const { user } = useAuth();
  const isAdmin = String((user as any)?.role ?? "") === "admin";
  const { data: formCatalogData = [] } = trpc.workflowSettings.formCatalog.useQuery({ status: "active", approvalEnabled: true });
  const { data: workflowData = [], isLoading, refetch } = trpc.workflowSettings.list.useQuery();
  const { data: users = [] } = trpc.users.list.useQuery();
  const createMutation = trpc.workflowSettings.create.useMutation();
  const updateMutation = trpc.workflowSettings.update.useMutation();
  const deleteMutation = trpc.workflowSettings.delete.useMutation();

  const formCatalog = formCatalogData as FormCatalogRecord[];
  const records = workflowData as WorkflowRecord[];
  const userOptions = useMemo<UserOption[]>(() => {
    return (users as any[])
      .map((item) => {
        const id = String(item?.id || "").trim();
        const name = String(item?.name || "").trim();
        const department = String(item?.department || "").trim();
        if (!id || !name) return null;
        return {
          id,
          name,
          department,
          label: department ? `${name}（${department}）` : name,
          searchValue: [name, department, id].filter(Boolean).join(" "),
        };
      })
      .filter(Boolean) as UserOption[];
  }, [users]);
  const userIdMap = useMemo(() => new Map(userOptions.map((item) => [item.id, item])), [userOptions]);
  const userNameMap = useMemo(
    () => new Map(userOptions.flatMap((item) => [[item.name, item] as const, [normalizeUserToken(item.name), item] as const])),
    [userOptions],
  );

  const moduleOptions = useMemo(
    () => uniqueStrings([...formCatalog.map((item) => item.module), ...records.map((item) => item.module)]),
    [formCatalog, records],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WorkflowRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<WorkflowRecord | null>(null);
  const [formData, setFormData] = useState<WorkflowFormState>({
    code: "",
    module: moduleOptions[0] || "通用",
    formType: "",
    name: "",
    initiators: [],
    approvalSteps: [],
    handlers: [],
    ccRecipients: [],
    status: "active",
  });

  const availableFormTypes = useMemo(() => {
    return uniqueStrings([
      ...formCatalog.filter((item) => item.module === formData.module).map((item) => item.formType),
      formData.formType,
    ]);
  }, [formCatalog, formData.module, formData.formType]);

  const availableForms = useMemo(() => {
    return uniqueStrings([
      ...formCatalog
        .filter((item) => item.module === formData.module && (!formData.formType || item.formType === formData.formType))
        .map((item) => item.formName),
      formData.name,
    ]);
  }, [formCatalog, formData.module, formData.formType, formData.name]);

  const filteredRecords = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return records.filter((item) => {
      const matchKeyword = !keyword || [item.code, item.name, item.module, item.formType]
        .some((field) => String(field ?? "").toLowerCase().includes(keyword));
      const matchModule = moduleFilter === "all" || item.module === moduleFilter;
      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      return matchKeyword && matchModule && matchStatus;
    });
  }, [records, searchTerm, moduleFilter, statusFilter]);

  const activeCount = records.filter((item) => item.status === "active").length;
  const buildDefaultCode = () => `WF-${String(records.length + 1).padStart(3, "0")}`;

  const readDisplayList = (raw: unknown) => parseJsonList(raw).map((item) => resolveUserLabel(item, userIdMap, userNameMap));

  const resetForm = () => {
    const defaultModule = moduleOptions[0] || "通用";
    const defaultTypes = uniqueStrings(formCatalog.filter((item) => item.module === defaultModule).map((item) => item.formType));
    const defaultType = defaultTypes[0] || "";
    const defaultForms = uniqueStrings(formCatalog.filter((item) => item.module === defaultModule && item.formType === defaultType).map((item) => item.formName));
    setEditingRecord(null);
    setFormData({
      code: buildDefaultCode(),
      module: defaultModule,
      formType: defaultType,
      name: defaultForms[0] || "",
      initiators: [],
      approvalSteps: [],
      handlers: [],
      ccRecipients: [],
      status: "active",
    });
  };

  const handleAdd = () => {
    if (!isAdmin) {
      toast.error("仅管理员可新增审批流程");
      return;
    }
    if (formCatalog.length === 0) {
      toast.error("暂无可配置表单", { description: "请先在具体表单页面开启“开始审批流程”" });
      return;
    }
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (record: WorkflowRecord) => {
    if (!isAdmin) {
      toast.error("仅管理员可编辑审批流程");
      return;
    }
    setEditingRecord(record);
    setFormData({
      code: record.code,
      module: record.module,
      formType: record.formType,
      name: record.name,
      initiators: parseStoredUserIds(record.initiators, userIdMap, userNameMap),
      approvalSteps: parseStoredUserIds(record.approvalSteps, userIdMap, userNameMap),
      handlers: parseStoredUserIds(record.handlers, userIdMap, userNameMap),
      ccRecipients: parseStoredUserIds(record.ccRecipients, userIdMap, userNameMap),
      status: record.status,
    });
    setDialogOpen(true);
  };

  const handleView = (record: WorkflowRecord) => {
    setViewingRecord(record);
    setViewDialogOpen(true);
  };

  const handleDelete = async (record: WorkflowRecord) => {
    if (!isAdmin) {
      toast.error("仅管理员可删除审批流程");
      return;
    }
    await deleteMutation.mutateAsync({ id: record.id });
    await refetch();
    toast.success("审批流程已删除");
  };

  const updateModule = (module: string) => {
    const nextTypes = uniqueStrings(formCatalog.filter((item) => item.module === module).map((item) => item.formType));
    const nextType = nextTypes.includes(formData.formType) ? formData.formType : (nextTypes[0] || "");
    const nextForms = uniqueStrings(formCatalog.filter((item) => item.module === module && (!nextType || item.formType === nextType)).map((item) => item.formName));
    const nextName = nextForms.includes(formData.name) ? formData.name : (nextForms[0] || "");
    setFormData((prev) => ({ ...prev, module, formType: nextType, name: nextName }));
  };

  const updateFormType = (formType: string) => {
    const nextForms = uniqueStrings(formCatalog.filter((item) => item.module === formData.module && item.formType === formType).map((item) => item.formName));
    const nextName = nextForms.includes(formData.name) ? formData.name : (nextForms[0] || "");
    setFormData((prev) => ({ ...prev, formType, name: nextName }));
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.module || !formData.formType || !formData.name) {
      toast.error("请完成表单选择", { description: "流程编码、所属模块、表单类型、表单为必填项" });
      return;
    }
    if (formData.initiators.length === 0) {
      toast.error("请选择发起人");
      return;
    }
    if (formData.approvalSteps.length === 0) {
      toast.error("请选择审核步骤");
      return;
    }

    const payload = {
      code: formData.code.trim(),
      name: formData.name,
      module: formData.module,
      formType: formData.formType,
      initiators: JSON.stringify(formData.initiators),
      approvalSteps: JSON.stringify(formData.approvalSteps),
      handlers: formData.handlers.length > 0 ? JSON.stringify(formData.handlers) : undefined,
      ccRecipients: formData.ccRecipients.length > 0 ? JSON.stringify(formData.ccRecipients) : undefined,
      description: WORKFLOW_RULE_NOTE,
      status: formData.status,
    };

    if (editingRecord) {
      await updateMutation.mutateAsync({ id: editingRecord.id, data: payload });
      toast.success("审批流程已更新");
    } else {
      await createMutation.mutateAsync(payload);
      toast.success("审批流程已创建");
    }
    setDialogOpen(false);
    await refetch();
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">审批流程设置</h2>
              <p className="text-sm text-muted-foreground">统一定义发起、审批、后续处理和流程结束抄送标准</p>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={!isAdmin}>
            <Plus className="mr-2 h-4 w-4" />
            新增流程
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{records.length}</div>
              <p className="text-sm text-muted-foreground">流程模板总数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{activeCount}</div>
              <p className="text-sm text-muted-foreground">启用中的流程</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{userOptions.length}</div>
              <p className="text-sm text-muted-foreground">可选用户人数</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-primary" />
                流程说明
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-slate-600">
              {WORKFLOW_RULE_NOTE}
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                配置原则
              </CardTitle>
            </CardHeader>
              <CardContent className="space-y-1.5 pt-0 text-sm text-slate-600">
              <p>1. 表单类型和表单从数据库表单库中选择，不手填。</p>
              <p>2. 发起、审核、处理、抄送对象从用户设置中选择，可多选。</p>
              <p>3. 审核步骤按选择顺序执行，前一步完成后才进入下一步。</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索流程编码、表单、表单类型..."
                  className="pl-9"
                />
              </div>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="筛选模块" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部模块</SelectItem>
                  {moduleOptions.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="筛选状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">流程标准清单</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 bg-muted/40">
                    <TableHead className="w-[110px] text-center font-bold">流程编码</TableHead>
                    <TableHead className="w-[100px] text-center font-bold">模块</TableHead>
                    <TableHead className="w-[120px] text-center font-bold">表单类型</TableHead>
                    <TableHead className="w-[150px] text-center font-bold">表单</TableHead>
                  <TableHead className="text-center font-bold">发起人</TableHead>
                    <TableHead className="text-center font-bold">审核步骤</TableHead>
                    <TableHead className="text-center font-bold">审核后处理</TableHead>
                    <TableHead className="text-center font-bold">结束抄送</TableHead>
                    <TableHead className="w-[80px] text-center font-bold">状态</TableHead>
                    <TableHead className="w-[70px] text-center font-bold">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">加载中...</TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">暂无审批流程模板</TableCell>
                    </TableRow>
                  ) : filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-center font-mono text-xs">{record.code}</TableCell>
                      <TableCell className="text-center">{record.module}</TableCell>
                      <TableCell className="text-center">{record.formType}</TableCell>
                      <TableCell className="text-center font-medium">{record.name}</TableCell>
                      <TableCell className="text-center">{renderSelectionPreview(readDisplayList(record.initiators))}</TableCell>
                      <TableCell className="text-center">{renderSelectionPreview(readDisplayList(record.approvalSteps))}</TableCell>
                      <TableCell className="text-center">{renderSelectionPreview(readDisplayList(record.handlers))}</TableCell>
                      <TableCell className="text-center">{renderSelectionPreview(readDisplayList(record.ccRecipients))}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={record.status === "active" ? "default" : "secondary"} className={getStatusSemanticClass(record.status)}>
                          {record.status === "active" ? "启用" : "停用"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(record)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(record)} disabled={!isAdmin}>
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(record)}
                              disabled={!isAdmin}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultWidth={960} defaultHeight={760}>
          <DraggableDialogContent>
            <div className="space-y-6 p-1">
              <DialogHeader>
                <DialogTitle>{editingRecord ? "编辑审批流程" : "新增审批流程"}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  使用数据库表单库和用户库配置流程，不再手工输入审批人文本。
                </p>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label>流程编码</Label>
                  <Input value={formData.code} readOnly className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>所属模块 *</Label>
                  <Select value={formData.module} onValueChange={updateModule}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {moduleOptions.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>表单类型 *</Label>
                  <Select value={formData.formType} onValueChange={updateFormType}>
                    <SelectTrigger><SelectValue placeholder="选择表单类型" /></SelectTrigger>
                    <SelectContent>
                      {availableFormTypes.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>表单 *</Label>
                  <Select value={formData.name} onValueChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}>
                    <SelectTrigger><SelectValue placeholder="选择表单" /></SelectTrigger>
                    <SelectContent>
                      {availableForms.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <UserMultiSelect
                  label="发起人选择 *"
                  value={formData.initiators}
                  options={userOptions}
                  onChange={(next) => setFormData((prev) => ({ ...prev, initiators: next }))}
                  helperText="从用户设置中选择可发起该流程的人员，可多选。"
                />
                <UserMultiSelect
                  label="审核步骤 *"
                  value={formData.approvalSteps}
                  options={userOptions}
                  onChange={(next) => setFormData((prev) => ({ ...prev, approvalSteps: next }))}
                  helperText="按选择顺序执行；如果发起人与当前审批人是同一人，则自动跳过该审批步骤。"
                  ordered
                />
                <UserMultiSelect
                  label="审核后处理对象"
                  value={formData.handlers}
                  options={userOptions}
                  onChange={(next) => setFormData((prev) => ({ ...prev, handlers: next }))}
                  helperText="审批完成后需要继续处理该表单的人员。"
                />
                <UserMultiSelect
                  label="流程结束抄送"
                  value={formData.ccRecipients}
                  options={userOptions}
                  onChange={(next) => setFormData((prev) => ({ ...prev, ccRecipients: next }))}
                  helperText="流程结束后自动接收通知的人员。"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <Card className="border-dashed border-primary/30 bg-primary/5">
                  <CardContent className="pt-6 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 text-primary" />
                      <p>{WORKFLOW_RULE_NOTE}</p>
                    </div>
                  </CardContent>
                </Card>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive") => setFormData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="inactive">停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  保存流程
                </Button>
              </div>
            </div>
          </DraggableDialogContent>
        </DraggableDialog>

        {/* 查看详情 */}
{viewingRecord && (
  <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
    <DraggableDialogContent>
      <div className="border-b pb-3">
        <h2 className="text-lg font-semibold">{viewingRecord.name}</h2>
        <p className="text-sm text-muted-foreground">
          {viewingRecord.code}
          {viewingRecord.status && (
            <>
              {' '}
              ·{' '}
              <Badge
                variant={viewingRecord.status === 'active' ? 'default' : 'secondary'}
                className={`ml-1 ${getStatusSemanticClass(viewingRecord.status)}`}
              >
                {viewingRecord.status === 'active' ? '启用' : '停用'}
              </Badge>
            </>
          )}
        </p>
      </div>
              <div className="space-y-6 py-4">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">流程基础信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="所属模块">{viewingRecord.module}</FieldRow>
            </div>
            <div>
              <FieldRow label="表单类型">{viewingRecord.formType}</FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">人员配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="发起人">
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {readDisplayList(viewingRecord.initiators).map((item) => (
                    <Badge key={item} variant="outline" className="font-normal">
                      {item}
                    </Badge>
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="审核后处理">
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {readDisplayList(viewingRecord.handlers).map((item) => (
                    <Badge key={item} variant="outline" className="font-normal">
                      {item}
                    </Badge>
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="结束抄送">
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {readDisplayList(viewingRecord.ccRecipients).map((item) => (
                    <Badge key={item} variant="outline" className="font-normal">
                      {item}
                    </Badge>
                  ))}
                </div>
              </FieldRow>
            </div>
            <div>
              <FieldRow label="审核步骤">
                <div className="space-y-2 text-right">
                  {readDisplayList(viewingRecord.approvalSteps).map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-center justify-end gap-2 text-sm">
                      <span>{index + 1}. {item}</span>
                      <GitBranch className="h-4 w-4 text-primary shrink-0" />
                    </div>
                  ))}
                </div>
              </FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
          <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">{WORKFLOW_RULE_NOTE}</p>
        </div>
      </div>

      <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">更新于: {formatDate(viewingRecord.updatedAt)}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
          <Button variant="outline" size="sm" onClick={() => handleEdit(viewingRecord)} disabled={!isAdmin}>编辑</Button>
        </div>
      </div>
    </DraggableDialogContent>
  </DraggableDialog>
)}
      </div>
    </ERPLayout>
  );
}
