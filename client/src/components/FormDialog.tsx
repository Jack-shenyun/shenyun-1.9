import { useState, useEffect, useMemo, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useDraftAutoSave } from "@/hooks/useDraftAutoSave";
import { useIsMobile } from "@/hooks/useMobile";

export type FieldType = "text" | "number" | "textarea" | "select" | "date" | "email" | "tel" | "switch";

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean;
  span?: 1 | 2; // 占据的列数，默认1
  /** 根据当前表单数据动态判断是否隐藏该字段 */
  hidden?: (formData: Record<string, any>) => boolean;
  /** 是否禁用该字段（只读） */
  disabled?: boolean;
}

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormField[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  /** 保存草稿回调，传入时显示"保存草稿"按钮 */
  onSaveDraft?: (data: Record<string, any>) => void | Promise<void>;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  /** 表单唯一标识，用于草稿保存 */
  formId?: string;
  /** 是否启用草稿自动保存，默认true */
  enableDraft?: boolean;
  /** 字段值变化时的回调，用于实现动态表单逻辑。可返回对象以更新其他字段 */
  onChange?: (name: string, value: any) => Record<string, any> | void;
}

function normalizeDateValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return format(value, "yyyy-MM-dd");
  }
  const raw = String(value).trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return format(parsed, "yyyy-MM-dd");
}

function buildNormalizedFormData(fields: FormField[], initialData: Record<string, any>) {
  const normalized: Record<string, any> = {};
  fields.forEach((field) => {
    const rawValue = initialData[field.name];
    const baseValue = rawValue ?? field.defaultValue;

    if (field.type === "switch") {
      if (typeof baseValue === "boolean") {
        normalized[field.name] = baseValue;
      } else if (baseValue === "true") {
        normalized[field.name] = true;
      } else if (baseValue === "false") {
        normalized[field.name] = false;
      } else {
        normalized[field.name] = false;
      }
      return;
    }

    if (field.type === "date") {
      normalized[field.name] = normalizeDateValue(baseValue);
      return;
    }

    if (field.type === "select") {
      const options = field.options ?? [];
      const stringValue =
        baseValue === null || baseValue === undefined ? "" : String(baseValue);

      if (!stringValue) {
        const defaultValue =
          field.defaultValue === null || field.defaultValue === undefined
            ? ""
            : String(field.defaultValue);
        normalized[field.name] = defaultValue;
        return;
      }

      if (options.length === 0 || options.some((option) => option.value === stringValue)) {
        normalized[field.name] = stringValue;
        return;
      }

      const defaultValue =
        field.defaultValue === null || field.defaultValue === undefined
          ? ""
          : String(field.defaultValue);
      if (defaultValue && options.some((option) => option.value === defaultValue)) {
        normalized[field.name] = defaultValue;
        return;
      }

      normalized[field.name] = field.required && options.length > 0 ? options[0].value : "";
      return;
    }

    normalized[field.name] = baseValue ?? "";
  });
  return normalized;
}

export default function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initialData = {},
  onSubmit,
  onSaveDraft,
  submitText = "保存",
  cancelText = "取消",
  isLoading = false,
  formId,
  enableDraft = true,
  onChange,
}: FormDialogProps) {
  // 生成默认的formId
  const effectiveFormId = formId || `form_${title.replace(/\s+/g, "_")}`;
  const normalizedInitialData = useMemo(
    () => buildNormalizedFormData(fields, initialData),
    [fields, initialData]
  );
  
  const [formData, setFormData] = useState<Record<string, any>>(() => normalizedInitialData);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDraftAlert, setShowDraftAlert] = useState(false);
  const [draftData, setDraftData] = useState<Record<string, any> | null>(null);

  // 草稿自动保存Hook
  const {
    hasDraft: hasSavedDraft,
    draftTimestamp,
    saveDraft,
    restoreDraft,
    clearDraft,
    dismissDraft,
  } = useDraftAutoSave({
    formId: effectiveFormId,
    enabled: enableDraft && open,
    debounceMs: 800,
  });

  // 当对话框打开时，检查是否有草稿
  useEffect(() => {
    if (open && enableDraft && hasSavedDraft) {
      const draft = restoreDraft();
      if (draft) {
        // 检查草稿是否与当前初始数据不同
        const isDifferent = Object.keys(draft).some(
          (key) => draft[key] !== (normalizedInitialData[key] ?? "")
        );
        if (isDifferent) {
          setDraftData(draft);
          setShowDraftAlert(true);
        }
      }
    }
  }, [open, enableDraft, hasSavedDraft]);

  // 当初始数据或open变化时，重置表单
  useEffect(() => {
    if (open) {
      setFormData(normalizedInitialData);
      setErrors({});
    }
  }, [open]);

  // 表单数据变化时自动保存草稿
  useEffect(() => {
    if (open && enableDraft) {
      saveDraft(formData);
    }
  }, [formData, open, enableDraft, saveDraft]);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    // 调用外部onChange回调，支持返回需要更新的字段
    if (onChange) {
      const updates = onChange(name, value);
      if (updates && typeof updates === "object") {
        setFormData((prev) => ({ ...prev, ...updates }));
      }
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      // 跳过隐藏字段的验证
      if (field.hidden && field.hidden(formData)) return;
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label}不能为空`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
    // 提交成功后清除草稿
    clearDraft();
  };

  const handleSaveDraft = async () => {
    if (onSaveDraft) {
      await onSaveDraft({ ...formData, status: "draft" });
    } else {
      // 默认行为：保存到本地草稿
      saveDraft(formData);
    }
  };

  const handleRestoreDraft = () => {
    if (draftData) {
      setFormData(draftData);
    }
    setShowDraftAlert(false);
    setDraftData(null);
  };

  const handleDismissDraft = () => {
    dismissDraft();
    setShowDraftAlert(false);
    setDraftData(null);
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      // 关闭时不清除草稿，保留以便下次恢复
    }
    onOpenChange(newOpen);
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name];
    const error = errors[field.name];

    switch (field.type) {
      case "textarea":
        return (
          <div key={field.name} className={cn("space-y-2", field.span === 2 && "col-span-2")}>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={cn(error && "border-destructive")}
              rows={3}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      case "select":
        return (
          <div key={field.name} className={cn("space-y-2", field.span === 2 && "col-span-2")}>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value || undefined}
              onValueChange={(v) => handleChange(field.name, v === "__NONE__" ? "" : v)}
            >
              <SelectTrigger className={cn(error && "border-destructive")}>
                <SelectValue placeholder={field.placeholder || `请选择${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem
                    key={option.value || "__NONE__"}
                    value={option.value || "__NONE__"}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      case "switch":
        return (
          <div key={field.name} className={cn("flex items-center justify-between rounded-lg border p-3", field.span === 2 && "col-span-2")}>
            <div className="space-y-0.5">
              <Label htmlFor={field.name} className="text-sm font-medium">
                {field.label}
              </Label>
              {field.placeholder && (
                <p className="text-xs text-muted-foreground">{field.placeholder}</p>
              )}
            </div>
            <Switch
              id={field.name}
              checked={!!value}
              onCheckedChange={(checked) => handleChange(field.name, checked)}
            />
          </div>
        );

      case "date":
        return (
          <div key={field.name} className={cn("space-y-2", field.span === 2 && "col-span-2")}>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !value && "text-muted-foreground",
                    error && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(new Date(value), "yyyy-MM-dd", { locale: zhCN }) : field.placeholder || "选择日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value ? new Date(value) : undefined}
                  onSelect={(date) => handleChange(field.name, date ? format(date, "yyyy-MM-dd") : "")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      default:
        return (
          <div key={field.name} className={cn("space-y-2", field.span === 2 && "col-span-2")}>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={cn(error && "border-destructive", field.disabled && "bg-muted cursor-not-allowed")}
              disabled={field.disabled}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
    }
  };

  const [isMaximized, setIsMaximized] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      <DraggableDialog 
        open={open} 
        onOpenChange={handleClose}
        isMaximized={isMaximized}
        onMaximizedChange={setIsMaximized}
      >
        <DraggableDialogContent isMaximized={isMaximized}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {title}
              {enableDraft && hasSavedDraft && (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  <FileText className="h-3 w-3" />
                  草稿已保存
                </span>
              )}
            </DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className={cn(
            "grid gap-4 py-4",
            isMobile 
              ? "grid-cols-1" 
              : isMaximized 
                ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-4" 
                : "grid-cols-1 md:grid-cols-2"
          )}>
            {fields.filter(f => !(f.hidden && f.hidden(formData))).map(renderField)}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft} disabled={isLoading}>
              <FileText className="mr-2 h-4 w-4" />
              保存草稿
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitText}
            </Button>
          </DialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      {/* 草稿恢复提示对话框 */}
      <AlertDialog open={showDraftAlert} onOpenChange={setShowDraftAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              发现未保存的草稿
            </AlertDialogTitle>
            <AlertDialogDescription>
              系统检测到您之前有未提交的表单内容
              {draftTimestamp && (
                <span className="block mt-1 text-xs">
                  保存时间：{format(draftTimestamp, "yyyy-MM-dd HH:mm:ss", { locale: zhCN })}
                </span>
              )}
              <span className="block mt-2">是否恢复草稿内容？</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDismissDraft}>
              放弃草稿
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreDraft}>
              恢复草稿
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// 查看详情对话框
export interface DetailField {
  label: string;
  value: ReactNode;
  span?: 1 | 2;
}

export interface DetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: DetailField[];
  actions?: ReactNode;
  columns?: 2 | 3 | 4; // 固定列数
}

export function DetailDialog({
  open,
  onOpenChange,
  title,
  fields,
  actions,
  columns,
}: DetailDialogProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <DraggableDialog 
      open={open} 
      onOpenChange={onOpenChange}
      isMaximized={isMaximized}
      onMaximizedChange={setIsMaximized}
    >
      <DraggableDialogContent isMaximized={isMaximized}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className={cn(
          "grid gap-4 py-4",
          columns === 3 ? "grid-cols-1 md:grid-cols-3" :
          columns === 4 ? "grid-cols-1 md:grid-cols-4" :
          isMaximized ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2"
        )}>
          {fields.map((field, index) => (
            <div
              key={index}
              className={cn(
                "space-y-1",
                field.span === 2 && columns === 3 && "md:col-span-2",
                field.span === 2 && !columns && !isMaximized && "col-span-2",
                field.span === 2 && !columns && isMaximized && "md:col-span-3 lg:col-span-4"
              )}
            >
              <p className="text-sm text-muted-foreground">{field.label}</p>
              <div className="font-medium">{field.value || "-"}</div>
            </div>
          ))}
        </div>

        {actions && <DialogFooter>{actions}</DialogFooter>}
      </DraggableDialogContent>
    </DraggableDialog>
  );
}
