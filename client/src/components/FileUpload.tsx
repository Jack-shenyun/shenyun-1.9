import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  File,
  Image,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDisplayNumber } from "@/lib/formatters";

const FILE_TYPE_CONFIG = {
  image: {
    accept: "image/*",
    maxSize: 10 * 1024 * 1024,
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"],
    icon: Image,
    label: "图片",
  },
  document: {
    accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt",
    maxSize: 50 * 1024 * 1024,
    extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"],
    icon: FileText,
    label: "文档",
  },
  all: {
    accept: "*/*",
    maxSize: 100 * 1024 * 1024,
    extensions: [],
    icon: File,
    label: "文件",
  },
};

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  status: "uploading" | "success" | "error";
  progress?: number;
  error?: string;
}

interface FileUploadProps {
  value?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
  fileType?: "image" | "document" | "all";
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  showPreview?: boolean;
}

const generateId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${formatDisplayNumber(bytes / Math.pow(k, i))} ${sizes[i]}`;
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return Image;
  if (type.includes("pdf") || type.includes("document") || type.includes("word")) return FileText;
  return File;
};

export function FileUpload({
  value = [],
  onChange,
  fileType = "all",
  multiple = true,
  maxFiles = 10,
  maxSize,
  disabled = false,
  className,
  placeholder,
  showPreview = true,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [currentFiles, setCurrentFiles] = useState<UploadedFile[]>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = FILE_TYPE_CONFIG[fileType];
  const effectiveMaxSize = maxSize || config.maxSize;

  const uploadFile = async (file: File): Promise<{ url: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));
    const url = URL.createObjectURL(file);
    return { url };
  };

  const updateFiles = useCallback((newFiles: UploadedFile[]) => {
    setCurrentFiles(newFiles);
    onChange?.(newFiles);
  }, [onChange]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      
      if (currentFiles.length + fileArray.length > maxFiles) {
        toast.error(`最多只能上传 ${maxFiles} 个文件`);
        return;
      }

      const newFiles: UploadedFile[] = [];

      for (const file of fileArray) {
        if (file.size > effectiveMaxSize) {
          toast.error(`文件 "${file.name}" 超过大小限制 (${formatFileSize(effectiveMaxSize)})`);
          continue;
        }

        if (fileType === "image" && !file.type.startsWith("image/")) {
          toast.error(`文件 "${file.name}" 不是有效的图片格式`);
          continue;
        }

        const uploadedFile: UploadedFile = {
          id: generateId(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: "",
          uploadedAt: new Date().toISOString(),
          status: "uploading",
          progress: 0,
        };

        newFiles.push(uploadedFile);
      }

      const updatedFiles = [...currentFiles, ...newFiles];
      updateFiles(updatedFiles);

      for (let i = 0; i < newFiles.length; i++) {
        const uploadedFile = newFiles[i];
        const file = fileArray[i];

        try {
          const result = await uploadFile(file);

          setCurrentFiles(prev => {
            const updated = prev.map((f: UploadedFile) =>
              f.id === uploadedFile.id
                ? { ...f, url: result.url, status: "success" as const, progress: 100 }
                : f
            );
            onChange?.(updated);
            return updated;
          });

          toast.success(`文件 "${file.name}" 上传成功`);
        } catch (error) {
          setCurrentFiles(prev => {
            const updated = prev.map((f: UploadedFile) =>
              f.id === uploadedFile.id
                ? { ...f, status: "error" as const, error: "上传失败" }
                : f
            );
            onChange?.(updated);
            return updated;
          });

          toast.error(`文件 "${file.name}" 上传失败`);
        }
      }
    },
    [currentFiles, onChange, maxFiles, effectiveMaxSize, fileType, updateFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [disabled, handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      e.target.value = "";
    },
    [handleFiles]
  );

  const handleRemove = useCallback(
    (fileId: string) => {
      const updated = currentFiles.filter((f: UploadedFile) => f.id !== fileId);
      updateFiles(updated);
      toast.success("文件已删除");
    },
    [currentFiles, updateFiles]
  );

  const handlePreview = useCallback((file: UploadedFile) => {
    if (file.type.startsWith("image/")) {
      setPreviewFile(file);
    } else {
      window.open(file.url, "_blank");
    }
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={config.accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div className="p-3 rounded-full bg-muted">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {placeholder || `拖拽${config.label}到此处，或点击上传`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              支持 {config.extensions.length > 0 ? config.extensions.join(", ") : "所有格式"}
              ，单个文件最大 {formatFileSize(effectiveMaxSize)}
            </p>
          </div>
        </div>
      </div>

      {currentFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">已上传文件 ({currentFiles.length}/{maxFiles})</span>
          </div>
          <div className="grid gap-2">
            {currentFiles.map((file: UploadedFile) => {
              const FileIcon = getFileIcon(file.type);
              return (
                <Card key={file.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {file.type.startsWith("image/") && file.url && showPreview ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="h-10 w-10 object-cover rounded"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                          {file.status === "uploading" && (
                            <Badge variant="outline" className="text-xs">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              上传中
                            </Badge>
                          )}
                          {file.status === "success" && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              已上传
                            </Badge>
                          )}
                          {file.status === "error" && (
                            <Badge variant="outline" className="text-xs text-red-600">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              失败
                            </Badge>
                          )}
                        </div>
                        {file.status === "uploading" && (
                          <Progress value={file.progress} className="h-1 mt-2" />
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {file.status === "success" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(file);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(file.url, "_blank");
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(file.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="flex items-center justify-center p-4">
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-h-[70vh] object-contain rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function ImageUpload({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "点击上传图片",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("图片大小不能超过10MB");
      return;
    }

    setIsUploading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const url = URL.createObjectURL(file);
      onChange?.(url);
      toast.success("图片上传成功");
    } catch (error) {
      toast.error("图片上传失败");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        disabled={disabled || isUploading}
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-40 object-cover rounded-lg border"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              更换
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onChange?.("")}
              disabled={disabled}
            >
              删除
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
            "hover:border-primary/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Image className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{placeholder}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
