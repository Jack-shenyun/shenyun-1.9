/**
 * 文件管理器 - Windows 本地磁盘风格
 * 目录层级: /ERP/{部门}/{业务类型}/{年份}/{月份}/
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import ERPLayout from "@/components/ERPLayout";
import { toast } from "sonner";
import {
  Folder,
  FolderOpen,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  Upload,
  FolderPlus,
  Download,
  Trash2,
  RefreshCw,
  ChevronRight,
  Home,
  ArrowLeft,
  MoreVertical,
  Pencil,
  HardDrive,
  Search,
  LayoutGrid,
  List,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  listDirectory,
  createFolder,
  uploadFiles,
  downloadFile,
  deleteEntry,
  renameEntry,
  initERPFolders,
  formatFileSize,
  formatDateTime,
  type FileItem,
} from "@/lib/fileManagerApi";

// ============================================================
// 工具函数
// ============================================================

/** 根据扩展名返回对应图标组件 */
function getFileIcon(item: FileItem, size = 16): React.ReactNode {
  if (item.type === "folder") {
    return <Folder className={`w-${size} h-${size} text-yellow-400 fill-yellow-400/80`} />;
  }
  const ext = (item.ext || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(ext)) {
    return <FileImage className={`w-${size} h-${size} text-blue-500`} />;
  }
  if ([".xls", ".xlsx"].includes(ext)) {
    return <FileSpreadsheet className={`w-${size} h-${size} text-green-600`} />;
  }
  if ([".doc", ".docx"].includes(ext)) {
    return <FileText className={`w-${size} h-${size} text-blue-600`} />;
  }
  if ([".pdf"].includes(ext)) {
    return <FileText className={`w-${size} h-${size} text-red-500`} />;
  }
  if ([".zip", ".rar", ".7z"].includes(ext)) {
    return <FileArchive className={`w-${size} h-${size} text-orange-500`} />;
  }
  return <File className={`w-${size} h-${size} text-gray-500`} />;
}

/** 将虚拟路径解析为面包屑数组 */
function parseBreadcrumbs(virtualPath: string): Array<{ label: string; path: string }> {
  const parts = virtualPath.replace(/^\//, "").split("/").filter(Boolean);
  const crumbs: Array<{ label: string; path: string }> = [];
  let acc = "";
  for (const part of parts) {
    acc += "/" + part;
    crumbs.push({ label: part, path: acc });
  }
  return crumbs;
}

// ============================================================
// 子组件：文件/文件夹图标卡片（图标视图）
// ============================================================
interface FileCardProps {
  item: FileItem;
  selected: boolean;
  renaming: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onRenameSubmit: (newName: string) => void;
  onRenameCancel: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

function FileCard({
  item,
  selected,
  renaming,
  onSelect,
  onDoubleClick,
  onRenameSubmit,
  onRenameCancel,
}: FileCardProps) {
  const [editValue, setEditValue] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      setEditValue(item.name);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [renaming, item.name]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onRenameSubmit(editValue);
    if (e.key === "Escape") onRenameCancel();
  };

  return (
    <div
      className={`
        flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer select-none
        w-24 min-h-[88px] transition-all duration-100
        ${selected
          ? "bg-blue-100 dark:bg-blue-900/40 ring-1 ring-blue-400"
          : "hover:bg-gray-100 dark:hover:bg-gray-800"
        }
      `}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      <div className="flex items-center justify-center w-12 h-12">
        {item.type === "folder"
          ? <Folder className="w-12 h-12 text-yellow-400 fill-yellow-400/80 drop-shadow-sm" />
          : getFileIcon(item, 10)}
      </div>
      {renaming ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onRenameSubmit(editValue)}
          className="w-full text-xs text-center border rounded px-1 py-0.5 outline-none bg-white dark:bg-gray-900"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="text-xs text-center break-all line-clamp-2 leading-tight w-full"
          title={item.name}
        >
          {item.name}
        </span>
      )}
    </div>
  );
}

// ============================================================
// 子组件：列表行（列表视图）
// ============================================================
interface FileRowProps {
  item: FileItem;
  selected: boolean;
  renaming: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onRenameSubmit: (newName: string) => void;
  onRenameCancel: () => void;
}

function FileRow({
  item,
  selected,
  renaming,
  onSelect,
  onDoubleClick,
  onRenameSubmit,
  onRenameCancel,
}: FileRowProps) {
  const [editValue, setEditValue] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      setEditValue(item.name);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [renaming, item.name]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onRenameSubmit(editValue);
    if (e.key === "Escape") onRenameCancel();
  };

  return (
    <tr
      className={`
        cursor-pointer select-none border-b border-gray-100 dark:border-gray-800
        ${selected
          ? "bg-blue-50 dark:bg-blue-900/30"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
        }
      `}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      <td className="py-1.5 px-3 flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0">{getFileIcon(item, 4)}</span>
        {renaming ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onRenameSubmit(editValue)}
            className="flex-1 text-sm border rounded px-1 py-0.5 outline-none bg-white dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm truncate" title={item.name}>{item.name}</span>
        )}
      </td>
      <td className="py-1.5 px-3 text-xs text-gray-500 whitespace-nowrap">
        {item.type === "folder" ? "文件夹" : (item.ext?.replace(".", "").toUpperCase() || "文件")}
      </td>
      <td className="py-1.5 px-3 text-xs text-gray-500 whitespace-nowrap text-right">
        {item.type === "file" ? formatFileSize(item.size) : ""}
      </td>
      <td className="py-1.5 px-3 text-xs text-gray-500 whitespace-nowrap">
        {formatDateTime(item.modifiedAt)}
      </td>
    </tr>
  );
}

// ============================================================
// 主组件
// ============================================================
function FileManagerContent() {
  const [currentPath, setCurrentPath] = useState("/ERP");
  const [history, setHistory] = useState<string[]>([]);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"icon" | "list">("icon");
  const [searchQuery, setSearchQuery] = useState("");

  // 对话框状态
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<FileItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 加载目录 ──────────────────────────────────────────────
  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setSelectedPath(null);
    try {
      const result = await listDirectory(path);
      setItems(result);
      setCurrentPath(path);
    } catch (err: any) {
      toast.error(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化并加载根目录
  useEffect(() => {
    initERPFolders().then(() => loadDirectory("/ERP"));
  }, [loadDirectory]);

  // ── 导航 ──────────────────────────────────────────────────
  const navigateTo = (path: string) => {
    setHistory((prev) => [...prev, currentPath]);
    loadDirectory(path);
  };

  const goBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    loadDirectory(prev);
  };

  const handleItemDoubleClick = (item: FileItem) => {
    if (item.type === "folder") {
      navigateTo(item.path);
    } else {
      downloadFile(item.path, item.name);
    }
  };

  // ── 新建文件夹 ────────────────────────────────────────────
  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      toast.error("请输入文件夹名称");
      return;
    }
    try {
      await createFolder(`${currentPath}/${name}`);
      toast.success(`文件夹「${name}」已创建`);
      setNewFolderOpen(false);
      setNewFolderName("");
      loadDirectory(currentPath);
    } catch (err: any) {
      toast.error(`创建失败: ${err.message}`);
    }
  };

  // ── 上传文件 ──────────────────────────────────────────────
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadProgress(0);
    try {
      await uploadFiles(currentPath, files, (p) => setUploadProgress(p));
      toast.success(`成功上传 ${files.length} 个文件`);
      loadDirectory(currentPath);
    } catch (err: any) {
      toast.error(`上传失败: ${err.message}`);
    } finally {
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  // ── 下载 ──────────────────────────────────────────────────
  const handleDownload = (item: FileItem) => {
    if (item.type === "file") {
      downloadFile(item.path, item.name);
    }
  };

  // ── 删除 ──────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmItem) return;
    try {
      await deleteEntry(deleteConfirmItem.path);
      toast.success(`已删除「${deleteConfirmItem.name}」`);
      setDeleteConfirmItem(null);
      if (selectedPath === deleteConfirmItem.path) setSelectedPath(null);
      loadDirectory(currentPath);
    } catch (err: any) {
      toast.error(`删除失败: ${err.message}`);
    }
  };

  // ── 重命名 ────────────────────────────────────────────────
  const handleRenameSubmit = async (item: FileItem, newName: string) => {
    setRenamingPath(null);
    const trimmed = newName.trim();
    if (!trimmed || trimmed === item.name) return;
    try {
      await renameEntry(item.path, trimmed);
      toast.success("重命名成功");
      loadDirectory(currentPath);
    } catch (err: any) {
      toast.error(`重命名失败: ${err.message}`);
    }
  };

  // ── 拖放上传 ──────────────────────────────────────────────
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    setUploadProgress(0);
    try {
      await uploadFiles(currentPath, files, (p) => setUploadProgress(p));
      toast.success(`成功上传 ${files.length} 个文件`);
      loadDirectory(currentPath);
    } catch (err: any) {
      toast.error(`上传失败: ${err.message}`);
    } finally {
      setUploadProgress(null);
    }
  };

  // ── 过滤搜索 ──────────────────────────────────────────────
  const filteredItems = searchQuery
    ? items.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  const breadcrumbs = parseBreadcrumbs(currentPath);
  const selectedItem = items.find((i) => i.path === selectedPath) || null;

  // ── 渲染 ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* ── 标题栏 ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <HardDrive className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">文件管理</span>
        <div className="flex-1" />
        {/* 视图切换 */}
        <div className="flex items-center gap-1 border rounded-md overflow-hidden">
          <button
            className={`p-1.5 transition-colors ${viewMode === "icon" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-500"}`}
            onClick={() => setViewMode("icon")}
            title="图标视图"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-500"}`}
            onClick={() => setViewMode("list")}
            title="列表视图"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 工具栏 ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        {/* 后退 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goBack}
          disabled={history.length === 0}
          title="后退"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {/* 根目录 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => { setHistory([]); loadDirectory("/ERP"); }}
          title="根目录"
        >
          <Home className="w-4 h-4" />
        </Button>
        {/* 刷新 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => loadDirectory(currentPath)}
          title="刷新"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* 新建文件夹 */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => { setNewFolderName(""); setNewFolderOpen(true); }}
        >
          <FolderPlus className="w-3.5 h-3.5" />
          新建文件夹
        </Button>

        {/* 上传文件 */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5" />
          上传文件
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="flex-1" />

        {/* 搜索框 */}
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索文件..."
            className="h-8 pl-8 pr-8 text-xs"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 地址栏（面包屑） ── */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.path}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
            <button
              className={`
                text-xs px-1.5 py-0.5 rounded transition-colors flex-shrink-0
                ${idx === breadcrumbs.length - 1
                  ? "text-gray-800 dark:text-gray-200 font-medium"
                  : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                }
              `}
              onClick={() => idx < breadcrumbs.length - 1 && navigateTo(crumb.path)}
            >
              {crumb.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* ── 上传进度条 ── */}
      {uploadProgress !== null && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100">
          <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 mb-1">
            <Upload className="w-3.5 h-3.5 animate-bounce" />
            正在上传... {uploadProgress}%
          </div>
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}

      {/* ── 主内容区 ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧导航树（仅显示部门级） */}
        <div className="w-44 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          <div className="p-2">
            <button
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${currentPath === "/ERP" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
              onClick={() => { setHistory([]); loadDirectory("/ERP"); }}
            >
              <HardDrive className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="truncate font-medium">ERP 文件库</span>
            </button>
            <DepartmentTree
              currentPath={currentPath}
              onNavigate={navigateTo}
            />
          </div>
        </div>

        {/* 右侧文件内容区 */}
        <div
          className="flex-1 overflow-hidden flex flex-col"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                加载中...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                <FolderOpen className="w-12 h-12 opacity-30" />
                <p className="text-sm">{searchQuery ? "未找到匹配文件" : "此文件夹为空"}</p>
                <p className="text-xs opacity-60">可将文件拖放到此处上传</p>
              </div>
            ) : viewMode === "icon" ? (
              /* 图标视图 */
              <div
                className="p-4 flex flex-wrap gap-2 content-start"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setSelectedPath(null);
                }}
              >
                {filteredItems.map((item) => (
                  <ContextMenu key={item.path}>
                    <ContextMenuTrigger>
                      <FileCard
                        item={item}
                        selected={selectedPath === item.path}
                        renaming={renamingPath === item.path}
                        onSelect={() => setSelectedPath(item.path)}
                        onDoubleClick={() => handleItemDoubleClick(item)}
                        onRenameSubmit={(name) => handleRenameSubmit(item, name)}
                        onRenameCancel={() => setRenamingPath(null)}
                      />
                    </ContextMenuTrigger>
                    <FileContextMenu
                      item={item}
                      onOpen={() => handleItemDoubleClick(item)}
                      onDownload={() => handleDownload(item)}
                      onRename={() => setRenamingPath(item.path)}
                      onDelete={() => setDeleteConfirmItem(item)}
                    />
                  </ContextMenu>
                ))}
              </div>
            ) : (
              /* 列表视图 */
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <th className="text-left py-1.5 px-3 text-xs font-medium text-gray-500 w-full">名称</th>
                    <th className="text-left py-1.5 px-3 text-xs font-medium text-gray-500 whitespace-nowrap">类型</th>
                    <th className="text-right py-1.5 px-3 text-xs font-medium text-gray-500 whitespace-nowrap">大小</th>
                    <th className="text-left py-1.5 px-3 text-xs font-medium text-gray-500 whitespace-nowrap">修改时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <ContextMenu key={item.path}>
                      <ContextMenuTrigger asChild>
                        <FileRow
                          item={item}
                          selected={selectedPath === item.path}
                          renaming={renamingPath === item.path}
                          onSelect={() => setSelectedPath(item.path)}
                          onDoubleClick={() => handleItemDoubleClick(item)}
                          onRenameSubmit={(name) => handleRenameSubmit(item, name)}
                          onRenameCancel={() => setRenamingPath(null)}
                        />
                      </ContextMenuTrigger>
                      <FileContextMenu
                        item={item}
                        onOpen={() => handleItemDoubleClick(item)}
                        onDownload={() => handleDownload(item)}
                        onRename={() => setRenamingPath(item.path)}
                        onDelete={() => setDeleteConfirmItem(item)}
                      />
                    </ContextMenu>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>

          {/* 状态栏 */}
          <div className="flex items-center gap-4 px-4 py-1.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500">
            <span>{filteredItems.length} 个项目</span>
            {selectedItem && (
              <>
                <span>·</span>
                <span>已选择: {selectedItem.name}</span>
                {selectedItem.type === "file" && (
                  <>
                    <span>·</span>
                    <span>{formatFileSize(selectedItem.size)}</span>
                  </>
                )}
              </>
            )}
            <div className="flex-1" />
            <span className="text-gray-400 italic text-xs">拖放文件到此处可快速上传</span>
          </div>
        </div>
      </div>

      {/* ── 新建文件夹对话框 ── */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-yellow-500" />
              新建文件夹
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="请输入文件夹名称"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              将在 <span className="font-mono text-blue-600">{currentPath}/</span> 下创建
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>取消</Button>
            <Button onClick={handleCreateFolder}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 删除确认对话框 ── */}
      <Dialog open={!!deleteConfirmItem} onOpenChange={(o) => !o && setDeleteConfirmItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              确认删除
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
            确定要删除
            <span className="font-semibold text-gray-800 dark:text-gray-200 mx-1">
              「{deleteConfirmItem?.name}」
            </span>
            吗？{deleteConfirmItem?.type === "folder" && "文件夹内所有文件将一并删除，"}此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmItem(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FileManagerPage() {
  return (
    <ERPLayout>
      <div className="h-[calc(100vh-7rem)] flex flex-col">
        <FileManagerContent />
      </div>
    </ERPLayout>
  );
}

// ============================================================
// 右键菜单
// ============================================================
function FileContextMenu({
  item,
  onOpen,
  onDownload,
  onRename,
  onDelete,
}: {
  item: FileItem;
  onOpen: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <ContextMenuContent className="w-48">
      <ContextMenuItem onClick={onOpen}>
        {item.type === "folder" ? (
          <><FolderOpen className="w-4 h-4 mr-2 text-yellow-500" />打开</>
        ) : (
          <><Download className="w-4 h-4 mr-2 text-blue-500" />下载</>
        )}
      </ContextMenuItem>
      {item.type === "file" && (
        <ContextMenuItem onClick={onDownload}>
          <Download className="w-4 h-4 mr-2 text-blue-500" />下载文件
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onRename}>
        <Pencil className="w-4 h-4 mr-2 text-gray-500" />重命名
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
        <Trash2 className="w-4 h-4 mr-2" />删除
      </ContextMenuItem>
    </ContextMenuContent>
  );
}

// ============================================================
// 左侧部门导航树
// ============================================================
const DEPARTMENTS = [
  "管理部", "招商部", "销售部", "研发部", "生产部",
  "质量部", "采购部", "仓库管理", "财务部",
];

function DepartmentTree({
  currentPath,
  onNavigate,
}: {
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [subItems, setSubItems] = useState<Record<string, FileItem[]>>({});

  const toggle = async (deptPath: string) => {
    if (expanded.has(deptPath)) {
      setExpanded((s) => { const n = new Set(s); n.delete(deptPath); return n; });
    } else {
      setExpanded((s) => new Set(s).add(deptPath));
      if (!subItems[deptPath]) {
        try {
          const items = await listDirectory(deptPath);
          setSubItems((prev) => ({ ...prev, [deptPath]: items.filter((i) => i.type === "folder") }));
        } catch {
          // ignore
        }
      }
    }
  };

  return (
    <div className="mt-1">
      {DEPARTMENTS.map((dept) => {
        const deptPath = `/ERP/${dept}`;
        const isExpanded = expanded.has(deptPath);
        const isActive = currentPath === deptPath || currentPath.startsWith(deptPath + "/");
        return (
          <div key={dept}>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${isActive ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
            >
              <button
                className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); toggle(deptPath); }}
              >
                <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </button>
              <button
                className="flex items-center gap-1.5 flex-1 min-w-0"
                onClick={() => onNavigate(deptPath)}
              >
                <Folder className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400/80 flex-shrink-0" />
                <span className="truncate">{dept}</span>
              </button>
            </div>
            {isExpanded && subItems[deptPath] && (
              <div className="ml-4">
                {subItems[deptPath].map((sub) => (
                  <button
                    key={sub.path}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${currentPath === sub.path ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
                    onClick={() => onNavigate(sub.path)}
                  >
                    <Folder className="w-3 h-3 text-yellow-400 fill-yellow-400/80 flex-shrink-0" />
                    <span className="truncate">{sub.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
