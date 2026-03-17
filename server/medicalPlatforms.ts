import { promises as fs } from "node:fs";
import path from "node:path";
import { inArray } from "drizzle-orm";
import { departments, users } from "../drizzle/schema";
import { createOperationLog, getDb } from "./db";
import { formatDateTime } from "./_core/formatting";
import { sendEmail } from "./emailService";
import { notifyTodoToUsers } from "./wechatService";

export type MedicalPlatformVerificationStatus = "verified" | "pending";
export type MedicalPlatformType = "医保服务平台" | "医药招采平台";
export type MedicalPlatformCoverageLevel = "national" | "province";
export type MedicalPlatformListingWorkflowStatus =
  | "draft"
  | "pending_submission"
  | "submitted"
  | "publicity"
  | "publicity_completed"
  | "enabled";
export type MedicalPlatformListingSaveMode = "draft" | "pending_submission";
export type MedicalPlatformNotificationChannel = "erp" | "wechat" | "email";
export type MedicalPlatformNotificationTrigger =
  | "submit_success"
  | "publicity_started"
  | "publicity_reminder"
  | "publicity_completed";
export type MedicalPlatformOperationAction =
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

export interface MedicalPlatformActor {
  id?: number | null;
  name?: string | null;
  role?: string | null;
  department?: string | null;
  email?: string | null;
  position?: string | null;
}

export interface MedicalPlatformNotificationRecipient {
  userId?: number | null;
  name: string;
  department?: string;
  position?: string;
  email?: string;
  source?: string;
}

export interface MedicalPlatformNotificationDelivery {
  channel: MedicalPlatformNotificationChannel;
  status: "success" | "failed" | "skipped";
  detail?: string;
  sentAt: string;
}

export interface MedicalPlatformNotificationRecord {
  id: string;
  trigger: MedicalPlatformNotificationTrigger;
  title: string;
  content: string;
  channels: MedicalPlatformNotificationChannel[];
  recipients: MedicalPlatformNotificationRecipient[];
  deliveries: MedicalPlatformNotificationDelivery[];
  createdAt: string;
  createdBy: string;
}

export interface MedicalPlatformOperationRecord {
  id: string;
  action: MedicalPlatformOperationAction;
  operatorId?: number | null;
  operatorName: string;
  operatorRole?: string;
  operatorDepartment?: string;
  note?: string;
  fromStatus?: MedicalPlatformListingWorkflowStatus;
  toStatus?: MedicalPlatformListingWorkflowStatus;
  operatedAt: string;
}

export interface MedicalPlatformListedProduct {
  recordId: string;
  productId: number;
  code: string;
  name: string;
  specification: string;
  unit: string;
  description: string;
  listedPrice: number;
  status: MedicalPlatformListingWorkflowStatus;
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
  operationLogs: MedicalPlatformOperationRecord[];
  notificationLogs: MedicalPlatformNotificationRecord[];
}

export interface MedicalPlatformListingSnapshot {
  productDetails: MedicalPlatformListedProduct[];
  lastUpdate: string;
}

export interface MedicalPlatform {
  id: number;
  regionCode: string;
  province: string;
  platformName: string;
  platformType: MedicalPlatformType;
  coverageLevel: MedicalPlatformCoverageLevel;
  platformUrl: string;
  officialSourceUrl: string;
  verificationStatus: MedicalPlatformVerificationStatus;
  status: "active" | "pending" | "inactive";
  accountNo: string;
  password: string;
  contactPerson: string;
  contactPhone: string;
  productCount: number;
  registrationDate: string;
  expiryDate: string;
  lastUpdate: string;
  remarks: string;
}

export interface MedicalPlatformWithListing extends MedicalPlatform {
  listingData: MedicalPlatformListingSnapshot;
}

interface MedicalPlatformStore {
  customPlatforms: MedicalPlatform[];
  overrides: Record<string, Partial<MedicalPlatform>>;
}

interface MedicalPlatformQuery {
  search?: string;
  province?: string;
  platformType?: string;
  verificationStatus?: MedicalPlatformVerificationStatus;
  limit?: number;
  offset?: number;
}

interface ProvinceSeed {
  regionCode: string;
  province: string;
}

interface PlatformOverride {
  platformName: string;
  platformType: MedicalPlatformType;
  platformUrl: string;
  officialSourceUrl?: string;
  remarks?: string;
}

interface ResolvedUser {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
  role: string;
}

const VERIFIED_DATE = "2026-03-13";
const NATIONAL_PLATFORM_URL = "https://fuwu.nhsa.gov.cn/nationalHallSt/#/unitLogin";
const NATIONAL_SOURCE_URL = "https://fuwu.nhsa.gov.cn/";
const LISTING_STORE_PATH = path.resolve(process.cwd(), ".local-db", "medical-platform-listings.json");
const PLATFORM_STORE_PATH = path.resolve(process.cwd(), ".local-db", "medical-platforms.json");
const PUBLICITY_DAYS = 35;
const REMINDER_DAYS = 3;
const EMAIL_ENABLED = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
);

const PROVINCES: ProvinceSeed[] = [
  { regionCode: "CN-11", province: "北京市" },
  { regionCode: "CN-12", province: "天津市" },
  { regionCode: "CN-31", province: "上海市" },
  { regionCode: "CN-50", province: "重庆市" },
  { regionCode: "CN-13", province: "河北省" },
  { regionCode: "CN-14", province: "山西省" },
  { regionCode: "CN-15", province: "内蒙古自治区" },
  { regionCode: "CN-21", province: "辽宁省" },
  { regionCode: "CN-22", province: "吉林省" },
  { regionCode: "CN-23", province: "黑龙江省" },
  { regionCode: "CN-32", province: "江苏省" },
  { regionCode: "CN-33", province: "浙江省" },
  { regionCode: "CN-34", province: "安徽省" },
  { regionCode: "CN-35", province: "福建省" },
  { regionCode: "CN-36", province: "江西省" },
  { regionCode: "CN-37", province: "山东省" },
  { regionCode: "CN-41", province: "河南省" },
  { regionCode: "CN-42", province: "湖北省" },
  { regionCode: "CN-43", province: "湖南省" },
  { regionCode: "CN-44", province: "广东省" },
  { regionCode: "CN-45", province: "广西壮族自治区" },
  { regionCode: "CN-46", province: "海南省" },
  { regionCode: "CN-51", province: "四川省" },
  { regionCode: "CN-52", province: "贵州省" },
  { regionCode: "CN-53", province: "云南省" },
  { regionCode: "CN-54", province: "西藏自治区" },
  { regionCode: "CN-61", province: "陕西省" },
  { regionCode: "CN-62", province: "甘肃省" },
  { regionCode: "CN-63", province: "青海省" },
  { regionCode: "CN-64", province: "宁夏回族自治区" },
  { regionCode: "CN-65", province: "新疆维吾尔自治区" },
];

const PLATFORM_OVERRIDES: Record<string, PlatformOverride> = {
  北京市: {
    platformName: "北京市医保公共服务平台",
    platformType: "医保服务平台",
    platformUrl: "https://fw.ybj.beijing.gov.cn/hallEnter/#/unitLogin",
    officialSourceUrl: "https://fw.ybj.beijing.gov.cn/hallEnter/#/unitLogin",
    remarks: "已核验北京医保公共服务平台单位登录入口。",
  },
  辽宁省: {
    platformName: "辽宁省医保公共服务平台",
    platformType: "医保服务平台",
    platformUrl: "https://ggfw.ybj.ln.gov.cn/lnzc/hsa-local/web/hallEnter//#/Index",
    officialSourceUrl: "https://ggfw.ybj.ln.gov.cn/lnzc/hsa-local/web/hallEnter//#/Index",
    remarks: "已核验辽宁医保公共服务平台入口。",
  },
  吉林省: {
    platformName: "吉林省医保公共服务平台",
    platformType: "医保服务平台",
    platformUrl: "https://wt.hs.ybj.jl.gov.cn:18443/hallEnter/#/Index",
    officialSourceUrl: "https://wt.hs.ybj.jl.gov.cn:18443/hallEnter/#/Index",
    remarks: "已核验吉林医保公共服务平台入口。",
  },
  浙江省: {
    platformName: "浙江省医保医药采购平台",
    platformType: "医药招采平台",
    platformUrl: "http://med.ybj.zj.gov.cn",
    officialSourceUrl: "http://med.ybj.zj.gov.cn",
    remarks: "已核验浙江省医药采购平台入口。",
  },
  福建省: {
    platformName: "福建省药械联合限价阳光采购平台",
    platformType: "医药招采平台",
    platformUrl: "http://120.32.125.17:18080/",
    officialSourceUrl: "http://120.32.125.17:18080/",
    remarks: "已核验福建省药械联合限价阳光采购平台入口。",
  },
  湖南省: {
    platformName: "湖南省医疗保障招采管理系统",
    platformType: "医药招采平台",
    platformUrl: "https://tps.ybj.hunan.gov.cn/",
    officialSourceUrl: "https://tps.ybj.hunan.gov.cn/",
    remarks: "已核验湖南省医保招采平台入口。",
  },
  广东省: {
    platformName: "广东省药品交易中心平台",
    platformType: "医药招采平台",
    platformUrl: "https://www.gdmede.com.cn/",
    officialSourceUrl: "https://www.gdmede.com.cn/",
    remarks: "已核验广东省药品交易平台入口。",
  },
  广西壮族自治区: {
    platformName: "广西医保公共服务平台",
    platformType: "医保服务平台",
    platformUrl: "https://www.gxybj.com/",
    officialSourceUrl: "https://www.gxybj.com/",
    remarks: "已核验广西医保公共服务平台入口。",
  },
};

const STATUS_LABELS: Record<MedicalPlatformListingWorkflowStatus, string> = {
  draft: "草稿",
  pending_submission: "待提交",
  submitted: "已提交",
  publicity: "公示中",
  publicity_completed: "公示完成",
  enabled: "正式挂网",
};

const TRIGGER_LABELS: Record<MedicalPlatformNotificationTrigger, string> = {
  submit_success: "提交成功通知",
  publicity_started: "进入公示期通知",
  publicity_reminder: "公示到期提醒",
  publicity_completed: "公示结束通知",
};

const baseMedicalPlatforms: MedicalPlatform[] = [
  {
    id: 1,
    regionCode: "CN",
    province: "全国",
    platformName: "国家医保服务平台单位网厅",
    platformType: "医保服务平台",
    coverageLevel: "national",
    platformUrl: NATIONAL_PLATFORM_URL,
    officialSourceUrl: NATIONAL_SOURCE_URL,
    verificationStatus: "verified",
    status: "active",
    accountNo: "",
    password: "",
    contactPerson: "",
    contactPhone: "",
    productCount: 0,
    registrationDate: "",
    expiryDate: "",
    lastUpdate: VERIFIED_DATE,
    remarks: "国家医保服务平台统一单位登录入口，可作为全国兜底入口。",
  },
  ...PROVINCES.map<MedicalPlatform>((item, index) => {
    const override = PLATFORM_OVERRIDES[item.province];
    const verified = Boolean(override);
    const verificationStatus: MedicalPlatformVerificationStatus = verified ? "verified" : "pending";
    const status: MedicalPlatform["status"] = verified ? "active" : "pending";

    return {
      id: index + 2,
      regionCode: item.regionCode,
      province: item.province,
      platformName: override?.platformName || `${item.province}医保服务平台`,
      platformType: override?.platformType || "医保服务平台",
      coverageLevel: "province" as const,
      platformUrl: override?.platformUrl || NATIONAL_PLATFORM_URL,
      officialSourceUrl: override?.officialSourceUrl || NATIONAL_SOURCE_URL,
      verificationStatus,
      status,
      accountNo: "",
      password: "",
      contactPerson: "",
      contactPhone: "",
      productCount: 0,
      registrationDate: "",
      expiryDate: "",
      lastUpdate: VERIFIED_DATE,
      remarks:
        override?.remarks ||
        `当前先使用国家医保服务平台单位网厅作为 ${item.province} 的兜底入口，后续可再补充省级独立平台。`,
    };
  }),
];

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function nowDateString() {
  return nowIso().slice(0, 10);
}

function toDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoTimestamp(value?: string | null, fallbackDate?: string) {
  const parsed = toDate(value || "");
  if (parsed) return parsed.toISOString();
  const safeDate = String(fallbackDate || VERIFIED_DATE).slice(0, 10) || VERIFIED_DATE;
  return `${safeDate}T09:00:00.000Z`;
}

function addDaysToIso(baseIso: string, days: number) {
  const parsed = toDate(baseIso);
  if (!parsed) return null;
  const next = new Date(parsed);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function isOnOrAfter(left?: string | null, right?: string | null) {
  const leftDate = toDate(left || "");
  const rightDate = toDate(right || "");
  if (!leftDate || !rightDate) return false;
  return leftDate.getTime() >= rightDate.getTime();
}

function parseDepartments(raw: string | null | undefined) {
  return String(raw || "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueByKey<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function isWorkflowStatus(value: unknown): value is MedicalPlatformListingWorkflowStatus {
  return [
    "draft",
    "pending_submission",
    "submitted",
    "publicity",
    "publicity_completed",
    "enabled",
  ].includes(String(value));
}

function isEditableStatus(status: MedicalPlatformListingWorkflowStatus) {
  return status === "draft" || status === "pending_submission";
}

function normalizeDelivery(raw: any): MedicalPlatformNotificationDelivery {
  const sentAt = toIsoTimestamp(raw?.sentAt, VERIFIED_DATE);
  const channel = ["erp", "wechat", "email"].includes(String(raw?.channel))
    ? (raw.channel as MedicalPlatformNotificationChannel)
    : "erp";
  const status = ["success", "failed", "skipped"].includes(String(raw?.status))
    ? raw.status
    : "success";
  return {
    channel,
    status,
    detail: raw?.detail ? String(raw.detail) : undefined,
    sentAt,
  };
}

function normalizeNotificationRecipient(raw: any): MedicalPlatformNotificationRecipient {
  return {
    userId:
      Number.isFinite(Number(raw?.userId)) && Number(raw?.userId) > 0
        ? Number(raw.userId)
        : null,
    name: String(raw?.name || "未指定人员"),
    department: raw?.department ? String(raw.department) : undefined,
    position: raw?.position ? String(raw.position) : undefined,
    email: raw?.email ? String(raw.email) : undefined,
    source: raw?.source ? String(raw.source) : undefined,
  };
}

function normalizeNotification(raw: any, fallbackDate: string): MedicalPlatformNotificationRecord {
  const trigger = [
    "submit_success",
    "publicity_started",
    "publicity_reminder",
    "publicity_completed",
  ].includes(String(raw?.trigger))
    ? (raw.trigger as MedicalPlatformNotificationTrigger)
    : "submit_success";
  const deliveries: MedicalPlatformNotificationDelivery[] = Array.isArray(raw?.deliveries)
    ? raw.deliveries.map((item: any) => normalizeDelivery(item))
    : [];
  const channels = Array.isArray(raw?.channels)
    ? raw.channels.filter(
        (item: unknown): item is MedicalPlatformNotificationChannel =>
          ["erp", "wechat", "email"].includes(String(item)),
      )
    : deliveries.map((item) => item.channel);
  return {
    id: String(raw?.id || createId("notify")),
    trigger,
    title: String(raw?.title || TRIGGER_LABELS[trigger]),
    content: String(raw?.content || ""),
    channels: uniqueByKey(
      (channels as MedicalPlatformNotificationChannel[]).map((item) => item),
      (item) => item,
    ),
    recipients: Array.isArray(raw?.recipients)
      ? raw.recipients.map((item: any) => normalizeNotificationRecipient(item))
      : [],
    deliveries,
    createdAt: toIsoTimestamp(raw?.createdAt, fallbackDate),
    createdBy: String(raw?.createdBy || "系统"),
  };
}

function normalizeOperation(raw: any, fallbackDate: string): MedicalPlatformOperationRecord {
  const action = [
    "legacy_import",
    "create",
    "save_draft",
    "save_pending_submission",
    "remove_draft",
    "submit",
    "approve",
    "publicity_reminder",
    "publicity_complete",
    "enable",
  ].includes(String(raw?.action))
    ? (raw.action as MedicalPlatformOperationAction)
    : "legacy_import";
  return {
    id: String(raw?.id || createId("op")),
    action,
    operatorId:
      Number.isFinite(Number(raw?.operatorId)) && Number(raw?.operatorId) > 0
        ? Number(raw.operatorId)
        : null,
    operatorName: String(raw?.operatorName || "系统"),
    operatorRole: raw?.operatorRole ? String(raw.operatorRole) : undefined,
    operatorDepartment: raw?.operatorDepartment
      ? String(raw.operatorDepartment)
      : undefined,
    note: raw?.note ? String(raw.note) : undefined,
    fromStatus: isWorkflowStatus(raw?.fromStatus) ? raw.fromStatus : undefined,
    toStatus: isWorkflowStatus(raw?.toStatus) ? raw.toStatus : undefined,
    operatedAt: toIsoTimestamp(raw?.operatedAt, fallbackDate),
  };
}

function buildLegacyOperation(platformId: number, raw: any, fallbackDate: string): MedicalPlatformOperationRecord[] {
  if (isWorkflowStatus(raw?.status)) return [];
  return [
    {
      id: createId("op"),
      action: "legacy_import",
      operatorId: null,
      operatorName: "系统",
      operatorRole: "system",
      operatorDepartment: "招商部",
      note: `平台 ${platformId} 的历史挂网记录已迁移为正式挂网状态`,
      toStatus: "enabled",
      operatedAt: toIsoTimestamp(raw?.updatedAt || raw?.createdAt, fallbackDate),
    },
  ];
}

function normalizeListedProduct(
  platformId: number,
  raw: any,
  snapshotLastUpdate: string,
): MedicalPlatformListedProduct {
  const fallbackTimestamp = toIsoTimestamp(raw?.updatedAt || raw?.createdAt, snapshotLastUpdate);
  const status = isWorkflowStatus(raw?.status) ? raw.status : "enabled";
  const publicityStartAt = raw?.publicityStartAt
    ? toIsoTimestamp(raw.publicityStartAt, snapshotLastUpdate)
    : raw?.approvedAt
      ? toIsoTimestamp(raw.approvedAt, snapshotLastUpdate)
      : null;
  const publicityEndAt = raw?.publicityEndAt
    ? toIsoTimestamp(raw.publicityEndAt, snapshotLastUpdate)
    : publicityStartAt
      ? addDaysToIso(publicityStartAt, PUBLICITY_DAYS)
      : null;
  const operations = Array.isArray(raw?.operationLogs)
    ? raw.operationLogs.map((item: any) => normalizeOperation(item, snapshotLastUpdate))
    : buildLegacyOperation(platformId, raw, snapshotLastUpdate);

  return {
    recordId: String(raw?.recordId || `legacy-${platformId}-${Number(raw?.productId || 0)}`),
    productId: Number(raw?.productId || 0),
    code: String(raw?.code || ""),
    name: String(raw?.name || ""),
    specification: String(raw?.specification || ""),
    unit: String(raw?.unit || ""),
    description: String(raw?.description || ""),
    listedPrice: Number(raw?.listedPrice || 0),
    status,
    handlerId:
      Number.isFinite(Number(raw?.handlerId)) && Number(raw?.handlerId) > 0
        ? Number(raw.handlerId)
        : null,
    handlerName: String(raw?.handlerName || "未指定经办人"),
    handlerDepartment: String(raw?.handlerDepartment || "招商部"),
    handlerEmail: raw?.handlerEmail ? String(raw.handlerEmail) : "",
    createdAt: toIsoTimestamp(raw?.createdAt, snapshotLastUpdate),
    updatedAt: fallbackTimestamp,
    submittedAt: raw?.submittedAt ? toIsoTimestamp(raw.submittedAt, snapshotLastUpdate) : null,
    approvedAt: raw?.approvedAt ? toIsoTimestamp(raw.approvedAt, snapshotLastUpdate) : null,
    publicityStartAt,
    publicityEndAt,
    reminderSentAt: raw?.reminderSentAt ? toIsoTimestamp(raw.reminderSentAt, snapshotLastUpdate) : null,
    publicityCompletedAt: raw?.publicityCompletedAt
      ? toIsoTimestamp(raw.publicityCompletedAt, snapshotLastUpdate)
      : null,
    enabledAt: raw?.enabledAt
      ? toIsoTimestamp(raw.enabledAt, snapshotLastUpdate)
      : status === "enabled"
        ? toIsoTimestamp(raw?.updatedAt || raw?.createdAt, snapshotLastUpdate)
        : null,
    operationLogs: operations,
    notificationLogs: Array.isArray(raw?.notificationLogs)
      ? raw.notificationLogs.map((item: any) => normalizeNotification(item, snapshotLastUpdate))
      : [],
  };
}

function normalizeListingSnapshot(
  platformId: number,
  snapshot: unknown,
): MedicalPlatformListingSnapshot {
  const raw = (snapshot || {}) as any;
  const lastUpdate = String(raw?.lastUpdate || VERIFIED_DATE);
  const productDetails = Array.isArray(raw?.productDetails)
    ? raw.productDetails.map((item: any) => normalizeListedProduct(platformId, item, lastUpdate))
    : [];
  return {
    productDetails,
    lastUpdate,
  };
}

function buildMergedPlatforms(platformStore: MedicalPlatformStore) {
  return [
    ...baseMedicalPlatforms.map((item) => ({
      ...item,
      ...(platformStore.overrides[String(item.id)] || {}),
    })),
    ...platformStore.customPlatforms,
  ].filter((item) => item.status !== "inactive");
}

async function readPlatformStore(): Promise<MedicalPlatformStore> {
  try {
    const raw = await fs.readFile(PLATFORM_STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<MedicalPlatformStore>;
    return {
      customPlatforms: Array.isArray(parsed?.customPlatforms) ? parsed.customPlatforms : [],
      overrides: parsed?.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {},
    };
  } catch {
    return { customPlatforms: [], overrides: {} };
  }
}

async function writePlatformStore(store: MedicalPlatformStore) {
  await fs.mkdir(path.dirname(PLATFORM_STORE_PATH), { recursive: true });
  await fs.writeFile(PLATFORM_STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

async function readListingStore(): Promise<Record<string, MedicalPlatformListingSnapshot>> {
  try {
    const raw = await fs.readFile(LISTING_STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, MedicalPlatformListingSnapshot>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeListingStore(store: Record<string, MedicalPlatformListingSnapshot>) {
  await fs.mkdir(path.dirname(LISTING_STORE_PATH), { recursive: true });
  await fs.writeFile(LISTING_STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function mergeListingData(
  platform: MedicalPlatform,
  store: Record<string, MedicalPlatformListingSnapshot>,
): MedicalPlatformWithListing {
  return {
    ...platform,
    listingData: normalizeListingSnapshot(platform.id, store[String(platform.id)]),
  };
}

async function getResolvedUsers(): Promise<ResolvedUser[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      department: users.department,
      position: users.position,
      role: users.role,
    })
    .from(users);
  return rows.map((row) => ({
    id: Number(row.id || 0),
    name: String(row.name || ""),
    email: String(row.email || ""),
    department: String(row.department || ""),
    position: String(row.position || ""),
    role: String(row.role || ""),
  }));
}

async function getDepartmentManagers(
  departmentNames: string[],
  allUsers: ResolvedUser[],
): Promise<ResolvedUser[]> {
  const db = await getDb();
  if (!db || departmentNames.length === 0) return [];

  const rows = await db
    .select({
      name: departments.name,
      managerId: departments.managerId,
    })
    .from(departments)
    .where(inArray(departments.name, departmentNames));

  const managerIds = rows
    .map((row) => Number(row.managerId || 0))
    .filter((id) => id > 0);

  if (managerIds.length > 0) {
    return uniqueByKey(
      allUsers.filter((user) => managerIds.includes(user.id)),
      (user) => String(user.id),
    );
  }

  return uniqueByKey(
    allUsers.filter((user) => {
      const departmentsMatched = parseDepartments(user.department).some((department) =>
        departmentNames.includes(department),
      );
      return departmentsMatched && /负责人|经理|主管|总监/.test(user.position);
    }),
    (user) => String(user.id),
  );
}

function getUsersByDepartments(allUsers: ResolvedUser[], departmentNames: string[]) {
  return uniqueByKey(
    allUsers.filter((user) =>
      parseDepartments(user.department).some((department) => departmentNames.includes(department)),
    ),
    (user) => String(user.id),
  );
}

function toRecipient(user: ResolvedUser, source: string): MedicalPlatformNotificationRecipient {
  return {
    userId: user.id,
    name: user.name || `用户#${user.id}`,
    department: user.department || undefined,
    position: user.position || undefined,
    email: user.email || undefined,
    source,
  };
}

async function resolveRecipientsForTrigger(
  trigger: MedicalPlatformNotificationTrigger,
  record: MedicalPlatformListedProduct,
  allUsers: ResolvedUser[],
): Promise<MedicalPlatformNotificationRecipient[]> {
  const handlerDepartments = parseDepartments(record.handlerDepartment || "招商部");
  const handlerUser =
    allUsers.find((user) => user.id === Number(record.handlerId || 0)) ||
    allUsers.find((user) => user.name === record.handlerName);
  const handlerRecipients = handlerUser
    ? [toRecipient(handlerUser, "handler")]
    : [{
        userId: record.handlerId || null,
        name: record.handlerName || "未指定经办人",
        department: record.handlerDepartment || "招商部",
        email: record.handlerEmail || undefined,
        source: "handler",
      }];
  const managerRecipients = (await getDepartmentManagers(handlerDepartments, allUsers)).map((user) =>
    toRecipient(user, "department_leader"),
  );
  const purchaseBusinessRecipients = getUsersByDepartments(allUsers, ["采购部", "销售部"]).map((user) =>
    toRecipient(user, "purchase_business"),
  );

  if (trigger === "submit_success") {
    return uniqueByKey(handlerRecipients, (item) => String(item.userId || item.name));
  }

  if (trigger === "publicity_completed") {
    return uniqueByKey(
      [...handlerRecipients, ...managerRecipients, ...purchaseBusinessRecipients],
      (item) => String(item.userId || `${item.name}-${item.source || ""}`),
    );
  }

  return uniqueByKey(
    [...handlerRecipients, ...managerRecipients],
    (item) => String(item.userId || `${item.name}-${item.source || ""}`),
  );
}

function buildNotificationContent(
  trigger: MedicalPlatformNotificationTrigger,
  platform: MedicalPlatform,
  record: MedicalPlatformListedProduct,
) {
  const endDateText = record.publicityEndAt ? record.publicityEndAt.slice(0, 10) : "-";
  const startDateText = record.publicityStartAt ? record.publicityStartAt.slice(0, 10) : "-";

  if (trigger === "submit_success") {
    return {
      title: `【挂网提交成功】${record.name} 已提交`,
      content: `平台：${platform.platformName}\n产品：${record.name}（${record.code}）\n当前状态：已提交\n经办人：${record.handlerName}`,
    };
  }

  if (trigger === "publicity_started") {
    return {
      title: `【进入公示期】${record.name} 已开始公示`,
      content: `平台：${platform.platformName}\n产品：${record.name}（${record.code}）\n公示开始：${startDateText}\n公示结束：${endDateText}`,
    };
  }

  if (trigger === "publicity_reminder") {
    return {
      title: `【公示到期提醒】${record.name} 将于 ${endDateText} 结束公示`,
      content: `平台：${platform.platformName}\n产品：${record.name}（${record.code}）\n公示结束时间：${endDateText}\n提醒：距离公示结束还有 3 天，请提前安排后续流程。`,
    };
  }

  return {
    title: `【公示结束】${record.name} 已完成公示`,
    content: `平台：${platform.platformName}\n产品：${record.name}（${record.code}）\n公示结束：${endDateText}\n当前状态：公示完成，可进入启用流程。`,
  };
}

function createOperationRecord(
  action: MedicalPlatformOperationAction,
  actor: MedicalPlatformActor | undefined,
  note: string,
  fromStatus?: MedicalPlatformListingWorkflowStatus,
  toStatus?: MedicalPlatformListingWorkflowStatus,
): MedicalPlatformOperationRecord {
  return {
    id: createId("op"),
    action,
    operatorId:
      Number.isFinite(Number(actor?.id)) && Number(actor?.id) > 0
        ? Number(actor?.id)
        : null,
    operatorName: String(actor?.name || "系统"),
    operatorRole: actor?.role ? String(actor.role) : undefined,
    operatorDepartment: actor?.department ? String(actor.department) : undefined,
    note,
    fromStatus,
    toStatus,
    operatedAt: nowIso(),
  };
}

async function writeAuditTrail(params: {
  platform: MedicalPlatform;
  record: MedicalPlatformListedProduct;
  actor?: MedicalPlatformActor;
  action: "create" | "update" | "delete" | "status_change" | "approve";
  description: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}) {
  await createOperationLog({
    module: "product",
    action: params.action,
    targetType: "medical_platform_listing",
    targetId: params.record.recordId,
    targetName: `${params.platform.platformName} / ${params.record.name}`,
    description: params.description,
    previousData: params.previousData ? JSON.stringify(params.previousData) : undefined,
    newData: params.newData ? JSON.stringify(params.newData) : undefined,
    operatorId: Number(params.actor?.id || 0) || 0,
    operatorName: String(params.actor?.name || "系统"),
    operatorRole: params.actor?.role ? String(params.actor.role) : undefined,
    operatorDepartment: params.actor?.department ? String(params.actor.department) : undefined,
    result: "success",
  } as any);
}

async function dispatchNotification(params: {
  trigger: MedicalPlatformNotificationTrigger;
  platform: MedicalPlatform;
  record: MedicalPlatformListedProduct;
  actor?: MedicalPlatformActor;
  allUsers: ResolvedUser[];
}) {
  const recipients = await resolveRecipientsForTrigger(
    params.trigger,
    params.record,
    params.allUsers,
  );
  const { title, content } = buildNotificationContent(
    params.trigger,
    params.platform,
    params.record,
  );
  const createdAt = nowIso();
  const deliveries: MedicalPlatformNotificationDelivery[] = [
    {
      channel: "erp",
      status: "success",
      detail: "已写入系统内通知记录",
      sentAt: createdAt,
    },
  ];

  const userIds = uniqueByKey(
    recipients
      .map((item) => Number(item.userId || 0))
      .filter((id): id is number => id > 0),
    (item) => String(item),
  );

  if (userIds.length > 0) {
    if (process.env.WECHAT_APPID) {
      try {
        await notifyTodoToUsers({
          userIds,
          title,
          applicant: params.actor?.name || params.record.handlerName || "系统",
          submitTime: formatDateTime(createdAt),
          remark: content,
          jumpUrl: "/investment/listing",
        });
        deliveries.push({
          channel: "wechat",
          status: "success",
          detail: "已推送微信待办",
          sentAt: createdAt,
        });
      } catch (error) {
        deliveries.push({
          channel: "wechat",
          status: "failed",
          detail: error instanceof Error ? error.message : "微信推送失败",
          sentAt: createdAt,
        });
      }
    } else {
      deliveries.push({
        channel: "wechat",
        status: "skipped",
        detail: "未配置微信通知",
        sentAt: createdAt,
      });
    }
  }

  const emails = uniqueByKey(
    recipients
      .map((item) => String(item.email || "").trim())
      .filter((item) => item.includes("@")),
    (item) => item,
  );

  if (emails.length > 0) {
    if (EMAIL_ENABLED) {
      const success = await sendEmail({
        to: emails,
        subject: title,
        html: `<p>${content.replace(/\n/g, "<br/>")}</p>`,
        text: content,
      });
      deliveries.push({
        channel: "email",
        status: success ? "success" : "failed",
        detail: success ? "邮件发送成功" : "邮件发送失败",
        sentAt: createdAt,
      });
    } else {
      deliveries.push({
        channel: "email",
        status: "skipped",
        detail: "未配置 SMTP 邮件发送",
        sentAt: createdAt,
      });
    }
  }

  return {
    id: createId("notify"),
    trigger: params.trigger,
    title,
    content,
    channels: uniqueByKey(deliveries.map((item) => item.channel), (item) => item),
    recipients,
    deliveries,
    createdAt,
    createdBy: String(params.actor?.name || "系统"),
  } satisfies MedicalPlatformNotificationRecord;
}

async function reconcileListingLifecycle(
  mergedPlatforms: MedicalPlatform[],
  inputStore: Record<string, MedicalPlatformListingSnapshot>,
) {
  const allUsers = await getResolvedUsers();
  const platformMap = new Map(mergedPlatforms.map((item) => [item.id, item]));
  const nextStore: Record<string, MedicalPlatformListingSnapshot> = {};
  let changed = false;

  for (const platform of mergedPlatforms) {
    const snapshot = normalizeListingSnapshot(platform.id, inputStore[String(platform.id)]);
    const nextRecords: MedicalPlatformListedProduct[] = [];
    let snapshotChanged = false;

    for (const record of snapshot.productDetails) {
      let nextRecord = { ...record };
      let recordChanged = false;

      if (
        nextRecord.status === "publicity" &&
        nextRecord.publicityStartAt &&
        !nextRecord.publicityEndAt
      ) {
        nextRecord.publicityEndAt = addDaysToIso(nextRecord.publicityStartAt, PUBLICITY_DAYS);
        recordChanged = true;
      }

      if (
        nextRecord.status === "publicity" &&
        nextRecord.publicityEndAt &&
        isOnOrAfter(nowIso(), nextRecord.publicityEndAt)
      ) {
        const previousStatus = nextRecord.status;
        nextRecord = {
          ...nextRecord,
          status: "publicity_completed",
          publicityCompletedAt: nextRecord.publicityEndAt,
          updatedAt: nowIso(),
          operationLogs: [
            ...nextRecord.operationLogs,
            createOperationRecord(
              "publicity_complete",
              { name: "系统", role: "system", department: nextRecord.handlerDepartment },
              "公示期到期，系统自动流转为公示完成",
              previousStatus,
              "publicity_completed",
            ),
          ],
        };
        nextRecord.notificationLogs = [
          ...nextRecord.notificationLogs,
          await dispatchNotification({
            trigger: "publicity_completed",
            platform,
            record: nextRecord,
            actor: { name: "系统", role: "system", department: nextRecord.handlerDepartment },
            allUsers,
          }),
        ];
        await writeAuditTrail({
          platform,
          record: nextRecord,
          actor: { name: "系统", role: "system", department: nextRecord.handlerDepartment },
          action: "status_change",
          description: `挂网记录公示期结束，状态由 ${STATUS_LABELS[previousStatus]} 变更为 ${STATUS_LABELS.publicity_completed}`,
          previousData: { status: previousStatus },
          newData: {
            status: "publicity_completed",
            publicityCompletedAt: nextRecord.publicityCompletedAt,
          },
        });
        recordChanged = true;
      } else if (
        nextRecord.status === "publicity" &&
        nextRecord.publicityEndAt &&
        !nextRecord.reminderSentAt
      ) {
        const reminderAt = addDaysToIso(nextRecord.publicityEndAt, -REMINDER_DAYS);
        if (reminderAt && isOnOrAfter(nowIso(), reminderAt)) {
          nextRecord = {
            ...nextRecord,
            reminderSentAt: nowIso(),
            updatedAt: nowIso(),
            operationLogs: [
              ...nextRecord.operationLogs,
              createOperationRecord(
                "publicity_reminder",
                { name: "系统", role: "system", department: nextRecord.handlerDepartment },
                "系统已发送公示到期前 3 天提醒",
                nextRecord.status,
                nextRecord.status,
              ),
            ],
          };
          nextRecord.notificationLogs = [
            ...nextRecord.notificationLogs,
            await dispatchNotification({
              trigger: "publicity_reminder",
              platform,
              record: nextRecord,
              actor: { name: "系统", role: "system", department: nextRecord.handlerDepartment },
              allUsers,
            }),
          ];
          recordChanged = true;
        }
      }

      if (recordChanged) snapshotChanged = true;
      nextRecords.push(nextRecord);
    }

    nextStore[String(platform.id)] = {
      productDetails: nextRecords,
      lastUpdate: snapshotChanged ? nowDateString() : snapshot.lastUpdate,
    };
    if (snapshotChanged) changed = true;
  }

  if (changed) {
    await writeListingStore(nextStore);
  }

  return nextStore;
}

async function getPlatformContext(options?: { reconcileLifecycle?: boolean }) {
  const platformStore = await readPlatformStore();
  let listingStore = await readListingStore();
  const mergedPlatforms = buildMergedPlatforms(platformStore);

  if (options?.reconcileLifecycle) {
    listingStore = await reconcileListingLifecycle(mergedPlatforms, listingStore);
  }

  return {
    platformStore,
    listingStore,
    mergedPlatforms,
    platformMap: new Map(mergedPlatforms.map((item) => [item.id, item])),
  };
}

function buildProductPayload(
  raw: Partial<MedicalPlatformListedProduct>,
  actor: MedicalPlatformActor | undefined,
  status: MedicalPlatformListingWorkflowStatus,
) {
  return {
    productId: Number(raw.productId || 0),
    code: String(raw.code || ""),
    name: String(raw.name || ""),
    specification: String(raw.specification || ""),
    unit: String(raw.unit || ""),
    description: String(raw.description || ""),
    listedPrice: Number(raw.listedPrice || 0),
    status,
    handlerId:
      Number.isFinite(Number(raw.handlerId || actor?.id)) && Number(raw.handlerId || actor?.id) > 0
        ? Number(raw.handlerId || actor?.id)
        : null,
    handlerName: String(raw.handlerName || actor?.name || "未指定经办人"),
    handlerDepartment: String(raw.handlerDepartment || actor?.department || "招商部"),
    handlerEmail: String(raw.handlerEmail || actor?.email || ""),
  };
}

async function saveListingRecords(params: {
  platformId: number;
  productDetails: Partial<MedicalPlatformListedProduct>[];
  mode: MedicalPlatformListingSaveMode;
  actor?: MedicalPlatformActor;
}) {
  const context = await getPlatformContext();
  const platform = context.platformMap.get(params.platformId);
  if (!platform) {
    throw new Error("未找到挂网平台");
  }

  const existingSnapshot = normalizeListingSnapshot(
    params.platformId,
    context.listingStore[String(params.platformId)],
  );
  const editableExisting = existingSnapshot.productDetails.filter((item) =>
    isEditableStatus(item.status),
  );
  const lockedExisting = existingSnapshot.productDetails.filter(
    (item) => !isEditableStatus(item.status),
  );
  const nextStatus = params.mode === "draft" ? "draft" : "pending_submission";
  const now = nowIso();
  const incomingMap = new Map(
    params.productDetails
      .filter((item) => Number(item.productId || 0) > 0)
      .map((item) => [
        String(item.recordId || `product-${Number(item.productId || 0)}`),
        item,
      ]),
  );
  const editableByRecordId = new Map(
    editableExisting.map((item) => [item.recordId, item] as const),
  );
  const editableByProductId = new Map(
    editableExisting.map((item) => [Number(item.productId), item] as const),
  );
  const nextEditableRecords: MedicalPlatformListedProduct[] = [];

  for (const incoming of params.productDetails) {
    const existing =
      (incoming.recordId ? editableByRecordId.get(String(incoming.recordId)) : undefined) ||
      editableByProductId.get(Number(incoming.productId || 0));
    const previousStatus = existing?.status;
    const payload = buildProductPayload(incoming, params.actor, nextStatus);

    if (existing) {
      const nextRecord: MedicalPlatformListedProduct = {
        ...existing,
        ...payload,
        status: nextStatus,
        updatedAt: now,
        operationLogs: [
          ...existing.operationLogs,
          createOperationRecord(
            nextStatus === "draft" ? "save_draft" : "save_pending_submission",
            params.actor,
            nextStatus === "draft" ? "挂网记录已保存为草稿" : "挂网记录已保存为待提交",
            previousStatus,
            nextStatus,
          ),
        ],
      };
      nextEditableRecords.push(nextRecord);
      await writeAuditTrail({
        platform,
        record: nextRecord,
        actor: params.actor,
        action: "update",
        description:
          nextStatus === "draft" ? "挂网记录已保存为草稿" : "挂网记录已保存为待提交",
        previousData: { status: previousStatus },
        newData: { status: nextStatus, listedPrice: nextRecord.listedPrice },
      });
      continue;
    }

    const createdRecord: MedicalPlatformListedProduct = {
      recordId: String(incoming.recordId || createId(`listing_${params.platformId}`)),
      ...payload,
      createdAt: now,
      updatedAt: now,
      submittedAt: null,
      approvedAt: null,
      publicityStartAt: null,
      publicityEndAt: null,
      reminderSentAt: null,
      publicityCompletedAt: null,
      enabledAt: null,
      operationLogs: [
        createOperationRecord(
          "create",
          params.actor,
          nextStatus === "draft" ? "新建挂网草稿" : "新建挂网待提交记录",
          undefined,
          nextStatus,
        ),
      ],
      notificationLogs: [],
    };
    nextEditableRecords.push(createdRecord);
    await writeAuditTrail({
      platform,
      record: createdRecord,
      actor: params.actor,
      action: "create",
      description:
        nextStatus === "draft" ? "新增挂网草稿记录" : "新增挂网待提交记录",
      newData: { status: nextStatus, listedPrice: createdRecord.listedPrice },
    });
  }

  for (const existing of editableExisting) {
    const stillExists = params.productDetails.some(
      (item) =>
        String(item.recordId || "") === existing.recordId ||
        Number(item.productId || 0) === existing.productId,
    );
    if (!stillExists) {
      await writeAuditTrail({
        platform,
        record: existing,
        actor: params.actor,
        action: "delete",
        description: "草稿/待提交挂网记录已移除",
        previousData: { status: existing.status, listedPrice: existing.listedPrice },
      });
    }
  }

  context.listingStore[String(params.platformId)] = {
    productDetails: [...lockedExisting, ...nextEditableRecords],
    lastUpdate: nowDateString(),
  };
  await writeListingStore(context.listingStore);

  return getMedicalPlatformById(params.platformId);
}

async function transitionListingRecords(params: {
  platformId: number;
  recordIds?: string[];
  fromStatuses: MedicalPlatformListingWorkflowStatus[];
  toStatus: MedicalPlatformListingWorkflowStatus;
  actor?: MedicalPlatformActor;
  operationAction: MedicalPlatformOperationAction;
  notificationTrigger?: MedicalPlatformNotificationTrigger;
  description: (record: MedicalPlatformListedProduct) => string;
  beforeUpdate?: (record: MedicalPlatformListedProduct) => MedicalPlatformListedProduct;
}) {
  const context = await getPlatformContext();
  const platform = context.platformMap.get(params.platformId);
  if (!platform) {
    throw new Error("未找到挂网平台");
  }
  const snapshot = normalizeListingSnapshot(
    params.platformId,
    context.listingStore[String(params.platformId)],
  );
  const allUsers = await getResolvedUsers();
  const targetRecordIds = params.recordIds?.length
    ? new Set(params.recordIds)
    : null;
  let changedCount = 0;

  const nextRecords = await Promise.all(
    snapshot.productDetails.map(async (record) => {
      if (targetRecordIds && !targetRecordIds.has(record.recordId)) {
        return record;
      }
      if (!params.fromStatuses.includes(record.status)) {
        return record;
      }

      const previousStatus = record.status;
      const baseRecord = params.beforeUpdate ? params.beforeUpdate({ ...record }) : { ...record };
      const nextRecord: MedicalPlatformListedProduct = {
        ...baseRecord,
        status: params.toStatus,
        updatedAt: nowIso(),
        operationLogs: [
          ...baseRecord.operationLogs,
          createOperationRecord(
            params.operationAction,
            params.actor,
            params.description(baseRecord),
            previousStatus,
            params.toStatus,
          ),
        ],
      };

      if (params.operationAction === "submit") {
        nextRecord.submittedAt = nowIso();
      }
      if (params.operationAction === "approve") {
        nextRecord.approvedAt = nowIso();
        nextRecord.publicityStartAt = nextRecord.approvedAt;
        nextRecord.publicityEndAt = addDaysToIso(nextRecord.approvedAt, PUBLICITY_DAYS);
      }
      if (params.operationAction === "enable") {
        nextRecord.enabledAt = nowIso();
      }

      if (params.notificationTrigger) {
        nextRecord.notificationLogs = [
          ...nextRecord.notificationLogs,
          await dispatchNotification({
            trigger: params.notificationTrigger,
            platform,
            record: nextRecord,
            actor: params.actor,
            allUsers,
          }),
        ];
      }

      await writeAuditTrail({
        platform,
        record: nextRecord,
        actor: params.actor,
        action: params.operationAction === "approve" ? "approve" : "status_change",
        description: params.description(baseRecord),
        previousData: { status: previousStatus },
        newData: {
          status: params.toStatus,
          submittedAt: nextRecord.submittedAt,
          approvedAt: nextRecord.approvedAt,
          publicityStartAt: nextRecord.publicityStartAt,
          publicityEndAt: nextRecord.publicityEndAt,
          enabledAt: nextRecord.enabledAt,
        },
      });
      changedCount += 1;
      return nextRecord;
    }),
  );

  if (changedCount === 0) {
    throw new Error("没有符合条件的挂网记录可执行当前操作");
  }

  context.listingStore[String(params.platformId)] = {
    productDetails: nextRecords,
    lastUpdate: nowDateString(),
  };
  await writeListingStore(context.listingStore);
  return getMedicalPlatformById(params.platformId);
}

export async function getMedicalPlatforms(params?: MedicalPlatformQuery) {
  const keyword = params?.search?.trim().toLowerCase();
  const offset = params?.offset || 0;
  const context = await getPlatformContext({ reconcileLifecycle: true });
  const limit = params?.limit || context.mergedPlatforms.length;

  return context.mergedPlatforms
    .map((item) => mergeListingData(item, context.listingStore))
    .filter((item) => {
      const matchesSearch =
        !keyword ||
        [item.platformName, item.province, item.platformType, item.platformUrl].some((field) =>
          field.toLowerCase().includes(keyword),
        );
      const matchesProvince =
        !params?.province || params.province === "all" || item.province === params.province;
      const matchesType =
        !params?.platformType ||
        params.platformType === "all" ||
        item.platformType === params.platformType;
      const matchesVerification =
        !params?.verificationStatus || item.verificationStatus === params.verificationStatus;

      return matchesSearch && matchesProvince && matchesType && matchesVerification;
    })
    .slice(offset, offset + limit);
}

export async function getMedicalPlatformById(id: number) {
  const context = await getPlatformContext({ reconcileLifecycle: true });
  const platform = context.mergedPlatforms.find((item) => item.id === id);
  return platform ? mergeListingData(platform, context.listingStore) : undefined;
}

export async function createMedicalPlatform(
  data: Pick<
    MedicalPlatform,
    | "province"
    | "platformName"
    | "platformType"
    | "coverageLevel"
    | "platformUrl"
    | "officialSourceUrl"
    | "verificationStatus"
    | "remarks"
    | "accountNo"
    | "password"
  >,
) {
  const platformStore = await readPlatformStore();
  const allIds = [...baseMedicalPlatforms, ...platformStore.customPlatforms].map((item) => item.id);
  const nextId = (allIds.length > 0 ? Math.max(...allIds) : 0) + 1;
  const nextPlatform: MedicalPlatform = {
    id: nextId,
    regionCode: "",
    province: data.province,
    platformName: data.platformName,
    platformType: data.platformType,
    coverageLevel: data.coverageLevel,
    platformUrl: data.platformUrl,
    officialSourceUrl: data.officialSourceUrl,
    verificationStatus: data.verificationStatus,
    status: data.verificationStatus === "verified" ? "active" : "pending",
    accountNo: data.accountNo || "",
    password: data.password || "",
    contactPerson: "",
    contactPhone: "",
    productCount: 0,
    registrationDate: "",
    expiryDate: "",
    lastUpdate: VERIFIED_DATE,
    remarks: data.remarks,
  };
  platformStore.customPlatforms.push(nextPlatform);
  await writePlatformStore(platformStore);
  return getMedicalPlatformById(nextId);
}

export async function updateMedicalPlatform(
  id: number,
  data: Partial<
    Pick<
      MedicalPlatform,
      | "province"
      | "platformName"
      | "platformType"
      | "coverageLevel"
      | "platformUrl"
      | "officialSourceUrl"
      | "verificationStatus"
      | "remarks"
      | "accountNo"
      | "password"
    >
  >,
) {
  const platformStore = await readPlatformStore();
  const customIndex = platformStore.customPlatforms.findIndex((item) => item.id === id);

  if (customIndex >= 0) {
    platformStore.customPlatforms[customIndex] = {
      ...platformStore.customPlatforms[customIndex],
      ...data,
      status:
        (data.verificationStatus ||
          platformStore.customPlatforms[customIndex].verificationStatus) === "verified"
          ? "active"
          : "pending",
      lastUpdate: VERIFIED_DATE,
    };
  } else {
    platformStore.overrides[String(id)] = {
      ...(platformStore.overrides[String(id)] || {}),
      ...data,
      status:
        (data.verificationStatus || platformStore.overrides[String(id)]?.verificationStatus) ===
        "verified"
          ? "active"
          : "pending",
      lastUpdate: VERIFIED_DATE,
    };
  }

  await writePlatformStore(platformStore);
  return getMedicalPlatformById(id);
}

export async function saveMedicalPlatformListing(
  platformId: number,
  listingData: { productDetails: Partial<MedicalPlatformListedProduct>[]; lastUpdate?: string },
  options?: {
    mode?: MedicalPlatformListingSaveMode;
    actor?: MedicalPlatformActor;
  },
) {
  return saveListingRecords({
    platformId,
    productDetails: listingData.productDetails || [],
    mode: options?.mode || "pending_submission",
    actor: options?.actor,
  });
}

export async function submitMedicalPlatformListings(
  platformId: number,
  recordIds: string[] | undefined,
  actor?: MedicalPlatformActor,
) {
  return transitionListingRecords({
    platformId,
    recordIds,
    fromStatuses: ["draft", "pending_submission"],
    toStatus: "submitted",
    actor,
    operationAction: "submit",
    notificationTrigger: "submit_success",
    description: (record) => `挂网记录 ${record.name} 提交成功，状态变更为已提交`,
  });
}

export async function approveMedicalPlatformListings(
  platformId: number,
  recordIds: string[] | undefined,
  actor?: MedicalPlatformActor,
) {
  return transitionListingRecords({
    platformId,
    recordIds,
    fromStatuses: ["submitted"],
    toStatus: "publicity",
    actor,
    operationAction: "approve",
    notificationTrigger: "publicity_started",
    description: (record) =>
      `挂网记录 ${record.name} 审核通过，系统已自动进入 ${PUBLICITY_DAYS} 天公示期`,
  });
}

export async function enableMedicalPlatformListings(
  platformId: number,
  recordIds: string[] | undefined,
  actor?: MedicalPlatformActor,
) {
  return transitionListingRecords({
    platformId,
    recordIds,
    fromStatuses: ["publicity_completed"],
    toStatus: "enabled",
    actor,
    operationAction: "enable",
    description: (record) => `挂网记录 ${record.name} 已启用并转为正式挂网`,
  });
}
