const STATUS_LABEL_FALLBACKS: Record<string, string> = {
  active: "启用",
  inactive: "停用",
  blacklist: "黑名单",
  draft: "草稿",
  pending: "待处理",
  pending_submission: "待提交",
  submitted: "已提交",
  reviewing: "审核中",
  approved: "已审批",
  rejected: "已驳回",
  completed: "已完成",
  done: "已完成",
  cancelled: "已取消",
  canceled: "已取消",
  planning: "规划中",
  in_progress: "进行中",
  archived: "已归档",
  processing: "处理中",
  inspecting: "检验中",
  qualified: "合格",
  unqualified: "不合格",
  pass: "通过",
  failed: "失败",
  publicity: "公示中",
  publicity_completed: "公示完成",
  enabled: "已启用",
  applying: "申请中",
  shipped: "已发货",
  partial_shipped: "部分发货",
  received: "已收货",
  partial_received: "部分收货",
  paid: "已付款",
  partial_paid: "部分付款",
  unpaid: "未付款",
  overdue: "已逾期",
  available: "可用",
  unavailable: "不可用",
  normal: "正常",
  abnormal: "异常",
};

export function localizeStatusLabel(status: unknown): string {
  const raw = String(status ?? "").trim();
  if (!raw) return "-";
  if (/[\u4e00-\u9fa5]/.test(raw)) return raw;
  return STATUS_LABEL_FALLBACKS[raw.toLowerCase()] || raw;
}

export function getStatusSemanticClass(status: unknown, label?: unknown): string {
  const statusStr = String(status ?? "").toLowerCase();
  const labelStr = localizeStatusLabel(label ?? status).toLowerCase();
  const text = `${statusStr} ${labelStr}`;

  // 危险/取消：红色
  const isDanger =
    /不合格|失败|拒绝|驳回|逾期|取消|异常|黑名单|unqualified|failed|reject|rejected|overdue|cancel|abnormal|error/.test(
      text
    );
  if (isDanger) {
    return "border-transparent bg-red-600 text-white";
  }

  // 部分发货：浅蓝色（需在通用完成规则之前判断）
  if (statusStr === "partial_shipped" || labelStr === "部分发货") {
    return "border-transparent bg-blue-400 text-white";
  }

  // 已发货：蓝色
  if (statusStr === "shipped" || labelStr === "已发货") {
    return "border-transparent bg-blue-600 text-white";
  }

  // 已审批：橙黄色（待处理状态）
  if (statusStr === "approved" || labelStr === "已审批") {
    return "border-transparent bg-amber-500 text-black";
  }

  // 完成/通过/合格：绿色
  const isDone =
    /完成|已完成|已收款|已付款|已通过|合格|completed|done|paid|received|qualified|pass|active/.test(
      text
    );
  if (isDone) {
    return "border-transparent bg-green-600 text-white";
  }

  // 进行中/待处理/草稿：橙黄色
  const isProgress =
    /进行|处理中|审核中|待|草稿|计划|in_progress|processing|review|pending|draft|planned/.test(
      text
    );
  if (isProgress) {
    return "border-transparent bg-amber-500 text-black";
  }

  return "";
}
