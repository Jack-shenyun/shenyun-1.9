import { formatDate, formatDateTime } from "@/lib/formatters";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuCheckboxItem,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useOperationLog } from "@/hooks/useOperationLog";
import { parseDepartmentList, stringifyDepartmentList } from "@/constants/departments";

interface DepartmentRecord {
  id: number;
  code: string;
  name: string;
  managerId: number | null;
  status: "active" | "inactive";
  description: string | null;
  createdAt: string | Date;
}

interface UserRecord {
  id: number;
  openId: string | null;
  name: string | null;
  department: string | null;
}

interface DepartmentView extends DepartmentRecord {
  managerName: string;
  memberIds: number[];
  memberNames: string[];
  memberCount: number;
}

const statusMap: Record<"active" | "inactive", { label: string; variant: "default" | "secondary" }> = {
  active: { label: "启用", variant: "default" },
  inactive: { label: "停用", variant: "secondary" },
};

export default function DepartmentsPage() {
  const { data: _dbData = [], isLoading, refetch } = trpc.departments.list.useQuery();
  const { data: _usersData = [], refetch: refetchUsers } = trpc.users.list.useQuery();
  const createMutation = trpc.departments.create.useMutation();
  const updateMutation = trpc.departments.update.useMutation();
  const deleteMutation = trpc.departments.delete.useMutation();
  const updateUserMutation = trpc.users.update.useMutation();

  const departments = _dbData as DepartmentRecord[];
  const userRecords = _usersData as UserRecord[];

  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentView | null>(null);
  const [viewingDept, setViewingDept] = useState<DepartmentView | null>(null);
  const { canDelete } = usePermission();
  const { logOperation } = useOperationLog();

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    managerId: "",
    memberIds: [] as number[],
    status: "active",
    description: "",
  });

  const userMap = useMemo(() => {
    const map = new Map<number, UserRecord>();
    for (const user of userRecords) {
      map.set(user.id, user);
    }
    return map;
  }, [userRecords]);

  const departmentRows = useMemo<DepartmentView[]>(() => {
    return departments.map((dept) => {
      const members = userRecords.filter((user) => parseDepartmentList(user.department).includes(dept.name));
      const managerName = dept.managerId ? userMap.get(dept.managerId)?.name || "-" : "-";
      return {
        ...dept,
        managerName,
        memberIds: members.map((m) => m.id),
        memberNames: members.map((m) => m.name || "-").filter(Boolean),
        memberCount: members.length,
      };
    });
  }, [departments, userRecords, userMap]);

  const filteredDepartments = useMemo(() => {
    const keyword = searchTerm.toLowerCase();
    return departmentRows.filter(
      (dept) =>
        String(dept.name ?? "").toLowerCase().includes(keyword) ||
        String(dept.code ?? "").toLowerCase().includes(keyword) ||
        String(dept.managerName ?? "").toLowerCase().includes(keyword),
    );
  }, [departmentRows, searchTerm]);

  const selectedMemberNames = useMemo(() => {
    return formData.memberIds
      .map((id) => userMap.get(id)?.name || "")
      .filter(Boolean);
  }, [formData.memberIds, userMap]);

  const handleAdd = () => {
    setEditingDept(null);
    setFormData({
      code: `DEPT${String(departments.length + 1).padStart(3, "0")}`,
      name: "",
      managerId: "",
      memberIds: [],
      status: "active",
      description: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (dept: DepartmentView) => {
    setEditingDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      managerId: dept.managerId ? String(dept.managerId) : "",
      memberIds: dept.memberIds,
      status: dept.status,
      description: dept.description || "",
    });
    setDialogOpen(true);
  };

  const handleView = (dept: DepartmentView) => {
    setViewingDept(dept);
    setViewDialogOpen(true);
  };

  const handleDelete = async (dept: DepartmentView) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除部门" });
      return;
    }

    await deleteMutation.mutateAsync({ id: dept.id });

    logOperation({
      module: "department",
      action: "delete",
      targetType: "部门",
      targetId: dept.id,
      targetName: dept.name,
      description: `删除部门：${dept.name}(${dept.code})`,
      previousData: dept as unknown as Record<string, unknown>,
    });

    await Promise.all([refetch(), refetchUsers()]);
    toast.success("删除成功");
  };

  const toggleMember = (userId: number, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...formData.memberIds, userId]))
      : formData.memberIds.filter((id) => id !== userId);
    setFormData((prev) => ({ ...prev, memberIds: next }));
  };

  const handleSubmit = async () => {
    const deptName = formData.name.trim();
    if (!deptName) {
      toast.error("请填写部门名称");
      return;
    }

    try {
      const managerId = formData.managerId && formData.managerId !== "__none__"
        ? Number(formData.managerId)
        : null;

      const selectedMemberIds = Array.from(
        new Set([
          ...formData.memberIds,
          ...(managerId ? [managerId] : []),
        ]),
      );

      const oldDeptName = editingDept?.name ?? deptName;

      if (editingDept) {
        await updateMutation.mutateAsync({
          id: editingDept.id,
          data: {
            code: formData.code.trim() || undefined,
            name: deptName,
            managerId,
            status: formData.status as "active" | "inactive",
            description: formData.description.trim() || undefined,
          },
        });
      } else {
        await createMutation.mutateAsync({
          code: formData.code.trim() || `DEPT${Date.now()}`,
          name: deptName,
          managerId,
          status: formData.status as "active" | "inactive",
          description: formData.description.trim() || undefined,
        });
      }

      const currentMembers = userRecords.filter((user) => parseDepartmentList(user.department).includes(oldDeptName));
      const currentMemberIds = currentMembers.map((user) => user.id);
      const impactedUserIds = Array.from(new Set([...currentMemberIds, ...selectedMemberIds]));

      await Promise.all(
        impactedUserIds.map(async (userId) => {
          const user = userMap.get(userId);
          if (!user) return;
          const originalList = parseDepartmentList(user.department).filter((name) => name !== oldDeptName);
          const nextList = selectedMemberIds.includes(userId)
            ? Array.from(new Set([...originalList, deptName]))
            : originalList;
          await updateUserMutation.mutateAsync({
            id: userId,
            department: stringifyDepartmentList(nextList),
          });
        }),
      );

      logOperation({
        module: "department",
        action: editingDept ? "update" : "create",
        targetType: "部门",
        targetId: editingDept?.id,
        targetName: deptName,
        description: `${editingDept ? "编辑" : "新建"}部门：${deptName}(${formData.code})`,
        previousData: editingDept as unknown as Record<string, unknown>,
        newData: {
          ...formData,
          managerId,
          memberIds: selectedMemberIds,
        } as unknown as Record<string, unknown>,
      });

      await Promise.all([refetch(), refetchUsers()]);
      setDialogOpen(false);
      toast.success(editingDept ? "部门信息已更新" : "部门创建成功");
    } catch (error: any) {
      toast.error("保存失败", { description: error?.message || "请稍后重试" });
    }
  };

  const totalMembers = departmentRows.reduce((sum, d) => sum + d.memberCount, 0);
  const activeDepts = departmentRows.filter((d) => d.status === "active").length;

  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (

    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">

      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>

      <span className="flex-1 text-sm text-right break-all">{children}</span>

    </div>

  );


  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">部门设置</h2>
              <p className="text-sm text-muted-foreground">管理公司组织架构和部门信息</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新增部门
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">部门总数</p>
              <p className="text-2xl font-bold">{departmentRows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">启用部门</p>
              <p className="text-2xl font-bold text-green-600">{activeDepts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">停用部门</p>
              <p className="text-2xl font-bold text-gray-400">{departmentRows.length - activeDepts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">员工总数</p>
              <p className="text-2xl font-bold text-primary">{totalMembers}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索部门编码、名称、负责人..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="text-center font-bold">部门编码</TableHead>
                    <TableHead className="text-center font-bold">部门名称</TableHead>
                    <TableHead className="text-center font-bold">负责人</TableHead>
                    <TableHead className="text-center font-bold">人员数量</TableHead>
                    <TableHead className="text-center font-bold">状态</TableHead>
                    <TableHead className="w-[100px] text-center font-bold">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {isLoading ? "加载中..." : "暂无数据"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="text-center font-mono">{dept.code}</TableCell>
                        <TableCell className="text-center font-medium">{dept.name}</TableCell>
                        <TableCell className="text-center">{dept.managerName}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {dept.memberCount}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={dept.status === "active" ? "default" : "secondary"} className={getStatusSemanticClass(dept.status)}>
                            {dept.status === "active" ? "启用" : "停用"}
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
                              <DropdownMenuItem onClick={() => handleView(dept)}>
                                <Eye className="h-4 w-4 mr-2" />
                                查看
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(dept)}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(dept)}
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

      <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DraggableDialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? "编辑部门" : "新增部门"}</DialogTitle>
            <DialogDescription>{editingDept ? "修改部门信息" : "创建新的部门"}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>部门编码</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="如：DEPT001"
                />
              </div>
              <div className="space-y-2">
                <Label>部门名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入部门名称"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>部门负责人</Label>
                <Select
                  value={formData.managerId || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, managerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择负责人" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">未指定</SelectItem>
                    {userRecords.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name || "未命名"} ({u.openId?.replace(/^user-/, "") || `ID-${u.id}`})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
            <div className="space-y-2">
              <Label>部门成员</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {selectedMemberNames.length > 0 ? selectedMemberNames.join("，") : "选择成员（可多选）"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[420px] max-h-64 overflow-y-auto">
                  {userRecords.map((user) => (
                    <DropdownMenuCheckboxItem
                      key={user.id}
                      checked={formData.memberIds.includes(user.id)}
                      onCheckedChange={(checked) => toggleMember(user.id, Boolean(checked))}
                    >
                      {user.name || "未命名"} ({user.openId?.replace(/^user-/, "") || `ID-${user.id}`})
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-xs text-muted-foreground">部门负责人会自动加入成员名单</p>
            </div>
            <div className="space-y-2">
              <Label>部门描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入部门职责描述"
                rows={3}
              />
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


        {/* 查看详情 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {viewingDept && (
      <div className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-lg font-semibold">部门详情</h2>
          <p className="text-sm text-muted-foreground">
            {viewingDept.code}
            {viewingDept.status && (
              <>
                {" "}
                ·
                <Badge
                  variant={statusMap[viewingDept.status]?.variant || "outline"}
                  className={`ml-1 ${getStatusSemanticClass(viewingDept.status)}`}
                >
                  {statusMap[viewingDept.status]?.label || String(viewingDept.status ?? "-")}
                </Badge>
              </>
            )}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <FieldRow label="部门名称">{viewingDept.name}</FieldRow>
              <FieldRow label="负责人">{viewingDept.managerName}</FieldRow>
              <FieldRow label="创建时间">{formatDate(viewingDept.createdAt)}</FieldRow>
            </div>
            <div>
              <FieldRow label="部门编码">{viewingDept.code}</FieldRow>
              <FieldRow label="人员数量">{viewingDept.memberCount} 人</FieldRow>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">部门成员</h3>
          <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
            {viewingDept.memberNames.length > 0 ? viewingDept.memberNames.join("，") : "无"}
          </p>
        </div>

        {viewingDept.description && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">部门描述</h3>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
              {viewingDept.description}
            </p>
          </div>
        )}

        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>
              关闭
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewDialogOpen(false);
                handleEdit(viewingDept);
              }}
            >
              编辑
            </Button>
          </div>
        </div>
      </div>
    )}
  </DraggableDialogContent>
</DraggableDialog>
    </ERPLayout>
  );
}
