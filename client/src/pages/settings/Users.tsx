import { useAuth } from "@/_core/hooks/useAuth";
import { LOCAL_AUTH_USER_KEY } from "@/const";
import { formatDate, formatDateTime, formatDateValue } from "@/lib/formatters";
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
import { Separator } from "@/components/ui/separator";
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
  MessageCircle,
  CheckCircle2,
  XCircle,
  Network,
} from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useOperationLog } from "@/hooks/useOperationLog";
import { trpc } from "@/lib/trpc";
import { getCompanyMenuIds, readActiveCompany } from "@/lib/activeCompany";
import {
  parseVisibleAppIds,
  WORKBENCH_APP_ENTRIES,
} from "@/constants/workbenchApps";
import { DASHBOARD_BOARD_DEFINITIONS, type DashboardPermissionId } from "@shared/dashboardBoards";
import { FORM_VISIBILITY_GROUPS, getFormVisibilityLabel, parseVisibleFormIds } from "@shared/formVisibility";

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

const dataScopeLabelMap: Record<string, string> = {
  self: "仅本人",
  department: "本部门",
  all: "全部数据",
};

const DASHBOARD_MENU_ID_MAP: Record<DashboardPermissionId, string> = {
  boss_dashboard: "dashboard",
  sales_dashboard: "sales",
  production_dashboard: "production",
  purchase_dashboard: "purchase",
  finance_dashboard: "finance",
  quality_dashboard: "quality",
};

function parseDepartments(raw: string): string[] {
  return String(raw ?? "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();
  const { data: usersData, refetch } = trpc.users.listByCompany.useQuery();
  const createMutation = trpc.users.create.useMutation({
    onSuccess: async () => {
      await utils.dashboard.access.invalidate();
      await refetch();
      toast.success("用户创建成功");
    },
    onError: (error) => toast.error(`创建失败：${error.message}`),
  });
  const updateMutation = trpc.users.update.useMutation({
    onSuccess: async () => {
      await utils.dashboard.access.invalidate();
      await utils.auth.me.invalidate();
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
      const nextUser = {
        ...(currentUser as any),
        avatarUrl: data.avatarUrl,
      };
      utils.auth.me.setData(undefined, nextUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("manus-runtime-user-info", JSON.stringify(nextUser));
        const localAuthRaw = localStorage.getItem(LOCAL_AUTH_USER_KEY);
        if (localAuthRaw) {
          try {
            const localAuth = JSON.parse(localAuthRaw);
            localStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify({ ...localAuth, avatarUrl: data.avatarUrl }));
          } catch {}
        }
      }
    },
    onError: (error) => toast.error(`上传失败：${error.message}`),
  });

  const users = (usersData || []).map((u: any) => ({
    id: u.id,
    username: u.openId?.startsWith("user-") ? u.openId.slice(5) : (u.openId || ""),
    name: u.name || "",
    englishName: u.englishName || "",
    email: u.email || "",
    phone: u.phone || "",
    department: u.department || "",
    position: u.position || "",
    role: u.role as "admin" | "user",
    dataScope: String(u.dataScope || (u.role === "admin" ? "all" : "self")) as "self" | "department" | "all",
    visibleApps: parseVisibleAppIds(u.visibleApps),
    visibleForms: parseVisibleFormIds(u.visibleForms),
    dashboardPermissions: (Array.isArray(u.dashboardPermissions) ? u.dashboardPermissions : []) as DashboardPermissionId[],
    allowedCompanies: Array.isArray(u.allowedCompanies) ? u.allowedCompanies.map((id: any) => Number(id)).filter((id: number) => id > 0) : [],
    companyId: Number(u.companyId || 0),
    homeCompanyId: Number(u.homeCompanyId || u.companyId || 0),
    isScopedUser: Boolean(u.isScopedUser),
    avatarUrl: u.avatarUrl || null,
    // 微信字段
    wxAccount: u.wxAccount || "",
    wxOpenid: u.wxOpenid || "",
    wxNickname: u.wxNickname || "",
    status: "active" as const,
    lastLogin: u.lastSignedIn ? formatDateTime(u.lastSignedIn) : "-",
    createdAt: u.createdAt ? formatDate(u.createdAt) : "-",
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
  const isScopedUserSettings = Boolean(editingUser?.isScopedUser);

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

  // 协同公司列表
  const { data: allCompanies = [] } = trpc.companies.list.useQuery();
  const collaborationCompanies = useMemo(
    () => (allCompanies as any[]).filter((company: any) => String(company.type || "").toLowerCase() !== "main"),
    [allCompanies],
  );
  const currentCompanyId = Number((currentUser as any)?.companyId || 0);
  const currentCompany = useMemo(
    () =>
      (allCompanies as any[]).find(
        (company: any) => Number(company.id || 0) === currentCompanyId,
      ) ??
      readActiveCompany(),
    [allCompanies, currentCompanyId],
  );
  const isMainCompanyContext = useMemo(() => {
    const type = String((currentCompany as any)?.type || "").toLowerCase();
    if (type) return type === "main";
    const homeCompanyId = Number((currentUser as any)?.homeCompanyId || 0);
    return homeCompanyId <= 0 || homeCompanyId === currentCompanyId;
  }, [currentCompany, currentCompanyId, currentUser]);
  const currentCompanyMenuIds = useMemo(
    () => getCompanyMenuIds((currentCompany as any)?.modules),
    [currentCompany],
  );
  const visibleAppOptions = useMemo(
    () => WORKBENCH_APP_ENTRIES.map((item) => ({ id: item.id, label: item.label })),
    [],
  );
  const visibleAppIdSet = useMemo(
    () => new Set(visibleAppOptions.map((item) => item.id)),
    [visibleAppOptions],
  );
  const filteredFormVisibilityGroups = useMemo(
    () =>
      FORM_VISIBILITY_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          !currentCompanyMenuIds || currentCompanyMenuIds.size === 0
            ? true
            : currentCompanyMenuIds.has(item.menuId),
        ),
      })).filter((group) => group.items.length > 0),
    [currentCompanyMenuIds],
  );
  const visibleFormIdSet = useMemo(
    () =>
      new Set(
        filteredFormVisibilityGroups.flatMap((group) =>
          group.items.map((item) => item.id),
        ),
      ),
    [filteredFormVisibilityGroups],
  );
  const filteredDashboardDefinitions = useMemo(
    () =>
      DASHBOARD_BOARD_DEFINITIONS.filter((dashboard) => {
        if (!isMainCompanyContext && dashboard.id === "boss_dashboard") {
          return false;
        }
        if (!currentCompanyMenuIds || currentCompanyMenuIds.size === 0) {
          return true;
        }
        return currentCompanyMenuIds.has(DASHBOARD_MENU_ID_MAP[dashboard.id]);
      }),
    [currentCompanyMenuIds, isMainCompanyContext],
  );
  const visibleDashboardIdSet = useMemo(
    () => new Set(filteredDashboardDefinitions.map((item) => item.id)),
    [filteredDashboardDefinitions],
  );

  const [formData, setFormData] = useState({
    username: "",
    name: "",
    englishName: "",
    email: "",
    phone: "",
    department: "",
    role: "user",
    dataScope: "self" as "self" | "department" | "all",
    visibleApps: [] as string[],
    visibleForms: [] as string[],
    dashboardPermissions: [] as DashboardPermissionId[],
    allowedCompanies: [] as number[],
    status: "active",
    wxAccount: "",
    wxOpenid: "",
    wxNickname: "",
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
      String(user.department ?? "").toLowerCase().includes(normalizedSearchTerm) ||
      String(user.wxAccount ?? "").toLowerCase().includes(normalizedSearchTerm) ||
      String(user.wxNickname ?? "").toLowerCase().includes(normalizedSearchTerm)
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
      englishName: "",
      email: "",
      phone: "",
      department: "",
      role: "user",
      dataScope: "self",
      visibleApps: [],
      visibleForms: [],
      dashboardPermissions: [],
      allowedCompanies: [],
      status: "active",
      wxAccount: "",
      wxOpenid: "",
      wxNickname: "",
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
      englishName: user.englishName || "",
      email: user.email,
      phone: user.phone,
      department: user.department,
      role: user.role,
      dataScope: user.dataScope || (user.role === "admin" ? "all" : "self"),
      visibleApps: (user.visibleApps ?? []).filter((id: string) => visibleAppIdSet.has(id)),
      visibleForms: (user.visibleForms ?? []).filter((id: string) => visibleFormIdSet.has(id)),
      dashboardPermissions: (user.dashboardPermissions ?? []).filter((id: DashboardPermissionId) =>
        visibleDashboardIdSet.has(id),
      ),
      allowedCompanies: isMainCompanyContext ? (user.allowedCompanies ?? []) : [],
      status: user.status,
      wxAccount: user.wxAccount || "",
      wxOpenid: user.wxOpenid || "",
      wxNickname: user.wxNickname || "",
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
    if (user.isScopedUser) {
      toast.error("协同公司授权用户不能在当前公司删除", {
        description: "如需删除账号，请回所属公司维护；当前公司只维护显示板块和权限。",
      });
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
    if (user.isScopedUser) {
      toast.error("协同公司授权用户不能在当前公司改密码", {
        description: "请回所属公司维护密码；当前公司只维护显示板块和权限。",
      });
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
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
    await setPasswordMutation.mutateAsync({
      id: passwordUser.id,
      newPassword: passwordForm.newPassword,
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

    const wxPayload = {
      wxAccount: formData.wxAccount.trim() || undefined,
      wxOpenid: formData.wxOpenid.trim() || undefined,
      wxNickname: formData.wxNickname.trim() || undefined,
    };

    if (editingUser) {
      const isScopedEditing =
        Boolean(editingUser?.isScopedUser) ||
        Number(editingUser?.companyId || 0) !== currentCompanyId;
      await updateMutation.mutateAsync({
        id: editingUser.id,
        username,
        name,
        englishName: formData.englishName.trim() || undefined,
        email: email || undefined,
        phone: formData.phone.trim() || undefined,
        department: formData.department || undefined,
        role: formData.role as "admin" | "user",
        dataScope: formData.role === "admin" ? "all" : formData.dataScope,
        visibleApps: formData.visibleApps,
        visibleForms: formData.visibleForms,
        dashboardPermissions: formData.dashboardPermissions,
        allowedCompanies: isMainCompanyContext ? formData.allowedCompanies : undefined,
        ...wxPayload,
      });
      if (currentUser && Number((currentUser as any).id) === Number(editingUser.id)) {
        const nextUser = {
          ...(currentUser as any),
          department: formData.department || null,
          role: formData.role as "admin" | "user",
          dataScope: formData.role === "admin" ? "all" : formData.dataScope,
          visibleApps: formData.visibleApps.join(","),
          visibleForms: formData.visibleForms.join(","),
          dashboardPermissions: formData.dashboardPermissions,
        };
        if (!isScopedEditing) {
          Object.assign(nextUser, {
            openId: `user-${username}`,
            name,
            email: email || null,
            phone: formData.phone.trim() || null,
          });
        }
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
        englishName: formData.englishName.trim() || undefined,
        email: email || undefined,
        phone: formData.phone.trim() || undefined,
        department: formData.department || undefined,
        role: formData.role as "admin" | "user",
        dataScope: formData.role === "admin" ? "all" : formData.dataScope,
        visibleApps: formData.visibleApps,
        visibleForms: formData.visibleForms,
        dashboardPermissions: formData.dashboardPermissions,
        allowedCompanies: isMainCompanyContext ? formData.allowedCompanies : undefined,
        ...wxPayload,
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

  const toggleAllowedCompany = (companyId: number, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...formData.allowedCompanies, companyId]))
      : formData.allowedCompanies.filter((id) => id !== companyId);
    setFormData({ ...formData, allowedCompanies: next });
  };

  const toggleVisibleApp = (appId: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...formData.visibleApps, appId]))
      : formData.visibleApps.filter((id) => id !== appId);
    setFormData({ ...formData, visibleApps: next });
  };

  const toggleDashboardPermission = (dashboardId: DashboardPermissionId, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...formData.dashboardPermissions, dashboardId]))
      : formData.dashboardPermissions.filter((id) => id !== dashboardId);
    setFormData({ ...formData, dashboardPermissions: next });
  };

  const toggleVisibleForm = (formId: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...formData.visibleForms, formId]))
      : formData.visibleForms.filter((id) => id !== formId);
    setFormData({ ...formData, visibleForms: next });
  };

  const getVisibleAppLabels = (appIds: string[]) =>
    visibleAppOptions.filter((item) => appIds.includes(item.id)).map((item) => item.label);

  const getVisibleFormLabels = (formIds: string[]) =>
    formIds.map((id) => getFormVisibilityLabel(id));

  const getDashboardPermissionLabels = (dashboardIds: DashboardPermissionId[]) =>
    filteredDashboardDefinitions.filter((item) => dashboardIds.includes(item.id)).map((item) => item.label);

  const getAllowedCompanyLabels = (companyIds: number[]) =>
    collaborationCompanies
      .filter((company: any) => companyIds.includes(Number(company.id)))
      .map((company: any) => company.name || company.shortName || `公司${company.id}`);

  const activeUsers = users.filter((u: any) => u.status === "active").length;
  const adminUsers = users.filter((u: any) => u.role === "admin").length;
  const lockedUsers = users.filter((u: any) => u.status === "locked").length;
  // 已绑定微信的用户数
  const wxBoundUsers = users.filter((u: any) => u.wxOpenid).length;

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
              <p className="text-sm text-muted-foreground">管理系统用户账号、权限和微信绑定</p>
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
            <CardContent className="p-4 flex items-center gap-3">
              <div>
                <p className="text-sm text-muted-foreground">微信已绑定</p>
                <p className="text-2xl font-bold text-green-600">{wxBoundUsers}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-green-400 ml-auto" />
            </CardContent>
          </Card>
        </div>

        {/* 搜索 */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名、姓名、邮箱、部门、微信号..."
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
                    <TableHead className="text-center font-bold">微信</TableHead>
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
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                              ) : null}
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {user.name.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email || "-"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">{user.username}</TableCell>
                        <TableCell className="text-center text-sm">
                          {(() => {
                            const count = parseDepartments(user.department).length;
                            return count > 0 ? `${count}` : "-";
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {user.role === "admin" ? (
                              <ShieldCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <Shield className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">{user.role === "admin" ? "管理员" : "普通用户"}</span>
                          </div>
                        </TableCell>
                        {/* 微信绑定状态列 */}
                        <TableCell className="text-center">
                          {user.wxOpenid ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">已绑定</span>
                              </div>
                              {(user.wxNickname || user.wxAccount) && (
                                <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                                  {user.wxNickname || user.wxAccount}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-slate-400">
                              <XCircle className="h-3.5 w-3.5" />
                              <span className="text-xs">未绑定</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {formatDateTime(user.lastLogin)}
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
                              <DropdownMenuItem onClick={() => handleChangePassword(user)} disabled={!isAdmin || user.isScopedUser}>
                                <Key className="h-4 w-4 mr-2" />
                                修改密码
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => void handleDelete(user)}
                                className={canDelete ? "text-destructive" : "text-muted-foreground"}
                                disabled={!canDelete || !isAdmin || user.role === "admin" || user.isScopedUser}
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
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
            {isScopedUserSettings && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                当前仅维护该用户在本公司的权限、板块和看板显示，不会改动神韵里的基础资料。
              </div>
            )}
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>用户名 *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="登录用户名"
                  disabled={!isAdmin || isScopedUserSettings}
                />
              </div>
              <div className="space-y-2">
                <Label>姓名 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="用户姓名"
                  disabled={!isAdmin || isScopedUserSettings}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>英文名</Label>
                <Input
                  value={formData.englishName}
                  onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                  placeholder="如：Jack / Jolin / Mandy"
                  disabled={!isAdmin || isScopedUserSettings}
                />
              </div>
              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@company.com"
                  disabled={!isAdmin || isScopedUserSettings}
                />
              </div>
              <div className="space-y-2">
                <Label>手机号</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="13800138000"
                  disabled={!isAdmin || isScopedUserSettings}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              </div>
              <div className="space-y-2">
                <Label>用户角色</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      role: v,
                      dataScope: v === "admin" ? "all" : formData.dataScope,
                    })
                  }
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
              <div className="space-y-2">
                <Label>数据范围</Label>
                <Select
                  value={formData.role === "admin" ? "all" : formData.dataScope}
                  onValueChange={(v) => setFormData({ ...formData, dataScope: v as "self" | "department" | "all" })}
                  disabled={!isAdmin || formData.role === "admin"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">仅本人</SelectItem>
                    <SelectItem value="department">本部门</SelectItem>
                    <SelectItem value="all">全部数据</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  普通销售、采购、财务协同页会按这里控制可见单据范围。
                </p>
              </div>
            </div>

            {/* 微信账户信息 */}
            <Separator />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-semibold text-slate-700">微信账户信息</span>
              </div>
              <p className="text-xs text-muted-foreground">填写后可向该用户发送微信消息提醒</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>微信号</Label>
                <Input
                  value={formData.wxAccount}
                  onChange={(e) => setFormData({ ...formData, wxAccount: e.target.value })}
                  placeholder="微信号（展示用）"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>微信昵称</Label>
                <Input
                  value={formData.wxNickname}
                  onChange={(e) => setFormData({ ...formData, wxNickname: e.target.value })}
                  placeholder="微信昵称"
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                微信 OpenID
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">发消息必填</Badge>
              </Label>
              <Input
                value={formData.wxOpenid}
                onChange={(e) => setFormData({ ...formData, wxOpenid: e.target.value })}
                placeholder="公众号 OpenID（用于发送模板消息）"
                disabled={!isAdmin}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                OpenID 可通过微信公众号后台「用户管理」查看，或由用户扫码绑定后自动填入
              </p>
            </div>

            {/* 首页应用权限 */}
            <Separator />
            <div className="space-y-3">
              <Label>首页显示应用</Label>
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-3">
                {visibleAppOptions.map((app) => (
                  <label
                    key={app.id}
                    className="flex items-center gap-3 rounded-lg border border-transparent bg-white px-3 py-2 shadow-sm cursor-pointer"
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

            <Separator />
            <div className="space-y-3">
              <Label>部门表单显示</Label>
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                {filteredFormVisibilityGroups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">{group.label}</p>
                      <span className="text-xs text-muted-foreground">
                        已选 {group.items.filter((item) => formData.visibleForms.includes(item.id)).length} / {group.items.length}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {group.items.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 rounded-lg border border-transparent bg-white px-3 py-2.5 shadow-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={formData.visibleForms.includes(item.id)}
                            onCheckedChange={(checked) => toggleVisibleForm(item.id, Boolean(checked))}
                            disabled={!isAdmin}
                          />
                          <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                留空时，侧边栏按用户所属部门默认显示；勾选后，按这里精确控制每个用户能看到的部门表单，并可跨部门单独授权。
              </p>
            </div>

            <Separator />
            <div className="space-y-3">
              <Label>看板查看权限</Label>
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-2">
                {filteredDashboardDefinitions.map((dashboard) => (
                  <label
                    key={dashboard.id}
                    className="flex items-start gap-3 rounded-lg border border-transparent bg-white px-3 py-3 shadow-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={formData.dashboardPermissions.includes(dashboard.id)}
                      onCheckedChange={(checked) => toggleDashboardPermission(dashboard.id, Boolean(checked))}
                      disabled={!isAdmin}
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-700">{dashboard.label}</p>
                      <p className="text-xs text-muted-foreground">{dashboard.department}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                只有被勾选的用户，才能看到对应看板；经营看板显示在首页“经营看板”入口中。
              </p>
            </div>

            {/* 协同公司访问权限 */}
            {isMainCompanyContext && collaborationCompanies.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-indigo-500" />
                    <Label>协同公司访问权限</Label>
                  </div>
                  <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    {collaborationCompanies.map((company: any) => (
                      <label
                        key={company.id}
                        className="flex items-center gap-3 rounded-lg border border-transparent bg-white px-3 py-2.5 shadow-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={formData.allowedCompanies.includes(company.id)}
                          onCheckedChange={(checked) => toggleAllowedCompany(company.id, Boolean(checked))}
                          disabled={!isAdmin}
                        />
                        <div
                          className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0"
                          style={{ background: company.color || "#6366f1" }}
                        >
                          <span className="text-[9px] text-white font-bold">{(company.shortName || company.name).charAt(0)}</span>
                        </div>
                        <span className="text-sm font-medium text-slate-700">{company.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    勾选后，该用户可在首页看到并进入对应协同公司。
                  </p>
                </div>
              </>
            )}
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
                        {" "}·
                        <Badge
                          variant={statusMap[viewingUser.status]?.variant || "outline"}
                          className={`ml-1 ${getStatusSemanticClass(viewingUser.status, statusMap[viewingUser.status]?.label)}`}
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
                    disabled={Boolean(viewingUser.isScopedUser)}
                    onChange={(e) => handleAvatarUpload(e, viewingUser.id)}
                  />
                  <label
                    htmlFor={viewingUser.isScopedUser ? undefined : "avatar-upload"}
                    className={viewingUser.isScopedUser ? "cursor-not-allowed" : "cursor-pointer"}
                  >
                    <Avatar className="h-20 w-20 shrink-0 border-2 border-white shadow-lg group-hover:opacity-80 transition-opacity">
                      {viewingUser.avatarUrl ? (
                        <img src={viewingUser.avatarUrl} alt={viewingUser.name} className="w-full h-full object-cover" />
                      ) : null}
                      <AvatarFallback
                        className="text-xl font-bold text-white"
                        style={{
                          background: `linear-gradient(135deg, hsl(${((viewingUser.name?.charCodeAt(0) ?? 65) * 137) % 360}, 65%, 50%), hsl(${((viewingUser.name?.charCodeAt(0) ?? 65) * 137 + 60) % 360}, 65%, 40%))`,
                        }}
                      >
                        {(viewingUser.name ?? viewingUser.username ?? "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/30">
                      <span className="text-white text-xs font-semibold">
                        {viewingUser.isScopedUser ? "所属公司维护" : "点击上传"}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* 基本信息 */}
                <div>
                  <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <FieldRow label="姓名">{viewingUser.name}</FieldRow>
                      <FieldRow label="英文名">{viewingUser.englishName || "-"}</FieldRow>
                      <FieldRow label="邮箱">{viewingUser.email || "-"}</FieldRow>
                      <FieldRow label="手机号">{viewingUser.phone || "-"}</FieldRow>
                      <FieldRow label="所属部门">{viewingUser.department || "-"}</FieldRow>
                      <FieldRow label="数据范围">
                        {dataScopeLabelMap[String(viewingUser.role === "admin" ? "all" : viewingUser.dataScope || "self")] || "仅本人"}
                      </FieldRow>
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
                      <FieldRow label="最后登录">{formatDateTime(viewingUser.lastLogin)}</FieldRow>
                    </div>
                  </div>
                </div>

                {/* 微信信息 */}
                <div>
                  <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                    微信账户
                  </h3>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1">
                    <FieldRow label="微信号">
                      {viewingUser.wxAccount || <span className="text-muted-foreground">未填写</span>}
                    </FieldRow>
                    <FieldRow label="微信昵称">
                      {viewingUser.wxNickname || <span className="text-muted-foreground">未填写</span>}
                    </FieldRow>
                    <FieldRow label="OpenID">
                      {viewingUser.wxOpenid ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="font-mono text-xs truncate max-w-[140px]">{viewingUser.wxOpenid}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>未绑定</span>
                        </div>
                      )}
                    </FieldRow>
                  </div>
                </div>

                {/* 应用权限 */}
                <div>
                  <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">应用权限</h3>
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

                <div>
                  <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">表单显示</h3>
                  <div className="flex flex-wrap gap-2">
                    {getVisibleFormLabels(viewingUser.visibleForms ?? []).length > 0 ? (
                      getVisibleFormLabels(viewingUser.visibleForms ?? []).map((label) => (
                        <Badge key={label} variant="secondary">{label}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">未单独配置，按部门默认显示</span>
                    )}
                  </div>
                </div>

                {isMainCompanyContext && (
                  <div>
                    <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">协同公司权限</h3>
                    <div className="flex flex-wrap gap-2">
                      {getAllowedCompanyLabels(viewingUser.allowedCompanies ?? []).length > 0 ? (
                        getAllowedCompanyLabels(viewingUser.allowedCompanies ?? []).map((label) => (
                          <Badge key={label} variant="secondary">{label}</Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">未配置协同公司权限</span>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">看板权限</h3>
                  <div className="flex flex-wrap gap-2">
                    {getDashboardPermissionLabels(viewingUser.dashboardPermissions ?? []).length > 0 ? (
                      getDashboardPermissionLabels(viewingUser.dashboardPermissions ?? []).map((label) => (
                        <Badge key={label} variant="secondary">{label}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">未配置可见看板</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>关闭</Button>
                <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); handleEdit(viewingUser); }} disabled={!isAdmin}>编辑</Button>
              </div>
            </div>
          )}
        </DraggableDialogContent>
      </DraggableDialog>

      {/* 修改密码对话框 */}
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
