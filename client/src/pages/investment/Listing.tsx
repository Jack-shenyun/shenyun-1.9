import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import ERPLayout from "@/components/ERPLayout";
import { DraggableDialog, DraggableDialogContent } from "@/components/DraggableDialog";
import { trpc } from "@/lib/trpc";
import { formatDate, formatDateTime, formatDisplayNumber } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Bell,
  Clock3,
  Copy,
  Download,
  Edit,
  ExternalLink,
  Eye,
  Globe,
  PlayCircle,
  Plus,
  Printer,
  Search,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type ListingStatus =
  | "draft"
  | "pending_submission"
  | "submitted"
  | "publicity"
  | "publicity_completed"
  | "enabled";
type NotificationTrigger =
  | "submit_success"
  | "publicity_started"
  | "publicity_reminder"
  | "publicity_completed";
type NotificationChannel = "erp" | "wechat" | "email";
type DeliveryStatus = "success" | "failed" | "skipped";
type OperationAction =
  | "legacy_import"
  | "create"
  | "save_draft"
  | "save_pending_submission"
  | "remove_draft"
  | "submit"
  | "approve"
  | "publicity_reminder"
  | "publicity_complete"
  | "enable";
type SaveMode = "draft" | "pending_submission";
type CardFilter = "all" | "publicity" | "dueSoon" | "enabled";
type PlatformStatusFilter = "all" | "submitted" | "publicity" | "enabled";

interface EditableListedProduct {
  recordId?: string;
  productId: number;
  code: string;
  name: string;
  specification: string;
  unit: string;
  description: string;
  listedPrice: number;
}

interface ListingNotificationRecipient {
  userId?: number | null;
  name: string;
  department?: string;
  position?: string;
  email?: string;
  source?: string;
}

interface ListingNotificationDelivery {
  channel: NotificationChannel;
  status: DeliveryStatus;
  detail?: string;
  sentAt: string;
}

interface ListingNotificationRecord {
  id: string;
  trigger: NotificationTrigger;
  title: string;
  content: string;
  channels: NotificationChannel[];
  recipients: ListingNotificationRecipient[];
  deliveries: ListingNotificationDelivery[];
  createdAt: string;
  createdBy: string;
}

interface ListingOperationRecord {
  id: string;
  action: OperationAction;
  operatorId?: number | null;
  operatorName: string;
  operatorRole?: string;
  operatorDepartment?: string;
  note?: string;
  fromStatus?: ListingStatus;
  toStatus?: ListingStatus;
  operatedAt: string;
}

interface ListingProductRecord {
  recordId: string;
  productId: number;
  code: string;
  name: string;
  medicalInsuranceCode?: string;
  specification: string;
  unit: string;
  description: string;
  listedPrice: number;
  status: ListingStatus;
  handlerId?: number | null;
  handlerName: string;
  handlerDepartment: string;
  handlerEmail?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  publicityStartAt?: string | null;
  publicityEndAt?: string | null;
  reminderSentAt?: string | null;
  publicityCompletedAt?: string | null;
  enabledAt?: string | null;
  operationLogs: ListingOperationRecord[];
  notificationLogs: ListingNotificationRecord[];
}

interface ListingSnapshot {
  productDetails: ListingProductRecord[];
  lastUpdate: string;
}

interface ListingPlatform {
  id: number;
  platformName: string;
  province: string;
  platformType: "医保服务平台" | "医药招采平台";
  platformUrl: string;
  officialSourceUrl: string;
  verificationStatus: "verified" | "pending";
  accountNo?: string;
  password?: string;
  lastUpdate: string;
  listingData?: ListingSnapshot;
}

interface ListingFormData {
  platformId: string;
  platformName: string;
  province: string;
  platformType: string;
  platformUrl: string;
  officialSourceUrl: string;
  verificationStatus: string;
  productDetails: EditableListedProduct[];
}

const REMINDER_WINDOW_DAYS = 3;

const verificationMap = {
  verified: { label: "已核验", variant: "default" as const },
  pending: { label: "待核验", variant: "outline" as const },
};

const statusMap: Record<
  ListingStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }
> = {
  draft: {
    label: "草稿",
    variant: "secondary",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  pending_submission: {
    label: "待提交",
    variant: "outline",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  submitted: {
    label: "已提交",
    variant: "outline",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  publicity: {
    label: "公示中",
    variant: "default",
    className: "bg-emerald-600 text-white",
  },
  publicity_completed: {
    label: "公示完成",
    variant: "outline",
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
  enabled: {
    label: "正式挂网",
    variant: "default",
    className: "bg-indigo-600 text-white",
  },
};

const operationLabels: Record<OperationAction, string> = {
  legacy_import: "历史数据迁移",
  create: "新建",
  save_draft: "保存草稿",
  save_pending_submission: "保存待提交",
  remove_draft: "移除草稿",
  submit: "提交挂网",
  approve: "审核通过",
  publicity_reminder: "到期提醒",
  publicity_complete: "公示完成",
  enable: "正式启用",
};

const triggerLabels: Record<NotificationTrigger, string> = {
  submit_success: "提交成功",
  publicity_started: "进入公示期",
  publicity_reminder: "到期前 3 天提醒",
  publicity_completed: "公示正式结束",
};

const channelLabels: Record<NotificationChannel, string> = {
  erp: "ERP站内消息",
  wechat: "企业微信/微信",
  email: "邮件",
};

const deliveryLabels: Record<DeliveryStatus, string> = {
  success: "成功",
  failed: "失败",
  skipped: "跳过",
};

const emptySnapshot: ListingSnapshot = {
  productDetails: [],
  lastUpdate: "",
};

const emptyFormData: ListingFormData = {
  platformId: "",
  platformName: "",
  province: "",
  platformType: "",
  platformUrl: "",
  officialSourceUrl: "",
  verificationStatus: "",
  productDetails: [],
};

const getSafeUrl = (value?: string) => {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const getProductBasePrice = (product: any) => {
  if (product?.priceByPayment && typeof product.priceByPayment === "object") {
    const priceMap = product.priceByPayment as Record<string, number>;
    return priceMap.cash ?? priceMap.monthly ?? Object.values(priceMap)[0] ?? 0;
  }
  return 0;
};

const isEditableStatus = (status: ListingStatus) =>
  status === "draft" || status === "pending_submission";

const toEditableProduct = (record: ListingProductRecord): EditableListedProduct => ({
  recordId: record.recordId,
  productId: record.productId,
  code: record.code,
  name: record.name,
  specification: record.specification || "",
  unit: record.unit || "",
  description: record.description || "",
  listedPrice: Number(record.listedPrice || 0),
});

const getDiffDays = (endAt?: string | null) => {
  if (!endAt) return null;
  const end = new Date(endAt);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  const normalizedToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const normalizedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.ceil(
    (normalizedEnd.getTime() - normalizedToday.getTime()) / (24 * 60 * 60 * 1000),
  );
};

const getRemainingText = (record: ListingProductRecord) => {
  const diffDays = getDiffDays(record.publicityEndAt);
  if (diffDays == null) return "-";
  if (record.status === "publicity" && diffDays > 0) return `${diffDays} 天`;
  if (record.status === "publicity" && diffDays === 0) return "今天到期";
  if (diffDays < 0) return `已结束 ${Math.abs(diffDays)} 天`;
  return "0 天";
};

const getListingTime = (record: ListingProductRecord) =>
  record.enabledAt ||
  record.publicityCompletedAt ||
  record.publicityStartAt ||
  record.submittedAt ||
  record.createdAt ||
  null;

const isDueSoon = (record: ListingProductRecord) => {
  const diffDays = getDiffDays(record.publicityEndAt);
  return record.status === "publicity" && diffDays != null && diffDays >= 0 && diffDays <= REMINDER_WINDOW_DAYS;
};

const formatCurrency = (value: number) => `¥${formatDisplayNumber(value)}`;

export default function ListingPage() {
  const { user } = useAuth();
  const { data: rawPlatforms = [], refetch } = trpc.medicalPlatforms.list.useQuery();
  const { data: products = [] } = trpc.products.list.useQuery({ limit: 5000 });

  const saveListingMutation = trpc.medicalPlatforms.saveListing.useMutation();
  const submitRecordsMutation = trpc.medicalPlatforms.submitRecords.useMutation();
  const approveRecordsMutation = trpc.medicalPlatforms.approveRecords.useMutation();
  const enableRecordsMutation = trpc.medicalPlatforms.enableRecords.useMutation();

  const platforms = rawPlatforms as ListingPlatform[];
  const productCodeMap = useMemo(() => {
    const map = new Map<number, any>();
    for (const product of products as any[]) {
      map.set(Number(product.id), product);
    }
    return map;
  }, [products]);
  const canApprove =
    user?.role === "admin" ||
    /负责人|经理|主管|总监/.test(String(user?.position || ""));

  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);
  const [loginAssistOpen, setLoginAssistOpen] = useState(false);
  const [formDialogMaximized, setFormDialogMaximized] = useState(false);
  const [viewDialogMaximized, setViewDialogMaximized] = useState(false);
  const [productDialogMaximized, setProductDialogMaximized] = useState(false);
  const [platformDialogMaximized, setPlatformDialogMaximized] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [platformSearchTerm, setPlatformSearchTerm] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [cardFilter, setCardFilter] = useState<CardFilter>("all");
  const [platformStatusFilter, setPlatformStatusFilter] = useState<PlatformStatusFilter>("all");
  const [formData, setFormData] = useState<ListingFormData>(emptyFormData);
  const [viewingPlatform, setViewingPlatform] = useState<ListingPlatform | null>(null);
  const [loginAssistPlatform, setLoginAssistPlatform] = useState<ListingPlatform | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const [lockedRecordCount, setLockedRecordCount] = useState(0);

  const getListingSnapshot = (platformId: number): ListingSnapshot =>
    platforms.find((item) => item.id === platformId)?.listingData || emptySnapshot;

  const allRecords = useMemo(
    () => platforms.flatMap((platform) => getListingSnapshot(platform.id).productDetails || []),
    [platforms],
  );

  const publicityCount = allRecords.filter((record) => record.status === "publicity").length;
  const dueSoonCount = allRecords.filter((record) => isDueSoon(record)).length;
  const enabledCount = allRecords.filter((record) => record.status === "enabled").length;
  const latestUpdate =
    allRecords
      .map((record) => record.updatedAt || record.createdAt)
      .filter(Boolean)
      .sort()
      .at(-1) || "-";

  const filteredPlatforms = platforms.filter((platform) => {
    const records = getListingSnapshot(platform.id).productDetails || [];
    const keyword = searchTerm.toLowerCase();
    const matchesSearch =
      platform.platformName.toLowerCase().includes(keyword) ||
      platform.province.toLowerCase().includes(keyword) ||
      platform.platformType.toLowerCase().includes(keyword) ||
      platform.platformUrl.toLowerCase().includes(keyword);

    const matchesCard =
      cardFilter === "all" ||
      (cardFilter === "publicity" && records.some((record) => record.status === "publicity")) ||
      (cardFilter === "dueSoon" && records.some((record) => isDueSoon(record))) ||
      (cardFilter === "enabled" && records.some((record) => record.status === "enabled"));

    const matchesStatus =
      platformStatusFilter === "all" ||
      records.some((record) => record.status === platformStatusFilter);

    return matchesSearch && matchesCard && matchesStatus;
  });

  const selectedPlatformRecords =
    viewingPlatform ? getListingSnapshot(viewingPlatform.id).productDetails : [];

  const selectedRecord =
    selectedPlatformRecords.find((record) => record.recordId === selectedRecordId) ||
    selectedPlatformRecords[0] ||
    null;

  useEffect(() => {
    if (!viewingPlatform) return;
    const latest = platforms.find((platform) => platform.id === viewingPlatform.id);
    if (latest && latest !== viewingPlatform) {
      setViewingPlatform(latest);
    }
  }, [platforms, viewingPlatform]);

  useEffect(() => {
    if (!loginAssistPlatform) return;
    const latest = platforms.find((platform) => platform.id === loginAssistPlatform.id);
    if (latest && latest !== loginAssistPlatform) {
      setLoginAssistPlatform(latest);
    }
  }, [platforms, loginAssistPlatform]);

  useEffect(() => {
    if (!viewingPlatform) return;
    const records = getListingSnapshot(viewingPlatform.id).productDetails;
    if (records.length === 0) {
      setSelectedRecordId("");
      return;
    }
    if (!selectedRecordId || !records.some((record) => record.recordId === selectedRecordId)) {
      setSelectedRecordId(records[0].recordId);
    }
  }, [platforms, viewingPlatform, selectedRecordId]);

  const handleCardFilterChange = (nextFilter: CardFilter) => {
    const shouldReset =
      (nextFilter === "all" && cardFilter === "all" && platformStatusFilter === "all") ||
      (nextFilter === "publicity" && cardFilter === "publicity" && platformStatusFilter === "publicity") ||
      (nextFilter === "enabled" && cardFilter === "enabled" && platformStatusFilter === "enabled") ||
      (nextFilter === "dueSoon" && cardFilter === "dueSoon" && platformStatusFilter === "publicity");

    if (shouldReset || nextFilter === "all") {
      setCardFilter("all");
      setPlatformStatusFilter("all");
      return;
    }

    if (nextFilter === "publicity") {
      setCardFilter("publicity");
      setPlatformStatusFilter("publicity");
      return;
    }

    if (nextFilter === "enabled") {
      setCardFilter("enabled");
      setPlatformStatusFilter("enabled");
      return;
    }

    if (nextFilter === "dueSoon") {
      setCardFilter("dueSoon");
      setPlatformStatusFilter("publicity");
    }
  };

  const handlePlatformStatusFilterChange = (nextFilter: PlatformStatusFilter) => {
    setPlatformStatusFilter(nextFilter);

    if (nextFilter === "publicity") {
      setCardFilter("publicity");
      return;
    }

    if (nextFilter === "enabled") {
      setCardFilter("enabled");
      return;
    }

    setCardFilter("all");
  };

  const handleCopy = async (value: string | undefined, label: string) => {
    if (!value) {
      toast.error(`未维护${label}`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label}已复制`);
    } catch {
      toast.error(`${label}复制失败`);
    }
  };

  const handleOpenPlatform = (platform: ListingPlatform) => {
    window.open(getSafeUrl(platform.platformUrl), "_blank", "noopener,noreferrer");
    setLoginAssistPlatform(platform);
    setLoginAssistOpen(true);
  };

  const loadPlatformIntoForm = (platform: ListingPlatform) => {
    const snapshot = getListingSnapshot(platform.id);
    const editableRecords = snapshot.productDetails.filter((record) => isEditableStatus(record.status));
    setLockedRecordCount(snapshot.productDetails.length - editableRecords.length);
    setFormData({
      platformId: String(platform.id),
      platformName: platform.platformName,
      province: platform.province,
      platformType: platform.platformType,
      platformUrl: platform.platformUrl,
      officialSourceUrl: platform.officialSourceUrl,
      verificationStatus: platform.verificationStatus,
      productDetails: editableRecords.map(toEditableProduct),
    });
  };

  const openDialog = (platform?: ListingPlatform) => {
    setProductSearchTerm("");
    setPlatformSearchTerm("");
    setSelectedProductIds([]);
    if (!platform) {
      setLockedRecordCount(0);
      setFormData(emptyFormData);
      setDialogOpen(true);
      return;
    }
    loadPlatformIntoForm(platform);
    setDialogOpen(true);
  };

  const openViewDialog = (platform: ListingPlatform) => {
    setViewingPlatform(platform);
    const records = getListingSnapshot(platform.id).productDetails;
    setSelectedRecordId(records[0]?.recordId || "");
    setViewDialogOpen(true);
  };

  const applyPlatformToForm = (platformId: string) => {
    const platform = platforms.find((item) => String(item.id) === platformId);
    if (!platform) {
      setLockedRecordCount(0);
      setFormData(emptyFormData);
      return;
    }
    loadPlatformIntoForm(platform);
  };

  const selectablePlatforms = useMemo(() => {
    const keyword = platformSearchTerm.trim().toLowerCase();
    return platforms.filter((platform) => {
      if (!keyword) return true;
      return (
        platform.platformName.toLowerCase().includes(keyword) ||
        platform.province.toLowerCase().includes(keyword) ||
        platform.platformType.toLowerCase().includes(keyword) ||
        platform.platformUrl.toLowerCase().includes(keyword)
      );
    });
  }, [platformSearchTerm, platforms]);

  const handleSelectPlatformForForm = (platformId: string) => {
    applyPlatformToForm(platformId);
    setPlatformDialogOpen(false);
    setPlatformSearchTerm("");
  };

  const lockedProductIds = useMemo(() => {
    if (!formData.platformId) return new Set<number>();
    return new Set(
      getListingSnapshot(Number(formData.platformId))
        .productDetails.filter((record) => !isEditableStatus(record.status))
        .map((record) => record.productId),
    );
  }, [formData.platformId, platforms]);

  const selectableProducts = (products as any[])
    .filter((product: any) => product.isMedicalDevice && product.productCategory === "finished")
    .filter((product: any) => !formData.productDetails.some((item) => item.productId === product.id))
    .filter((product: any) => !lockedProductIds.has(product.id))
    .filter((product: any) => {
      if (!productSearchTerm) return true;
      const keyword = productSearchTerm.toLowerCase();
      return (
        (product.code || "").toLowerCase().includes(keyword) ||
        (product.name || "").toLowerCase().includes(keyword) ||
        (product.specification || "").toLowerCase().includes(keyword) ||
        (product.description || "").toLowerCase().includes(keyword)
      );
    });

  const addProduct = (product: any) => {
    setFormData((current) => ({
      ...current,
      productDetails: [
        ...current.productDetails,
        {
          productId: product.id,
          code: product.code || "",
          name: product.name || "",
          specification: product.specification || "",
          unit: product.unit || "",
          description: product.description || "",
          listedPrice: getProductBasePrice(product),
        },
      ],
    }));
    setProductDialogOpen(false);
    setProductSearchTerm("");
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const addSelectedProducts = () => {
    if (selectedProductIds.length === 0) {
      toast.error("请先选择产品");
      return;
    }

    const selectedProducts = selectableProducts.filter((product: any) =>
      selectedProductIds.includes(product.id),
    );

    setFormData((current) => ({
      ...current,
      productDetails: [
        ...current.productDetails,
        ...selectedProducts.map((product: any) => ({
          productId: product.id,
          code: product.code || "",
          name: product.name || "",
          specification: product.specification || "",
          unit: product.unit || "",
          description: product.description || "",
          listedPrice: getProductBasePrice(product),
        })),
      ],
    }));
    setSelectedProductIds([]);
    setProductDialogOpen(false);
    setProductSearchTerm("");
  };

  const updateProductPrice = (productId: number, listedPrice: number) => {
    setFormData((current) => ({
      ...current,
      productDetails: current.productDetails.map((item) =>
        item.productId === productId ? { ...item, listedPrice } : item,
      ),
    }));
  };

  const handleSave = async (mode: SaveMode) => {
    if (!formData.platformId) {
      toast.error("请先选择平台");
      return;
    }
    if (formData.productDetails.length === 0) {
      toast.error("请至少选择一个挂网产品");
      return;
    }
    try {
      await saveListingMutation.mutateAsync({
        platformId: Number(formData.platformId),
        productDetails: formData.productDetails,
        lastUpdate: new Date().toISOString().slice(0, 10),
        mode,
      });
      await refetch();
      setDialogOpen(false);
      toast.success(mode === "draft" ? "挂网草稿已保存" : "挂网记录已保存为待提交");
    } catch (error: any) {
      toast.error(`保存失败：${error.message || "未知错误"}`);
    }
  };

  const handleSubmitRecord = async (platform: ListingPlatform, record: ListingProductRecord) => {
    try {
      await submitRecordsMutation.mutateAsync({
        platformId: platform.id,
        recordIds: [record.recordId],
      });
      await refetch();
      toast.success("挂网记录已提交");
    } catch (error: any) {
      toast.error(`提交失败：${error.message || "未知错误"}`);
    }
  };

  const handleApproveRecord = async (platform: ListingPlatform, record: ListingProductRecord) => {
    try {
      await approveRecordsMutation.mutateAsync({
        platformId: platform.id,
        recordIds: [record.recordId],
      });
      await refetch();
      toast.success("审核通过，已进入公示期");
    } catch (error: any) {
      toast.error(`审核失败：${error.message || "未知错误"}`);
    }
  };

  const handleEnableRecord = async (platform: ListingPlatform, record: ListingProductRecord) => {
    try {
      await enableRecordsMutation.mutateAsync({
        platformId: platform.id,
        recordIds: [record.recordId],
      });
      await refetch();
      toast.success("挂网记录已正式启用");
    } catch (error: any) {
      toast.error(`启用失败：${error.message || "未知错误"}`);
    }
  };

  const handleExport = (platform: ListingPlatform) => {
    const records = getListingSnapshot(platform.id).productDetails;
    if (records.length === 0) {
      toast.warning("暂无可导出挂网数据");
      return;
    }

    const rows = records.map((record) => [
      platform.platformName,
      platform.province,
      platform.platformType,
      record.code,
      record.name,
      record.specification || "",
      record.unit || "",
      record.description || "",
      formatDisplayNumber(record.listedPrice),
      statusMap[record.status].label,
      formatDateTime(record.submittedAt),
      formatDateTime(record.publicityStartAt),
      formatDateTime(record.publicityEndAt),
      record.handlerName,
      formatDateTime(record.updatedAt),
    ]);

    const csv = [
      [
        "平台名称",
        "区域",
        "平台类型",
        "产品编码",
        "产品名称",
        "规格",
        "单位",
        "产品描述",
        "挂网价格",
        "当前状态",
        "提交时间",
        "公示开始",
        "公示结束",
        "经办人",
        "最后更新时间",
      ],
      ...rows,
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${platform.platformName}-挂网记录.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("挂网记录已导出");
  };

  const handlePrint = (platform: ListingPlatform) => {
    const records = getListingSnapshot(platform.id).productDetails;
    if (records.length === 0) {
      toast.warning("暂无可打印挂网数据");
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1280,height=900");
    if (!printWindow) {
      toast.error("打印窗口打开失败");
      return;
    }

    const tableRows = records
      .map(
        (record, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${record.code || ""}</td>
            <td>${record.name || ""}</td>
            <td>${record.specification || ""}</td>
            <td>${record.unit || ""}</td>
            <td>${formatDisplayNumber(record.listedPrice)}</td>
            <td>${statusMap[record.status].label}</td>
            <td>${formatDateTime(record.publicityStartAt)}</td>
            <td>${formatDateTime(record.publicityEndAt)}</td>
            <td>${record.handlerName || "-"}</td>
          </tr>
        `,
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>${platform.platformName} 挂网记录</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { font-size: 22px; margin-bottom: 8px; }
            .meta { margin-bottom: 16px; font-size: 14px; line-height: 1.8; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>${platform.platformName} 挂网记录</h1>
          <div class="meta">
            <div>区域：${platform.province}</div>
            <div>平台类型：${platform.platformType}</div>
            <div>挂网记录数：${records.length}</div>
            <div>公示中：${records.filter((record) => record.status === "publicity").length}</div>
            <div>正式挂网：${records.filter((record) => record.status === "enabled").length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>序号</th>
                <th>产品编码</th>
                <th>产品名称</th>
                <th>规格</th>
                <th>单位</th>
                <th>挂网价格</th>
                <th>状态</th>
                <th>公示开始</th>
                <th>公示结束</th>
                <th>经办人</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  };

  const getPlatformCounts = (platform: ListingPlatform) => {
    const records = getListingSnapshot(platform.id).productDetails;
    return {
      total: records.length,
      publicity: records.filter((record) => record.status === "publicity").length,
      dueSoon: records.filter((record) => isDueSoon(record)).length,
      enabled: records.filter((record) => record.status === "enabled").length,
    };
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">挂网管理</h2>
              <p className="text-sm text-muted-foreground">
                管理产品挂网的提交、公示期、正式启用以及节点通知记录
              </p>
            </div>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            新增挂网批次
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className={cardFilter === "all" ? "border-primary" : ""}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">平台总数</p>
              <button
                type="button"
                className="text-2xl font-bold transition-opacity hover:opacity-80"
                onClick={() => handleCardFilterChange("all")}
              >
                {platforms.length}
              </button>
            </CardContent>
          </Card>
          <Card className={cardFilter === "publicity" ? "border-primary" : ""}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">公示中记录</p>
              <button
                type="button"
                className="text-2xl font-bold text-emerald-600 transition-opacity hover:opacity-80"
                onClick={() => handleCardFilterChange("publicity")}
              >
                {publicityCount}
              </button>
            </CardContent>
          </Card>
          <Card className={cardFilter === "dueSoon" ? "border-primary" : ""}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">3天内到期</p>
              <button
                type="button"
                className="text-2xl font-bold text-amber-600 transition-opacity hover:opacity-80"
                onClick={() => handleCardFilterChange("dueSoon")}
              >
                {dueSoonCount}
              </button>
            </CardContent>
          </Card>
          <Card className={cardFilter === "enabled" ? "border-primary" : ""}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">正式挂网</p>
              <button
                type="button"
                className="text-2xl font-bold text-indigo-600 transition-opacity hover:opacity-80"
                onClick={() => handleCardFilterChange("enabled")}
              >
                {enabledCount}
              </button>
              <p className="mt-1 text-xs text-muted-foreground">
                最近更新：{latestUpdate === "-" ? "-" : formatDateTime(latestUpdate)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索平台名称、区域、平台类型、网址..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="w-full md:w-[180px]">
                <Select
                  value={platformStatusFilter}
                  onValueChange={(value) => handlePlatformStatusFilterChange(value as PlatformStatusFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="submitted">提交</SelectItem>
                    <SelectItem value="publicity">公示</SelectItem>
                    <SelectItem value="enabled">挂网</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-center font-bold">平台名称</TableHead>
                  <TableHead className="text-center font-bold">区域</TableHead>
                  <TableHead className="text-center font-bold">平台类型</TableHead>
                  <TableHead className="text-center font-bold">公示中</TableHead>
                  <TableHead className="text-center font-bold">临近到期</TableHead>
                  <TableHead className="text-center font-bold">正式挂网</TableHead>
                  <TableHead className="text-center font-bold">最近挂网更新时间</TableHead>
                  <TableHead className="text-center font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlatforms.length > 0 ? (
                  filteredPlatforms.map((platform) => {
                    const counts = getPlatformCounts(platform);
                    return (
                      <TableRow key={platform.id}>
                        <TableCell className="text-center font-medium">
                          <div>{platform.platformName}</div>
                          <button
                            type="button"
                            className="mt-1 text-xs text-primary hover:underline"
                            onClick={() => handleOpenPlatform(platform)}
                          >
                            登录平台
                          </button>
                        </TableCell>
                        <TableCell className="text-center">{platform.province}</TableCell>
                        <TableCell className="text-center">{platform.platformType}</TableCell>
                        <TableCell className="text-center">{counts.publicity}</TableCell>
                        <TableCell className="text-center">
                          {counts.dueSoon > 0 ? (
                            <span className="font-medium text-amber-600">{counts.dueSoon}</span>
                          ) : (
                            "0"
                          )}
                        </TableCell>
                        <TableCell className="text-center">{counts.enabled}</TableCell>
                        <TableCell className="text-center">
                          {getListingSnapshot(platform.id).lastUpdate
                            ? formatDate(getListingSnapshot(platform.id).lastUpdate)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openViewDialog(platform)}>
                              <Eye className="h-4 w-4 mr-1" />
                              查看
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openDialog(platform)}>
                              <Edit className="h-4 w-4 mr-1" />
                              维护
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      暂无平台数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <DraggableDialog
          open={loginAssistOpen}
          onOpenChange={setLoginAssistOpen}
          defaultWidth={560}
          defaultHeight={420}
        >
          <DraggableDialogContent>
            {loginAssistPlatform ? (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle>平台登录辅助</DialogTitle>
                  <DialogDescription>{loginAssistPlatform.platformName}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="text-sm">
                      <div className="text-muted-foreground mb-1">登录入口</div>
                      <div className="break-all">{loginAssistPlatform.platformUrl}</div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="rounded-md border bg-background px-3 py-2">
                        <div className="text-xs text-muted-foreground mb-1">平台账号</div>
                        <div className="font-medium break-all">{loginAssistPlatform.accountNo || "未维护"}</div>
                      </div>
                      <div className="rounded-md border bg-background px-3 py-2">
                        <div className="text-xs text-muted-foreground mb-1">平台密码</div>
                        <div className="font-medium break-all">{loginAssistPlatform.password || "未维护"}</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    受浏览器跨站限制，不能直接自动填充第三方平台登录框；可在这里快速复制后粘贴登录。
                  </p>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => handleCopy(loginAssistPlatform.accountNo, "平台账号")}>
                    <Copy className="h-4 w-4 mr-1" />
                    复制账号
                  </Button>
                  <Button variant="outline" onClick={() => handleCopy(loginAssistPlatform.password, "平台密码")}>
                    <Copy className="h-4 w-4 mr-1" />
                    复制密码
                  </Button>
                  <Button
                    onClick={() =>
                      window.open(
                        getSafeUrl(loginAssistPlatform.platformUrl),
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    再次打开平台
                  </Button>
                </DialogFooter>
              </div>
            ) : null}
          </DraggableDialogContent>
        </DraggableDialog>

        <DraggableDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          defaultWidth={1220}
          defaultHeight={820}
          isMaximized={viewDialogMaximized}
          onMaximizedChange={setViewDialogMaximized}
        >
          <DraggableDialogContent isMaximized={viewDialogMaximized}>
            {viewingPlatform ? (
              <>
                <DialogHeader>
                  <DialogTitle>挂网详情</DialogTitle>
                  <DialogDescription>{viewingPlatform.platformName}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[72vh] overflow-y-auto pr-1">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">平台名称</p>
                        <p className="font-medium">{viewingPlatform.platformName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">区域</p>
                        <p className="font-medium">{viewingPlatform.province}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">平台类型</p>
                        <p className="font-medium">{viewingPlatform.platformType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">核验状态</p>
                        <Badge variant={verificationMap[viewingPlatform.verificationStatus].variant}>
                          {verificationMap[viewingPlatform.verificationStatus].label}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">挂网记录数</p>
                        <p className="font-medium">{selectedPlatformRecords.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">最近更新</p>
                        <p className="font-medium">
                          {getListingSnapshot(viewingPlatform.id).lastUpdate
                            ? formatDate(getListingSnapshot(viewingPlatform.id).lastUpdate)
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">草稿 / 待提交</p>
                        <p className="text-2xl font-bold">
                          {selectedPlatformRecords.filter((record) => isEditableStatus(record.status)).length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">已提交待审核</p>
                        <p className="text-2xl font-bold text-sky-600">
                          {selectedPlatformRecords.filter((record) => record.status === "submitted").length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">公示中</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {selectedPlatformRecords.filter((record) => record.status === "publicity").length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">正式挂网</p>
                        <p className="text-2xl font-bold text-indigo-600">
                          {selectedPlatformRecords.filter((record) => record.status === "enabled").length}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  {selectedPlatformRecords.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>产品</TableHead>
                            <TableHead>规格</TableHead>
                            <TableHead className="w-[180px]">产品描述</TableHead>
                            <TableHead>医保C码</TableHead>
                            <TableHead>挂网价</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>经办人</TableHead>
                            <TableHead>挂网时间</TableHead>
                            <TableHead>剩余天数</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPlatformRecords.map((record) => {
                            const linkedProduct = productCodeMap.get(Number(record.productId));
                            const medicalInsuranceCode =
                              String(
                                record.medicalInsuranceCode ||
                                  linkedProduct?.medicalInsuranceCode ||
                                  "",
                              ).trim() || "-";
                            const listingTime = getListingTime(record);

                            return (
                              <TableRow
                                key={record.recordId}
                                className={selectedRecordId === record.recordId ? "bg-primary/5" : ""}
                                onClick={() => setSelectedRecordId(record.recordId)}
                              >
                                <TableCell className="min-w-[220px]">
                                  <div className="font-medium">{record.name}</div>
                                  <div className="text-xs text-muted-foreground">{record.code}</div>
                                </TableCell>
                                <TableCell>{record.specification || "-"}</TableCell>
                                <TableCell className="w-[180px] max-w-[180px]">
                                  <div
                                    className="truncate text-sm"
                                    title={record.description || "-"}
                                  >
                                    {record.description || "-"}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{medicalInsuranceCode}</TableCell>
                                <TableCell>{formatCurrency(record.listedPrice)}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={statusMap[record.status].variant}
                                    className={statusMap[record.status].className}
                                  >
                                    {statusMap[record.status].label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div>{record.handlerName || "-"}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {record.handlerDepartment || "-"}
                                  </div>
                                </TableCell>
                                <TableCell>{formatDateTime(listingTime)}</TableCell>
                                <TableCell>
                                  {isDueSoon(record) ? (
                                    <span className="font-medium text-amber-600">
                                      {getRemainingText(record)}
                                    </span>
                                  ) : (
                                    getRemainingText(record)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    {isEditableStatus(record.status) && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleSubmitRecord(viewingPlatform, record);
                                        }}
                                      >
                                        <Send className="h-4 w-4 mr-1" />
                                        提交
                                      </Button>
                                    )}
                                    {record.status === "submitted" && canApprove && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleApproveRecord(viewingPlatform, record);
                                        }}
                                      >
                                        <ShieldCheck className="h-4 w-4 mr-1" />
                                        审核通过
                                      </Button>
                                    )}
                                    {record.status === "publicity_completed" && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleEnableRecord(viewingPlatform, record);
                                        }}
                                      >
                                        <PlayCircle className="h-4 w-4 mr-1" />
                                        启用
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="border rounded-lg px-4 py-8 text-sm text-muted-foreground text-center">
                      当前平台暂无挂网记录
                    </div>
                  )}

                  {selectedRecord ? (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-semibold">记录详情</h3>
                            <p className="text-sm text-muted-foreground">
                              {selectedRecord.name} / {selectedRecord.code}
                            </p>
                          </div>
                          <Badge
                            variant={statusMap[selectedRecord.status].variant}
                            className={statusMap[selectedRecord.status].className}
                          >
                            {statusMap[selectedRecord.status].label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="rounded-lg border p-4">
                            <p className="text-muted-foreground">经办人</p>
                            <p className="font-medium">{selectedRecord.handlerName || "-"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {selectedRecord.handlerDepartment || "-"}
                            </p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-muted-foreground">提交时间</p>
                            <p className="font-medium">{formatDateTime(selectedRecord.submittedAt)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              审核时间：{formatDateTime(selectedRecord.approvedAt)}
                            </p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-muted-foreground">公示周期</p>
                            <p className="font-medium">
                              {formatDateTime(selectedRecord.publicityStartAt)} 至{" "}
                              {formatDateTime(selectedRecord.publicityEndAt)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              当前剩余：{getRemainingText(selectedRecord)}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
                            <Clock3 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">状态流转日志</span>
                          </div>
                          {selectedRecord.operationLogs.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>时间</TableHead>
                                  <TableHead>动作</TableHead>
                                  <TableHead>状态</TableHead>
                                  <TableHead>操作人</TableHead>
                                  <TableHead>说明</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {[...selectedRecord.operationLogs]
                                  .slice()
                                  .reverse()
                                  .map((log) => (
                                    <TableRow key={log.id}>
                                      <TableCell>{formatDateTime(log.operatedAt)}</TableCell>
                                      <TableCell>{operationLabels[log.action] || log.action}</TableCell>
                                      <TableCell>
                                        {log.fromStatus && log.toStatus
                                          ? `${statusMap[log.fromStatus].label} -> ${statusMap[log.toStatus].label}`
                                          : log.toStatus
                                            ? statusMap[log.toStatus].label
                                            : "-"}
                                      </TableCell>
                                      <TableCell>{log.operatorName || "-"}</TableCell>
                                      <TableCell>{log.note || "-"}</TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                              暂无状态流转日志
                            </div>
                          )}
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">通知记录</span>
                          </div>
                          {selectedRecord.notificationLogs.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>时间</TableHead>
                                  <TableHead>节点</TableHead>
                                  <TableHead>通知对象</TableHead>
                                  <TableHead>渠道</TableHead>
                                  <TableHead>发送结果</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {[...selectedRecord.notificationLogs]
                                  .slice()
                                  .reverse()
                                  .map((log) => (
                                    <TableRow key={log.id}>
                                      <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                                      <TableCell>{triggerLabels[log.trigger] || log.trigger}</TableCell>
                                      <TableCell>
                                        {log.recipients.length > 0
                                          ? log.recipients.map((item) => item.name).join("、")
                                          : "-"}
                                      </TableCell>
                                      <TableCell>
                                        {log.channels.length > 0
                                          ? log.channels.map((channel) => channelLabels[channel]).join(" / ")
                                          : "ERP站内消息"}
                                      </TableCell>
                                      <TableCell>
                                        {log.deliveries.length > 0
                                          ? log.deliveries
                                              .map(
                                                (delivery) =>
                                                  `${channelLabels[delivery.channel]}：${deliveryLabels[delivery.status]}`,
                                              )
                                              .join("；")
                                          : "-"}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                              暂无通知记录
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => handlePrint(viewingPlatform)}>
                    <Printer className="h-4 w-4 mr-1" />
                    打印
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewDialogOpen(false);
                      openDialog(viewingPlatform);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    维护待提交
                  </Button>
                  <Button variant="outline" onClick={() => handleExport(viewingPlatform)}>
                    <Download className="h-4 w-4 mr-1" />
                    导出
                  </Button>
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                    关闭
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </DraggableDialogContent>
        </DraggableDialog>

        <DraggableDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          defaultWidth={1080}
          defaultHeight={780}
          isMaximized={formDialogMaximized}
          onMaximizedChange={setFormDialogMaximized}
        >
          <DraggableDialogContent isMaximized={formDialogMaximized}>
            <DialogHeader>
              <DialogTitle>挂网资料维护</DialogTitle>
              <DialogDescription>
                编辑当前平台的草稿 / 待提交产品，已提交及后续状态记录请在详情页查看
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[72vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label>选择平台 *</Label>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-between md:w-[360px]"
                    onClick={() => setPlatformDialogOpen(true)}
                  >
                    <span className="truncate">
                      {formData.platformId
                        ? `${formData.platformName} - ${formData.province}`
                        : "选择平台后自动带出待维护记录"}
                    </span>
                    <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Button>
                  {formData.platformId ? (
                    <div className="text-sm text-muted-foreground">
                      当前已绑定：<span className="font-medium text-foreground">{formData.platformType}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {formData.platformId ? (
                <>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">平台名称</p>
                        <p className="font-medium">{formData.platformName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">区域</p>
                        <p className="font-medium">{formData.province}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">平台类型</p>
                        <p className="font-medium">{formData.platformType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">核验状态</p>
                        <p className="font-medium">
                          {verificationMap[formData.verificationStatus as keyof typeof verificationMap]?.label || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">登录入口</p>
                        <Button
                          variant="link"
                          className="h-auto p-0 font-medium"
                          onClick={() => {
                            const platform = platforms.find((item) => String(item.id) === formData.platformId);
                            if (platform) handleOpenPlatform(platform);
                          }}
                        >
                          {formData.platformUrl}
                        </Button>
                      </div>
                      <div>
                        <p className="text-muted-foreground">官方来源</p>
                        <a
                          href={getSafeUrl(formData.officialSourceUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline break-all"
                        >
                          {formData.officialSourceUrl}
                        </a>
                      </div>
                    </div>
                  </div>

                  {lockedRecordCount > 0 ? (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        当前平台还有 {lockedRecordCount} 条已提交 / 公示中 / 正式挂网记录，已锁定不可在此任意修改。
                        如需查看状态和通知留痕，请回到“挂网详情”。
                      </div>
                    </div>
                  ) : null}

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>待维护产品</Label>
                      <Badge variant="secondary">当前 {formData.productDetails.length} 个产品</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                      <div className="text-sm text-muted-foreground">
                        仅可选择：成品 + 医疗器械，且不能重复选择已进入公示/正式挂网的产品
                      </div>
                      <Button type="button" variant="outline" onClick={() => setProductDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        选择产品
                      </Button>
                    </div>

                    {formData.productDetails.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>产品编码</TableHead>
                              <TableHead>产品名称</TableHead>
                              <TableHead>规格</TableHead>
                              <TableHead>单位</TableHead>
                              <TableHead>产品描述</TableHead>
                              <TableHead className="w-[140px]">挂网价格</TableHead>
                              <TableHead className="w-[80px] text-right">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.productDetails.map((product) => (
                              <TableRow key={product.recordId || product.productId}>
                                <TableCell className="font-medium">{product.code}</TableCell>
                                <TableCell>{product.name}</TableCell>
                                <TableCell>{product.specification || "-"}</TableCell>
                                <TableCell>{product.unit || "-"}</TableCell>
                                <TableCell className="max-w-[240px]">
                                  <div className="truncate" title={product.description || "-"}>
                                    {product.description || "-"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={product.listedPrice}
                                    onChange={(event) =>
                                      updateProductPrice(
                                        product.productId,
                                        parseFloat(event.target.value) || 0,
                                      )
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() =>
                                      setFormData((current) => ({
                                        ...current,
                                        productDetails: current.productDetails.filter(
                                          (item) => item.productId !== product.productId,
                                        ),
                                      }))
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="border rounded-lg px-4 py-8 text-sm text-muted-foreground text-center">
                        暂无待维护产品，请先选择产品
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button variant="outline" onClick={() => handleSave("draft")}>
                保存草稿
              </Button>
              <Button onClick={() => handleSave("pending_submission")}>保存为待提交</Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <DraggableDialog
          open={platformDialogOpen}
          onOpenChange={setPlatformDialogOpen}
          defaultWidth={980}
          defaultHeight={720}
          isMaximized={platformDialogMaximized}
          onMaximizedChange={setPlatformDialogMaximized}
        >
          <DraggableDialogContent isMaximized={platformDialogMaximized}>
            <DialogHeader>
              <DialogTitle>选择挂网平台</DialogTitle>
              <DialogDescription>选择平台后自动带出当前平台的草稿 / 待提交挂网记录</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={platformSearchTerm}
                  onChange={(event) => setPlatformSearchTerm(event.target.value)}
                  placeholder="搜索平台名称、区域、平台类型、网址..."
                  className="pl-9"
                />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>平台名称</TableHead>
                      <TableHead>区域</TableHead>
                      <TableHead>平台类型</TableHead>
                      <TableHead>待维护记录</TableHead>
                      <TableHead>正式挂网</TableHead>
                      <TableHead className="w-[90px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectablePlatforms.length > 0 ? (
                      selectablePlatforms.map((platform) => {
                        const snapshot = getListingSnapshot(platform.id);
                        const editableCount = snapshot.productDetails.filter((record) =>
                          isEditableStatus(record.status),
                        ).length;
                        const enabledCount = snapshot.productDetails.filter(
                          (record) => record.status === "enabled",
                        ).length;

                        return (
                          <TableRow key={platform.id}>
                            <TableCell className="font-medium">
                              <div>{platform.platformName}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[320px]">
                                {platform.platformUrl}
                              </div>
                            </TableCell>
                            <TableCell>{platform.province}</TableCell>
                            <TableCell>{platform.platformType}</TableCell>
                            <TableCell>{editableCount}</TableCell>
                            <TableCell>{enabledCount}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectPlatformForForm(String(platform.id))}
                              >
                                选择
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                          没有找到匹配的平台
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPlatformDialogOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>

        <DraggableDialog
          open={productDialogOpen}
          onOpenChange={setProductDialogOpen}
          defaultWidth={1100}
          defaultHeight={760}
          isMaximized={productDialogMaximized}
          onMaximizedChange={setProductDialogMaximized}
        >
          <DraggableDialogContent isMaximized={productDialogMaximized}>
            <DialogHeader>
              <DialogTitle>选择挂网产品</DialogTitle>
              <DialogDescription>仅显示成品 + 医疗器械，且自动排除已进入正式流程的产品</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={productSearchTerm}
                    onChange={(event) => setProductSearchTerm(event.target.value)}
                    placeholder="搜索产品编码、名称、规格、描述..."
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">已选 {selectedProductIds.length} 个</Badge>
                  <Button type="button" onClick={addSelectedProducts} disabled={selectedProductIds.length === 0}>
                    批量加入
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[72px] text-center">勾选</TableHead>
                      <TableHead>产品编码</TableHead>
                      <TableHead>产品名称</TableHead>
                      <TableHead>规格</TableHead>
                      <TableHead>单位</TableHead>
                      <TableHead>产品描述</TableHead>
                      <TableHead className="text-right">默认价格</TableHead>
                      <TableHead className="w-[90px] text-right">快捷</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectableProducts.length > 0 ? (
                      selectableProducts.map((product: any) => (
                        <TableRow key={product.id}>
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(product.id)}
                              onChange={() => toggleProductSelection(product.id)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{product.code}</TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.specification || "-"}</TableCell>
                          <TableCell>{product.unit || "-"}</TableCell>
                          <TableCell className="max-w-[320px]">
                            <div className="truncate" title={product.description || "-"}>
                              {product.description || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(getProductBasePrice(product))}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button type="button" size="sm" variant="outline" onClick={() => addProduct(product)}>
                              选择
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          暂无可选产品
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedProductIds([]);
                  setProductDialogOpen(false);
                }}
              >
                取消
              </Button>
              <Button onClick={addSelectedProducts} disabled={selectedProductIds.length === 0}>
                批量加入
              </Button>
            </DialogFooter>
          </DraggableDialogContent>
        </DraggableDialog>
      </div>
    </ERPLayout>
  );
}
