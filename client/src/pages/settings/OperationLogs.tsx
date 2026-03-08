import { useState, useMemo } from "react";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Trash2,
  FileJson,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  UserCog,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import { toast } from "sonner";
import {
  LogModule,
  LogAction,
  LogResult,
  MODULE_NAMES,
  ACTION_NAMES,
  RESULT_NAMES,
} from "@/hooks/useOperationLog";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getStatusSemanticClass } from "@/lib/statusStyle";

// 每页显示条数
const PAGE_SIZE = 15;

// 操作类型图标
const getActionIcon = (action: string) => {
  switch (action) {
    case "create":
      return <Plus className="h-4 w-4 text-green-500" />;
    case "update":
      return <Pencil className="h-4 w-4 text-blue-500" />;
    case "delete":
      return <Trash2 className="h-4 w-4 text-red-500" />;
    case "status_change":
      return <RefreshCw className="h-4 w-4 text-orange-500" />;
    case "role_change":
      return <UserCog className="h-4 w-4 text-purple-500" />;
    case "permission_change":
      return <Shield className="h-4 w-4 text-indigo-500" />;
    default:
      return <History className="h-4 w-4 text-gray-500" />;
  }
};

// 操作结果徽章
const getResultBadge = (result: string) => {
  switch (result) {
    case "success":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          成功
        </Badge>
      );
    case "failure":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          失败
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          部分成功
        </Badge>
      );
    default:
      return <Badge variant="outline">{result}</Badge>;
  }
};

// 格式化日期时间
const formatDateTime = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${min}:${sec}`;
};

export default function OperationLogsPage() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 筛选条件
  const [filters, setFilters] = useState({
    module: "" as LogModule | "",
    action: "" as LogAction | "",
    keyword: "",
    startDate: "",
    endDate: "",
  });

  // 从数据库获取日志
  const { data: logsData = [], refetch, isLoading } = trpc.logs.list.useQuery({
    module: filters.module || undefined,
    action: filters.action || undefined,
    limit: 500,
  });

  // 清除日志 mutation
  const clearMutation = trpc.logs.clear.useMutation({
    onSuccess: () => { toast.success("日志已清除"); refetch(); },
    onError: (e) => toast.error("清除失败", { description: e.message }),
  });

  // 前端过滤（关键词、日期范围）
  const filteredLogs = useMemo(() => {
    let result = [...logsData];

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      result = result.filter(
        (log: any) =>
          (log.description || "").toLowerCase().includes(keyword) ||
          (log.targetName || "").toLowerCase().includes(keyword) ||
          (log.operatorName || "").toLowerCase().includes(keyword)
      );
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      result = result.filter((log: any) => new Date(log.createdAt) >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter((log: any) => new Date(log.createdAt) <= endDate);
    }

    return result;
  }, [logsData, filters.keyword, filters.startDate, filters.endDate]);

  // 分页数据
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);

  // 重置筛选
  const resetFilters = () => {
    setFilters({ module: "", action: "", keyword: "", startDate: "", endDate: "" });
    setCurrentPage(1);
  };

  // 导出日志
  const handleExport = (format: "json" | "csv") => {
    const dataToExport = filteredLogs.length > 0 ? filteredLogs : logsData;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "json") {
      content = JSON.stringify(dataToExport, null, 2);
      filename = `operation_logs_${new Date().toISOString().split("T")[0]}.json`;
      mimeType = "application/json";
    } else {
      const headers = ["ID", "模块", "操作类型", "操作对象", "操作描述", "操作人", "操作结果", "操作时间"];
      const rows = (dataToExport as any[]).map((log: any) => [
        log.id,
        MODULE_NAMES[log.module as LogModule] || log.module,
        ACTION_NAMES[log.action as LogAction] || log.action,
        log.targetName || "",
        log.description,
        log.operatorName,
        RESULT_NAMES[log.result as LogResult] || log.result || "成功",
        log.createdAt ? new Date(log.createdAt).toISOString() : "",
      ]);
      content = [
        headers.join(","),
        ...rows.map((row: any) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");
      filename = `operation_logs_${new Date().toISOString().split("T")[0]}.csv`;
      mimeType = "text/csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("导出成功", { description: `已导出 ${dataToExport.length} 条日志记录` });
  };

  // 清除日志
  const handleClearLogs = () => {
    if (user?.role !== "admin") {
      toast.error("权限不足", { description: "只有管理员可以清除日志" });
      return;
    }
    if (confirm("确定要清除所有操作日志吗？此操作不可恢复。")) {
      clearMutation.mutate();
    }
  };

  // 查看详情
  const handleViewDetail = (log: any) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">操作日志</h2>
              <p className="text-sm text-muted-foreground">查看系统所有模块的操作记录（数据库存储）</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  导出为 CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>
                  <FileJson className="h-4 w-4 mr-2" />
                  导出为 JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {user?.role === "admin" && (
              <Button
                variant="outline"
                className="text-red-600"
                onClick={handleClearLogs}
                disabled={clearMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                清除日志
              </Button>
            )}
          </div>
        </div>

        {/* 筛选条件 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              筛选条件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <Label>操作模块</Label>
                <Select
                  value={filters.module || "__ALL__"}
                  onValueChange={(v) => {
                    setFilters({ ...filters, module: (v === "__ALL__" ? "" : v) as LogModule | "" });
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部模块" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">全部模块</SelectItem>
                    {Object.entries(MODULE_NAMES).map(([key, name]) => (
                      <SelectItem key={key} value={key}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>操作类型</Label>
                <Select
                  value={filters.action || "__ALL__"}
                  onValueChange={(v) => {
                    setFilters({ ...filters, action: (v === "__ALL__" ? "" : v) as LogAction | "" });
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">全部类型</SelectItem>
                    {Object.entries(ACTION_NAMES).map(([key, name]) => (
                      <SelectItem key={key} value={key}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>开始日期</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => {
                    setFilters({ ...filters, startDate: e.target.value });
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>结束日期</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => {
                    setFilters({ ...filters, endDate: e.target.value });
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>关键词搜索</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索描述、对象、操作人..."
                    className="pl-9"
                    value={filters.keyword}
                    onChange={(e) => {
                      setFilters({ ...filters, keyword: e.target.value });
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="ghost" onClick={resetFilters}>
                重置筛选
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 日志统计 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{logsData.length}</div>
              <p className="text-sm text-muted-foreground">总日志数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {(logsData as any[]).filter((l: any) => l.action === "create").length}
              </div>
              <p className="text-sm text-muted-foreground">新增操作</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {(logsData as any[]).filter((l: any) => l.action === "update").length}
              </div>
              <p className="text-sm text-muted-foreground">编辑操作</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {(logsData as any[]).filter((l: any) => l.action === "delete").length}
              </div>
              <p className="text-sm text-muted-foreground">删除操作</p>
            </CardContent>
          </Card>
        </div>

        {/* 日志列表 */}
        <Card>
          <CardHeader>
            <CardTitle>操作记录</CardTitle>
            <CardDescription>
              共 {filteredLogs.length} 条记录
              {filteredLogs.length !== logsData.length && ` (已筛选，总计 ${logsData.length} 条)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-50" />
                <p>加载中...</p>
              </div>
            ) : paginatedLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无操作日志</p>
                <p className="text-sm">系统操作记录将显示在这里</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/60">
                        <TableHead className="w-[180px] text-center font-bold">操作时间</TableHead>
                        <TableHead className="w-[100px] text-center font-bold">模块</TableHead>
                        <TableHead className="w-[80px] text-center font-bold">类型</TableHead>
                        <TableHead className="text-center font-bold">操作描述</TableHead>
                        <TableHead className="w-[100px] text-center font-bold">操作人</TableHead>
                        <TableHead className="w-[80px] text-center font-bold">结果</TableHead>
                        <TableHead className="w-[80px] text-center font-bold">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(paginatedLogs as any[]).map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-center font-mono text-sm">
                            {log.createdAt ? formatDateTime(log.createdAt) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {MODULE_NAMES[log.module as LogModule] || log.module}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-1">
                              {getActionIcon(log.action)}
                              <span className="text-sm">
                                {ACTION_NAMES[log.action as LogAction] || log.action}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="max-w-[300px] truncate" title={log.description}>
                              {log.description}
                            </div>
                            {log.targetName && (
                              <div className="text-xs text-muted-foreground">
                                对象: {log.targetName}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{log.operatorName}</TableCell>
                          <TableCell className="text-center">{getResultBadge(log.result || "success")}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      第 {currentPage} 页，共 {totalPages} 页
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        下一页
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 详情对话框 */}
        <DraggableDialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DraggableDialogContent>
            <DialogHeader>
              <DialogTitle>操作日志详情</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4">
                  {/* 基本信息 */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">操作时间</Label>
                      <p className="font-mono">
                        {selectedLog.createdAt ? formatDateTime(selectedLog.createdAt) : "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">操作模块</Label>
                      <p>{MODULE_NAMES[selectedLog.module as LogModule] || selectedLog.module}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">操作类型</Label>
                      <div className="flex items-center gap-2">
                        {getActionIcon(selectedLog.action)}
                        <span>{ACTION_NAMES[selectedLog.action as LogAction] || selectedLog.action}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">操作结果</Label>
                      <div>{getResultBadge(selectedLog.result || "success")}</div>
                    </div>
                  </div>

                  {/* 操作描述 */}
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">操作描述</Label>
                    <p>{selectedLog.description}</p>
                  </div>

                  {/* 操作对象 */}
                  {(selectedLog.targetName || selectedLog.targetId) && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">对象类型</Label>
                        <p>{selectedLog.targetType || "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">对象ID</Label>
                        <p>{selectedLog.targetId || "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">对象名称</Label>
                        <p>{selectedLog.targetName || "-"}</p>
                      </div>
                    </div>
                  )}

                  {/* 变更字段 */}
                  {selectedLog.changedFields && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">变更字段</Label>
                      <div className="flex flex-wrap gap-2">
                        {(typeof selectedLog.changedFields === "string"
                          ? selectedLog.changedFields.split(",")
                          : selectedLog.changedFields
                        ).map((field: string) => (
                          <Badge key={field} variant="secondary">{field.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 操作前数据 */}
                  {selectedLog.previousData && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">操作前数据</Label>
                      <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-40">
                        {typeof selectedLog.previousData === "string"
                          ? selectedLog.previousData
                          : JSON.stringify(selectedLog.previousData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* 操作后数据 */}
                  {selectedLog.newData && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">操作后数据</Label>
                      <pre className="p-3 bg-muted rounded-md text-xs overflow-auto max-h-40">
                        {typeof selectedLog.newData === "string"
                          ? selectedLog.newData
                          : JSON.stringify(selectedLog.newData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* 操作人信息 */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">操作人</Label>
                      <p>{selectedLog.operatorName}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">操作人ID</Label>
                      <p>{selectedLog.operatorId}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">操作人角色</Label>
                      <p>{selectedLog.operatorRole || "-"}</p>
                    </div>
                  </div>

                  {/* 环境信息 */}
                  {selectedLog.ipAddress && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">IP地址</Label>
                      <p>{selectedLog.ipAddress}</p>
                    </div>
                  )}

                  {/* 错误信息 */}
                  {selectedLog.errorMessage && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-red-600">错误信息</Label>
                      <p className="text-red-600">{selectedLog.errorMessage}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
