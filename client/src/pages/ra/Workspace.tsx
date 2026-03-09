import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft, ShieldCheck, FileText, ChevronRight, ChevronDown,
  Sparkles, Loader2, CheckCircle2, Clock, PenLine, Bot,
  Globe, Save, AlertCircle, FolderOpen, Folder, ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { mdrDocumentTemplates, getAllDocuments } from "@/data/ra/mdrTemplates";
import {
  MARKET_LABELS, STATUS_LABELS, STATUS_COLORS,
  type RaProjectData, type DocumentDefinition, type DocumentSection, type DocumentId,
} from "@/data/ra/types";

export default function RaWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, navigate] = useLocation();

  const { data: projectRaw, isLoading, refetch } = trpc.ra.projects.get.useQuery({ id: projectId });
  const updateMutation = trpc.ra.projects.update.useMutation();
  const generateMutation = trpc.ra.ai.generateContent.useMutation({
    onSuccess: (data, variables) => {
      updateSection(variables.documentId as DocumentId, variables.sectionId, {
        content: data.content,
        aiGenerated: true,
        userEdited: false,
      });
      toast.success("AI 内容已生成");
    },
    onError: () => toast.error("AI 生成失败，请重试"),
  });

  const project = projectRaw as RaProjectData | null | undefined;

  // 本地文档状态
  const [documents, setDocuments] = useState<DocumentDefinition[]>([]);
  const [activeDocId, setActiveDocId] = useState<DocumentId | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(["section_01"]));
  // 文件夹视图状态：null=显示所有文件夹，string=进入某个section
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // 初始化文档
  useEffect(() => {
    if (!project) return;
    if (project.documents && (project.documents as any[]).length > 0) {
      setDocuments(project.documents as DocumentDefinition[]);
    } else {
      // 首次进入，使用模板初始化
      const initDocs = getAllDocuments();
      setDocuments(initDocs);
      // 自动保存初始化数据
      updateMutation.mutate({ id: projectId, documents: initDocs, currentStep: 3 });
    }
    if (project.activeDocumentId) {
      setActiveDocId(project.activeDocumentId as DocumentId);
    } else {
      setActiveDocId("device_description");
    }
  }, [project?.id]);

  // 自动保存
  const autoSave = useCallback((docs: DocumentDefinition[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateMutation.mutate({ id: projectId, documents: docs });
    }, 2000);
  }, [projectId]);

  const updateSection = (docId: DocumentId, sectionId: string, update: Partial<DocumentSection>) => {
    setDocuments((prev) => {
      const next = prev.map((doc) => {
        if (doc.id !== docId) return doc;
        return {
          ...doc,
          sections: doc.sections.map((sec) =>
            sec.id === sectionId
              ? { ...sec, ...update, lastModified: Date.now() }
              : sec
          ),
        };
      });
      autoSave(next);
      return next;
    });
  };

  const activeDoc = documents.find((d) => d.id === activeDocId);

  const getSectionStatus = (sec: DocumentSection) => {
    if (sec.aiGenerated && !sec.userEdited) return "ai";
    if (sec.userEdited) return "edited";
    if (sec.content) return "filled";
    return "empty";
  };

  const getDocProgress = (doc: DocumentDefinition) => {
    const filled = doc.sections.filter((s) => s.content.trim()).length;
    return Math.round((filled / doc.sections.length) * 100);
  };

  const handleGenerateSection = (sec: DocumentSection) => {
    if (!activeDoc) return;
    generateMutation.mutate({
      projectId,
      documentId: activeDoc.id,
      sectionId: sec.id,
      sectionTitle: sec.title,
      sectionTitleEn: sec.titleEn,
      productData: project?.productData,
      classification: project?.classification,
      technicalChars: project?.technicalChars,
      existingContent: sec.content || undefined,
    });
  };

  const handleGenerateAll = async () => {
    if (!activeDoc) return;
    const emptySections = activeDoc.sections.filter((s) => !s.content.trim());
    if (emptySections.length === 0) {
      toast.info("所有章节已有内容");
      return;
    }
    toast.info(`正在为 ${emptySections.length} 个章节生成内容...`);
    for (const sec of emptySections) {
      try {
        await generateMutation.mutateAsync({
          projectId,
          documentId: activeDoc.id,
          sectionId: sec.id,
          sectionTitle: sec.title,
          sectionTitleEn: sec.titleEn,
          productData: project?.productData,
          classification: project?.classification,
          technicalChars: project?.technicalChars,
        });
      } catch {}
    }
    toast.success("批量生成完成");
  };

  if (isLoading) {
    return (
      <ERPLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          加载项目数据...
        </div>
      </ERPLayout>
    );
  }

  if (!project) {
    return (
      <ERPLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <AlertCircle className="w-10 h-10 opacity-30" />
          <p>项目不存在或无权访问</p>
          <Button variant="outline" onClick={() => navigate("/ra/projects")}>返回项目列表</Button>
        </div>
      </ERPLayout>
    );
  }

  const totalSections = documents.reduce((s, d) => s + d.sections.length, 0);
  const filledSections = documents.reduce((s, d) => s + d.sections.filter((sec) => sec.content.trim()).length, 0);
  const overallProgress = totalSections > 0 ? Math.round((filledSections / totalSections) * 100) : 0;

  return (
    <ERPLayout>
      <div className="space-y-4">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/ra/projects")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">{project.name}</h2>
              <Badge
                variant="outline"
                className={`text-xs ${STATUS_COLORS[project.status] || ""}`}
              >
                {STATUS_LABELS[project.status] || project.status}
              </Badge>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                <Globe className="w-3 h-3 mr-1" />
                {MARKET_LABELS[project.market] || project.market}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {updateMutation.isPending && (
              <span className="flex items-center gap-1 text-xs animate-pulse">
                <Save className="w-3 h-3" />
                保存中...
              </span>
            )}
            <span className="text-xs">
              完成度 <strong className="text-foreground">{overallProgress}%</strong>
              （{filledSections}/{totalSections} 章节）
            </span>
          </div>
        </div>

        {/* 主体：左侧文档树 + 右侧编辑器 */}
        <div className="flex gap-4 h-[calc(100vh-200px)]">
          {/* 左侧：文件夹风格文档结构 */}
          <Card className="w-72 shrink-0 flex flex-col">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {activeSectionId ? (
                  <button
                    onClick={() => setActiveSectionId(null)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    返回
                  </button>
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4 text-primary" />
                    技术文件结构
                  </>
                )}
              </CardTitle>
              {activeSectionId && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {mdrDocumentTemplates.find((m) => m.id === activeSectionId)?.title}
                </p>
              )}
            </CardHeader>
            <ScrollArea className="flex-1">
              {!activeSectionId ? (
                /* 第一层：8个部分文件夹图标 */
                <div className="p-3 grid grid-cols-2 gap-2">
                  {mdrDocumentTemplates.map((module, idx) => {
                    const sectionDocs = module.documents;
                    const totalSecs = sectionDocs.reduce((s, d) => {
                      const localDoc = documents.find((dd) => dd.id === d.id);
                      return s + (localDoc?.sections.length || 0);
                    }, 0);
                    const filledSecs = sectionDocs.reduce((s, d) => {
                      const localDoc = documents.find((dd) => dd.id === d.id);
                      return s + (localDoc?.sections.filter((sec) => sec.content.trim()).length || 0);
                    }, 0);
                    const pct = totalSecs > 0 ? Math.round((filledSecs / totalSecs) * 100) : 0;
                    return (
                      <button
                        key={module.id}
                        onClick={() => {
                          setActiveSectionId(module.id);
                          // 自动选中该部分第一个文档
                          if (module.documents.length > 0) {
                            setActiveDocId(module.documents[0].id as DocumentId);
                            setEditingSectionId(null);
                          }
                        }}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-amber-50 hover:border-amber-200 border border-transparent transition-all group"
                      >
                        <div className="relative">
                          {pct > 0 ? (
                            <FolderOpen className="w-10 h-10 text-amber-400 group-hover:text-amber-500 transition-colors" />
                          ) : (
                            <Folder className="w-10 h-10 text-amber-400 group-hover:text-amber-500 transition-colors" />
                          )}
                          {pct > 0 && (
                            <span className="absolute -bottom-0.5 -right-1 text-[9px] bg-green-500 text-white rounded-full px-1 leading-tight">
                              {pct}%
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-center text-gray-600 leading-tight line-clamp-2 w-full">
                          第{idx + 1}部分
                        </span>
                        <span className="text-[9px] text-gray-400">{sectionDocs.length}个文件</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* 第二层：该部分下的文档列表 */
                <div className="p-2 space-y-0.5">
                  {mdrDocumentTemplates
                    .find((m) => m.id === activeSectionId)
                    ?.documents.map((doc) => {
                      const localDoc = documents.find((d) => d.id === doc.id);
                      const progress = localDoc ? getDocProgress(localDoc) : 0;
                      const isActive = activeDocId === doc.id;
                      return (
                        <button
                          key={doc.id}
                          onClick={() => {
                            setActiveDocId(doc.id as DocumentId);
                            setEditingSectionId(null);
                            updateMutation.mutate({ id: projectId, activeDocumentId: doc.id });
                          }}
                          className={`flex items-center gap-2 w-full px-2 py-2 rounded-md text-left transition-colors text-xs
                            ${isActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted text-foreground"
                            }`}
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="flex-1 truncate">{doc.title}</span>
                          {progress > 0 && (
                            <span className={`text-[10px] shrink-0 ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {progress}%
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* 右侧：文档编辑器 */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            {activeDoc ? (
              <>
                <CardHeader className="py-3 px-4 border-b shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{activeDoc.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeDoc.titleEn} · {activeDoc.annexReference}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                        <TabsList className="h-8">
                          <TabsTrigger value="edit" className="text-xs px-3 h-6">编辑</TabsTrigger>
                          <TabsTrigger value="preview" className="text-xs px-3 h-6">预览</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateAll}
                        disabled={generateMutation.isPending}
                        className="h-8 text-xs"
                      >
                        {generateMutation.isPending ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3 mr-1" />
                        )}
                        AI 批量生成
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {activeDoc.sections.map((sec) => {
                      const localDoc = documents.find((d) => d.id === activeDoc.id);
                      const localSec = localDoc?.sections.find((s) => s.id === sec.id) || sec;
                      const status = getSectionStatus(localSec);
                      const isEditing = editingSectionId === sec.id;

                      return (
                        <div key={sec.id} className="border rounded-lg overflow-hidden">
                          {/* 章节标题栏 */}
                          <div
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer
                              ${isEditing ? "bg-primary/5 border-b" : "bg-muted/30 hover:bg-muted/50"}`}
                            onClick={() => setEditingSectionId(isEditing ? null : sec.id)}
                          >
                            <div className="flex items-center gap-2">
                              {status === "ai" && <Bot className="w-3.5 h-3.5 text-blue-500" />}
                              {status === "edited" && <PenLine className="w-3.5 h-3.5 text-green-500" />}
                              {status === "filled" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                              {status === "empty" && <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                              <span className="text-sm font-medium">{sec.title}</span>
                              <span className="text-xs text-muted-foreground hidden md:inline">
                                {sec.titleEn}
                              </span>
                              {status === "ai" && (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 h-4">
                                  AI 生成
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={generateMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateSection(sec);
                                }}
                              >
                                {generateMutation.isPending && generateMutation.variables?.sectionId === sec.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3 text-primary" />
                                )}
                              </Button>
                              {isEditing ? (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* 章节内容 */}
                          {isEditing && (
                            <div className="p-3">
                              {activeTab === "edit" ? (
                                <Textarea
                                  className="min-h-[120px] text-sm resize-none"
                                  placeholder={`请填写「${sec.title}」的内容，或点击右上角 ✨ 使用 AI 生成...`}
                                  value={localSec.content}
                                  onChange={(e) => {
                                    updateSection(activeDoc.id, sec.id, {
                                      content: e.target.value,
                                      userEdited: true,
                                      aiGenerated: false,
                                    });
                                  }}
                                />
                              ) : (
                                <div className="min-h-[80px] text-sm whitespace-pre-wrap p-2 bg-muted/30 rounded">
                                  {localSec.content || (
                                    <span className="text-muted-foreground italic">暂无内容</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 折叠时显示内容预览 */}
                          {!isEditing && localSec.content && (
                            <div className="px-3 py-2 text-xs text-muted-foreground line-clamp-2 bg-white">
                              {localSec.content}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">请从左侧选择一份文件开始编辑</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ERPLayout>
  );
}
