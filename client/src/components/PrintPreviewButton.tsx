import { useMemo } from "react";
import type { RefObject, ComponentProps } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openPrintPreviewWindow } from "@/lib/printPreview";
import { toast } from "sonner";

interface PrintPreviewButtonProps extends Omit<ComponentProps<typeof Button>, "onClick"> {
  title?: string;
  targetRef?: RefObject<HTMLElement | null>;
  landscape?: boolean;
}

export default function PrintPreviewButton({
  title,
  targetRef,
  landscape = false,
  children,
  variant = "outline",
  size = "sm",
  ...props
}: PrintPreviewButtonProps) {
  const disabled = useMemo(() => props.disabled || !targetRef, [props.disabled, targetRef]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      {...props}
      disabled={disabled}
      onClick={() => {
        const opened = openPrintPreviewWindow({
          title,
          element: targetRef?.current || null,
          landscape,
        });
        if (!opened) {
          toast.error("当前内容暂时无法预览");
        }
      }}
    >
      <Printer className="h-4 w-4 mr-1.5" />
      {children || "打印预览"}
    </Button>
  );
}
