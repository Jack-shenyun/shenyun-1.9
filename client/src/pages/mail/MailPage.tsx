import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import ERPLayout from "@/components/ERPLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Inbox, Send, FileText, Trash2, Users, RefreshCw, Plus, Search,
  Star, StarOff, Eye, Reply, Languages, Sparkles, Paperclip, X, ChevronLeft,
} from "lucide-react";

type Folder = "inbox" | "sent" | "draft" | "trash";

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

export default function MailPage() {
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

  // AI 结果
  const [translateResult, setTranslateResult] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<"translate" | "reply" | null>(null);

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
    onSuccess: (data) => {
      setTranslateResult(data.result);
      setAiLoading(null);
    },
    onError: (e) => { toast.error(e.message); setAiLoading(null); },
  });

  const replyMutation = trpc.mail.generateReply.useMutation({
    onSuccess: (data) => {
      setReplyDraft(data.result);
      setAiLoading(null);
    },
    onError: (e) => { toast.error(e.message); setAiLoading(null); },
  });

  function resetCompose() {
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
    setComposeDraftId(undefined);
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

  const emailList: EmailItem[] = (listQuery.data?.list as any) || [];
  const detail: EmailDetail | null = (detailQuery.data as any) || null;

  return (
    <ERPLayout>
      <div className="flex h-full min-h-[calc(100vh-64px)]">
        {/* 左侧导航 */}
        <aside className="w-48 border-r bg-gray-50 flex flex-col py-4 gap-1 shrink-0">
          <Button
            className="mx-3 mb-3"
            size="sm"
            onClick={() => openCompose()}
          >
            <Plus className="w-4 h-4 mr-1" /> 写邮件
          </Button>

          {(Object.keys(FOLDER_CONFIG) as Folder[]).map((f) => {
            const { label, icon: Icon } = FOLDER_CONFIG[f];
            return (
              <button
                key={f}
                onClick={() => { setFolder(f); setSelectedId(null); setFilterContact(null); }}
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
                        <TableCell>
                          <Badge variant="secondary">{c.emailCount} 封</Badge>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">{formatTime(c.lastEmailAt)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowContacts(false);
                              setFolder("inbox");
                              setFilterContact(c.emailAddress);
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
          /* 邮件列表 + 详情 */
          <div className="flex-1 flex overflow-hidden">
            {/* 邮件列表 */}
            <div className={`${selectedId ? "w-80 shrink-0" : "flex-1"} border-r flex flex-col`}>
              <div className="border-b px-3 py-2 flex items-center gap-2">
                <h2 className="font-semibold text-sm text-gray-700 flex-1">
                  {FOLDER_CONFIG[folder].label}
                  {filterContact && (
                    <span className="ml-2 text-xs text-blue-600">
                      来自 {filterContact}
                      <button onClick={() => setFilterContact(null)} className="ml-1 text-gray-400 hover:text-red-500">×</button>
                    </span>
                  )}
                </h2>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <Input
                    placeholder="搜索..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-6 h-7 w-40 text-xs"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {listQuery.isLoading ? (
                  <div className="text-center py-12 text-gray-400 text-sm">加载中...</div>
                ) : emailList.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">暂无邮件</div>
                ) : (
                  emailList.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedId(email.id)}
                      className={`px-3 py-3 border-b cursor-pointer transition-colors ${
                        selectedId === email.id ? "bg-blue-50" : "hover:bg-gray-50"
                      } ${!email.isRead ? "bg-white" : "bg-gray-50/50"}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className={`text-sm truncate flex-1 ${!email.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                          {folder === "sent" || folder === "draft" ? email.toAddress : (email.fromName || email.fromAddress)}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatTime(email.receivedAt || email.sentAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {!email.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                        <span className="text-xs text-gray-600 truncate flex-1">{email.subject}</span>
                        {email.hasAttachment && <Paperclip className="w-3 h-3 text-gray-400 shrink-0" />}
                        {email.isStarred && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 邮件详情 */}
            {selectedId && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {detailQuery.isLoading ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400">加载中...</div>
                ) : !detail ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400">邮件不存在</div>
                ) : (
                  <>
                    {/* 详情头部 */}
                    <div className="border-b px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-base leading-tight">{detail.subject}</h3>
                          <div className="mt-1 text-sm text-gray-500 space-y-0.5">
                            <div>
                              <span className="text-gray-400">发件人：</span>
                              {detail.fromName ? `${detail.fromName} <${detail.fromAddress}>` : detail.fromAddress}
                            </div>
                            <div>
                              <span className="text-gray-400">收件人：</span>{detail.toAddress}
                            </div>
                            {detail.ccAddress && (
                              <div><span className="text-gray-400">抄送：</span>{detail.ccAddress}</div>
                            )}
                            <div>
                              <span className="text-gray-400">时间：</span>
                              {detail.receivedAt
                                ? new Date(detail.receivedAt).toLocaleString("zh-CN")
                                : detail.sentAt
                                ? new Date(detail.sentAt).toLocaleString("zh-CN")
                                : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            title={detail.isStarred ? "取消星标" : "星标"}
                            onClick={() => markStarredMutation.mutate({ id: detail.id, isStarred: !detail.isStarred })}
                          >
                            {detail.isStarred
                              ? <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              : <StarOff className="w-4 h-4 text-gray-400" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCompose({
                              to: detail.fromAddress,
                              subject: `Re: ${detail.subject}`,
                            })}
                          >
                            <Reply className="w-4 h-4 mr-1" /> 回复
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => deleteMutation.mutate({ id: detail.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* AI 操作按钮 */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={aiLoading === "translate"}
                          onClick={() => {
                            setAiLoading("translate");
                            setTranslateResult(null);
                            translateMutation.mutate({ id: detail.id });
                          }}
                        >
                          <Languages className="w-4 h-4 mr-1" />
                          {aiLoading === "translate" ? "翻译中..." : "AI 翻译"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={aiLoading === "reply"}
                          onClick={() => {
                            setAiLoading("reply");
                            setReplyDraft(null);
                            replyMutation.mutate({ id: detail.id });
                          }}
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          {aiLoading === "reply" ? "生成中..." : "AI 生成回复"}
                        </Button>
                      </div>
                    </div>

                    {/* 附件 */}
                    {detail.attachments && detail.attachments.length > 0 && (
                      <div className="border-b px-4 py-2 flex items-center gap-2 flex-wrap bg-gray-50">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        {detail.attachments.map((att) => (
                          <Badge key={att.id} variant="outline" className="text-xs">
                            {att.filename}
                            {att.size ? ` (${(att.size / 1024).toFixed(1)}KB)` : ""}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* AI 翻译结果 */}
                    {translateResult && (
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

      {/* 写邮件弹窗 */}
      <Dialog open={showCompose} onOpenChange={(open) => { if (!open) { setShowCompose(false); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>写邮件</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right text-sm">收件人</Label>
              <Input
                className="col-span-3"
                placeholder="收件人邮箱，多个用逗号分隔"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right text-sm">抄送</Label>
              <Input
                className="col-span-3"
                placeholder="抄送邮箱（可选）"
                value={composeCc}
                onChange={(e) => setComposeCc(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right text-sm">主题</Label>
              <Input
                className="col-span-3"
                placeholder="邮件主题"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Label className="text-right text-sm mt-2">正文</Label>
              <Textarea
                className="col-span-3 min-h-[200px]"
                placeholder="邮件正文..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={saveDraftMutation.isPending}>
              保存草稿
            </Button>
            <Button onClick={handleSend} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? "发送中..." : "发送"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ERPLayout>
  );
}
