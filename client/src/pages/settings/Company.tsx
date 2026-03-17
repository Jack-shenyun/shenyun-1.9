import { useEffect, useRef, useState, type ChangeEvent } from "react";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { toast } from "sonner";
import { Building2, Image as ImageIcon, Loader2, RefreshCw, Save, Upload } from "lucide-react";

type CompanyFormData = {
  logoUrl: string;
  companyNameCn: string;
  companyNameEn: string;
  addressCn: string;
  addressEn: string;
  website: string;
  email: string;
  contactNameCn: string;
  contactNameEn: string;
  phone: string;
  whatsapp: string;
};

const EMPTY_FORM: CompanyFormData = {
  logoUrl: "",
  companyNameCn: "",
  companyNameEn: "",
  addressCn: "",
  addressEn: "",
  website: "",
  email: "",
  contactNameCn: "",
  contactNameEn: "",
  phone: "",
  whatsapp: "",
};

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CompanyInfoPage() {
  const { isAdmin } = usePermission();
  const { companyShortName } = useCompanyBranding();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>(EMPTY_FORM);
  const [logoFileName, setLogoFileName] = useState("");

  const { data, isLoading, refetch } = trpc.companyInfo.get.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const updateMutation = trpc.companyInfo.update.useMutation({
    onSuccess: () => toast.success("公司信息保存成功"),
    onError: (error) => toast.error("保存失败", { description: error.message }),
  });
  const uploadLogoMutation = trpc.companyInfo.uploadLogo.useMutation({
    onSuccess: (result) => {
      setFormData((prev) => ({ ...prev, logoUrl: result.logoUrl || "" }));
      toast.success("商标上传成功");
    },
    onError: (error) => toast.error("商标上传失败", { description: error.message }),
  });

  useEffect(() => {
    if (!data) return;
    setFormData({
      logoUrl: String(data.logoUrl ?? ""),
      companyNameCn: String(data.companyNameCn ?? ""),
      companyNameEn: String(data.companyNameEn ?? ""),
      addressCn: String(data.addressCn ?? ""),
      addressEn: String(data.addressEn ?? ""),
      website: String(data.website ?? ""),
      email: String(data.email ?? ""),
      contactNameCn: String(data.contactNameCn ?? ""),
      contactNameEn: String(data.contactNameEn ?? ""),
      phone: String(data.phone ?? ""),
      whatsapp: String(data.whatsapp ?? ""),
    });
  }, [data]);

  const handleChange = (key: keyof CompanyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error("仅管理员可修改公司信息");
      return;
    }
    await updateMutation.mutateAsync({
      logoUrl: formData.logoUrl.trim(),
      companyNameCn: formData.companyNameCn.trim(),
      companyNameEn: formData.companyNameEn.trim(),
      addressCn: formData.addressCn.trim(),
      addressEn: formData.addressEn.trim(),
      website: formData.website.trim(),
      email: formData.email.trim(),
      contactNameCn: formData.contactNameCn.trim(),
      contactNameEn: formData.contactNameEn.trim(),
      phone: formData.phone.trim(),
      whatsapp: formData.whatsapp.trim(),
    });
    await refetch();
  };

  const handlePickLogo = () => {
    if (!isAdmin) {
      toast.error("仅管理员可上传商标");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleLogoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isAdmin) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片格式文件");
      return;
    }
    setLogoFileName(file.name);
    const base64 = await toBase64(file);
    await uploadLogoMutation.mutateAsync({
      name: file.name,
      mimeType: file.type,
      base64,
    });
  };

  return (
    <ERPLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">公司信息</h2>
              <p className="text-sm text-muted-foreground">{companyShortName} 的系统抬头、打印和品牌显示配置</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button onClick={handleSave} disabled={!isAdmin || updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              保存
            </Button>
          </div>
        </div>

        {!isAdmin && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              当前为只读模式，仅管理员可修改公司信息。
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>商标 / Logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="h-24 w-48 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="公司商标" className="h-full w-full object-contain" />
                ) : (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    暂无商标
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Button variant="outline" onClick={handlePickLogo} disabled={!isAdmin || uploadLogoMutation.isPending}>
                  {uploadLogoMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  上传商标
                </Button>
                <p className="text-xs text-muted-foreground">
                  支持 jpg / png / webp / gif / bmp / svg
                  {logoFileName ? `，当前选择：${logoFileName}` : ""}
                </p>
              </div>
            </div>
            <Input
              value={formData.logoUrl}
              onChange={(e) => handleChange("logoUrl", e.target.value)}
              placeholder="商标地址（可手动填写）"
              disabled={!isAdmin}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoSelected}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>基础信息 / Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>公司名称（中文）</Label>
                <Input
                  value={formData.companyNameCn}
                  onChange={(e) => handleChange("companyNameCn", e.target.value)}
                  placeholder="请输入公司中文全称"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name (English)</Label>
                <Input
                  value={formData.companyNameEn}
                  onChange={(e) => handleChange("companyNameEn", e.target.value)}
                  placeholder="Enter company name in English"
                  disabled={!isAdmin}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>地址（中文）</Label>
                <Textarea
                  value={formData.addressCn}
                  onChange={(e) => handleChange("addressCn", e.target.value)}
                  placeholder="请输入中文地址"
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Address (English)</Label>
                <Textarea
                  value={formData.addressEn}
                  onChange={(e) => handleChange("addressEn", e.target.value)}
                  placeholder="Enter address in English"
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>网址 / Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="https://www.example.com"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>邮箱 / Email</Label>
                <Input
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="info@example.com"
                  disabled={!isAdmin}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>联系人姓名（中文）</Label>
                <Input
                  value={formData.contactNameCn}
                  onChange={(e) => handleChange("contactNameCn", e.target.value)}
                  placeholder="请输入联系人中文姓名"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Name (English)</Label>
                <Input
                  value={formData.contactNameEn}
                  onChange={(e) => handleChange("contactNameEn", e.target.value)}
                  placeholder="Enter contact name in English"
                  disabled={!isAdmin}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>联系电话 / Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="请输入联系电话"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={formData.whatsapp}
                  onChange={(e) => handleChange("whatsapp", e.target.value)}
                  placeholder="请输入 WhatsApp 号码"
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}
