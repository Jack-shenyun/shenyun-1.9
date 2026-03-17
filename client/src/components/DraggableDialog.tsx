import { ReactNode, useRef, useState, useEffect } from "react";
import Draggable from "react-draggable";
import { Resizable } from "re-resizable";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2, GripVertical, Search, X, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMobile";
import { openPrintPreviewWindow } from "@/lib/printPreview";

interface DraggableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number | string;
  maxHeight?: number | string;
  isMaximized?: boolean;
  onMaximizedChange?: (maximized: boolean) => void;
  enableSearch?: boolean;
  printable?: boolean;
  printTitle?: string;
  printLandscape?: boolean;
  onPrintPreview?: () => void;
}

export function DraggableDialog({
  open,
  onOpenChange,
  children,
  className,
  defaultWidth = 672, // 对应 max-w-2xl
  defaultHeight = 600,
  minWidth = 400,
  minHeight = 300,
  maxWidth = "90vw",
  maxHeight = "90vh",
  isMaximized: externalIsMaximized,
  onMaximizedChange,
  enableSearch = true,
  printable = true,
  printTitle,
  printLandscape = false,
  onPrintPreview,
}: DraggableDialogProps) {
  const isMobile = useIsMobile();
  const [internalIsMaximized, setInternalIsMaximized] = useState(false);
  const isMaximized = (externalIsMaximized ?? internalIsMaximized) || isMobile; // 移动端默认全屏
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const nodeRef = useRef(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 重置位置和大小当对话框打开时
  useEffect(() => {
    if (open) {
      if (!externalIsMaximized) {
        setInternalIsMaximized(false);
      }
      setSize({ width: defaultWidth, height: defaultHeight });
      setPosition({ x: 0, y: 0 });
      setSearchQuery("");
      setShowSearch(false);
    }
  }, [open, defaultWidth, defaultHeight, externalIsMaximized]);

  // 搜索高亮
  useEffect(() => {
    if (!contentRef.current || !searchQuery) return;

    const content = contentRef.current;
    const walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    // 清除之前的高亮
    content.querySelectorAll('.search-highlight').forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });

    if (!searchQuery) return;

    // 添加新高亮
    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const regex = new RegExp(`(${searchQuery})`, 'gi');
      if (regex.test(text)) {
        const span = document.createElement('span');
        span.innerHTML = text.replace(regex, '<mark class="search-highlight bg-yellow-200 dark:bg-yellow-800">$1</mark>');
        textNode.parentNode?.replaceChild(span, textNode);
      }
    });
  }, [searchQuery]);

  const handleMaximize = () => {
    const newMaximized = !isMaximized;
    if (onMaximizedChange) {
      onMaximizedChange(newMaximized);
    } else {
      setInternalIsMaximized(newMaximized);
    }
    if (newMaximized) {
      // 最大化：保存当前位置和大小
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleOpenPrintPreview = () => {
    if (onPrintPreview) {
      onPrintPreview();
      return;
    }
    openPrintPreviewWindow({
      title: printTitle,
      element: contentRef.current,
      landscape: printLandscape,
    });
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <Draggable
            nodeRef={nodeRef}
            handle=".drag-handle"
            position={position}
            onStop={(e, data) => {
              if (!isMaximized) {
                setPosition({ x: data.x, y: data.y });
              }
            }}
            disabled={isMaximized}
          >
            <div ref={nodeRef} className="pointer-events-auto">
              <Resizable
                size={
                  isMaximized
                    ? { width: "90vw", height: "90vh" }
                    : { width: size.width, height: size.height }
                }
                onResizeStop={(e, direction, ref, d) => {
                  if (!isMaximized) {
                    setSize({
                      width: size.width + d.width,
                      height: size.height + d.height,
                    });
                  }
                }}
                minWidth={minWidth}
                minHeight={minHeight}
                maxWidth={maxWidth}
                maxHeight={maxHeight}
                enable={{
                  top: !isMaximized,
                  right: !isMaximized,
                  bottom: !isMaximized,
                  left: !isMaximized,
                  topRight: !isMaximized,
                  bottomRight: !isMaximized,
                  bottomLeft: !isMaximized,
                  topLeft: !isMaximized,
                }}
                className={cn(
                  "bg-background border rounded-lg shadow-lg flex flex-col",
                  isMaximized && "!w-[90vw] !h-[90vh]",
                  className
                )}
              >
                {/* 拖动手柄 */}
                <div className="drag-handle flex items-center justify-between px-6 py-4 border-b cursor-move select-none bg-muted/30 rounded-t-lg">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    <span className="text-xs">拖动移动</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {printable && (
                      <button
                        onClick={handleOpenPrintPreview}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="打印预览"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    )}
                    {enableSearch && (
                      <button
                        onClick={() => setShowSearch(!showSearch)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="搜索"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={handleMaximize}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title={isMaximized ? "还原" : "最大化"}
                    >
                      {isMaximized ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => onOpenChange(false)}
                      className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                      title="关闭"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* 搜索框 */}
                {enableSearch && showSearch && (
                  <div className="px-6 py-3 border-b bg-muted/10">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="搜索内容..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-9"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setSearchQuery("")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* 内容区域 */}
                <div
                  ref={contentRef} 
                  className="flex-1 overflow-y-auto overflow-x-hidden"
                  onWheel={(e) => {
                    // 阻止事件冒泡到Draggable，允许滚轮正常工作
                    e.stopPropagation();
                  }}
                >
                  {children}
                </div>
              </Resizable>
            </div>
          </Draggable>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

// 用于替换DialogContent的组件
export function DraggableDialogContent({ 
  children, 
  isMaximized = false,
  className,
}: { 
  children: ReactNode;
  isMaximized?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(
      "px-6 py-4",
      isMaximized && "max-w-none",
      className
    )}>
      {children}
    </div>
  );
}
