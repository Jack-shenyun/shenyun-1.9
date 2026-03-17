import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import ERPLayout from "@/components/ERPLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";
import { ArchiveRestore, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/formatters";

type RecycleStatus = "all" | "active" | "restored" | "expired";


const statusMap: Record<string, { label: string; className: string }> = {
  active: { label: "可恢复", className: "bg-green-50 text-green-700 border-green-200" },
  restored: { label: "已恢复", className: "bg-blue-50 text-blue-700 border-blue-200" },
  expired: { label: "已过期", className: "bg-gray-50 text-gray-700 border-gray-200" },
};

export default function RecycleBinPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || Boolean((user as any)?.isCompanyAdmin);

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<RecycleStatus>("active");

  const queryInput = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      keyword: keyword.trim() || undefined,
      limit: 500,
    }),
    [keyword, status],
  );

  const { data: rows = [], refetch, isLoading } = trpc.recycleBin.list.useQuery(queryInput, {
    enabled: isAdmin,
  });

  const restoreMutation = trpc.recycleBin.restore.useMutation({
    onSuccess: async () => {
      toast.success("恢复成功");
      await refetch();
    },
    onError: (error) => toast.error("恢复失败", { description: error.message }),
  });

  const removeMutation = trpc.recycleBin.remove.useMutation({
    onSuccess: async () => {
      toast.success("记录已删除");
      await refetch();
    },
    onError: (error) => toast.error("删除失败", { description: error.message }),
  });

  const clearExpiredMutation = trpc.recycleBin.clearExpired.useMutation({
    onSuccess: async () => {
      toast.success("已清理过期记录");
      await refetch();
    },
    onError: (error) => toast.error("清理失败", { description: error.message }),
  });

  if (!isAdmin) {
    return (
      <ERPLayout>
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            仅管理员可访问回收箱
          </CardContent>
        </Card>
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ArchiveRestore className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">回收箱</h2>
              <p className="text-sm text-muted-foreground">删除数据可在 1 年内恢复（管理员专用）</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!confirm("确认清理所有已过期记录？")) return;
                clearExpiredMutation.mutate();
              }}
              disabled={clearExpiredMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              清理过期
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative md:flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="搜索类型、名称、来源表..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <Select value={status} onValueChange={(value) => setStatus(value as RecycleStatus)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">可恢复</SelectItem>
                  <SelectItem value="restored">已恢复</SelectItem>
                  <SelectItem value="expired">已过期</SelectItem>
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
                  <TableHead className="text-center font-bold">类型</TableHead>
                  <TableHead className="text-center font-bold">数据名称</TableHead>
                  <TableHead className="text-center font-bold">来源表</TableHead>
                  <TableHead className="text-center font-bold">删除时间</TableHead>
                  <TableHead className="text-center font-bold">到期时间</TableHead>
                  <TableHead className="text-center font-bold">剩余天数</TableHead>
                  <TableHead className="text-center font-bold">状态</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      暂无回收记录
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row: any) => {
                    const statusInfo = statusMap[row.status] ?? statusMap.active;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-center">{row.entityType || "-"}</TableCell>
                        <TableCell className="text-center">{row.displayName || "-"}</TableCell>
                        <TableCell className="text-center">{row.sourceTable || "-"}</TableCell>
                        <TableCell className="text-center">{formatDateTime(row.deletedAt)}</TableCell>
                        <TableCell className="text-center">{formatDateTime(row.expiresAt)}</TableCell>
                        <TableCell className="text-center">{Number(row.daysLeft ?? 0)} 天</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restoreMutation.mutate({ id: row.id })}
                            disabled={!row.canRestore || restoreMutation.isPending}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            恢复
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!confirm("确认从回收箱彻底删除该记录？")) return;
                              removeMutation.mutate({ id: row.id });
                            }}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            删除
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}
