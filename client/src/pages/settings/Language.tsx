import { useEffect, useMemo, useState } from "react";
import ERPLayout from "@/components/ERPLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Languages,
  Globe,
  Clock,
  Calendar,
  Check,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { useOperationLog } from "@/hooks/useOperationLog";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_LANGUAGE_SETTINGS,
  formatDateBySettings,
  formatMoneyBySettings,
  formatTimeBySettings,
  normalizeLanguageSettings,
  parseLanguageSettings,
  resolveEffectiveLanguage,
  type LanguageSettings,
} from "@/lib/languageSettings";
import { useLanguageSettings } from "@/contexts/LanguageSettingsContext";

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  status: "available" | "coming_soon";
}

const languageOptions: LanguageOption[] = [
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", flag: "🇨🇳", status: "available" },
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文", flag: "🇹🇼", status: "available" },
  { code: "en-US", name: "English (US)", nativeName: "English", flag: "🇺🇸", status: "available" },
  { code: "ja-JP", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", status: "coming_soon" },
  { code: "ko-KR", name: "Korean", nativeName: "한국어", flag: "🇰🇷", status: "coming_soon" },
];

const timezoneOptions = [
  { value: "Asia/Shanghai", label: "中国标准时间 (UTC+8)" },
  { value: "Asia/Hong_Kong", label: "香港时间 (UTC+8)" },
  { value: "Asia/Taipei", label: "台北时间 (UTC+8)" },
  { value: "Asia/Tokyo", label: "日本标准时间 (UTC+9)" },
  { value: "Asia/Seoul", label: "韩国标准时间 (UTC+9)" },
  { value: "America/New_York", label: "美国东部时间 (UTC-5)" },
  { value: "America/Los_Angeles", label: "美国太平洋时间 (UTC-8)" },
  { value: "Europe/London", label: "格林威治标准时间 (UTC+0)" },
];

const dateFormatOptions = [
  { value: "YYYY-MM-DD", label: "2026-02-02 (YYYY-MM-DD)" },
  { value: "DD/MM/YYYY", label: "02/02/2026 (DD/MM/YYYY)" },
  { value: "MM/DD/YYYY", label: "02/02/2026 (MM/DD/YYYY)" },
  { value: "YYYY年MM月DD日", label: "2026年02月02日" },
];

const timeFormatOptions = [
  { value: "24h", label: "24小时制 (14:30)" },
  { value: "12h", label: "12小时制 (2:30 PM)" },
];

const currencyOptions = [
  { value: "CNY", label: "人民币 (¥)", symbol: "¥" },
  { value: "USD", label: "美元 ($)", symbol: "$" },
  { value: "EUR", label: "欧元 (€)", symbol: "€" },
  { value: "JPY", label: "日元 (¥)", symbol: "¥" },
  { value: "HKD", label: "港币 (HK$)", symbol: "HK$" },
];

export default function LanguagePage() {
  const utils = trpc.useUtils();
  const { settings: activeSettings, updateSettings } = useLanguageSettings();
  const { data: company } = trpc.companyInfo.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const updateMutation = trpc.companyInfo.update.useMutation({
    onSuccess: (updated) => {
      utils.companyInfo.get.setData(undefined, updated);
    },
    onError: (error) => {
      toast.error("保存失败", { description: error.message });
    },
  });
  const [formSettings, setFormSettings] = useState<LanguageSettings>(activeSettings);
  const [originalSettings, setOriginalSettings] = useState<LanguageSettings>(activeSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const { logOperation } = useOperationLog();

  useEffect(() => {
    const serverSettings = parseLanguageSettings((company as any)?.languageSettings);
    const nextSettings = normalizeLanguageSettings(serverSettings || activeSettings || DEFAULT_LANGUAGE_SETTINGS);
    setFormSettings(nextSettings);
    setOriginalSettings(nextSettings);
    setHasChanges(false);
  }, [company, activeSettings]);

  const selectedLanguage = formSettings.language;
  const timezone = formSettings.timezone;
  const dateFormat = formSettings.dateFormat;
  const timeFormat = formSettings.timeFormat;
  const currency = formSettings.currency;
  const autoDetect = formSettings.autoDetect;

  const effectiveLanguage = useMemo(
    () => resolveEffectiveLanguage(formSettings),
    [formSettings]
  );

  const handleLanguageChange = (code: string) => {
    const lang = languageOptions.find(l => l.code === code);
    if (lang?.status === "coming_soon") {
      toast.info("该语言即将推出", { description: "敬请期待" });
      return;
    }
    setFormSettings((prev) => ({ ...prev, language: code }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const nextSettings = normalizeLanguageSettings(formSettings);
    try {
      await updateMutation.mutateAsync({
        languageSettings: JSON.stringify(nextSettings),
      });
      updateSettings(nextSettings);
      logOperation({
        module: "language",
        action: "update",
        targetType: "语言设置",
        targetId: 1,
        targetName: "系统语言设置",
        description: "更新语言和区域设置",
        previousData: originalSettings,
        newData: nextSettings,
      });
      setOriginalSettings(nextSettings);
      setHasChanges(false);
      toast.success("设置已保存", { description: "语言和区域设置已更新并立即生效" });
    } catch {
      // 错误提示由 mutation onError 统一处理
    }
  };

  const handleReset = () => {
    setFormSettings(DEFAULT_LANGUAGE_SETTINGS);
    setHasChanges(true);
    toast.info("已恢复为默认值，请点击保存设置");
  };

  return (
    <ERPLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Languages className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">语言设置</h2>
              <p className="text-sm text-muted-foreground">配置系统语言和区域格式</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              恢复默认
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
              保存设置
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">当前生效语言</p>
              <p className="font-medium">
                {languageOptions.find((item) => item.code === effectiveLanguage)?.nativeName || effectiveLanguage}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">时区：{timezone}</Badge>
              <Badge variant="outline">日期：{dateFormat}</Badge>
              <Badge variant="outline">时间：{timeFormat === "24h" ? "24小时制" : "12小时制"}</Badge>
              <Badge variant="outline">货币：{currency}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 语言选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                系统语言
              </CardTitle>
              <CardDescription>选择系统界面显示的语言</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">自动检测浏览器语言</span>
                </div>
                <Switch
                  checked={autoDetect}
                  onCheckedChange={(checked) => {
                    setFormSettings((prev) => ({ ...prev, autoDetect: checked }));
                    setHasChanges(true);
                  }}
                />
              </div>
              <RadioGroup
                value={selectedLanguage}
                onValueChange={handleLanguageChange}
                className="space-y-3"
                disabled={autoDetect}
              >
                {languageOptions.map((lang: any) => (
                  <div
                    key={lang.code}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      selectedLanguage === lang.code
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    } ${lang.status === "coming_soon" ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={lang.code} id={lang.code} disabled={lang.status === "coming_soon"} />
                      <Label
                        htmlFor={lang.code}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <div>
                          <p className="font-medium">{lang.nativeName}</p>
                          <p className="text-xs text-muted-foreground">{lang.name}</p>
                        </div>
                      </Label>
                    </div>
                    {lang.status === "coming_soon" ? (
                      <Badge variant="secondary">即将推出</Badge>
                    ) : selectedLanguage === lang.code ? (
                      <Check className="h-5 w-5 text-primary" />
                    ) : null}
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 区域设置 */}
          <div className="space-y-6">
            {/* 时区设置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  时区设置
                </CardTitle>
                <CardDescription>设置系统显示的时区</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={timezone}
                  onValueChange={(v) => {
                    setFormSettings((prev) => ({ ...prev, timezone: v }));
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneOptions.map((tz: any) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* 日期时间格式 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  日期时间格式
                </CardTitle>
                <CardDescription>设置日期和时间的显示格式</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>日期格式</Label>
                  <Select
                  value={dateFormat}
                  onValueChange={(v) => {
                      setFormSettings((prev) => ({ ...prev, dateFormat: v }));
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFormatOptions.map((fmt: any) => (
                        <SelectItem key={fmt.value} value={fmt.value}>
                          {fmt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>时间格式</Label>
                  <Select
                  value={timeFormat}
                  onValueChange={(v) => {
                      setFormSettings((prev) => ({ ...prev, timeFormat: v as LanguageSettings["timeFormat"] }));
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeFormatOptions.map((fmt: any) => (
                        <SelectItem key={fmt.value} value={fmt.value}>
                          {fmt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 货币设置 */}
            <Card>
              <CardHeader>
                <CardTitle>货币设置</CardTitle>
                <CardDescription>设置系统默认的货币单位</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={currency}
                  onValueChange={(v) => {
                    setFormSettings((prev) => ({ ...prev, currency: v }));
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((cur: any) => (
                      <SelectItem key={cur.value} value={cur.value}>
                        {cur.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  当前货币符号: {currencyOptions.find(c => c.value === currency)?.symbol}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 预览 */}
        <Card>
          <CardHeader>
            <CardTitle>格式预览</CardTitle>
            <CardDescription>以下是当前设置的显示效果预览</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">日期示例</p>
                <p className="font-medium">
                  {formatDateBySettings(new Date("2026-02-02T14:30:00"), formSettings)}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">时间示例</p>
                <p className="font-medium">
                  {formatTimeBySettings(new Date("2026-02-02T14:30:00"), formSettings, true)}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">金额示例</p>
                <p className="font-medium">
                  {formatMoneyBySettings(1234.56, formSettings)}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">当前时区</p>
                <p className="font-medium">
                  {timezoneOptions.find(t => t.value === timezone)?.label.split(" ")[0]}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}
