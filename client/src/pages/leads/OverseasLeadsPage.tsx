import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Search, Plus, Globe, Phone, MessageCircle,
  Mail, ExternalLink, Upload, MapPin, ChevronLeft, RefreshCw,
  Eye, Sparkles, Building2, Users, Target, CheckCircle2,
  Clock, XCircle, AlertCircle, TrendingUp, FileText,
  Linkedin, Download, Send, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const COUNTRIES = [
  "全部", "德国", "日本", "美国", "阿联酋", "英国", "法国", "荷兰",
  "新加坡", "韩国", "澳大利亚", "加拿大", "印度", "巴西", "沙特阿拉伯",
];

const REGIONS = ["全部地区", "欧洲", "亚太", "中东", "北美", "南美", "非洲"];

const STATUS_CONFIG = {
  new: { label: "新线索", color: "bg-blue-100 text-blue-700" },
  contacted: { label: "已联系", color: "bg-yellow-100 text-yellow-700" },
  interested: { label: "有意向", color: "bg-orange-100 text-orange-700" },
  quoted: { label: "已报价", color: "bg-purple-100 text-purple-700" },
  won: { label: "已成交", color: "bg-green-100 text-green-700" },
  lost: { label: "已流失", color: "bg-gray-100 text-gray-500" },
};

interface OverseasLead {
  id: string;
  company: string;
  contact: string;
  title: string;
  email: string;
  whatsapp?: string;
  phone?: string;
  linkedin?: string;
  country: string;
  region: string;
  type: string;
  status: keyof typeof STATUS_CONFIG;
  source: string;
  notes?: string;
  createdAt: string;
  grade: "A" | "B" | "C";
}

const MOCK_LEADS: OverseasLead[] = [
  {
    id: "1",
    company: "MedCare Europe GmbH",
    contact: "Klaus Weber",
    title: "Procurement Director",
    email: "k.weber@medcare-eu.de",
    whatsapp: "+4915212345678",
    country: "德国",
    region: "欧洲",
    type: "经销商",
    status: "interested",
    source: "邮件协同",
    notes: "Interested in silicone tube products, budget ~€50,000",
    createdAt: "2026-03-01",
    grade: "A",
  },
  {
    id: "2",
    company: "MediTec Japan Co., Ltd.",
    contact: "Yuki Tanaka",
    title: "Import Manager",
    email: "y.tanaka@meditec-jp.co.jp",
    whatsapp: "+819012345678",
    country: "日本",
    region: "亚太",
    type: "进口商",
    status: "contacted",
    source: "展会",
    notes: "Met at CMEF Shanghai, interested in exclusive distribution",
    createdAt: "2026-03-03",
    grade: "A",
  },
  {
    id: "3",
    company: "GlobalMed Trading LLC",
    contact: "Ahmed Al-Rashid",
    title: "CEO",
    email: "ahmed@globalmed-uae.com",
    whatsapp: "+97150123456",
    country: "阿联酋",
    region: "中东",
    type: "经销商",
    status: "won",
    source: "Apollo.io",
    notes: "Order confirmed, USD 47,600",
    createdAt: "2026-02-15",
    grade: "A",
  },
  {
    id: "4",
    company: "AmeriCare Devices Inc.",
    contact: "Sarah Johnson",
    title: "Supply Chain Manager",
    email: "s.johnson@americare.com",
    country: "美国",
    region: "北美",
    type: "医疗集团",
    status: "quoted",
    source: "Google搜索",
    notes: "Sent quotation for catheter products",
    createdAt: "2026-02-20",
    grade: "B",
  },
  {
    id: "5",
    company: "HealthTech Singapore Pte Ltd",
    contact: "David Lim",
    title: "Purchasing Manager",
    email: "david.lim@healthtech-sg.com",
    whatsapp: "+6591234567",
    country: "新加坡",
    region: "亚太",
    type: "经销商",
    status: "new",
    source: "MedicalExpo",
    createdAt: "2026-03-07",
    grade: "B",
  },
];

// 搜索结果模拟
const MOCK_SEARCH_RESULTS = [
  {
    id: "s1",
    company: "Braun Medical GmbH",
    website: "braun-medical.de",
    country: "德国",
    industry: "医疗器械经销商",
    description: "Leading distributor of medical consumables in Germany, covering 500+ hospitals",
    email: "purchasing@braun-medical.de",
    source: "MedicalExpo",
  },
  {
    id: "s2",
    company: "Nihon Koden Medical",
    website: "nihonkoden-medical.co.jp",
    country: "日本",
    industry: "医疗设备进口商",
    description: "Major medical device importer in Japan with 30+ years experience",
    email: "import@nihonkoden.co.jp",
    source: "Google搜索",
  },
  {
    id: "s3",
    company: "MedSupply Middle East",
    website: "medsupply-me.com",
    country: "阿联酋",
    industry: "医疗耗材批发商",
    description: "Wholesale medical supplies across GCC countries, 200+ hospital clients",
    email: "procurement@medsupply-me.com",
    source: "Apollo.io",
  },
  {
    id: "s4",
    company: "Pacific Medical Supplies",
    website: "pacificmed.com.au",
    country: "澳大利亚",
    industry: "医疗器械经销商",
    description: "Australia's leading medical device distributor, TGA certified",
    email: "sales@pacificmed.com.au",
    source: "Thomasnet",
  },
];

// 平台导航
const PLATFORMS = [
  { name: "Apollo.io", desc: "全球B2B联系人数据库，2.7亿联系人，有免费版", url: "https://app.apollo.io", color: "orange", tag: "推荐" },
  { name: "LinkedIn Sales Nav", desc: "精准开发高价值经销商，月$99起", url: "https://business.linkedin.com/sales-solutions", color: "blue", tag: "中期" },
  { name: "Hunter.io", desc: "域名查邮箱，免费25次/月", url: "https://hunter.io", color: "yellow", tag: "免费" },
  { name: "MedicalExpo", desc: "全球最大医疗器械采购平台，100万+买家", url: "https://www.medicalexpo.com", color: "green", tag: "免费" },
  { name: "ZoomInfo", desc: "医疗B2B数据龙头，年费$15,000+", url: "https://www.zoominfo.com", color: "purple", tag: "高端" },
  { name: "Cognism", desc: "欧洲合规优先，GDPR友好", url: "https://www.cognism.com", color: "indigo", tag: "欧洲" },
  { name: "Thomasnet", desc: "北美工业/医疗采购平台", url: "https://www.thomasnet.com", color: "red", tag: "北美" },
  { name: "Lusha", desc: "浏览器插件，LinkedIn上直接显示联系方式", url: "https://www.lusha.com", color: "pink", tag: "插件" },
];

export default function OverseasLeadsPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"leads" | "search" | "platforms" | "import">("leads");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("全部");
  const [selectedRegion, setSelectedRegion] = useState("全部地区");
  const [leads, setLeads] = useState<OverseasLead[]>(MOCK_LEADS);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<OverseasLead | null>(null);

  // 搜索相关
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCountry, setSearchCountry] = useState("全部");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof MOCK_SEARCH_RESULTS>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // AI生成开发信
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTarget, setEmailTarget] = useState<OverseasLead | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // 新建线索
  const [newLead, setNewLead] = useState({
    company: "", contact: "", title: "", email: "", whatsapp: "", phone: "",
    country: "德国", region: "欧洲", type: "经销商", grade: "B" as "A" | "B" | "C",
    source: "手动录入", notes: "",
  });

  const filteredLeads = leads.filter((l) => {
    const matchKeyword = !searchKeyword || l.company.toLowerCase().includes(searchKeyword.toLowerCase()) || l.contact.toLowerCase().includes(searchKeyword.toLowerCase()) || l.email.includes(searchKeyword);
    const matchCountry = selectedCountry === "全部" || l.country === selectedCountry;
    const matchRegion = selectedRegion === "全部地区" || l.region === selectedRegion;
    return matchKeyword && matchCountry && matchRegion;
  });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    interested: leads.filter((l) => l.status === "interested" || l.status === "quoted").length,
    won: leads.filter((l) => l.status === "won").length,
    gradeA: leads.filter((l) => l.grade === "A").length,
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { toast.error("请输入搜索关键词"); return; }
    setIsSearching(true);
    setHasSearched(false);
    await new Promise((r) => setTimeout(r, 1500));
    setSearchResults(MOCK_SEARCH_RESULTS);
    setHasSearched(true);
    setIsSearching(false);
  };

  const addToLeads = (result: typeof MOCK_SEARCH_RESULTS[0]) => {
    const lead: OverseasLead = {
      id: Date.now().toString(),
      company: result.company,
      contact: "待补全",
      title: "Procurement Manager",
      email: result.email,
      country: result.country,
      region: "欧洲",
      type: result.industry,
      status: "new",
      source: result.source,
      notes: result.description,
      createdAt: new Date().toISOString().split("T")[0],
      grade: "B",
    };
    setLeads([lead, ...leads]);
    toast.success(`已将 ${result.company} 添加到线索库`);
  };

  const generateEmail = async (lead: OverseasLead) => {
    setEmailTarget(lead);
    setShowEmailDialog(true);
    setIsGenerating(true);
    setGeneratedEmail("");
    try {
      // 调用AI生成开发信
      await new Promise((r) => setTimeout(r, 2000));
      setGeneratedEmail(`Subject: Partnership Opportunity - Medical Consumables from Shenyun Medical

Dear ${lead.contact},

I hope this message finds you well. My name is Liu Yuan, and I represent Shenyun Medical Co., Ltd., a leading manufacturer of high-quality medical consumables based in China.

We specialize in:
• Silicone tubes and catheters (ISO 13485 certified)
• Surgical instrument handles and accessories
• Single-use medical consumables

I came across ${lead.company} and believe there could be a strong synergy between our companies. We currently supply to hospitals and distributors across 30+ countries.

I would love to schedule a brief call to explore potential collaboration opportunities. Could you spare 15-20 minutes this week or next?

Best regards,
Liu Yuan
Sales Manager | Shenyun Medical Co., Ltd.
Email: liuyuan@shenyun-medical.com
WhatsApp: +86 138 XXXX XXXX`);
    } catch (e) {
      toast.error("生成失败，请重试");
    }
    setIsGenerating(false);
  };

  const sendViaEmail = (lead: OverseasLead) => {
    setLocation("/mail");
    toast.info("已跳转到邮件协同，请选择该联系人发送");
  };

  const sendViaWhatsApp = (lead: OverseasLead) => {
    if (lead.whatsapp) {
      const cleanPhone = lead.whatsapp.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${cleanPhone}`, "_blank");
    } else {
      toast.error("该联系人暂无 WhatsApp 号码");
    }
  };

  const handleAddLead = () => {
    if (!newLead.company || !newLead.contact || !newLead.email) {
      toast.error("请填写公司名称、联系人和邮箱");
      return;
    }
    const lead: OverseasLead = {
      id: Date.now().toString(),
      ...newLead,
      status: "new",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setLeads([lead, ...leads]);
    setShowAddDialog(false);
    toast.success("线索已添加");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>返回 ERP</span>
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800">海外获客</span>
          </div>
          <button onClick={() => setLocation("/leads/domestic")} className="text-xs text-green-600 hover:underline flex items-center gap-1 ml-2">
            <ChevronLeft className="h-3 w-3" /> 切换到国内获客
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setLocation("/whatsapp")}>
            <MessageCircle className="h-3.5 w-3.5 mr-1 text-[#25D366]" />
            WhatsApp 工作台
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            新建线索
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-3 px-4 py-3 flex-shrink-0">
        {[
          { label: "总线索", value: stats.total, color: "text-gray-700", bg: "bg-white" },
          { label: "新线索", value: stats.new, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "跟进中", value: stats.interested, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "已成交", value: stats.won, color: "text-green-600", bg: "bg-green-50" },
          { label: "A级线索", value: stats.gradeA, color: "text-red-600", bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-lg px-4 py-3 border border-gray-100`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 标签页 */}
      <div className="flex gap-1 px-4 flex-shrink-0">
        {[
          { key: "leads", label: "线索库", icon: Users },
          { key: "search", label: "搜索发现", icon: Search },
          { key: "platforms", label: "数据平台", icon: Globe },
          { key: "import", label: "批量导入", icon: Upload },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? "bg-white text-blue-700 font-medium border border-b-white border-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden bg-white border border-gray-200 mx-4 mb-4 rounded-b-lg rounded-tr-lg">
        {activeTab === "leads" && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="搜索公司、联系人、邮箱..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} className="pl-8 h-8 text-sm" />
              </div>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-xs text-gray-400 ml-auto">{filteredLeads.length} 条</span>
            </div>
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs w-8">级别</TableHead>
                    <TableHead className="text-xs">公司</TableHead>
                    <TableHead className="text-xs">联系人</TableHead>
                    <TableHead className="text-xs">邮箱</TableHead>
                    <TableHead className="text-xs">国家</TableHead>
                    <TableHead className="text-xs">类型</TableHead>
                    <TableHead className="text-xs">状态</TableHead>
                    <TableHead className="text-xs">来源</TableHead>
                    <TableHead className="text-xs text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const statusCfg = STATUS_CONFIG[lead.status];
                    return (
                      <TableRow key={lead.id} className="hover:bg-gray-50">
                        <TableCell>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${lead.grade === "A" ? "bg-red-100 text-red-600" : lead.grade === "B" ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-500"}`}>{lead.grade}</span>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{lead.company}</TableCell>
                        <TableCell className="text-sm">
                          <div>{lead.contact}</div>
                          <div className="text-xs text-gray-400">{lead.title}</div>
                        </TableCell>
                        <TableCell className="text-sm text-blue-600">{lead.email}</TableCell>
                        <TableCell className="text-sm">{lead.country}</TableCell>
                        <TableCell><span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{lead.type}</span></TableCell>
                        <TableCell><span className={`text-xs px-1.5 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span></TableCell>
                        <TableCell className="text-xs text-gray-500">{lead.source}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => generateEmail(lead)} title="AI生成开发信" className="p-1 rounded hover:bg-purple-50 text-purple-600">
                              <Sparkles className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => sendViaEmail(lead)} title="发邮件" className="p-1 rounded hover:bg-blue-50 text-blue-600">
                              <Mail className="h-3.5 w-3.5" />
                            </button>
                            {lead.whatsapp && (
                              <button onClick={() => sendViaWhatsApp(lead)} title="发WhatsApp" className="p-1 rounded hover:bg-green-50 text-[#25D366]">
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button onClick={() => { setSelectedLead(lead); setShowDetailDialog(true); }} title="查看详情" className="p-1 rounded hover:bg-gray-100 text-gray-500">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredLeads.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Globe className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无海外线索，点击「搜索发现」找到目标客户</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "search" && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="输入关键词，如：silicone tube distributor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Select value={searchCountry} onValueChange={setSearchCountry}>
                <SelectTrigger className="w-28 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={isSearching} className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm">
                {isSearching ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />搜索中...</> : <><Search className="h-4 w-4 mr-1" />搜索</>}
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {/* 快速搜索标签 */}
              {!hasSearched && (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-2">快速搜索：</div>
                  <div className="flex flex-wrap gap-2">
                    {["medical device distributor Germany", "surgical instrument importer Japan", "medical consumables wholesaler UAE", "hospital equipment supplier USA", "silicone tube manufacturer Europe"].map((q) => (
                      <button key={q} onClick={() => { setSearchQuery(q); }} className="text-xs px-3 py-1.5 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isSearching && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">正在搜索全球医疗器械采购商...</p>
                    <p className="text-xs text-gray-400 mt-1">数据来源：Google + MedicalExpo + Apollo.io</p>
                  </div>
                </div>
              )}

              {hasSearched && searchResults.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">找到 {searchResults.length} 家目标公司</span>
                    <span className="text-xs text-gray-400">关键词：{searchQuery}</span>
                  </div>
                  <div className="space-y-3">
                    {searchResults.map((result) => (
                      <div key={result.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-800">{result.company}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">{result.country}</span>
                              <span className="text-xs text-gray-400">{result.source}</span>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">{result.description}</div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-blue-600">{result.website}</span>
                              <span className="text-green-600 flex items-center gap-1">
                                <Mail className="h-3 w-3" />{result.email}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <Button size="sm" className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => addToLeads(result)}>
                              <Plus className="h-3 w-3 mr-1" />加入线索库
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => window.open(`https://${result.website}`, "_blank")}>
                              <ExternalLink className="h-3 w-3 mr-1" />访问官网
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-600">
                      配置 Google Custom Search API Key 和 Apollo.io API Key 后，可搜索真实全球数据。当前为演示数据。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "platforms" && (
          <div className="flex-1 overflow-auto p-4">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-800 mb-1">全球医疗获客数据平台</h3>
              <p className="text-xs text-gray-500">根据您的预算和目标市场选择合适的平台，找到目标客户后导入线索库</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((platform) => (
                <div key={platform.name} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-gray-800 text-sm">{platform.name}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      platform.tag === "推荐" ? "bg-orange-100 text-orange-600" :
                      platform.tag === "免费" ? "bg-green-100 text-green-600" :
                      platform.tag === "高端" ? "bg-purple-100 text-purple-600" :
                      "bg-blue-100 text-blue-600"
                    }`}>{platform.tag}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{platform.desc}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-7"
                    onClick={() => window.open(platform.url, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    前往 {platform.name}
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-700">
                <strong>建议路径：</strong>先用 Apollo.io 免费版（每月50个联系人）验证效果，配合 Hunter.io 验证邮箱，通过邮件协同发送开发信。有预算后再考虑 LinkedIn Sales Navigator 或 ZoomInfo。
              </p>
            </div>
          </div>
        )}

        {activeTab === "import" && (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-base font-semibold text-gray-800 mb-4">批量导入海外线索</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { title: "Apollo.io 导出导入", desc: "从Apollo.io导出CSV后批量导入", icon: Target, color: "orange" },
                  { title: "展会名片导入", desc: "Arab Health/Medica等展会名片", icon: Users, color: "blue" },
                  { title: "LinkedIn 联系人导入", desc: "从LinkedIn导出的联系人列表", icon: Linkedin, color: "indigo" },
                  { title: "自定义Excel导入", desc: "使用标准模板填写后导入", icon: Download, color: "green" },
                ].map((item) => (
                  <div
                    key={item.title}
                    className={`border-2 border-dashed border-${item.color}-200 rounded-xl p-5 hover:border-${item.color}-400 hover:bg-${item.color}-50 transition-colors cursor-pointer`}
                    onClick={() => toast.info("请先下载模板，填写后上传")}
                  >
                    <item.icon className={`h-8 w-8 text-${item.color}-500 mb-3`} />
                    <div className="font-medium text-gray-800 text-sm mb-1">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.desc}</div>
                  </div>
                ))}
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-2">拖拽 Excel/CSV 文件到此处，或点击上传</p>
                <p className="text-xs text-gray-400 mb-4">支持 .xlsx .xls .csv 格式，最大 10MB</p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info("模板下载功能开发中")}>
                    <Download className="h-3.5 w-3.5 mr-1" />下载标准模板
                  </Button>
                  <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => toast.info("请先下载模板填写后上传")}>
                    <Upload className="h-3.5 w-3.5 mr-1" />选择文件上传
                  </Button>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-2">标准模板字段说明：</div>
                <div className="grid grid-cols-3 gap-1 text-xs text-gray-500">
                  {["公司名称*", "联系人*", "职位", "邮箱*", "WhatsApp", "国家*", "客户类型", "线索来源", "备注"].map((f) => (
                    <span key={f} className="bg-white rounded px-2 py-1 border border-gray-200">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 新建线索弹窗 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>新建海外线索</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">公司名称 *</label>
              <Input value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} placeholder="Company Name" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">联系人 *</label>
              <Input value={newLead.contact} onChange={(e) => setNewLead({ ...newLead, contact: e.target.value })} placeholder="Contact Name" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">职位</label>
              <Input value={newLead.title} onChange={(e) => setNewLead({ ...newLead, title: e.target.value })} placeholder="Job Title" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">邮箱 *</label>
              <Input value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} placeholder="email@company.com" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">WhatsApp</label>
              <Input value={newLead.whatsapp} onChange={(e) => setNewLead({ ...newLead, whatsapp: e.target.value })} placeholder="+49 xxx xxx xxxx" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">国家</label>
              <Select value={newLead.country} onValueChange={(v) => setNewLead({ ...newLead, country: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.slice(1).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">线索来源</label>
              <Select value={newLead.source} onValueChange={(v) => setNewLead({ ...newLead, source: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["手动录入", "展会", "Apollo.io", "LinkedIn", "Hunter.io", "MedicalExpo", "邮件协同", "Google搜索"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">备注</label>
              <Textarea value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} placeholder="需求描述、跟进要点..." className="text-sm h-16 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button size="sm" onClick={handleAddLead} className="bg-blue-600 hover:bg-blue-700 text-white">保存线索</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI生成开发信弹窗 */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI 生成开发信 — {emailTarget?.company}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {isGenerating ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500 mr-2" />
                <span className="text-sm text-gray-500">智谱 GLM-4 正在生成个性化开发信...</span>
              </div>
            ) : (
              <Textarea
                value={generatedEmail}
                onChange={(e) => setGeneratedEmail(e.target.value)}
                className="h-64 text-sm font-mono"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(false)}>关闭</Button>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(generatedEmail); toast.success("已复制到剪贴板"); }}>
              复制内容
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setShowEmailDialog(false); setLocation("/mail"); toast.info("已跳转到邮件协同，请粘贴内容发送"); }}>
              <Send className="h-3.5 w-3.5 mr-1" />
              去邮件协同发送
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
