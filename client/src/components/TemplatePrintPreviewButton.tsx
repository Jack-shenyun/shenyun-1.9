import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrintTemplate } from "@/hooks/usePrintTemplate";

interface TemplatePrintPreviewButtonProps extends Omit<ComponentProps<typeof Button>, "onClick"> {
  templateKey: string;
  data: Record<string, any>;
  title?: string;
}

export default function TemplatePrintPreviewButton({
  templateKey,
  data,
  title,
  children,
  variant = "outline",
  size = "sm",
  ...props
}: TemplatePrintPreviewButtonProps) {
  const { preview, isRendering } = usePrintTemplate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const disabled = useMemo(
    () => Boolean(props.disabled) || !templateKey || !data || isSubmitting || isRendering,
    [data, isRendering, isSubmitting, props.disabled, templateKey],
  );

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      {...props}
      disabled={disabled}
      onClick={async () => {
        setIsSubmitting(true);
        await preview(templateKey, data, title);
        setIsSubmitting(false);
      }}
    >
      <Printer className="mr-1.5 h-4 w-4" />
      {isSubmitting || isRendering ? "生成中..." : children || "打印预览"}
    </Button>
  );
}
