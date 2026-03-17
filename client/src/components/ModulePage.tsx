import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  RefreshCw,
  GitBranch,
  LucideIcon,
  ShieldAlert,
  Lock,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  ReactNode,
  type ChangeEvent,
} from "react";
import { useLocation } from "wouter";
import { usePermission } from "@/hooks/usePermission";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { formatDateValue, formatDisplayNumber } from "@/lib/formatters";
import { toast } from "sonner";
import { getStatusSemanticClass, localizeStatusLabel } from "@/lib/statusStyle";

export interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, record: T) => ReactNode;
  width?: string;
}

export interface ModulePageProps<T> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchFields?: (keyof T | string)[];
  addButtonText?: string;
  onAdd?: () => void;
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => void;
  onView?: (record: T) => void;
  canEditRecord?: (record: T) => boolean;
  canDeleteRecord?: (record: T) => boolean;
  filterOptions?: { label: string; value: string }[];
  filterKey?: keyof T | string;
  stats?: { label: string; value: string | number; color?: string }[];
  children?: ReactNode;
  /** 是否显示权限提示，默认true */
  showPermissionHint?: boolean;
  /** 在导出/导入按鈕之前插入的额外操作按鈕 */
  headerActions?: ReactNode;
  /** 在搜索栏中插入的额外筛选控件 */
  toolbarFilters?: ReactNode;
  /** 加载状态 */
  loading?: boolean;
  /** 自定义导出 */
  onExport?: (rows: T[]) => void;
  /** 自定义导入 */
  onImport?: (file: File) => void | Promise<void>;
  /** 导入文件类型 */
  importAccept?: string;
  /** 可选：审批流程表单类型，不传默认使用“待补充” */
  approvalFormType?: string;
  /** 是否显示审批开关，默认true */
  showApprovalToggle?: boolean;
  /** 紧凑布局（减少留白） */
  compact?: boolean;
  /** 每页条数 */
  pageSize?: number;
  /** 额外筛选变化时用于重置分页 */
  filterResetKey?: string;
  /** 自定义过滤 */
  customFilter?: (record: T) => boolean;
}

const MODULE_BY_PATH_SEGMENT: Record<string, string> = {
  admin: "管理部",
  investment: "招商部",
  sales: "销售部",
  rd: "研发部",
  production: "生产部",
  quality: "质量部",
  purchase: "采购部",
  warehouse: "仓库管理",
  finance: "财务部",
  settings: "系统设置",
};

const FORM_TYPE_BY_PATH: Record<string, string> = {
  "/admin/documents": "管理表单",
  "/admin/expense": "申请单",
  "/admin/overtime": "申请单",
  "/admin/leave": "申请单",
  "/admin/outing": "申请单",
  "/sales/customers": "主数据",
  "/rd/products": "主数据",
  "/rd/projects": "项目流程",
  "/purchase/suppliers": "主数据",
};

function renderPlainCellValue(
  value: unknown,
  options?: {
    columnKey?: string;
    columnTitle?: string;
    isFinanceModule?: boolean;
  }
): ReactNode {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return formatDateValue(value);
  if (Array.isArray(value)) {
    return value.map(item => renderPlainCellValue(item, options)).join("，");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if (typeof value === "number") {
    return options?.isFinanceModule ? value : formatDisplayNumber(value);
  }
  if (typeof value === "string") {
    const columnHint =
      `${options?.columnKey || ""} ${options?.columnTitle || ""}`.toLowerCase();
    if (columnHint.includes("status") || columnHint.includes("状态")) {
      return localizeStatusLabel(value);
    }
  }
  return value as ReactNode;
}

export default function ModulePage<T extends { id: number | string }>({
  title,
  description,
  icon: Icon,
  columns,
  data,
  searchPlaceholder = "搜索...",
  searchFields,
  addButtonText = "新增",
  onAdd,
  onEdit,
  onDelete,
  onView,
  canEditRecord,
  canDeleteRecord,
  filterOptions,
  filterKey,
  stats,
  children,
  showPermissionHint = true,
  headerActions,
  toolbarFilters,
  loading,
  onExport,
  onImport,
  importAccept = ".csv,.xlsx,.xls",
  approvalFormType = "待补充",
  showApprovalToggle = true,
  compact = false,
  pageSize = 10,
  filterResetKey,
  customFilter,
}: ModulePageProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<T | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // 获取权限
  const { canCreate, canEdit, canDelete, isAdmin } = usePermission();
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const utils = trpc.useUtils();

  const topSegment = location.split("/").filter(Boolean)[0] || "";
  const isFinanceModule = topSegment === "finance";
  const workflowModule = MODULE_BY_PATH_SEGMENT[topSegment] || "通用";
  const workflowFormName = title;
  const workflowPath = location;
  const resolvedApprovalFormType =
    approvalFormType && approvalFormType !== "待补充"
      ? approvalFormType
      : FORM_TYPE_BY_PATH[workflowPath] || "待补充";

  const { data: workflowFormMeta } =
    trpc.workflowSettings.getFormCatalogItem.useQuery(
      {
        module: workflowModule,
        formType: resolvedApprovalFormType,
        formName: workflowFormName,
      },
      {
        enabled: Boolean(workflowFormName),
      }
    );
  const setFormApprovalEnabledMutation =
    trpc.workflowSettings.setFormApprovalEnabled.useMutation();
  const approvalEnabled = Boolean((workflowFormMeta as any)?.approvalEnabled);

  const handleToggleApproval = async () => {
    if (!isAdmin) return;
    await setFormApprovalEnabledMutation.mutateAsync({
      module: workflowModule,
      formType: resolvedApprovalFormType,
      formName: workflowFormName,
      path: workflowPath,
      approvalEnabled: !approvalEnabled,
    });
    await utils.workflowSettings.getFormCatalogItem.invalidate({
      module: workflowModule,
      formType: resolvedApprovalFormType,
      formName: workflowFormName,
    });
    await utils.workflowSettings.formCatalog.invalidate();
    toast.success(!approvalEnabled ? "已开启审批流程" : "已关闭审批流程");
  };

  const filteredData = data.filter(item => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const searchPool = searchFields?.length
      ? searchFields.map(
          field => (item as Record<string, unknown>)[String(field)]
        )
      : Object.values(item);
    const searchMatch =
      !normalizedSearch ||
      searchPool.some(value =>
        String(value ?? "")
          .toLowerCase()
          .includes(normalizedSearch)
      );
    const optionMatch =
      filterValue === "all" || !filterKey
        ? true
        : String((item as Record<string, unknown>)[String(filterKey)] ?? "") ===
          filterValue;
    const customMatch = customFilter ? customFilter(item) : true;
    return searchMatch && optionMatch && customMatch;
  });

  const totalPages = pageSize
    ? Math.max(1, Math.ceil(filteredData.length / pageSize))
    : 1;
  const paginatedData = pageSize
    ? filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredData;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterValue, data.length, pageSize, filterResetKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // 处理删除确认
  const handleDeleteClick = (record: T) => {
    if (!canDelete) {
      toast.error("您没有删除权限", {
        description: "只有管理员可以执行删除操作",
      });
      return;
    }
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (recordToDelete && onDelete) {
      onDelete(recordToDelete);
    }
    setDeleteDialogOpen(false);
    setRecordToDelete(null);
  };

  // 处理新增点击
  const handleAddClick = () => {
    if (!canCreate) {
      toast.error("您没有新增权限");
      return;
    }
    onAdd?.();
  };

  // 处理编辑点击
  const handleEditClick = (record: T) => {
    if (!canEdit) {
      toast.error("您没有编辑权限");
      return;
    }
    onEdit?.(record);
  };

  const toCsvValue = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    const escaped = text.replaceAll('"', '""');
    return `"${escaped}"`;
  };

  const handleExportClick = () => {
    if (onExport) {
      onExport(filteredData);
      return;
    }

    if (filteredData.length === 0) {
      toast.warning("暂无可导出数据");
      return;
    }

    const headers = columns.map(column => column.title);
    const body = filteredData.map(record =>
      columns.map(column => toCsvValue((record as any)[column.key])).join(",")
    );
    const csv = [headers.map(toCsvValue).join(","), ...body].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (!onImport) {
      toast.info("当前页面暂未配置导入");
      return;
    }
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await onImport?.(file);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <ERPLayout>
      <div className={compact ? "space-y-4" : "space-y-6"}>
        {/* 页面标题 */}
        <div
          className={
            compact
              ? "flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              : "flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          }
        >
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold tracking-tight">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 权限提示 */}
            {showPermissionHint && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      isAdmin
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {isAdmin ? (
                      <ShieldAlert className="h-3 w-3" />
                    ) : (
                      <Lock className="h-3 w-3" />
                    )}
                    {isAdmin ? "管理员" : "普通用户"}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isAdmin
                    ? "您拥有完整权限：查看、新增、编辑、删除"
                    : "您的权限：查看、新增、编辑（无删除权限）"}
                </TooltipContent>
              </Tooltip>
            )}
            {isAdmin && showApprovalToggle && (
              <Button
                variant={approvalEnabled ? "default" : "outline"}
                size="sm"
                onClick={handleToggleApproval}
                disabled={setFormApprovalEnabledMutation.isPending}
              >
                <GitBranch className="h-4 w-4 mr-1" />
                {approvalEnabled ? "审批已开启" : "开启审批"}
              </Button>
            )}
            {headerActions}
            <Button variant="outline" size="sm" onClick={handleExportClick}>
              <Download className="h-4 w-4 mr-1" />
              导出
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportClick}>
              <Upload className="h-4 w-4 mr-1" />
              导入
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept={importAccept}
              className="hidden"
              onChange={handleImportFileChange}
            />
            {onAdd && (
              <Button size="sm" onClick={handleAddClick} disabled={!canCreate}>
                <Plus className="h-4 w-4 mr-1" />
                {addButtonText}
              </Button>
            )}
          </div>
        </div>

        {/* 统计卡片 */}
        {stats && stats.length > 0 && (
          <div
            className={
              compact
                ? "grid gap-3 grid-cols-2 md:grid-cols-4"
                : "grid gap-4 grid-cols-2 md:grid-cols-4"
            }
          >
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className={compact ? "p-3" : "p-4"}>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p
                    className={`text-2xl font-bold ${stat.color || "text-foreground"}`}
                  >
                    {typeof stat.value === "number" && !isFinanceModule
                      ? formatDisplayNumber(stat.value)
                      : stat.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className={compact ? "p-3" : "p-4"}>
            <div
              className={
                compact
                  ? "flex flex-col md:flex-row gap-3"
                  : "flex flex-col md:flex-row gap-4"
              }
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {toolbarFilters}
              {filterOptions && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    {filterOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 数据表格/卡片 */}
        {isMobile ? (
          /* 移动端卡片视图 */
          <div className="space-y-3">
            {paginatedData.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  暂无数据
                </CardContent>
              </Card>
            ) : (
              paginatedData.map(record => (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    {(() => {
                      const rowCanEdit = canEditRecord
                        ? canEditRecord(record)
                        : true;
                      const rowCanDelete = canDeleteRecord
                        ? canDeleteRecord(record)
                        : true;
                      return (
                        <>
                          <div className="space-y-2">
                            {columns.slice(0, 4).map(column => (
                              <div
                                key={String(column.key)}
                                className="flex justify-between items-start"
                              >
                                <span className="text-sm font-medium text-muted-foreground">
                                  {column.title}
                                </span>
                                <span className="text-sm text-right">
                                  {column.render
                                    ? column.render(
                                        (record as any)[column.key],
                                        record
                                      )
                                    : renderPlainCellValue(
                                        (record as any)[column.key],
                                        {
                                          columnKey: String(column.key),
                                          columnTitle: column.title,
                                          isFinanceModule,
                                        }
                                      )}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-4 pt-4 border-t">
                            {onView && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => onView(record)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                查看
                              </Button>
                            )}
                            {onEdit && rowCanEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleEditClick(record)}
                                disabled={!canEdit}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                编辑
                              </Button>
                            )}
                            {onDelete && rowCanDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(record)}
                                disabled={!canDelete}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* 桌面端表格视图 */
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map(column => (
                        <TableHead
                          key={String(column.key)}
                          style={{ width: column.width }}
                        >
                          {column.title}
                        </TableHead>
                      ))}
                      <TableHead className="sticky right-0 z-20 w-[72px] min-w-[72px] border-l border-slate-200 bg-slate-50/95 text-center">
                        操作
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length + 1}
                          className="text-center py-8 text-muted-foreground"
                        >
                          暂无数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map(record => (
                        <TableRow key={record.id}>
                          {(() => {
                            const rowCanEdit = canEditRecord
                              ? canEditRecord(record)
                              : true;
                            const rowCanDelete = canDeleteRecord
                              ? canDeleteRecord(record)
                              : true;
                            return (
                              <>
                                {columns.map(column => (
                                  <TableCell key={String(column.key)}>
                                    {column.render
                                      ? column.render(
                                          (record as any)[column.key],
                                          record
                                        )
                                      : renderPlainCellValue(
                                          (record as any)[column.key],
                                          {
                                            columnKey: String(column.key),
                                            columnTitle: column.title,
                                            isFinanceModule,
                                          }
                                        )}
                                  </TableCell>
                                ))}
                                <TableCell className="sticky right-0 z-10 border-l border-slate-100 bg-white text-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-10 px-0 text-base font-semibold tracking-widest"
                                      >
                                        ...
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {onView && (
                                        <DropdownMenuItem
                                          onClick={() => onView(record)}
                                        >
                                          <Eye className="mr-2 h-4 w-4" />
                                          查看
                                        </DropdownMenuItem>
                                      )}
                                      {onEdit && rowCanEdit && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleEditClick(record)
                                          }
                                          disabled={!canEdit}
                                        >
                                          <Edit className="mr-2 h-4 w-4" />
                                          编辑
                                        </DropdownMenuItem>
                                      )}
                                      {onDelete && rowCanDelete && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div>
                                                <DropdownMenuItem
                                                  onClick={() =>
                                                    handleDeleteClick(record)
                                                  }
                                                  className={
                                                    canDelete
                                                      ? "text-destructive"
                                                      : "text-muted-foreground cursor-not-allowed"
                                                  }
                                                  disabled={!canDelete}
                                                >
                                                  {canDelete ? (
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                  ) : (
                                                    <Lock className="mr-2 h-4 w-4" />
                                                  )}
                                                  删除
                                                </DropdownMenuItem>
                                              </div>
                                            </TooltipTrigger>
                                            {!canDelete && (
                                              <TooltipContent>
                                                只有管理员可以删除数据
                                              </TooltipContent>
                                            )}
                                          </Tooltip>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </>
                            );
                          })()}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {pageSize && filteredData.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <div className="text-sm text-muted-foreground">
              显示 {(currentPage - 1) * pageSize + 1} -{" "}
              {Math.min(currentPage * pageSize, filteredData.length)} 条， 共{" "}
              {filteredData.length} 条，第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(page => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        )}

        {/* 额外内容 */}
        {children}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这条记录吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ERPLayout>
  );
}

// 状态徽章组件
export function StatusBadge({
  status,
  statusMap,
}: {
  status: string;
  statusMap: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  >;
}) {
  const mapped = statusMap[status];
  const config = mapped
    ? {
        ...mapped,
        label:
          mapped.label === status
            ? localizeStatusLabel(status)
            : localizeStatusLabel(mapped.label),
      }
    : { label: localizeStatusLabel(status), variant: "outline" as const };
  return (
    <Badge
      variant={config.variant}
      className={getStatusSemanticClass(status, config.label)}
    >
      {config.label}
    </Badge>
  );
}
