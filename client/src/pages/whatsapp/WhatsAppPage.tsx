import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, MessageCircle, Search, Phone, Globe,
  ExternalLink, QrCode, Info, Users, ChevronRight,
  RefreshCw, Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// 模拟联系人列表（来自海外线索库）
const CONTACTS = [
  { id: "1", name: "Klaus Weber", company: "MedCare Europe GmbH", country: "德国", phone: "+4915212345678", lastMsg: "We are interested in your products", time: "10:32", unread: 2, avatar: "KW" },
  { id: "2", name: "Yuki Tanaka", company: "MediTec Japan", country: "日本", phone: "+819012345678", lastMsg: "Please send the quotation", time: "昨天", unread: 0, avatar: "YT" },
  { id: "3", name: "Ahmed Al-Rashid", company: "GlobalMed Trading", country: "阿联酋", phone: "+97150123456", lastMsg: "Order confirmed, please arrange shipment", time: "周一", unread: 0, avatar: "AA" },
  { id: "4", name: "Sarah Johnson", company: "AmeriCare Devices", country: "美国", phone: "+12025551234", lastMsg: "Can you provide CE certificate?", time: "上周", unread: 1, avatar: "SJ" },
  { id: "5", name: "David Lim", company: "HealthTech Singapore", country: "新加坡", phone: "+6591234567", lastMsg: "Hello, I found your products on MedicalExpo", time: "上周", unread: 0, avatar: "DL" },
];

export default function WhatsAppPage() {
  const [, setLocation] = useLocation();
  const [searchContact, setSearchContact] = useState("");
  const [selectedContact, setSelectedContact] = useState<typeof CONTACTS[0] | null>(null);
  const [isEmbedMode, setIsEmbedMode] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const filteredContacts = CONTACTS.filter(
    (c) =>
      c.name.toLowerCase().includes(searchContact.toLowerCase()) ||
      c.company.toLowerCase().includes(searchContact.toLowerCase())
  );

  const openWhatsAppWeb = (contact?: typeof CONTACTS[0]) => {
    if (contact) {
      const cleanPhone = contact.phone.replace(/[^0-9]/g, "");
      window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}`, "_blank");
    } else {
      window.open("https://web.whatsapp.com", "_blank");
    }
  };

  const openWaMe = (contact: typeof CONTACTS[0]) => {
    const cleanPhone = contact.phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
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
            <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800">WhatsApp 工作台</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setLocation("/leads/overseas")}
          >
            <Users className="h-3.5 w-3.5 mr-1" />
            海外线索库
          </Button>
          <Button
            size="sm"
            className="text-xs bg-[#25D366] hover:bg-[#20b858] text-white"
            onClick={() => openWhatsAppWeb()}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            打开 WhatsApp Web
          </Button>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="flex flex-1 overflow-hidden gap-3 p-3">
        {/* 左侧联系人列表 */}
        <div className="w-72 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden flex-shrink-0">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索联系人..."
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
          <div className="text-xs text-gray-400 px-3 py-2 font-medium">海外线索联系人</div>
          <div className="flex-1 overflow-auto">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 ${selectedContact?.id === contact.id ? "bg-green-50 border-l-2 border-l-[#25D366]" : ""}`}
              >
                <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {contact.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800 truncate">{contact.name}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">{contact.time}</span>
                  </div>
                  <div className="text-xs text-gray-400 truncate">{contact.company}</div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">{contact.lastMsg}</div>
                </div>
                {contact.unread > 0 && (
                  <div className="w-4 h-4 rounded-full bg-[#25D366] text-white text-[10px] flex items-center justify-center flex-shrink-0">
                    {contact.unread}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 右侧主区域 */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          {selectedContact ? (
            /* 选中联系人后显示操作面板 */
            <div className="flex flex-col h-full gap-3">
              {/* 联系人信息卡 */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold">
                      {selectedContact.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{selectedContact.name}</div>
                      <div className="text-sm text-gray-500">{selectedContact.company} · {selectedContact.country}</div>
                      <div className="text-xs text-gray-400">{selectedContact.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="text-xs bg-[#25D366] hover:bg-[#20b858] text-white"
                      onClick={() => openWhatsAppWeb(selectedContact)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      在 WhatsApp Web 中打开
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => openWaMe(selectedContact)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      wa.me 快捷链接
                    </Button>
                  </div>
                </div>
              </div>

              {/* WhatsApp Web 嵌入区域 */}
              <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-[#f0f2f5] flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#25D366]" />
                    <span className="text-sm font-medium text-gray-700">WhatsApp Web</span>
                    <span className="text-xs text-gray-400">— {selectedContact.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-gray-500"
                      onClick={() => openWhatsAppWeb(selectedContact)}
                    >
                      <Maximize2 className="h-3.5 w-3.5 mr-1" />
                      全屏打开
                    </Button>
                  </div>
                </div>

                {/* 说明区域（WhatsApp Web 因安全策略无法直接嵌入 iframe） */}
                <div className="flex-1 flex items-center justify-center bg-[#efeae2]">
                  <div className="text-center max-w-md p-8">
                    <div className="w-20 h-20 rounded-full bg-[#25D366] flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      与 {selectedContact.name} 对话
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      WhatsApp Web 因安全策略不允许直接嵌入，点击下方按钮在新窗口中打开，扫码登录后即可直接对话。
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        className="w-full bg-[#25D366] hover:bg-[#20b858] text-white"
                        onClick={() => openWhatsAppWeb(selectedContact)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        在 WhatsApp Web 中打开对话
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => openWaMe(selectedContact)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        通过 wa.me 链接发送消息
                      </Button>
                    </div>
                    <div className="mt-4 p-3 bg-white rounded-lg text-left">
                      <div className="flex items-start gap-2">
                        <QrCode className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500">
                          首次使用需要用手机扫码登录 WhatsApp Web。打开手机 WhatsApp → 设置 → 关联设备 → 扫描二维码
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 未选中联系人时显示引导页 */
            <div className="flex-1 bg-white rounded-xl border border-gray-200 flex items-center justify-center">
              <div className="text-center max-w-lg p-8">
                <div className="w-24 h-24 rounded-full bg-[#25D366] flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">WhatsApp 工作台</h2>
                <p className="text-sm text-gray-500 mb-6">
                  从左侧选择联系人，或直接打开 WhatsApp Web 与海外客户沟通。发送消息后在线索库中记录跟进情况。
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { icon: MessageCircle, title: "WhatsApp Web", desc: "扫码登录后在浏览器中收发消息", color: "green", action: () => openWhatsAppWeb() },
                    { icon: Users, title: "海外线索库", desc: "管理所有海外客户联系人", color: "blue", action: () => setLocation("/leads/overseas") },
                    { icon: Globe, title: "wa.me 快捷发送", desc: "输入号码直接发起对话", color: "teal", action: () => { const phone = prompt("输入WhatsApp号码（含国家区号）："); if (phone) window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank"); } },
                    { icon: Info, title: "升级 Business API", desc: "实现系统内直接收发消息", color: "purple", action: () => toast.info("需要申请 Meta WhatsApp Business API，约需 1-2 周审核") },
                  ].map((item) => (
                    <button
                      key={item.title}
                      onClick={item.action}
                      className={`p-4 rounded-xl border-2 border-${item.color}-200 hover:border-${item.color}-400 hover:bg-${item.color}-50 transition-all text-left`}
                    >
                      <item.icon className={`h-6 w-6 text-${item.color}-500 mb-2`} />
                      <div className="font-medium text-gray-800 text-sm">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>

                <Button
                  className="w-full bg-[#25D366] hover:bg-[#20b858] text-white"
                  onClick={() => openWhatsAppWeb()}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  打开 WhatsApp Web（扫码登录）
                </Button>

                <div className="mt-4 p-3 bg-amber-50 rounded-lg flex items-start gap-2 text-left">
                  <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>关于系统内嵌：</strong>WhatsApp Web 因安全策略（X-Frame-Options）不允许被嵌入其他网页。如需在系统内直接收发消息，需申请 Meta WhatsApp Business API（需要企业认证，约 1-2 周）。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
