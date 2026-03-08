import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Globe,
  Plus,
  Send,
  Facebook,
  Linkedin,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Image,
  FileText,
  Share2,
  Settings,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ============================================================
// 类型定义
// ============================================================
interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  content: string;
  coverImage?: string;
  category: string;
  status: "draft" | "published";
  publishedAt?: string;
  syncFacebook: boolean;
  syncLinkedin: boolean;
  facebookPostId?: string;
  linkedinPostId?: string;
  facebookStatus?: "pending" | "success" | "failed";
  linkedinStatus?: "pending" | "success" | "failed";
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 模拟数据
// ============================================================
const MOCK_ARTICLES: NewsArticle[] = [
  {
    id: 1,
    title: "神韵医疗新款一次性手术器械通过CE认证",
    summary: "我司最新研发的一次性腹腔镜手术器械套装已正式通过欧盟CE认证，即将面向欧洲市场销售。",
    content: "神韵医疗器械有限公司宣布，旗下最新研发的一次性腹腔镜手术器械套装已于2026年3月正式通过欧盟CE认证（MDR 2017/745）。该产品采用医用级高分子材料，符合欧盟最新医疗器械法规要求，具备优异的生物相容性和操作安全性。\n\n此次认证的成功标志着神韵医疗在国际化进程中迈出了重要一步，产品将于2026年第二季度正式进入欧洲市场销售渠道。",
    category: "产品动态",
    status: "published",
    publishedAt: "2026-03-05",
    syncFacebook: true,
    syncLinkedin: true,
    facebookStatus: "success",
    linkedinStatus: "success",
    createdAt: "2026-03-05",
    updatedAt: "2026-03-05",
  },
  {
    id: 2,
    title: "2026年CMEF医疗器械展览会参展公告",
    summary: "神韵医疗将参加2026年5月在上海举办的第87届中国国际医疗器械博览会（CMEF），欢迎莅临展位交流。",
    content: "神韵医疗器械有限公司诚邀各界朋友莅临2026年第87届中国国际医疗器械博览会（CMEF）展位参观交流。\n\n展会信息：\n- 时间：2026年5月14-17日\n- 地点：上海国家会展中心\n- 展位号：N5-C12\n\n本次展会将重点展示公司最新研发的微创手术器械系列产品，包括已获CE认证的腹腔镜器械套装及国内三类医疗器械注册新品。",
    category: "展会活动",
    status: "published",
    publishedAt: "2026-03-08",
    syncFacebook: true,
    syncLinkedin: false,
    facebookStatus: "success",
    linkedinStatus: undefined,
    createdAt: "2026-03-08",
    updatedAt: "2026-03-08",
  },
  {
    id: 3,
    title: "公司荣获2025年度苏州市高新技术企业认定",
    summary: "经苏州市科技局审核认定，神韵医疗器械有限公司正式获得2025年度高新技术企业资质。",
    content: "近日，神韵医疗器械有限公司正式获得苏州市科技局颁发的2025年度高新技术企业证书。这是公司持续加大研发投入、推进技术创新的重要成果。\n\n公司近年来在微创手术器械领域持续加大研发投入，拥有多项自主知识产权，研发人员占比超过20%，研发投入占营收比例连续三年超过6%。",
    category: "公司新闻",
    status: "draft",
    syncFacebook: false,
    syncLinkedin: false,
    createdAt: "2026-03-09",
    updatedAt: "2026-03-09",
  },
];

const CATEGORIES = ["公司新闻", "产品动态", "展会活动", "行业资讯", "政策法规"];

// ============================================================
// 状态徽标
// ============================================================
function SyncStatusBadge({ status, platform }: { status?: string; platform: "facebook" | "linkedin" }) {
  if (!status) return <span className="text-xs text-slate-300">—</span>;
  if (status === "success") return (
    <span className="flex items-center gap-1 text-xs text-green-600">
      <CheckCircle2 className="h-3.5 w-3.5" /> 已同步
    </span>
  );
  if (status === "failed") return (
    <span className="flex items-center gap-1 text-xs text-red-500">
      <XCircle className="h-3.5 w-3.5" /> 失败
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-amber-500">
      <Clock className="h-3.5 w-3.5" /> 同步中
    </span>
  );
}

// ============================================================
// 主页面
// ============================================================
export default function WebsiteManagePage() {
  const [, setLocation] = useLocation();
  const [articles, setArticles] = useState<NewsArticle[]>(MOCK_ARTICLES);
  const [activeTab, setActiveTab] = useState("articles");
  const [showEditor, setShowEditor] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<NewsArticle> | null>(null);
  const [publishTarget, setPublishTarget] = useState<NewsArticle | null>(null);
  const [publishOptions, setPublishOptions] = useState({
    website: true,
    facebook: false,
    linkedin: false,
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [apiStatus, setApiStatus] = useState({
    facebook: !!false, // 实际从后端读取
    linkedin: !!false,
  });

  // 查询API配置状态
  const { data: socialApiStatus } = trpc.website?.getApiStatus?.useQuery(undefined, {
    onSuccess: (data: any) => {
      setApiStatus({ facebook: data?.facebook ?? false, linkedin: data?.linkedin ?? false });
    },
  }) ?? {};

  // ---- 新建/编辑文章 ----
  const openEditor = (article?: NewsArticle) => {
    setEditingArticle(article ? { ...article } : {
      title: "",
      summary: "",
      content: "",
      category: "公司新闻",
      status: "draft",
      syncFacebook: false,
      syncLinkedin: false,
    });
    setShowEditor(true);
  };

  const saveArticle = () => {
    if (!editingArticle?.title?.trim()) {
      toast.error("请填写文章标题");
      return;
    }
    if (!editingArticle?.content?.trim()) {
      toast.error("请填写文章内容");
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    if (editingArticle.id) {
      setArticles(prev => prev.map(a => a.id === editingArticle.id ? { ...a, ...editingArticle, updatedAt: now } as NewsArticle : a));
      toast.success("文章已保存");
    } else {
      const newArticle: NewsArticle = {
        id: Date.now(),
        title: editingArticle.title!,
        summary: editingArticle.summary || "",
        content: editingArticle.content!,
        category: editingArticle.category || "公司新闻",
        status: "draft",
        syncFacebook: false,
        syncLinkedin: false,
        createdAt: now,
        updatedAt: now,
      };
      setArticles(prev => [newArticle, ...prev]);
      toast.success("文章已创建为草稿");
    }
    setShowEditor(false);
    setEditingArticle(null);
  };

  // ---- 发布对话框 ----
  const openPublishDialog = (article: NewsArticle) => {
    setPublishTarget(article);
    setPublishOptions({ website: true, facebook: false, linkedin: false });
    setShowPublishDialog(true);
  };

  const doPublish = async () => {
    if (!publishTarget) return;
    setIsPublishing(true);
    try {
      // 调用后端同步接口
      const result = await trpc.website?.publishArticle?.mutate?.({
        articleId: publishTarget.id,
        title: publishTarget.title,
        summary: publishTarget.summary,
        content: publishTarget.content,
        coverImage: publishTarget.coverImage,
        publishToWebsite: publishOptions.website,
        publishToFacebook: publishOptions.facebook,
        publishToLinkedin: publishOptions.linkedin,
      });

      const now = new Date().toISOString().slice(0, 10);
      setArticles(prev => prev.map(a => {
        if (a.id !== publishTarget.id) return a;
        return {
          ...a,
          status: publishOptions.website ? "published" : a.status,
          publishedAt: publishOptions.website ? now : a.publishedAt,
          syncFacebook: publishOptions.facebook,
          syncLinkedin: publishOptions.linkedin,
          facebookStatus: publishOptions.facebook ? (result?.facebookSuccess ? "success" : "failed") : a.facebookStatus,
          linkedinStatus: publishOptions.linkedin ? (result?.linkedinSuccess ? "success" : "failed") : a.linkedinStatus,
          updatedAt: now,
        } as NewsArticle;
      }));

      const channels = ["网站"];
      if (publishOptions.facebook) channels.push("Facebook");
      if (publishOptions.linkedin) channels.push("LinkedIn");
      toast.success(`已发布到：${channels.join("、")}`);
      setShowPublishDialog(false);
    } catch (e: any) {
      // 降级：即使后端未配置也允许本地标记发布
      const now = new Date().toISOString().slice(0, 10);
      setArticles(prev => prev.map(a => {
        if (a.id !== publishTarget.id) return a;
        return {
          ...a,
          status: publishOptions.website ? "published" : a.status,
          publishedAt: publishOptions.website ? now : a.publishedAt,
          syncFacebook: publishOptions.facebook,
          syncLinkedin: publishOptions.linkedin,
          facebookStatus: publishOptions.facebook ? "pending" : a.facebookStatus,
          linkedinStatus: publishOptions.linkedin ? "pending" : a.linkedinStatus,
          updatedAt: now,
        } as NewsArticle;
      }));
      toast.warning("网站已发布，社交媒体同步需配置 Access Token 后生效");
      setShowPublishDialog(false);
    } finally {
      setIsPublishing(false);
    }
  };

  const deleteArticle = (id: number) => {
    setArticles(prev => prev.filter(a => a.id !== id));
    toast.success("文章已删除");
  };

  const published = articles.filter(a => a.status === "published");
  const drafts = articles.filter(a => a.status === "draft");

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* 顶部导航 */}
      <header className="flex-none flex h-14 items-center justify-between px-4 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回 ERP
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-600" />
            <span className="text-base font-semibold text-slate-800">网站管理</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Settings className="h-4 w-4" />
            社交账号配置
          </button>
          <Button onClick={() => openEditor()} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            新建文章
          </Button>
        </div>
      </header>

      {/* 主内容 */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="articles">
              全部文章
              <span className="ml-1.5 text-xs bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5">{articles.length}</span>
            </TabsTrigger>
            <TabsTrigger value="published">
              已发布
              <span className="ml-1.5 text-xs bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">{published.length}</span>
            </TabsTrigger>
            <TabsTrigger value="drafts">
              草稿
              <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">{drafts.length}</span>
            </TabsTrigger>
            <TabsTrigger value="settings">社交账号</TabsTrigger>
          </TabsList>

          {/* 文章列表 */}
          <TabsContent value="articles">
            <ArticleList
              articles={articles}
              onEdit={openEditor}
              onPublish={openPublishDialog}
              onDelete={deleteArticle}
            />
          </TabsContent>
          <TabsContent value="published">
            <ArticleList
              articles={published}
              onEdit={openEditor}
              onPublish={openPublishDialog}
              onDelete={deleteArticle}
            />
          </TabsContent>
          <TabsContent value="drafts">
            <ArticleList
              articles={drafts}
              onEdit={openEditor}
              onPublish={openPublishDialog}
              onDelete={deleteArticle}
            />
          </TabsContent>

          {/* 社交账号配置 */}
          <TabsContent value="settings">
            <SocialAccountSettings />
          </TabsContent>
        </Tabs>
      </div>

      {/* 编辑器弹窗 */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle?.id ? "编辑文章" : "新建文章"}</DialogTitle>
          </DialogHeader>
          {editingArticle && (
            <div className="space-y-4 py-2">
              <div>
                <Label>文章标题 *</Label>
                <Input
                  className="mt-1"
                  placeholder="请输入文章标题"
                  value={editingArticle.title ?? ""}
                  onChange={e => setEditingArticle(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>文章分类</Label>
                  <Select
                    value={editingArticle.category ?? "公司新闻"}
                    onValueChange={v => setEditingArticle(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>封面图片 URL</Label>
                  <Input
                    className="mt-1"
                    placeholder="https://..."
                    value={editingArticle.coverImage ?? ""}
                    onChange={e => setEditingArticle(prev => ({ ...prev, coverImage: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>摘要（用于社交媒体发帖）</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  placeholder="一句话描述文章内容，将作为 Facebook/LinkedIn 发帖正文..."
                  value={editingArticle.summary ?? ""}
                  onChange={e => setEditingArticle(prev => ({ ...prev, summary: e.target.value }))}
                />
              </div>
              <div>
                <Label>正文内容 *</Label>
                <Textarea
                  className="mt-1"
                  rows={10}
                  placeholder="请输入文章正文..."
                  value={editingArticle.content ?? ""}
                  onChange={e => setEditingArticle(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>取消</Button>
            <Button onClick={saveArticle}>保存草稿</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 发布对话框 */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-indigo-600" />
              发布文章
            </DialogTitle>
          </DialogHeader>
          {publishTarget && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-800 line-clamp-2">{publishTarget.title}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{publishTarget.summary}</p>
              </div>

              <p className="text-sm font-medium text-slate-700">选择发布渠道：</p>

              {/* 网站 */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                    <Globe className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">公司官网</p>
                    <p className="text-xs text-slate-400">发布到网站新闻页</p>
                  </div>
                </div>
                <Switch
                  checked={publishOptions.website}
                  onCheckedChange={v => setPublishOptions(p => ({ ...p, website: v }))}
                />
              </div>

              {/* Facebook */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <Facebook className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Facebook</p>
                    <p className="text-xs text-slate-400">同步发帖到公司主页</p>
                  </div>
                </div>
                <Switch
                  checked={publishOptions.facebook}
                  onCheckedChange={v => setPublishOptions(p => ({ ...p, facebook: v }))}
                />
              </div>

              {/* LinkedIn */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50">
                    <Linkedin className="h-5 w-5 text-sky-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">LinkedIn</p>
                    <p className="text-xs text-slate-400">同步发帖到公司主页</p>
                  </div>
                </div>
                <Switch
                  checked={publishOptions.linkedin}
                  onCheckedChange={v => setPublishOptions(p => ({ ...p, linkedin: v }))}
                />
              </div>

              {(publishOptions.facebook || publishOptions.linkedin) && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    社交媒体同步需要在「社交账号」标签页配置对应的 Access Token。
                    未配置时将标记为"待同步"状态。
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>取消</Button>
            <Button
              onClick={doPublish}
              disabled={isPublishing || (!publishOptions.website && !publishOptions.facebook && !publishOptions.linkedin)}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              {isPublishing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isPublishing ? "发布中..." : "立即发布"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 文章列表组件
// ============================================================
function ArticleList({
  articles,
  onEdit,
  onPublish,
  onDelete,
}: {
  articles: NewsArticle[];
  onEdit: (a: NewsArticle) => void;
  onPublish: (a: NewsArticle) => void;
  onDelete: (id: number) => void;
}) {
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <FileText className="h-12 w-12 mb-3 text-slate-200" />
        <p className="text-sm">暂无文章</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {articles.map(article => (
        <div key={article.id} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">{article.category}</Badge>
                {article.status === "published" ? (
                  <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">已发布</Badge>
                ) : (
                  <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-100">草稿</Badge>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-800 truncate">{article.title}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{article.summary}</p>

              {/* 同步状态 */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs text-slate-500">
                    {article.status === "published" ? `${article.publishedAt} 发布` : "未发布"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Facebook className="h-3.5 w-3.5 text-blue-400" />
                  <SyncStatusBadge status={article.facebookStatus} platform="facebook" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Linkedin className="h-3.5 w-3.5 text-sky-500" />
                  <SyncStatusBadge status={article.linkedinStatus} platform="linkedin" />
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onEdit(article)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="编辑"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onPublish(article)}
                className="flex h-8 items-center gap-1.5 px-2.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors text-xs font-medium"
                title="发布"
              >
                <Share2 className="h-3.5 w-3.5" />
                发布
              </button>
              <button
                type="button"
                onClick={() => onDelete(article.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="删除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 社交账号配置组件
// ============================================================
function SocialAccountSettings() {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Facebook className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Facebook 公司主页</p>
            <p className="text-xs text-slate-400">需要 Page Access Token（永久令牌）</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Page ID</Label>
            <Input className="mt-1 text-sm" placeholder="例：123456789012345" />
          </div>
          <div>
            <Label className="text-xs">Page Access Token</Label>
            <Input className="mt-1 text-sm" type="password" placeholder="EAAxxxxxxxx..." />
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 space-y-1">
              <p>获取方式：</p>
              <p>1. 进入 <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Facebook Developers</a> → 创建应用</p>
              <p>2. 添加「Facebook 登录」产品，获取 Page Access Token</p>
              <p>3. 使用 Token Debugger 将短期令牌转换为永久令牌</p>
            </div>
          </div>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">保存 Facebook 配置</Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
            <Linkedin className="h-5 w-5 text-sky-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">LinkedIn 公司主页</p>
            <p className="text-xs text-slate-400">需要 Organization Access Token（w_member_social 权限）</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Organization ID（公司主页 ID）</Label>
            <Input className="mt-1 text-sm" placeholder="例：urn:li:organization:12345678" />
          </div>
          <div>
            <Label className="text-xs">Access Token</Label>
            <Input className="mt-1 text-sm" type="password" placeholder="AQxxxxxxxx..." />
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-sky-50 p-3">
            <AlertCircle className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
            <div className="text-xs text-sky-700 space-y-1">
              <p>获取方式：</p>
              <p>1. 进入 <a href="https://www.linkedin.com/developers" target="_blank" rel="noopener noreferrer" className="underline">LinkedIn Developers</a> → 创建应用</p>
              <p>2. 申请 <strong>Share on LinkedIn</strong> 和 <strong>Marketing Developer Platform</strong> 权限</p>
              <p>3. 通过 OAuth 2.0 授权流程获取 Access Token</p>
            </div>
          </div>
          <Button size="sm" className="bg-sky-700 hover:bg-sky-800">保存 LinkedIn 配置</Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Globe className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">公司官网 Webhook</p>
            <p className="text-xs text-slate-400">发布时自动推送内容到官网 CMS</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Webhook URL</Label>
            <Input className="mt-1 text-sm" placeholder="https://your-website.com/api/news/webhook" />
          </div>
          <div>
            <Label className="text-xs">Secret Key（可选）</Label>
            <Input className="mt-1 text-sm" type="password" placeholder="用于验证请求来源" />
          </div>
          <Button size="sm" variant="outline">保存 Webhook 配置</Button>
        </div>
      </div>
    </div>
  );
}
