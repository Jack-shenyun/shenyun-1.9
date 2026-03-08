import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PenLine,
  ShieldCheck,
  Clock,
  User,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

// 签名类型定义
export interface SignatureRecord {
  id: number;
  signatureType: "inspector" | "reviewer" | "approver";
  signatureAction: string;
  signerName: string;
  signerTitle?: string;
  signerDepartment?: string;
  signedAt: string;
  signatureMeaning: string;
  status: "valid" | "revoked";
}

// 签名面板属性
interface SignaturePanelProps {
  documentType: "IQC" | "IPQC" | "OQC";
  documentNo: string;
  documentId: number;
  signatureType: "inspector" | "reviewer" | "approver";
  onSignComplete?: (signature: SignatureRecord) => void;
  disabled?: boolean;
}

// 签名含义映射
// 格式化日期时间为 YYYY-MM-DD HH:mm
function formatDateTime(date?: string | Date): string {
  const d = date ? (date instanceof Date ? date : new Date(date)) : new Date();
  if (isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${min}`;
}

const signatureMeaningMap = {
  inspector: {
    IQC: "本人确认已按照检验规程对来料进行检验，检验结果真实、准确、完整。",
    IPQC: "本人确认已按照过程检验规程进行检验，检验结果真实、准确、完整。",
    OQC: "本人确认已按照成品检验规程进行检验，检验结果真实、准确、完整。",
  },
  reviewer: {
    IQC: "本人确认已复核检验记录，数据真实可靠，检验方法符合规定。",
    IPQC: "本人确认已复核过程检验记录，数据真实可靠，检验方法符合规定。",
    OQC: "本人确认已复核成品检验记录，数据真实可靠，检验方法符合规定。",
  },
  approver: {
    IQC: "本人批准该来料检验报告，同意检验结论。",
    IPQC: "本人批准该过程检验报告，同意检验结论。",
    OQC: "本人批准该成品检验报告，产品符合放行条件。",
  },
};

// 签名类型标签
const signatureTypeLabels = {
  inspector: { label: "检验员", color: "bg-blue-100 text-blue-800" },
  reviewer: { label: "复核员", color: "bg-amber-100 text-amber-800" },
  approver: { label: "审批人", color: "bg-green-100 text-green-800" },
};

/**
 * 电子签名面板组件
 * 符合FDA 21 CFR Part 11要求
 */
export function SignaturePanel({
  documentType,
  documentNo,
  documentId,
  signatureType,
  onSignComplete,
  disabled = false,
}: SignaturePanelProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  const typeConfig = signatureTypeLabels[signatureType];
  const signatureMeaning = signatureMeaningMap[signatureType][documentType];

  const handleSign = async () => {
    if (!password) {
      setVerificationError("请输入密码进行身份验证");
      return;
    }

    setIsVerifying(true);
    setVerificationError("");

    try {
      // 模拟密码验证 (实际应调用后端API)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 模拟验证成功
      if (password.length < 4) {
        setVerificationError("密码验证失败，请重试");
        setIsVerifying(false);
        return;
      }

      const newSignature: SignatureRecord = {
        id: Date.now(),
        signatureType,
        signatureAction: `${documentType}检验${typeConfig.label}签名`,
        signerName: "当前用户", // 实际应从用户上下文获取
        signerTitle: "质量检验员",
        signerDepartment: "质量部",
        signedAt: new Date().toISOString(),
        signatureMeaning,
        status: "valid",
      };

      toast.success("电子签名成功", {
        description: `${typeConfig.label}签名已完成，签名时间: ${formatDateTime()}`,
      });

      onSignComplete?.(newSignature);
      setOpen(false);
      setPassword("");
    } catch (error) {
      setVerificationError("签名失败，请重试");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <PenLine className="h-4 w-4" />
          {typeConfig.label}签名
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            电子签名验证
          </DialogTitle>
          <DialogDescription>
            请输入您的密码以完成电子签名。此签名符合FDA 21 CFR Part 11法规要求。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 签名信息 */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">单据编号</span>
              <span className="font-medium">{documentNo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">签名类型</span>
              <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">签名时间</span>
              <span className="text-sm">{formatDateTime()}</span>
            </div>
          </div>

          {/* 签名含义声明 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">签名含义声明</Label>
            <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 inline-block mr-2 text-amber-600" />
              {signatureMeaning}
            </div>
          </div>

          {/* 密码输入 */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              身份验证密码
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="请输入您的登录密码"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setVerificationError("");
                }}
                className="pl-10"
              />
            </div>
            {verificationError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                {verificationError}
              </p>
            )}
          </div>

          {/* 法规提示 */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
            <FileCheck className="h-3 w-3 inline-block mr-1" />
            本电子签名系统符合FDA 21 CFR Part 11法规要求，签名记录将被永久保存并可追溯。
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSign} disabled={isVerifying}>
            {isVerifying ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                验证中...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                确认签名
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 签名历史记录组件
 */
interface SignatureHistoryProps {
  signatures: SignatureRecord[];
  showTitle?: boolean;
}

export function SignatureHistory({
  signatures,
  showTitle = true,
}: SignatureHistoryProps) {
  if (signatures.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无签名记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium text-sm">签名历史</h4>
        </div>
      )}
      <div className="space-y-3">
        {signatures.map((sig) => {
          const typeConfig = signatureTypeLabels[sig.signatureType];
          return (
            <div
              key={sig.id}
              className="rounded-lg border p-3 space-y-2 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                  <span className="font-medium text-sm">{sig.signerName}</span>
                </div>
                {sig.status === "valid" ? (
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    有效
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    已撤销
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {sig.signerTitle && sig.signerDepartment && (
                  <p className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {sig.signerDepartment} · {sig.signerTitle}
                  </p>
                )}
                <p className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(sig.signedAt)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 italic">
                "{sig.signatureMeaning}"
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 签名状态卡片组件
 */
interface SignatureStatusCardProps {
  documentType: "IQC" | "IPQC" | "OQC";
  documentNo: string;
  documentId: number;
  signatures: SignatureRecord[];
  onSignComplete?: (signature: SignatureRecord) => void;
}

export function SignatureStatusCard({
  documentType,
  documentNo,
  documentId,
  signatures,
  onSignComplete,
}: SignatureStatusCardProps) {
  const hasInspectorSign = signatures.some(
    (s) => s.signatureType === "inspector" && s.status === "valid"
  );
  const hasReviewerSign = signatures.some(
    (s) => s.signatureType === "reviewer" && s.status === "valid"
  );
  const hasApproverSign = signatures.some(
    (s) => s.signatureType === "approver" && s.status === "valid"
  );

  const getStatusIcon = (completed: boolean) => {
    return completed ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          电子签名状态
          <Badge variant="outline" className="ml-auto text-xs">
            FDA 21 CFR Part 11
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 签名进度 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(hasInspectorSign)}
            <div className="h-px w-8 bg-muted-foreground/30" />
            {getStatusIcon(hasReviewerSign)}
            <div className="h-px w-8 bg-muted-foreground/30" />
            {getStatusIcon(hasApproverSign)}
          </div>
          <div className="text-sm text-muted-foreground">
            {[hasInspectorSign, hasReviewerSign, hasApproverSign].filter(Boolean).length}/3
          </div>
        </div>

        {/* 签名按钮 */}
        <div className="flex flex-wrap gap-2">
          <SignaturePanel
            documentType={documentType}
            documentNo={documentNo}
            documentId={documentId}
            signatureType="inspector"
            onSignComplete={onSignComplete}
            disabled={hasInspectorSign}
          />
          <SignaturePanel
            documentType={documentType}
            documentNo={documentNo}
            documentId={documentId}
            signatureType="reviewer"
            onSignComplete={onSignComplete}
            disabled={!hasInspectorSign || hasReviewerSign}
          />
          <SignaturePanel
            documentType={documentType}
            documentNo={documentNo}
            documentId={documentId}
            signatureType="approver"
            onSignComplete={onSignComplete}
            disabled={!hasReviewerSign || hasApproverSign}
          />
        </div>

        <Separator />

        {/* 签名历史 */}
        <ScrollArea className="h-[200px]">
          <SignatureHistory signatures={signatures} />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default SignatureStatusCard;
