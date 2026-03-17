import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import RaLayout from "@/components/RaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck, Plus, Globe, FileText, CheckCircle2,
  Clock, Send, TrendingUp, ArrowRight, BookOpen,
} from "lucide-react";
import { MDR_STATS } from "@/data/ra/mdrTemplates";
import {
  MARKET_LABELS, STATUS_LABELS, STATUS_COLORS,
  type RaMarket, type RaProjectStatus,
} from "@/data/ra/types";
import { formatDateValue } from "@/lib/formatters";

const MARKET_BADGE_COLORS: Record<RaMarket, string> = {
  EU_MDR: "bg-blue-100 text-blue-700",
  US_FDA: "bg-red-100 text-red-700",
  CN_NMPA: "bg-green-100 text-green-700",
};

export default function RaDashboardPage() {
  const [, navigate] = useLocation();
  const { data: projects = [] } = trpc.ra.projects.list.useQuery();
  const allProjects = (projects as any[]);

  const countByStatus = (s: string) => allProjects.filter((p) => p.status === s).length;
  const countByMarket = (m: string) => allProjects.filter((p) => p.market === m).length;

  const recentProjects = [...allProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <RaLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">法规事务部</h2>
              <p className="text-sm text-muted-foreground">
                全球医疗器械法规申报管理中心 · EU MDR / US FDA / CN NMPA
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/ra/projects")}>
            <Plus className="h-4 w-4 mr-1" />
            新建申报项目
          </Button>
        </div>

        {/* 核心统计 */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">申报项目总数</p>
                  <p className="text-3xl font-bold mt-1">{allProjects.length}</p>
                </div>
                <ShieldCheck className="h-8 w-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">进行中</p>
                  <p className="text-3xl font-bold mt-1 text-blue-600">{countByStatus("in_progress")}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-400 opacity-30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已获批</p>
                  <p className="text-3xl font-bold mt-1 text-green-600">{countByStatus("approved")}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-400 opacity-30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已提交审核</p>
                  <p className="text-3xl font-bold mt-1 text-amber-600">{countByStatus("submitted")}</p>
                </div>
                <Send className="h-8 w-8 text-amber-400 opacity-30" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* 市场分布 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                市场分布
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["EU_MDR", "US_FDA", "CN_NMPA"] as RaMarket[]).map((m) => (
                <div key={m} className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-xs ${MARKET_BADGE_COLORS[m]}`}>
                    {MARKET_LABELS[m]}
                  </Badge>
                  <span className="text-sm font-medium">{countByMarket(m)} 个项目</span>
                </div>
              ))}
              {allProjects.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">暂无项目数据</p>
              )}
            </CardContent>
          </Card>

          {/* MDR 文件体系概览 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                MDR 技术文件体系
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">文件大类</span>
                <span className="font-medium">{MDR_STATS.sections} 类</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">文件总数</span>
                <span className="font-medium">{MDR_STATS.documents} 份</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">章节总数</span>
                <span className="font-medium">{MDR_STATS.totalSections} 个</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">AI 辅助生成</span>
                <span className="font-medium text-primary">全部支持</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => navigate("/ra/projects")}
              >
                查看所有项目
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* 状态分布 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                项目状态分布
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["planning", "in_progress", "submitted", "approved", "archived"] as RaProjectStatus[]).map((s) => {
                const count = countByStatus(s);
                return (
                  <div key={s} className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[s]}`}>
                      {STATUS_LABELS[s]}
                    </Badge>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* 最近项目 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                最近更新的项目
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/ra/projects")}>
                查看全部
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目名称</TableHead>
                  <TableHead>法规体系</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      暂无项目，
                      <button
                        className="text-primary underline ml-1"
                        onClick={() => navigate("/ra/projects")}
                      >
                        立即创建第一个
                      </button>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentProjects.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${MARKET_BADGE_COLORS[p.market as RaMarket] || ""}`}
                        >
                          {MARKET_LABELS[p.market as RaMarket] || p.market}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${STATUS_COLORS[p.status as RaProjectStatus] || ""}`}
                        >
                          {STATUS_LABELS[p.status as RaProjectStatus] || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateValue(p.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => navigate(`/ra/workspace/${p.id}`)}
                        >
                          进入
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </RaLayout>
  );
}
