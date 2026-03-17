import { formatDateValue } from "@/lib/formatters";
import { useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Edit, ExternalLink, Eye, Globe, Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface MedicalPlatform {
  id: number;
  regionCode: string;
  province: string;
  platformName: string;
  platformType: "医保服务平台" | "医药招采平台";
  coverageLevel: "national" | "province";
  platformUrl: string;
  officialSourceUrl: string;
  verificationStatus: "verified" | "pending";
  status: "active" | "pending";
  accountNo: string;
  password: string;
  lastUpdate: string;
  remarks: string;
}

interface PlatformFormData {
  province: string;
  platformName: string;
  platformType: "医保服务平台" | "医药招采平台";
  coverageLevel: "national" | "province";
  platformUrl: string;
  officialSourceUrl: string;
  verificationStatus: "verified" | "pending";
  accountNo: string;
  password: string;
  remarks: string;
}

const verificationMap = {
  verified: { label: "已核验", variant: "default" as const },
  pending: { label: "待核验", variant: "outline" as const },
};

const typeOptions = ["all", "医保服务平台", "医药招采平台"] as const;

const getSafeUrl = (value?: string) => {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

export default function PlatformPage() {
  const { data = [], isLoading, refetch } = trpc.medicalPlatforms.list.useQuery();
  const platforms = data as MedicalPlatform[];
  const [searchTerm, setSearchTerm] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDialogMaximized, setFormDialogMaximized] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewDialogMaximized, setViewDialogMaximized] = useState(false);
  const [loginAssistOpen, setLoginAssistOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<MedicalPlatform | null>(null);
  const [viewingPlatform, setViewingPlatform] = useState<MedicalPlatform | null>(null);
  const [loginAssistPlatform, setLoginAssistPlatform] = useState<MedicalPlatform | null>(null);
  const [formData, setFormData] = useState<PlatformFormData>({
    province: "",
    platformName: "",
    platformType: "医保服务平台",
    coverageLevel: "province",
    platformUrl: "",
    officialSourceUrl: "",
    verificationStatus: "pending",
    accountNo: "",
    password: "",
    remarks: "",
  });
  const createMutation = trpc.medicalPlatforms.create.useMutation({
    onSuccess: async () => {
      await refetch();
      setDialogOpen(false);
    },
  });
  const updateMutation = trpc.medicalPlatforms.update.useMutation({
    onSuccess: async () => {
      await refetch();
      setDialogOpen(false);
    },
  });

  const filteredPlatforms = platforms.filter((platform) => {
    const keyword = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !keyword ||
      [
        platform.platformName,
        platform.province,
        platform.platformType,
        platform.platformUrl,
      ].some((value) => value.toLowerCase().includes(keyword));
    const matchesVerification =
      verificationFilter === "all" || platform.verificationStatus === verificationFilter;
    const matchesType = typeFilter === "all" || platform.platformType === typeFilter;
    return matchesSearch && matchesVerification && matchesType;
  });

  const verifiedCount = platforms.filter((platform) => platform.verificationStatus === "verified").length;
  const pendingCount = platforms.filter((platform) => platform.verificationStatus === "pending").length;
  const procurementCount = platforms.filter((platform) => platform.platformType === "医药招采平台").length;
  const provinceOptions = Array.from(new Set(platforms.map((platform) => platform.province))).filter(Boolean);

  const FieldRow = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );

  const handleAdd = () => {
    setEditingPlatform(null);
    setFormData({
      province: "",
      platformName: "",
      platformType: "医保服务平台",
      coverageLevel: "province",
      platformUrl: "",
      officialSourceUrl: "",
      verificationStatus: "pending",
      accountNo: "",
      password: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (platform: MedicalPlatform) => {
    setEditingPlatform(platform);
    setFormData({
      province: platform.province,
      platformName: platform.platformName,
      platformType: platform.platformType,
      coverageLevel: platform.coverageLevel,
      platformUrl: platform.platformUrl,
      officialSourceUrl: platform.officialSourceUrl,
      verificationStatus: platform.verificationStatus,
      accountNo: platform.accountNo || "",
      password: platform.password || "",
      remarks: platform.remarks || "",
    });
    setDialogOpen(true);
  };

  const handleCopy = async (value: string, label: string) => {
    if (!value) {
      toast.error(`未维护${label}`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label}已复制`);
    } catch {
      toast.error(`${label}复制失败`);
    }
  };

  const handleOpenPlatform = (platform: MedicalPlatform) => {
    window.open(getSafeUrl(platform.platformUrl), "_blank", "noopener,noreferrer");
    setLoginAssistPlatform(platform);
    setLoginAssistOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.platformName || !formData.province || !formData.platformUrl) {
      return;
    }

    if (editingPlatform) {
      updateMutation.mutate({ id: editingPlatform.id, data: formData });
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">平台管理</h2>
              <p className="text-sm text-muted-foreground">统一维护全国医保/招采平台主数据，供挂网管理直接调用</p>
            </div>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            新增平台
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">平台总数</p>
              <p className="text-2xl font-bold">{platforms.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已核验入口</p>
              <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">待核验入口</p>
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">招采平台</p>
              <p className="text-2xl font-bold text-blue-600">{procurementCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索平台名称、区域、平台类型、网址..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="核验状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="verified">已核验</SelectItem>
                  <SelectItem value="pending">待核验</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[170px]">
                  <SelectValue placeholder="平台类型" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "all" ? "全部类型" : item}
                    </SelectItem>
                  ))}
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
                  <TableHead className="text-center font-bold">平台名称</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">区域</TableHead>
                  <TableHead className="w-[120px] text-center font-bold">平台类型</TableHead>
                  <TableHead className="text-center font-bold">登录入口</TableHead>
                  <TableHead className="w-[100px] text-center font-bold">核验状态</TableHead>
                  <TableHead className="w-[110px] text-center font-bold">最后核验</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      平台数据加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredPlatforms.length > 0 ? (
                  filteredPlatforms.map((platform) => (
                    <TableRow key={platform.id}>
                      <TableCell className="text-center font-medium">{platform.platformName}</TableCell>
                      <TableCell className="text-center">{platform.province}</TableCell>
                      <TableCell className="text-center">{platform.platformType}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="link" className="h-auto p-0" onClick={() => handleOpenPlatform(platform)}>
                          进入平台
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={verificationMap[platform.verificationStatus].variant}>
                          {verificationMap[platform.verificationStatus].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{formatDateValue(platform.lastUpdate)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setViewingPlatform(platform);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      暂无平台数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <DraggableDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          defaultWidth={960}
          defaultHeight={760}
          isMaximized={formDialogMaximized}
          onMaximizedChange={setFormDialogMaximized}
        >
          <DraggableDialogContent isMaximized={formDialogMaximized}>
            <DialogHeader>
              <DialogTitle>{editingPlatform ? "编辑平台" : "新增平台"}</DialogTitle>
              <DialogDescription>
                {editingPlatform ? "修改平台基础信息" : "新增平台基础信息并保存到后端"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>平台名称 *</Label>
                  <Input
                    value={formData.platformName}
                    onChange={(event) => setFormData({ ...formData, platformName: event.target.value })}
                    placeholder="请输入平台名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>区域 *</Label>
                  <Select value={formData.province} onValueChange={(value) => setFormData({ ...formData, province: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择区域" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinceOptions.map((province) => (
                        <SelectItem key={province} value={province}>
                          {province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>平台类型</Label>
                  <Select
                    value={formData.platformType}
                    onValueChange={(value: PlatformFormData["platformType"]) => setFormData({ ...formData, platformType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="医保服务平台">医保服务平台</SelectItem>
                      <SelectItem value="医药招采平台">医药招采平台</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>覆盖范围</Label>
                  <Select
                    value={formData.coverageLevel}
                    onValueChange={(value: PlatformFormData["coverageLevel"]) => setFormData({ ...formData, coverageLevel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="province">省级</SelectItem>
                      <SelectItem value="national">全国</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>登录入口 *</Label>
                  <Input
                    value={formData.platformUrl}
                    onChange={(event) => setFormData({ ...formData, platformUrl: event.target.value })}
                    placeholder="https://"
                  />
                </div>
                <div className="space-y-2">
                  <Label>官方来源</Label>
                  <Input
                    value={formData.officialSourceUrl}
                    onChange={(event) => setFormData({ ...formData, officialSourceUrl: event.target.value })}
                    placeholder="https://"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>平台账号</Label>
                  <Input
                    value={formData.accountNo}
                    onChange={(event) => setFormData({ ...formData, accountNo: event.target.value })}
                    placeholder="登录账号/手机号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>平台密码</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    placeholder="登录密码"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>核验状态</Label>
                  <Select
                    value={formData.verificationStatus}
                    onValueChange={(value: PlatformFormData["verificationStatus"]) =>
                      setFormData({ ...formData, verificationStatus: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verified">已核验</SelectItem>
                      <SelectItem value="pending">待核验</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(event) => setFormData({ ...formData, remarks: event.target.value })}
                  rows={3}
                  placeholder="备注信息"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingPlatform ? "保存修改" : "创建平台"}
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <DraggableDialog
          open={loginAssistOpen}
          onOpenChange={setLoginAssistOpen}
          defaultWidth={560}
          defaultHeight={420}
        >
          <DraggableDialogContent>
            {loginAssistPlatform ? (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle>平台登录辅助</DialogTitle>
                  <DialogDescription>{loginAssistPlatform.platformName}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="text-sm">
                      <div className="text-muted-foreground mb-1">登录入口</div>
                      <div className="break-all">{loginAssistPlatform.platformUrl}</div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="rounded-md border bg-background px-3 py-2">
                        <div className="text-xs text-muted-foreground mb-1">平台账号</div>
                        <div className="font-medium break-all">{loginAssistPlatform.accountNo || "未维护"}</div>
                      </div>
                      <div className="rounded-md border bg-background px-3 py-2">
                        <div className="text-xs text-muted-foreground mb-1">平台密码</div>
                        <div className="font-medium break-all">{loginAssistPlatform.password || "未维护"}</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    受浏览器跨站限制，不能直接自动填充第三方平台登录框；可在这里快速复制后粘贴登录。
                  </p>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => handleCopy(loginAssistPlatform.accountNo, "平台账号")}>
                    <Copy className="h-4 w-4 mr-1" />
                    复制账号
                  </Button>
                  <Button variant="outline" onClick={() => handleCopy(loginAssistPlatform.password, "平台密码")}>
                    <Copy className="h-4 w-4 mr-1" />
                    复制密码
                  </Button>
                  <Button onClick={() => window.open(getSafeUrl(loginAssistPlatform.platformUrl), "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    再次打开平台
                  </Button>
                </DialogFooter>
              </div>
            ) : null}
          </DraggableDialogContent>
        </DraggableDialog>

        <DraggableDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          defaultWidth={920}
          defaultHeight={720}
          isMaximized={viewDialogMaximized}
          onMaximizedChange={setViewDialogMaximized}
        >
          <DraggableDialogContent isMaximized={viewDialogMaximized}>
            {viewingPlatform && (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle>平台详情</DialogTitle>
                  <DialogDescription>{viewingPlatform.platformName}</DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">基本信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <div>
                        <FieldRow label="区域">{viewingPlatform.province}</FieldRow>
                        <FieldRow label="平台类型">{viewingPlatform.platformType}</FieldRow>
                        <FieldRow label="覆盖范围">
                          {viewingPlatform.coverageLevel === "national" ? "全国" : "省级"}
                        </FieldRow>
                      </div>
                      <div>
                        <FieldRow label="登录入口">
                          <Button variant="link" className="h-auto p-0" onClick={() => handleOpenPlatform(viewingPlatform)}>
                            {viewingPlatform.platformUrl}
                          </Button>
                        </FieldRow>
                        <FieldRow label="官方来源">
                          <a
                            href={getSafeUrl(viewingPlatform.officialSourceUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {viewingPlatform.officialSourceUrl}
                          </a>
                        </FieldRow>
                        <FieldRow label="平台账号">{viewingPlatform.accountNo || "未维护"}</FieldRow>
                        <FieldRow label="平台密码">{viewingPlatform.password ? "已维护" : "未维护"}</FieldRow>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">核验信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      <div>
                        <FieldRow label="核验状态">
                          <Badge variant={verificationMap[viewingPlatform.verificationStatus].variant}>
                            {verificationMap[viewingPlatform.verificationStatus].label}
                          </Badge>
                        </FieldRow>
                      </div>
                      <div>
                        <FieldRow label="最后核验">{formatDateValue(viewingPlatform.lastUpdate)}</FieldRow>
                      </div>
                    </div>
                  </div>

                  {viewingPlatform.remarks ? (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">备注</h3>
                      <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
                        {viewingPlatform.remarks}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="flex justify-end pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewDialogOpen(false);
                      handleEdit(viewingPlatform);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    编辑
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>
                    关闭
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
