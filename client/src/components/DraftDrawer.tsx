import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FileText, Edit, Trash2, Clock } from "lucide-react";
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
import { toast } from "sonner";
import { formatDate } from "@/lib/formatters";

export interface DraftItem {
  id: number | string;
  /** 显示标题（如产品名称、订单号） */
  title: string;
  /** 副标题（如编码、规格） */
  subtitle?: string;
  /** 创建时间 */
  createdAt?: string | Date;
  /** 更新时间 */
  updatedAt?: string | Date;
}

interface DraftDrawerProps {
  /** 草稿数量，用于按钮上显示角标 */
  count: number;
  /** 草稿列表数据 */
  drafts: DraftItem[];
  /** 模块名称，如"产品"、"订单" */
  moduleName?: string;
  /** 点击继续编辑回调 */
  onEdit: (item: DraftItem) => void;
  /** 点击删除回调 */
  onDelete: (item: DraftItem) => void;
  /** 是否正在加载 */
  loading?: boolean;
  /** 按钮样式 */
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  /** 按钮尺寸 */
  size?: "default" | "sm" | "lg" | "icon";
}

function formatTime(date?: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return formatDate(d);
}

export default function DraftDrawer({
  count,
  drafts,
  moduleName = "记录",
  onEdit,
  onDelete,
  loading = false,
  variant = "outline",
  size = "sm",
}: DraftDrawerProps) {
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DraftItem | null>(null);

  const handleEdit = (item: DraftItem) => {
    setOpen(false);
    onEdit(item);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      toast.success(`草稿已删除`);
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className="relative"
      >
        <FileText className="h-4 w-4 mr-1" />
        草稿库
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              草稿库
            </SheetTitle>
            <SheetDescription>
              {count > 0
                ? `共 ${count} 条${moduleName}草稿，点击继续编辑或删除`
                : `暂无${moduleName}草稿`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                加载中...
              </div>
            ) : drafts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">暂无草稿</p>
                <p className="text-xs text-muted-foreground mt-1">
                  新增{moduleName}时点击"保存草稿"即可保存到这里
                </p>
              </div>
            ) : (
              drafts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px] px-1.5 py-0">
                        草稿
                      </Badge>
                      <span className="text-sm font-medium truncate">{item.title}</span>
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {item.updatedAt
                          ? `更新于 ${formatTime(item.updatedAt)}`
                          : item.createdAt
                          ? `创建于 ${formatTime(item.createdAt)}`
                          : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary"
                      title="继续编辑"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="删除草稿"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除草稿？</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除草稿「{deleteTarget?.title}」，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
