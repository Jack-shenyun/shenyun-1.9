import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Inbox, Send, FileText, Trash2, Users, RefreshCw, Plus, Search,
  Star, StarOff, Eye, Reply, Languages, Sparkles, Paperclip, X,
  ArrowLeft, Mail, ChevronDown, Wand2, Globe, PenLine, FolderOpen,
  HardDrive, FileImage, FileSpreadsheet, FileArchive, Loader2, ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";

type Folder = "inbox" | "sent" | "draft" | "trash";
type AiMode = "generate" | "polish" | "translate";

interface EmailItem {
  id: number;
  subject: string;
  fromAddress: string;
  fromName: string;
  toAddress: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachment: boolean;
  receivedAt: string | null;
  sentAt: string | null;
  folder: Folder;
}

interface EmailDetail extends EmailItem {
  bodyHtml: string;
  bodyText: string;
  ccAddress: string;
  attachments: Array<{ id: number; filename: string; size: number; mimeType: string }>;
}

interface Contact {
  id: number;
  emailAddress: string;
  displayName: string;
  emailCount: number;
  lastEmailAt: string | null;
}

interface LocalAttachment {
  file: File;
  name: string;
  size: number;
  type: "local";
}

interface SystemAttachment {
  name: string;
  path: string;
  size: number;
  category: string;
  type: "system";
}

type Attachment = LocalAttachment | SystemAttachment;

const FOLDER_CONFIG: Record<Folder, { label: string; icon: React.ElementType }> = {
  inbox: { label: "收件箱", icon: Inbox },
  sent: { label: "发件箱", icon: Send },
  draft: { label: "草稿箱", icon: FileText },
  trash: { label: "回收站", icon: Trash2 },
};

function formatTime(val: string | null | undefined): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (diffDays < 7) return `${diffDays}天前`;
  return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return FileImage;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (["zip", "rar", "7z"].includes(ext)) return FileArchive;
  return FileText;
}

export default function MailPage() {
  const [, setLocation] = useLocation();
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [filterContact, setFilterContact] = useState<string | null>(null);

  // 写邮件表单
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeDraftId, setComposeDraftId] = useState<number | undefined>();
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // AI 写作辅助
  const [aiWriteLoading, setAiWriteLoading] = useState(false);
  const [showAiInstruction, setShowAiInstruction] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [pendingAiMode, setPendingAiMode] = useState<AiMode | null>(null);
  const [translateLang, setTranslateLang] = useState("英文");

  // 系统文件选择器
  const [showSystemFiles, setShowSystemFiles] = useState(false);
  const [sysFileSearch, setSysFileSearch] = useState("");

  // 查看邮件的AI结果
  const [translateResult, setTranslateResult] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<"translate" | "reply" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // tRPC
  const listQuery = trpc.mail.list.useQuery(
    { folder, search: search || undefined, contactAddress: filterContact || undefined, limit: 100 },
    { refetchOnWindowFocus: false }
  );
  const detailQuery = trpc.mail.getById.useQuery(
    { id: selectedId! },
    { enabled: selectedId !== null, refetchOnWindowFocus: false }
  );
  const contactsQuery = trpc.mail.contacts.useQuery(
    { search: contactSearch || undefined, limit: 100 },
    { enabled: showContacts, refetchOnWindowFocus: false }
  );
  const systemFilesQuery = trpc.mail.listSystemFiles.useQuery(
    { search: sysFileSearch || undefined, limit: 100 },
    { enabled: showSystemFiles, refetchOnWindowFocus: false }
  );

  const syncMutation = trpc.mail.syncInbox.useMutation({
    onSuccess: (data) => {
      toast.success(`同步完成，新增 ${data.synced} 封邮件`);
      listQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const markReadMutation = trpc.mail.markRead.useMutation({
    onSuccess: () => listQuery.refetch(),
  });

  const markStarredMutation = trpc.mail.markStarred.useMutation({
    onSuccess: () => listQuery.refetch(),
  });

  const deleteMutation = trpc.mail.delete.useMutation({
    onSuccess: () => {
      toast.success("已移至回收站");
      setSelectedId(null);
      listQuery.refetch();
    },
  });

  const saveDraftMutation = trpc.mail.saveDraft.useMutation({
    onSuccess: (data) => {
      setComposeDraftId(data.id);
      toast.success("草稿已保存");
    },
  });

  const sendMutation = trpc.mail.send.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("邮件发送成功");
        setShowCompose(false);
        resetCompose();
        if (folder === "sent") listQuery.refetch();
      } else {
        toast.error(data.error || "发送失败");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const translateMutation = trpc.mail.translate.useMutation({
    onSuccess: (data) => { setTranslateResult(data.result); setAiLoading(null); },
    onError: (e) => { toast.error(e.message); setAiLoading(null); },
  });

  const replyMutation = trpc.mail.generateReply.useMutation({
    onSuccess: (data) => { setReplyDraft(data.result); setAiLoading(null); },
    onError: (e) => { toast.error(e.message); setAiLoading(null); },
  });

  const aiWriteMutation = trpc.mail.aiWrite.useMutation({
    onSuccess: (data) => {
      setComposeBody(data.result);
      setAiWriteLoading(false);
      setShowAiInstruction(false);
      setAiInstruction("");
      toast.success("AI 已生成内容，请查看正文");
    },
    onError: (e) => {
      toast.error(e.message);
      setAiWriteLoading(false);
    },
  });

  function resetCompose() {
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
    setComposeDraftId(undefined);
    setAttachments([]);
    setShowAiInstruction(false);
    setAiInstruction("");
  }

  function openCompose(prefill?: { to?: string; subject?: string; body?: string }) {
    resetCompose();
    if (prefill?.to) setComposeTo(prefill.to);
    if (prefill?.subject) setComposeSubject(prefill.subject);
    if (prefill?.body) setComposeBody(prefill.body);
    setShowCompose(true);
  }

  function handleSend() {
    if (!composeTo.trim()) { toast.error("请填写收件人"); return; }
    if (!composeSubject.trim()) { toast.error("请填写主题"); return; }
    sendMutation.mutate({
      to: composeTo,
      cc: composeCc || undefined,
      subject: composeSubject,
      bodyHtml: `<div style="font-family:sans-serif;line-height:1.6">${composeBody.replace(/\n/g, "<br/>")}</div>`,
      bodyText: composeBody,
      draftId: composeDraftId,
    });
  }

  function handleSaveDraft() {
    saveDraftMutation.mutate({
      id: composeDraftId,
      subject: composeSubject,
      toAddress: composeTo,
      ccAddress: composeCc,
      bodyHtml: composeBody,
      bodyText: composeBody,
    });
  }

  function handleLocalFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newAttachments: LocalAttachment[] = files.map((f) => ({
      file: f, name: f.name, size: f.size, type: "local",
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  }

  function handleSystemFileSelect(file: { name: string; path: string; size: number; category: string }) {
    const already = attachments.some((a) => a.type === "system" && (a as SystemAttachment).path === file.path);
    if (already) { toast.info("该文件已添加"); return; }
    setAttachments((prev) => [...prev, { ...file, type: "system" }]);
    toast.success(`已添加：${file.name}`);
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleAiAction(mode: AiMode) {
    if (mode === "generate") {
      setPendingAiMode("generate");
      setShowAiInstruction(true);
      return;
    }
    if (mode === "translate") {
      setPendingAiMode("translate");
      setShowAiInstruction(true);
      return;
    }
    // polish - 直接执行
    if (!composeBody.trim()) { toast.error("请先填写正文内容"); return; }
    setAiWriteLoading(true);
    aiWriteMutation.mutate({ mode: "polish", body: composeBody, subject: composeSubject });
  }

  function handleAiConfirm() {
    if (!pendingAiMode) return;
    if (pendingAiMode === "generate") {
      if (!aiInstruction.trim()) { toast.error("请填写内容要求"); return; }
      setAiWriteLoading(true);
      aiWriteMutation.mutate({ mode: "generate", subject: composeSubject, instruction: aiInstruction });
    } else if (pendingAiMode === "translate") {
      if (!composeBody.trim()) { toast.error("请先填写正文内容"); return; }
      setAiWriteLoading(true);
      aiWriteMutation.mutate({ mode: "translate", body: composeBody, targetLang: translateLang });
    }
  }

  const emailList: EmailItem[] = (listQuery.data?.list as any) || [];
  const detail: EmailDetail | null = (detailQuery.data as any) || null;
  const systemFiles: Array<{ name: string; path: string; size: number; category: string; modifiedAt: string }> =
    (systemFilesQuery.data as any) || [];

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* 独立顶部导航栏 */}
      <header className="flex-none h-14 flex items-center justify-between px-4 border-b bg-white shadow-sm z-50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回 ERP
          </button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span className="text-base font-semibold text-slate-800">邮件协同</span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => openCompose()}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1" /> 写邮件
        </Button>
      </header>

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧导航 */}
        <aside className="w-48 border-r bg-gray-50 flex flex-col py-4 gap-1 shrink-0">
          {(Object.keys(FOLDER_CONFIG) as Folder[]).map((f) => {
            const { label, icon: Icon } = FOLDER_CONFIG[f];
            return (
              <button
                key={f}
                onClick={() => { setFolder(f); setSelectedId(null); setFilterContact(null); setShowContacts(false); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg mx-2 transition-colors ${
                  folder === f && !showContacts
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}

          <Separator className="my-2" />

          <button
            onClick={() => { setShowContacts(true); setSelectedId(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg mx-2 transition-colors ${
              showContacts
                ? "bg-blue-100 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Users className="w-4 h-4" />
            联系人归档
          </button>

          <div className="mt-auto px-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => syncMutation.mutate({ limit: 50 })}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              同步收件箱
            </Button>
          </div>
        </aside>

        {/* 联系人归档视图 */}
        {showContacts ? (
          <div className="flex-1 flex flex-col">
            <div className="border-b px-4 py-3 flex items-center gap-3">
              <h2 className="font-semibold text-gray-800">联系人归档</h2>
              <Input
                placeholder="搜索联系人..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-64 h-8"
              />
            </div>
            <div className="flex-1 overflow-auto p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>邮箱地址</TableHead>
                    <TableHead>显示名称</TableHead>
                    <TableHead>往来邮件数</TableHead>
                    <TableHead>最近邮件</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactsQuery.isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">加载中...</TableCell></TableRow>
                  ) : ((contactsQuery.data as Contact[]) || []).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">暂无联系人</TableCell></TableRow>
                  ) : (
                    ((contactsQuery.data as Contact[]) || []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm">{c.emailAddress}</TableCell>
                        <TableCell>{c.displayName || "-"}</TableCell>
                        <TableCell>{c.emailCount}</TableCell>
                        <TableCell className="text-gray-500 text-sm">{formatTime(c.lastEmailAt)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFilterContact(c.emailAddress);
                              setShowContacts(false);
                              setFolder("inbox");
                            }}
                          >
                            查看往来邮件
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* 邮件列表 */}
            <div className="w-80 border-r flex flex-col shrink-0">
              <div className="border-b px-3 py-2 flex items-center gap-2">
                <h2 className="font-semibold text-gray-800 flex-1">
                  {filterContact ? `${filterContact} 的往来邮件` : FOLDER_CONFIG[folder].label}
                </h2>
                {filterContact && (
                  <button onClick={() => setFilterContact(null)} className="text-xs text-blue-500 hover:underline">
                    清除筛选
                  </button>
                )}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="搜索..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-7 h-7 text-sm w-36"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                {listQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12 text-gray-400">加载中...</div>
                ) : emailList.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-gray-400">暂无邮件</div>
                ) : (
                  emailList.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => {
                        setSelectedId(email.id);
                        setTranslateResult(null);
                        setReplyDraft(null);
                        if (!email.isRead) markReadMutation.mutate({ id: email.id, isRead: true });
                      }}
                      className={`w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors ${
                        selectedId === email.id ? "bg-blue-50 border-l-2 border-blue-500" : ""
                      } ${!email.isRead ? "font-medium" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm truncate flex-1 mr-2">
                          {email.fromName || email.fromAddress || email.toAddress}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatTime(email.receivedAt || email.sentAt)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 truncate">{email.subject || "(无主题)"}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {!email.isRead && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">未读</Badge>}
                        {email.isStarred && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                        {email.hasAttachment && <Paperclip className="w-3 h-3 text-gray-400" />}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 邮件详情 */}
            {selectedId !== null && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {detailQuery.isLoading ? (
                  <div className="flex items-center justify-center flex-1 text-gray-400">加载中...</div>
                ) : !detail ? null : (
                  <>
                    {/* 详情头部 */}
                    <div className="border-b px-4 py-3">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-semibold text-gray-900 flex-1 mr-4">
                          {detail.subject || "(无主题)"}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => markStarredMutation.mutate({ id: detail.id, isStarred: !detail.isStarred })}
                            className="p-1.5 rounded hover:bg-gray-100"
                          >
                            {detail.isStarred
                              ? <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              : <StarOff className="w-4 h-4 text-gray-400" />
                            }
                          </button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => openCompose({
                              to: detail.fromAddress,
                              subject: `Re: ${detail.subject}`,
                            })}
                          >
                            <Reply className="w-3.5 h-3.5 mr-1" /> 回复
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => { setAiLoading("translate"); translateMutation.mutate({ id: detail.id }); }}
                            disabled={aiLoading === "translate"}
                          >
                            <Languages className="w-3.5 h-3.5 mr-1" />
                            {aiLoading === "translate" ? "翻译中..." : "AI翻译"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => { setAiLoading("reply"); replyMutation.mutate({ id: detail.id }); }}
                            disabled={aiLoading === "reply"}
                          >
                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                            {aiLoading === "reply" ? "生成中..." : "AI回复"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => deleteMutation.mutate({ id: detail.id })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div>发件人：<span className="text-gray-700">{detail.fromName} &lt;{detail.fromAddress}&gt;</span></div>
                        <div>收件人：<span className="text-gray-700">{detail.toAddress}</span></div>
                        {detail.ccAddress && <div>抄送：<span className="text-gray-700">{detail.ccAddress}</span></div>}
                        <div>时间：<span className="text-gray-700">{formatTime(detail.receivedAt || detail.sentAt)}</span></div>
                      </div>
                      {detail.attachments?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {detail.attachments.map((att) => (
                            <div key={att.id} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs text-gray-600">
                              <Paperclip className="w-3 h-3" />
                              {att.filename} ({formatSize(att.size)})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* AI 翻译结果 */}
                    {translateResult !== null && (
                      <div className="border-b px-4 py-3 bg-blue-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-700 flex items-center gap-1">
                            <Languages className="w-4 h-4" /> AI 翻译结果
                          </span>
                          <button onClick={() => setTranslateResult(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{translateResult}</p>
                      </div>
                    )}

                    {/* AI 回复草稿 */}
                    {replyDraft !== null && (
                      <div className="border-b px-4 py-3 bg-green-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                            <Sparkles className="w-4 h-4" /> AI 生成回复草稿
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                openCompose({
                                  to: detail.fromAddress,
                                  subject: `Re: ${detail.subject}`,
                                  body: replyDraft,
                                });
                                setReplyDraft(null);
                              }}
                            >
                              使用此草稿
                            </Button>
                            <button onClick={() => setReplyDraft(null)} className="text-gray-400 hover:text-gray-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <Textarea
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          className="text-sm min-h-[120px] bg-white"
                        />
                      </div>
                    )}

                    {/* 邮件正文 */}
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                      {detail.bodyHtml ? (
                        <div
                          className="prose prose-sm max-w-none text-gray-800"
                          dangerouslySetInnerHTML={{ __html: detail.bodyHtml }}
                        />
                      ) : (
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                          {detail.bodyText || "(邮件正文为空)"}
                        </pre>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== 写邮件弹窗 ===== */}
      <Dialog open={showCompose} onOpenChange={(open) => { if (!open) { setShowCompose(false); resetCompose(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-none">
            <DialogTitle>写邮件</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {/* 收件人 */}
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right text-sm">收件人</Label>
              <Input
                className="col-span-3"
                placeholder="收件人邮箱，多个用逗号分隔"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
            </div>
            {/* 抄送 */}
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right text-sm">抄送</Label>
              <Input
                className="col-span-3"
                placeholder="抄送邮箱（可选）"
                value={composeCc}
                onChange={(e) => setComposeCc(e.target.value)}
              />
            </div>
            {/* 主题 */}
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right text-sm">主题</Label>
              <Input
                className="col-span-3"
                placeholder="邮件主题"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </div>

            {/* 正文 + AI 工具栏 */}
            <div className="grid grid-cols-4 gap-2">
              <Label className="text-right text-sm mt-2">正文</Label>
              <div className="col-span-3 space-y-2">
                {/* AI 辅助工具栏 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 gap-1"
                        disabled={aiWriteLoading}
                      >
                        {aiWriteLoading
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI 处理中...</>
                          : <><Sparkles className="w-3.5 h-3.5" /> AI 辅助 <ChevronDown className="w-3 h-3" /></>
                        }
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem onClick={() => handleAiAction("generate")} className="gap-2 text-sm">
                        <PenLine className="w-4 h-4 text-purple-500" />
                        AI 生成正文
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAiAction("polish")} className="gap-2 text-sm">
                        <Wand2 className="w-4 h-4 text-blue-500" />
                        AI 润色正文
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleAiAction("translate")} className="gap-2 text-sm">
                        <Globe className="w-4 h-4 text-green-500" />
                        AI 翻译正文
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-xs text-gray-400">由豆包 AI 驱动</span>
                </div>

                {/* AI 指令输入区（生成/翻译时显示） */}
                {showAiInstruction && (
                  <div className="border rounded-lg p-3 bg-purple-50 space-y-2">
                    {pendingAiMode === "generate" ? (
                      <>
                        <p className="text-xs font-medium text-purple-700 flex items-center gap-1">
                          <PenLine className="w-3.5 h-3.5" /> 请描述邮件内容要求
                        </p>
                        <Textarea
                          placeholder="例如：通知供应商本月采购订单延期，请求确认新的交货日期..."
                          value={aiInstruction}
                          onChange={(e) => setAiInstruction(e.target.value)}
                          className="min-h-[80px] text-sm bg-white"
                        />
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-medium text-green-700 flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5" /> 翻译目标语言
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {["英文", "中文", "日文", "韩文", "法文", "德文", "西班牙文"].map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => setTranslateLang(lang)}
                              className={`px-2 py-1 rounded text-xs border transition-colors ${
                                translateLang === lang
                                  ? "bg-green-600 text-white border-green-600"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
                              }`}
                            >
                              {lang}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleAiConfirm}
                        disabled={aiWriteLoading}
                      >
                        {aiWriteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                        确认执行
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => { setShowAiInstruction(false); setAiInstruction(""); }}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}

                <Textarea
                  className="min-h-[180px]"
                  placeholder="邮件正文..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                />
              </div>
            </div>

            {/* 附件区域 */}
            <div className="grid grid-cols-4 gap-2">
              <Label className="text-right text-sm mt-1">附件</Label>
              <div className="col-span-3 space-y-2">
                {/* 附件操作按钮 */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    本地文件
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => { setShowSystemFiles(true); setSysFileSearch(""); }}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    系统文件
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleLocalFileSelect}
                  />
                </div>

                {/* 已选附件列表 */}
                {attachments.length > 0 && (
                  <div className="space-y-1">
                    {attachments.map((att, idx) => {
                      const Icon = getFileIcon(att.name);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-gray-50 border rounded px-2 py-1.5 text-sm"
                        >
                          <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="flex-1 truncate text-gray-700">{att.name}</span>
                          <span className="text-xs text-gray-400 shrink-0">{formatSize(att.size)}</span>
                          {att.type === "system" && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">系统</Badge>
                          )}
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="text-gray-400 hover:text-red-500 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-none gap-2 pt-2 border-t">
            <Button variant="outline" onClick={handleSaveDraft} disabled={saveDraftMutation.isPending}>
              保存草稿
            </Button>
            <Button onClick={handleSend} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? "发送中..." : "发送"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 系统文件选择器弹窗 ===== */}
      <Dialog open={showSystemFiles} onOpenChange={setShowSystemFiles}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-500" />
              选择系统文件
            </DialogTitle>
          </DialogHeader>
          <div className="flex-none">
            <Input
              placeholder="搜索文件名或分类..."
              value={sysFileSearch}
              onChange={(e) => setSysFileSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {systemFilesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中...
              </div>
            ) : systemFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FolderOpen className="w-10 h-10 mb-2" />
                <p className="text-sm">暂无系统文件</p>
              </div>
            ) : (
              <div className="divide-y">
                {systemFiles.map((file, idx) => {
                  const Icon = getFileIcon(file.name);
                  const isAdded = attachments.some(
                    (a) => a.type === "system" && (a as SystemAttachment).path === file.path
                  );
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <Icon className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{file.name}</p>
                        <p className="text-xs text-gray-400 truncate">{file.category}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{formatSize(file.size)}</span>
                      <Button
                        size="sm"
                        variant={isAdded ? "secondary" : "outline"}
                        className="h-7 text-xs shrink-0"
                        disabled={isAdded}
                        onClick={() => handleSystemFileSelect(file)}
                      >
                        {isAdded ? "已添加" : "添加"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSystemFiles(false)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
