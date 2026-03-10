import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ModulePage, { Column, StatusBadge } from "@/components/ModulePage";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import FormDialog from "@/components/FormDialog";

const statusMap: Record<string, any> = {
  draft: { label: "草稿", variant: "outline" },
  pending: { label: "审批中", variant: "secondary" },
  approved: { label: "已通过", variant: "default" },
  rejected: { label: "已驳回", variant: "destructive" },
  cancelled: { label: "已取消", variant: "outline" },
};

const leaveTypeMap: Record<string, string> = {
  annual: "年假",
  sick: "病假",
  personal: "事假",
  maternity: "产假",
  paternity: "陪产假",
  marriage: "婚假",
  bereavement: "丧假",
  other: "其他",
};

export default function LeavePage() {
  const { user } = useAuth();
  const { data = [], isLoading, refetch } = trpc.leaveRequests.list.useQuery();
  const createMutation = trpc.leaveRequests.create.useMutation({ onSuccess: () => { refetch(); toast.success("提交成功"); } });
  const updateMutation = trpc.leaveRequests.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.leaveRequests.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const columns: Column<any>[] = [
    { key: "requestNo", title: "申请单号", width: "140px" },
    { key: "applicantName", title: "申请人", width: "100px" },
    { key: "department", title: "部门", width: "120px" },
    { key: "leaveType", title: "类型", width: "100px", render: (v) => leaveTypeMap[v] || v },
    { key: "startDate", title: "开始日期", width: "120px" },
    { key: "endDate", title: "结束日期", width: "120px" },
    { key: "days", title: "天数", width: "80px" },
    { key: "status", title: "状态", width: "100px", render: (v) => <StatusBadge status={v} statusMap={statusMap} /> },
  ];

  const handleSubmit = (formData: any) => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
    setFormOpen(false);
  };

  return (
    <>
      <ModulePage
        title="请假申请"
        description="管理员工请假申请及审批流程"
        icon={Calendar}
        columns={columns}
        data={data}
        loading={isLoading}
        compact
        onAdd={() => { setEditingRecord(null); setFormOpen(true); }}
        onEdit={(record) => { setEditingRecord(record); setFormOpen(true); }}
        onDelete={(record) => deleteMutation.mutate({ id: record.id })}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingRecord ? "编辑申请" : "新建请假申请"}
        fields={[
          { name: "requestNo", label: "申请单号", type: "text", required: true, placeholder: "自动生成", disabled: true },
          { name: "applicantName", label: "申请人", type: "text", required: true, defaultValue: user?.name || "" },
          { name: "department", label: "部门", type: "text", required: true, defaultValue: user?.department || "" },
          { 
            name: "leaveType", 
            label: "请假类型", 
            type: "select", 
            required: true,
            options: Object.entries(leaveTypeMap).map(([value, label]) => ({ label, value }))
          },
          { name: "startDate", label: "开始日期", type: "date", required: true },
          { name: "endDate", label: "结束日期", type: "date", required: true },
          { name: "days", label: "请假天数", type: "number", required: true },
          { name: "reason", label: "请假原因", type: "textarea", span: 2, required: true },
          { name: "remark", label: "备注", type: "textarea", span: 2 },
        ]}
        initialData={editingRecord || {
          requestNo: `LV-${new Date().getFullYear()}-${String(data.length + 1).padStart(4, "0")}`,
          leaveType: "annual",
        }}
        onSubmit={handleSubmit}
      />
    </>
  );
}
