import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import RaLayout from "@/components/RaLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck, Plus, Search, MoreHorizontal, Edit, Trash2,
  Landmark, FileText, CheckCircle2, Clock, Send, Archive,
} from "lucide-react";
import { toast } from "sonner";
import {
  STATUS_LABELS, STATUS_COLORS, type RaProjectStatus,
} from "@/data/ra/types";
import { formatDateValue } from "@/lib/formatters";

const STATUS_ICONS: Record<RaProjectStatus, React.ReactNode> = {
  planning: <Clock className="w-3 h-3" />,
  in_progress: <FileText className="w-3 h-3" />,
  submitted: <Send className="w-3 h-3" />,
  approved: <CheckCircle2 className="w-3 h-3" />,
  archived: <Archive className="w-3 h-3" />,
};

export default function CnNmpaPage() {
  const [, navigate] = useLocation();
  const { data: projects = [], isLoading, refetch } = trpc.ra.projects.list.useQuery();
  const createMutation = trpc.ra.projects.create.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success("CN NMPA 项目已创建");
      setDialogOpen(false);
      navigate(`/ra/workspace/${(data as any).id}`);
    },
  });
  const updateMutation = trpc.ra.projects.update.useMutation({
    onSuccess: () => { refetch(); toast.success("更新成功"); setDialogOpen(false); },
  });
  const deleteMutation = trpc.ra.projects.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("已删除"); },
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  const allProjects = (projects as any[]).filter((p) => p.market === "CN_NMPA");
  const filtered = allProjects.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const countByStatus = (s: string) => allProjects.filter((p) => p.status === s).length;

  const handleAdd = () => { setEditingId(null); setFormData({ name: "" }); setDialogOpen(true); };
  const handleEdit = (p: any) => { setEditingId(p.id); setFormData({ name: p.name }); setDialogOpen(true); };
  const handleSubmit = () => {
    if (!formData.name.trim()) { toast.error("请填写项目名称"); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, name: formData.name, market: "CN_NMPA" });
    } else {
      createMutation.mutate({ name: formData.name, market: "CN_NMPA" });
    }
  };
  const handleDelete = (p: any) => {
    if (!confirm(`确认删除项目「${p.name}」？`)) return;
    deleteMutation.mutate({ id: p.id });
  };

  return (
    <RaLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">CN NMPA 申报项目</h2>
              <p className="text-sm text-muted-foreground">
                国家药品监督管理局 · 医疗器械注册申报管理
              </p>
            </div>
          </div>
          <Button onClick={handleAdd} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-1" />
            新建申报项目
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          {[
            { label: "项目总数", value: allProjects.length, color: "" },
            { label: "规划中", value: countByStatus("planning"), color: "text-gray-600" },
            { label: "进行中", value: countByStatus("in_progress"), color: "text-green-600" },
            { label: "已提交", value: countByStatus("submitted"), color: "text-amber-600" },
            { label: "已获批", value: countByStatus("approved"), color: "text-green-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索项目名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="border rounded-md px-3 py-2 text-sm bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="planning">规划中</option>
            <option value="in_progress">进行中</option>
            <option value="submitted">已提交</option>
            <option value="approved">已获批</option>
            <option value="archived">已归档</option>
          </select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目名称</TableHead>
                  <TableHead>当前阶段</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">加载中...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShieldCheck className="h-10 w-10 opacity-20" />
                        <p className="text-sm">暂无 CN NMPA 申报项目</p>
                        <Button variant="outline" size="sm" onClick={handleAdd}>
                          <Plus className="h-3 w-3 mr-1" />新建第一个项目
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p: any) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/ra/workspace/${p.id}`)}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Step {p.currentStep}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${STATUS_COLORS[p.status as RaProjectStatus] || ""}`}>
                          {STATUS_ICONS[p.status as RaProjectStatus]}
                          {STATUS_LABELS[p.status as RaProjectStatus] || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateValue(p.updatedAt)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/ra/workspace/${p.id}`)}>
                              <FileText className="h-4 w-4 mr-2" />进入工作台
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(p)}>
                              <Edit className="h-4 w-4 mr-2" />编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p)}>
                              <Trash2 className="h-4 w-4 mr-2" />删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑项目" : "新建 CN NMPA 申报项目"}</DialogTitle>
            <DialogDescription>创建国家药品监督管理局医疗器械注册申报项目</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>项目名称</Label>
              <Input
                placeholder="例：XX型医疗器械注册申报"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-green-600 hover:bg-green-700">
              {editingId ? "保存" : "创建项目"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RaLayout>
  );
}
