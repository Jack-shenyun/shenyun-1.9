import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import ERPLayout from "@/components/ERPLayout";
import TablePaginationFooter from "@/components/TablePaginationFooter";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { trpc } from "@/lib/trpc";
import { formatDateValue, formatNumber, safeLower, toSafeNumber } from "@/lib/formatters";
import { toast } from "sonner";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calculator,
  CheckCircle2,
  Edit,
  Eye,
  MoreHorizontal,
  Percent,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SalarySettingRow = {
  id: number;
  personnelId: number;
  personnelName: string;
  employeeNo: string;
  department: string;
  position: string;
  personnelStatus: string;
  payrollType: "monthly" | "daily";
  baseSalary: string | number;
  fullAttendanceDays: string | number;
  overtimeHourlyRate: string | number;
  allowance: string | number;
  performanceBonus: string | number;
  socialSecurity: string | number;
  housingFund: string | number;
  otherDeduction: string | number;
  commissionEnabled: boolean;
  commissionRate: string | number;
  status: "active" | "inactive" | "unbound";
  remark: string;
  hasSetting: boolean;
  updatedAt?: string;
};

type PayrollRow = {
  id: number;
  payrollNo: string;
  periodMonth: string;
  personnelId: number;
  employeeNo: string;
  personnelName: string;
  departmentName: string;
  attendanceDays: number;
  overtimeHours: number;
  leaveHours: number;
  absenteeismDays: number;
  salesAmount: number;
  baseSalary: number;
  attendanceSalary: number;
  overtimePay: number;
  allowance: number;
  performanceBonus: number;
  commissionRate: number;
  commissionAmount: number;
  socialSecurity: number;
  housingFund: number;
  otherDeduction: number;
  grossSalary: number;
  netSalary: number;
  attendanceFileName: string;
  attendanceSnapshot: Record<string, unknown> | null;
  status: "draft" | "confirmed" | "paid";
  remark: string;
  createdAt?: string;
  updatedAt?: string;
};

type PayrollPreviewRow = PayrollRow & {
  attendanceFileName: string;
};

type PayrollPreviewResult = {
  rows: PayrollPreviewRow[];
  unmatchedRows: Array<{
    rowIndex: number;
    employeeNo: string;
    personnelName: string;
    reason: string;
  }>;
  summary: {
    totalRows: number;
    matchedRows: number;
    unmatchedRows: number;
    totalGrossSalary: number;
    totalNetSalary: number;
    totalCommissionAmount: number;
  };
};

type SalarySettingForm = {
  id?: number;
  personnelId: string;
  payrollType: "monthly" | "daily";
  baseSalary: string;
  fullAttendanceDays: string;
  overtimeHourlyRate: string;
  allowance: string;
  performanceBonus: string;
  socialSecurity: string;
  housingFund: string;
  otherDeduction: string;
  commissionEnabled: "enabled" | "disabled";
  commissionRate: string;
  status: "active" | "inactive";
  remark: string;
};

const PAGE_SIZE = 10;
const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

const settingStatusMeta: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "启用", variant: "default" },
  inactive: { label: "停用", variant: "secondary" },
  unbound: { label: "未绑定", variant: "outline" },
};

const payrollStatusMeta: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "草稿", variant: "outline" },
  confirmed: { label: "已确认", variant: "secondary" },
  paid: { label: "已发放", variant: "default" },
};

function buildDefaultSettingForm(): SalarySettingForm {
  return {
    personnelId: "",
    payrollType: "monthly",
    baseSalary: "0",
    fullAttendanceDays: "21.75",
    overtimeHourlyRate: "0",
    allowance: "0",
    performanceBonus: "0",
    socialSecurity: "0",
    housingFund: "0",
    otherDeduction: "0",
    commissionEnabled: "disabled",
    commissionRate: "0",
    status: "active",
    remark: "",
  };
}

function readCsvFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        resolve((result.data as Record<string, unknown>[]) || []);
      },
      error: (error) => reject(error),
    });
  });
}

function readExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

async function parseAttendanceFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "txt") {
    return readCsvFile(file);
  }
  if (ext === "xlsx" || ext === "xls") {
    return readExcelFile(file);
  }
  throw new Error("请上传 .xlsx、.xls 或 .csv 文件");
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );
}

export default function SalariesPage() {
  const trpcUtils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("settings");

  const [settingsSearch, setSettingsSearch] = useState("");
  const [settingsDepartmentFilter, setSettingsDepartmentFilter] = useState("all");
  const [settingsStatusFilter, setSettingsStatusFilter] = useState("all");
  const [settingsPage, setSettingsPage] = useState(1);

  const [payrollSearch, setPayrollSearch] = useState("");
  const [payrollMonthFilter, setPayrollMonthFilter] = useState(CURRENT_MONTH);
  const [payrollStatusFilter, setPayrollStatusFilter] = useState("all");
  const [payrollPage, setPayrollPage] = useState(1);

  const [settingDialogOpen, setSettingDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [settingForm, setSettingForm] = useState<SalarySettingForm>(buildDefaultSettingForm());
  const [editingSetting, setEditingSetting] = useState<SalarySettingRow | null>(null);
  const [viewingPayroll, setViewingPayroll] = useState<PayrollRow | null>(null);

  const [attendanceFileName, setAttendanceFileName] = useState("");
  const [attendanceRows, setAttendanceRows] = useState<Record<string, unknown>[]>([]);
  const [previewResult, setPreviewResult] = useState<PayrollPreviewResult | null>(null);

  const { data: departments = [] } = trpc.departments.list.useQuery();
  const { data: personnelList = [] } = trpc.personnel.list.useQuery({ limit: 5000, offset: 0 });
  const { data: salarySettingsData = [], isLoading: settingsLoading } = trpc.personnelSalary.listSettings.useQuery({
    search: settingsSearch || undefined,
    departmentId: settingsDepartmentFilter !== "all" ? Number(settingsDepartmentFilter) : undefined,
    status: settingsStatusFilter !== "all" ? settingsStatusFilter : undefined,
  });
  const { data: payrollData = [], isLoading: payrollLoading } = trpc.personnelSalary.listPayroll.useQuery({
    search: payrollSearch || undefined,
    periodMonth: payrollMonthFilter || undefined,
    status: payrollStatusFilter !== "all" ? payrollStatusFilter : undefined,
    limit: 1000,
    offset: 0,
  });

  const settingsRows = salarySettingsData as unknown as SalarySettingRow[];
  const payrollRows = payrollData as unknown as PayrollRow[];

  const saveSettingMutation = trpc.personnelSalary.saveSetting.useMutation({
    onSuccess: async () => {
      await trpcUtils.personnelSalary.listSettings.invalidate();
      toast.success(editingSetting?.hasSetting ? "工资设置已更新" : "工资设置已创建");
      setSettingDialogOpen(false);
      setEditingSetting(null);
      setSettingForm(buildDefaultSettingForm());
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteSettingMutation = trpc.personnelSalary.deleteSetting.useMutation({
    onSuccess: async () => {
      await trpcUtils.personnelSalary.listSettings.invalidate();
      toast.success("工资设置已删除");
    },
    onError: (error) => toast.error(error.message),
  });

  const previewAttendanceMutation = trpc.personnelSalary.previewAttendance.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const importAttendanceMutation = trpc.personnelSalary.importAttendance.useMutation({
    onSuccess: async (result) => {
      await trpcUtils.personnelSalary.listPayroll.invalidate();
      toast.success(`已生成工资单 ${result.createdCount + result.updatedCount} 条`);
      setUploadDialogOpen(false);
      setAttendanceFileName("");
      setAttendanceRows([]);
      setPreviewResult(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePayrollStatusMutation = trpc.personnelSalary.updatePayrollStatus.useMutation({
    onSuccess: async () => {
      await trpcUtils.personnelSalary.listPayroll.invalidate();
      toast.success("工资单状态已更新");
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePayrollMutation = trpc.personnelSalary.deletePayroll.useMutation({
    onSuccess: async () => {
      await trpcUtils.personnelSalary.listPayroll.invalidate();
      toast.success("工资单已删除");
      setDetailDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    setSettingsPage(1);
  }, [settingsSearch, settingsDepartmentFilter, settingsStatusFilter]);

  useEffect(() => {
    setPayrollPage(1);
  }, [payrollSearch, payrollMonthFilter, payrollStatusFilter]);

  const totalBoundPersonnel = useMemo(
    () => settingsRows.filter((row) => row.hasSetting).length,
    [settingsRows],
  );
  const draftPayrollCount = useMemo(
    () => payrollRows.filter((row) => row.status === "draft").length,
    [payrollRows],
  );
  const currentMonthPayrollCount = useMemo(
    () => payrollRows.filter((row) => row.periodMonth === payrollMonthFilter).length,
    [payrollRows, payrollMonthFilter],
  );
  const currentMonthNetSalary = useMemo(
    () => payrollRows
      .filter((row) => row.periodMonth === payrollMonthFilter)
      .reduce((sum, row) => sum + toSafeNumber(row.netSalary), 0),
    [payrollMonthFilter, payrollRows],
  );

  const pagedSettings = useMemo(
    () => settingsRows.slice((settingsPage - 1) * PAGE_SIZE, settingsPage * PAGE_SIZE),
    [settingsPage, settingsRows],
  );
  const pagedPayroll = useMemo(
    () => payrollRows.slice((payrollPage - 1) * PAGE_SIZE, payrollPage * PAGE_SIZE),
    [payrollPage, payrollRows],
  );

  const selectedPersonnel = useMemo(
    () => (personnelList as any[]).find((row) => Number(row.id) === Number(settingForm.personnelId || 0)),
    [personnelList, settingForm.personnelId],
  );

  const handleOpenSettingDialog = (row?: SalarySettingRow) => {
    if (!row) {
      setEditingSetting(null);
      setSettingForm(buildDefaultSettingForm());
      setSettingDialogOpen(true);
      return;
    }
    setEditingSetting(row);
    setSettingForm({
      id: row.id || undefined,
      personnelId: String(row.personnelId || ""),
      payrollType: row.payrollType || "monthly",
      baseSalary: String(row.baseSalary || "0"),
      fullAttendanceDays: String(row.fullAttendanceDays || "21.75"),
      overtimeHourlyRate: String(row.overtimeHourlyRate || "0"),
      allowance: String(row.allowance || "0"),
      performanceBonus: String(row.performanceBonus || "0"),
      socialSecurity: String(row.socialSecurity || "0"),
      housingFund: String(row.housingFund || "0"),
      otherDeduction: String(row.otherDeduction || "0"),
      commissionEnabled: row.commissionEnabled ? "enabled" : "disabled",
      commissionRate: String(row.commissionRate || "0"),
      status: row.status === "inactive" ? "inactive" : "active",
      remark: row.remark || "",
    });
    setSettingDialogOpen(true);
  };

  const handleSaveSetting = () => {
    if (!settingForm.personnelId) {
      toast.error("请选择绑定人员");
      return;
    }
    saveSettingMutation.mutate({
      id: editingSetting?.hasSetting ? editingSetting.id : undefined,
      personnelId: Number(settingForm.personnelId),
      payrollType: settingForm.payrollType,
      baseSalary: settingForm.baseSalary,
      fullAttendanceDays: settingForm.fullAttendanceDays,
      overtimeHourlyRate: settingForm.overtimeHourlyRate,
      allowance: settingForm.allowance,
      performanceBonus: settingForm.performanceBonus,
      socialSecurity: settingForm.socialSecurity,
      housingFund: settingForm.housingFund,
      otherDeduction: settingForm.otherDeduction,
      commissionEnabled: settingForm.commissionEnabled === "enabled",
      commissionRate: settingForm.commissionRate,
      status: settingForm.status,
      remark: settingForm.remark,
    });
  };

  const handleAttendanceFileChange = async (file?: File) => {
    if (!file) return;
    try {
      const rows = await parseAttendanceFile(file);
      if (rows.length === 0) {
        toast.error("考勤文件中没有可用数据");
        return;
      }
      setAttendanceFileName(file.name);
      setAttendanceRows(rows);
      setPreviewResult(null);
      toast.success(`已读取 ${rows.length} 条考勤记录`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "考勤文件解析失败");
    }
  };

  const handlePreviewPayroll = async () => {
    if (!payrollMonthFilter) {
      toast.error("请选择工资期间");
      return;
    }
    if (attendanceRows.length === 0) {
      toast.error("请先上传考勤文件");
      return;
    }
    const result = await previewAttendanceMutation.mutateAsync({
      periodMonth: payrollMonthFilter,
      attendanceFileName,
      rows: attendanceRows,
    });
    setPreviewResult(result as PayrollPreviewResult);
    toast.success("工资预览已生成");
  };

  const handleImportPayroll = async () => {
    if (!previewResult) {
      toast.error("请先预览核算结果");
      return;
    }
    await importAttendanceMutation.mutateAsync({
      periodMonth: payrollMonthFilter,
      attendanceFileName,
      rows: attendanceRows,
    });
  };

  const handleOpenPayrollDetail = (row: PayrollRow) => {
    setViewingPayroll(row);
    setDetailDialogOpen(true);
  };

  const statusSummaryCards = [
    { label: "已绑定人员", value: totalBoundPersonnel, color: "text-primary", icon: Users },
    { label: "本月工资单", value: currentMonthPayrollCount, color: "text-blue-600", icon: Calculator },
    { label: "待确认", value: draftPayrollCount, color: "text-orange-600", icon: CheckCircle2 },
    { label: "本月实发", value: formatNumber(currentMonthNetSalary), color: "text-green-600", icon: Wallet },
  ];

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">人员工资</h2>
              <p className="text-sm text-muted-foreground">绑定人事人员，导入考勤自动核算工资与业务提成</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="mr-1 h-4 w-4" />
              上传考勤并核算
            </Button>
            <Button onClick={() => handleOpenSettingDialog()}>
              <Plus className="mr-1 h-4 w-4" />
              新增工资设置
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statusSummaryCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto">
                <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                  工资设置
                </TabsTrigger>
                <TabsTrigger value="payroll" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                  工资核算
                </TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="搜索工号、姓名、部门..."
                      value={settingsSearch}
                      onChange={(event) => setSettingsSearch(event.target.value)}
                    />
                  </div>
                  <Select value={settingsDepartmentFilter} onValueChange={setSettingsDepartmentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="全部部门" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部部门</SelectItem>
                      {(departments as any[]).map((department) => (
                        <SelectItem key={department.id} value={String(department.id)}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={settingsStatusFilter} onValueChange={setSettingsStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="全部状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="inactive">停用</SelectItem>
                      <SelectItem value="unbound">未绑定</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>工号</TableHead>
                        <TableHead>姓名</TableHead>
                        <TableHead>部门</TableHead>
                        <TableHead>岗位</TableHead>
                        <TableHead>底薪</TableHead>
                        <TableHead>满勤天数</TableHead>
                        <TableHead>提成比例</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settingsLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                            正在加载工资设置...
                          </TableCell>
                        </TableRow>
                      ) : pagedSettings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                            暂无人员工资设置
                          </TableCell>
                        </TableRow>
                      ) : (
                        pagedSettings.map((row) => {
                          const meta = settingStatusMeta[row.status] || settingStatusMeta.unbound;
                          return (
                            <TableRow key={`${row.personnelId}-${row.id || "new"}`}>
                              <TableCell className="font-mono">{row.employeeNo || "-"}</TableCell>
                              <TableCell className="font-medium">{row.personnelName}</TableCell>
                              <TableCell>{row.department || "-"}</TableCell>
                              <TableCell>{row.position || "-"}</TableCell>
                              <TableCell>{formatNumber(row.baseSalary)}</TableCell>
                              <TableCell>{row.fullAttendanceDays}</TableCell>
                              <TableCell>
                                {row.commissionEnabled ? `${formatNumber(row.commissionRate)}%` : "未启用"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={meta.variant} className={getStatusSemanticClass(row.status, meta.label)}>
                                  {meta.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenSettingDialog(row)}>
                                  {row.hasSetting ? "修改" : "绑定"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  <TablePaginationFooter total={settingsRows.length} page={settingsPage} pageSize={PAGE_SIZE} onPageChange={setSettingsPage} />
                </div>
              </TabsContent>

              <TabsContent value="payroll" className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="搜索工资单号、姓名、部门..."
                      value={payrollSearch}
                      onChange={(event) => setPayrollSearch(event.target.value)}
                    />
                  </div>
                  <Input type="month" value={payrollMonthFilter} onChange={(event) => setPayrollMonthFilter(event.target.value)} />
                  <Select value={payrollStatusFilter} onValueChange={setPayrollStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="全部状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="confirmed">已确认</SelectItem>
                      <SelectItem value="paid">已发放</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>工资单号</TableHead>
                        <TableHead>期间</TableHead>
                        <TableHead>人员</TableHead>
                        <TableHead>出勤天数</TableHead>
                        <TableHead>提成金额</TableHead>
                        <TableHead>应发工资</TableHead>
                        <TableHead>实发工资</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                            正在加载工资单...
                          </TableCell>
                        </TableRow>
                      ) : pagedPayroll.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                            暂无工资核算记录
                          </TableCell>
                        </TableRow>
                      ) : (
                        pagedPayroll.map((row) => {
                          const meta = payrollStatusMeta[row.status] || payrollStatusMeta.draft;
                          return (
                            <TableRow key={row.id}>
                              <TableCell className="font-mono">{row.payrollNo}</TableCell>
                              <TableCell>{row.periodMonth}</TableCell>
                              <TableCell>
                                <div className="font-medium">{row.personnelName}</div>
                                <div className="text-xs text-muted-foreground">{row.departmentName || "-"}</div>
                              </TableCell>
                              <TableCell>{formatNumber(row.attendanceDays)}</TableCell>
                              <TableCell>{formatNumber(row.commissionAmount)}</TableCell>
                              <TableCell>{formatNumber(row.grossSalary)}</TableCell>
                              <TableCell className="font-semibold text-green-600">{formatNumber(row.netSalary)}</TableCell>
                              <TableCell>
                                <Badge variant={meta.variant} className={getStatusSemanticClass(row.status, meta.label)}>
                                  {meta.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => handleOpenPayrollDetail(row)}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      查看详情
                                    </DropdownMenuItem>
                                    {row.status === "draft" ? (
                                      <DropdownMenuItem onSelect={() => updatePayrollStatusMutation.mutate({ id: row.id, status: "confirmed" })}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        确认工资单
                                      </DropdownMenuItem>
                                    ) : null}
                                    {row.status !== "paid" ? (
                                      <DropdownMenuItem onSelect={() => updatePayrollStatusMutation.mutate({ id: row.id, status: "paid" })}>
                                        <Wallet className="mr-2 h-4 w-4" />
                                        标记已发放
                                      </DropdownMenuItem>
                                    ) : null}
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onSelect={() => deletePayrollMutation.mutate({ id: row.id })}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      删除
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  <TablePaginationFooter total={payrollRows.length} page={payrollPage} pageSize={PAGE_SIZE} onPageChange={setPayrollPage} />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <DraggableDialog open={settingDialogOpen} onOpenChange={setSettingDialogOpen} defaultWidth={960} defaultHeight={720}>
        <DraggableDialogContent className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editingSetting?.hasSetting ? "修改工资设置" : "新增工资设置"}</DialogTitle>
            <DialogDescription>绑定人事管理人员，设置固定工资、扣款项和业务提成比例。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>绑定人员</Label>
              <Select value={settingForm.personnelId} onValueChange={(value) => setSettingForm((prev) => ({ ...prev, personnelId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="选择人事人员" />
                </SelectTrigger>
                <SelectContent>
                  {(personnelList as any[]).map((row) => (
                    <SelectItem key={row.id} value={String(row.id)}>
                      {row.employeeNo} · {row.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>工资类型</Label>
              <Select value={settingForm.payrollType} onValueChange={(value: "monthly" | "daily") => setSettingForm((prev) => ({ ...prev, payrollType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">月薪制</SelectItem>
                  <SelectItem value="daily">日薪制</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4 md:col-span-2">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">部门：</span>
                  <span>{selectedPersonnel?.department || "-"}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">岗位：</span>
                  <span>{selectedPersonnel?.position || "-"}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">人员状态：</span>
                  <span>{selectedPersonnel?.status || "-"}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>基础工资</Label>
              <Input value={settingForm.baseSalary} onChange={(event) => setSettingForm((prev) => ({ ...prev, baseSalary: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>满勤天数</Label>
              <Input value={settingForm.fullAttendanceDays} onChange={(event) => setSettingForm((prev) => ({ ...prev, fullAttendanceDays: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>加班时薪</Label>
              <Input value={settingForm.overtimeHourlyRate} onChange={(event) => setSettingForm((prev) => ({ ...prev, overtimeHourlyRate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>津贴补助</Label>
              <Input value={settingForm.allowance} onChange={(event) => setSettingForm((prev) => ({ ...prev, allowance: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>绩效奖金</Label>
              <Input value={settingForm.performanceBonus} onChange={(event) => setSettingForm((prev) => ({ ...prev, performanceBonus: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>其他扣款</Label>
              <Input value={settingForm.otherDeduction} onChange={(event) => setSettingForm((prev) => ({ ...prev, otherDeduction: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>社保</Label>
              <Input value={settingForm.socialSecurity} onChange={(event) => setSettingForm((prev) => ({ ...prev, socialSecurity: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>公积金</Label>
              <Input value={settingForm.housingFund} onChange={(event) => setSettingForm((prev) => ({ ...prev, housingFund: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>业务提成</Label>
              <Select value={settingForm.commissionEnabled} onValueChange={(value: "enabled" | "disabled") => setSettingForm((prev) => ({ ...prev, commissionEnabled: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">不启用</SelectItem>
                  <SelectItem value="enabled">启用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>提成比例（%）</Label>
              <Input value={settingForm.commissionRate} onChange={(event) => setSettingForm((prev) => ({ ...prev, commissionRate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>设置状态</Label>
              <Select value={settingForm.status} onValueChange={(value: "active" | "inactive") => setSettingForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>备注</Label>
              <Textarea rows={3} value={settingForm.remark} onChange={(event) => setSettingForm((prev) => ({ ...prev, remark: event.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            {editingSetting?.hasSetting ? (
              <Button
                type="button"
                variant="outline"
                className="mr-auto text-destructive"
                onClick={() => deleteSettingMutation.mutate({ id: editingSetting.id })}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                删除
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setSettingDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleSaveSetting} disabled={saveSettingMutation.isPending}>
              {saveSettingMutation.isPending ? "保存中..." : "保存设置"}
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      <DraggableDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} defaultWidth={1180} defaultHeight={760}>
        <DraggableDialogContent className="space-y-4">
          <DialogHeader>
            <DialogTitle>上传考勤并核算工资</DialogTitle>
            <DialogDescription>上传 Excel 或 CSV 考勤记录，系统会自动匹配人员、计算工资和业务提成。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-[220px_1fr_auto]">
            <div className="space-y-2">
              <Label>工资期间</Label>
              <Input type="month" value={payrollMonthFilter} onChange={(event) => setPayrollMonthFilter(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>考勤文件</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => handleAttendanceFileChange(event.target.files?.[0])}
              />
              <div className="text-xs text-muted-foreground">
                支持字段：工号、姓名、出勤天数、加班小时、请假小时、旷工天数、销售额
              </div>
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handlePreviewPayroll} disabled={previewAttendanceMutation.isPending}>
                {previewAttendanceMutation.isPending ? "核算中..." : "预览核算"}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            {attendanceFileName ? `当前文件：${attendanceFileName}，共 ${attendanceRows.length} 行考勤数据` : "请先上传考勤文件"}
          </div>

          {previewResult ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">匹配成功</div><div className="text-2xl font-bold text-primary">{previewResult.summary.matchedRows}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">未匹配</div><div className="text-2xl font-bold text-orange-600">{previewResult.summary.unmatchedRows}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">应发合计</div><div className="text-2xl font-bold text-blue-600">{formatNumber(previewResult.summary.totalGrossSalary)}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">实发合计</div><div className="text-2xl font-bold text-green-600">{formatNumber(previewResult.summary.totalNetSalary)}</div></CardContent></Card>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>人员</TableHead>
                      <TableHead>出勤</TableHead>
                      <TableHead>销售额</TableHead>
                      <TableHead>提成</TableHead>
                      <TableHead>应发</TableHead>
                      <TableHead>实发</TableHead>
                      <TableHead>备注</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewResult.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                          当前考勤文件未匹配到可核算人员
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewResult.rows.slice(0, 20).map((row) => (
                        <TableRow key={`${row.periodMonth}-${row.personnelId}`}>
                          <TableCell>
                            <div className="font-medium">{row.personnelName}</div>
                            <div className="text-xs text-muted-foreground">{row.employeeNo}</div>
                          </TableCell>
                          <TableCell>{formatNumber(row.attendanceDays)}</TableCell>
                          <TableCell>{formatNumber(row.salesAmount)}</TableCell>
                          <TableCell>{formatNumber(row.commissionAmount)}</TableCell>
                          <TableCell>{formatNumber(row.grossSalary)}</TableCell>
                          <TableCell className="font-semibold text-green-600">{formatNumber(row.netSalary)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.remark || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {previewResult.unmatchedRows.length > 0 ? (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                  未匹配人员：
                  {previewResult.unmatchedRows.map((row) => row.personnelName || row.employeeNo || `第${row.rowIndex}行`).join("、")}
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleImportPayroll} disabled={!previewResult || importAttendanceMutation.isPending}>
              {importAttendanceMutation.isPending ? "生成中..." : "生成工资单"}
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      <DraggableDialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen} defaultWidth={900} defaultHeight={720}>
        <DraggableDialogContent className="space-y-4">
          <DialogHeader>
            <DialogTitle>工资单详情</DialogTitle>
            <DialogDescription>{viewingPayroll?.payrollNo || "-"}</DialogDescription>
          </DialogHeader>

          {viewingPayroll ? (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">基本信息</h3>
                <div className="grid gap-x-8 md:grid-cols-2">
                  <div>
                    <FieldRow label="工资单号">{viewingPayroll.payrollNo}</FieldRow>
                    <FieldRow label="期间">{viewingPayroll.periodMonth}</FieldRow>
                    <FieldRow label="人员">{viewingPayroll.personnelName}</FieldRow>
                    <FieldRow label="部门">{viewingPayroll.departmentName || "-"}</FieldRow>
                  </div>
                  <div>
                    <FieldRow label="工号">{viewingPayroll.employeeNo || "-"}</FieldRow>
                    <FieldRow label="状态">{payrollStatusMeta[viewingPayroll.status]?.label || viewingPayroll.status}</FieldRow>
                    <FieldRow label="考勤文件">{viewingPayroll.attendanceFileName || "-"}</FieldRow>
                    <FieldRow label="更新时间">{formatDateValue(viewingPayroll.updatedAt, true)}</FieldRow>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">考勤与提成</h3>
                <div className="grid gap-x-8 md:grid-cols-2">
                  <div>
                    <FieldRow label="出勤天数">{formatNumber(viewingPayroll.attendanceDays)}</FieldRow>
                    <FieldRow label="加班小时">{formatNumber(viewingPayroll.overtimeHours)}</FieldRow>
                    <FieldRow label="请假小时">{formatNumber(viewingPayroll.leaveHours)}</FieldRow>
                    <FieldRow label="旷工天数">{formatNumber(viewingPayroll.absenteeismDays)}</FieldRow>
                  </div>
                  <div>
                    <FieldRow label="销售额">{formatNumber(viewingPayroll.salesAmount)}</FieldRow>
                    <FieldRow label="提成比例">{formatNumber(viewingPayroll.commissionRate)}%</FieldRow>
                    <FieldRow label="提成金额">{formatNumber(viewingPayroll.commissionAmount)}</FieldRow>
                    <FieldRow label="考勤快照">{viewingPayroll.attendanceSnapshot ? `${Object.keys(viewingPayroll.attendanceSnapshot).length} 个字段` : "-"}</FieldRow>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">工资构成</h3>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>基础工资</TableHead>
                        <TableHead>出勤工资</TableHead>
                        <TableHead>加班工资</TableHead>
                        <TableHead>津贴补助</TableHead>
                        <TableHead>绩效奖金</TableHead>
                        <TableHead>提成金额</TableHead>
                        <TableHead>应发工资</TableHead>
                        <TableHead>实发工资</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>{formatNumber(viewingPayroll.baseSalary)}</TableCell>
                        <TableCell>{formatNumber(viewingPayroll.attendanceSalary)}</TableCell>
                        <TableCell>{formatNumber(viewingPayroll.overtimePay)}</TableCell>
                        <TableCell>{formatNumber(viewingPayroll.allowance)}</TableCell>
                        <TableCell>{formatNumber(viewingPayroll.performanceBonus)}</TableCell>
                        <TableCell>{formatNumber(viewingPayroll.commissionAmount)}</TableCell>
                        <TableCell>{formatNumber(viewingPayroll.grossSalary)}</TableCell>
                        <TableCell className="font-semibold text-green-600">{formatNumber(viewingPayroll.netSalary)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3 grid gap-x-8 md:grid-cols-2">
                  <div>
                    <FieldRow label="社保">{formatNumber(viewingPayroll.socialSecurity)}</FieldRow>
                    <FieldRow label="公积金">{formatNumber(viewingPayroll.housingFund)}</FieldRow>
                  </div>
                  <div>
                    <FieldRow label="其他扣款">{formatNumber(viewingPayroll.otherDeduction)}</FieldRow>
                    <FieldRow label="备注">{viewingPayroll.remark || "-"}</FieldRow>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>
    </ERPLayout>
  );
}
