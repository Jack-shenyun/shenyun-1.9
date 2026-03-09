import { useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BookOpen, Search, ChevronDown, ChevronRight, FileText,
  CheckCircle2, Layers, Hash,
} from "lucide-react";
import { mdrDocumentTemplates, MDR_STATS } from "@/data/ra/mdrTemplates";

const MODULE_COLORS = [
  "bg-blue-50 border-blue-200 text-blue-700",
  "bg-purple-50 border-purple-200 text-purple-700",
  "bg-green-50 border-green-200 text-green-700",
  "bg-amber-50 border-amber-200 text-amber-700",
  "bg-red-50 border-red-200 text-red-700",
  "bg-cyan-50 border-cyan-200 text-cyan-700",
  "bg-pink-50 border-pink-200 text-pink-700",
  "bg-indigo-50 border-indigo-200 text-indigo-700",
];

export default function RaTemplatesPage() {
  const [search, setSearch] = useState("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(["section_01"]));
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDoc = (id: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = mdrDocumentTemplates.map((module) => ({
    ...module,
    documents: module.documents.filter((doc) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.titleEn.toLowerCase().includes(q) ||
        doc.sections.some((s) => s.title.toLowerCase().includes(q) || s.titleEn.toLowerCase().includes(q))
      );
    }),
  })).filter((m) => m.documents.length > 0);

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">文件模板库</h2>
            <p className="text-sm text-muted-foreground">
              MDR (EU) 2017/745 技术文件完整框架 · {MDR_STATS.sections} 大类 · {MDR_STATS.documents} 份文件 · {MDR_STATS.totalSections} 个章节
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Layers className="h-8 w-8 text-primary opacity-30" />
              <div>
                <p className="text-sm text-muted-foreground">文件大类</p>
                <p className="text-2xl font-bold">{MDR_STATS.sections}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-400 opacity-50" />
              <div>
                <p className="text-sm text-muted-foreground">文件总数</p>
                <p className="text-2xl font-bold">{MDR_STATS.documents}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Hash className="h-8 w-8 text-green-400 opacity-50" />
              <div>
                <p className="text-sm text-muted-foreground">章节总数</p>
                <p className="text-2xl font-bold">{MDR_STATS.totalSections}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索 */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索文件名称、章节名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* 文件模板列表 */}
        <div className="space-y-3">
          {filtered.map((module, idx) => (
            <Card key={module.id}>
              <Collapsible
                open={expandedModules.has(module.id)}
                onOpenChange={() => toggleModule(module.id)}
              >
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-3 px-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`text-xs font-mono ${MODULE_COLORS[idx % MODULE_COLORS.length]}`}
                        >
                          {module.id.replace("section_0", "Part ")}
                        </Badge>
                        <div className="text-left">
                          <CardTitle className="text-sm font-medium">{module.title}</CardTitle>
                          <p className="text-xs text-muted-foreground font-normal">{module.titleEn}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {module.documents.length} 份文件 ·{" "}
                          {module.documents.reduce((s, d) => s + d.sections.length, 0)} 个章节
                        </span>
                        {expandedModules.has(module.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-3 px-4 space-y-2">
                    {module.documents.map((doc) => (
                      <div key={doc.id} className="border rounded-lg overflow-hidden">
                        <Collapsible
                          open={expandedDocs.has(doc.id)}
                          onOpenChange={() => toggleDoc(doc.id)}
                        >
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <div className="text-left">
                                  <p className="text-sm font-medium">{doc.title}</p>
                                  <p className="text-xs text-muted-foreground">{doc.titleEn}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  {doc.sections.length} 章节
                                </Badge>
                                <span className="text-xs text-muted-foreground hidden md:inline">
                                  {doc.annexReference}
                                </span>
                                {expandedDocs.has(doc.id) ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t bg-muted/20 px-3 py-2 space-y-1">
                              {doc.sections.map((sec, secIdx) => (
                                <div
                                  key={sec.id}
                                  className="flex items-center gap-2 py-1 px-2 rounded hover:bg-background/80"
                                >
                                  <span className="text-xs text-muted-foreground w-5 shrink-0">
                                    {secIdx + 1}.
                                  </span>
                                  <CheckCircle2 className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                                  <span className="text-xs flex-1">{sec.title}</span>
                                  <span className="text-xs text-muted-foreground hidden md:inline">
                                    {sec.titleEn}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </div>
    </ERPLayout>
  );
}
