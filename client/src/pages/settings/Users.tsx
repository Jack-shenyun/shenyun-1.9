import { useAuth } from "@/_core/hooks/useAuth";
import { LOCAL_AUTH_USER_KEY } from "@/const";
import { formatDateValue } from "@/lib/formatters";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { useMemo, useState } from "react";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Shield,
  ShieldCheck,
  UserCog,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useOperationLog } from "@/hooks/useOperationLog";
import { trpc } from "@/lib/trpc";
import { parseVisibleAppIds, WORKBENCH_APP_OPTIONS } from "@/constants/workbenchApps";

const statusMap: Record<string, any> = {
  active: { label: "正常", variant: "default" as const, color: "text-green-600" },
  inactive: { label: "停用", variant: "secondary" as const, color: "text-gray-500" },
  locked: { label: "锁定", variant: "destructive" as const, color: "text-red-600" },
};
const DEFAULT_UNIFIED_PASSWORD = "666-11";

const departmentOptions = [
  "管理部", "招商部", "销售部", "研发部", "生产部",
  "质量部", "采购部", "仓库管理", "财务部",
];

function parseDepartments(raw: string): string[] {
  return String(raw ?? "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();
  const { data: usersData, refetch } = trpc.users.list.useQuery();
  const createMutation = trpc.users.create.useMutation({
    onSuccess: async () => {
      await refetch();
      toast.success("用户创建成功");
    },
    onError: (error) => toast.error(`创建失败：${error.message}`),
  });
  const updateMutation = trpc.users.update.useMutation({
    onSuccess: async () => {
      await refetch();
      toast.success("用户信息已更新");
    },
    onError: (error) => toast.error(`更新失败：${error.message}`),
  });
  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: async () => {
      await refetch();
      toast.success("用户已删除");
    },
    onError: (error) => toast.error(`删除失败：${error.message}`),
  });
  const setPasswordMutation = trpc.users.setPassword.useMutation({
    onSuccess: () => {
      toast.success("密码修改成功");
    },
    onError: (error) => toast.error(`修改失败：${error.message}`),
  });
  const uploadAvatarMutation = trpc.users.uploadAvatar.useMutation({
    onSuccess: (data) => {
      toast.success("头像上传成功");
      setViewingUser((prev: any) => ({ ...prev, avatarUrl: data.avatarUrl }));
      refetch();
    },
    onError: (error) => toast.error(`上传失败：${error.message}`),
  });

  const users = (usersData || []).map((u: any) => ({
    id: u.id,
    username: u.openId?.startsWith("user-") ? u.openId.slice(5) : (u.openId || ""),
    name: u.name || "",
    email: u.email || "",
    phone: u.phone || "",
    department: u.department || "",
    role: u.role as "admin" | "user",
    visibleApps: parseVisibleAppIds(u.visibleApps),
    avatarUrl: u.avatarUrl || null,
    status: "active" as const,
    lastLogin: u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleString("zh-CN") : "-",
    createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString("zh-CN") : "-",
  }));

  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [passwordUser, setPasswordUser] = useState<any>(null);
  const { canDelete, isAdmin } = usePermission();
  const { logOperation } = useOperationLog();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, userId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      uploadAvatarMutation.mutate({
        id: userId,
        name: file.name,
        mimeType: file.type,
        base64,
      });
    };
    reader.readAsDataURL(file);
  };
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    department: "",
    role: "user",
    visibleApps: [] as string[],
    status: "active",
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: DEFAULT_UNIFIED_PASSWORD,
    confirmPassword: DEFAULT_UNIFIED_PASSWORD,
  });
  const selectedDepartments = parseDepartments(formData.department);

  const normalizedSearchTerm = searchTerm.toLowerCase();
  const filteredUsers = users.filter(
    (user: any) =>
      String(user.name ?? "").toLowerCase().includes(normalizedSearchTerm) ||
      String(user.username ?? "").toLowerCase().includes(normalizedSearchTerm) ||
      String(user.email ?? "").toLowerCase().includes(normalizedSearchTerm) ||
      String(user.department ?? "").toLowerCase().includes(normalizedSearchTerm)
  );

  const handleAdd = () => {
    if (!isAdmin) {
      toast.error("仅管理员可新增用户");
      return;
    }
    setEditingUser(null);
    setFormData({
      username: "",
      name: "",
      email: "",
      phone: "",
      department: "",
      role: "user",
      visibleApps: [],
      status: "active",
    });
    setDialogOpen(true);
  };

  const handleEdit = (user: any) => {
    if (!isAdmin) {
      toast.error("仅管理员可编辑用户");
      return;
    }
    setEditingUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      role: user.role,
      visibleApps: user.visibleApps ?? [],
      status: user.status,
    });
    setDialogOpen(true);
  };

  const handleView = (user: any) => {
    setViewingUser(user);
    setViewDialogOpen(true);
  };

  const handleDelete = async (user: any) => {
    if (!canDelete) {
      toast.error("您没有删除权限", { description: "只有管理员可以删除用户" });
      return;
    }
    if (user.role === "admin") {
      toast.error("无法删除管理员账号");
      return;
    }
    if (!confirm(`确认删除用户 ${user.name}（${user.username}）？`)) return;
    await deleteMutation.mutateAsync({ id: user.id });
    logOperation({
      module: "user",
      action: "delete",
      targetType: "用户",
      targetId: user.id,
      targetName: user.name,
      description: `删除用户：${user.name}(${user.username})`,
      previousData: user as unknown as Record<string, unknown>,
    });
  };

  const handleChangePassword = (user: any) => {
    if (!isAdmin) {
      toast.error("仅管理员可修改密码");
      return;
    }
    setPasswordUser(user);
    setPasswordForm({ newPassword: DEFAULT_UNIFIED_PASSWORD, confirmPassword: DEFAULT_UNIFIED_PASSWORD });
    setPasswordDialogOpen(true);
  };

  const handleSubmitPassword = async () => {
    if (!isAdmin || !passwordUser) {
      toast.error("仅管理员可修改密码");
      return;
    }
    const newPassword = passwordForm.newPassword;
    const confirmPassword = passwordForm.confirmPassword;
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
    await setPasswordMutation.mutateAsync({
      id: passwordUser.id,
      newPassword,
    });
    logOperation({
      module: "user",
      action: "update",
      targetType: "用户密码",
      targetId: passwordUser.id,
      targetName: passwordUser.name,
      description: `修改用户密码：${passwordUser.name}(${passwordUser.username})`,
    });
    setPasswordDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!isAdmin) {
      toast.error("仅管理员可保存用户设置");
      return;
    }
    const username = formData.username.trim();
    const name = formData.name.trim();
    const email = formData.email.trim();
    if (!username || !name) {
      toast.error("请填写必填项");
      return;
    }
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
      toast.error("用户名格式不正确", { description: "请使用 3-32 位字母、数字、._-" });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("邮箱格式不正确");
      return;
    }

    if (editingUser) {
      await updateMutation.mutateAsync({
        id: editingUser.id,
        username,
        name,
        email: email || undefined,
        phone: formData.phone.trim() || undefined,
        department: formData.department || undefined,
        role: formData.role as "admin" | "user",
        visibleApps: formData.visibleApps,
      });
      if (currentUser && Number((currentUser as any).id) === Number(editingUser.id)) {
        const nextUser = {
          ...(currentUser as any),
          openId: `user-${username}`,
          name,
          email: email || null,
          phone: formData.phone.trim() || null,
          department: formData.department || null,
          role: formData.role as "admin" | "user",
          visibleApps: formData.visibleApps.length ? formData.visibleApps.join(",") : null,
        };
        utils.auth.me.setData(undefined, nextUser);
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(nextUser));
          localStorage.setItem("manus-runtime-user-info", JSON.stringify(nextUser));
        }
      }
      logOperation({
        module: "user",
        action: "update",
        targetType: "用户",
        targetId: editingUser.id,
        targetName: name,
        description: `编辑用户：${name}(${username})`,
        previousData: editingUser as unknown as Record<string, unknown>,
        newData: formData as unknown as Record<string, unknown>,
      });
    } else {
      await createMutation.mutateAsync({
        username,
        name,
        email: email || undefined,
        phone: formData.phone.trim() || undefined,
        department: formData.department || undefined,
        role: formData.role as "admin" | "user",
        visibleApps: formData.visibleApps,
      });
      logOperation({
        module: "user",
        action: "create",
        targetType: "用户",
        targetName: name,
        description: `新建用户：${name}(${username})`,
        newData: formData as unknown as Record<string, unknown>,
      });
    }
    setDialogOpen(false);
  };

  const toggleDepartment = (department: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...selectedDepartments, department]))
      : selectedDepartments.filter((d) => d !== department);
    setFormData({ ...formData, department: next.join("，") });
  };

  const toggleVisibleApp = (appId: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...formData.visibleApps, appId]))
      : formData.visibleApps.filter((id) => id !== appId);
    setFormData({ ...formData, visibleApps: next });
  };

  const getVisibleAppLabels = (appIds: string[]) =>
    WORKBENCH_APP_OPTIONS.filter((item) => appIds.includes(item.id)).map((item) => item.label);

  const activeUsers = users.filter((u: any) => u.status === "active").length;
  const adminUsers = users.filter((u: any) => u.role === "admin").length;
  const lockedUsers = users.filter((u: any) => u.status === "locked").length;
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
              <UserCog className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">用户设置</h2>
              <p className="text-sm text-muted-foreground">管理系统用户账号和权限</p>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={!isAdmin}>
            <Plus className="h-4 w-4 mr-1" />
            新增用户
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">用户总数</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">活跃用户</p>
              <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">管理员</p>
              <p className="text-2xl font-bold text-primary">{adminUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">锁定用户</p>
              <p className="text-2xl font-bold text-red-600">{lockedUsers}</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索 */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名、姓名、邮箱、部门..."
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
                    <TableHead className="text-center font-bold">用户</TableHead>
                    <TableHead className="text-center font-bold">用户名</TableHead>
                    <TableHead className="text-center font-bold">部门</TableHead>
                    <TableHead className="text-center font-bold">角色</TableHead>
                    <TableHead className="text-center font-bold">状态</TableHead>
                    <TableHead className="text-center font-bold">最后登录</TableHead>
                    <TableHead className="w-[100px] text-center font-bold">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {user.name.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono">{user.username}</TableCell>
                        <TableCell className="text-center">{user.department}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-1">
                            {user.role === "admin" ? (
                              <ShieldCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <Shield className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span>{user.role === "admin" ? "管理员" : "普通用户"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusMap[user.status]?.variant || "outline"} className={getStatusSemanticClass(user.status, statusMap[user.status]?.label)}>
                            {statusMap[user.status]?.label || "正常"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {user.lastLogin}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(user)}>
                                <Eye className="h-4 w-4 mr-2" />
                                查看
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(user)} disabled={!isAdmin}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangePassword(user)} disabled={!isAdmin}>
                                <Key className="h-4 w-4 mr-2" />
                                修改密码
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => void handleDelete(user)}
                                className={canDelete ? "text-destructive" : "text-muted-foreground"}
                                disabled={!canDelete || !isAdmin || user.role === "admin"}
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
            <DialogTitle>{editingUser ? "编辑用户" : "新增用户"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "修改用户信息" : "创建新的系统用户"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>用户名 *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="登录用户名"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>姓名 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="用户姓名"
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@company.com"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>手机号</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="13800138000"
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>所属部门</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild disabled={!isAdmin}>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      {selectedDepartments.length > 0 ? selectedDepartments.join("，") : "选择部门（可多选）"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    {departmentOptions.map((dept) => (
                      <DropdownMenuCheckboxItem
                        key={dept}
                        checked={selectedDepartments.includes(dept)}
                        onCheckedChange={(checked) => toggleDepartment(dept, Boolean(checked))}
                      >
                        {dept}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <p className="text-xs text-muted-foreground">
                  可选择多个部门
                </p>
              </div>
              <div className="space-y-2">
                <Label>用户角色</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">普通用户</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              <Label>首页显示应用</Label>
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-3">
                {WORKBENCH_APP_OPTIONS.map((app) => (
                  <label
                    key={app.id}
                    className="flex items-center gap-3 rounded-lg border border-transparent bg-white px-3 py-2 shadow-sm"
                  >
                    <Checkbox
                      checked={formData.visibleApps.includes(app.id)}
                      onCheckedChange={(checked) => toggleVisibleApp(app.id, Boolean(checked))}
                      disabled={!isAdmin}
                    />
                    <span className="text-sm font-medium text-slate-700">{app.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                留空时，首页按用户所属部门自动显示；勾选后按这里的应用配置显示。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={!isAdmin || isMutating}>保存</Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* 查看详情对话框 */}
<DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
  <DraggableDialogContent>
    {viewingUser && (
      <div className="space-y-4">
        <div className="border-b pb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">用户详情</h2>
            <p className="text-sm text-muted-foreground">
              {viewingUser.name} (@{viewingUser.username})
              {viewingUser.status && (
                <>
                  {" "}
                  ·
                  <Badge
                    variant={statusMap[viewingUser.status]?.variant || "outline"}
                    className={`ml-1 ${getStatusSemanticClass(
                      viewingUser.status,
                      statusMap[viewingUser.status]?.label
                    )}`}
                  >
                    {statusMap[viewingUser.status]?.label || String(viewingUser.status ?? "-")}
                  </Badge>
                </>
              )}
            </p>
          </div>
          <div className="relative group">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="avatar-upload"
              onChange={(e) => handleAvatarUpload(e, viewingUser.id)}
            />
            <label htmlFor="avatar-upload" className="cursor-pointer">
              <Avatar className="h-24 w-24 shrink-0 border-3 border-white shadow-lg group-hover:opacity-80 transition-opacity">
                {viewingUser.avatarUrl ? (
                  <img src={viewingUser.avatarUrl} alt={viewingUser.name} className="w-full h-full object-cover" />
                ) : null}
                <AvatarFallback
                  className="text-2xl font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, hsl(${((viewingUser.name?.charCodeAt(0) ?? 65) * 137) % 360}, 65%, 50%), hsl(${((viewingUser.name?.charCodeAt(0) ?? 65) * 137 + 60) % 360}, 65%, 40%))`,
                  }}
                >
                  {(viewingUser.name ?? viewingUser.username ?? "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/30">
                <span className="text-white text-xs font-semibold">点击上传</span>
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <FieldRow label="姓名">{viewingUser.name}</FieldRow>
                <FieldRow label="邮箱">{viewingUser.email || "-"}</FieldRow>
                <FieldRow label="手机号">{viewingUser.phone || "-"}</FieldRow>
                <FieldRow label="所属部门">{viewingUser.department || "-"}</FieldRow>
              </div>
              <div>
                <FieldRow label="用户名">@{viewingUser.username}</FieldRow>
                <FieldRow label="用户角色">
                  <div className="flex items-center gap-1 justify-end">
                    {viewingUser.role === "admin" ? (
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{viewingUser.role === "admin" ? "管理员" : "普通用户"}</span>
                  </div>
                </FieldRow>
                <FieldRow label="创建时间">{formatDateValue(viewingUser.createdAt)}</FieldRow>
                <FieldRow label="最后登录">{viewingUser.lastLogin}</FieldRow>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">应用权限</h3>
            <div className="flex flex-wrap gap-2">
              {getVisibleAppLabels(viewingUser.visibleApps ?? []).length > 0 ? (
                getVisibleAppLabels(viewingUser.visibleApps ?? []).map((label) => (
                  <Badge key={label} variant="secondary">{label}</Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">未单独配置，按部门默认显示</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between flex-wrap gap-2 pt-3 border-t">
          <div className="flex gap-2 flex-wrap"></div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => handleEdit(viewingUser)} disabled={!isAdmin}>编辑</Button>
          </div>
        </div>
      </div>
    )}
  </DraggableDialogContent>
</DraggableDialog>

      <DraggableDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DraggableDialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              {passwordUser ? `为用户 ${passwordUser.name} 设置新密码` : "设置新密码"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>新密码 *</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder={DEFAULT_UNIFIED_PASSWORD}
                disabled={!isAdmin || setPasswordMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>确认新密码 *</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="再次输入新密码"
                disabled={!isAdmin || setPasswordMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void handleSubmitPassword()} disabled={!isAdmin || setPasswordMutation.isPending}>
              保存
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>
    </ERPLayout>
  );
}
