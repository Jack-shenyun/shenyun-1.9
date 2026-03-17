import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ModulePage, { Column, StatusBadge } from "@/components/ModulePage";
import { Clock } from "lucide-react";
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

const overtimeTypeMap: Record<string, string> = {
  weekday: "平时加班",
  weekend: "周末加班",
  holiday: "节假日加班",
};

export default function OvertimePage() {
  const { user } = useAuth();
  const { data = [], isLoading, refetch } = trpc.overtimeRequests.list.useQuery();
  const createMutation = trpc.overtimeRequests.create.useMutation({ onSuccess: () => { refetch(); toast.success("提交成功"); } });
  const updateMutation = trpc.overtimeRequests.update.useMutation({ onSuccess: () => { refetch(); toast.success("更新成功"); } });
  const deleteMutation = trpc.overtimeRequests.delete.useMutation({ onSuccess: () => { refetch(); toast.success("删除成功"); } });

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const columns: Column<any>[] = [
    { key: "requestNo", title: "申请单号", width: "140px" },
    { key: "applicantName", title: "申请人", width: "100px" },
    { key: "department", title: "部门", width: "120px" },
    { key: "overtimeDate", title: "加班日期", width: "120px" },
    { key: "overtimeType", title: "类型", width: "100px", render: (v) => overtimeTypeMap[v] || v },
    { key: "hours", title: "时长(h)", width: "80px" },
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
        title="加班申请"
        description="管理员工加班申请及审批流程"
        icon={Clock}
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
        title={editingRecord ? "编辑申请" : "新建加班申请"}
        fields={[
          { name: "requestNo", label: "申请单号", type: "text", required: true, placeholder: "自动生成", disabled: true },
          { name: "applicantName", label: "申请人", type: "text", required: true, defaultValue: user?.name || "" },
          { name: "department", label: "部门", type: "text", required: true, defaultValue: user?.department || "" },
          { name: "overtimeDate", label: "加班日期", type: "date", required: true },
          { name: "startTime", label: "开始时间", type: "text", required: true, placeholder: "HH:mm" },
          { name: "endTime", label: "结束时间", type: "text", required: true, placeholder: "HH:mm" },
          { name: "hours", label: "加班时长", type: "number", required: true },
          { 
            name: "overtimeType", 
            label: "加班类型", 
            type: "select", 
            required: true,
            options: [
              { label: "平时加班", value: "weekday" },
              { label: "周末加班", value: "weekend" },
              { label: "节假日加班", value: "holiday" },
            ]
          },
          { name: "reason", label: "加班原因", type: "textarea", span: 2, required: true },
          { name: "remark", label: "备注", type: "textarea", span: 2 },
        ]}
        initialData={editingRecord || {
          requestNo: "",
          overtimeType: "weekday",
        }}
        onSubmit={handleSubmit}
      />
    </>
  );
}
