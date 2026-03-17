import { FormEvent, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LOCAL_AUTH_USER_KEY } from "@/const";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import shenyunLogo from "@/assets/2ac420a999cddd5f145a62155f78b13e.png";
import { toast } from "sonner";
import { Building2, ChevronLeft, ChevronRight, LogIn } from "lucide-react";

const DEFAULT_PASSWORD = "666-11";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const trpcUtils = trpc.useUtils();
  const { data: companies = [], isLoading: companiesLoading } = trpc.companies.list.useQuery();
  const loginMutation = trpc.auth.login.useMutation();
  const [companyOptions, setCompanyOptions] = useState<any[]>([]);
  
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if ((companies as any[]).length > 0) {
      setCompanyOptions(companies as any[]);
      return;
    }
    if (companiesLoading) return;

    let cancelled = false;
    fetch("/api/trpc/companies.list?batch=1&input=%7B%7D", { credentials: "include" })
      .then((res) => res.json())
      .then((payload) => {
        const rows = payload?.[0]?.result?.data?.json;
        if (!cancelled && Array.isArray(rows)) {
          setCompanyOptions(rows);
        }
      })
      .catch((error) => {
        console.error("Failed to load companies:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [companies, companiesLoading]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) {
      toast.error("请输入用户名");
      return;
    }
    if (!password) {
      toast.error("请输入密码");
      return;
    }
    if (!selectedCompany) {
      toast.error("请选择公司");
      return;
    }

    setSubmitting(true);
    try {
      const result = await loginMutation.mutateAsync({
        username: name,
        password,
        companyId: selectedCompany.id,
      });

      if (result.success && result.user) {
        // 保存用户信息和公司信息
        localStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(result.user));
        localStorage.setItem("erp-active-company-id", String(selectedCompany.id));
        localStorage.setItem("erp-active-company", JSON.stringify(selectedCompany));
        trpcUtils.auth.me.setData(undefined, result.user as any);
        await Promise.allSettled([
          trpcUtils.auth.me.invalidate(),
          trpcUtils.workflowCenter.list.invalidate(),
          trpcUtils.dashboard.stats.invalidate(),
          trpcUtils.companies.myCompanies.invalidate(),
        ]);

        toast.success("登录成功");
        window.location.href = "/";
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "登录失败，请检查用户名或密码");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl border-slate-200/60 backdrop-blur-sm">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex justify-center">
            <img src={shenyunLogo} alt="SHENYUN" className="h-12 w-auto object-contain" />
          </div>
          <CardTitle className="text-center text-xl text-slate-800">
            {selectedCompany ? selectedCompany.name : "医疗器械ERP管理系统"}
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            {selectedCompany ? "请输入用户名和密码登录" : "请选择要登录的公司"}
          </p>
        </CardHeader>
        <CardContent>
          {!selectedCompany ? (
            /* ========== 第一步：选择公司 ========== */
            <div className="space-y-3">
              {companyOptions.map((company: any) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => {
                    setSelectedCompany(company);
                    setUsername("");
                    setPassword("");
                  }}
                  className="w-full group flex items-center gap-4 rounded-xl bg-white px-4 py-4 text-left shadow-sm transition-all hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-md border border-slate-200/60"
                >
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ background: company.color || "#6366f1" }}
                  >
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{company.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {company.shortName || company.description || ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            /* ========== 第二步：用户名密码登录 ========== */
            <form className="space-y-4" onSubmit={onSubmit}>
              {/* 返回按钮 */}
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors -mt-1 mb-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>返回选择公司</span>
              </button>

              {/* 当前公司标识 */}
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 border border-slate-100">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: selectedCompany.color || "#6366f1" }}
                >
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700">{selectedCompany.name}</span>
              </div>

              <div className="space-y-2">
                <Label>用户名</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>密码</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                <LogIn className="h-4 w-4 mr-2" />
                登录
              </Button>
              <p className="text-xs text-muted-foreground text-center">当前测试密码：{DEFAULT_PASSWORD}</p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
