import { useEffect, useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { toast } from "sonner";
import { FileSignature, RefreshCw, Save, Wand2 } from "lucide-react";

function buildDefaultSignatureTemplate(input: {
  name?: string | null;
  englishName?: string | null;
  position?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  companyNameCn?: string | null;
  companyNameEn?: string | null;
  website?: string | null;
}) {
  const lines = [
    String(input.name || "").trim(),
    String(input.englishName || "").trim(),
    [input.position, input.department]
      .map(item => String(item || "").trim())
      .filter(Boolean)
      .join(" | "),
    String(input.companyNameCn || "").trim(),
    String(input.companyNameEn || "").trim(),
    input.phone ? `Tel: ${String(input.phone).trim()}` : "",
    input.email ? `Email: ${String(input.email).trim()}` : "",
    input.website ? `Web: ${String(input.website).trim()}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

export default function SignatureSettingsPage() {
  const { user } = useAuth();
  const { companyShortName } = useCompanyBranding();
  const [signature, setSignature] = useState("");

  const signatureQuery = trpc.settings.getMyEmailSignature.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const companyInfoQuery = trpc.companyInfo.get.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const saveMutation = trpc.settings.saveMyEmailSignature.useMutation({
    onSuccess: () => {
      toast.success("签名已保存");
      signatureQuery.refetch();
    },
    onError: (error) =>
      toast.error("保存失败", { description: error.message }),
  });

  useEffect(() => {
    if (signatureQuery.data?.emailSignature === undefined) return;
    setSignature(String(signatureQuery.data?.emailSignature || ""));
  }, [signatureQuery.data?.emailSignature]);

  const defaultSignature = useMemo(
    () =>
      buildDefaultSignatureTemplate({
        name: (user as any)?.name,
        englishName: (user as any)?.englishName,
        position: (user as any)?.position,
        department: (user as any)?.department,
        phone: (user as any)?.phone || (companyInfoQuery.data as any)?.phone,
        email: (user as any)?.email || (companyInfoQuery.data as any)?.email,
        companyNameCn: (companyInfoQuery.data as any)?.companyNameCn,
        companyNameEn: (companyInfoQuery.data as any)?.companyNameEn,
        website: (companyInfoQuery.data as any)?.website,
      }),
    [companyInfoQuery.data, user]
  );

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSignature className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">签名页</h2>
              <p className="text-sm text-muted-foreground">
                {companyShortName} 当前公司的个人邮件签名管理
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => signatureQuery.refetch()}
              disabled={signatureQuery.isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${signatureQuery.isLoading ? "animate-spin" : ""}`}
              />
              刷新
            </Button>
            <Button
              onClick={() =>
                saveMutation.mutate({
                  emailSignature: signature,
                })
              }
              disabled={saveMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              保存签名
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">自动生效</Badge>
              <span>写邮件和当前页回复发送时会自动附加这里的签名。</span>
            </div>
            <p>签名按“当前用户 + 当前公司”保存，神韵、滴乐、瑞仁可以分别维护。</p>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>编辑签名</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSignature(defaultSignature)}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                生成默认模板
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                className="min-h-[320px]"
                placeholder="请输入个人签名内容，例如姓名、职位、电话、邮箱、公司信息等"
                value={signature}
                onChange={event => setSignature(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                建议一行一个信息项，系统会按当前排版自动附加到邮件末尾。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>签名预览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-[320px] rounded-lg border bg-muted/20 p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">
                  {signature.trim() || "暂无签名内容"}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ERPLayout>
  );
}
