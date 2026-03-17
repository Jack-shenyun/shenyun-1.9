/**
 * UnifiedPrintButton - 统一打印按钮组件
 * 
 * 使用方式：
 * <UnifiedPrintButton
 *   templateKey="sales_order"
 *   data={{ orderNumber: "SO-001", customerName: "XX医院", items: [...] }}
 *   label="打印订单"
 * />
 */
import { Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePrintTemplate } from "@/hooks/usePrintTemplate";

interface UnifiedPrintButtonProps {
  /** 模版标识，如 "sales_order" */
  templateKey: string;
  /** 业务数据对象 */
  data: Record<string, any>;
  /** 按钮文字 */
  label?: string;
  /** 按钮大小 */
  size?: "sm" | "default" | "lg" | "icon";
  /** 按钮样式 */
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  /** 额外的 className */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 打印前回调（返回 false 可阻止打印） */
  onBeforePrint?: () => boolean | void;
  /** 打印后回调 */
  onAfterPrint?: () => void;
}

export default function UnifiedPrintButton({
  templateKey,
  data,
  label = "打印",
  size = "sm",
  variant = "outline",
  className = "",
  disabled = false,
  onBeforePrint,
  onAfterPrint,
}: UnifiedPrintButtonProps) {
  const { print, isRendering } = usePrintTemplate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = async () => {
    if (onBeforePrint) {
      const result = onBeforePrint();
      if (result === false) return;
    }
    setIsSubmitting(true);
    await print(templateKey, data);
    setIsSubmitting(false);
    if (onAfterPrint) {
      onAfterPrint();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || isSubmitting || isRendering}
      onClick={handleClick}
    >
      <Printer className="h-4 w-4 mr-1" />
      {isSubmitting || isRendering ? "生成中..." : label}
    </Button>
  );
}
