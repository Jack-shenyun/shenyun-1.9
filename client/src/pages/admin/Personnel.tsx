import { ChangeEvent, ReactNode, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import ERPLayout from "@/components/ERPLayout";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { formatDateValue } from "@/lib/formatters";
import { Search, Users, Plus, MoreHorizontal, Eye, Edit, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

type PersonnelRecord = {
  id: number;
  employeeNo: string;
  name: string;
  gender?: "male" | "female" | null;
  idCard?: string | null;
  phone?: string | null;
  email?: string | null;
  department?: string | null;
  departmentId?: number | null;
  position?: string | null;
  entryDate?: string | null;
  contractExpiry?: string | null;
  education?: string | null;
  major?: string | null;
  healthStatus?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  address?: string | null;
  status: "active" | "probation" | "resigned" | "terminated";
  userId?: number | null;
  signatureImageUrl?: string | null;
  signatureImageName?: string | null;
  remark?: string | null;
};

type SignatureDraft = {
  name: string;
  mimeType: string;
  base64: string;
  previewUrl: string;
};

const statusMap: Record<PersonnelRecord["status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "在职", variant: "default" },
  probation: { label: "试用期", variant: "secondary" },
  resigned: { label: "离职", variant: "outline" },
  terminated: { label: "终止", variant: "destructive" },
};

const genderLabelMap: Record<string, string> = {
  male: "男",
  female: "女",
};

const educationOptions = ["高中", "大专", "本科", "硕士", "博士"];

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("加载图片失败"));
    image.src = src;
  });
}

async function buildTransparentSignature(file: File): Promise<SignatureDraft> {
  const src = await toDataUrl(file);
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("画布初始化失败");
  }
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const avg = (r + g + b) / 3;
    const nearWhite = avg > 238 && max - min < 18;
    const paleBackground = avg > 222 && max - min < 24;
    if (nearWhite) {
      data[index + 3] = 0;
      continue;
    }
    if (paleBackground) {
      const alpha = Math.max(0, Math.min(255, Math.round((245 - avg) * 11)));
      data[index + 3] = Math.min(data[index + 3], alpha);
    }
  }

  context.putImageData(imageData, 0, 0);
  const previewUrl = canvas.toDataURL("image/png");
  const baseName = file.name.replace(/\.[^.]+$/, "") || "signature";
  return {
    name: `${baseName}.png`,
    mimeType: "image/png",
    base64: previewUrl,
    previewUrl,
  };
}

function getCheckerboardStyle() {
  return {
    backgroundImage:
      "linear-gradient(45deg, rgba(148,163,184,0.14) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.14) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.14) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.14) 75%)",
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
  } as const;
}

function buildInitialForm(employeeNo: string, entryDate: string) {
  return {
    employeeNo,
    name: "",
    gender: "male",
    idCard: "",
    phone: "",
    email: "",
    departmentId: "",
    position: "",
    status: "probation",
    entryDate,
    contractExpiry: "",
    education: "",
    major: "",
    healthStatus: "健康",
    emergencyContact: "",
    emergencyPhone: "",
    address: "",
    remarks: "",
    userId: "",
    signatureImageUrl: "",
    signatureImageName: "",
  };
}

export default function PersonnelPage() {
  const { canDelete } = usePermission();
  const trpcClient = trpc as any;
  const { data: personnelData = [], isLoading, refetch } = trpcClient.personnel.list.useQuery();
  const { data: departmentsData = [] } = trpcClient.departments.list.useQuery({ status: "active" });
  const createMutation = trpcClient.personnel.create.useMutation();
  const updateMutation = trpcClient.personnel.update.useMutation();
  const deleteMutation = trpcClient.personnel.delete.useMutation();
  const uploadSignatureMutation = trpcClient.personnel.uploadSignature.useMutation();

  const personnel = personnelData as PersonnelRecord[];
  const departmentOptions = useMemo(
    () => (departmentsData as any[]).map((department) => ({
      id: Number(department.id),
      name: String(department.name || ""),
    })),
    [departmentsData]
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonnelRecord | null>(null);
  const [viewingPerson, setViewingPerson] = useState<PersonnelRecord | null>(null);
  const [signatureDraft, setSignatureDraft] = useState<SignatureDraft | null>(null);
  const [formData, setFormData] = useState(buildInitialForm("", ""));

  const nextEmployeeNo = useMemo(() => {
    const maxNo = personnel.reduce((maxValue, person) => {
      const matched = String(person.employeeNo || "").match(/^EMP(\d+)$/);
      return matched ? Math.max(maxValue, Number(matched[1])) : maxValue;
    }, 0);
    return `EMP${String(maxNo + 1).padStart(3, "0")}`;
  }, [personnel]);

  const filteredPersonnel = useMemo(() => {
    return personnel.filter((person) => {
      const keyword = searchTerm.trim().toLowerCase();
      const matchesSearch = !keyword || [
        person.employeeNo,
        person.name,
        person.department,
        person.position,
        person.phone,
      ].some((field) => String(field || "").toLowerCase().includes(keyword));
      const matchesStatus = statusFilter === "all" || person.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [personnel, searchTerm, statusFilter]);

  const activeCount = personnel.filter((person) => person.status === "active").length;
  const probationCount = personnel.filter((person) => person.status === "probation").length;
  const inactiveCount = personnel.filter((person) => ["resigned", "terminated"].includes(person.status)).length;

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    uploadSignatureMutation.isPending;

  const signaturePreview = signatureDraft?.previewUrl || formData.signatureImageUrl || "";

  const FieldRow = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );

  const openCreateDialog = () => {
    setEditingPerson(null);
    setSignatureDraft(null);
    setFormData(buildInitialForm(nextEmployeeNo, new Date().toISOString().split("T")[0]));
    setDialogOpen(true);
  };

  const openEditDialog = (person: PersonnelRecord) => {
    setEditingPerson(person);
    setSignatureDraft(null);
    setFormData({
      employeeNo: person.employeeNo || "",
      name: person.name || "",
      gender: person.gender || "male",
      idCard: person.idCard || "",
      phone: person.phone || "",
      email: person.email || "",
      departmentId: person.departmentId ? String(person.departmentId) : "",
      position: person.position || "",
      status: person.status || "active",
      entryDate: person.entryDate ? String(person.entryDate).slice(0, 10) : "",
      contractExpiry: person.contractExpiry ? String(person.contractExpiry).slice(0, 10) : "",
      education: person.education || "",
      major: person.major || "",
      healthStatus: person.healthStatus || "",
      emergencyContact: person.emergencyContact || "",
      emergencyPhone: person.emergencyPhone || "",
      address: person.address || "",
      remarks: person.remark || "",
      userId: person.userId ? String(person.userId) : "",
      signatureImageUrl: person.signatureImageUrl || "",
      signatureImageName: person.signatureImageName || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (person: PersonnelRecord) => {
    if (!canDelete) {
      toast.error("您没有删除权限");
      return;
    }
    if (!window.confirm(`确认删除员工 ${person.name} 吗？`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync({ id: person.id });
      await refetch();
      toast.success("员工档案已删除");
    } catch (error: any) {
      toast.error(`删除失败：${error?.message || "请稍后重试"}`);
    }
  };

  const handleSignatureFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const processed = await buildTransparentSignature(file);
      if (editingPerson?.id) {
        const uploaded = await uploadSignatureMutation.mutateAsync({
          id: editingPerson.id,
          name: processed.name,
          mimeType: processed.mimeType,
          base64: processed.base64,
        });
        setSignatureDraft(null);
        setFormData((prev) => ({
          ...prev,
          signatureImageUrl: uploaded.signatureImageUrl,
          signatureImageName: uploaded.signatureImageName,
        }));
        setEditingPerson((prev) => (
          prev
            ? {
                ...prev,
                signatureImageUrl: uploaded.signatureImageUrl,
                signatureImageName: uploaded.signatureImageName,
              }
            : prev
        ));
        setViewingPerson((prev) => (
          prev && prev.id === editingPerson.id
            ? {
                ...prev,
                signatureImageUrl: uploaded.signatureImageUrl,
                signatureImageName: uploaded.signatureImageName,
              }
            : prev
        ));
        await refetch();
        toast.success("电子签名已上传");
        return;
      }
      setSignatureDraft(processed);
      setFormData((prev) => ({
        ...prev,
        signatureImageName: processed.name,
      }));
      toast.success("签名图片已处理，保存后会自动上传");
    } catch (error: any) {
      toast.error(`签名处理失败：${error?.message || "请更换图片重试"}`);
    }
  };

  const clearSignaturePreview = () => {
    setSignatureDraft(null);
    setFormData((prev) => ({
      ...prev,
      signatureImageUrl: "",
      signatureImageName: "",
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.position.trim() || !formData.departmentId) {
      toast.error("请填写姓名、部门和职位");
      return;
    }

    const payload = {
      employeeNo: formData.employeeNo.trim(),
      name: formData.name.trim(),
      gender: formData.gender as "male" | "female",
      idCard: formData.idCard.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      departmentId: Number(formData.departmentId),
      position: formData.position.trim(),
      entryDate: formData.entryDate || undefined,
      contractExpiry: formData.contractExpiry || undefined,
      education: formData.education || undefined,
      major: formData.major.trim(),
      healthStatus: formData.healthStatus.trim(),
      emergencyContact: formData.emergencyContact.trim(),
      emergencyPhone: formData.emergencyPhone.trim(),
      address: formData.address.trim(),
      status: formData.status as PersonnelRecord["status"],
      userId: formData.userId ? Number(formData.userId) : undefined,
      signatureImageUrl: formData.signatureImageUrl,
      signatureImageName: formData.signatureImageName,
      remark: formData.remarks.trim(),
    };

    try {
      let personnelId = editingPerson?.id;
      if (editingPerson) {
        await updateMutation.mutateAsync({
          id: editingPerson.id,
          data: payload,
        });
      } else {
        personnelId = await createMutation.mutateAsync(payload as any);
      }

      if (personnelId && signatureDraft) {
        const uploaded = await uploadSignatureMutation.mutateAsync({
          id: personnelId,
          name: signatureDraft.name,
          mimeType: signatureDraft.mimeType,
          base64: signatureDraft.base64,
        });
        setFormData((prev) => ({
          ...prev,
          signatureImageUrl: uploaded.signatureImageUrl,
          signatureImageName: uploaded.signatureImageName,
        }));
      }

      await refetch();
      toast.success(editingPerson ? "员工信息已更新" : "员工档案创建成功");
      setDialogOpen(false);
      setEditingPerson(null);
      setSignatureDraft(null);
    } catch (error: any) {
      toast.error(`保存失败：${error?.message || "请稍后重试"}`);
    }
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">人事管理</h2>
              <p className="text-sm text-muted-foreground">员工档案、系统用户补充和电子签名配置统一维护</p>
            </div>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" />
            新增员工
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">员工总数</p>
              <p className="text-2xl font-bold">{personnel.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">在职人数</p>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">试用期</p>
              <p className="text-2xl font-bold text-amber-600">{probationCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">离职/终止</p>
              <p className="text-2xl font-bold text-slate-600">{inactiveCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索工号、姓名、部门..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">在职</SelectItem>
                  <SelectItem value="probation">试用期</SelectItem>
                  <SelectItem value="resigned">离职</SelectItem>
                  <SelectItem value="terminated">终止</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-[110px] text-center font-bold">工号</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">姓名</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">部门</TableHead>
                  <TableHead className="text-center font-bold">职位</TableHead>
                  <TableHead className="w-[140px] text-center font-bold">联系电话</TableHead>
                  <TableHead className="w-[90px] text-center font-bold">签名</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">状态</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">入职日期</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPersonnel.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="text-center font-medium">{person.employeeNo}</TableCell>
                    <TableCell className="text-center">{person.name}</TableCell>
                    <TableCell className="text-center">{person.department || "-"}</TableCell>
                    <TableCell className="text-center">{person.position || "-"}</TableCell>
                    <TableCell className="text-center">{person.phone || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={person.signatureImageUrl ? "default" : "outline"}>
                        {person.signatureImageUrl ? "已上传" : "未设置"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={statusMap[person.status]?.variant || "outline"}
                        className={getStatusSemanticClass(person.status, statusMap[person.status]?.label)}
                      >
                        {statusMap[person.status]?.label || person.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{formatDateValue(person.entryDate)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setViewingPerson(person); setViewDialogOpen(true); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(person)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem onClick={() => void handleDelete(person)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredPersonnel.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      暂无人员数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <DraggableDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>{editingPerson ? "编辑员工信息" : "新增员工"}</DialogTitle>
              <DialogDescription>
                在人事管理中统一维护员工档案和电子签名，系统用户会自动补充进来。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>工号</Label>
                  <Input
                    value={formData.employeeNo}
                    onChange={(event) => setFormData((prev) => ({ ...prev, employeeNo: event.target.value }))}
                    disabled={!!editingPerson}
                  />
                </div>
                <div className="space-y-2">
                  <Label>姓名 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="请输入姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>性别</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">男</SelectItem>
                      <SelectItem value="female">女</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>部门 *</Label>
                  <Select
                    value={formData.departmentId || undefined}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, departmentId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择部门" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((department) => (
                        <SelectItem key={department.id} value={String(department.id)}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>职位 *</Label>
                  <Input
                    value={formData.position}
                    onChange={(event) => setFormData((prev) => ({ ...prev, position: event.target.value }))}
                    placeholder="请输入职位"
                  />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">在职</SelectItem>
                      <SelectItem value="probation">试用期</SelectItem>
                      <SelectItem value="resigned">离职</SelectItem>
                      <SelectItem value="terminated">终止</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>联系电话</Label>
                  <Input
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="请输入联系电话"
                  />
                </div>
                <div className="space-y-2">
                  <Label>邮箱</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="请输入邮箱"
                  />
                </div>
                <div className="space-y-2">
                  <Label>身份证号</Label>
                  <Input
                    value={formData.idCard}
                    onChange={(event) => setFormData((prev) => ({ ...prev, idCard: event.target.value }))}
                    placeholder="请输入身份证号"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>入职日期</Label>
                  <Input
                    type="date"
                    value={formData.entryDate}
                    onChange={(event) => setFormData((prev) => ({ ...prev, entryDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>合同到期</Label>
                  <Input
                    type="date"
                    value={formData.contractExpiry}
                    onChange={(event) => setFormData((prev) => ({ ...prev, contractExpiry: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>学历</Label>
                  <Select value={formData.education || undefined} onValueChange={(value) => setFormData((prev) => ({ ...prev, education: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择学历" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationOptions.map((education) => (
                        <SelectItem key={education} value={education}>
                          {education}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>健康状况</Label>
                  <Input
                    value={formData.healthStatus}
                    onChange={(event) => setFormData((prev) => ({ ...prev, healthStatus: event.target.value }))}
                    placeholder="健康状况"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>专业</Label>
                  <Input
                    value={formData.major}
                    onChange={(event) => setFormData((prev) => ({ ...prev, major: event.target.value }))}
                    placeholder="请输入专业"
                  />
                </div>
                <div className="space-y-2">
                  <Label>家庭住址</Label>
                  <Input
                    value={formData.address}
                    onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                    placeholder="请输入家庭住址"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>紧急联系人</Label>
                  <Input
                    value={formData.emergencyContact}
                    onChange={(event) => setFormData((prev) => ({ ...prev, emergencyContact: event.target.value }))}
                    placeholder="紧急联系人姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>紧急联系电话</Label>
                  <Input
                    value={formData.emergencyPhone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, emergencyPhone: event.target.value }))}
                    placeholder="紧急联系电话"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>电子签名</Label>
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-start rounded-xl border border-slate-200 p-4">
                  <div
                    className="h-28 rounded-lg border border-dashed border-slate-300 flex items-center justify-center overflow-hidden"
                    style={getCheckerboardStyle()}
                  >
                    {signaturePreview ? (
                      <img src={signaturePreview} alt="电子签名预览" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="px-4 text-center text-xs text-muted-foreground">
                        上传签名照片后会自动去底，保存为透明 PNG
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <input
                        id="personnel-signature-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleSignatureFile}
                      />
                      <label htmlFor="personnel-signature-upload" className="cursor-pointer">
                        <Button type="button" variant="outline" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-1" />
                            上传电子签名
                          </span>
                        </Button>
                      </label>
                      {(signaturePreview || formData.signatureImageName) && (
                        <Button type="button" variant="ghost" onClick={clearSignaturePreview}>
                          清除
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>建议使用白底签名照片，系统会自动去掉浅色背景，方便后续在检验单里直接调用。</p>
                      <p>{editingPerson ? "编辑已有员工时，选择图片后会立即上传。" : "新建员工时，签名会在保存员工档案后自动上传。"}</p>
                      {formData.signatureImageName && (
                        <p>当前文件：{formData.signatureImageName}</p>
                      )}
                      {formData.userId && (
                        <p>该档案来自系统用户同步，可直接作为后续电子签名调用来源。</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(event) => setFormData((prev) => ({ ...prev, remarks: event.target.value }))}
                  placeholder="其他备注信息"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                取消
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
                {editingPerson ? "保存修改" : "创建员工"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <DraggableDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DraggableDialogContent>
            {viewingPerson && (
              <div className="space-y-6 p-1">
                <div className="border-b pb-3">
                  <h2 className="text-lg font-semibold">员工详情</h2>
                  <p className="text-sm text-muted-foreground">
                    {viewingPerson.employeeNo}
                    {viewingPerson.status && (
                      <>
                        {" "}·{" "}
                        <Badge
                          variant={statusMap[viewingPerson.status]?.variant || "outline"}
                          className={getStatusSemanticClass(viewingPerson.status, statusMap[viewingPerson.status]?.label)}
                        >
                          {statusMap[viewingPerson.status]?.label || viewingPerson.status}
                        </Badge>
                      </>
                    )}
                    {viewingPerson.userId ? (
                      <>
                        {" "}· <span>系统用户已补充</span>
                      </>
                    ) : null}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6">
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <div>
                          <FieldRow label="姓名">{viewingPerson.name}</FieldRow>
                          <FieldRow label="性别">{genderLabelMap[String(viewingPerson.gender || "")] || "-"}</FieldRow>
                          <FieldRow label="身份证号">{viewingPerson.idCard || "-"}</FieldRow>
                          <FieldRow label="联系电话">{viewingPerson.phone || "-"}</FieldRow>
                          <FieldRow label="邮箱">{viewingPerson.email || "-"}</FieldRow>
                        </div>
                        <div>
                          <FieldRow label="部门">{viewingPerson.department || "-"}</FieldRow>
                          <FieldRow label="职位">{viewingPerson.position || "-"}</FieldRow>
                          <FieldRow label="入职日期">{formatDateValue(viewingPerson.entryDate)}</FieldRow>
                          <FieldRow label="学历">{viewingPerson.education || "-"}</FieldRow>
                          <FieldRow label="专业">{viewingPerson.major || "-"}</FieldRow>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">其他信息</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <div>
                          <FieldRow label="健康状况">{viewingPerson.healthStatus || "-"}</FieldRow>
                          <FieldRow label="紧急联系人">{viewingPerson.emergencyContact || "-"}</FieldRow>
                          <FieldRow label="紧急联系电话">{viewingPerson.emergencyPhone || "-"}</FieldRow>
                        </div>
                        <div>
                          <FieldRow label="家庭住址">{viewingPerson.address || "-"}</FieldRow>
                          <FieldRow label="合同到期">{formatDateValue(viewingPerson.contractExpiry)}</FieldRow>
                        </div>
                      </div>
                    </div>

                    {viewingPerson.remark ? (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                        <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
                          {viewingPerson.remark}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">电子签名</h3>
                    <div
                      className="rounded-xl border border-slate-200 p-4 min-h-[180px] flex items-center justify-center overflow-hidden"
                      style={getCheckerboardStyle()}
                    >
                      {viewingPerson.signatureImageUrl ? (
                        <img
                          src={viewingPerson.signatureImageUrl}
                          alt="电子签名"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-sm text-muted-foreground">
                          暂未上传电子签名
                        </div>
                      )}
                    </div>
                    {viewingPerson.signatureImageName ? (
                      <p className="text-xs text-muted-foreground break-all">{viewingPerson.signatureImageName}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>
                    关闭
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewDialogOpen(false);
                      openEditDialog(viewingPerson);
                    }}
                  >
                    编辑
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
