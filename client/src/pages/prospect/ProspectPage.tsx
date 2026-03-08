import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search, Globe, Users, Mail, Phone, Linkedin, ArrowLeft,
  Plus, CheckCircle, ExternalLink, Loader2, Target, Zap,
  Building2, MapPin, ChevronDown, ChevronUp, Settings,
  RefreshCw, BookmarkPlus, TrendingUp, AlertCircle,
} from "lucide-react";

// ─── 类型 ──────────────────────────────────────────────────────────────────────
interface Company {
  name: string; domain: string; website: string; description: string;
  country: string; industry: string; employeeCount?: string;
  linkedinUrl?: string; source: string; snippet?: string;
}
interface Contact {
  firstName: string; lastName: string; fullName: string; title: string;
  email: string; emailStatus: string; phone?: string; linkedinUrl?: string;
  companyName: string; companyDomain: string; source: string;
}

// ─── 渠道状态徽章 ──────────────────────────────────────────────────────────────
function ChannelBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 border border-slate-200"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
      {label}
    </span>
  );
}

// ─── 邮箱状态徽章 ──────────────────────────────────────────────────────────────
function EmailStatusBadge({ status }: { status: string }) {
  if (status === "verified") return <span className="text-xs text-emerald-600 font-medium">✓ 已验证</span>;
  if (status === "guessed") return <span className="text-xs text-amber-500 font-medium">~ 推测</span>;
  return <span className="text-xs text-slate-400">未知</span>;
}

// ─── 主组件 ────────────────────────────────────────────────────────────────────
export default function ProspectPage() {
  const [, setLocation] = useLocation();
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("");
  const [industry, setIndustry] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [searchParams, setSearchParams] = useState({ keyword: "", region: "", industry: "" });

  // 展开的公司
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [enrichDomain, setEnrichDomain] = useState<string | null>(null);

  // 保存线索弹窗
  const [saveDialog, setSaveDialog] = useState<{ open: boolean; company?: Company; contact?: Contact }>({ open: false });

  // API 配置弹窗
  const [configOpen, setConfigOpen] = useState(false);

  // 线索库 tab
  const [activeTab, setActiveTab] = useState("search");

  // ─── 查询 ────────────────────────────────────────────────────────────────────
  const { data: apiStatus } = trpc.prospect.getApiStatus.useQuery();

  const { data: companies, isLoading: searching } = trpc.prospect.searchCompanies.useQuery(
    { keyword: searchParams.keyword, region: searchParams.region, industry: searchParams.industry },
    { enabled: searchTriggered && !!searchParams.keyword }
  );

  const { data: enrichData, isLoading: enriching } = trpc.prospect.enrichContacts.useQuery(
    { domain: enrichDomain! },
    { enabled: !!enrichDomain }
  );

  const { data: leadsData, refetch: refetchLeads } = trpc.prospect.getLeads.useQuery(
    { page: 1, pageSize: 50 },
    { enabled: activeTab === "leads" }
  );

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const saveLeadMut = trpc.prospect.saveLead.useMutation({
    onSuccess: () => {
      toast.success("线索已保存", { description: "已成功导入线索库" });
      setSaveDialog({ open: false });
      refetchLeads();
    },
    onError: (e) => toast.error("保存失败", { description: e.message }),
  });

  const updateStatusMut = trpc.prospect.updateLeadStatus.useMutation({
    onSuccess: () => { toast.success("状态已更新"); refetchLeads(); },
  });

  const pushHubSpotMut = trpc.prospect.pushToHubSpot.useMutation({
    onSuccess: (r) => {
      if (r.success) toast.success("已同步到 HubSpot", { description: `HubSpot ID: ${r.hubspotId}` });
      else toast.error("HubSpot 同步失败", { description: r.error });
    },
  });

  // ─── 操作函数 ─────────────────────────────────────────────────────────────────
  const handleSearch = () => {
    if (!keyword.trim()) return;
    setSearchParams({ keyword: keyword.trim(), region, industry });
    setSearchTriggered(true);
    setExpandedDomain(null);
    setEnrichDomain(null);
  };

  const handleEnrich = (domain: string) => {
    if (expandedDomain === domain) {
      setExpandedDomain(null);
      setEnrichDomain(null);
    } else {
      setExpandedDomain(domain);
      setEnrichDomain(domain);
    }
  };

  const handleSaveLead = (company: Company, contact?: Contact) => {
    setSaveDialog({ open: true, company, contact });
  };

  const confirmSaveLead = () => {
    const { company, contact } = saveDialog;
    if (!company) return;
    saveLeadMut.mutate({
      companyName: company.name,
      companyDomain: company.domain,
      companyWebsite: company.website,
      country: company.country,
      industry: company.industry,
      contactName: contact?.fullName,
      contactTitle: contact?.title,
      contactEmail: contact?.email,
      contactPhone: contact?.phone,
      contactLinkedin: contact?.linkedinUrl,
      source: `获客情报/${company.source}`,
    });
  };

  // ─── 渲染 ─────────────────────────────────────────────────────────────────────
  const statusOptions = [
    { value: "new", label: "新线索", color: "bg-blue-100 text-blue-700" },
    { value: "contacted", label: "已联系", color: "bg-yellow-100 text-yellow-700" },
    { value: "qualified", label: "已确认需求", color: "bg-purple-100 text-purple-700" },
    { value: "converted", label: "已转化", color: "bg-emerald-100 text-emerald-700" },
    { value: "lost", label: "已流失", color: "bg-red-100 text-red-700" },
  ];

  const quickKeywords = ["medical device distributor", "surgical instrument importer", "hospital equipment supplier", "medical consumables wholesaler"];
  const regions = ["", "Germany", "Japan", "USA", "UAE", "Netherlands", "Singapore", "France", "UK", "South Korea"];
  const industries = ["", "医疗器械经销商", "医院采购", "外科器械", "诊断设备", "医疗耗材", "康复设备"];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          返回 ERP
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-600" />
          <span className="font-semibold text-slate-800">获客情报</span>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-wrap">
          <ChannelBadge active={!!apiStatus?.google} label="Google" />
          <ChannelBadge active={!!apiStatus?.apollo} label="Apollo.io" />
          <ChannelBadge active={!!apiStatus?.hunter} label="Hunter.io" />
          <ChannelBadge active={!!apiStatus?.hubspot} label="HubSpot" />
          <ChannelBadge active={!!apiStatus?.linkedin} label="LinkedIn" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setConfigOpen(true)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            配置 API
          </button>
        </div>
      </header>

      {/* 主体 */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="search" className="gap-2"><Search className="h-4 w-4" />搜索发现</TabsTrigger>
            <TabsTrigger value="leads" className="gap-2"><BookmarkPlus className="h-4 w-4" />线索库 {leadsData?.total ? `(${leadsData.total})` : ""}</TabsTrigger>
          </TabsList>

          {/* ── 搜索发现 Tab ── */}
          <TabsContent value="search">
            {/* 搜索区 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-5 w-5 text-emerald-600" />
                <h2 className="font-semibold text-slate-800">关键词搜索目标公司</h2>
                <span className="text-xs text-slate-400 ml-1">由 Google Custom Search 驱动</span>
              </div>

              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder='输入关键词，如 "medical device distributor" 或 "surgical instrument importer"'
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="h-10"
                  />
                </div>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">全球地区</option>
                  {regions.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">所有行业</option>
                  {industries.filter(Boolean).map(i => <option key={i} value={i}>{i}</option>)}
                </select>
                <Button onClick={handleSearch} disabled={searching || !keyword.trim()} className="h-10 bg-emerald-600 hover:bg-emerald-700 gap-2">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  搜索
                </Button>
              </div>

              {/* 快速关键词 */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">快速搜索：</span>
                {quickKeywords.map(kw => (
                  <button
                    key={kw}
                    onClick={() => { setKeyword(kw); }}
                    className="text-xs text-emerald-600 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-400 rounded-full px-3 py-1 transition-colors bg-emerald-50 hover:bg-emerald-100"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            {/* 搜索结果 */}
            {searching && (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                <span>正在搜索全球目标公司...</span>
              </div>
            )}

            {!searching && companies && companies.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>未找到相关公司，请尝试其他关键词</p>
              </div>
            )}

            {!searching && companies && companies.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-500">找到 <strong className="text-slate-800">{companies.length}</strong> 家目标公司</p>
                  <span className="text-xs text-slate-400">点击「获取联系人」自动补全邮箱/电话/职务</span>
                </div>

                {companies.map((company: Company) => (
                  <div key={company.domain} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* 公司基本信息 */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <h3 className="font-semibold text-slate-800 truncate">{company.name}</h3>
                            <Badge variant="outline" className="text-xs flex-shrink-0">{company.industry}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{company.country}</span>
                            <a href={company.website} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-500 hover:text-blue-700 hover:underline">
                              <Globe className="h-3.5 w-3.5" />{company.domain}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            {company.linkedinUrl && (
                              <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                                <Linkedin className="h-3.5 w-3.5" />LinkedIn
                              </a>
                            )}
                          </div>
                          {company.description && (
                            <p className="text-sm text-slate-500 line-clamp-2">{company.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveLead(company)}
                            className="gap-1.5 text-xs"
                          >
                            <BookmarkPlus className="h-3.5 w-3.5" />
                            存入线索库
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleEnrich(company.domain)}
                            className={`gap-1.5 text-xs ${expandedDomain === company.domain ? "bg-slate-700 hover:bg-slate-800" : "bg-emerald-600 hover:bg-emerald-700"}`}
                          >
                            {enriching && enrichDomain === company.domain ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Users className="h-3.5 w-3.5" />
                            )}
                            {expandedDomain === company.domain ? "收起联系人" : "获取联系人"}
                            {expandedDomain === company.domain ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* 联系人展开区 */}
                    {expandedDomain === company.domain && (
                      <div className="border-t border-slate-100 bg-slate-50 p-5">
                        {enriching && enrichDomain === company.domain ? (
                          <div className="flex items-center gap-2 text-slate-400 py-4 justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                            <span className="text-sm">正在从 Apollo.io + Hunter.io 获取联系人信息...</span>
                          </div>
                        ) : enrichData && enrichData.contacts.length > 0 ? (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="h-4 w-4 text-emerald-600" />
                              <span className="text-sm font-medium text-slate-700">找到 {enrichData.contacts.length} 位联系人</span>
                              <span className="text-xs text-slate-400">来源：{[...new Set(enrichData.contacts.map((c: Contact) => c.source))].join(" + ")}</span>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {enrichData.contacts.map((contact: Contact, idx: number) => (
                                <div key={idx} className="bg-white rounded-lg border border-slate-200 p-4 hover:border-emerald-300 transition-colors">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className="font-medium text-slate-800 text-sm">{contact.fullName}</p>
                                      <p className="text-xs text-slate-500">{contact.title}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs capitalize">{contact.source}</Badge>
                                  </div>
                                  <div className="space-y-1.5">
                                    {contact.email && (
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                        <a href={`mailto:${contact.email}`} className="text-xs text-blue-600 hover:underline truncate">{contact.email}</a>
                                        <EmailStatusBadge status={contact.emailStatus} />
                                      </div>
                                    )}
                                    {contact.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                        <span className="text-xs text-slate-600">{contact.phone}</span>
                                      </div>
                                    )}
                                    {contact.linkedinUrl && (
                                      <div className="flex items-center gap-2">
                                        <Linkedin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                        <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                          className="text-xs text-blue-500 hover:underline">LinkedIn 主页</a>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2 mt-3">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 text-xs h-7 gap-1"
                                      onClick={() => handleSaveLead(company, contact)}
                                    >
                                      <Plus className="h-3 w-3" />
                                      存入线索库
                                    </Button>
                                    {apiStatus?.hubspot && contact.email && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7 gap-1 border-orange-200 text-orange-600 hover:bg-orange-50"
                                        onClick={() => pushHubSpotMut.mutate({
                                          firstName: contact.firstName,
                                          lastName: contact.lastName,
                                          email: contact.email,
                                          phone: contact.phone,
                                          company: company.name,
                                          title: contact.title,
                                        })}
                                        disabled={pushHubSpotMut.isPending}
                                      >
                                        {pushHubSpotMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "→ HubSpot"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-slate-400 text-sm">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p>未找到联系人信息</p>
                            <p className="text-xs mt-1">配置 Apollo.io API Key 可获取更多联系人数据</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 未搜索时的引导 */}
            {!searchTriggered && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                <Target className="h-12 w-12 mx-auto mb-4 text-emerald-500 opacity-60" />
                <h3 className="font-semibold text-slate-700 mb-2">开始搜索全球目标客户</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                  输入关键词（如产品名称、行业类型），系统将通过 Google 搜索全球目标公司，
                  再通过 Apollo.io 和 Hunter.io 自动补全采购负责人的邮箱、电话和 LinkedIn 信息。
                </p>
                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto text-left">
                  {[
                    { icon: <Globe className="h-5 w-5 text-blue-500" />, title: "Google 搜索", desc: "关键词发现全球目标公司" },
                    { icon: <Users className="h-5 w-5 text-purple-500" />, title: "Apollo.io", desc: "自动获取联系人姓名/职务/邮箱" },
                    { icon: <Zap className="h-5 w-5 text-amber-500" />, title: "Hunter.io", desc: "验证邮箱真实性，补全联系方式" },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="mb-2">{item.icon}</div>
                      <p className="text-xs font-medium text-slate-700">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── 线索库 Tab ── */}
          <TabsContent value="leads">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <h2 className="font-semibold text-slate-800">线索库</h2>
                  {leadsData?.total !== undefined && (
                    <span className="text-sm text-slate-400">共 {leadsData.total} 条</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchLeads()}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  刷新
                </Button>
              </div>

              {!leadsData?.leads?.length ? (
                <div className="text-center py-16 text-slate-400">
                  <BookmarkPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>线索库为空</p>
                  <p className="text-xs mt-1">在搜索发现中找到目标公司后，点击「存入线索库」</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">公司</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">国家/行业</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">联系人</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">邮箱</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">来源</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">状态</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadsData.leads.map((lead: any) => (
                        <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{lead.companyName}</div>
                            {lead.companyWebsite && (
                              <a href={lead.companyWebsite} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                {lead.companyDomain} <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-600">{lead.country}</div>
                            <div className="text-xs text-slate-400">{lead.industry}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-700">{lead.contactName || "—"}</div>
                            <div className="text-xs text-slate-400">{lead.contactTitle}</div>
                          </td>
                          <td className="px-4 py-3">
                            {lead.contactEmail ? (
                              <a href={`mailto:${lead.contactEmail}`} className="text-blue-600 hover:underline text-xs">{lead.contactEmail}</a>
                            ) : "—"}
                            {lead.contactPhone && <div className="text-xs text-slate-400">{lead.contactPhone}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-500">{lead.source}</span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={lead.status}
                              onChange={(e) => updateStatusMut.mutate({ id: lead.id, status: e.target.value as any })}
                              className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer ${
                                statusOptions.find(s => s.value === lead.status)?.color || "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {lead.contactEmail && (
                                <a
                                  href={`/mail?compose=1&to=${lead.contactEmail}&company=${encodeURIComponent(lead.companyName)}`}
                                  className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1 border border-emerald-200 rounded px-2 py-1 hover:bg-emerald-50"
                                >
                                  <Mail className="h-3 w-3" />发邮件
                                </a>
                              )}
                              {lead.contactLinkedin && (
                                <a href={lead.contactLinkedin} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50">
                                  <Linkedin className="h-3 w-3" />LinkedIn
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 保存线索弹窗 */}
      <Dialog open={saveDialog.open} onOpenChange={(o) => setSaveDialog({ open: o })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-emerald-600" />
              存入线索库
            </DialogTitle>
          </DialogHeader>
          {saveDialog.company && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">公司名称</span>
                  <span className="font-medium">{saveDialog.company.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">国家/地区</span>
                  <span>{saveDialog.company.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">行业</span>
                  <span>{saveDialog.company.industry}</span>
                </div>
                {saveDialog.contact && (
                  <>
                    <div className="border-t border-slate-200 pt-2 mt-2" />
                    <div className="flex justify-between">
                      <span className="text-slate-500">联系人</span>
                      <span className="font-medium">{saveDialog.contact.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">职务</span>
                      <span>{saveDialog.contact.title}</span>
                    </div>
                    {saveDialog.contact.email && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">邮箱</span>
                        <span className="text-blue-600">{saveDialog.contact.email}</span>
                      </div>
                    )}
                    {saveDialog.contact.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">电话</span>
                        <span>{saveDialog.contact.phone}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setSaveDialog({ open: false })}>取消</Button>
                <Button
                  onClick={confirmSaveLead}
                  disabled={saveLeadMut.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  {saveLeadMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  确认保存
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* API 配置弹窗 */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-600" />
              获客渠道 API 配置
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-slate-500 text-xs">在服务器 <code className="bg-slate-100 px-1 rounded">.env</code> 文件中配置以下环境变量以启用各渠道：</p>

            {[
              {
                name: "Google Custom Search",
                active: !!apiStatus?.google,
                vars: ["GOOGLE_CSE_API_KEY", "GOOGLE_CSE_ID"],
                desc: "免费100次/天，在 console.cloud.google.com 创建 Custom Search API",
                link: "https://developers.google.com/custom-search/v1/introduction",
                plan: "短期",
              },
              {
                name: "Apollo.io",
                active: !!apiStatus?.apollo,
                vars: ["APOLLO_API_KEY"],
                desc: "免费版每月50次联系人导出，在 apollo.io 注册获取",
                link: "https://app.apollo.io/#/settings/integrations/api",
                plan: "短期",
              },
              {
                name: "Hunter.io",
                active: !!apiStatus?.hunter,
                vars: ["HUNTER_API_KEY"],
                desc: "免费版每月25次域名搜索，在 hunter.io 注册获取",
                link: "https://hunter.io/api",
                plan: "短期",
              },
              {
                name: "HubSpot",
                active: !!apiStatus?.hubspot,
                vars: ["HUBSPOT_ACCESS_TOKEN"],
                desc: "免费版CRM，在 HubSpot 创建私有应用获取 Access Token",
                link: "https://developers.hubspot.com/docs/api/private-apps",
                plan: "短期",
              },
              {
                name: "LinkedIn Sales Navigator",
                active: !!apiStatus?.linkedin,
                vars: ["LINKEDIN_ACCESS_TOKEN"],
                desc: "月$99，需申请 LinkedIn Partner Program 获取 API 权限",
                link: "https://learn.microsoft.com/en-us/linkedin/sales/",
                plan: "中期",
              },
            ].map((channel) => (
              <div key={channel.name} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${channel.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className="font-medium text-slate-800">{channel.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${channel.plan === "短期" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                      {channel.plan}
                    </span>
                  </div>
                  <span className={`text-xs ${channel.active ? "text-emerald-600" : "text-slate-400"}`}>
                    {channel.active ? "✓ 已配置" : "未配置"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {channel.vars.map(v => (
                    <code key={v} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{v}</code>
                  ))}
                </div>
                <p className="text-xs text-slate-500">{channel.desc}</p>
                <a href={channel.link} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                  查看文档 <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
