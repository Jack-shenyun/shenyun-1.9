import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  MessageCircle,
  QrCode,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Smartphone,
  Bell,
  Shield,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function WechatBindPage() {
  const [copied, setCopied] = useState(false);

  // 查询绑定状态
  const { data: bindStatus, refetch: refetchStatus, isLoading } = trpc.wechat.getBindStatus.useQuery();

  // 生成绑定码
  const generateCodeMutation = trpc.wechat.generateBindCode.useMutation({
    onSuccess: () => refetchStatus(),
    onError: (e) => toast.error(`生成失败：${e.message}`),
  });

  // 解绑
  const unbindMutation = trpc.wechat.unbind.useMutation({
    onSuccess: () => {
      toast.success("解绑成功");
      refetchStatus();
    },
    onError: (e) => toast.error(`解绑失败：${e.message}`),
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("绑定码已复制");
    });
  };

  const isBound = bindStatus?.bound;
  const bindCode = bindStatus?.bindCode;
  const codeExpiredAt = bindStatus?.bindCodeExpiredAt;
  const isCodeExpired = codeExpiredAt ? new Date(codeExpiredAt) < new Date() : true;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      {/* 页头 */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
          <MessageCircle className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">微信公众号绑定</h1>
          <p className="text-sm text-slate-500">绑定后，新待办事项将实时推送到您的微信</p>
        </div>
      </div>

      {/* 当前绑定状态 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-500" />
            绑定状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <RefreshCw className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : isBound ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800">已绑定</p>
                  {bindStatus?.wxNickname && (
                    <p className="text-xs text-green-600 mt-0.5">微信昵称：{bindStatus.wxNickname}</p>
                  )}
                </div>
                <Badge className="bg-green-100 text-green-700 border-0">已激活</Badge>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50">
                <Bell className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700">
                  待办提醒已开启，新的审批事项将自动推送到您的微信
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                onClick={() => unbindMutation.mutate()}
                disabled={unbindMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                {unbindMutation.isPending ? "解绑中..." : "解除绑定"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <XCircle className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-600">未绑定</p>
                <p className="text-xs text-slate-400 mt-0.5">请按下方步骤完成绑定</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 绑定操作（未绑定时显示） */}
      {!isBound && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4 text-slate-500" />
              绑定操作
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 步骤说明 */}
            <div className="space-y-3">
              {[
                { step: "1", text: "点击下方按钮生成 6 位绑定码" },
                { step: "2", text: "关注「神韵医疗」微信公众号" },
                { step: "3", text: "在公众号对话框中发送绑定码" },
                { step: "4", text: "收到绑定成功提示后即可使用" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                    {item.step}
                  </span>
                  <p className="text-sm text-slate-600 pt-0.5">{item.text}</p>
                </div>
              ))}
            </div>

            <Separator />

            {/* 绑定码区域 */}
            {bindCode && !isCodeExpired ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  绑定码 10 分钟内有效，请尽快发送到公众号
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 py-4">
                    <span className="text-3xl font-mono font-bold tracking-[0.3em] text-violet-700">
                      {bindCode}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-14 px-4 flex-col gap-1"
                    onClick={() => handleCopyCode(bindCode)}
                  >
                    <Copy className="h-4 w-4" />
                    <span className="text-xs">{copied ? "已复制" : "复制"}</span>
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-500"
                  onClick={() => generateCodeMutation.mutate()}
                  disabled={generateCodeMutation.isPending}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generateCodeMutation.isPending ? "animate-spin" : ""}`} />
                  重新生成
                </Button>
              </div>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md"
                onClick={() => generateCodeMutation.mutate()}
                disabled={generateCodeMutation.isPending}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                {generateCodeMutation.isPending ? "生成中..." : "生成绑定码"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 推送说明 */}
      <Card className="border-0 shadow-sm bg-slate-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Bell className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700">消息推送说明</p>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>• 有新的审批待办时，系统自动推送微信消息</li>
                <li>• 审批结果出来后（通过/拒绝），申请人收到通知</li>
                <li>• 仅推送与您相关的事项，不打扰其他人</li>
                <li>• 在公众号发送「解绑」可随时取消推送</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
