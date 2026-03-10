import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import ModulePage, { Column, StatusBadge } from "@/components/ModulePage";
import { Receipt, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusMap: Record<string, any> = {
  draft: { label: "草稿", variant: "outline" },
  pending_approval: { label: "审批中", variant: "secondary" },
  approved: { label: "已通过", variant: "default" },
  rejected: { label: "已驳回", variant: "destructive" },
  paid: { label: "已支付", variant: "default" },
  cancelled: { label: "已取消", variant: "outline" },
};

const expenseTypeOptions = [
  "差旅费",
  "办公费",
  "招待费",
  "交通费",
  "通讯费",
  "补贴",
  "其他",
];

type ExpenseLine = {
  id: string;
  expenseDate: string;
  expenseType: string;
  invoiceType: string;
  taxRate: string;
  amount: string;
  remark: string;
  attachmentName: string;
};

type FormState = {
  reimbursementNo: string;
  applicantId: string;
  applicantName: string;
  department: string;
  applyDate: string;
  title: string;
  note: string;
  status: string;
  lines: ExpenseLine[];
};

const REMARK_PREFIX = "__EXPENSE_DETAIL__:";

function toNumber(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function makeLine(index = 1): ExpenseLine {
  return {
    id: `${Date.now()}-${index}`,
    expenseDate: "",
    expenseType: "差旅费",
    invoiceType: "增值税专用发票",
    taxRate: "13",
    amount: "",
    remark: "",
    attachmentName: "",
  };
}

function parseRemark(remark?: string | null): { note: string; lines: ExpenseLine[] } {
  const raw = String(remark || "");
  if (!raw.startsWith(REMARK_PREFIX)) return { note: raw, lines: [] };
  try {
    const parsed = JSON.parse(raw.slice(REMARK_PREFIX.length));
    const lines = Array.isArray(parsed?.lines)
      ? parsed.lines.map((item: any, idx: number) => ({
          ...makeLine(idx + 1),
          ...item,
          // 兼容旧数据字段
          expenseDate: item.expenseDate || item.invoiceDate || "",
          expenseType: item.expenseType || item.expenseDesc || "",
          amount: item.amount || item.amountIncTax || "",
          remark: item.remark || "",
          attachmentName: item.attachmentName || "",
          id: `${Date.now()}-${idx + 1}`,
        }))
      : [];
    return { note: String(parsed?.note || ""), lines };
  } catch {
    return { note: "", lines: [] };
  }
}

function splitMainDepartment(raw: string) {
  return String(raw || "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)[0] || "";
}

function buildAutoTitle(applicantName: string, applyDate: string) {
  const name = String(applicantName || "员工").trim() || "员工";
  const date = String(applyDate || "");
  const month = date && date.length >= 7 ? Number(date.slice(5, 7)) : new Date().getMonth() + 1;
  return `${name}${month}月份报销`;
}

export default function ExpensePage() {
  const { user } = useAuth();
  const { data = [], isLoading, refetch } = trpc.expenseReimbursements.list.useQuery();
  const { data: usersData = [] } = trpc.users.list.useQuery();
  const createMutation = trpc.expenseReimbursements.create.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("提交成功");
    },
  });
  const updateMutation = trpc.expenseReimbursements.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("更新成功");
    },
  });
  const deleteMutation = trpc.expenseReimbursements.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("删除成功");
    },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [titleTouched, setTitleTouched] = useState(false);
  const [form, setForm] = useState<FormState>({
    reimbursementNo: "",
    applicantId: "",
    applicantName: "",
    department: "",
    applyDate: "",
    title: "",
    note: "",
    status: "draft",
    lines: [],
  });

  const users = useMemo(
    () =>
      (usersData || []).map((u: any) => ({
        id: String(u.id),
        name: u.name || "",
        department: splitMainDepartment(u.department || ""),
      })),
    [usersData],
  );

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    const base = ["管理部", "招商部", "销售部", "研发部", "生产部", "质量部", "采购部", "仓库管理", "财务部"];
    base.forEach((d) => set.add(d));
    return Array.from(set);
  }, [users]);

  const columns: Column<any>[] = [
    { key: "reimbursementNo", title: "报销单号", width: "160px" },
    { key: "department", title: "部门", width: "120px" },
    { key: "applyDate", title: "申请日期", width: "120px" },
    {
      key: "description",
      title: "报销标题",
      width: "220px",
      render: (v) => String(v || "").split("\n")[0] || "-",
    },
    {
      key: "totalAmount",
      title: "总金额",
      width: "120px",
      render: (v, row) => `${row.currency || "CNY"} ${parseFloat(v || 0).toLocaleString()}`,
    },
    { key: "status", title: "状态", width: "100px", render: (v) => <StatusBadge status={v} statusMap={statusMap} /> },
  ];

  useEffect(() => {
    if (!formOpen) return;
    if (editingRecord) {
      const parsed = parseRemark(editingRecord.remark);
      const lines = parsed.lines.length > 0 ? parsed.lines : [makeLine(1)];
      const title = String(editingRecord.description || "").split("\n")[0] || "";
      setForm({
        reimbursementNo: editingRecord.reimbursementNo || "",
        applicantId: user?.id ? String(user.id) : "",
        applicantName: user?.name || "",
        department: editingRecord.department || user?.department || "",
        applyDate: editingRecord.applyDate ? String(editingRecord.applyDate).slice(0, 10) : "",
        title,
        note: parsed.note || "",
        status: editingRecord.status || "draft",
        lines,
      });
      setTitleTouched(true);
    } else {
      const nextApplyDate = new Date().toISOString().slice(0, 10);
      const nextApplicantName = user?.name || "";
      setForm({
        reimbursementNo: `EXP-${new Date().getFullYear()}-${String((data?.length || 0) + 1).padStart(4, "0")}`,
        applicantId: user?.id ? String(user.id) : "",
        applicantName: nextApplicantName,
        department: splitMainDepartment(user?.department || ""),
        applyDate: nextApplyDate,
        title: buildAutoTitle(nextApplicantName, nextApplyDate),
        note: "",
        status: "draft",
        lines: [],
      });
      setTitleTouched(false);
    }
  }, [formOpen, editingRecord, data?.length, user?.department, user?.id, user?.name]);

  const totalAmount = useMemo(
    () => form.lines.reduce((sum, line) => sum + toNumber(line.amount), 0),
    [form.lines],
  );

  const upsertLine = (id: string, patch: Partial<ExpenseLine>) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    }));
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, makeLine(prev.lines.length + 1)],
    }));
  };

  const handleApplicantChange = (id: string) => {
    const selected = users.find((u) => u.id === id);
    setForm((prev) => {
      const nextApplicantName = selected?.name || "";
      const next = {
        ...prev,
        applicantId: id,
        applicantName: nextApplicantName,
        department: selected?.department || prev.department,
      };
      if (!titleTouched) {
        next.title = buildAutoTitle(nextApplicantName, prev.applyDate);
      }
      return next;
    });
  };

  const handleBatchUpload = () => {
    toast.info("批量上传发票入口已开启，下一步可接入OCR自动拆分明细。");
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error("请填写报销标题");
      return;
    }
    if (!form.applyDate) {
      toast.error("请选择申请日期");
      return;
    }
    const payload = {
      reimbursementNo: form.reimbursementNo,
      department: form.department || splitMainDepartment(user?.department || "管理部") || "管理部",
      applyDate: form.applyDate,
      totalAmount: totalAmount.toFixed(2),
      currency: "CNY",
      category: "other" as const,
      description: `${form.title}\n${form.note || ""}`.trim(),
      remark: `${REMARK_PREFIX}${JSON.stringify({ note: form.note, lines: form.lines })}`,
    };
    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        data: {
          totalAmount: payload.totalAmount,
          description: payload.description,
          remark: payload.remark,
          status: form.status as any,
        },
      });
    } else {
      createMutation.mutate(payload);
    }
    setFormOpen(false);
  };

  return (
    <>
      <ModulePage
        title="费用报销"
        description="管理员工日常费用报销申请及审批流程"
        icon={Receipt}
        columns={columns}
        data={data}
        loading={isLoading}
        compact
        onAdd={() => {
          setEditingRecord(null);
          setFormOpen(true);
        }}
        onEdit={(record) => {
          setEditingRecord(record);
          setFormOpen(true);
        }}
        onDelete={(record) => deleteMutation.mutate({ id: record.id })}
      />

      <DraggableDialog open={formOpen} onOpenChange={setFormOpen} defaultWidth={980} defaultHeight={760} enableSearch={false}>
        <DraggableDialogContent>
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">{editingRecord ? "编辑报销申请" : "新建报销申请"}</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>报销人 *</Label>
                <Select value={form.applicantId || ""} onValueChange={handleApplicantChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="输入姓名" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>所属部门</Label>
                <Select
                  value={form.department || undefined}
                  onValueChange={(value) => setForm((p) => ({ ...p, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="自动带出或手动选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((dep) => (
                      <SelectItem key={dep} value={dep}>
                        {dep}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>申请日期</Label>
                <Input
                  type="date"
                  value={form.applyDate}
                  onChange={(e) =>
                    setForm((p) => {
                      const nextDate = e.target.value;
                      const next = { ...p, applyDate: nextDate };
                      if (!titleTouched) {
                        next.title = buildAutoTitle(p.applicantName, nextDate);
                      }
                      return next;
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>报销标题 *</Label>
              <Input
                value={form.title}
                placeholder="如：3月出差费用报销"
                onChange={(e) => {
                  setTitleTouched(true);
                  setForm((p) => ({ ...p, title: e.target.value }));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>备注说明</Label>
              <Textarea value={form.note} placeholder="可选填写报销说明" rows={3} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h4 className="text-xl font-semibold">费用明细（发票列表）</h4>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleBatchUpload}>
                    <Upload className="h-4 w-4 mr-2" />
                    批量上传发票（AI识别）
                  </Button>
                  <Button type="button" variant="outline" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-2" />
                    手动添加一行
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                支持批量上传多张发票图片，AI自动识别发票信息并填入明细，识别后可手动修正。
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                审批流程：提交人 → 部门审批 → 总经理审批 → 财务付款
              </p>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>日期</TableHead>
                    <TableHead>费用类型</TableHead>
                    <TableHead>发票类型</TableHead>
                        <TableHead>税率</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>发票上传</TableHead>
                        <TableHead>备注</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.lines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                            暂无明细，点击「手动添加一行」或「批量上传发票」
                          </TableCell>
                        </TableRow>
                  ) : (
                    form.lines.map((line, idx) => (
                      <TableRow key={line.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Input type="date" value={line.expenseDate} onChange={(e) => upsertLine(line.id, { expenseDate: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Select value={line.expenseType} onValueChange={(value) => upsertLine(line.id, { expenseType: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择费用类型" />
                            </SelectTrigger>
                            <SelectContent>
                              {expenseTypeOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input value={line.invoiceType} onChange={(e) => upsertLine(line.id, { invoiceType: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={line.taxRate} onChange={(e) => upsertLine(line.id, { taxRate: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={line.amount} onChange={(e) => upsertLine(line.id, { amount: e.target.value })} />
                        </TableCell>
                        <TableCell className="min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                upsertLine(line.id, { attachmentName: file.name });
                                toast.success(`已选择文件：${file.name}`);
                              }}
                            />
                          </div>
                          {line.attachmentName ? (
                            <p className="mt-1 text-xs text-muted-foreground truncate" title={line.attachmentName}>
                              已选：{line.attachmentName}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Input value={line.remark} onChange={(e) => upsertLine(line.id, { remark: e.target.value })} placeholder="备注" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                合计金额：¥{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
                <Button type="button" onClick={handleSubmit}>提交报销申请</Button>
              </div>
            </div>
          </div>
        </DraggableDialogContent>
      </DraggableDialog>
    </>
  );
}
