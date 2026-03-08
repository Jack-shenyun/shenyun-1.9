import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft, Search, Plus, Building2, Phone, MessageCircle,
  FileText, Upload, Bell, MapPin, Tag, ChevronRight, RefreshCw,
  Star, Filter, Download, Eye, Edit2, Trash2, AlertCircle,
  TrendingUp, Users, Target, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const PROVINCES = [
  "全国", "北京", "上海", "广东", "江苏", "浙江", "山东", "四川",
  "湖北", "湖南", "河南", "陕西", "福建", "重庆", "天津", "辽宁",
  "黑龙江", "吉林", "安徽", "江西", "贵州", "云南", "广西", "海南",
];

const CUSTOMER_TYPES = ["全部", "医院", "经销商", "配送商", "医疗集团", "招标代理"];

const STATUS_CONFIG = {
  new: { label: "新线索", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  contacted: { label: "已联系", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  interested: { label: "有意向", color: "bg-orange-100 text-orange-700", icon: TrendingUp },
  quoted: { label: "已报价", color: "bg-purple-100 text-purple-700", icon: FileText },
  won: { label: "已成交", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  lost: { label: "已流失", color: "bg-gray-100 text-gray-500", icon: XCircle },
};

interface Lead {
  id: string;
  company: string;
  contact: string;
  title: string;
  phone: string;
  wechat?: string;
  province: string;
  type: string;
  status: keyof typeof STATUS_CONFIG;
  source: string;
  notes?: string;
  createdAt: string;
  nextFollowUp?: string;
  grade: "A" | "B" | "C";
}

const MOCK_LEADS: Lead[] = [
  {
    id: "1",
    company: "北京协和医院",
    contact: "张主任",
    title: "设备科主任",
    phone: "010-12345678",
    wechat: "zhangzr_pumch",
    province: "北京",
    type: "医院",
    status: "interested",
    source: "展会",
    notes: "对硅胶导管有采购需求，预算约30万",
    createdAt: "2026-03-01",
    nextFollowUp: "2026-03-15",
    grade: "A",
  },
  {
    id: "2",
    company: "上海医疗器械有限公司",
    contact: "李总",
    title: "总经理",
    phone: "021-87654321",
    wechat: "li_medical_sh",
    province: "上海",
    type: "经销商",
    status: "contacted",
    source: "天眼查",
    notes: "覆盖上海及周边医院，有稳定客户群",
    createdAt: "2026-03-03",
    nextFollowUp: "2026-03-12",
    grade: "B",
  },
  {
    id: "3",
    company: "广州市医疗耗材配送中心",
    contact: "王采购",
    title: "采购经理",
    phone: "020-11223344",
    province: "广东",
    type: "配送商",
    status: "new",
    source: "招标网",
    notes: "正在招标一次性耗材，截止日期3月20日",
    createdAt: "2026-03-05",
    nextFollowUp: "2026-03-10",
    grade: "A",
  },
  {
    id: "4",
    company: "成都华西医院",
    contact: "陈科长",
    title: "采购科长",
    phone: "028-55667788",
    province: "四川",
    type: "医院",
    status: "quoted",
    source: "老客户推荐",
    notes: "已发报价单，等待反馈",
    createdAt: "2026-02-20",
    grade: "A",
  },
  {
    id: "5",
    company: "杭州医疗器械代理商",
    contact: "赵老板",
    title: "法人代表",
    phone: "0571-99887766",
    wechat: "zhao_medical_hz",
    province: "浙江",
    type: "经销商",
    status: "new",
    source: "企查查",
    createdAt: "2026-03-07",
    grade: "C",
  },
];

// 招标监控模拟数据
const MOCK_TENDERS = [
  {
    id: "t1",
    title: "一次性使用硅胶导尿管采购项目",
    hospital: "北京大学第三医院",
    province: "北京",
    amount: "约45万元",
    deadline: "2026-03-20",
    status: "进行中",
    url: "#",
  },
  {
    id: "t2",
    title: "手术室一次性耗材批量采购",
    hospital: "上海瑞金医院",
    province: "上海",
    amount: "约120万元",
    deadline: "2026-03-25",
    status: "进行中",
    url: "#",
  },
  {
    id: "t3",
    title: "ICU医疗耗材年度采购框架协议",
    hospital: "广州中山大学附属医院",
    province: "广东",
    amount: "约200万元",
    deadline: "2026-04-01",
    status: "即将开始",
    url: "#",
  },
  {
    id: "t4",
    title: "硅胶管类医疗器械采购",
    hospital: "成都华西医院",
    province: "四川",
    amount: "约80万元",
    deadline: "2026-03-18",
    status: "进行中",
    url: "#",
  },
];

export default function DomesticLeadsPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"leads" | "tender" | "import">("leads");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("全国");
  const [selectedType, setSelectedType] = useState("全部");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [tenderKeyword, setTenderKeyword] = useState("硅胶管");
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);

  // 新建线索表单
  const [newLead, setNewLead] = useState({
    company: "",
    contact: "",
    title: "",
    phone: "",
    wechat: "",
    province: "北京",
    type: "经销商",
    grade: "B" as "A" | "B" | "C",
    source: "手动录入",
    notes: "",
  });

  const filteredLeads = leads.filter((l) => {
    const matchKeyword =
      !searchKeyword ||
      l.company.includes(searchKeyword) ||
      l.contact.includes(searchKeyword) ||
      l.phone.includes(searchKeyword);
    const matchProvince = selectedProvince === "全国" || l.province === selectedProvince;
    const matchType = selectedType === "全部" || l.type === selectedType;
    const matchStatus = selectedStatus === "all" || l.status === selectedStatus;
    return matchKeyword && matchProvince && matchType && matchStatus;
  });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    interested: leads.filter((l) => l.status === "interested" || l.status === "quoted").length,
    won: leads.filter((l) => l.status === "won").length,
    gradeA: leads.filter((l) => l.grade === "A").length,
  };

  const handleAddLead = () => {
    if (!newLead.company || !newLead.contact || !newLead.phone) {
      toast.error("请填写公司名称、联系人和电话");
      return;
    }
    const lead: Lead = {
      id: Date.now().toString(),
      ...newLead,
      status: "new",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setLeads([lead, ...leads]);
    setShowAddDialog(false);
    setNewLead({ company: "", contact: "", title: "", phone: "", wechat: "", province: "北京", type: "经销商", grade: "B", source: "手动录入", notes: "" });
    toast.success("线索已添加");
  };

  const handleWhatsApp = (lead: Lead) => {
    if (lead.phone) {
      const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${cleanPhone}`, "_blank");
    }
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  const convertToTender = (tender: typeof MOCK_TENDERS[0]) => {
    const lead: Lead = {
      id: Date.now().toString(),
      company: tender.hospital,
      contact: "采购部门",
      title: "采购负责人",
      phone: "",
      province: tender.province,
      type: "医院",
      status: "new",
      source: "招标监控",
      notes: `招标项目：${tender.title}，预算：${tender.amount}，截止：${tender.deadline}`,
      createdAt: new Date().toISOString().split("T")[0],
      grade: "A",
    };
    setLeads([lead, ...leads]);
    toast.success(`已将「${tender.hospital}」添加到线索库`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>返回 ERP</span>
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800">国内获客</span>
          </div>
          <button
            onClick={() => setLocation("/leads/overseas")}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 ml-2"
          >
            切换到海外获客 <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700 text-white text-xs">
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
          { key: "tender", label: "招标监控", icon: Bell },
          { key: "import", label: "批量导入", icon: Upload },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? "bg-white text-green-700 font-medium border border-b-white border-gray-200"
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
            {/* 筛选栏 */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索公司、联系人、电话..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue placeholder="所有状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有状态</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-400 ml-auto">{filteredLeads.length} 条</span>
            </div>

            {/* 表格 */}
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs w-8">级别</TableHead>
                    <TableHead className="text-xs">公司名称</TableHead>
                    <TableHead className="text-xs">联系人</TableHead>
                    <TableHead className="text-xs">电话</TableHead>
                    <TableHead className="text-xs">省份</TableHead>
                    <TableHead className="text-xs">类型</TableHead>
                    <TableHead className="text-xs">状态</TableHead>
                    <TableHead className="text-xs">来源</TableHead>
                    <TableHead className="text-xs">下次跟进</TableHead>
                    <TableHead className="text-xs text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const statusCfg = STATUS_CONFIG[lead.status];
                    return (
                      <TableRow key={lead.id} className="hover:bg-gray-50">
                        <TableCell>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            lead.grade === "A" ? "bg-red-100 text-red-600" :
                            lead.grade === "B" ? "bg-yellow-100 text-yellow-600" :
                            "bg-gray-100 text-gray-500"
                          }`}>{lead.grade}</span>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{lead.company}</TableCell>
                        <TableCell className="text-sm">
                          <div>{lead.contact}</div>
                          <div className="text-xs text-gray-400">{lead.title}</div>
                        </TableCell>
                        <TableCell className="text-sm">{lead.phone}</TableCell>
                        <TableCell className="text-sm">{lead.province}</TableCell>
                        <TableCell>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{lead.type}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{lead.source}</TableCell>
                        <TableCell className="text-xs text-gray-500">{lead.nextFollowUp || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {lead.phone && (
                              <button
                                onClick={() => handleCall(lead.phone)}
                                title="拨打电话"
                                className="p-1 rounded hover:bg-green-50 text-green-600"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {lead.wechat && (
                              <button
                                title="微信"
                                className="p-1 rounded hover:bg-green-50 text-green-500"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => { setSelectedLead(lead); setShowDetailDialog(true); }}
                              title="查看详情"
                              className="p-1 rounded hover:bg-blue-50 text-blue-600"
                            >
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
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无线索，点击「新建线索」添加</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tender" && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="输入产品关键词监控招标..."
                  value={tenderKeyword}
                  onChange={(e) => setTenderKeyword(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white">
                <Bell className="h-3.5 w-3.5 mr-1" />
                订阅监控
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                立即抓取
              </Button>
              <a
                href="http://www.ccgp.gov.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                打开政府采购网 →
              </a>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">最新招标公告</span>
                <span className="text-xs text-gray-400">（关键词：{tenderKeyword}）</span>
                <span className="ml-auto text-xs text-gray-400">数据来源：中国政府采购网</span>
              </div>
              <div className="space-y-3">
                {MOCK_TENDERS.map((tender) => (
                  <div key={tender.id} className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            tender.status === "进行中" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          }`}>{tender.status}</span>
                          <span className="text-xs text-gray-400">{tender.province}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-800 mb-1">{tender.title}</div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {tender.hospital}
                          </span>
                          <span className="text-orange-600 font-medium">{tender.amount}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            截止：{tender.deadline}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => convertToTender(tender)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          加入线索库
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-600">
                  招标监控功能每天自动抓取中国政府采购网、各省招标平台的最新公告，匹配您订阅的关键词后推送提醒。当前为演示数据，配置服务器后可接入真实数据。
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "import" && (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-base font-semibold text-gray-800 mb-4">批量导入线索</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { title: "展会名片导入", desc: "适用于CMEF等展会后批量录入名片信息", icon: Users, color: "green" },
                  { title: "天眼查/企查查导入", desc: "从天眼查或企查查导出的Excel文件", icon: Building2, color: "blue" },
                  { title: "政府采购网导入", desc: "从政府采购网导出的招标信息", icon: FileText, color: "orange" },
                  { title: "自定义Excel导入", desc: "使用我们的标准模板填写后导入", icon: Download, color: "purple" },
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
                    <Download className="h-3.5 w-3.5 mr-1" />
                    下载标准模板
                  </Button>
                  <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => toast.info("请先下载模板填写后上传")}>
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    选择文件上传
                  </Button>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-2">标准模板字段说明：</div>
                <div className="grid grid-cols-3 gap-1 text-xs text-gray-500">
                  {["公司名称*", "联系人*", "职位", "电话*", "微信", "省份", "客户类型", "线索来源", "备注"].map((f) => (
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
          <DialogHeader>
            <DialogTitle>新建国内线索</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">公司名称 *</label>
              <Input value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} placeholder="医院/经销商名称" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">联系人 *</label>
              <Input value={newLead.contact} onChange={(e) => setNewLead({ ...newLead, contact: e.target.value })} placeholder="姓名" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">职位</label>
              <Input value={newLead.title} onChange={(e) => setNewLead({ ...newLead, title: e.target.value })} placeholder="采购经理/设备科主任" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">电话 *</label>
              <Input value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} placeholder="手机/座机" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">微信号</label>
              <Input value={newLead.wechat} onChange={(e) => setNewLead({ ...newLead, wechat: e.target.value })} placeholder="微信号（可选）" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">省份</label>
              <Select value={newLead.province} onValueChange={(v) => setNewLead({ ...newLead, province: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{PROVINCES.slice(1).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">客户类型</label>
              <Select value={newLead.type} onValueChange={(v) => setNewLead({ ...newLead, type: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CUSTOMER_TYPES.slice(1).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">线索来源</label>
              <Select value={newLead.source} onValueChange={(v) => setNewLead({ ...newLead, source: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["手动录入", "展会", "天眼查", "企查查", "招标网", "老客户推荐", "电话拜访"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">线索级别</label>
              <Select value={newLead.grade} onValueChange={(v) => setNewLead({ ...newLead, grade: v as "A" | "B" | "C" })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A级（高优先级）</SelectItem>
                  <SelectItem value="B">B级（中优先级）</SelectItem>
                  <SelectItem value="C">C级（低优先级）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">备注</label>
              <Textarea value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} placeholder="需求描述、跟进要点等..." className="text-sm h-16 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button size="sm" onClick={handleAddLead} className="bg-green-600 hover:bg-green-700 text-white">保存线索</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
