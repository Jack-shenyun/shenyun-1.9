import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatDisplayNumber } from "@/lib/formatters";
import ERPLayout from "@/components/ERPLayout";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { EntityPickerDialog } from "@/components/EntityPickerDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateValue } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import {
  Box,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  FolderKanban,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface DrawingFile {
  id: string;
  name: string;
  format: string;
  size: string;
  version: string;
  note: string;
  fileUrl: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
}

interface DrawingRecord {
  id: number;
  docIds?: number[];
  drawingNo: string;
  name: string;
  productName: string;
  bomCode?: string;
  bomVersion?: string;
  category: string;
  owner: string;
  version: string;
  updatedAt: string;
  status: "draft" | "review" | "released";
  description: string;
  files: DrawingFile[];
}

const statusMap: Record<DrawingRecord["status"], { label: string; className: string }> = {
  draft: { label: "草稿", className: "bg-slate-100 text-slate-700 border-slate-200" },
  review: { label: "评审中", className: "bg-amber-100 text-amber-700 border-amber-200" },
  released: { label: "已发布", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const ONLINE_3D_FORMATS = new Set([
  "3ds",
  "3mf",
  "fbx",
  "glb",
  "gltf",
  "iges",
  "igs",
  "obj",
  "ply",
  "stl",
  "step",
  "stp",
]);

const ONLINE_CAD_FORMATS = new Set(["dwg", "dxf"]);
const ONLINE_DOCUMENT_FORMATS = new Set(["pdf"]);
const DRAWING_FILE_ACCEPT =
  ".pdf,.dwg,.dxf,.stp,.step,.igs,.iges,.stl,.obj,.glb,.gltf,.fbx,.ply,.3ds,.3mf";
const DRAWING_3D_PREFERRED_TEXT =
  "三维文件优先使用 STP / STEP，系统会从知识库同源调取并自动计算包络尺寸。";

function getFormatKey(file: DrawingFile) {
  return String(file.format || file.name.split(".").pop() || "").toLowerCase();
}

function isPreviewable(file: DrawingFile) {
  const format = getFormatKey(file);
  return ONLINE_CAD_FORMATS.has(format) || ONLINE_3D_FORMATS.has(format) || ONLINE_DOCUMENT_FORMATS.has(format);
}

function getPreviewEngine(file: DrawingFile) {
  const format = getFormatKey(file);
  if (ONLINE_CAD_FORMATS.has(format)) return "sharecad";
  if (ONLINE_3D_FORMATS.has(format)) return "local3d";
  if (ONLINE_DOCUMENT_FORMATS.has(format)) return "pdf";
  return "";
}

function getPreviewProviderLabel(file: DrawingFile) {
  const engine = getPreviewEngine(file);
  if (engine === "sharecad") return "CAD 在线预览";
  if (engine === "local3d") return "三维本地预览";
  if (engine === "pdf") return "PDF 在线预览";
  return "未识别预览引擎";
}

function getPreviewUrl(file: DrawingFile) {
  const format = getFormatKey(file);
  if (ONLINE_DOCUMENT_FORMATS.has(format)) {
    return file.fileUrl;
  }
  if (ONLINE_CAD_FORMATS.has(format)) {
    return `https://sharecad.org/cadframe/load?url=${encodeURIComponent(file.fileUrl)}`;
  }
  if (ONLINE_3D_FORMATS.has(format)) {
    return `/rd-3d-viewer.html?file=${encodeURIComponent(file.fileUrl)}&format=${encodeURIComponent(format)}&name=${encodeURIComponent(file.name)}`;
  }
  return "";
}

function getPreviewFrameConfig(engine: string) {
  if (engine === "sharecad") {
    return {
      iframeTop: -58,
      iframeHeightOffset: 92,
      topMaskHeight: 18,
      bottomMaskHeight: 34,
      title: "CAD 图纸在线预览",
      tip: "界面英文按钮已隐藏，当前仅保留图纸预览区域。",
    };
  }

  if (engine === "local3d") {
    return {
      iframeTop: 0,
      iframeHeightOffset: 0,
      topMaskHeight: 0,
      bottomMaskHeight: 0,
      title: "三维模型在线预览",
      tip: "当前为本地同源预览，优先兼容 STP / STEP，并自动测算模型包络尺寸。",
    };
  }

  if (engine === "pdf") {
    return {
      iframeTop: 0,
      iframeHeightOffset: 0,
      topMaskHeight: 0,
      bottomMaskHeight: 0,
      title: "PDF 在线预览",
      tip: "支持在当前窗口查看 PDF 图纸说明。",
    };
  }

  return {
    iframeTop: 0,
    iframeHeightOffset: 0,
    topMaskHeight: 0,
    bottomMaskHeight: 0,
    title: "在线预览",
    tip: "",
  };
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm text-right break-all">{children}</span>
    </div>
  );
}

export default function DrawingsPage() {
  const trpcAny = trpc as any;
  const { isAdmin, isDeptManager, departments } = usePermission();
  const { data: _dbData = [], refetch } = trpcAny.rdDrawings.list.useQuery();
  const { data: bomRows = [] } = trpcAny.bom.list.useQuery({});
  const createMutation = trpcAny.rdDrawings.create.useMutation({
    onSuccess: ({ docNo }: { docNo: string }) => {
      toast.success(`图纸已创建：${docNo}`);
      setCreateDialogOpen(false);
      setSelectedLocalFile(null);
      setFormData({
        productId: "",
        bomCode: "",
        bomVersion: "",
        name: "",
        category: "总装图",
        version: "V1.0",
        description: "",
        length: "",
        width: "",
        height: "",
        unit: "mm",
      });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "图纸创建失败");
    },
  });
  const updateMutation = trpcAny.rdDrawings.update.useMutation({
    onSuccess: () => {
      toast.success("图纸信息已更新");
      setCreateDialogOpen(false);
      setEditingDrawing(null);
      setSelectedLocalFile(null);
      setFormData({
        productId: "",
        bomCode: "",
        bomVersion: "",
        name: "",
        category: "总装图",
        version: "V1.0",
        description: "",
        length: "",
        width: "",
        height: "",
        unit: "mm",
      });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "图纸更新失败");
    },
  });
  const deleteMutation = trpcAny.rdDrawings.delete.useMutation({
    onSuccess: (result: { count?: number }) => {
      toast.success(`图纸已删除${result?.count ? `（${result.count}个文件）` : ""}`);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "图纸删除失败");
    },
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bomPickerOpen, setBomPickerOpen] = useState(false);
  const [editingDrawing, setEditingDrawing] = useState<DrawingRecord | null>(null);
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingRecord | null>(null);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [selectedLocalFile, setSelectedLocalFile] = useState<File | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [formData, setFormData] = useState({
    productId: "",
    bomCode: "",
    bomVersion: "",
    name: "",
    category: "总装图",
    version: "V1.0",
    description: "",
    length: "",
    width: "",
    height: "",
    unit: "mm",
  });

  const drawings: DrawingRecord[] = (_dbData as any[]).map((item: any): DrawingRecord => ({
    ...item,
    files: Array.isArray(item.files)
      ? item.files.map((file: any): DrawingFile => ({
          ...file,
          fileUrl: (() => {
            const raw = String(file.fileUrl || "");
            if (!raw) return "";
            if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
              return raw;
            }
            return `${window.location.origin}${raw}`;
          })(),
        }))
      : [],
  }));

  const filteredDrawings = useMemo(() => {
    return drawings.filter((item) => {
      const text = `${item.drawingNo} ${item.name} ${item.productName} ${item.owner} ${item.files
        .map((file) => file.format)
        .join(" ")}`.toLowerCase();
      const matchesSearch = text.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [drawings, searchTerm, statusFilter]);

  const totalFileCount = drawings.reduce((sum, item) => sum + item.files.length, 0);
  const previewableFileCount = drawings.flatMap((item) => item.files).filter(isPreviewable).length;
  const releasedCount = drawings.filter((item) => item.status === "released").length;
  const reviewCount = drawings.filter((item) => item.status === "review").length;
  const selectedCreateBom =
    (bomRows as any[]).find(
      (item: any) =>
        String(item.bomCode || "") === String(formData.bomCode || "") &&
        String(item.version || "") === String(formData.bomVersion || "")
    ) || null;
  const canManageDrawings = isAdmin || (isDeptManager && departments.includes("研发部"));

  const selectedFile =
    selectedDrawing?.files.find((file) => file.id === selectedFileId) ||
    selectedDrawing?.files[0] ||
    null;
  const previewUrl = selectedFile ? getPreviewUrl(selectedFile) : "";
  const previewEngine = selectedFile ? getPreviewEngine(selectedFile) : "";
  const previewProviderLabel = selectedFile ? getPreviewProviderLabel(selectedFile) : "";
  const previewFrameConfig = getPreviewFrameConfig(previewEngine);
  const selectedDimensions = selectedFile?.dimensions || null;
  const diagonal = selectedDimensions
    ? Math.sqrt(
        selectedDimensions.length ** 2 +
          selectedDimensions.width ** 2 +
          selectedDimensions.height ** 2,
      )
    : null;

  useEffect(() => {
    setPreviewError("");
  }, [selectedFileId, viewDialogOpen]);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsDataURL(file);
    });

  const validateDrawingFile = (file: File) => {
    const ext = `.${String(file.name.split(".").pop() || "").toLowerCase()}`;
    if (!DRAWING_FILE_ACCEPT.split(",").includes(ext)) {
      toast.error("当前仅支持 PDF、DWG、DXF、STP、STEP、IGS、IGES、STL、OBJ、GLB、GLTF、FBX、PLY、3DS、3MF 文件");
      return false;
    }
    return true;
  };

  const handleAdd = () => {
    setEditingDrawing(null);
    setSelectedLocalFile(null);
    setFormData({
      productId: "",
      bomCode: "",
      bomVersion: "",
      name: "",
      category: "总装图",
      version: "V1.0",
      description: "",
      length: "",
      width: "",
      height: "",
      unit: "mm",
    });
    setCreateDialogOpen(true);
  };

  const handleEdit = (drawing: DrawingRecord) => {
    setEditingDrawing(drawing);
    setSelectedLocalFile(null);
    setFormData({
      productId: String((drawing as any).productId || ""),
      bomCode: String(drawing.bomCode || ""),
      bomVersion: String(drawing.bomVersion || ""),
      name: drawing.name || "",
      category: drawing.category || "总装图",
      version: drawing.version || "V1.0",
      description: drawing.description || "",
      length: "",
      width: "",
      height: "",
      unit: "mm",
    });
    setCreateDialogOpen(true);
  };

  const handleDelete = async (drawing: DrawingRecord) => {
    const ids = Array.isArray(drawing.docIds) && drawing.docIds.length > 0 ? drawing.docIds : [drawing.id];
    const confirmed = window.confirm(
      `确定删除图纸“${drawing.name}”吗？这会一并删除该图纸下的 ${ids.length} 个文件记录。`
    );
    if (!confirmed) return;
    await deleteMutation.mutateAsync({ ids });
  };

  const handleView = (drawing: DrawingRecord) => {
    setSelectedDrawing(drawing);
    const firstPreviewableFile = drawing.files.find(isPreviewable) || drawing.files[0];
    setSelectedFileId(firstPreviewableFile?.id || "");
    setViewDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.productId || !formData.name) {
      toast.error(editingDrawing ? "请选择BOM并填写图纸名称" : "请选择BOM、填写图纸名称并上传文件");
      return;
    }
    try {
      if (editingDrawing) {
        const ids =
          Array.isArray(editingDrawing.docIds) && editingDrawing.docIds.length > 0
            ? editingDrawing.docIds
            : [editingDrawing.id];
        await updateMutation.mutateAsync({
          ids,
          productId: Number(formData.productId),
          bomCode: formData.bomCode || undefined,
          bomVersion: formData.bomVersion || undefined,
          name: formData.name,
          category: formData.category,
          version: formData.version,
          description: formData.description || undefined,
          length: formData.length ? Number(formData.length) : undefined,
          width: formData.width ? Number(formData.width) : undefined,
          height: formData.height ? Number(formData.height) : undefined,
          unit: formData.unit || "mm",
        });
        return;
      }

      if (!selectedLocalFile) {
        toast.error("请上传图纸文件");
        return;
      }
      if (!validateDrawingFile(selectedLocalFile)) {
        return;
      }
      const base64 = await fileToBase64(selectedLocalFile);
      await createMutation.mutateAsync({
        productId: Number(formData.productId),
        bomCode: formData.bomCode || undefined,
        bomVersion: formData.bomVersion || undefined,
        name: formData.name,
        category: formData.category,
        version: formData.version,
        description: formData.description || undefined,
        length: formData.length ? Number(formData.length) : undefined,
        width: formData.width ? Number(formData.width) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        unit: formData.unit || "mm",
        file: {
          name: selectedLocalFile.name,
          mimeType: selectedLocalFile.type || undefined,
          base64,
        },
      });
    } catch (error: any) {
      toast.error(error?.message || (editingDrawing ? "图纸更新失败" : "图纸上传失败"));
    }
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">图纸管理</h2>
              <p className="text-sm text-muted-foreground">
                研发图纸与知识库文件统一管理，新增图纸时绑定BOM并自动生成文件编号
              </p>
            </div>
          </div>
          {canManageDrawings && (
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              新增图纸
            </Button>
          )}
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">图纸总数</p>
              <p className="text-2xl font-bold">{drawings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已发布</p>
              <p className="text-2xl font-bold text-emerald-600">{releasedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">评审中</p>
              <p className="text-2xl font-bold text-amber-600">{reviewCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">可在线预览文件</p>
              <p className="text-2xl font-bold text-blue-600">
                {previewableFileCount}/{totalFileCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索图纸编号、图纸名称、产品名称、格式..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="review">评审中</SelectItem>
              <SelectItem value="released">已发布</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>图纸编号</TableHead>
                  <TableHead>图纸名称</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead>文件格式</TableHead>
                  <TableHead>更新人</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrawings.length > 0 ? (
                  filteredDrawings.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.drawingNo}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.version}</TableCell>
                      <TableCell>{item.files.map((file) => file.format).join(" / ")}</TableCell>
                      <TableCell>{item.owner}</TableCell>
                      <TableCell>{formatDateValue(item.updatedAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusMap[item.status].className}>
                          {statusMap[item.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleView(item)}>
                            <Eye className="h-4 w-4 mr-1" />
                            详情查看
                          </Button>
                          {canManageDrawings && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                                <Edit className="h-4 w-4 mr-1" />
                                编辑
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(item)}>
                                <Trash2 className="h-4 w-4 mr-1" />
                                删除
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      暂无匹配的图纸数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <DraggableDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setEditingDrawing(null);
          }
        }}
        defaultWidth={760}
        defaultHeight={720}
        printTitle={editingDrawing ? "编辑图纸" : "新增图纸"}
      >
        <DraggableDialogContent className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editingDrawing ? "编辑图纸" : "新增图纸"}</DialogTitle>
            <DialogDescription>
              {editingDrawing
                ? "修改当前图纸的BOM绑定和基础信息，分组下的所有格式文件会同步更新"
                : "选择BOM绑定图纸，上传文件后自动入知识库并生成文件编号"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>绑定BOM</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={
                    selectedCreateBom
                      ? `${selectedCreateBom.bomCode || ""} - ${selectedCreateBom.productCode || ""} - ${selectedCreateBom.productName || ""}${selectedCreateBom.productSpec ? ` / ${selectedCreateBom.productSpec}` : ""}${selectedCreateBom.version ? ` / ${selectedCreateBom.version}` : ""}`
                      : ""
                  }
                  placeholder="点击弹窗选择BOM"
                  className="flex-1 cursor-pointer"
                  onClick={() => setBomPickerOpen(true)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBomPickerOpen(true)}
                >
                  选择
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>图纸名称</Label>
              <Input
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="请输入图纸名称"
              />
            </div>

            <div className="space-y-2">
              <Label>图纸分类</Label>
              <Input
                value={formData.category}
                onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                placeholder="如：总装图 / 零件图 / 3D模型"
              />
            </div>

            <div className="space-y-2">
              <Label>版本号</Label>
              <Input
                value={formData.version}
                onChange={(event) => setFormData((prev) => ({ ...prev, version: event.target.value }))}
                placeholder="如：V1.0"
              />
            </div>

            <div className="space-y-2">
              <Label>参考长度</Label>
              <Input
                type="number"
                value={formData.length}
                onChange={(event) => setFormData((prev) => ({ ...prev, length: event.target.value }))}
                placeholder="长度"
              />
            </div>

            <div className="space-y-2">
              <Label>参考宽度</Label>
              <Input
                type="number"
                value={formData.width}
                onChange={(event) => setFormData((prev) => ({ ...prev, width: event.target.value }))}
                placeholder="宽度"
              />
            </div>

            <div className="space-y-2">
              <Label>参考高度</Label>
              <Input
                type="number"
                value={formData.height}
                onChange={(event) => setFormData((prev) => ({ ...prev, height: event.target.value }))}
                placeholder="高度"
              />
            </div>

            <div className="space-y-2">
              <Label>尺寸单位</Label>
              <Input
                value={formData.unit}
                onChange={(event) => setFormData((prev) => ({ ...prev, unit: event.target.value }))}
                placeholder="mm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>图纸说明</Label>
            <Textarea
              value={formData.description}
              onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="请输入图纸说明"
            />
          </div>

          {!editingDrawing && (
            <div className="space-y-2">
              <Label>上传文件</Label>
              <Input
                type="file"
                accept={DRAWING_FILE_ACCEPT}
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && !validateDrawingFile(file)) {
                    event.currentTarget.value = "";
                    setSelectedLocalFile(null);
                    return;
                  }
                  setSelectedLocalFile(file);
                  if (file && !formData.name) {
                    const fileName = file.name.replace(/\.[^.]+$/, "");
                    setFormData((prev) => ({ ...prev, name: fileName }));
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                当前支持 PDF、DWG、DXF、STP、STEP、IGS、IGES、STL、OBJ、GLB、GLTF、FBX、PLY、3DS、3MF 文件，上传后自动进入知识库
              </p>
              <p className="text-xs text-muted-foreground">
                {DRAWING_3D_PREFERRED_TEXT}
              </p>
              {selectedLocalFile && (
                <div className="rounded-lg border bg-muted/10 px-3 py-2 text-sm">
                  已选择：{selectedLocalFile.name}
                </div>
              )}
            </div>
          )}
          {editingDrawing && (
            <div className="rounded-lg border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
              当前编辑仅修改图纸基础信息和BOM绑定，不替换已上传文件。
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingDrawing ? "保存修改" : "保存图纸"}
            </Button>
          </div>
        </DraggableDialogContent>
      </DraggableDialog>

      <EntityPickerDialog
        open={bomPickerOpen}
        onOpenChange={setBomPickerOpen}
        title="选择绑定BOM"
        searchPlaceholder="搜索BOM编号、产品编码、产品名称、规格、产品分类、产品属性..."
        defaultWidth={980}
        defaultHeight={620}
        columns={[
          {
            key: "bomCode",
            title: "BOM编号",
            render: (bom) => (
              <span className="font-mono font-medium">{bom.bomCode || "-"}</span>
            ),
            className: "w-[160px]",
          },
          {
            key: "productCode",
            title: "产品编码",
            render: (bom) => (
              <span className="font-mono font-medium">{bom.productCode || "-"}</span>
            ),
            className: "w-[150px]",
          },
          {
            key: "productName",
            title: "产品名称",
            render: (bom) => (
              <span className="font-medium">{bom.productName || "-"}</span>
            ),
            className: "min-w-[220px]",
          },
          {
            key: "productSpec",
            title: "规格型号",
            render: (bom) => <span>{bom.productSpec || "-"}</span>,
            className: "w-[180px]",
          },
          {
            key: "productCategory",
            title: "产品分类",
            render: (bom) => <span>{bom.productCategory || "-"}</span>,
            className: "w-[120px]",
          },
          {
            key: "productType",
            title: "产品属性",
            render: (bom) => <span>{bom.productType || "-"}</span>,
            className: "w-[120px]",
          },
          {
            key: "version",
            title: "BOM版本",
            render: (bom) => <span>{bom.version || "-"}</span>,
            className: "w-[110px]",
          },
        ]}
        rows={bomRows as any[]}
        selectedId={selectedCreateBom ? `${selectedCreateBom.bomCode || ""}::${selectedCreateBom.version || ""}` : ""}
        getRowId={(bom) => `${bom.bomCode || ""}::${bom.version || ""}`}
        filterFn={(bom, q) => {
          const lower = q.toLowerCase();
          return (
            String(bom.bomCode || "").toLowerCase().includes(lower) ||
            String(bom.productCode || "").toLowerCase().includes(lower) ||
            String(bom.productName || "").toLowerCase().includes(lower) ||
            String(bom.productSpec || "").toLowerCase().includes(lower) ||
            String(bom.productCategory || "").toLowerCase().includes(lower) ||
            String(bom.productType || "")
              .toLowerCase()
              .includes(lower)
          );
        }}
        onSelect={(bom) => {
          setFormData((prev) => ({
            ...prev,
            productId: String(bom.productId || ""),
            bomCode: String(bom.bomCode || ""),
            bomVersion: String(bom.version || ""),
            name: prev.name || `${bom?.productName || ""}图纸`,
          }));
          setBomPickerOpen(false);
        }}
      />

      <DraggableDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        defaultWidth={1180}
        defaultHeight={760}
        printTitle={selectedDrawing ? `${selectedDrawing.name} 图纸详情` : "图纸详情"}
      >
        <DraggableDialogContent className="space-y-4">
          {selectedDrawing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {selectedDrawing.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedDrawing.drawingNo} · {selectedDrawing.productName} · 文件从知识库对应目录调取，
                  当前三维文件以 STP / STEP 为主，并兼容 DWG / DXF、IGES / IGS、STL、OBJ、FBX、GLB / GLTF、PDF 在线预览
                </DialogDescription>
              </DialogHeader>

              <div className="grid items-start gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <FieldRow label="图纸编号">{selectedDrawing.drawingNo}</FieldRow>
                      {(selectedDrawing.bomCode || selectedDrawing.bomVersion) && (
                        <FieldRow label="绑定BOM">
                          {selectedDrawing.bomCode || "-"}
                          {selectedDrawing.bomVersion ? ` / ${selectedDrawing.bomVersion}` : ""}
                        </FieldRow>
                      )}
                      <FieldRow label="产品名称">{selectedDrawing.productName}</FieldRow>
                      <FieldRow label="图纸分类">{selectedDrawing.category}</FieldRow>
                      <FieldRow label="版本">{selectedDrawing.version}</FieldRow>
                      <FieldRow label="负责人">{selectedDrawing.owner}</FieldRow>
                      <FieldRow label="更新时间">{formatDateValue(selectedDrawing.updatedAt)}</FieldRow>
                      <FieldRow label="状态">
                        <Badge variant="outline" className={statusMap[selectedDrawing.status].className}>
                          {statusMap[selectedDrawing.status].label}
                        </Badge>
                      </FieldRow>
                      <FieldRow label="说明">{selectedDrawing.description}</FieldRow>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">文件列表</h3>
                        <span className="text-xs text-muted-foreground">{selectedDrawing.files.length} 个文件</span>
                      </div>
                      <div className="space-y-2">
                        {selectedDrawing.files.map((file) => (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() => setSelectedFileId(file.id)}
                            className={cn(
                              "w-full rounded-lg border p-3 text-left transition-colors",
                              selectedFileId === file.id
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium break-all">{file.name}</span>
                              <Badge variant="outline">{file.format}</Badge>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span>{file.version}</span>
                              <span>{file.size}</span>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">{file.note}</p>
                            <div className="mt-2 flex items-center gap-2">
                              {isPreviewable(file) && (
                                <Badge variant="outline" className="text-blue-600 border-blue-200">
                                  支持在线预览
                                </Badge>
                              )}
                              {!isPreviewable(file) && (
                                <Badge variant="outline" className="text-muted-foreground">
                                  暂不支持
                                </Badge>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium">在线预览</h3>
                        <p className="text-xs text-muted-foreground">
                          {selectedFile
                            ? `${selectedFile.name} · ${selectedFile.format} · ${previewProviderLabel}`
                            : "请选择左侧文件进行预览"}
                        </p>
                      </div>
                      {selectedFile && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(selectedFile.fileUrl, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          打开源文件
                        </Button>
                      )}
                    </div>

                    {selectedFile && previewUrl ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border bg-muted/10 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-blue-200 text-blue-600 bg-white">
                              {previewFrameConfig.title}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {previewFrameConfig.tip || "当前文件支持在线预览"}
                            </span>
                          </div>
                        </div>
                        {selectedDimensions && (
                          <div className="grid gap-3 md:grid-cols-4">
                            <div className="rounded-lg border bg-muted/10 p-3">
                              <p className="text-xs text-muted-foreground">登记长度</p>
                              <p className="text-sm font-medium">{formatDisplayNumber(selectedDimensions.length)} {selectedDimensions.unit}</p>
                            </div>
                            <div className="rounded-lg border bg-muted/10 p-3">
                              <p className="text-xs text-muted-foreground">登记宽度</p>
                              <p className="text-sm font-medium">{formatDisplayNumber(selectedDimensions.width)} {selectedDimensions.unit}</p>
                            </div>
                            <div className="rounded-lg border bg-muted/10 p-3">
                              <p className="text-xs text-muted-foreground">登记高度</p>
                              <p className="text-sm font-medium">{formatDisplayNumber(selectedDimensions.height)} {selectedDimensions.unit}</p>
                            </div>
                            <div className="rounded-lg border bg-muted/10 p-3">
                              <p className="text-xs text-muted-foreground">登记对角尺寸</p>
                              <p className="text-sm font-medium">{diagonal != null ? formatDisplayNumber(diagonal) : "-"} {selectedDimensions.unit}</p>
                            </div>
                          </div>
                        )}
                        <div className="relative h-[560px] rounded-lg border overflow-hidden bg-muted/20">
                          <iframe
                            key={selectedFile.id}
                            title={selectedFile.name}
                            src={previewUrl}
                            className="absolute left-0 w-full bg-white"
                            style={{
                              top: `${previewFrameConfig.iframeTop}px`,
                              height: `calc(100% + ${previewFrameConfig.iframeHeightOffset}px)`,
                            }}
                            allowFullScreen
                            onError={() => {
                              if (previewEngine === "local3d") {
                                setPreviewError("三维文件预览失败，请优先使用标准 STP / STEP 文件，或点击“打开源文件”查看。");
                                return;
                              }
                              if (previewEngine === "sharecad") {
                                setPreviewError("CAD 图纸预览失败，请点击“打开源文件”查看原始图纸。");
                                return;
                              }
                              if (previewEngine === "pdf") {
                                setPreviewError("PDF 预览失败，请点击“打开源文件”重新打开 PDF。");
                              }
                            }}
                          />
                          {previewFrameConfig.topMaskHeight > 0 && (
                            <div
                              className="pointer-events-none absolute inset-x-0 top-0 bg-white"
                              style={{ height: `${previewFrameConfig.topMaskHeight}px` }}
                            />
                          )}
                          {previewFrameConfig.bottomMaskHeight > 0 && (
                            <div
                              className="pointer-events-none absolute inset-x-0 bottom-0 bg-white"
                              style={{ height: `${previewFrameConfig.bottomMaskHeight}px` }}
                            />
                          )}
                          {previewError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/90 px-6 text-center">
                              <div className="space-y-3">
                                <p className="text-sm font-medium text-destructive">{previewError}</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(selectedFile.fileUrl, "_blank", "noopener,noreferrer")}
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  打开源文件
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-[560px] rounded-lg border border-dashed flex items-center justify-center bg-muted/10">
                        <div className="text-center space-y-2 px-6">
                          <Box className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm font-medium">当前文件暂不支持在线预览</p>
                          <p className="text-xs text-muted-foreground">
                            可直接点击“打开源文件”查看原始文件，或切换到支持的 CAD/3D 格式。
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DraggableDialogContent>
      </DraggableDialog>
    </ERPLayout>
  );
}
