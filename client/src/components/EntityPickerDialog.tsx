/**
 * EntityPickerDialog — 通用弹窗选择器组件
 *
 * 全系统统一弹窗选择器风格：
 * - 可拖动移动 + 最大化 + 关闭
 * - 顶部搜索框（实时筛选）
 * - 多列表格（列定义灵活配置）
 * - 每行"选择"按钮，已选行显示绿色勾选标记
 * - 底部"取消"按钮
 *
 * 使用示例：
 * ```tsx
 * <EntityPickerDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="选择产品"
 *   searchPlaceholder="搜索产品编码、名称..."
 *   columns={[
 *     { key: "code", title: "产品编码", render: (row) => <span className="font-mono">{row.code}</span> },
 *     { key: "name", title: "产品名称" },
 *     { key: "specification", title: "规格型号" },
 *   ]}
 *   rows={products}
 *   selectedId={selectedId}
 *   onSelect={(row) => { setSelectedId(row.id); setOpen(false); }}
 *   filterFn={(row, q) => row.code?.includes(q) || row.name?.includes(q)}
 * />
 * ```
 */

import { useState, useEffect } from "react";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EntityPickerColumn<T = any> {
  /** 列 key，用于 React key */
  key: string;
  /** 列标题 */
  title: string;
  /** 自定义渲染，默认取 row[key] */
  render?: (row: T) => React.ReactNode;
  /** 列宽 class，如 "w-[120px]" */
  className?: string;
}

export interface EntityPickerDialogProps<T = any> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 弹窗标题，如"选择产品" */
  title: string;
  /** 搜索框占位文字 */
  searchPlaceholder?: string;
  /** 列定义 */
  columns: EntityPickerColumn<T>[];
  /** 数据行 */
  rows: T[];
  /** 当前已选中的行 id（用于显示勾选标记） */
  selectedId?: string | number | null;
  /** 多选模式下的已选 id 集合 */
  selectedIds?: Array<string | number>;
  /** 获取每行的唯一 id，默认取 row.id */
  getRowId?: (row: T) => string | number;
  /** 点击"选择"时的回调 */
  onSelect: (row: T) => void;
  /** 点击确认按钮时的回调 */
  onConfirm?: () => void;
  /** 确认按钮文案 */
  confirmText?: string;
  /** 自定义筛选函数，默认对所有列值做 toLowerCase includes 匹配 */
  filterFn?: (row: T, query: string) => boolean;
  /** 外部受控搜索值 */
  searchValue?: string;
  /** 外部受控搜索回调 */
  onSearchChange?: (value: string) => void;
  /** 搜索区右侧附加内容，例如筛选项 */
  toolbarContent?: React.ReactNode;
  /** 空数据提示 */
  emptyText?: string;
  /** 弹窗默认宽度 */
  defaultWidth?: number;
  /** 弹窗默认高度 */
  defaultHeight?: number;
}

export function EntityPickerDialog<T extends Record<string, any>>({
  open,
  onOpenChange,
  title,
  searchPlaceholder = "搜索...",
  columns,
  rows,
  selectedId,
  selectedIds,
  getRowId = (row) => row.id,
  onSelect,
  onConfirm,
  confirmText = "确认",
  filterFn,
  searchValue,
  onSearchChange,
  toolbarContent,
  emptyText = "未找到匹配数据",
  defaultWidth = 800,
  defaultHeight = 560,
}: EntityPickerDialogProps<T>) {
  const [search, setSearch] = useState("");
  const isMultiSelect = Array.isArray(selectedIds);
  const resolvedSearch = searchValue ?? search;

  const renderPlainValue = (value: unknown): React.ReactNode => {
    if (value == null || value === "") return "-";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (Array.isArray(value)) return value.map((item) => renderPlainValue(item)).join("，");
    if (typeof value === "object") return String(value);
    return value as React.ReactNode;
  };

  // 弹窗关闭时清空搜索
  useEffect(() => {
    if (!open) {
      setSearch("");
      onSearchChange?.("");
    }
  }, [open, onSearchChange]);

  // 默认筛选：对所有列值做 toLowerCase includes 匹配
  const defaultFilterFn = (row: T, q: string) => {
    if (!q.trim()) return true;
    const lower = q.toLowerCase();
    return Object.values(row).some(
      (v) => v != null && String(v).toLowerCase().includes(lower)
    );
  };

  const filteredRows = rows.filter((row) =>
    resolvedSearch.trim()
      ? (filterFn
          ? filterFn(row, resolvedSearch)
          : defaultFilterFn(row, resolvedSearch))
      : true
  );

  return (
    <DraggableDialog
      open={open}
      onOpenChange={onOpenChange}
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
    >
      <DraggableDialogContent className="flex h-full min-h-0 flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
          {/* 搜索框 */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-11 pl-10 text-sm"
                placeholder={searchPlaceholder}
                value={resolvedSearch}
                onChange={(e) => {
                  setSearch(e.target.value);
                  onSearchChange?.(e.target.value);
                }}
                autoFocus
              />
            </div>
            {toolbarContent ? <div className="shrink-0">{toolbarContent}</div> : null}
          </div>

          {/* 表格 */}
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
            <div className="h-full overflow-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-muted/50 sticky top-0">
                    {isMultiSelect ? (
                      <TableHead className="h-12 w-[48px] py-3 text-center text-sm font-semibold text-foreground" />
                    ) : null}
                    {columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={cn("h-12 py-3 text-sm font-semibold text-foreground", col.className)}
                      >
                        {col.title}
                      </TableHead>
                    ))}
                    <TableHead className="h-12 w-[76px] py-3 text-right text-sm font-semibold text-foreground">
                      操作
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length + 1 + (isMultiSelect ? 1 : 0)}
                        className="text-center py-10 text-muted-foreground"
                      >
                        {emptyText}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => {
                      const rowId = getRowId(row);
                      const isSelected =
                        (Array.isArray(selectedIds) && selectedIds.some((id) => String(id) === String(rowId))) ||
                        (selectedId != null && String(rowId) === String(selectedId));
                      return (
                        <TableRow
                          key={rowId}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50 transition-colors",
                            isSelected && "bg-blue-50 hover:bg-blue-50"
                          )}
                          onClick={() => onSelect(row)}
                        >
                          {isMultiSelect ? (
                            <TableCell className="py-3 align-middle">
                              <div
                                className={cn(
                                  "mx-auto flex h-4 w-4 items-center justify-center rounded-sm border",
                                  isSelected
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-muted-foreground/40 bg-background"
                                )}
                              >
                                {isSelected ? <Check className="h-3 w-3" /> : null}
                              </div>
                            </TableCell>
                          ) : null}
                          {columns.map((col) => (
                            <TableCell key={col.key} className={cn("py-3 align-middle text-sm", col.className)}>
                              {col.render
                                ? col.render(row)
                                : renderPlainValue(row[col.key])}
                            </TableCell>
                          ))}
                          <TableCell className="py-3 text-right align-middle">
                            {isSelected ? (
                              <Check className="h-4 w-4 text-green-600 ml-auto" />
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelect(row);
                                }}
                              >
                                选择
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 底部操作 */}
          <DialogFooter className="pt-1">
            {onConfirm ? (
              <Button onClick={onConfirm}>
                {confirmText}
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
          </DialogFooter>
        </div>
      </DraggableDialogContent>
    </DraggableDialog>
  );
}
