import ERPLayout from "@/components/ERPLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type BoardMetricCard,
  type BoardFocusRow,
  type BossBoardResponse,
  type DepartmentBoardResponse,
} from "@/components/dashboard/BoardCommon";
import { formatDisplayNumber } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocation } from "wouter";
import {
  getDashboardBoardDefinition,
  type DashboardPermissionId,
} from "@shared/dashboardBoards";

type DepartmentDashboardPageProps = {
  dashboardId: Exclude<DashboardPermissionId, "boss_dashboard">;
};

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, index) => currentYear - 4 + index);
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        {helper ? (
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TrendCard({
  title,
  rows,
  primaryLabel,
  secondaryLabel,
}: {
  title: string;
  rows: Array<{ label: string; primary: number; secondary?: number }>;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.2)"
            />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              tickFormatter={value => formatDisplayNumber(value)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickFormatter={value => formatDisplayNumber(value)}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatDisplayNumber(value),
                name,
              ]}
              labelFormatter={label => `期间：${label}`}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="primary"
              fill="#2563eb"
              radius={[6, 6, 0, 0]}
              name={primaryLabel}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="secondary"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              name={secondaryLabel}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; count: number; amount?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            当前期间暂无统计数据
          </div>
        ) : (
          rows.map(row => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-lg border px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium">{row.label}</p>
                {row.amount ? (
                  <p className="text-xs text-muted-foreground">{row.amount}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">
                  {formatDisplayNumber(row.count)}
                </p>
                <p className="text-xs text-muted-foreground">项</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function FocusCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    title: string;
    subtitle?: string;
    value: string;
    extra?: string;
  }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            当前期间暂无重点数据
          </div>
        ) : (
          rows.map((row, index) => (
            <div
              key={`${row.title}-${index}`}
              className="flex items-start justify-between rounded-lg border px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.title}</p>
                {row.subtitle ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.subtitle}
                  </p>
                ) : null}
              </div>
              <div className="ml-4 text-right">
                <p className="text-sm font-semibold">{row.value}</p>
                {row.extra ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.extra}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

const bossToneMap: Record<
  NonNullable<BoardMetricCard["tone"]>,
  {
    badge: string;
    label: string;
    card: string;
    value: string;
  }
> = {
  normal: {
    badge: "bg-emerald-100 text-emerald-700",
    label: "正常",
    card: "border-emerald-100 bg-emerald-50/40",
    value: "text-emerald-700",
  },
  warning: {
    badge: "bg-amber-100 text-amber-700",
    label: "关注",
    card: "border-amber-100 bg-amber-50/50",
    value: "text-amber-700",
  },
  danger: {
    badge: "bg-red-100 text-red-700",
    label: "预警",
    card: "border-red-100 bg-red-50/50",
    value: "text-red-700",
  },
};

function getBossToneMeta(tone?: BoardMetricCard["tone"]) {
  return bossToneMap[tone || "normal"];
}

function BossMetricCard({ label, value, helper, tone }: BoardMetricCard) {
  const toneMeta = getBossToneMeta(tone);
  return (
    <Card className={`border shadow-sm ${toneMeta.card}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-slate-600">{label}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${toneMeta.badge}`}
          >
            {toneMeta.label}
          </span>
        </div>
        <p
          className={`mt-3 text-2xl font-semibold tracking-tight ${toneMeta.value}`}
        >
          {value}
        </p>
        {helper ? (
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BossSectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold tracking-tight text-slate-900">
        {title}
      </h3>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function RankingChartCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: Array<{
    label: string;
    value: number;
    formattedValue: string;
    helper?: string;
    tone?: BoardMetricCard["tone"];
  }>;
}) {
  const barColors = {
    normal: "#0f766e",
    warning: "#d97706",
    danger: "#dc2626",
  } as const;

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </CardHeader>
      <CardContent className="h-[360px]">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">
            当前期间暂无排行数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.16)"
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={value => formatDisplayNumber(value)}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={110}
                tick={{ fontSize: 12, fill: "#475569" }}
              />
              <Tooltip
                formatter={(
                  _value: number,
                  _name: string,
                  payload: {
                    payload?: { formattedValue?: string; helper?: string };
                  }
                ) => [payload?.payload?.formattedValue || "-", "金额"]}
                labelFormatter={label => `对象：${label}`}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {rows.map(row => (
                  <Cell
                    key={row.label}
                    fill={barColors[row.tone || "normal"]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function BossFocusCard({
  title,
  subtitle,
  rows,
  emptyText,
}: {
  title: string;
  subtitle: string;
  rows: BoardFocusRow[];
  emptyText: string;
}) {
  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        ) : (
          rows.map((row, index) => {
            const toneMeta = getBossToneMeta(row.tone);
            return (
              <div
                key={`${row.title}-${index}`}
                className={`rounded-2xl border px-4 py-4 ${toneMeta.card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {row.title}
                    </p>
                    {row.subtitle ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {row.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${toneMeta.value}`}>
                      {row.value}
                    </p>
                    {row.extra ? (
                      <p className="mt-1 text-xs text-slate-500">{row.extra}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function DashboardPermissionDenied({ title }: { title: string }) {
  const [, setLocation] = useLocation();
  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground">
              当前用户未配置该看板查看权限
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <p className="text-sm text-muted-foreground">
              请联系管理员到“系统设置 / 用户设置”里勾选对应看板权限后再查看。
            </p>
            <Button variant="outline" onClick={() => setLocation("/")}>
              返回系统首页
            </Button>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}

export function DepartmentDashboardPage({
  dashboardId,
}: DepartmentDashboardPageProps) {
  const boardDefinition = getDashboardBoardDefinition(dashboardId);
  const yearOptions = useMemo(() => buildYearOptions(), []);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<string>("all");
  const dashboardAccessQuery = trpc.dashboard.access.useQuery();
  const allowedDashboardIds =
    dashboardAccessQuery.data?.allowedDashboardIds ?? [];
  const hasAccess = allowedDashboardIds.includes(dashboardId);
  const boardQuery = trpc.dashboard.departmentBoard.useQuery(
    {
      dashboardId,
      year,
      month: month === "all" ? undefined : Number(month),
    },
    {
      enabled: hasAccess,
      refetchOnWindowFocus: false,
    }
  );

  if (dashboardAccessQuery.isLoading) {
    return (
      <ERPLayout>
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          正在加载看板权限...
        </div>
      </ERPLayout>
    );
  }

  if (!hasAccess) {
    return (
      <DashboardPermissionDenied title={boardDefinition?.label || "部门看板"} />
    );
  }

  const board = boardQuery.data as DepartmentBoardResponse | undefined;

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {board?.title || boardDefinition?.label || "部门看板"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {board?.subtitle || "按年/月查看部门经营数据"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(year)}
              onValueChange={value => setYear(Number(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(item => (
                  <SelectItem key={item} value={String(item)}>
                    {item}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全年</SelectItem>
                {Array.from({ length: 12 }, (_, index) => (
                  <SelectItem key={index + 1} value={String(index + 1)}>
                    {index + 1}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => boardQuery.refetch()}
              disabled={boardQuery.isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${boardQuery.isFetching ? "animate-spin" : ""}`}
              />
              刷新
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">当前统计期间</p>
              <p className="mt-1 text-lg font-semibold">
                {board?.periodLabel || `${year}年`}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              数据按业务日期实时汇总
            </p>
          </CardContent>
        </Card>

        {boardQuery.isLoading || !board ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            正在加载看板数据...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {board.summaryCards.map(card => (
                <MetricCard
                  key={card.id}
                  label={card.label}
                  value={card.value}
                  helper={card.helper}
                />
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <TrendCard
                title={board.trend.title}
                rows={board.trend.rows}
                primaryLabel={board.trend.primaryLabel}
                secondaryLabel={board.trend.secondaryLabel}
              />
              <BreakdownCard
                title={board.breakdownTitle}
                rows={board.breakdown}
              />
            </div>

            <FocusCard title={board.focusTitle} rows={board.focusRows} />
          </>
        )}
      </div>
    </ERPLayout>
  );
}

export function BossDashboardSection() {
  const yearOptions = useMemo(() => buildYearOptions(), []);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<string>("all");
  const accessQuery = trpc.dashboard.access.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const canViewBoss = Boolean(
    accessQuery.data?.allowedDashboardIds?.includes("boss_dashboard")
  );
  const boardQuery = trpc.dashboard.bossBoard.useQuery(
    {
      year,
      month: month === "all" ? undefined : Number(month),
    },
    {
      enabled: canViewBoss,
      refetchOnWindowFocus: false,
    }
  );

  if (accessQuery.isLoading) {
    return (
      <section className="space-y-4">
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-10 text-center text-sm text-slate-500 shadow-sm">
          正在加载经营看板...
        </div>
      </section>
    );
  }

  if (!canViewBoss) return null;

  const board = boardQuery.data as BossBoardResponse | undefined;

  return (
    <section className="mb-8 space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {board?.title || "经营看板"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {board?.subtitle || "查看公司整体经营与关键风险"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(year)}
            onValueChange={value => setYear(Number(value))}
          >
            <SelectTrigger className="w-[120px] rounded-full border-0 bg-white shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(item => (
                <SelectItem key={item} value={String(item)}>
                  {item}年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[120px] rounded-full border-0 bg-white shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全年</SelectItem>
              {Array.from({ length: 12 }, (_, index) => (
                <SelectItem key={index + 1} value={String(index + 1)}>
                  {index + 1}月
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="rounded-full border-0 bg-white shadow-sm hover:bg-white"
            onClick={() => boardQuery.refetch()}
            disabled={boardQuery.isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${boardQuery.isFetching ? "animate-spin" : ""}`}
            />
            刷新
          </Button>
        </div>
      </div>

      {!board ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-10 text-center text-sm text-slate-500 shadow-sm">
          正在加载经营看板...
        </div>
      ) : (
        <>
          <Card className="border-0 bg-slate-900 text-white shadow-sm">
            <CardContent className="flex flex-col gap-2 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">
                  经营看板怎么读
                </p>
                <p className="mt-1 text-sm text-white/70">
                  上面看今天的钱和风险，销售趋势和排行按 {board.periodLabel}{" "}
                  统计。
                </p>
              </div>
              <div className="text-xs text-white/60">
                红色先处理，绿色说明当前基本正常
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <BossSectionHeader
              title="经营总览"
              subtitle="先看钱、利润、回款和现金流，老板每天先盯这几件事。"
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {board.overviewCards.map(card => (
                <BossMetricCard key={card.id} {...card} />
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <Card className="border-0 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-900">
                  {board.trend.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={board.trend.rows}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.18)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickFormatter={value => formatDisplayNumber(value)}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickFormatter={value => formatDisplayNumber(value)}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatDisplayNumber(value),
                        name,
                      ]}
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="primary"
                      fill="#0f766e"
                      radius={[6, 6, 0, 0]}
                      name={board.trend.primaryLabel}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="secondary"
                      stroke="#ea580c"
                      strokeWidth={2.5}
                      dot={false}
                      name={board.trend.secondaryLabel}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <BossFocusCard
              title="老板要先盯的异常"
              subtitle="这些地方最容易拖慢回款、交付和合规。"
              rows={board.risks}
              emptyText="当前没有明显异常"
            />
          </div>

          <div className="space-y-4">
            <BossSectionHeader
              title="销售板块"
              subtitle={`下面这块按 ${board.periodLabel} 来看客户、产品和销售完成情况。`}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {board.salesCards.map(card => (
                <BossMetricCard key={card.id} {...card} />
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <RankingChartCard
                title="客户贡献 TOP10"
                subtitle="谁在给公司带来最多销售额"
                rows={board.salesCustomerTop}
              />
              <RankingChartCard
                title="产品贡献 TOP10"
                subtitle="哪些产品最能卖钱"
                rows={board.salesProductTop}
              />
            </div>
          </div>

          <div className="space-y-4">
            <BossSectionHeader
              title="生产与库存"
              subtitle="看完工、交期、库存占压，判断产能和存货有没有卡住经营。"
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {board.productionCards.map(card => (
                <BossMetricCard key={card.id} {...card} />
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <BossSectionHeader
                title="采购与成本"
                subtitle="重点看本月采购、原料涨价和核心供应商交付。"
              />
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                {board.purchaseCards.map(card => (
                  <BossMetricCard key={card.id} {...card} />
                ))}
              </div>
              <BossFocusCard
                title="原材料价格波动"
                subtitle="涨价太快，毛利会被直接吃掉。"
                rows={board.priceWatch}
                emptyText="本月没有明显价格波动"
              />
              <BossFocusCard
                title="核心供应商交付"
                subtitle="谁总能按时送到，谁已经开始拖后腿。"
                rows={board.supplierWatch}
                emptyText="本月暂无到交期的采购单"
              />
            </div>

            <div className="space-y-4">
              <BossSectionHeader
                title="质量、合规与人效"
                subtitle="看一次过率、客诉处理、证件到期和人均产值。"
              />
              <div className="grid gap-4 md:grid-cols-2">
                {board.qualityCards.map(card => (
                  <BossMetricCard key={card.id} {...card} />
                ))}
                {board.peopleCards.map(card => (
                  <BossMetricCard key={card.id} {...card} />
                ))}
              </div>
              <BossFocusCard
                title="认证 / 证件到期提醒"
                subtitle="CE、FDA、ISO 等快到期的要提前处理。"
                rows={board.complianceWatch}
                emptyText="90 天内没有证件到期"
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export function BossDashboardPage() {
  return (
    <ERPLayout>
      <div className="space-y-6 p-6 lg:p-8">
        <BossDashboardSection />
      </div>
    </ERPLayout>
  );
}
