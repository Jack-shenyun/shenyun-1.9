import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { CustomerDetailDialog } from "@/components/CustomerDetailDialog";
import ModulePage, { Column, StatusBadge } from "@/components/ModulePage";
import FormDialog, { FormField } from "@/components/FormDialog";
import { Contact } from "lucide-react";
import DraftDrawer, { DraftItem } from "@/components/DraftDrawer";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  PAYMENT_CONDITION_OPTIONS,
  normalizePaymentCondition,
} from "@shared/paymentTerms";

interface Customer {
  id: number;
  code: string;
  name: string;
  shortName?: string;
  type: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  country?: string; // 海外客户国家
  province?: string; // 国内省份
  city?: string;
  address?: string;
  status: string;
  paymentTerms?: string;
  needInvoice?: boolean; // 是否开票
  taxNo?: string;
  taxRate?: string | number;
  bankAccount?: string;
  bankName?: string;
  salesPersonId?: number; // 销售负责人 ID
  salesPersonName?: string; // 销售负责人姓名
  source?: string; // 账期天数等扩展信息
  logoUrl?: string | null;
}

const statusMap: Record<string, any> = {
  active: { label: "正常", variant: "default" as const },
  inactive: { label: "停用", variant: "outline" as const },
  blacklist: { label: "黑名单", variant: "destructive" as const },
};

const typeMap: Record<string, string> = {
  overseas: "海外客户",
  domestic: "国内客户",
  dealer: "经销商",
  hospital: "医院",
};

// 中国34个省级行政区
const provinceOptions = [
  { label: "北京市", value: "北京市" },
  { label: "天津市", value: "天津市" },
  { label: "河北省", value: "河北省" },
  { label: "山西省", value: "山西省" },
  { label: "内蒙古自治区", value: "内蒙古自治区" },
  { label: "辽宁省", value: "辽宁省" },
  { label: "吉林省", value: "吉林省" },
  { label: "黑龙江省", value: "黑龙江省" },
  { label: "上海市", value: "上海市" },
  { label: "江苏省", value: "江苏省" },
  { label: "浙江省", value: "浙江省" },
  { label: "安徽省", value: "安徽省" },
  { label: "福建省", value: "福建省" },
  { label: "江西省", value: "江西省" },
  { label: "山东省", value: "山东省" },
  { label: "河南省", value: "河南省" },
  { label: "湖北省", value: "湖北省" },
  { label: "湖南省", value: "湖南省" },
  { label: "广东省", value: "广东省" },
  { label: "广西壮族自治区", value: "广西壮族自治区" },
  { label: "海南省", value: "海南省" },
  { label: "重庆市", value: "重庆市" },
  { label: "四川省", value: "四川省" },
  { label: "贵州省", value: "贵州省" },
  { label: "云南省", value: "云南省" },
  { label: "西藏自治区", value: "西藏自治区" },
  { label: "陕西省", value: "陕西省" },
  { label: "甘肃省", value: "甘肃省" },
  { label: "青海省", value: "青海省" },
  { label: "宁夏回族自治区", value: "宁夏回族自治区" },
  { label: "新疆维吾尔自治区", value: "新疆维吾尔自治区" },
  { label: "台湾省", value: "台湾省" },
  { label: "香港特别行政区", value: "香港特别行政区" },
  { label: "澳门特别行政区", value: "澳门特别行政区" },
];

// 常见国家列表
const countryOptions = [
  { label: "美国", value: "美国" },
  { label: "英国", value: "英国" },
  { label: "德国", value: "德国" },
  { label: "法国", value: "法国" },
  { label: "日本", value: "日本" },
  { label: "韩国", value: "韩国" },
  { label: "新加坡", value: "新加坡" },
  { label: "澳大利亚", value: "澳大利亚" },
  { label: "加拿大", value: "加拿大" },
  { label: "意大利", value: "意大利" },
  { label: "西班牙", value: "西班牙" },
  { label: "荷兰", value: "荷兰" },
  { label: "瑞士", value: "瑞士" },
  { label: "瑞典", value: "瑞典" },
  { label: "比利时", value: "比利时" },
  { label: "印度", value: "印度" },
  { label: "泰国", value: "泰国" },
  { label: "马来西亚", value: "马来西亚" },
  { label: "印度尼西亚", value: "印度尼西亚" },
  { label: "菲律宾", value: "菲律宾" },
  { label: "越南", value: "越南" },
  { label: "阿联酋", value: "阿联酋" },
  { label: "沙特阿拉伯", value: "沙特阿拉伯" },
  { label: "巴西", value: "巴西" },
  { label: "墨西哥", value: "墨西哥" },
  { label: "其他", value: "其他" },
];

const PAYMENT_DAYS_SOURCE_PREFIX = "__PAYMENT_DAYS__:";
const PAYMENT_DAYS_OPTIONS = [
  { label: "30天", value: "30" },
  { label: "60天", value: "60" },
  { label: "90天", value: "90" },
  { label: "120天", value: "120" },
];

const TAX_RATE_OPTIONS = [
  { label: "13%", value: "13" },
  { label: "9%", value: "9" },
  { label: "6%", value: "6" },
  { label: "3%", value: "3" },
  { label: "1%", value: "1" },
  { label: "0%", value: "0" },
];

const cityOptionsByProvince: Record<string, string[]> = {
  北京市: ["东城区", "西城区", "朝阳区", "海淀区", "丰台区", "通州区"],
  天津市: ["和平区", "河西区", "南开区", "滨海新区", "武清区"],
  上海市: ["黄浦区", "徐汇区", "浦东新区", "闵行区", "嘉定区"],
  重庆市: ["渝中区", "江北区", "南岸区", "沙坪坝区", "渝北区"],
  河北省: ["石家庄市", "唐山市", "秦皇岛市", "保定市"],
  山西省: ["太原市", "大同市", "长治市", "临汾市"],
  内蒙古自治区: ["呼和浩特市", "包头市", "赤峰市", "鄂尔多斯市"],
  辽宁省: ["沈阳市", "大连市", "鞍山市", "锦州市"],
  吉林省: ["长春市", "吉林市", "四平市", "延边州"],
  黑龙江省: ["哈尔滨市", "齐齐哈尔市", "牡丹江市", "佳木斯市"],
  江苏省: ["南京市", "苏州市", "无锡市", "常州市", "南通市"],
  浙江省: ["杭州市", "宁波市", "温州市", "绍兴市", "嘉兴市"],
  安徽省: ["合肥市", "芜湖市", "蚌埠市", "安庆市"],
  福建省: ["福州市", "厦门市", "泉州市", "漳州市"],
  江西省: ["南昌市", "赣州市", "九江市", "上饶市"],
  山东省: ["济南市", "青岛市", "烟台市", "潍坊市"],
  河南省: ["郑州市", "洛阳市", "新乡市", "南阳市"],
  湖北省: ["武汉市", "襄阳市", "宜昌市", "荆州市"],
  湖南省: ["长沙市", "株洲市", "湘潭市", "岳阳市"],
  广东省: ["广州市", "深圳市", "东莞市", "佛山市", "珠海市"],
  广西壮族自治区: ["南宁市", "柳州市", "桂林市", "北海市"],
  海南省: ["海口市", "三亚市", "儋州市"],
  四川省: ["成都市", "绵阳市", "德阳市", "宜宾市"],
  贵州省: ["贵阳市", "遵义市", "毕节市", "黔东南州"],
  云南省: ["昆明市", "曲靖市", "大理州", "红河州"],
  西藏自治区: ["拉萨市", "日喀则市", "林芝市"],
  陕西省: ["西安市", "咸阳市", "宝鸡市", "渭南市"],
  甘肃省: ["兰州市", "天水市", "酒泉市"],
  青海省: ["西宁市", "海东市", "海西州"],
  宁夏回族自治区: ["银川市", "石嘴山市", "吴忠市"],
  新疆维吾尔自治区: ["乌鲁木齐市", "喀什地区", "伊犁州"],
  台湾省: ["台北市", "新北市", "台中市", "高雄市"],
  香港特别行政区: ["香港岛", "九龙", "新界"],
  澳门特别行政区: ["花地玛堂区", "大堂区", "路凼填海区"],
};

function parseDepartments(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractPaymentDaysFromSource(source: unknown): string {
  const text = String(source ?? "");
  const match = text.match(/__PAYMENT_DAYS__:(\d{1,3})/);
  return match?.[1] ?? "";
}

function mergeSourceWithPaymentDays(source: unknown, payment: unknown, paymentDays: unknown): string | undefined {
  const cleaned = String(source ?? "")
    .replace(/__PAYMENT_DAYS__:\d{1,3}/g, "")
    .replace(/\|\|+/g, "|")
    .replace(/^\|+|\|+$/g, "")
    .trim();
  const normalized = normalizePaymentCondition(payment);
  const days = String(paymentDays ?? "").trim();
  if (normalized === "账期支付" && days) {
    return cleaned ? `${cleaned}|${PAYMENT_DAYS_SOURCE_PREFIX}${days}` : `${PAYMENT_DAYS_SOURCE_PREFIX}${days}`;
  }
  return cleaned || undefined;
}

function getNextLocalCustomerCode(records: Customer[], prefix: string = "KH"): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  let maxNum = 0;
  for (const item of records) {
    const match = String(item.code || "").match(pattern);
    if (!match) continue;
    const num = parseInt(match[1], 10);
    if (Number.isFinite(num) && num > maxNum) maxNum = num;
  }
  return `${prefix}-${String(maxNum + 1).padStart(5, "0")}`;
}

const baseFormFields: FormField[] = [
  { name: "code", label: "客户编码", type: "text", required: true, placeholder: "系统自动生成，可修改，如KH-00001" },
  { name: "name", label: "客户名称", type: "text", required: true, placeholder: "请输入客户名称" },
  {
    name: "type",
    label: "客户类型",
    type: "select",
    required: true,
    options: [
      { label: "海外客户", value: "overseas" },
      { label: "国内客户", value: "domestic" },
      { label: "经销商", value: "dealer" },
    ],
  },
  {
    name: "status",
    label: "状态",
    type: "select",
    required: true,
    defaultValue: "active",
    options: [
      { label: "正常", value: "active" },
      { label: "停用", value: "inactive" },
      { label: "黑名单", value: "blacklist" },
    ],
  },
  { name: "contactPerson", label: "联系人", type: "text", required: true, placeholder: "请输入联系人姓名" },
  { name: "phone", label: "联系电话", type: "text", required: true, placeholder: "请输入联系电话" },
  { name: "email", label: "电子邮箱", type: "email", placeholder: "请输入电子邮箱" },
  {
    name: "salesPersonId",
    label: "销售负责人",
    type: "select",
    required: true,
    options: [], // 将从用户表动态加载
  },
];

const columns: Column<Customer>[] = [
  { key: "code", title: "客户编码" },
  { key: "name", title: "客户名称" },
  {
    key: "type",
    title: "客户类型",
    render: (value) => <Badge variant="outline">{typeMap[value] || value}</Badge>,
  },
  { key: "contactPerson", title: "联系人" },
  { key: "phone", title: "联系电话" },
  {
    key: "province",
    title: "地区",
    render: (value, record) => record.country || value || "-",
  },
  {
    key: "salesPersonName",
    title: "销售负责人",
    render: (value) => value || "-",
  },
  {
    key: "status",
    title: "状态",
    render: (value) => <StatusBadge status={value} statusMap={statusMap} />,
  },
];

export default function CustomersPage() {
  // 从数据库加载客户数据
  const { data: customersData, refetch } = trpc.customers.list.useQuery();
  const { refetch: refetchNextCode } = trpc.customers.nextCode.useQuery(undefined, {
    enabled: false,
  });
  const createMutation = trpc.customers.create.useMutation();
  const updateMutation = trpc.customers.update.useMutation();
  const deleteMutation = trpc.customers.delete.useMutation();
  const [data, setData] = useState<Customer[]>([]);
  
  // 同步数据库数据到本地state
  useEffect(() => {
    if (customersData) {
      setData(customersData as Customer[]);
    }
  }, [customersData]);

  // 草稿列表
  const drafts = data.filter((d: any) => d.status === "inactive");
  const draftItems: DraftItem[] = drafts.map((d: any) => ({
    id: d.id,
    title: d.name || d.code,
    subtitle: d.code + (d.contactPerson ? ` · ${d.contactPerson}` : ""),
  }));

  const handleDraftEdit = (item: DraftItem) => {
    const record = data.find((d) => d.id === item.id);
    if (record) handleEdit(record);
  };
  const handleDraftDelete = (item: DraftItem) => {
    handleDelete(data.find((d) => d.id === item.id)!);
  };

  const matchesQuickFilters = (customer: Customer) =>
    customerTypeFilter === "all" || customer.type === customerTypeFilter;

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Customer | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Customer | null>(null);
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
  const [createDefaults, setCreateDefaults] = useState<Record<string, any>>({
    status: "active",
    type: "domestic",
  });

  // 动态表单字段状态
  const [customerType, setCustomerType] = useState<string>("domestic");
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [needInvoice, setNeedInvoice] = useState<boolean>(false);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  
  // 从数据库加载用户列表作为销售负责人选项
  const { data: usersData } = trpc.users.list.useQuery();
  const salesDepartmentUsers = (usersData || []).filter((u: any) =>
    parseDepartments(u.department).includes("销售部")
  );
  const salesPersonOptions = (salesDepartmentUsers.length > 0 ? salesDepartmentUsers : (usersData || [])).map((u: any) => ({
    label: u.name || u.email || `用户${u.id}`,
    value: String(u.id),
  }));
  const cityOptions = (selectedProvince && cityOptionsByProvince[selectedProvince]?.length
    ? cityOptionsByProvince[selectedProvince]
    : ["市辖区", "其他"]).map((city) => ({ label: city, value: city }));

  const handleAdd = async () => {
    let nextCode = getNextLocalCustomerCode(data);
    try {
      const result = await refetchNextCode();
      const serverCode = result.data?.code;
      if (serverCode) nextCode = serverCode;
    } catch {
      // ignore and use local fallback
    }
    setEditingRecord(null);
    setCreateDefaults({
      code: nextCode,
      status: "active",
      type: "domestic",
      paymentTerms: "先款后货",
      paymentDays: "30",
      needInvoice: "false",
      taxRate: "13",
    });
    setCustomerType("domestic");
    setPaymentTerms("");
    setNeedInvoice(false);
    setSelectedProvince("");
    setFormOpen(true);
  };

  const handleEdit = (record: Customer) => {
    setEditingRecord(record);
    setCreateDefaults({});
    setCustomerType(record.type);
    setPaymentTerms(normalizePaymentCondition(record.paymentTerms));
    setNeedInvoice(record.needInvoice || false);
    setSelectedProvince(record.province || "");
    setFormOpen(true);
  };

  const handleView = (record: Customer) => {
    setViewingRecord(record);
    setDetailOpen(true);
  };

  const handleDelete = (record: Customer) => {
    deleteMutation.mutate({ id: record.id }, {
      onSuccess: () => {
        refetch();
        toast.success("客户已删除");
      },
      onError: (err) => toast.error("删除失败", { description: err.message }),
    });
  };

  const buildCustomerPayload = (formData: Record<string, any>) => {
    const invoiceNeeded = formData.needInvoice === true || formData.needInvoice === "true";
    return {
      code: formData.code,
      name: formData.name,
      shortName: formData.shortName || undefined,
      type: formData.type as "hospital" | "dealer" | "domestic" | "overseas",
      contactPerson: formData.contactPerson || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      address: formData.address || undefined,
      province: formData.province || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      paymentTerms: formData.paymentTerms ? normalizePaymentCondition(formData.paymentTerms) : undefined,
      currency: formData.currency || undefined,
      taxNo: formData.taxNo || undefined,
      taxRate: invoiceNeeded ? String(formData.taxRate || "13") : undefined,
      bankAccount: formData.bankAccount || undefined,
      bankName: formData.bankName || undefined,
      needInvoice: invoiceNeeded,
      salesPersonId: formData.salesPersonId ? Number(formData.salesPersonId) : undefined,
      status: (formData.status || "active") as "active" | "inactive" | "blacklist",
      source: mergeSourceWithPaymentDays(
        editingRecord?.source,
        formData.paymentTerms,
        formData.paymentDays
      ),
    };
  };

  const handleSubmit = (formData: Record<string, any>) => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: buildCustomerPayload(formData) }, {
        onSuccess: () => {
          refetch();
          toast.success("客户信息已更新");
        },
        onError: (err) => toast.error("更新失败", { description: err.message }),
      });
    } else {
      createMutation.mutate(buildCustomerPayload(formData), {
        onSuccess: () => {
          refetch();
          toast.success("客户已创建");
        },
        onError: (err) => toast.error("创建失败", { description: err.message }),
      });
    }
    setFormOpen(false);
  };

  // 动态生成表单字段
  const getDynamicFormFields = (): FormField[] => {
    const fields: FormField[] = [...baseFormFields];
    
    // 更新销售负责人选项
    const salesPersonField = fields.find(f => f.name === "salesPersonId");
    if (salesPersonField) {
      salesPersonField.options = salesPersonOptions;
    }

    // 根据客户类型显示国家或省份
    if (customerType === "overseas") {
      fields.push({
        name: "country",
        label: "国家",
        type: "select",
        required: true,
        options: countryOptions,
      });
    } else {
      fields.push({
        name: "province",
        label: "省份",
        type: "select",
        required: true,
        options: provinceOptions,
      });
      fields.push({
        name: "city",
        label: "城市",
        type: "select",
        required: true,
        options: cityOptions,
      });
    }

    fields.push({ name: "address", label: "详细地址", type: "textarea", span: 2, placeholder: "请输入详细地址" });

    // 付款条件
    fields.push({
      name: "paymentTerms",
      label: "付款条件",
      type: "select",
      required: true,
      options: PAYMENT_CONDITION_OPTIONS,
    });

    // 账期支付显示账期天数（30/60/90/120）
    if (normalizePaymentCondition(paymentTerms) === "账期支付") {
      fields.push({
        name: "paymentDays",
        label: "账期天数",
        type: "select",
        required: true,
        defaultValue: "30",
        options: PAYMENT_DAYS_OPTIONS,
      });
    }

    // 是否开票
    fields.push({
      name: "needInvoice",
      label: "是否开票",
      type: "select",
      required: true,
      options: [
        { label: "开票", value: "true" },
        { label: "不开票", value: "false" },
      ],
    });

    // 开票时显示税号、开户行、银行账号
    if (needInvoice) {
      fields.push({
        name: "taxRate",
        label: "税率",
        type: "select",
        required: true,
        defaultValue: "13",
        options: TAX_RATE_OPTIONS,
      });
      fields.push({ name: "taxNo", label: "税号", type: "text", required: true, placeholder: "请输入统一社会信用代码" });
      fields.push({ name: "bankName", label: "开户银行", type: "text", required: true, placeholder: "请输入开户银行名称" });
      fields.push({ name: "bankAccount", label: "银行账号", type: "text", required: true, placeholder: "请输入银行账号" });
    }

    fields.push({ name: "remarks", label: "备注", type: "textarea", span: 2, placeholder: "请输入备注信息" });

    return fields;
  };

  const handleFormChange = (name: string, value: any) => {
    if (name === "type") {
      setCustomerType(value);
      if (value === "overseas") {
        setSelectedProvince("");
      }
    } else if (name === "province") {
      setSelectedProvince(String(value || ""));
    } else if (name === "paymentTerms") {
      setPaymentTerms(normalizePaymentCondition(value));
      if (normalizePaymentCondition(value) === "账期支付") {
        return {
          paymentDays: "30",
        };
      }
    } else if (name === "needInvoice") {
      setNeedInvoice(value === "true" || value === true);
      return {
        taxRate: value === "true" || value === true ? "13" : "",
      };
    }
  };

  const escapeCsvCell = (value: unknown) => {
    const text = String(value ?? "").replaceAll('"', '""');
    return `"${text}"`;
  };

  const parseCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    values.push(current.trim());
    return values;
  };

  const handleExportCustomers = (rows: Customer[]) => {
    const headers = [
      "客户编码",
      "客户名称",
      "客户简称",
      "客户类型",
      "状态",
      "联系人",
      "联系电话",
      "电子邮箱",
      "省份",
      "城市",
      "国家",
      "详细地址",
      "付款条件",
      "账期天数",
      "是否开票",
      "税率",
      "税号",
      "开户银行",
      "银行账号",
      "销售负责人",
    ];

    const body = rows.map((item) => {
      const paymentNormalized = normalizePaymentCondition(item.paymentTerms);
      const paymentDays = extractPaymentDaysFromSource(item.source);
      return [
        item.code,
        item.name,
        item.shortName || "",
        typeMap[item.type] || item.type,
        statusMap[item.status]?.label || item.status,
        item.contactPerson || "",
        item.phone || "",
        item.email || "",
        item.province || "",
        item.city || "",
        item.country || "",
        item.address || "",
        paymentNormalized || "",
        paymentNormalized === "账期支付" ? paymentDays : "",
        item.needInvoice ? "开票" : "不开票",
        item.needInvoice ? `${item.taxRate || "13"}%` : "",
        item.taxNo || "",
        item.bankName || "",
        item.bankAccount || "",
        item.salesPersonName || "",
      ].map(escapeCsvCell).join(",");
    });

    const csv = [headers.map(escapeCsvCell).join(","), ...body].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    a.href = url;
    a.download = `客户管理_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("客户表格已导出");
  };

  const handleImportCustomers = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("仅支持 CSV 导入，请先导出模板后再导入");
      return;
    }

    const text = (await file.text()).replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length <= 1) {
      toast.warning("导入文件没有有效数据");
      return;
    }

    const headers = parseCsvLine(lines[0]);
    const colIndex = (name: string) => headers.findIndex((h) => h.trim() === name);
    const readCol = (row: string[], name: string) => {
      const index = colIndex(name);
      if (index < 0) return "";
      return String(row[index] ?? "").trim();
    };

    const typeReverseMap: Record<string, string> = {
      海外客户: "overseas",
      国内客户: "domestic",
      经销商: "dealer",
      医院: "hospital",
      overseas: "overseas",
      domestic: "domestic",
      dealer: "dealer",
      hospital: "hospital",
    };
    const statusReverseMap: Record<string, string> = {
      正常: "active",
      停用: "inactive",
      黑名单: "blacklist",
      active: "active",
      inactive: "inactive",
      blacklist: "blacklist",
    };

    const salesPersonByName = new Map(
      salesPersonOptions.map((option) => [option.label, option.value])
    );

    let nextCodeNum = (() => {
      let maxNum = 0;
      for (const item of data) {
        const m = String(item.code || "").match(/^KH-(\d+)$/);
        if (!m) continue;
        const num = parseInt(m[1], 10);
        if (Number.isFinite(num) && num > maxNum) maxNum = num;
      }
      return maxNum + 1;
    })();
    const allocNextCode = () => {
      const code = `KH-${String(nextCodeNum).padStart(5, "0")}`;
      nextCodeNum += 1;
      return code;
    };

    let success = 0;
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      const name = readCol(row, "客户名称");
      if (!name) continue;

      const paymentRaw = readCol(row, "付款条件");
      const paymentTermsValue = normalizePaymentCondition(paymentRaw || "先款后货");
      const paymentDays = readCol(row, "账期天数");
      if (paymentTermsValue === "账期支付" && !paymentDays) {
        errors.push(`第${i + 1}行: 账期支付必须填写账期天数`);
        continue;
      }
      const source = mergeSourceWithPaymentDays(
        "",
        paymentTermsValue,
        paymentDays
      );
      const invoiceNeeded = ["开票", "是", "true", "1"].includes(readCol(row, "是否开票").toLowerCase());

      const payload = {
        code: readCol(row, "客户编码") || allocNextCode(),
        name,
        shortName: readCol(row, "客户简称") || undefined,
        type: (typeReverseMap[readCol(row, "客户类型")] || "domestic") as "hospital" | "dealer" | "domestic" | "overseas",
        contactPerson: readCol(row, "联系人") || undefined,
        phone: readCol(row, "联系电话") || undefined,
        email: readCol(row, "电子邮箱") || undefined,
        province: readCol(row, "省份") || undefined,
        city: readCol(row, "城市") || undefined,
        country: readCol(row, "国家") || undefined,
        address: readCol(row, "详细地址") || undefined,
        paymentTerms: paymentTermsValue,
        needInvoice: invoiceNeeded,
        taxRate: invoiceNeeded ? (readCol(row, "税率").replace("%", "").trim() || "13") : undefined,
        taxNo: readCol(row, "税号") || undefined,
        bankName: readCol(row, "开户银行") || undefined,
        bankAccount: readCol(row, "银行账号") || undefined,
        status: (statusReverseMap[readCol(row, "状态")] || "active") as "active" | "inactive" | "blacklist",
        salesPersonId: salesPersonByName.get(readCol(row, "销售负责人"))
          ? Number(salesPersonByName.get(readCol(row, "销售负责人")))
          : undefined,
        source,
      };

      try {
        await createMutation.mutateAsync(payload as any);
        success += 1;
      } catch (error: any) {
        errors.push(`${payload.code}: ${error?.message || "导入失败"}`);
      }
    }

    await refetch();
    if (success > 0) {
      toast.success(`导入成功 ${success} 条`);
    }
    if (errors.length > 0) {
      toast.error(`导入失败 ${errors.length} 条`, {
        description: errors.slice(0, 2).join("；"),
      });
    }
  };

  return (
    <>
      <ModulePage
        title="客户管理"
        description="建立360度客户视图，管理客户全生命周期"
        icon={Contact}
        columns={columns}
        data={data}
        searchPlaceholder="搜索客户编码、名称、联系人..."
        searchFields={[
          "code",
          "name",
          "shortName",
          "contactPerson",
          "phone",
          "salesPersonName",
        ]}
        addButtonText="新增客户"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDelete}
        filterKey="status"
        filterOptions={[
          { label: "正常", value: "active" },
          { label: "停用", value: "inactive" },
          { label: "黑名单", value: "blacklist" },
        ]}
        customFilter={matchesQuickFilters}
        filterResetKey={customerTypeFilter}
        toolbarFilters={
          <Select
            value={customerTypeFilter}
            onValueChange={setCustomerTypeFilter}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="客户类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="domestic">国内客户</SelectItem>
              <SelectItem value="overseas">海外客户</SelectItem>
              <SelectItem value="dealer">经销商</SelectItem>
              <SelectItem value="hospital">医院</SelectItem>
            </SelectContent>
          </Select>
        }
        onExport={handleExportCustomers}
        onImport={handleImportCustomers}
        importAccept=".csv"
        approvalFormType="主数据"
        headerActions={
          <DraftDrawer
            count={draftItems.length}
            drafts={draftItems}
            moduleName="客户"
            onEdit={handleDraftEdit}
            onDelete={handleDraftDelete}
          />
        }
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingRecord ? "编辑客户" : "新增客户"}
        fields={getDynamicFormFields()}
        initialData={
          editingRecord
            ? {
                ...editingRecord,
                paymentTerms: normalizePaymentCondition(editingRecord.paymentTerms),
                paymentDays: extractPaymentDaysFromSource(editingRecord.source),
                needInvoice: editingRecord.needInvoice ? "true" : "false",
              }
            : createDefaults
        }
        onSubmit={handleSubmit}
        onChange={handleFormChange}
      />

      <CustomerDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        customer={viewingRecord}
        onEdit={(customer: Customer) => {
          setDetailOpen(false);
          handleEdit(customer);
        }}
      />
    </>
  );
}
